import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'

const MAX_BODY_BYTES = 4096
const MAX_HTML_CHARS = 90_000
const graderReadLimiter = createRateLimiter({ maxRequests: 45, windowMs: 60_000 })
const graderScanLimiter = createRateLimiter({ maxRequests: 18, windowMs: 60_000 })

export function resetGraderRateLimiter() {
  graderReadLimiter.reset()
  graderScanLimiter.reset()
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

export function isBlockedIpAddress(address) {
  const clean = String(address || '').trim().toLowerCase().replace(/^\[|\]$/g, '')
  const mappedV4 = clean.startsWith('::ffff:') ? clean.slice(7) : clean
  if (isIP(mappedV4) === 4) {
    const parts = mappedV4.split('.').map(part => Number.parseInt(part, 10))
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a >= 224) return true
    return false
  }
  if (isIP(clean) === 6) {
    if (clean === '::' || clean === '::1') return true
    if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) {
      return true
    }
    return false
  }
  return true
}

export function normalizePublicTargetUrl(rawTarget) {
  if (typeof rawTarget !== 'string') return { error: 'invalid_target' }
  const trimmed = rawTarget.trim()
  if (!trimmed || trimmed.length > 260) return { error: 'invalid_target' }
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed
  try {
    parsed = new URL(withProtocol)
  } catch {
    return { error: 'invalid_target' }
  }

  if (parsed.protocol !== 'https:') return { error: 'https_required' }
  if (parsed.username || parsed.password) return { error: 'credentials_not_allowed' }
  if (parsed.port && parsed.port !== '443') return { error: 'custom_port_not_allowed' }

  const host = parsed.hostname.toLowerCase()
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa') ||
    !host.includes('.')
  ) {
    return { error: 'private_or_invalid_host' }
  }

  if (isIP(host.replace(/^\[|\]$/g, '')) !== 0 && isBlockedIpAddress(host)) {
    return { error: 'private_or_invalid_host' }
  }

  parsed.hash = ''
  return { url: parsed }
}

async function assertPublicDns(hostname, dnsResolver = lookup) {
  if (isIP(hostname) !== 0) {
    if (isBlockedIpAddress(hostname)) throw new Error('private_ip_blocked')
    return
  }
  const records = await dnsResolver(hostname, { all: true })
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('dns_unresolvable')
  }
  for (const entry of records) {
    if (isBlockedIpAddress(entry.address)) {
      throw new Error('private_ip_blocked')
    }
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

function computeGrade(score) {
  if (score >= 92) return 'A+'
  if (score >= 82) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

async function probePath(originUrl, path, fetchImpl) {
  try {
    const res = await fetchImpl(new URL(path, originUrl).toString(), {
      method: 'GET',
      headers: { 'User-Agent': 'DreamEx-AI-Readiness-Grader/6.0 (+https://dreamex.tech/grader)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(3_500),
    })
    return res.status >= 200 && res.status < 400
  } catch {
    return false
  }
}

export async function runReadinessScan(targetUrl, options = {}) {
  const fetchImpl = options.fetchImpl || fetch
  const dnsResolver = options.dnsResolver || lookup

  await assertPublicDns(targetUrl.hostname, dnsResolver)

  const startedAt = Date.now()
  const response = await fetchImpl(targetUrl.toString(), {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'User-Agent': 'DreamEx-AI-Readiness-Grader/6.0 (+https://dreamex.tech/grader)',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(5_500),
  })

  let finalResponse = response
  let effectiveUrl = targetUrl
  if ([301, 302, 307, 308].includes(response.status)) {
    const location = response.headers.get('location')
    if (location) {
      const redirected = normalizePublicTargetUrl(new URL(location, targetUrl).toString())
      if (!redirected.error && redirected.url) {
        await assertPublicDns(redirected.url.hostname, dnsResolver)
        effectiveUrl = redirected.url
        finalResponse = await fetchImpl(effectiveUrl.toString(), {
          method: 'GET',
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'User-Agent': 'DreamEx-AI-Readiness-Grader/6.0 (+https://dreamex.tech/grader)',
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(5_000),
        })
      }
    }
  }

  const latencyMs = Math.max(1, Date.now() - startedAt)
  const rawBody = (await finalResponse.text()).slice(0, MAX_HTML_CHARS)
  const headers = finalResponse.headers

  const originRoot = `${effectiveUrl.protocol}//${effectiveUrl.host}`
  const [hasLlmsTxt, hasRobotsTxt, hasSitemapXml] = await Promise.all([
    probePath(originRoot, '/llms.txt', fetchImpl),
    probePath(originRoot, '/robots.txt', fetchImpl),
    probePath(originRoot, '/sitemap.xml', fetchImpl),
  ])

  const csp = headers.get('content-security-policy') || ''
  const hsts = headers.get('strict-transport-security') || ''
  const xcto = headers.get('x-content-type-options') || ''
  const xfo = headers.get('x-frame-options') || ''
  const referrer = headers.get('referrer-policy') || ''
  const permissions = headers.get('permissions-policy') || ''
  const cacheControl = headers.get('cache-control') || ''

  const hasLang = /<html\b[^>]*\blang=["'][^"']+["']/i.test(rawBody)
  const hasTitle = /<title>[^<]{8,}<\/title>/i.test(rawBody)
  const hasDescription = /<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']{30,}["']/i.test(rawBody)
  const hasCanonical = /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\//i.test(rawBody)
  const hasOgImage = /<meta\b[^>]*property=["']og:image["'][^>]*content=["']https?:\/\//i.test(rawBody)
  const hasJsonLd = /application\/ld\+json/i.test(rawBody)
  const hasMain = /<main\b|role=["']main["']/i.test(rawBody)
  const hasH1 = /<h1\b/i.test(rawBody)

  const securityScore =
    (csp ? 9 : 0) +
    (hsts ? 5 : 0) +
    (xcto.toLowerCase() === 'nosniff' ? 4 : 0) +
    (xfo || csp.includes('frame-ancestors') ? 3 : 0) +
    (referrer ? 2 : 0) +
    (permissions ? 2 : 0)

  const aiDiscoveryScore =
    (hasLlmsTxt ? 8 : 0) +
    (hasRobotsTxt ? 5 : 0) +
    (hasSitemapXml ? 5 : 0) +
    (hasJsonLd ? 4 : 0) +
    (hasOgImage ? 3 : 0)

  const semanticScore =
    (hasLang ? 4 : 0) +
    (hasTitle ? 4 : 0) +
    (hasDescription ? 4 : 0) +
    (hasMain ? 4 : 0) +
    (hasH1 ? 4 : 0)

  const transportScore =
    5 + // HTTPS verified
    (latencyMs <= 450 ? 6 : latencyMs <= 1000 ? 4 : 2) +
    (cacheControl ? 4 : 2)

  const governanceScore =
    (hasCanonical ? 6 : 0) +
    (finalResponse.status >= 200 && finalResponse.status < 300 ? 6 : 2) +
    (!csp.includes("'unsafe-eval'") ? 3 : 0)

  const totalScore = Math.min(100, securityScore + aiDiscoveryScore + semanticScore + transportScore + governanceScore)
  const grade = computeGrade(totalScore)

  const checks = [
    { id: 'csp', pillar: 'Zero-Trust Security', label: 'Enforcing Content-Security-Policy (CSP)', passed: Boolean(csp), detail: csp ? 'Active enforcing CSP header detected' : 'Missing Content-Security-Policy response header' },
    { id: 'hsts', pillar: 'Zero-Trust Security', label: 'HTTP Strict-Transport-Security (HSTS)', passed: Boolean(hsts), detail: hsts || 'Add Strict-Transport-Security: max-age=31536000' },
    { id: 'llms', pillar: 'AI Agent Readiness', label: '/llms.txt Machine-Readable AI Manifest', passed: hasLlmsTxt, detail: hasLlmsTxt ? `${originRoot}/llms.txt is published for AI agents` : 'Publish /llms.txt so LLM search & coding agents index your architecture' },
    { id: 'sitemap', pillar: 'AI Agent Readiness', label: '/sitemap.xml & /robots.txt Discovery', passed: hasRobotsTxt && hasSitemapXml, detail: `robots.txt: ${hasRobotsTxt ? 'OK' : 'Missing'} · sitemap.xml: ${hasSitemapXml ? 'OK' : 'Missing'}` },
    { id: 'jsonld', pillar: 'AI Agent Readiness', label: 'Schema.org JSON-LD Structured Graph', passed: hasJsonLd, detail: hasJsonLd ? 'Structured JSON-LD graph embedded' : 'Add Organization/WebSite JSON-LD metadata' },
    { id: 'social', pillar: 'Governance & Social', label: 'High-Impact Social Preview (og:image + canonical)', passed: hasOgImage && hasCanonical, detail: `og:image: ${hasOgImage ? 'OK' : 'Missing'} · canonical: ${hasCanonical ? 'OK' : 'Missing'}` },
    { id: 'a11y', pillar: 'Semantic & A11y', label: 'HTML lang, <main> Landmark & Primary <h1>', passed: hasLang && hasMain && hasH1, detail: `lang: ${hasLang ? 'OK' : 'Missing'} · <main>: ${hasMain ? 'OK' : 'Missing'} · <h1>: ${hasH1 ? 'OK' : 'Missing'}` },
    { id: 'edge', pillar: 'Edge Transport', label: 'HTTPS Edge Response & TTFB Latency', passed: latencyMs < 1000, detail: `HTTP ${finalResponse.status} in ${latencyMs} ms` },
  ]

  return {
    ok: true,
    scannedAt: new Date().toISOString(),
    domain: effectiveUrl.hostname,
    url: effectiveUrl.toString(),
    httpStatus: finalResponse.status,
    latencyMs,
    score: totalScore,
    grade,
    pillars: [
      { id: 'security', label: 'Zero-Trust Security', score: securityScore, max: 25 },
      { id: 'ai', label: 'AI Agent & Search Readiness', score: aiDiscoveryScore, max: 25 },
      { id: 'semantic', label: 'Semantic & Accessibility', score: semanticScore, max: 20 },
      { id: 'transport', label: 'Edge Transport & TTFB', score: transportScore, max: 15 },
      { id: 'governance', label: 'Canonical & Social Governance', score: governanceScore, max: 15 },
    ],
    checks,
    badgeUrl: `https://dreamex.tech/api/badge?domain=${encodeURIComponent(effectiveUrl.hostname)}&score=${totalScore}&grade=${encodeURIComponent(grade)}`,
  }
}

export default async function handler(req, res, internalDeps = {}) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin && !allowedOrigins().has(origin)) {
    return send(res, 403, { error: 'origin_not_allowed' })
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 204)
  }

  const limiter = req.method === 'GET' ? graderReadLimiter : graderScanLimiter
  const limitResult = limiter.check(clientKey(req, req.method === 'GET' ? 'grader:get' : 'grader:post'))
  applyRateLimitHeaders(res, limitResult)
  if (!limitResult.allowed) {
    return send(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limitResult.retryAfterSec })
  }

  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      service: 'dreamex-ai-readiness-grader',
      version: '6.0',
      pillars: ['Zero-Trust Security', 'AI Agent Readiness', 'Semantic & A11y', 'Edge Transport', 'Social Governance'],
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return send(res, 405, { error: 'method_not_allowed' })
  }

  const parsed = parseBody(req)
  if (parsed.error) return send(res, 400, { error: parsed.error })

  const normalized = normalizePublicTargetUrl(parsed.value?.url || parsed.value?.target)
  if (normalized.error || !normalized.url) {
    return send(res, 400, { error: normalized.error || 'invalid_target' })
  }

  try {
    const report = await runReadinessScan(normalized.url, internalDeps)
    return send(res, 200, report)
  } catch (err) {
    const code = err instanceof Error ? err.message : 'scan_failed'
    if (code === 'private_ip_blocked' || code === 'dns_unresolvable') {
      return send(res, 400, { error: code })
    }
    return send(res, 502, { error: 'upstream_unreachable' })
  }
}
