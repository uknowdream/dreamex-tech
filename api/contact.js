import { createHash } from 'node:crypto'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'
import { getVercelStorageInfo, vercelStorageSet } from './_vercelStorage.js'

const CONTACT_KEY_PREFIX = 'dreamex:contact:v1:'
const MAX_BODY_BYTES = 16_384
const VALID_TOPICS = new Set(['demo', 'architecture', 'jira-enterprise', 'partnership'])

const readLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })
const writeLimiter = createRateLimiter({ maxRequests: 6, windowMs: 60_000 })

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

function safeWebhookUrl() {
  const raw = (process.env.CONTACT_WEBHOOK_URL || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return ''
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.local') || /^127\.|^10\.|^192\.168\.|^169\.254\./.test(host)) {
      return ''
    }
    return raw
  } catch {
    return ''
  }
}

async function dispatchWebhookNotice(webhookUrl, record) {
  const summary = `🚀 New DreamEx Tech Inquiry [${record.referenceId}] (${record.topic}) from ${record.name}${record.company ? ` @ ${record.company}` : ''} — ${record.messageLength} chars`
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Compatible with both Slack (text) and Discord (content) incoming webhooks
      body: JSON.stringify({ text: summary, content: summary }),
      signal: AbortSignal.timeout(3_500),
    })
    return true
  } catch {
    return false
  }
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
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 204)
  }

  const limiter = req.method === 'GET' ? readLimiter : writeLimiter
  const limit = limiter.check(clientKey(req, `contact:${req.method || 'GET'}`))
  applyRateLimitHeaders(res, limit)
  if (!limit.allowed) {
    return send(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limit.retryAfterSec })
  }

  const storage = getVercelStorageInfo()
  const webhookUrl = safeWebhookUrl()

  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      service: 'dreamex-contact',
      persistentStorageConfigured: storage.configured,
      activeDriver: storage.driver,
      webhookConfigured: Boolean(webhookUrl),
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
    const record = {
      referenceId,
      name,
      company,
      topic,
      messageLength: message.length,
      emailHash: createHash('sha256').update(email).digest('hex').slice(0, 16),
      createdAt,
    }

    let persistedDriver = null
    if (storage.configured) {
      try {
        const result = await vercelStorageSet(`${CONTACT_KEY_PREFIX}${referenceId}`, record, 60 * 60 * 24 * 90)
        if (result.ok) persistedDriver = result.driver
      } catch {
        persistedDriver = null
      }
    }

    const webhookDelivered = webhookUrl ? await dispatchWebhookNotice(webhookUrl, record) : false

    if (persistedDriver) {
      return send(res, 201, {
        ok: true,
        mode: 'persisted',
        driver: persistedDriver,
        webhookDelivered,
        referenceId,
        createdAt,
      })
    }

    return send(res, 200, {
      ok: true,
      mode: 'validated-stateless',
      driver: storage.driver,
      webhookDelivered,
      referenceId,
      createdAt,
    })
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS')
  return send(res, 405, { error: 'method_not_allowed' })
}
