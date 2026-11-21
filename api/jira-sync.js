import { createHash } from 'node:crypto'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'
import { getVercelStorageInfo, vercelStorageGet, vercelStorageSet } from './_vercelStorage.js'

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
  const storage = getVercelStorageInfo()

  // Health probe (no room param)
  if (req.method === 'GET' && !rawRoom) {
    return send(res, 200, {
      ok: true,
      service: 'dreamex-jira-sync',
      cloudConfigured: storage.configured,
      activeDriver: storage.driver,
      supportedVercelDrivers: storage.supportedVercelDrivers,
      realtimeModes: storage.configured
        ? [storage.driver, 'broadcast-channel', 'compressed-share-url']
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

  if (!storage.configured) {
    return send(res, 503, {
      error: 'cloud_storage_not_configured',
      cloudConfigured: false,
      activeDriver: storage.driver,
      message:
        'Connect Neon Postgres, Upstash Redis, or Vercel Blob in Vercel Dashboard -> Storage to enable cloud room sync. BroadcastChannel & Shareable URL sync remain active.',
    })
  }

  const roomHash = createHash('sha256').update(roomCode).digest('hex').slice(0, 32)
  const storageKey = `${ROOM_KEY_PREFIX}${roomHash}`

  if (req.method === 'GET') {
    try {
      const parsed = await vercelStorageGet(storageKey)
      if (!parsed || typeof parsed !== 'object') {
        return send(res, 200, { ok: true, found: false, rev: 0, driver: storage.driver, snapshot: null })
      }
      return send(res, 200, {
        ok: true,
        found: true,
        rev: Number(parsed.rev) || 1,
        updatedAt: parsed.updatedAt || null,
        driver: storage.driver,
        snapshot: parsed.snapshot || null,
      })
    } catch {
      return send(res, 502, { error: 'storage_unavailable' })
    }
  }

  if (req.method === 'PUT') {
    const parsed = parseBody(req)
    if (parsed.error) {
      return send(res, parsed.error === 'payload_too_large' ? 413 : 400, { error: parsed.error })
    }
    const { snapshot, expectedRev } = parsed.value
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.issues)) {
      return send(res, 400, { error: 'invalid_snapshot', message: 'Snapshot must include an issues array.' })
    }

    try {
      const existing = await vercelStorageGet(storageKey)
      const currentRev = existing && typeof existing === 'object' ? Number(existing.rev) || 0 : 0
      if (typeof expectedRev === 'number' && expectedRev !== currentRev) {
        return send(res, 409, {
          error: 'revision_conflict',
          currentRev,
          message: 'Remote board has newer updates. Pull latest before pushing.',
        })
      }
      const nextRev = currentRev + 1
      const updatedAt = new Date().toISOString()
      const record = { rev: nextRev, updatedAt, snapshot }
      const written = await vercelStorageSet(storageKey, record, 60 * 60 * 24 * 30)
      return send(res, 200, { ok: true, rev: nextRev, updatedAt, driver: written.driver })
    } catch {
      return send(res, 502, { error: 'storage_unavailable' })
    }
  }

  res.setHeader('Allow', 'GET, PUT, OPTIONS')
  return send(res, 405, { error: 'method_not_allowed' })
}
