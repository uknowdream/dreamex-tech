import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/team-workspace.js'

const validToken = 'unit-test-workspace-token-32-characters-long'

function invoke(method, options = {}) {
  const headers = { ...(options.headers || {}) }
  const req = { method, headers, body: options.body }
  const res = {
    statusCode: 200,
    headers: {},
    output: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value = '') { this.output = value; this.writableEnded = true },
  }
  return handler(req, res).then(() => ({
    status: res.statusCode,
    headers: res.headers,
    body: res.output ? JSON.parse(res.output) : null,
  }))
}

function setConfigured() {
  process.env.DREAMEX_WORKSPACE_TOKEN = validToken
  process.env.KV_REST_API_URL = 'https://redis.example.test'
  process.env.KV_REST_API_TOKEN = 'unit-test-redis-token'
  process.env.NODE_ENV = 'test'
}

function clearConfigured() {
  delete process.env.DREAMEX_WORKSPACE_TOKEN
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

test('shared workspace returns safe disabled status when server token is not configured', async () => {
  clearConfigured()
  const result = await invoke('GET')
  assert.equal(result.status, 503)
  assert.equal(result.body.error, 'workspace_not_configured')
  assert.equal(result.headers['cache-control'], 'no-store, max-age=0')
})

test('shared workspace rejects unauthorized requests before contacting Redis', async () => {
  clearConfigured()
  process.env.DREAMEX_WORKSPACE_TOKEN = validToken
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Redis must not be called for unauthorized requests') }
  try {
    const result = await invoke('GET')
    assert.equal(result.status, 401)
    assert.equal(result.body.error, 'unauthorized')
  } finally {
    globalThis.fetch = originalFetch
    clearConfigured()
  }
})

test('shared workspace rejects unexpected origins', async () => {
  setConfigured()
  const result = await invoke('GET', { headers: { origin: 'https://attacker.example' } })
  assert.equal(result.status, 403)
  assert.equal(result.body.error, 'origin_not_allowed')
  clearConfigured()
})

test('shared workspace rejects methods outside the documented contract', async () => {
  clearConfigured()
  const result = await invoke('POST')
  assert.equal(result.status, 405)
  assert.match(result.headers.allow, /GET, PUT/)
})

test('shared workspace rejects malformed or oversized update payloads', async () => {
  setConfigured()
  const headers = { authorization: 'Bearer ' + validToken, origin: 'https://dreamex.tech', 'content-type': 'application/json' }
  const malformed = await invoke('PUT', { headers, body: '{' })
  assert.equal(malformed.status, 400)
  const oversized = await invoke('PUT', { headers, body: { revision: 0, state: { data: 'x'.repeat(101_000) } } })
  assert.equal(oversized.status, 413)
  clearConfigured()
})

test('shared workspace applies optimistic revision checks and persists one shared snapshot', async () => {
  setConfigured()
  const originalFetch = globalThis.fetch
  let stored = null
  globalThis.fetch = async (_url, options = {}) => {
    const command = JSON.parse(options.body)
    if (command[0] === 'GET') {
      return new Response(JSON.stringify({ result: stored }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (command[0] === 'EVAL') {
      const expected = Number(command[4])
      const next = command[5]
      const currentRevision = stored ? Number(JSON.parse(stored).revision) : 0
      if (currentRevision !== expected) return new Response(JSON.stringify({ result: [0, stored || ''] }), { status: 200, headers: { 'content-type': 'application/json' } })
      stored = next
      return new Response(JSON.stringify({ result: [1, next] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('Unexpected Redis command')
  }
  try {
    const headers = { authorization: 'Bearer ' + validToken, origin: 'https://dreamex.tech', 'content-type': 'application/json' }
    const first = await invoke('PUT', { headers, body: { revision: 0, state: { project: 'DreamEx', tasks: [{ id: 'T-1' }] } } })
    assert.equal(first.status, 200)
    assert.equal(first.body.revision, 1)
    assert.equal(first.body.state.tasks[0].id, 'T-1')
    const stale = await invoke('PUT', { headers, body: { revision: 0, state: { project: 'stale' } } })
    assert.equal(stale.status, 409)
    assert.equal(stale.body.current.revision, 1)
    const loaded = await invoke('GET', { headers })
    assert.equal(loaded.status, 200)
    assert.equal(loaded.body.revision, 1)
    assert.equal(loaded.body.state.project, 'DreamEx')
    assert.equal(loaded.headers['x-content-type-options'], 'nosniff')
  } finally {
    globalThis.fetch = originalFetch
    clearConfigured()
  }
})
