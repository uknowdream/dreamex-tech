import assert from 'node:assert/strict'
import test from 'node:test'
import jiraSyncHandler, { resetJiraSyncRateLimiter } from '../../api/jira-sync.js'
import contactHandler, { resetContactRateLimiter } from '../../api/contact.js'

function createMockRes() {
  const headers = {}
  let rawBody = ''
  return {
    statusCode: 200,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value
    },
    end(chunk = '') {
      rawBody += String(chunk)
    },
    get headers() {
      return headers
    },
    json() {
      return rawBody ? JSON.parse(rawBody) : null
    },
  }
}

test('GET /api/jira-sync returns healthy telemetry when Upstash KV is not configured', async () => {
  resetJiraSyncRateLimiter()
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL
  const prevTok = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  try {
    const res = createMockRes()
    await jiraSyncHandler({ method: 'GET', url: '/api/jira-sync', headers: {} }, res)
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.ok, true)
    assert.equal(body.service, 'dreamex-jira-sync')
    assert.equal(body.cloudConfigured, false)
  } finally {
    if (prevUrl) process.env.UPSTASH_REDIS_REST_URL = prevUrl
    if (prevTok) process.env.UPSTASH_REDIS_REST_TOKEN = prevTok
  }
})

test('GET /api/jira-sync?room= rejects short room codes with 400 and returns 503 when cloud KV is unconfigured', async () => {
  resetJiraSyncRateLimiter()
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL
  const prevTok = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  try {
    const resBad = createMockRes()
    await jiraSyncHandler({ method: 'GET', url: '/api/jira-sync?room=ab', headers: {} }, resBad)
    assert.equal(resBad.statusCode, 400)

    const resUnconf = createMockRes()
    await jiraSyncHandler({ method: 'GET', url: '/api/jira-sync?room=dreamex-sprint-24', headers: {} }, resUnconf)
    assert.equal(resUnconf.statusCode, 503)
    assert.equal(resUnconf.json().error, 'cloud_storage_not_configured')
  } finally {
    if (prevUrl) process.env.UPSTASH_REDIS_REST_URL = prevUrl
    if (prevTok) process.env.UPSTASH_REDIS_REST_TOKEN = prevTok
  }
})

test('PUT /api/jira-sync persists snapshot with optimistic revision checks when Upstash KV is configured', async () => {
  resetJiraSyncRateLimiter()
  const store = new Map()
  const origFetch = globalThis.fetch
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL
  const prevTok = process.env.UPSTASH_REDIS_REST_TOKEN
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.example.com'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-secret-token'
  globalThis.fetch = async (_url, opts) => {
    const cmd = JSON.parse(opts.body)
    if (cmd[0] === 'GET') {
      return { ok: true, json: async () => ({ result: store.get(cmd[1]) ?? null }) }
    }
    if (cmd[0] === 'SET') {
      store.set(cmd[1], cmd[2])
      return { ok: true, json: async () => ({ result: 'OK' }) }
    }
    return { ok: true, json: async () => ({ result: null }) }
  }
  try {
    const resPut1 = createMockRes()
    await jiraSyncHandler(
      {
        method: 'PUT',
        url: '/api/jira-sync?room=squad-alpha-99',
        headers: {},
        body: { expectedRev: 0, snapshot: { issues: [{ key: 'DX-101' }] } },
      },
      resPut1,
    )
    assert.equal(resPut1.statusCode, 200)
    assert.equal(resPut1.json().rev, 1)

    // Stale expectedRev must return 409 revision_conflict
    const resConflict = createMockRes()
    await jiraSyncHandler(
      {
        method: 'PUT',
        url: '/api/jira-sync?room=squad-alpha-99',
        headers: {},
        body: { expectedRev: 0, snapshot: { issues: [{ key: 'DX-102' }] } },
      },
      resConflict,
    )
    assert.equal(resConflict.statusCode, 409)
    assert.equal(resConflict.json().error, 'revision_conflict')

    // Read back synced snapshot
    const resGet = createMockRes()
    await jiraSyncHandler({ method: 'GET', url: '/api/jira-sync?room=squad-alpha-99', headers: {} }, resGet)
    assert.equal(resGet.statusCode, 200)
    assert.equal(resGet.json().found, true)
    assert.equal(resGet.json().rev, 1)
    assert.equal(resGet.json().snapshot.issues[0].key, 'DX-101')
  } finally {
    globalThis.fetch = origFetch
    if (prevUrl) process.env.UPSTASH_REDIS_REST_URL = prevUrl
    else delete process.env.UPSTASH_REDIS_REST_URL
    if (prevTok) process.env.UPSTASH_REDIS_REST_TOKEN = prevTok
    else delete process.env.UPSTASH_REDIS_REST_TOKEN
  }
})

test('POST /api/contact validates inquiry fields and returns signed reference ID', async () => {
  resetContactRateLimiter()
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL
  const prevTok = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  try {
    const resBad = createMockRes()
    await contactHandler(
      { method: 'POST', url: '/api/contact', headers: {}, body: { name: 'A', email: 'bad', message: 'short' } },
      resBad,
    )
    assert.equal(resBad.statusCode, 400)

    const resOk = createMockRes()
    await contactHandler(
      {
        method: 'POST',
        url: '/api/contact',
        headers: {},
        body: {
          name: 'Andi Pratama',
          email: 'andi@fintech.id',
          company: 'Nusantara Pay',
          topic: 'jira-enterprise',
          message: 'Interested in deploying DreamEx Autonomous Jira OS for our 40-engineer squad.',
        },
      },
      resOk,
    )
    assert.equal(resOk.statusCode, 200)
    const body = resOk.json()
    assert.equal(body.ok, true)
    assert.match(body.referenceId, /^DX-REQ-[A-F0-9]{8}$/)
  } finally {
    if (prevUrl) process.env.UPSTASH_REDIS_REST_URL = prevUrl
    if (prevTok) process.env.UPSTASH_REDIS_REST_TOKEN = prevTok
  }
})

import { createHmac } from 'node:crypto'
import githubWebhookHandler, { resetGithubWebhookRateLimiter } from '../../api/github-webhook.js'

test('PUT /api/jira-sync supports first-party Vercel Blob driver (BLOB_READ_WRITE_TOKEN) with zero external DB', async () => {
  resetJiraSyncRateLimiter()
  const blobStore = new Map()
  const origFetch = globalThis.fetch
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL
  const prevTok = process.env.UPSTASH_REDIS_REST_TOKEN
  const prevDb = process.env.DATABASE_URL
  const prevBlob = process.env.BLOB_READ_WRITE_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.DATABASE_URL
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_mock_token_123456'

  globalThis.fetch = async (url, opts = {}) => {
    const s = String(url)
    if (opts.method === 'PUT') {
      const path = s.replace('https://blob.vercel-storage.com/', '')
      blobStore.set(path, opts.body)
      return { ok: true, json: async () => ({ url: s }) }
    }
    if (s.includes('?prefix=')) {
      const prefix = new URL(s).searchParams.get('prefix')
      const found = blobStore.has(prefix) ? [{ pathname: prefix, url: `https://blob.vercel-storage.com/${prefix}` }] : []
      return { ok: true, json: async () => ({ blobs: found }) }
    }
    const path = s.replace('https://blob.vercel-storage.com/', '')
    return { ok: true, json: async () => JSON.parse(blobStore.get(path)) }
  }

  try {
    const resHealth = createMockRes()
    await jiraSyncHandler({ method: 'GET', url: '/api/jira-sync', headers: {} }, resHealth)
    assert.equal(resHealth.json().activeDriver, 'vercel-blob')

    const resPut = createMockRes()
    await jiraSyncHandler(
      {
        method: 'PUT',
        url: '/api/jira-sync?room=blob-squad-11',
        headers: {},
        body: { expectedRev: 0, snapshot: { issues: [{ key: 'DX-555' }] } },
      },
      resPut,
    )
    assert.equal(resPut.statusCode, 200)
    assert.equal(resPut.json().driver, 'vercel-blob')
    assert.equal(resPut.json().rev, 1)

    const resGet = createMockRes()
    await jiraSyncHandler({ method: 'GET', url: '/api/jira-sync?room=blob-squad-11', headers: {} }, resGet)
    assert.equal(resGet.json().found, true)
    assert.equal(resGet.json().snapshot.issues[0].key, 'DX-555')
  } finally {
    globalThis.fetch = origFetch
    if (prevUrl) process.env.UPSTASH_REDIS_REST_URL = prevUrl
    if (prevTok) process.env.UPSTASH_REDIS_REST_TOKEN = prevTok
    if (prevDb) process.env.DATABASE_URL = prevDb
    if (prevBlob) process.env.BLOB_READ_WRITE_TOKEN = prevBlob
    else delete process.env.BLOB_READ_WRITE_TOKEN
  }
})

test('POST /api/contact dispatches optional Slack/Discord webhook notification safely', async () => {
  resetContactRateLimiter()
  const origFetch = globalThis.fetch
  const prevHook = process.env.CONTACT_WEBHOOK_URL
  let webhookBody = null
  process.env.CONTACT_WEBHOOK_URL = 'https://hooks.slack.com/services/T00/B00/XXX'
  globalThis.fetch = async (_url, opts) => {
    webhookBody = JSON.parse(opts.body)
    return { ok: true, json: async () => ({ ok: true }) }
  }
  try {
    const res = createMockRes()
    await contactHandler(
      {
        method: 'POST',
        url: '/api/contact',
        headers: {},
        body: {
          name: 'Siti Rahma',
          email: 'siti@company.co.id',
          company: 'Garuda Cloud',
          topic: 'demo',
          message: 'Looking for a Vercel-native Jira setup for 25 engineers.',
        },
      },
      res,
    )
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().webhookDelivered, true)
    assert.match(webhookBody.text, /DX-REQ-/)
    assert.match(webhookBody.content, /Siti Rahma/)
  } finally {
    globalThis.fetch = origFetch
    if (prevHook) process.env.CONTACT_WEBHOOK_URL = prevHook
    else delete process.env.CONTACT_WEBHOOK_URL
  }
})

test('POST /api/github-webhook verifies HMAC-SHA256 signature and maps merged PR to Jira Done transition', async () => {
  resetGithubWebhookRateLimiter()
  const prevSecret = process.env.GITHUB_WEBHOOK_SECRET
  process.env.GITHUB_WEBHOOK_SECRET = 'super-secret-gh-webhook-key'
  const rawPayload = JSON.stringify({
    action: 'closed',
    pull_request: {
      number: 88,
      merged: true,
      title: 'fix(DX-104): eliminate duplicate settlement posting on retry',
      html_url: 'https://github.com/uknowdream/dreamex-tech/pull/88',
      head: { ref: 'fix/DX-104-settlement' },
    },
  })
  const validSig = `sha256=${createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(rawPayload).digest('hex')}`

  try {
    const resHealth = createMockRes()
    await githubWebhookHandler({ method: 'GET', url: '/api/github-webhook', headers: {} }, resHealth)
    assert.equal(resHealth.statusCode, 200)
    assert.equal(resHealth.json().service, 'dreamex-github-webhook')

    const resBadSig = createMockRes()
    await githubWebhookHandler(
      {
        method: 'POST',
        url: '/api/github-webhook',
        headers: { 'x-github-event': 'pull_request', 'x-hub-signature-256': 'sha256=deadbeef' },
        body: rawPayload,
      },
      resBadSig,
    )
    assert.equal(resBadSig.statusCode, 401)

    const resValid = createMockRes()
    await githubWebhookHandler(
      {
        method: 'POST',
        url: '/api/github-webhook',
        headers: { 'x-github-event': 'pull_request', 'x-hub-signature-256': validSig },
        body: rawPayload,
      },
      resValid,
    )
    assert.equal(resValid.statusCode, 200)
    const data = resValid.json()
    assert.equal(data.ok, true)
    assert.equal(data.transition.jiraKey, 'DX-104')
    assert.equal(data.transition.targetStatus, 'done')
  } finally {
    if (prevSecret) process.env.GITHUB_WEBHOOK_SECRET = prevSecret
    else delete process.env.GITHUB_WEBHOOK_SECRET
  }
})
