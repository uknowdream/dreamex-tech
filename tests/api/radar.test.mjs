import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/radar.js'

const originalFetch = globalThis.fetch

function invoke(method, options = {}) {
  const req = { method, headers: options.headers || {}, body: options.body, url: '/api/radar' }
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

test('GET /api/radar returns healthy service telemetry without KV env vars', async () => {
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
  const response = await invoke('GET')
  assert.equal(response.status, 200)
  assert.equal(response.body.service, 'dreamex-radar')
  assert.equal(response.body.persistentStorageConfigured, false)
})

test('POST /api/radar rejects invalid email addresses with 400', async () => {
  const response = await invoke('POST', { body: { email: 'not-an-email' } })
  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'invalid_email')
})

test('POST /api/radar validates cleanly in stateless mode when KV is unconfigured', async () => {
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
  const response = await invoke('POST', { body: { email: 'architect@dreamex.tech', locale: 'en' } })
  assert.equal(response.status, 202)
  assert.equal(response.body.ok, true)
  assert.equal(response.body.mode, 'validated-stateless')
})

test('POST /api/radar persists hashed subscription via Upstash KV when configured', async () => {
  process.env.KV_REST_API_URL = 'https://redis.example.test'
  process.env.KV_REST_API_TOKEN = 'test-token'
  const commands = []
  globalThis.fetch = async (_url, options = {}) => {
    const command = JSON.parse(options.body)
    commands.push(command)
    return {
      ok: true,
      async json() {
        if (command[0] === 'SET') return { result: 'OK' }
        if (command[0] === 'INCR') return { result: 1 }
        return { result: null }
      },
    }
  }
  try {
    const response = await invoke('POST', { body: { email: 'Qa.Lead@dreamex.tech', locale: 'id' } })
    assert.equal(response.status, 200)
    assert.equal(response.body.mode, 'persisted')
    assert.equal(response.body.duplicate, false)
    assert.equal(commands[0][0], 'SET')
    assert.ok(commands[0][1].startsWith('dreamex:radar:subscribers:v1:hash:'))
    assert.equal(commands[1][0], 'INCR')
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  }
})
