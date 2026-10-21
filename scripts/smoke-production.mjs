import { readFileSync } from 'node:fs'

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
  { path: '/github-ci', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/team-workspace', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/api/team-workspace', type: 'protected-api', markers: ['"error"'], expectedStatuses: [401, 503] },
  { path: '/qa-studio', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/quality-intelligence', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/supply-chain-intelligence', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/security-center', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/control-plane', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/command-center', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/reliability-center', type: 'html', markers: ['id="root"', '<div'] },
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
  { path: '/rss.xsl', type: 'xml', markers: ['<xsl:stylesheet', 'xsl:template'] },
  { path: '/rss', type: 'html', markers: ['id="root"', '<div'] },
  { path: '/sitemap.xml', type: 'xml', markers: ['<urlset', '<url'] },
]

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const articleSource = readFileSync(new URL('../src/articles.ts', import.meta.url), 'utf8')
const translationSource = readFileSync(new URL('../src/articleTranslations.ts', import.meta.url), 'utf8')
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const routeMetadata = [...appSource.matchAll(/^\s*'([^']+)': \{ en: \{ title: '([^']+)', description: '([^']+)' \}, id: \{ title: '([^']+)', description: '([^']+)' \} \},?$/gm)]
  .map(match => ({ path: match[1], title: match[2], description: match[3] }))
const missingRouteChecks = routeMetadata.filter(metadata => metadata.path !== '/blog/:slug' && !checks.some(item => item.path === metadata.path && item.type === 'html'))
if (missingRouteChecks.length) throw new Error('Production smoke route inventory is missing static metadata checks: ' + missingRouteChecks.map(item => item.path).join(', '))
for (const metadata of routeMetadata) {
  const check = checks.find(item => item.path === metadata.path && item.type === 'html')
  if (!check) continue
  const canonical = 'https://dreamex.tech' + (metadata.path === '/' ? '/' : metadata.path)
  check.markers.push(
    '<title>' + escapeHtml(metadata.title) + '</title>',
    '<meta property="og:url" content="' + canonical + '" />',
    '<link rel="canonical" href="' + canonical + '" />',
  )
  if (metadata.path === '/reading-list') check.markers.push('<meta name="robots" content="noindex, follow" />')
}

const translations = new Map([...translationSource.matchAll(/^\s*'([^']+)':\s*\{\s*title:\s*'([^']*)',\s*excerpt:\s*'([^']*)'/gm)]
  .map(match => [match[1], { title: match[2], description: match[3] }]))
const articleObjects = [...articleSource.matchAll(/\{\s*slug:\s*'([^']+)'([\s\S]*?)\s*\},?/g)]
function articleField(body, field) {
  return body.match(new RegExp("(?:^|[,\\n]\\s*)" + field + ":\\s*'([^']*)'"))?.[1]
}
for (const match of articleObjects) {
  const slug = match[1]
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue
  const translated = translations.get(slug)
  const date = articleField(match[2], 'date')
  if (!translated?.title || !translated.description || !date) continue
  const pathname = '/blog/' + slug
  const canonical = 'https://dreamex.tech' + pathname
  checks.push({
    path: pathname,
    type: 'html',
    markers: [
      'id="root"',
      '<title>' + escapeHtml(translated.title + ' — DreamEx Tech') + '</title>',
      '<meta name="description" content="' + escapeHtml(translated.description) + '" />',
      '<meta property="og:url" content="' + canonical + '" />',
      '<link rel="canonical" href="' + canonical + '" />',
      '<meta property="og:type" content="article" />',
      '<meta property="article:published_time" content="' + date + '" />',
    ],
  })
}

const requiredSecurityHeaders = [
  ['strict-transport-security', /max-age=31536000/i],
  ['x-content-type-options', /^nosniff$/i],
  ['x-frame-options', /^(deny|sameorigin)$/i],
  ['referrer-policy', /^strict-origin-when-cross-origin$/i],
  ['permissions-policy', /camera=.*microphone=.*geolocation=/i],
]
const enforcedDirectives = ["default-src 'self'", "script-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "upgrade-insecure-requests"]
const reportOnlyDirectives = ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]

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
        headers: { 'user-agent': 'DreamEx-Production-Smoke/1.0', accept: check.type === 'xml' ? 'application/xml,text/xml,*/*' : check.type === 'protected-api' || check.type === 'json' ? 'application/json,*/*' : 'text/html,*/*' },
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
  if (check.expectedStatuses ? !check.expectedStatuses.includes(response.status) : !response.ok) issues.push(`unexpected HTTP status ${response.status}`)
  if (check.type === 'html') {
    for (const [header, pattern] of requiredSecurityHeaders) {
      const value = response.headers.get(header) || ''
      if (!pattern.test(value)) issues.push(`security header ${header} is missing or does not meet the baseline (${value || 'missing'})`)
    }
    const enforced = response.headers.get('content-security-policy') || ''
    if (!enforced) issues.push('Enforcing Content-Security-Policy is missing')
    else {
      const normalizedPolicy = enforced.toLowerCase()
      for (const directive of enforcedDirectives) if (!normalizedPolicy.includes(directive)) issues.push('Content-Security-Policy is missing a required directive: ' + directive)
      const scriptDirective = normalizedPolicy.split(';').map(part => part.trim()).find(part => part.startsWith('script-src '))
      if (scriptDirective?.includes("'unsafe-inline'")) issues.push("Content-Security-Policy script-src must not include 'unsafe-inline'.")
    }
    const reportOnly = response.headers.get('content-security-policy-report-only') || ''
    if (!reportOnly) issues.push('Content-Security-Policy-Report-Only is missing during staged policy monitoring')
    else for (const directive of reportOnlyDirectives) if (!reportOnly.toLowerCase().includes(directive)) issues.push('Content-Security-Policy-Report-Only is missing a required baseline directive: ' + directive)
  }
  if (check.type === 'html' && !contentType.toLowerCase().includes('text/html')) issues.push(`expected HTML content-type, received ${contentType || '(missing)'}`)
  if (check.type === 'xml' && !/(application|text)\/(xml|rss\+xml)/i.test(contentType)) issues.push(`expected XML content-type, received ${contentType || '(missing)'}`)
  if (['json', 'protected-api'].includes(check.type) && !/(application\/(json|manifest\+json))/i.test(contentType)) issues.push(`expected JSON/manifest content-type, received ${contentType || '(missing)'}`)
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
