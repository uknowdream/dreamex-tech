import test from 'node:test'
import assert from 'node:assert/strict'

import { createSessionToken, getSession, isAllowedOrigin, requireSameOrigin } from '../../server/platform.js'
import me from '../../api/auth/me.js'
import authGithub from '../../api/auth/github.js'
import authLogout from '../../api/auth/logout.js'
import workspace from '../../api/workspace.js'
import githubIntegration from '../../api/integrations/github.js'
import invites from '../../api/workspace/invites.js'

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(body = '') { this.body = body },
    json() { return JSON.parse(this.body) },
  }
}
function request(method, { origin, cookie = '', query = {}, body = undefined } = {}) {
  return { method, query, body, headers: { ...(origin ? { origin } : {}), cookie } }
}

test('origin validation accepts only the canonical DreamEx domain pair', () => {
  assert.equal(isAllowedOrigin('https://dreamex.tech'), true)
  assert.equal(isAllowedOrigin('https://www.dreamex.tech'), true)
  assert.equal(isAllowedOrigin('https://dreamex.tech.attacker.example'), false)
  assert.equal(isAllowedOrigin('null'), false)
  assert.equal(isAllowedOrigin(undefined), false)
})

test('same-origin guard rejects a cross-site mutation and responds safely', () => {
  const res = mockResponse()
  assert.equal(requireSameOrigin(request('POST', { origin: 'https://attacker.example' }), res), false)
  assert.equal(res.statusCode, 403)
  assert.equal(res.headers['cache-control'], 'no-store, private, max-age=0')
  assert.equal(res.json().error, 'origin_rejected')
})

test('session cookies are signed and invalid signatures do not authenticate', () => {
  process.env.SESSION_SECRET = 'unit-test-secret-with-at-least-thirty-two-characters'
  process.env.GITHUB_CLIENT_ID = 'test-client'
  process.env.GITHUB_CLIENT_SECRET = 'test-secret'
  const token = createSessionToken({ id: 12345, login: 'sample-user', name: 'Sample User', avatarUrl: 'https://avatars.githubusercontent.com/u/12345?v=4' })
  const user = getSession(request('GET', { cookie: 'dreamex_session=' + token }))
  assert.equal(user?.id, '12345')
  assert.equal(user?.login, 'sample-user')
  assert.equal(user?.name, 'Sample User')
  assert.equal(getSession(request('GET', { cookie: 'dreamex_session=' + token + 'x' })), null)
  process.env.SESSION_SECRET = ''
  assert.equal(getSession(request('GET', { cookie: 'dreamex_session=' + token })), null)
  delete process.env.GITHUB_CLIENT_ID
  delete process.env.GITHUB_CLIENT_SECRET
})

test('API health and sign-in endpoints fail closed when OAuth is not configured', async () => {
  delete process.env.GITHUB_CLIENT_ID
  delete process.env.GITHUB_CLIENT_SECRET
  process.env.SESSION_SECRET = ''
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN

  const meResponse = mockResponse()
  await me(request('GET'), meResponse)
  assert.equal(meResponse.statusCode, 200)
  assert.equal(meResponse.json().authenticated, false)
  assert.equal(meResponse.json().configured, false)
  assert.equal(meResponse.json().cloudSyncReady, false)
  assert.equal(meResponse.headers['cache-control'], 'no-store, private, max-age=0')

  const authResponse = mockResponse()
  await authGithub(request('GET', { query: { action: 'start' } }), authResponse)
  assert.equal(authResponse.statusCode, 503)
  assert.equal(authResponse.json().error, 'github_oauth_not_configured')
})

test('private integration APIs require an authenticated signed session', async () => {
  const workspaceResponse = mockResponse()
  await workspace(request('GET'), workspaceResponse)
  assert.equal(workspaceResponse.statusCode, 401)
  assert.equal(workspaceResponse.json().error, 'authentication_required')

  const githubResponse = mockResponse()
  await githubIntegration(request('GET'), githubResponse)
  assert.equal(githubResponse.statusCode, 401)
  assert.equal(githubResponse.json().error, 'authentication_required')

  const inviteResponse = mockResponse()
  await invites(request('POST', { origin: 'https://dreamex.tech', body: { role: 'viewer' } }), inviteResponse)
  assert.equal(inviteResponse.statusCode, 401)
  assert.equal(inviteResponse.json().error, 'authentication_required')
})

test('logout is POST-only and rejects cross-site origins', async () => {
  const methodResponse = mockResponse()
  await authLogout(request('GET'), methodResponse)
  assert.equal(methodResponse.statusCode, 405)
  assert.equal(methodResponse.headers.allow, 'POST')

  const response = mockResponse()
  await authLogout(request('POST', { origin: 'https://attacker.example' }), response)
  assert.equal(response.statusCode, 403)
  assert.equal(response.json().error, 'origin_rejected')

  const sameOriginResponse = mockResponse()
  await authLogout(request('POST', { origin: 'https://dreamex.tech' }), sameOriginResponse)
  assert.equal(sameOriginResponse.statusCode, 200)
  assert.match(sameOriginResponse.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax/)
})

test('unsupported API methods are rejected explicitly', async () => {
  const response = mockResponse()
  await workspace(request('DELETE'), response)
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.allow, 'GET, PUT')
})
