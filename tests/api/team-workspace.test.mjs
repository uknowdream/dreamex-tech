import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import handler from '../../api/team-workspace.js'

const ownerToken = 'unit-test-workspace-token-32-characters-long'
const redisToken = 'unit-test-redis-token'
const originalFetch = globalThis.fetch
let storedSnapshot
let memberRecords
let auditRecords

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function invoke(method, options = {}) {
  const headers = { ...(options.headers || {}) }
  const req = { method, headers, body: options.body, url: options.url || '/' }
  const res = {
    statusCode: 200,
    headers: {},
    output: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value = '') { this.output = value; this.writableEnded = true },
  }
  return handler(req, res).then(() => ({
    status: res.statusCode,
    headers: res.headers,
    body: res.output ? JSON.parse(res.output) : null,
  }))
}

function setConfigured() {
  process.env.DREAMEX_WORKSPACE_TOKEN = ownerToken
  process.env.KV_REST_API_URL = 'https://redis.example.test'
  process.env.KV_REST_API_TOKEN = redisToken
  process.env.NODE_ENV = 'test'
  storedSnapshot = null
  memberRecords = new Map()
  auditRecords = []
  globalThis.fetch = async (_url, options = {}) => {
    const command = JSON.parse(options.body)
    const op = command[0]
    let result
    if (op === 'GET') {
      result = storedSnapshot
    } else if (op === 'EVAL' && String(command[1]).includes('currentRevision')) {
      const expected = Number(command[4])
      const next = command[5]
      const currentRevision = storedSnapshot ? Number(JSON.parse(storedSnapshot).revision) : 0
      if (currentRevision !== expected) result = [0, storedSnapshot || '']
      else {
        storedSnapshot = next
        result = [1, next]
      }
    } else if (op === 'EVAL' && String(command[1]).includes('dreamex_workspace_member_update')) {
      const hash = String(command[4])
      const actor = String(command[5])
      const nextRole = String(command[6])
      const existingRaw = memberRecords.get(hash)
      if (!existingRaw) result = -1
      else {
        const current = JSON.parse(existingRaw)
        if (current.status !== 'active' || current.role === 'owner' || nextRole === 'owner') result = -2
        else if (!['owner', 'admin'].includes(actor)) result = -3
        else if (actor === 'admin' && (current.role === 'admin' || nextRole === 'admin')) result = -4
        else { memberRecords.set(hash, String(command[7])); result = 1 }
      }
    } else if (op === 'EVAL' && String(command[1]).includes('dreamex_workspace_member_delete')) {
      const hash = String(command[4])
      const actor = String(command[5])
      const existingRaw = memberRecords.get(hash)
      if (!existingRaw) result = -1
      else {
        const current = JSON.parse(existingRaw)
        if (current.status !== 'active' || current.role === 'owner') result = -2
        else if (!['owner', 'admin'].includes(actor)) result = -3
        else if (actor === 'admin' && current.role === 'admin') result = -4
        else { memberRecords.delete(hash); result = 1 }
      }
    } else if (op === 'EVAL' && String(command[1]).includes('HLEN')) {
      if (memberRecords.size >= Number(command[4])) result = 0
      else {
        memberRecords.set(String(command[5]), String(command[6]))
        result = 1
      }
    } else if (op === 'HGET') {
      result = memberRecords.get(String(command[2])) ?? null
    } else if (op === 'HGETALL') {
      result = [...memberRecords.entries()].flatMap(([key, value]) => [key, value])
    } else if (op === 'HLEN') {
      result = memberRecords.size
    } else if (op === 'HSET') {
      memberRecords.set(String(command[1]), String(command[2]))
      result = 1
    } else if (op === 'HDEL') {
      result = memberRecords.delete(String(command[1])) ? 1 : 0
    } else if (op === 'LPUSH') {
      auditRecords.unshift(String(command[2]))
      result = auditRecords.length
    } else if (op === 'LTRIM') {
      auditRecords = auditRecords.slice(Number(command[2]), Number(command[3]) + 1)
      result = 'OK'
    } else if (op === 'LRANGE') {
      result = auditRecords.slice(Number(command[2]), Number(command[3]) + 1)
    } else {
      throw new Error('Unexpected Redis command: ' + op)
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

function clearConfigured() {
  delete process.env.DREAMEX_WORKSPACE_TOKEN
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.NODE_ENV
  globalThis.fetch = originalFetch
}

function auth(token = ownerToken) {
  return { authorization: 'Bearer ' + token, origin: 'https://dreamex.tech', 'content-type': 'application/json' }
}

async function createMember(role, label = 'QA teammate', token = ownerToken) {
  const result = await invoke('POST', {
    url: '/api/team-workspace?resource=members',
    headers: auth(token),
    body: { label, role },
  })
  assert.equal(result.status, 201)
  return result.body
}

test('shared workspace returns a safe disabled status when the server token is not configured', async () => {
  clearConfigured()
  const result = await invoke('GET')
  assert.equal(result.status, 503)
  assert.equal(result.body.error, 'workspace_not_configured')
  assert.equal(result.headers['cache-control'], 'no-store, max-age=0')
})

test('unknown access tokens are rejected after a read-only token-hash lookup', async () => {
  setConfigured()
  try {
    const result = await invoke('PUT', { headers: auth('random-invalid-token'), body: { revision: 0, state: {} } })
    assert.equal(result.status, 401)
    assert.equal(result.body.error, 'unauthorized')
    assert.equal(storedSnapshot, null)
  } finally { clearConfigured() }
})

test('shared workspace rejects unexpected origins', async () => {
  setConfigured()
  try {
    const result = await invoke('GET', { headers: { origin: 'https://attacker.example' } })
    assert.equal(result.status, 403)
    assert.equal(result.body.error, 'origin_not_allowed')
  } finally { clearConfigured() }
})

test('shared workspace rejects methods outside the documented contract', async () => {
  setConfigured()
  try {
    const result = await invoke('POST')
    assert.equal(result.status, 405)
    assert.match(result.headers.allow, /GET, PUT/)
  } finally { clearConfigured() }
})

test('unknown resources are rejected and API preflight has no cached response', async () => {
  setConfigured()
  try {
    const unknown = await invoke('GET', { url: '/api/team-workspace?resource=secrets', headers: auth() })
    assert.equal(unknown.status, 404)
    assert.equal(unknown.body.error, 'unknown_resource')
    const options = await invoke('OPTIONS')
    assert.equal(options.status, 204)
    assert.equal(options.headers['cache-control'], 'no-store, max-age=0')
  } finally { clearConfigured() }
})

test('shared workspace rejects malformed or oversized update payloads', async () => {
  setConfigured()
  try {
    const malformed = await invoke('PUT', { headers: auth(), body: '{' })
    assert.equal(malformed.status, 400)
    const oversized = await invoke('PUT', { headers: auth(), body: { revision: 0, state: { data: 'x'.repeat(101_000) } } })
    assert.equal(oversized.status, 413)
  } finally { clearConfigured() }
})

test('owner snapshot writes preserve optimistic revision checks and expose the owner role', async () => {
  setConfigured()
  try {
    const headers = auth()
    const first = await invoke('PUT', { headers, body: { revision: 0, state: { project: 'DreamEx', tasks: [{ id: 'T-1' }] } } })
    assert.equal(first.status, 200)
    assert.equal(first.body.revision, 1)
    assert.equal(first.body.access.role, 'owner')
    assert.equal(first.body.access.canManageMembers, true)
    const stale = await invoke('PUT', { headers, body: { revision: 0, state: { project: 'stale' } } })
    assert.equal(stale.status, 409)
    assert.equal(stale.body.current.revision, 1)
    const loaded = await invoke('GET', { headers })
    assert.equal(loaded.status, 200)
    assert.equal(loaded.body.state.project, 'DreamEx')
    assert.equal(loaded.body.access.role, 'owner')
    assert.equal(loaded.headers['x-content-type-options'], 'nosniff')
  } finally { clearConfigured() }
})

test('owner can create hashed tokens and list safe member metadata', async () => {
  setConfigured()
  try {
    const created = await createMember('editor', 'QA Editor')
    assert.equal(created.member.label, 'QA Editor')
    assert.equal(created.member.role, 'editor')
    assert.equal(created.tokenVisibleOnce, true)
    assert.equal(typeof created.token, 'string')
    assert.ok(created.token.length >= 40)
    const digest = hashToken(created.token)
    assert.equal(memberRecords.has(digest), true)
    assert.equal([...memberRecords.values()].some(value => value.includes(created.token)), false)
    const roster = await invoke('GET', { url: '/api/team-workspace?resource=members', headers: auth() })
    assert.equal(roster.status, 200)
    assert.equal(roster.body.members.length, 1)
    assert.equal(roster.body.members[0].id, created.member.id)
    assert.equal(JSON.stringify(roster.body).includes(created.token), false)
  } finally { clearConfigured() }
})

test('viewer can read snapshots but cannot update them or manage membership', async () => {
  setConfigured()
  try {
    const created = await createMember('viewer')
    const headers = auth(created.token)
    const read = await invoke('GET', { headers })
    assert.equal(read.status, 200)
    assert.equal(read.body.access.role, 'viewer')
    assert.equal(read.body.access.canWrite, false)
    const write = await invoke('PUT', { headers, body: { revision: 0, state: { blocked: true } } })
    assert.equal(write.status, 403)
    assert.equal(write.body.error, 'read_only_role')
    const roster = await invoke('GET', { url: '/api/team-workspace?resource=members', headers })
    assert.equal(roster.status, 403)
    assert.equal(roster.body.error, 'forbidden')
    const audit = await invoke('GET', { url: '/api/team-workspace?resource=audit', headers })
    assert.equal(audit.status, 403)
    assert.equal(audit.body.error, 'forbidden')
    assert.equal(storedSnapshot, null)
  } finally { clearConfigured() }
})

test('editor can update shared snapshots but cannot manage members', async () => {
  setConfigured()
  try {
    const created = await createMember('editor')
    const headers = auth(created.token)
    const write = await invoke('PUT', { headers, body: { revision: 0, state: { editorWrite: true } } })
    assert.equal(write.status, 200)
    assert.equal(write.body.access.role, 'editor')
    assert.equal(write.body.access.canWrite, true)
    const roster = await invoke('GET', { url: '/api/team-workspace?resource=members', headers })
    assert.equal(roster.status, 403)
  } finally { clearConfigured() }
})

test('only the owner can grant or revoke admin privileges', async () => {
  setConfigured()
  try {
    const admin = await createMember('admin', 'Workspace Admin')
    const editor = await createMember('editor', 'Editor', admin.token)
    const promote = await invoke('PATCH', {
      url: '/api/team-workspace?resource=members',
      headers: auth(admin.token),
      body: { id: editor.member.id, role: 'admin' },
    })
    assert.equal(promote.status, 403)
    assert.equal(promote.body.error, 'role_change_forbidden')
    const list = await invoke('GET', { url: '/api/team-workspace?resource=members', headers: auth() })
    const adminMember = list.body.members.find(member => member.id === admin.member.id)
    const deleteAdmin = await invoke('DELETE', { url: '/api/team-workspace?resource=members&id=' + adminMember.id, headers: auth(admin.token) })
    assert.equal(deleteAdmin.status, 403)
    const ownerDelete = await invoke('DELETE', { url: '/api/team-workspace?resource=members&id=' + adminMember.id, headers: auth() })
    assert.equal(ownerDelete.status, 200)
    const revoked = await invoke('GET', { headers: auth(admin.token) })
    assert.equal(revoked.status, 401)
  } finally { clearConfigured() }
})

test('admin can manage editor/viewer members but cannot grant a new admin', async () => {
  setConfigured()
  try {
    const admin = await createMember('admin', 'Admin')
    const forbiddenAdmin = await invoke('POST', {
      url: '/api/team-workspace?resource=members',
      headers: auth(admin.token),
      body: { label: 'Escalation attempt', role: 'admin' },
    })
    assert.equal(forbiddenAdmin.status, 403)
    const editor = await createMember('editor', 'Editor', admin.token)
    assert.equal(editor.member.role, 'editor')
    const changed = await invoke('PATCH', {
      url: '/api/team-workspace?resource=members',
      headers: auth(admin.token),
      body: { id: editor.member.id, role: 'viewer' },
    })
    assert.equal(changed.status, 200)
    assert.equal(changed.body.member.role, 'viewer')
    const deleted = await invoke('DELETE', {
      url: '/api/team-workspace?resource=members&id=' + editor.member.id,
      headers: auth(admin.token),
    })
    assert.equal(deleted.status, 200)
    const revoked = await invoke('GET', { headers: auth(editor.token) })
    assert.equal(revoked.status, 401)
  } finally { clearConfigured() }
})


test('owner audit trail records successful mutations without tokens or snapshot contents', async () => {
  setConfigured()
  try {
    const editor = await createMember('editor', 'Release editor')
    const secretLookingValue = 'DO-NOT-LOG-this-example-payload'
    const save = await invoke('PUT', {
      headers: auth(editor.token),
      body: { revision: 0, state: { release: secretLookingValue } },
    })
    assert.equal(save.status, 200)
    assert.equal(save.body.auditLogged, true)
    const result = await invoke('GET', { url: '/api/team-workspace?resource=audit', headers: auth() })
    assert.equal(result.status, 200)
    assert.ok(result.body.entries.some(entry => entry.action === 'member.created' && entry.targetId === editor.member.id))
    assert.ok(result.body.entries.some(entry => entry.action === 'snapshot.published' && entry.revision === 1))
    const serialized = JSON.stringify(result.body)
    assert.equal(serialized.includes(editor.token), false)
    assert.equal(serialized.includes(secretLookingValue), false)
    assert.equal(serialized.includes('state'), false)
  } finally { clearConfigured() }
})

test('audit endpoint rejects write methods and unknown role data is not returned', async () => {
  setConfigured()
  try {
    const result = await invoke('POST', { url: '/api/team-workspace?resource=audit', headers: auth(), body: {} })
    assert.equal(result.status, 405)
    assert.match(result.headers.allow, /GET/)
  } finally { clearConfigured() }
})


test('member registry enforces its 100-token cap atomically under concurrent requests', async () => {
  setConfigured()
  try {
    const results = await Promise.all(Array.from({ length: 101 }, (_, index) => invoke('POST', {
      url: '/api/team-workspace?resource=members',
      headers: auth(),
      body: { label: 'Viewer ' + index, role: 'viewer' },
    })))
    assert.equal(results.filter(result => result.status === 201).length, 100)
    assert.equal(results.filter(result => result.status === 409 && result.body.error === 'member_limit_reached').length, 1)
    assert.equal(memberRecords.size, 100)
    assert.ok(auditRecords.length <= 200)
  } finally { clearConfigured() }
})
