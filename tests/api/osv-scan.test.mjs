import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/osv-scan.js'

const originalFetch = globalThis.fetch
const originalEnv = { NODE_ENV: process.env.NODE_ENV }

function invoke(method, options = {}) {
  const headers = { ...(options.headers || {}) }
  const req = { method, headers, body: options.body, url: options.url || '/' }
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

function jsonHeaders(extra = {}) {
  return { 'content-type': 'application/json', origin: 'https://dreamex.tech', ...extra }
}

function restore() {
  globalThis.fetch = originalFetch
  if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalEnv.NODE_ENV
}

test('OSV scan endpoint rejects methods other than JSON POST', async () => {
  const result = await invoke('GET')
  assert.equal(result.status, 405)
  assert.equal(result.headers.allow, 'POST')
  assert.equal(result.headers['cache-control'], 'no-store, max-age=0')
})

test('OSV scan endpoint validates content type and payload before calling upstream', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls += 1; throw new Error('should not call upstream') }
  try {
    const contentType = await invoke('POST', { headers: { 'content-type': 'text/plain' }, body: { packages: [] } })
    assert.equal(contentType.status, 415)
    const missing = await invoke('POST', { headers: jsonHeaders(), body: { packages: [] } })
    assert.equal(missing.status, 400)
    assert.equal(missing.body.error, 'packages_required')
    const invalid = await invoke('POST', {
      headers: jsonHeaders(),
      body: { packages: [{ id: 'component-1', purl: 'https://attacker.example/pkg', version: '1.0.0' }] },
    })
    assert.equal(invalid.status, 400)
    assert.equal(invalid.body.error, 'invalid_package')
    assert.equal(calls, 0)
  } finally { restore() }
})

test('OSV scan endpoint rejects oversized package batches and untrusted origins', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls += 1; throw new Error('should not call upstream') }
  try {
    const tooMany = await invoke('POST', {
      headers: jsonHeaders(),
      body: { packages: Array.from({ length: 101 }, (_, index) => ({ id: 'c-' + index, purl: 'pkg:npm/example@1.0.0', version: '1.0.0' })) },
    })
    assert.equal(tooMany.status, 413)
    assert.equal(tooMany.body.maxPackages, 100)
    const origin = await invoke('POST', {
      headers: jsonHeaders({ origin: 'https://attacker.example' }),
      body: { packages: [{ id: 'a', purl: 'pkg:npm/lodash@4.17.21', version: '4.17.21' }] },
    })
    assert.equal(origin.status, 403)
    assert.equal(calls, 0)
  } finally { restore() }
})

test('OSV scan queries the fixed OSV API and enriches returned advisories', async () => {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    if (String(url) === 'https://api.osv.dev/v1/querybatch') {
      const body = JSON.parse(options.body)
      assert.equal(body.queries.length, 2)
      assert.deepEqual(body.queries[0], { package: { purl: 'pkg:npm/lodash@4.17.21' } })
      assert.deepEqual(body.queries[1], { package: { purl: 'pkg:npm/example' }, version: '1.2.0' })
      return new Response(JSON.stringify({ results: [
        { vulns: [{ id: 'GHSA-test-1234', modified: '2026-10-01T00:00:00Z' }] },
        { vulns: [] },
      ] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (String(url) === 'https://api.osv.dev/v1/vulns/GHSA-test-1234') {
      return new Response(JSON.stringify({
        id: 'GHSA-test-1234',
        summary: 'Illustrative advisory summary',
        details: 'Advisory details.',
        modified: '2026-10-02T00:00:00Z',
        database_specific: { severity: 'HIGH' },
        references: [{ type: 'ADVISORY', url: 'https://example.org/advisory' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('Unexpected upstream URL: ' + String(url))
  }
  try {
    const result = await invoke('POST', {
      headers: jsonHeaders(),
      body: { packages: [
        { id: 'component-1', purl: 'pkg:npm/lodash@4.17.21', version: '4.17.21' },
        { id: 'component-2', purl: 'pkg:npm/example', version: '1.2.0' },
      ] },
    })
    assert.equal(result.status, 200)
    assert.equal(result.body.source, 'OSV.dev')
    assert.equal(result.body.scannedCount, 2)
    assert.equal(result.body.advisoryCount, 1)
    assert.equal(result.body.results[0].vulnerabilities[0].id, 'GHSA-test-1234')
    assert.equal(result.body.advisories[0].severity, 'high')
    assert.equal(result.body.advisories[0].recommendation, 'https://example.org/advisory')
    assert.ok(calls.every(call => call.url.startsWith('https://api.osv.dev/')))
  } finally { restore() }
})

test('OSV scan reports unavailable upstream safely without leaking internal details', async () => {
  globalThis.fetch = async () => new Response('upstream private response', { status: 503 })
  try {
    const result = await invoke('POST', {
      headers: jsonHeaders(),
      body: { packages: [{ id: 'component-1', purl: 'pkg:npm/lodash@4.17.21', version: '4.17.21' }] },
    })
    assert.equal(result.status, 502)
    assert.equal(result.body.error, 'vulnerability_source_unavailable')
    assert.equal(result.body.retryable, true)
    assert.equal(JSON.stringify(result.body).includes('upstream private response'), false)
  } finally { restore() }
})
