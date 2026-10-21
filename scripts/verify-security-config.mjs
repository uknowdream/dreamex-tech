import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
const global = config.headers?.find(entry => entry.source === '/(.*)')
const headers = new Map((global?.headers ?? []).map(entry => [String(entry.key).toLowerCase(), String(entry.value)]))
const failures = []
const csp = headers.get('content-security-policy') || ''
const directives = new Map(csp.split(';').map(part => part.trim()).filter(Boolean).map(part => {
  const [name, ...values] = part.split(/\s+/)
  return [name.toLowerCase(), values]
}))
for (const required of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "script-src 'self'"]) {
  if (!csp.toLowerCase().includes(required)) failures.push('Enforced Content-Security-Policy is missing ' + required)
}
if (!directives.has('upgrade-insecure-requests')) failures.push('Enforced Content-Security-Policy must include upgrade-insecure-requests.')
const scriptSource = directives.get('script-src') || []
if (scriptSource.some(value => value.toLowerCase() === "'unsafe-inline'" || value.toLowerCase() === "'unsafe-eval'")) {
  failures.push('script-src must not allow unsafe-inline or unsafe-eval.')
}
const expectedHeaders = new Map([
  ['strict-transport-security', /max-age=31536000/i],
  ['x-content-type-options', /^nosniff$/i],
  ['x-frame-options', /^deny$/i],
  ['referrer-policy', /^strict-origin-when-cross-origin$/i],
  ['permissions-policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/i],
  ['cross-origin-opener-policy', /^same-origin$/i],
  ['x-permitted-cross-domain-policies', /^none$/i],
])
for (const [name, pattern] of expectedHeaders) {
  if (!pattern.test(headers.get(name) || '')) failures.push('Missing or invalid security header: ' + name)
}
if (headers.has('content-security-policy-report-only') && !headers.has('content-security-policy')) {
  failures.push('Report-Only must not be used as a replacement for an enforcing Content-Security-Policy.')
}
if (failures.length) {
  console.error('Security configuration verification failed:')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('Security configuration passed: enforced CSP and required transport/browser security headers are configured.')
