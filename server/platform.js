import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'dreamex_session'
export const APP_ORIGIN = (process.env.APP_ORIGIN || 'https://dreamex.tech').replace(/\/+$/, '')
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7
const MAX_BODY_BYTES = 450 * 1024

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

export function sendJson(res, status, payload) {
  noStore(res)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function sendMethodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '))
  sendJson(res, 405, { error: 'method_not_allowed', allowed: methods })
}

export function authConfigured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET &&
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
}

export function cloudConfigured() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return false
  try {
    const url = new URL(process.env.KV_REST_API_URL)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

function cookieMap(req) {
  const header = typeof req.headers.cookie === 'string' ? req.headers.cookie : ''
  const cookies = new Map()
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator <= 0) continue
    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (key && value) cookies.set(key, value)
  }
  return cookies
}

export function readCookie(req, name) {
  return cookieMap(req).get(name) || ''
}

function sign(encoded) {
  return createHmac('sha256', process.env.SESSION_SECRET).update(encoded).digest('base64url')
}

export function createSessionToken(user) {
  const payload = {
    id: String(user.id),
    login: String(user.login).slice(0, 100),
    name: String(user.name || user.login).slice(0, 160),
    avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl.slice(0, 500) : '',
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return encoded + '.' + sign(encoded)
}

export function getSession(req) {
  if (!authConfigured()) return null
  const token = readCookie(req, SESSION_COOKIE)
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null
  const encoded = token.slice(0, separator)
  const supplied = Buffer.from(token.slice(separator + 1))
  const expected = Buffer.from(sign(encoded))
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload || typeof payload.id !== 'string' || !/^\d+$/.test(payload.id)) return null
    if (typeof payload.login !== 'string' || !/^[A-Za-z0-9-]{1,100}$/.test(payload.login)) return null
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null
    return {
      id: payload.id,
      login: payload.login,
      name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : payload.login,
      avatarUrl: typeof payload.avatarUrl === 'string' && /^https:\/\/(avatars\.githubusercontent\.com|github\.com)\//.test(payload.avatarUrl) ? payload.avatarUrl : '',
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export function sessionCookie(token) {
  return SESSION_COOKIE + '=' + token + '; Path=/; Max-Age=' + SESSION_MAX_AGE + '; HttpOnly; Secure; SameSite=Lax'
}

export function clearSessionCookie() {
  return SESSION_COOKIE + '=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
}

export function clearOAuthStateCookie() {
  return 'dreamex_oauth_state=; Path=/api/auth/github; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
}

export function newOAuthState() {
  return randomBytes(24).toString('base64url')
}

export function newInviteCode() {
  return randomBytes(24).toString('base64url')
}

export function hashInvite(code) {
  return createHash('sha256').update(code).digest('hex')
}

export function isAllowedOrigin(origin) {
  if (typeof origin !== 'string') return false
  const allowed = new Set([APP_ORIGIN])
  const url = new URL(APP_ORIGIN)
  url.hostname = url.hostname.startsWith('www.') ? url.hostname.slice(4) : 'www.' + url.hostname
  allowed.add(url.origin)
  return allowed.has(origin)
}

export function requireSameOrigin(req, res) {
  if (!isAllowedOrigin(req.headers.origin)) {
    sendJson(res, 403, { error: 'origin_rejected', message: 'This request must come from the configured DreamEx Tech origin.' })
    return false
  }
  return true
}

export function requireSession(req, res) {
  const user = getSession(req)
  if (!user) {
    sendJson(res, 401, { error: 'authentication_required', message: 'Sign in with GitHub to continue.' })
    return null
  }
  return user
}

export async function readJsonBody(req) {
  let value = req.body
  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > MAX_BODY_BYTES) throw Object.assign(new Error('Request body is too large.'), { statusCode: 413, code: 'request_too_large' })
    try { value = JSON.parse(value) } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400, code: 'invalid_json' }) }
  }
  if (value === undefined || value === null) value = {}
  if (typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Request body must be a JSON object.'), { statusCode: 400, code: 'invalid_json_shape' })
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_BODY_BYTES) throw Object.assign(new Error('Request body is too large.'), { statusCode: 413, code: 'request_too_large' })
  return value
}

async function kvCommand(command, key, value, ttlSeconds) {
  if (!cloudConfigured()) throw Object.assign(new Error('Cloud storage is not configured.'), { statusCode: 503, code: 'cloud_storage_not_configured' })
  const base = process.env.KV_REST_API_URL.replace(/\/+$/, '')
  let url = base + '/' + [command, key].map(encodeURIComponent).join('/')
  if (command === 'set' && Number.isSafeInteger(ttlSeconds) && ttlSeconds > 0) url += '?EX=' + ttlSeconds
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'text/plain; charset=utf-8' },
    ...(value === undefined ? {} : { body: String(value) }),
    signal: AbortSignal.timeout(8000),
  })
  let data
  try { data = await response.json() } catch { throw Object.assign(new Error('Cloud storage returned an invalid response.'), { statusCode: 502, code: 'cloud_storage_bad_response' }) }
  if (!response.ok || data.error) throw Object.assign(new Error('Cloud storage request failed.'), { statusCode: 502, code: 'cloud_storage_request_failed' })
  return data.result
}

export async function kvGet(key) {
  const result = await kvCommand('get', key)
  if (result === null || result === undefined) return null
  if (typeof result !== 'string') return result
  try { return JSON.parse(result) } catch { return result }
}

export async function kvSet(key, value, ttlSeconds) {
  return kvCommand('set', key, JSON.stringify(value), ttlSeconds)
}

export async function kvDelete(key) {
  return kvCommand('del', key)
}

async function kvDirect(command) {
  if (!cloudConfigured()) throw Object.assign(new Error('Cloud storage is not configured.'), { statusCode: 503, code: 'cloud_storage_not_configured' })
  const response = await fetch(process.env.KV_REST_API_URL.replace(/\/+$/, ''), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000),
  })
  let data
  try { data = await response.json() } catch { throw Object.assign(new Error('Cloud storage returned an invalid response.'), { statusCode: 502, code: 'cloud_storage_bad_response' }) }
  if (!response.ok || data.error) throw Object.assign(new Error('Cloud storage atomic operation failed.'), { statusCode: 502, code: 'cloud_storage_request_failed' })
  return data.result
}

function parseStoredValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

export async function kvGetDelete(key) {
  return parseStoredValue(await kvDirect(['GETDEL', key]))
}

export async function kvCompareAndSet(key, expectedUpdatedAt, snapshot) {
  const script = [
    "local current = redis.call('GET', KEYS[1])",
    "local expected = ARGV[1]",
    "if not current then if expected ~= '' then return 0 end",
    "else",
    "  local ok, parsed = pcall(cjson.decode, current)",
    "  if not ok then return redis.error_reply('INVALID_CURRENT_SNAPSHOT') end",
    "  local actual = parsed['updatedAt'] or ''",
    "  if actual ~= expected then return 0 end",
    "end",
    "redis.call('SET', KEYS[1], ARGV[2])",
    "return 1",
  ].join("\n")
  const result = await kvDirect(['EVAL', script, '1', key, expectedUpdatedAt || '', JSON.stringify(snapshot)])
  return Number(result) === 1
}

export function configuredTeamAdmins() {
  return (process.env.WORKSPACE_ADMIN_GITHUB_IDS || '').split(',').map(value => value.trim()).filter(value => /^\d+$/.test(value))
}

export async function getTeamRole(user) {
  if (configuredTeamAdmins().includes(String(user.id))) return 'admin'
  if (!cloudConfigured()) return null
  const membership = await kvGet('dreamex_member_shared_' + String(user.id))
  return membership && ['admin', 'editor', 'viewer'].includes(membership.role) ? membership.role : null
}

export function appError(res, error) {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500
  const code = typeof error?.code === 'string' ? error.code : 'request_failed'
  if (status >= 500 && status !== 503) sendJson(res, status, { error: code, message: 'The request could not be completed. Check service configuration and logs.' })
  else sendJson(res, status, { error: code, message: String(error?.message || 'The request could not be completed.') })
}
