import { createHmac, timingSafeEqual } from 'node:crypto'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'
import { getVercelStorageInfo, vercelStorageGet, vercelStorageSet } from './_vercelStorage.js'

const WEBHOOK_LOG_KEY = 'dreamex:github:webhook:v1:recent'
const MAX_BODY_BYTES = 131_072
const limiter = createRateLimiter({ maxRequests: 40, windowMs: 60_000 })

export function resetGithubWebhookRateLimiter() {
  limiter.reset()
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

function verifyGithubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
    return false
  }
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const a = Buffer.from(signatureHeader, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function deriveJiraTransition(eventName, payload) {
  if (!payload || typeof payload !== 'object') return null
  const textCorpus = [
    payload.pull_request?.title,
    payload.pull_request?.head?.ref,
    payload.pull_request?.body,
    payload.issue?.title,
    payload.issue?.body,
  ]
    .filter(Boolean)
    .join(' ')

  const keyMatch = textCorpus.match(/\b([A-Z]{2,5}-\d{1,5})\b/)
  const jiraKey = keyMatch ? keyMatch[1] : null

  if (eventName === 'pull_request') {
    const action = String(payload.action || '')
    const merged = Boolean(payload.pull_request?.merged)
    const targetStatus =
      action === 'closed' && merged
        ? 'done'
        : action === 'opened' || action === 'reopened' || action === 'ready_for_review'
          ? 'review'
          : action === 'synchronize'
            ? 'in_progress'
            : null
    if (!targetStatus) return null
    return {
      source: 'github-pr',
      action,
      jiraKey,
      targetStatus,
      ref: `PR#${payload.pull_request?.number ?? '?'}`,
      title: String(payload.pull_request?.title || '').slice(0, 140),
      url: String(payload.pull_request?.html_url || ''),
      receivedAt: new Date().toISOString(),
    }
  }

  if (eventName === 'issues') {
    const action = String(payload.action || '')
    const targetStatus = action === 'closed' ? 'done' : action === 'opened' || action === 'reopened' ? 'todo' : null
    if (!targetStatus) return null
    return {
      source: 'github-issue',
      action,
      jiraKey,
      targetStatus,
      ref: `GH#${payload.issue?.number ?? '?'}`,
      title: String(payload.issue?.title || '').slice(0, 140),
      url: String(payload.issue?.html_url || ''),
      receivedAt: new Date().toISOString(),
    }
  }

  return null
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 204)
  }

  const limit = limiter.check(clientKey(req, `github-webhook:${req.method || 'GET'}`))
  applyRateLimitHeaders(res, limit)
  if (!limit.allowed) {
    return send(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limit.retryAfterSec })
  }

  const storage = getVercelStorageInfo()
  const secret = (process.env.GITHUB_WEBHOOK_SECRET || '').trim()

  if (req.method === 'GET') {
    let recentEvents = []
    if (storage.configured) {
      try {
        const stored = await vercelStorageGet(WEBHOOK_LOG_KEY)
        if (Array.isArray(stored)) recentEvents = stored.slice(0, 15)
      } catch {
        recentEvents = []
      }
    }
    return send(res, 200, {
      ok: true,
      service: 'dreamex-github-webhook',
      webhookSecretConfigured: Boolean(secret),
      storageDriver: storage.driver,
      supportedEvents: ['pull_request', 'issues', 'ping'],
      recentEvents,
    })
  }

  if (req.method === 'POST') {
    if (!secret) {
      return send(res, 503, {
        error: 'webhook_secret_not_configured',
        message: 'Set GITHUB_WEBHOOK_SECRET in Vercel Project Settings -> Environment Variables to receive signed GitHub webhooks.',
      })
    }

    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : req.body && typeof req.body === 'object'
          ? JSON.stringify(req.body)
          : ''
    if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return send(res, 400, { error: 'invalid_payload' })
    }

    const sig = req.headers?.['x-hub-signature-256'] || req.headers?.['X-Hub-Signature-256'] || ''
    if (!verifyGithubSignature(rawBody, sig, secret)) {
      return send(res, 401, { error: 'invalid_signature' })
    }

    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return send(res, 400, { error: 'invalid_json' })
    }

    const eventName = String(req.headers?.['x-github-event'] || req.headers?.['X-GitHub-Event'] || 'ping').toLowerCase()
    if (eventName === 'ping') {
      return send(res, 200, { ok: true, event: 'ping', zen: payload.zen || 'DreamEx GitHub 2-Way Bridge Active' })
    }

    const transition = deriveJiraTransition(eventName, payload)
    if (!transition) {
      return send(res, 202, { ok: true, ignored: true, event: eventName })
    }

    let persisted = false
    if (storage.configured) {
      try {
        const existing = await vercelStorageGet(WEBHOOK_LOG_KEY)
        const nextList = [transition, ...(Array.isArray(existing) ? existing : [])].slice(0, 25)
        const written = await vercelStorageSet(WEBHOOK_LOG_KEY, nextList, 60 * 60 * 24 * 14)
        persisted = written.ok
      } catch {
        persisted = false
      }
    }

    return send(res, 200, { ok: true, event: eventName, persisted, transition })
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS')
  return send(res, 405, { error: 'method_not_allowed' })
}
