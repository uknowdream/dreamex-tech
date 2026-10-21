import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

const WORKSPACE_KEY = 'dreamex:team-workspace:shared:v1'
const MEMBERS_KEY = 'dreamex:team-workspace:members:v1'
const MAX_BYTES = 100_000
const MAX_MEMBERS = 100
const DEFAULT_STATE = { project: 'DreamEx Tech', release: '', tasks: [], decisions: [], notes: '' }
const VALID_ROLES = new Set(['owner', 'admin', 'editor', 'viewer'])
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

function tokenHash(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
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

function publicSnapshot(record, role) {
  const snapshot = record
    ? { revision: record.revision, updatedAt: record.updatedAt, state: record.state }
    : { revision: 0, updatedAt: null, state: DEFAULT_STATE }
  return {
    ...snapshot,
    access: {
      role,
      canRead: true,
      canWrite: role === 'owner' || role === 'admin' || role === 'editor',
      canManageMembers: role === 'owner' || role === 'admin',
    },
  }
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

function queryParam(req, name) {
  try {
    const url = new URL(typeof req.url === 'string' ? req.url : '/', 'https://dreamex.invalid')
    return url.searchParams.get(name) || ''
  } catch {
    return ''
  }
}

function validRole(role) {
  return typeof role === 'string' && VALID_ROLES.has(role)
}

function parseMember(raw) {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const row = JSON.parse(raw)
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        typeof row.id !== 'string' || typeof row.label !== 'string' ||
        typeof row.role !== 'string' || !validRole(row.role) ||
        typeof row.createdAt !== 'string') return null
    return row
  } catch {
    return null
  }
}

function publicMember(member) {
  return {
    id: member.id,
    label: member.label,
    role: member.role,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt || null,
  }
}

function canManageMembers(role) {
  return role === 'owner' || role === 'admin'
}

function canWriteSnapshot(role) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

async function authenticate(config, candidate, expectedToken) {
  if (tokenMatches(candidate, expectedToken)) {
    return { role: 'owner', memberId: 'owner', tokenHash: '', isOwner: true }
  }
  if (!candidate || !config) return null
  const hash = tokenHash(candidate)
  const raw = await redisCommand(config, ['HGET', MEMBERS_KEY, hash])
  const member = parseMember(raw)
  if (!member || member.status === 'revoked') return null
  return { role: member.role, memberId: member.id, tokenHash: hash, isOwner: false }
}

async function readMemberEntries(config) {
  const result = await redisCommand(config, ['HGETALL', MEMBERS_KEY])
  if (!Array.isArray(result)) return []
  const values = []
  for (let i = 0; i + 1 < result.length; i += 2) {
    const member = parseMember(result[i + 1])
    if (member && member.status !== 'revoked' && typeof result[i] === 'string') values.push({ hash: result[i], member })
  }
  return values.sort((a, b) => a.member.createdAt.localeCompare(b.member.createdAt) || a.member.label.localeCompare(b.member.label))
}

async function readMembers(config) {
  return (await readMemberEntries(config)).map(entry => entry.member)
}

function actorCanChangeRole(actorRole, targetRole, nextRole) {
  if (targetRole === 'owner' || nextRole === 'owner') return false
  if (actorRole === 'owner') return true
  // An admin cannot create another admin, demote an admin, or change an admin token.
  if (actorRole === 'admin') return targetRole !== 'admin' && nextRole !== 'admin'
  return false
}

async function handleMemberResource(req, res, config, principal) {
  if (!canManageMembers(principal.role)) return send(res, 403, { error: 'forbidden', requiredRole: ['owner', 'admin'] })

  if (req.method === 'GET') {
    const members = await readMembers(config)
    return send(res, 200, { members: members.map(publicMember), maxMembers: MAX_MEMBERS })
  }

  if (req.method === 'POST') {
    const parsed = bodyObject(req)
    if (parsed.error === 'payload_too_large') return send(res, 413, { error: 'payload_too_large', maxBytes: MAX_BYTES })
    if (parsed.error) return send(res, 400, { error: parsed.error })
    const body = parsed.value
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'invalid_member' })
    const label = typeof body.label === 'string' ? body.label.trim() : ''
    const role = body.role
    if (label.length < 2 || label.length > 80) return send(res, 400, { error: 'invalid_label', message: 'Label must be between 2 and 80 characters.' })
    if (!['admin', 'editor', 'viewer'].includes(role)) return send(res, 400, { error: 'invalid_role' })
    if (principal.role === 'admin' && role === 'admin') return send(res, 403, { error: 'role_escalation_forbidden', message: 'Only the workspace owner can grant the admin role.' })
    const count = await redisCommand(config, ['HLEN', MEMBERS_KEY])
    if (!Number.isFinite(Number(count)) || Number(count) >= MAX_MEMBERS) return send(res, 409, { error: 'member_limit_reached', maxMembers: MAX_MEMBERS })

    const token = randomBytes(32).toString('base64url')
    const hash = tokenHash(token)
    const now = new Date().toISOString()
    const member = { id: randomUUID(), label, role, createdAt: now, updatedAt: null, status: 'active' }
    await redisCommand(config, ['HSET', MEMBERS_KEY, hash, JSON.stringify(member)])
    // Return the opaque token exactly once. Only its SHA-256 hash is persisted in Redis.
    return send(res, 201, { member: publicMember(member), token, tokenVisibleOnce: true })
  }

  const parsed = req.method === 'PATCH' ? bodyObject(req) : { value: { id: queryParam(req, 'id') } }
  if (parsed.error) return send(res, 400, { error: parsed.error })
  const body = parsed.value
  const id = body && typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: 'invalid_member_id' })
  const entries = await readMemberEntries(config)
  const targetEntry = entries.find(entry => entry.member.id === id)
  const target = targetEntry?.member
  if (!target) return send(res, 404, { error: 'member_not_found' })

  if (req.method === 'PATCH') {
    const role = body.role
    if (!['admin', 'editor', 'viewer'].includes(role)) return send(res, 400, { error: 'invalid_role' })
    if (!actorCanChangeRole(principal.role, target.role, role)) {
      return send(res, 403, { error: 'role_change_forbidden', message: 'Only the owner can grant admin; owner and admin access cannot be changed by member tokens.' })
    }
    const hash = targetEntry?.hash
    if (!hash) return send(res, 404, { error: 'member_not_found' })
    const updated = { ...target, role, updatedAt: new Date().toISOString() }
    await redisCommand(config, ['HSET', MEMBERS_KEY, hash, JSON.stringify(updated)])
    return send(res, 200, { member: publicMember(updated) })
  }

  if (req.method === 'DELETE') {
    if (!actorCanChangeRole(principal.role, target.role, target.role)) {
      return send(res, 403, { error: 'member_removal_forbidden', message: 'Owner/admin roles cannot be removed by member tokens; only the owner can remove an admin.' })
    }
    const hash = targetEntry?.hash
    if (!hash) return send(res, 404, { error: 'member_not_found' })
    await redisCommand(config, ['HDEL', MEMBERS_KEY, hash])
    return send(res, 200, { removed: true, member: publicMember(target) })
  }

  return send(res, 405, { error: 'method_not_allowed' })
}

export default async function handler(req, res) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin && !allowedOrigins().has(origin)) return send(res, 403, { error: 'origin_not_allowed' })

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, PUT, POST, PATCH, DELETE, OPTIONS')
    return send(res, 204)
  }

  const resource = queryParam(req, 'resource')
  const allowedMethods = resource === 'members'
    ? ['GET', 'POST', 'PATCH', 'DELETE']
    : resource === '' ? ['GET', 'PUT'] : []
  if (!allowedMethods.length) return send(res, 404, { error: 'unknown_resource' })
  if (!allowedMethods.includes(req.method)) {
    res.setHeader('Allow', [...allowedMethods, 'OPTIONS'].join(', '))
    return send(res, 405, { error: 'method_not_allowed' })
  }

  const expectedToken = configuredToken()
  if (!expectedToken) return send(res, 503, { error: 'workspace_not_configured', requiredConfiguration: ['DREAMEX_WORKSPACE_TOKEN'] })
  const config = redisConfiguration()
  if (!config) return send(res, 503, { error: 'storage_not_configured', requiredConfiguration: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'] })

  const authorization = typeof req.headers?.authorization === 'string' ? req.headers.authorization : ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  let principal
  try {
    principal = await authenticate(config, match?.[1] || '', expectedToken)
  } catch {
    return send(res, 502, { error: 'storage_unavailable', message: 'Shared storage is unavailable. No credentials or internal error details were returned.' })
  }
  if (!principal) return send(res, 401, { error: 'unauthorized' })

  try {
    if (resource === 'members') return await handleMemberResource(req, res, config, principal)

    if (req.method === 'GET') {
      const raw = await redisCommand(config, ['GET', WORKSPACE_KEY])
      let record
      try { record = parseStored(raw) } catch { return send(res, 502, { error: 'stored_snapshot_invalid' }) }
      return send(res, 200, publicSnapshot(record, principal.role))
    }

    if (!canWriteSnapshot(principal.role)) return send(res, 403, { error: 'read_only_role' })
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
      return send(res, 409, { error: 'revision_conflict', current: publicSnapshot(current, principal.role) })
    }
    return send(res, 200, publicSnapshot(record, principal.role))
  } catch {
    return send(res, 502, { error: 'storage_unavailable', message: 'Shared storage is unavailable. No credentials or internal error details were returned.' })
  }
}
