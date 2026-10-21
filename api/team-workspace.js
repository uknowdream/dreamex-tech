import { timingSafeEqual } from 'node:crypto'

const WORKSPACE_KEY = 'dreamex:team-workspace:shared:v1'
const MAX_BYTES = 100_000
const DEFAULT_STATE = { project: 'DreamEx Tech', release: '', tasks: [], decisions: [], notes: '' }
const CAS_SCRIPT = [
  'local current = redis.call("GET", KEYS[1])',
  'local currentRevision = 0',
  'if current then local decoded = cjson.decode(current); currentRevision = tonumber(decoded.revision or 0) end',
  'local expected = tonumber(ARGV[1])',
  'if currentRevision ~= expected then return {0, current or ""} end',
  'redis.call("SET", KEYS[1], ARGV[2])',
  'return {1, ARGV[2]}',
].join('\n')

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Origin')
  if (status === 204) {
    res.end()
    return
  }
  res.end(JSON.stringify(payload))
}

function configuredToken() {
  const value = process.env.DREAMEX_WORKSPACE_TOKEN
  return typeof value === 'string' && value.length >= 32 ? value : ''
}

function tokenMatches(candidate, expected) {
  if (!candidate || !expected) return false
  const left = Buffer.from(candidate, 'utf8')
  const right = Buffer.from(expected, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

function allowedOrigins() {
  const configured = (process.env.DREAMEX_ALLOWED_ORIGINS || 'https://dreamex.tech,https://www.dreamex.tech')
    .split(',').map(value => value.trim()).filter(Boolean)
  if (process.env.NODE_ENV !== 'production') configured.push('http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:4173')
  return new Set(configured)
}

function redisConfiguration() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  if (!url || !token) return null
  let parsed
  try { parsed = new URL(url) } catch { return null }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return null
  return { url: url.replace(/\/+$/, ''), token }
}

async function redisCommand(config, command) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error('Storage provider request failed.')
  const payload = await response.json()
  if (payload && typeof payload === 'object' && payload.error) throw new Error('Storage provider rejected the command.')
  return payload?.result
}

function parseStored(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Number.isInteger(value.revision) || value.revision < 1 ||
      !value.state || typeof value.state !== 'object' || Array.isArray(value.state) ||
      typeof value.updatedAt !== 'string') throw new Error('Stored workspace snapshot is invalid.')
  return value
}

function publicSnapshot(record) {
  if (!record) return { revision: 0, updatedAt: null, state: DEFAULT_STATE }
  return { revision: record.revision, updatedAt: record.updatedAt, state: record.state }
}

function bodyObject(req) {
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BYTES) return { error: 'payload_too_large' }
    try { return { value: JSON.parse(req.body) } } catch { return { error: 'invalid_json' } }
  }
  if (req.body === undefined || req.body === null) return { error: 'missing_body' }
  let serialized
  try { serialized = JSON.stringify(req.body) } catch { return { error: 'invalid_json' } }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) return { error: 'payload_too_large' }
  try { return { value: typeof req.body === 'object' ? req.body : JSON.parse(serialized) } } catch { return { error: 'invalid_json' } }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204)
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT, OPTIONS')
    return send(res, 405, { error: 'method_not_allowed' })
  }

  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin && !allowedOrigins().has(origin)) return send(res, 403, { error: 'origin_not_allowed' })

  const expectedToken = configuredToken()
  if (!expectedToken) return send(res, 503, { error: 'workspace_not_configured', requiredConfiguration: ['DREAMEX_WORKSPACE_TOKEN'] })

  const authorization = typeof req.headers?.authorization === 'string' ? req.headers.authorization : ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!tokenMatches(match?.[1] || '', expectedToken)) return send(res, 401, { error: 'unauthorized' })

  const config = redisConfiguration()
  if (!config) return send(res, 503, { error: 'storage_not_configured', requiredConfiguration: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'] })

  try {
    if (req.method === 'GET') {
      const raw = await redisCommand(config, ['GET', WORKSPACE_KEY])
      let record
      try { record = parseStored(raw) } catch { return send(res, 502, { error: 'stored_snapshot_invalid' }) }
      return send(res, 200, publicSnapshot(record))
    }

    const parsedBody = bodyObject(req)
    if (parsedBody.error === 'payload_too_large') return send(res, 413, { error: 'payload_too_large', maxBytes: MAX_BYTES })
    if (parsedBody.error) return send(res, 400, { error: parsedBody.error })
    const body = parsedBody.value
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        !Number.isInteger(body.revision) || body.revision < 0 || body.revision > 1_000_000_000 ||
        !body.state || typeof body.state !== 'object' || Array.isArray(body.state)) {
      return send(res, 400, { error: 'invalid_snapshot', message: 'Expected a JSON object with a non-negative revision and object state.' })
    }
    const serializedState = JSON.stringify(body.state)
    if (Buffer.byteLength(serializedState, 'utf8') > MAX_BYTES - 512) return send(res, 413, { error: 'payload_too_large', maxBytes: MAX_BYTES - 512 })
    const record = { revision: body.revision + 1, updatedAt: new Date().toISOString(), state: body.state }
    const result = await redisCommand(config, ['EVAL', CAS_SCRIPT, 1, WORKSPACE_KEY, body.revision, JSON.stringify(record)])
    if (!Array.isArray(result) || result.length < 2) return send(res, 502, { error: 'storage_response_invalid' })
    const saved = Number(result[0]) === 1
    if (!saved) {
      let current
      try { current = parseStored(result[1]) } catch { return send(res, 502, { error: 'stored_snapshot_invalid' }) }
      return send(res, 409, { error: 'revision_conflict', current: publicSnapshot(current) })
    }
    return send(res, 200, publicSnapshot(record))
  } catch {
    return send(res, 502, { error: 'storage_unavailable', message: 'Shared storage is unavailable. No credentials or internal error details were returned.' })
  }
}
