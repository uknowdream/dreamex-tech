import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
const headers = config.headers?.flatMap(entry => entry.headers || []) ?? []
const header = name => headers.find(item => String(item.key).toLowerCase() === name.toLowerCase())?.value ?? ''
const csp = header('Content-Security-Policy')
const reportOnly = header('Content-Security-Policy-Report-Only')
const errors = []
const required = ["default-src 'self'", "script-src 'self'", "object-src 'none'", "frame-ancestors 'none'", 'upgrade-insecure-requests']
if (!csp) errors.push('An enforcing Content-Security-Policy header is required.')
for (const directive of required) if (!csp.toLowerCase().includes(directive)) errors.push('Enforcing CSP is missing: ' + directive)
const scriptDirective = csp.toLowerCase().split(';').map(value => value.trim()).find(value => value.startsWith('script-src '))
if (!scriptDirective) errors.push('Enforcing CSP must declare script-src explicitly.')
else if (scriptDirective.includes("'unsafe-inline'") || scriptDirective.includes("'unsafe-eval'")) errors.push('Enforcing CSP script-src must not allow unsafe-inline or unsafe-eval.')
if (!reportOnly) errors.push('Keep a report-only policy during staged enforcement monitoring.')
for (const name of ['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!header(name)) errors.push('Missing security header: ' + name)
}
const api = readFileSync('api/team-workspace.js', 'utf8')
if (!api.includes('DREAMEX_WORKSPACE_TOKEN') || !api.includes('timingSafeEqual')) errors.push('Shared workspace must validate its server-only token using timing-safe comparison.')
if (!api.includes('revision_conflict') || !api.includes('CAS_SCRIPT')) errors.push('Shared workspace must reject stale revisions rather than silently overwriting them.')
if (!api.includes('MEMBERS_KEY') || !api.includes('tokenHash') || !api.includes('read_only_role')) errors.push('Shared workspace must support server-enforced role-based access with hashed member tokens.')
if (!api.includes("['admin', 'editor', 'viewer']") || !api.includes('actorCanChangeRole')) errors.push('Shared workspace must constrain role grants and prevent member privilege escalation.')
if (!api.includes('randomBytes(32)') || !api.includes("createHash('sha256')")) errors.push('Member tokens must be cryptographically generated and stored only as hashes.')
if (!api.includes('AUDIT_KEY') || !api.includes('recordAudit') || !api.includes("['LRANGE', AUDIT_KEY, 0, 49]")) errors.push('Workspace mutations must support a bounded, owner/admin-readable server-side audit feed.')
const frontend = readFileSync('src/TeamWorkspace.tsx', 'utf8')
if (/VITE_(?:KV_REST_API|UPSTASH_REDIS|DREAMEX_WORKSPACE_TOKEN)/.test(frontend)) errors.push('Server credentials must never be referenced from client-side VITE_ variables.')
if (errors.length) {
  console.error('Security configuration verification failed:')
  for (const error of errors) console.error(' - ' + error)
  process.exit(1)
}
console.log('Security configuration passed: enforcing CSP baseline, staged report-only policy, required response headers, and server-only workspace credentials.')
