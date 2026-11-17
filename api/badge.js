import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'

const badgeLimiter = createRateLimiter({ maxRequests: 120, windowMs: 60_000 })

export function resetBadgeRateLimiter() {
  badgeLimiter.reset()
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function sanitizeDomain(raw) {
  if (typeof raw !== 'string') return 'dreamex.tech'
  const cleaned = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-z0-9.-]/g, '')
  return cleaned ? cleaned.slice(0, 38) : 'dreamex.tech'
}

function sanitizeScore(raw) {
  const numeric = Number.parseInt(String(raw ?? '99'), 10)
  if (!Number.isFinite(numeric)) return 99
  return Math.max(0, Math.min(100, numeric))
}

function gradeFromScore(score, explicitGrade) {
  if (typeof explicitGrade === 'string' && /^(A\+|A|B|C|D)$/.test(explicitGrade.trim().toUpperCase())) {
    return explicitGrade.trim().toUpperCase()
  }
  if (score >= 92) return 'A+'
  if (score >= 82) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

function colorForScore(score) {
  if (score >= 85) return { accent: '#10b981', text: '#ecfdf5', bg: '#064e3b' }
  if (score >= 70) return { accent: '#0ea5e9', text: '#f0f9ff', bg: '#0c4a6e' }
  if (score >= 55) return { accent: '#f59e0b', text: '#fffbeb', bg: '#78350f' }
  return { accent: '#f43f5e', text: '#fff1f2', bg: '#881337' }
}

export default function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Allow', 'GET, OPTIONS')
    res.end()
    return
  }

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, OPTIONS')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'method_not_allowed' }))
    return
  }

  const limit = badgeLimiter.check(clientKey(req, 'badge:get'))
  applyRateLimitHeaders(res, limit)
  if (!limit.allowed) {
    res.statusCode = 429
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'rate_limit_exceeded', retryAfterSec: limit.retryAfterSec }))
    return
  }

  const urlObj = new URL(req.url || '/api/badge', 'https://dreamex.tech')
  const domain = sanitizeDomain(urlObj.searchParams.get('domain'))
  const score = sanitizeScore(urlObj.searchParams.get('score'))
  const grade = gradeFromScore(score, urlObj.searchParams.get('grade'))
  const palette = colorForScore(score)

  const leftLabel = `DREAMEX AI READY · ${domain}`
  const rightLabel = `${score}/100 (${grade})`
  const leftWidth = Math.max(168, Math.round(leftLabel.length * 6.5) + 22)
  const rightWidth = 96
  const totalWidth = leftWidth + rightWidth

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" role="img" aria-label="${escapeXml(`${leftLabel}: ${rightLabel}`)}">`,
    `  <title>${escapeXml(`${leftLabel} — ${rightLabel}`)}</title>`,
    '  <defs>',
    '    <linearGradient id="dxLeft" x1="0" y1="0" x2="1" y2="1">',
    '      <stop offset="0%" stop-color="#0b1324"/>',
    '      <stop offset="100%" stop-color="#111d35"/>',
    '    </linearGradient>',
    '  </defs>',
    `  <rect width="${totalWidth}" height="28" rx="6" fill="url(#dxLeft)"/>`,
    `  <rect x="${leftWidth}" width="${rightWidth}" height="28" rx="6" fill="${palette.bg}"/>`,
    `  <rect x="${leftWidth}" width="6" height="28" fill="${palette.bg}"/>`,
    `  <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="27" rx="5.5" fill="none" stroke="${palette.accent}" stroke-opacity="0.45"/>`,
    `  <circle cx="13" cy="14" r="4" fill="${palette.accent}"/>`,
    `  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10.5" font-weight="700">`,
    `    <text x="23" y="18" fill="#e2e8f0">${escapeXml(leftLabel)}</text>`,
    `    <text x="${leftWidth + Math.round(rightWidth / 2)}" y="18" text-anchor="middle" fill="${palette.text}">${escapeXml(rightLabel)}</text>`,
    '  </g>',
    '</svg>',
  ].join('\n')

  res.statusCode = 200
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400')
  res.end(svg)
}
