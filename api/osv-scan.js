const MAX_PACKAGES = 100
const MAX_BODY_BYTES = 64 * 1024
const MAX_PURL_LENGTH = 512
const MAX_ADVISORIES = 150
const OSV_API = 'https://api.osv.dev'

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (status === 204) return res.end()
  return res.end(JSON.stringify(payload))
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) return { error: 'payload_too_large' }
    try { return { value: JSON.parse(req.body) } } catch { return { error: 'invalid_json' } }
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return { error: 'invalid_json' }
  let serialized
  try { serialized = JSON.stringify(req.body) } catch { return { error: 'invalid_json' } }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) return { error: 'payload_too_large' }
  return { value: req.body }
}

function queryForPackage(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  const purl = typeof item.purl === 'string' ? item.purl.trim() : ''
  const version = typeof item.version === 'string' ? item.version.trim() : ''
  if (!id || id.length > 300 || /[\u0000-\u001f\u007f]/.test(id)) return null
  if (!purl || purl.length > MAX_PURL_LENGTH || !purl.toLowerCase().startsWith('pkg:') || !purl.includes('/') || /[<>"']/.test(purl) || purl.split('').some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return null
  const path = purl.split(/[?#]/, 1)[0]
  const lastSlash = path.lastIndexOf('/')
  const lastAt = path.lastIndexOf('@')
  const purlIncludesVersion = lastAt > lastSlash
  if (!purlIncludesVersion && !version) return null
  const query = { package: { purl } }
  if (!purlIncludesVersion) query.version = version
  return { id, purl, version, query }
}

function advisorySeverity(value) {
  const databaseSpecific = value && typeof value.database_specific === 'object' ? value.database_specific : {}
  const ecosystemSpecific = value && typeof value.ecosystem_specific === 'object' ? value.ecosystem_specific : {}
  const candidates = [
    databaseSpecific.severity,
    ecosystemSpecific.severity,
    value?.severityText,
  ].filter(item => typeof item === 'string').map(item => item.toLowerCase())
  const text = candidates.join(' ')
  if (/\b(critical|blocker)\b/.test(text)) return 'critical'
  if (/\b(high|important)\b/.test(text)) return 'high'
  if (/\b(medium|moderate|normal)\b/.test(text)) return 'medium'
  if (/\b(low|negligible)\b/.test(text)) return 'low'
  return 'review'
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  })
  if (!response.ok) throw new Error('upstream_unavailable')
  return response.json()
}

async function loadAdvisory(id) {
  try {
    const value = await fetchJson(OSV_API + '/v1/vulns/' + encodeURIComponent(id))
    const references = Array.isArray(value.references)
      ? value.references.map(item => item && typeof item.url === 'string' ? item.url : '').filter(url => /^https?:\/\//i.test(url)).slice(0, 5)
      : []
    const summary = typeof value.summary === 'string' ? value.summary.trim() : ''
    const details = typeof value.details === 'string' ? value.details.trim() : ''
    return {
      id,
      source: 'OSV.dev',
      severity: advisorySeverity(value),
      description: (summary || details || 'OSV.dev returned this advisory without a summary.').slice(0, 2400),
      details: details.slice(0, 4000),
      recommendation: references[0] || ('Review the OSV.dev advisory: https://osv.dev/vulnerability/' + encodeURIComponent(id)),
      references,
      modified: typeof value.modified === 'string' ? value.modified : null,
      url: 'https://osv.dev/vulnerability/' + encodeURIComponent(id),
    }
  } catch {
    return {
      id,
      source: 'OSV.dev',
      severity: 'review',
      description: 'The advisory ID was returned by OSV.dev, but its detail could not be retrieved in this request.',
      details: '',
      recommendation: 'Review the advisory at https://osv.dev/vulnerability/' + encodeURIComponent(id),
      references: [],
      modified: null,
      url: 'https://osv.dev/vulnerability/' + encodeURIComponent(id),
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Vary', 'Origin')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return send(res, 405, { error: 'method_not_allowed' })
  }

  const contentType = typeof req.headers?.['content-type'] === 'string' ? req.headers['content-type'].toLowerCase() : ''
  if (!contentType.startsWith('application/json')) return send(res, 415, { error: 'application_json_required' })

  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  if (origin) {
    const allowed = new Set(['https://dreamex.tech', 'https://www.dreamex.tech'])
    if (process.env.NODE_ENV !== 'production') {
      allowed.add('http://localhost:5173')
      allowed.add('http://localhost:4173')
      allowed.add('http://127.0.0.1:4173')
    }
    if (!allowed.has(origin)) return send(res, 403, { error: 'origin_not_allowed' })
  }

  const rawLength = Number(req.headers?.['content-length'] || 0)
  if (Number.isFinite(rawLength) && rawLength > MAX_BODY_BYTES) return send(res, 413, { error: 'payload_too_large', maxBytes: MAX_BODY_BYTES })

  const parsed = parseBody(req)
  if (parsed.error === 'payload_too_large') return send(res, 413, { error: 'payload_too_large', maxBytes: MAX_BODY_BYTES })
  if (parsed.error) return send(res, 400, { error: parsed.error })
  const rawPackages = parsed.value.packages
  if (!Array.isArray(rawPackages) || rawPackages.length === 0) return send(res, 400, { error: 'packages_required' })
  if (rawPackages.length > MAX_PACKAGES) return send(res, 413, { error: 'too_many_packages', maxPackages: MAX_PACKAGES })

  const packages = rawPackages.map(queryForPackage)
  if (packages.some(item => item === null)) {
    return send(res, 400, { error: 'invalid_package', message: 'Each package requires a unique component id, a valid Package URL, and a version when the URL is not versioned.' })
  }
  const ids = new Set(packages.map(item => item.id))
  if (ids.size !== packages.length) return send(res, 400, { error: 'duplicate_component_ids' })

  try {
    const queryResult = await fetchJson(OSV_API + '/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: packages.map(item => item.query) }),
    })
    if (!Array.isArray(queryResult.results) || queryResult.results.length !== packages.length) {
      return send(res, 502, { error: 'upstream_response_invalid' })
    }

    const results = packages.map((item, index) => {
      const row = queryResult.results[index]
      const vulnerabilities = row && Array.isArray(row.vulns)
        ? row.vulns.flatMap(vulnerability => vulnerability && typeof vulnerability.id === 'string' ? [{ id: vulnerability.id, modified: typeof vulnerability.modified === 'string' ? vulnerability.modified : null }] : [])
        : []
      return { componentId: item.id, purl: item.purl, vulnerabilities }
    })
    const allIds = [...new Set(results.flatMap(item => item.vulnerabilities.map(vulnerability => vulnerability.id)))]
    const detailIds = allIds.slice(0, MAX_ADVISORIES)
    const advisories = []
    for (let index = 0; index < detailIds.length; index += 8) {
      const batch = await Promise.all(detailIds.slice(index, index + 8).map(loadAdvisory))
      advisories.push(...batch)
    }

    return send(res, 200, {
      source: 'OSV.dev',
      scannedAt: new Date().toISOString(),
      scannedCount: packages.length,
      advisoryCount: allIds.length,
      advisories,
      results,
      detailsTruncated: allIds.length > MAX_ADVISORIES,
    })
  } catch (cause) {
    const timeout = cause && typeof cause === 'object' && 'name' in cause && cause.name === 'TimeoutError'
    return send(res, 502, { error: 'vulnerability_source_unavailable', source: 'OSV.dev', retryable: true, message: timeout ? 'The OSV.dev request timed out. Retry the scan.' : 'The OSV.dev service could not complete the request. Retry later.' })
  }
}
