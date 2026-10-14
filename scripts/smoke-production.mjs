const baseUrl = new URL(process.env.SMOKE_BASE_URL || 'https://www.dreamex.tech')
if (baseUrl.protocol !== 'https:' && process.env.ALLOW_INSECURE_SMOKE !== '1') {
  throw new Error('Production smoke checks require HTTPS. Set ALLOW_INSECURE_SMOKE=1 only for local test environments.')
}
if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/') {
  throw new Error('SMOKE_BASE_URL must be a clean origin without credentials, path, query, or fragment.')
}

const checks = [
  { path: '/', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/api-playground', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/qa-studio', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/supply-chain-intelligence', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/security-center', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/control-plane', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/command-center', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/roadmap', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/workspace', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/observatory', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/devtools', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/engineering-intelligence', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/performance', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/knowledge-graph', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/lab', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/learn', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/about', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/reading-list', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/robots.txt', type: 'text', markers: ['User-agent:', 'Sitemap:'] },
  { path: '/manifest.webmanifest', type: 'json', markers: ['"name"', 'DreamEx Tech'] },
  { path: '/rss.xml', type: 'xml', markers: ['<rss', '<channel'] },
  { path: '/rss', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/sitemap.xml', type: 'xml', markers: ['<urlset', '<url'] },
]

const requiredSecurityHeaders = [
  ['strict-transport-security', /max-age=31536000/i],
  ['x-content-type-options', /^nosniff$/i],
  ['x-frame-options', /^(deny|sameorigin)$/i],
  ['referrer-policy', /^strict-origin-when-cross-origin$/i],
  ['permissions-policy', /camera=\\(\\),\\s*microphone=\\(\\),\\s*geolocation=\\(\\)/i],
]
const reportOnlyDirectives = [
  /default-src\\s+['"]?self['"]?/i,
  /object-src\\s+['"]?none['"]?/i,
  /frame-ancestors\\s+['"]?none['"]?/i,
]

const failures = []
const results = await Promise.all(checks.map(async check => {
  const url = new URL(check.path, baseUrl)
  let response
  let error
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
        headers: { 'user-agent': 'DreamEx-Production-Smoke/1.0', accept: check.type === 'xml' ? 'application/xml,text/xml,*/*' : 'text/html,*/*' },
      })
      if (response.status >= 500 && attempt < 2) {
        await response.body?.cancel()
        continue
      }
      break
    } catch (cause) {
      error = cause
      if (attempt < 2) continue
    }
  }

  if (!response) {
    const message = `${check.path}: request failed after retry — ${error instanceof Error ? error.message : String(error)}`
    failures.push(message)
    return { path: check.path, ok: false, message }
  }

  const contentType = response.headers.get('content-type') || ''
  const body = await response.text()
  const issues = []
  if (!response.ok) issues.push(`HTTP ${response.status}`)
  if (check.type === 'html') {
    for (const [header, pattern] of requiredSecurityHeaders) {
      const value = response.headers.get(header) || ''
      if (!pattern.test(value)) issues.push(`security header ${header} is missing or does not meet the baseline (${value || 'missing'})`)
    }
    const reportOnly = response.headers.get('content-security-policy-report-only') || ''
    if (!reportOnly) issues.push('Content-Security-Policy-Report-Only is missing')
    else for (const directive of reportOnlyDirectives) if (!directive.test(reportOnly)) issues.push('Content-Security-Policy-Report-Only is missing a required baseline directive: ' + directive)
  }
  if (check.type === 'html' && !contentType.toLowerCase().includes('text/html')) issues.push(`expected HTML content-type, received ${contentType || '(missing)'}`)
  if (check.type === 'xml' && !/(application|text)\/(xml|rss\+xml)/i.test(contentType)) issues.push(`expected XML content-type, received ${contentType || '(missing)'}`)
  if (check.type === 'json' && !/(application\/(json|manifest\+json))/i.test(contentType)) issues.push(`expected JSON/manifest content-type, received ${contentType || '(missing)'}`)
  if (check.type === 'text' && !contentType.toLowerCase().includes('text/plain')) issues.push(`expected plain-text content-type, received ${contentType || '(missing)'}`)
  for (const marker of check.markers) {
    if (!body.toLowerCase().includes(marker.toLowerCase())) issues.push(`missing expected marker ${JSON.stringify(marker)}`)
  }
  const finalUrl = new URL(response.url)
  if (finalUrl.protocol !== 'https:' && process.env.ALLOW_INSECURE_SMOKE !== '1') issues.push(`redirected to non-HTTPS URL ${response.url}`)
  const expectedHosts = new Set([baseUrl.hostname, baseUrl.hostname.startsWith('www.') ? baseUrl.hostname.slice(4) : `www.${baseUrl.hostname}`])
  if (!expectedHosts.has(finalUrl.hostname)) issues.push(`redirected outside the configured host family to ${finalUrl.hostname}`)

  const message = issues.length ? issues.join('; ') : `HTTP ${response.status}; ${contentType}; ${body.length} bytes`
  if (issues.length) failures.push(`${check.path}: ${message}`)
  return { path: check.path, ok: issues.length === 0, message }
}))

for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.path} — ${result.message}`)
}
console.log(`\nProduction smoke summary: ${results.filter(result => result.ok).length}/${results.length} checks passed.`)
if (failures.length) {
  console.error('\nFailures:')
  failures.forEach(failure => console.error(` - ${failure}`))
  process.exitCode = 1
}
