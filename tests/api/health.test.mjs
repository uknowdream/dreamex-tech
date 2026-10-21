import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/health.js'

const keys = ['DREAMEX_WORKSPACE_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))

function invoke(method = 'GET') {
  const req = { method, headers: {} }
  const res = {
    statusCode: 200,
    headers: {},
    output: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value = '') { this.output = value; this.writableEnded = true },
  }
  handler(req, res)
  return { status: res.statusCode, headers: res.headers, body: res.output ? JSON.parse(res.output) : null }
}

function restore() {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

test('health endpoint reports public integration capabilities without secret values', () => {
  restore()
  const result = invoke()
  assert.equal(result.status, 200)
  assert.equal(result.body.status, 'ok')
  assert.equal(result.body.integrations.githubActions, 'public-read')
  assert.equal(result.body.integrations.vulnerabilityAdvisories, 'OSV.dev')
  assert.equal(result.body.integrations.teamWorkspace, 'configuration_required')
  assert.equal(JSON.stringify(result.body).includes('DREAMEX_WORKSPACE_TOKEN'), false)
  assert.equal(result.headers['cache-control'], 'no-store, max-age=0')
})

test('health endpoint indicates shared workspace readiness only when all server settings validate', () => {
  process.env.DREAMEX_WORKSPACE_TOKEN = 'x'.repeat(40)
  process.env.KV_REST_API_URL = 'https://redis.example.test'
  process.env.KV_REST_API_TOKEN = 'server-only-test-secret'
  const ready = invoke()
  assert.equal(ready.body.integrations.teamWorkspace, 'configured')
  process.env.KV_REST_API_URL = 'http://redis.example.test'
  const unsafe = invoke()
  assert.equal(unsafe.body.integrations.teamWorkspace, 'configuration_required')
  restore()
})

test('health endpoint rejects unsupported methods', () => {
  const result = invoke('POST')
  assert.equal(result.status, 405)
  assert.equal(result.headers.allow, 'GET, HEAD')
  restore()
})
