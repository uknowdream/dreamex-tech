import { createHash } from 'node:crypto'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'

const CONTACT_KEY_PREFIX = 'dreamex:contact:v1:'
const CONTACT_COUNT_KEY = 'dreamex:contact:v1:count'
const MAX_BODY_BYTES = 8192
const readLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000 })
const writeLimiter = createRateLimiter({ maxRequests: 8, windowMs: 60_000 })

export function resetContactRateLimiter() {
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

const VALID_TOPICS = new Set(['demo', 'architecture', 'jira-enterprise', 'partnership'])

export default async function handler(req, res) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin && !allowedOrigins().has(origin)) {
    return send(res, 403, { error: 'origin_not_allowed' })
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 204)
  }

  const limiter = req.method === 'GET' ? readLimiter : writeLimiter
  const limit = limiter.check(clientKey(req, `contact:${req.method || 'GET'}`))
  applyRateLimitHeaders(res, limit)
  if (!limit.allowed) {
    return send(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limit.retryAfterSec })
  }

  const config = redisConfig()

  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      service: 'dreamex-contact',
      persistentStorageConfigured: Boolean(config),
      topics: [...VALID_TOPICS],
    })
  }

  if (req.method === 'POST') {
    const parsed = parseBody(req)
    if (parsed.error) {
      return send(res, parsed.error === 'payload_too_large' ? 413 : 400, { error: parsed.error })
    }
    const body = parsed.value || {}
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 120) : ''
    const topic = typeof body.topic === 'string' && VALID_TOPICS.has(body.topic) ? body.topic : 'demo'
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1800) : ''

    if (name.length < 2) {
      return send(res, 400, { error: 'invalid_name', message: 'Please provide your name (minimum 2 characters).' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return send(res, 400, { error: 'invalid_email', message: 'Please provide a valid work email address.' })
    }
    if (message.length < 10) {
      return send(res, 400, { error: 'invalid_message', message: 'Please include at least 10 characters describing your goals.' })
    }

    const digest = createHash('sha256').update(`${email}:${Date.now()}`).digest('hex')
    const referenceId = `DX-REQ-${digest.slice(0, 8).toUpperCase()}`
    const createdAt = new Date().toISOString()

    if (config) {
      try {
        const record = { referenceId, name, company, topic, messageLength: message.length, emailHash: createHash('sha256').update(email).digest('hex').slice(0, 16), createdAt }
        await redisCommand(config, ['SET', `${CONTACT_KEY_PREFIX}${referenceId}`, JSON.stringify(record), 'EX', 60 * 60 * 24 * 90])
        await redisCommand(config, ['INCR', CONTACT_COUNT_KEY])
        return send(res, 201, { ok: true, mode: 'persisted', referenceId, createdAt })
      } catch {
        return send(res, 200, { ok: true, mode: 'validated-stateless', referenceId, createdAt })
      }
    }

    return send(res, 200, { ok: true, mode: 'validated-stateless', referenceId, createdAt })
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS')
  return send(res, 405, { error: 'method_not_allowed' })
}
