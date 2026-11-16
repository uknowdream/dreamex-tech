import { createHash } from 'node:crypto'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'

const RADAR_COUNT_KEY = 'dreamex:radar:subscribers:v1:count'
const RADAR_ITEM_PREFIX = 'dreamex:radar:subscribers:v1:hash:'
const MAX_BODY_BYTES = 4096
const radarReadLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000 })
const radarWriteLimiter = createRateLimiter({ maxRequests: 12, windowMs: 60_000 })

export function resetRadarRateLimiter() {
  radarReadLimiter.reset()
  radarWriteLimiter.reset()
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

function redisConfiguration() {
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

function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  const clean = value.trim().toLowerCase()
  if (clean.length < 5 || clean.length > 254) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return ''
  return clean
}

export default async function handler(req, res) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin && !allowedOrigins().has(origin)) {
    return send(res, 403, { error: 'origin_not_allowed' })
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 204)
  }

  const limiter = req.method === 'GET' ? radarReadLimiter : radarWriteLimiter
  const limitResult = limiter.check(clientKey(req, req.method === 'GET' ? 'radar:get' : 'radar:post'))
  applyRateLimitHeaders(res, limitResult)
  if (!limitResult.allowed) {
    return send(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limitResult.retryAfterSec })
  }

  const config = redisConfiguration()

  if (req.method === 'GET') {
    let subscriberCount = null
    if (config) {
      try {
        const raw = await redisCommand(config, ['GET', RADAR_COUNT_KEY])
        const numeric = Number(raw)
        subscriberCount = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
      } catch {
        subscriberCount = null
      }
    }
    return send(res, 200, {
      ok: true,
      service: 'dreamex-radar',
      persistentStorageConfigured: Boolean(config),
      subscriberCount,
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 405, { error: 'method_not_allowed' })
  }

  const parsed = parseBody(req)
  if (parsed.error === 'payload_too_large') {
    return send(res, 413, { error: 'payload_too_large', maxBytes: MAX_BODY_BYTES })
  }
  if (parsed.error) {
    return send(res, 400, { error: parsed.error })
  }

  const email = normalizeEmail(parsed.value.email)
  if (!email) {
    return send(res, 400, { error: 'invalid_email', message: 'Provide a valid engineering email address.' })
  }

  const locale = parsed.value.locale === 'id' ? 'id' : 'en'
  const subscribedAt = new Date().toISOString()

  if (!config) {
    return send(res, 202, {
      ok: true,
      mode: 'validated-stateless',
      subscribedAt,
      message: 'Subscription validated; server KV store is optional and currently in stateless fallback mode.',
    })
  }

  try {
    const emailHash = createHash('sha256').update(email, 'utf8').digest('hex')
    const key = RADAR_ITEM_PREFIX + emailHash
    const record = JSON.stringify({ emailHash, locale, subscribedAt })
    const created = await redisCommand(config, ['SET', key, record, 'NX'])
    if (created === 'OK') {
      await redisCommand(config, ['INCR', RADAR_COUNT_KEY])
    }
    return send(res, 200, {
      ok: true,
      mode: 'persisted',
      duplicate: created !== 'OK',
      subscribedAt,
    })
  } catch {
    return send(res, 202, {
      ok: true,
      mode: 'validated-fallback',
      subscribedAt,
      message: 'Subscription validated cleanly while remote storage is temporarily unavailable.',
    })
  }
}
