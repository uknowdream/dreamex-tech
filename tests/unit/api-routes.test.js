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

test('private workspace and invitation APIs require an authenticated signed session', async () => {
  const workspaceResponse = mockResponse()
  await workspace(request('GET'), workspaceResponse)
  assert.equal(workspaceResponse.statusCode, 401)
  assert.equal(workspaceResponse.json().error, 'authentication_required')

  const inviteResponse = mockResponse()
  await invites(request('POST', { origin: 'https://dreamex.tech', body: { role: 'viewer' } }), inviteResponse)
  assert.equal(inviteResponse.statusCode, 401)
  assert.equal(inviteResponse.json().error, 'authentication_required')
})

test('public GitHub integration loads the configured owner without sign-in and requests public data only', async () => {
  delete process.env.GITHUB_CLIENT_ID
  delete process.env.GITHUB_CLIENT_SECRET
  process.env.SESSION_SECRET = ''
  process.env.GITHUB_PUBLIC_OWNER = 'uknowdream'
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })
    if (url.includes('/users/uknowdream/repos?')) {
      return new Response(JSON.stringify([
        { id: 1, name: 'dreamex-tech', full_name: 'uknowdream/dreamex-tech', html_url: 'https://github.com/uknowdream/dreamex-tech', default_branch: 'main', stargazers_count: 7, updated_at: '2026-10-21T00:00:00Z', fork: false, archived: false },
        { id: 2, name: 'forked', full_name: 'uknowdream/forked', fork: true, archived: false },
        { id: 3, name: 'archived', full_name: 'uknowdream/archived', fork: false, archived: true }
      ]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.includes('/repos/uknowdream/dreamex-tech/actions/runs?')) {
      return new Response(JSON.stringify({ workflow_runs: [{ name: 'CI', status: 'completed', conclusion: 'success', html_url: 'https://github.com/uknowdream/dreamex-tech/actions/runs/1', updated_at: '2026-10-21T00:00:00Z' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('Unexpected public GitHub URL: ' + url)
  }
  try {
    const response = mockResponse()
    await githubIntegration(request('GET'), response)
    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.authenticated, false)
    assert.equal(body.accountPersonalized, false)
    assert.equal(body.username, 'uknowdream')
    assert.equal(body.repositories.length, 1)
    assert.equal(body.repositories[0].fullName, 'uknowdream/dreamex-tech')
    assert.equal(body.repositories[0].workflow.run.conclusion, 'success')
    assert.match(body.limitations, /Private repositories and private workflow runs are never queried/)
    assert.equal(requests.length, 2)
    assert.equal(requests.some(item => String(item.init?.headers?.Authorization || '').length > 0), false)
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.GITHUB_PUBLIC_OWNER
  }
})

test('cloud snapshot API redacts sensitive fields and credentials server-side before atomic storage', async () => {
  const savedEnv = new Map(['SESSION_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'].map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  process.env.SESSION_SECRET = 'unit-test-secret-with-at-least-thirty-two-characters'
  process.env.GITHUB_CLIENT_ID = 'test-client'
  process.env.GITHUB_CLIENT_SECRET = 'test-secret'
  process.env.KV_REST_API_URL = 'https://kv.example.upstash.io'
  process.env.KV_REST_API_TOKEN = 'test-kv-token'
  const token = createSessionToken({ id: 12345, login: 'sample-user', name: 'Sample User' })
  const rawValue = JSON.stringify({
    password: 'top-secret-password',
    note: 'Do not keep token=private-value or Bearer ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 in this note.',
    title: 'Routine engineering update',
  })
  let persistedSnapshot
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://kv.example.upstash.io')
    assert.equal(init?.method, 'POST')
    const command = JSON.parse(String(init?.body))
    assert.equal(command[0], 'EVAL')
    persistedSnapshot = JSON.parse(command[command.length - 1])
    return new Response(JSON.stringify({ result: 1 }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const response = mockResponse()
    await workspace(request('PUT', {
      origin: 'https://dreamex.tech',
      cookie: 'dreamex_session=' + token,
      query: { scope: 'personal' },
      body: {
        expectedUpdatedAt: null,
        entries: { 'dreamex-command-center-v1': rawValue },
      },
    }), response)
    assert.equal(response.statusCode, 200)
    assert.equal(persistedSnapshot.format, 'dreamex-cloud-workspace')
    const stored = JSON.parse(persistedSnapshot.entries['dreamex-command-center-v1'])
    assert.equal(Object.hasOwn(stored, 'password'), false)
    assert.equal(stored.title, 'Routine engineering update')
    assert.doesNotMatch(stored.note, /private-value|ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ/)
    assert.match(stored.note, /\[REDACTED\]/)
    assert.equal(response.json().redactedValues, 3)
    assert.doesNotMatch(JSON.stringify(persistedSnapshot), /top-secret-password|private-value|ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ/)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
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
