const baseUrl = new URL(process.env.SMOKE_BASE_URL || 'https://www.dreamex.tech')
if (baseUrl.protocol !== 'https:' && process.env.ALLOW_INSECURE_SMOKE !== '1') {
  throw new Error('Production smoke checks require HTTPS. Set ALLOW_INSECURE_SMOKE=1 only for local test environments.')
}
if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
  throw new Error('SMOKE_BASE_URL must be a clean origin or path prefix without credentials, query, or fragment.')
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
  { path: '/rss.xml', type: 'xml', markers: ['<rss', '<channel'] },
  { path: '/sitemap.xml', type: 'xml', markers: ['<urlset', '<url'] },
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
  if (check.type === 'html' && !contentType.toLowerCase().includes('text/html')) issues.push(`expected HTML content-type, received ${contentType || '(missing)'}`)
  if (check.type === 'xml' && !/(application|text)\/(xml|rss\+xml)/i.test(contentType)) issues.push(`expected XML content-type, received ${contentType || '(missing)'}`)
  for (const marker of check.markers) {
    if (!body.toLowerCase().includes(marker.toLowerCase())) issues.push(`missing expected marker ${JSON.stringify(marker)}`)
  }
  const finalUrl = new URL(response.url)
  if (finalUrl.protocol !== 'https:' && process.env.ALLOW_INSECURE_SMOKE !== '1') issues.push(`redirected to non-HTTPS URL ${response.url}`)

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
