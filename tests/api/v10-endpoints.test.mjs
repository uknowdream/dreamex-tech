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
