import { createHash } from 'node:crypto'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'

const ROOM_KEY_PREFIX = 'dreamex:jira:room:v1:'
const MAX_BODY_BYTES = 131_072 // 128 KiB max board snapshot
const readLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000 })
const writeLimiter = createRateLimiter({ maxRequests: 24, windowMs: 60_000 })

export function resetJiraSyncRateLimiter() {
  readLimiter.reset()
  writeLimiter.reset()
}

function send(res, status, payload = null) {
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (payload === null) {
    res.end()
    return
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function allowedOrigins() {
  const configured = (process.env.DREAMEX_ALLOWED_ORIGINS || 'https://dreamex.tech,https://www.dreamex.tech,https://dreamex-tech.vercel.app')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:4173')
  }
  return new Set(configured)
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  if (!url || !token) return null
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    return null
  }
  return { url: url.replace(/\/+$/, ''), token }
}

async function redisCommand(config, command) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(6_000),
  })
  if (!response.ok) throw new Error('Storage request failed')
  const payload = await response.json()
  if (payload && typeof payload === 'object' && payload.error) {
    throw new Error('Storage rejected command')
  }
  return payload?.result
}

function normalizeRoomCode(raw) {
  if (typeof raw !== 'string') return ''
  const clean = raw.trim()
  if (clean.length < 6 || clean.length > 64) return ''
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) return ''
  return clean
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) return { error: 'payload_too_large' }
    try { return { value: JSON.parse(req.body) } } catch { return { error: 'invalid_json' } }
  }
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const serialized = JSON.stringify(req.body)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) return { error: 'payload_too_large' }
    return { value: req.body }
  }
  return { error: 'invalid_body' }
}

export default async function handler(req, res) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin && !allowedOrigins().has(origin)) {
    return send(res, 403, { error: 'origin_not_allowed' })
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, PUT, OPTIONS')
    return send(res, 204)
  }

  const limiter = req.method === 'GET' ? readLimiter : writeLimiter
  const limit = limiter.check(clientKey(req, `jira-sync:${req.method || 'GET'}`))
  applyRateLimitHeaders(res, limit)
  if (!limit.allowed) {
    return send(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limit.retryAfterSec })
  }

  const reqUrl = new URL(req.url || '/api/jira-sync', 'https://dreamex.tech')
  const rawRoom = reqUrl.searchParams.get('room') || ''
  const config = redisConfig()

  // Health probe (no room param)
  if (req.method === 'GET' && !rawRoom) {
    return send(res, 200, {
      ok: true,
      service: 'dreamex-jira-sync',
      cloudConfigured: Boolean(config),
      realtimeModes: config
        ? ['upstash-redis-cloud', 'broadcast-channel', 'compressed-share-url']
        : ['broadcast-channel', 'compressed-share-url'],
    })
  }

  const roomCode = normalizeRoomCode(rawRoom)
  if (!roomCode) {
    return send(res, 400, {
      error: 'invalid_room_code',
      message: 'Room code must be 6-64 alphanumeric, dash, or underscore characters.',
    })
  }

  if (!config) {
    return send(res, 503, {
      error: 'cloud_storage_not_configured',
      cloudConfigured: false,
      message: 'Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel to enable cloud room sync. BroadcastChannel & Shareable URL sync remain active.',
    })
  }

  const roomHash = createHash('sha256').update(roomCode).digest('hex').slice(0, 32)
  const storageKey = `${ROOM_KEY_PREFIX}${roomHash}`

  if (req.method === 'GET') {
    try {
      const raw = await redisCommand(config, ['GET', storageKey])
      if (!raw) {
        return send(res, 200, { ok: true, found: false, rev: 0, snapshot: null })
      }
      const parsed = JSON.parse(String(raw))
      return send(res, 200, {
        ok: true,
        found: true,
        rev: Number(parsed.rev) || 1,
        updatedAt: parsed.updatedAt || null,
        snapshot: parsed.snapshot || null,
      })
    } catch {
      return send(res, 502, { error: 'storage_unavailable' })
    }
  }

  if (req.method === 'PUT') {
    const parsedBody = parseBody(req)
    if (parsedBody.error) {
      return send(res, parsedBody.error === 'payload_too_large' ? 413 : 400, { error: parsedBody.error })
    }
    const { expectedRev = 0, snapshot } = parsedBody.value || {}
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.issues)) {
      return send(res, 400, { error: 'invalid_snapshot', message: 'Snapshot must include an issues array.' })
    }

    try {
      const existingRaw = await redisCommand(config, ['GET', storageKey])
      const currentRev = existingRaw ? Number(JSON.parse(String(existingRaw)).rev) || 0 : 0
      if (Number(expectedRev) !== currentRev && expectedRev !== -1) {
        return send(res, 409, {
          error: 'revision_conflict',
          currentRev,
          message: 'Remote board has newer updates. Pull latest revision before pushing.',
        })
      }
      const nextRev = currentRev + 1
      const record = {
        rev: nextRev,
        updatedAt: new Date().toISOString(),
        snapshot,
      }
      await redisCommand(config, ['SET', storageKey, JSON.stringify(record), 'EX', 60 * 60 * 24 * 30])
      return send(res, 200, { ok: true, rev: nextRev, updatedAt: record.updatedAt })
    } catch {
      return send(res, 502, { error: 'storage_unavailable' })
    }
  }

  res.setHeader('Allow', 'GET, PUT, OPTIONS')
  return send(res, 405, { error: 'method_not_allowed' })
}
