import assert from 'node:assert/strict'
import test from 'node:test'
import badgeHandler, { resetBadgeRateLimiter } from '../../api/badge.js'
import graderHandler, { isBlockedIpAddress, normalizePublicTargetUrl, resetGraderRateLimiter } from '../../api/grader.js'
import mcpHandler, { resetMcpRateLimiter } from '../../api/mcp.js'

function mockRes() {
  const headers = new Map()
  return {
    statusCode: 200,
    headers,
    body: '',
    setHeader(key, value) {
      headers.set(String(key).toLowerCase(), String(value))
    },
    end(chunk = '') {
      this.body = String(chunk)
    },
  }
}

test('GET /api/badge renders escaped SVG shield with cross-origin headers', () => {
  resetBadgeRateLimiter()
  const res = mockRes()
  badgeHandler({ method: 'GET', url: '/api/badge?domain=dreamex.tech&score=98&grade=A%2B', headers: {} }, res)
  assert.equal(res.statusCode, 200)
  assert.match(res.headers.get('content-type') || '', /image\/svg\+xml/)
  assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin')
  assert.match(res.body, /DREAMEX AI READY · dreamex\.tech/)
  assert.match(res.body, /98\/100 \(A\+\)/)
})

test('grader SSRF guard rejects private IPs, localhost, and non-HTTPS schemes', () => {
  assert.equal(isBlockedIpAddress('127.0.0.1'), true)
  assert.equal(isBlockedIpAddress('10.0.0.8'), true)
  assert.equal(isBlockedIpAddress('169.254.169.254'), true)
  assert.equal(isBlockedIpAddress('192.168.1.1'), true)
  assert.equal(isBlockedIpAddress('::1'), true)
  assert.equal(isBlockedIpAddress('76.76.21.21'), false)

  assert.equal(normalizePublicTargetUrl('http://example.com').error, 'https_required')
  assert.equal(normalizePublicTargetUrl('https://localhost:3000').error, 'custom_port_not_allowed')
  assert.equal(normalizePublicTargetUrl('https://127.0.0.1').error, 'private_or_invalid_host')
})

test('POST /api/grader evaluates public site security, AI discovery, and semantic signals', async () => {
  resetGraderRateLimiter()
  const res = mockRes()
  const fakeFetch = async url => {
    if (String(url).endsWith('/llms.txt') || String(url).endsWith('/robots.txt') || String(url).endsWith('/sitemap.xml')) {
      return new Response('ok', { status: 200 })
    }
    return new Response(
      '<!doctype html><html lang="en"><head><title>DreamEx Tech — Think deeper. Build smarter.</title><meta name="description" content="Global Autonomous AI Operating System for Software Architecture, QA & Delivery." /><link rel="canonical" href="https://dreamex.tech/" /><meta property="og:image" content="https://dreamex.tech/images/og-default.jpg" /><script type="application/ld+json">{}</script></head><body><main><h1>Engineer with intent</h1></main></body></html>',
      {
        status: 200,
        headers: {
          'content-security-policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none'",
          'strict-transport-security': 'max-age=31536000',
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
          'referrer-policy': 'strict-origin-when-cross-origin',
          'permissions-policy': 'camera=()',
          'cache-control': 'public, max-age=60',
        },
      },
    )
  }
  const fakeDns = async () => [{ address: '76.76.21.21', family: 4 }]

  await graderHandler(
    { method: 'POST', headers: { origin: 'https://dreamex.tech' }, body: { url: 'dreamex.tech' } },
    res,
    { fetchImpl: fakeFetch, dnsResolver: fakeDns },
  )

  assert.equal(res.statusCode, 200)
  const payload = JSON.parse(res.body)
  assert.equal(payload.ok, true)
  assert.equal(payload.domain, 'dreamex.tech')
  assert.ok(payload.score >= 95)
  assert.equal(payload.grade, 'A+')
})

test('POST /api/mcp supports JSON-RPC 2.0 initialize, tools/list, and tools/call', () => {
  resetMcpRateLimiter()

  const initRes = mockRes()
  mcpHandler({ method: 'POST', headers: {}, body: { jsonrpc: '2.0', id: 1, method: 'initialize' } }, initRes)
  assert.equal(initRes.statusCode, 200)
  assert.equal(JSON.parse(initRes.body).result.serverInfo.name, 'dreamex-os-mcp')

  const listRes = mockRes()
  mcpHandler({ method: 'POST', headers: {}, body: { jsonrpc: '2.0', id: 2, method: 'tools/list' } }, listRes)
  const tools = JSON.parse(listRes.body).result.tools
  assert.equal(tools.length, 4)

  const callRes = mockRes()
  mcpHandler(
    {
      method: 'POST',
      headers: {},
      body: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'calculate_usl_scalability', arguments: { alphaContention: 0.025, betaCoherency: 0.0008 } },
      },
    },
    callRes,
  )
  const result = JSON.parse(callRes.body).result.structuredContent
  assert.equal(result.nMaxNodes, 34)
})
