import { appError, cloudConfigured, getSession, getTeamRole, kvCompareAndSet, kvGet, requireSameOrigin, sendJson, sendMethodNotAllowed, readJsonBody } from '../server/platform.js'

const PERSONAL_KEY = user => 'dreamex_workspace_personal_' + user.id
const TEAM_KEY = 'dreamex_workspace_team_shared'
const MAX_ENTRIES = 200
const MAX_SNAPSHOT_BYTES = 400 * 1024
const SENSITIVE_KEY = /api-playground|authorization|cookie|password|secret|token|credential|private-key|access-key/i
const TEAM_SHARED_KEYS = new Set([
  'dreamex-command-center-v1',
  'dreamex-control-plane-checklist-v1',
  'dreamex-roadmap-v1',
  'dreamex-readiness-scorecard-v1',
  'dreamex-threat-model-v1',
  'dreamex-qa-studio-history-v1',
  'dreamex-reliability-incidents-v1',
  'dreamex-reliability-metrics-v1',
])

function cleanEntries(value, scope) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('entries must be a JSON object.'), { statusCode: 400, code: 'invalid_snapshot' })
  const keys = Object.keys(value)
  if (keys.length > MAX_ENTRIES) throw Object.assign(new Error('Too many snapshot entries.'), { statusCode: 413, code: 'snapshot_too_large' })
  const entries = {}
  for (const key of keys) {
    if (!/^dreamex-[a-zA-Z0-9._-]{1,120}$/.test(key) || SENSITIVE_KEY.test(key)) {
      throw Object.assign(new Error('Snapshot contains an unsupported or sensitive storage key.'), { statusCode: 400, code: 'unsupported_storage_key' })
    }
    if (scope === 'team' && !TEAM_SHARED_KEYS.has(key)) throw Object.assign(new Error('The requested team snapshot includes a key that is not approved for shared storage.'), { statusCode: 400, code: 'unsupported_team_key' })
    if (typeof value[key] !== 'string') throw Object.assign(new Error('Snapshot values must be strings.'), { statusCode: 400, code: 'invalid_snapshot_value' })
    entries[key] = value[key]
  }
  const bytes = Buffer.byteLength(JSON.stringify(entries), 'utf8')
  if (bytes > MAX_SNAPSHOT_BYTES) throw Object.assign(new Error('Snapshot exceeds the maximum supported size.'), { statusCode: 413, code: 'snapshot_too_large' })
  return entries
}

async function accessScope(user, scope) {
  if (scope === 'personal') return { key: PERSONAL_KEY(user), role: 'owner' }
  if (scope !== 'team') throw Object.assign(new Error('scope must be personal or team.'), { statusCode: 400, code: 'invalid_scope' })
  const role = await getTeamRole(user)
  if (!role) throw Object.assign(new Error('You do not have access to the shared engineering workspace. Ask a workspace admin for an invite.'), { statusCode: 403, code: 'team_membership_required' })
  return { key: TEAM_KEY, role }
}

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return sendMethodNotAllowed(res, ['GET', 'PUT'])
  const user = getSession(req)
  if (!user) return sendJson(res, 401, { error: 'authentication_required', message: 'Sign in with GitHub to continue.' })
  if (!cloudConfigured()) return sendJson(res, 503, { error: 'cloud_storage_not_configured', message: 'Configure KV_REST_API_URL and KV_REST_API_TOKEN in Vercel to enable persistent cloud workspaces.' })
  if (req.method === 'PUT' && !requireSameOrigin(req, res)) return

  try {
    const scope = typeof req.query?.scope === 'string' ? req.query.scope : 'personal'
    const access = await accessScope(user, scope)
    if (req.method === 'GET') {
      const stored = await kvGet(access.key)
      const snapshot = stored && typeof stored === 'object' && stored.format === 'dreamex-cloud-workspace' ? stored : {
        format: 'dreamex-cloud-workspace',
        version: 1,
        updatedAt: null,
        updatedBy: null,
        entries: {},
      }
      return sendJson(res, 200, { ok: true, scope, role: access.role, snapshot })
    }

    if (scope === 'team' && access.role === 'viewer') {
      return sendJson(res, 403, { error: 'workspace_read_only', message: 'Your shared workspace role is read-only.' })
    }
    const body = await readJsonBody(req)
    if (!Object.prototype.hasOwnProperty.call(body, 'expectedUpdatedAt')) {
      return sendJson(res, 400, { error: 'expected_snapshot_version_required', message: 'Load the current snapshot before saving so concurrent edits are not silently overwritten.' })
    }
    if (body.expectedUpdatedAt !== null && typeof body.expectedUpdatedAt !== 'string') {
      return sendJson(res, 400, { error: 'invalid_snapshot_version', message: 'expectedUpdatedAt must be a timestamp string or null.' })
    }
    const entries = cleanEntries(body.entries, scope)
    const snapshot = {
      format: 'dreamex-cloud-workspace',
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: user.id, login: user.login },
      entries,
    }
    const accepted = await kvCompareAndSet(access.key, body.expectedUpdatedAt || '', snapshot)
    if (!accepted) {
      const current = await kvGet(access.key)
      const currentUpdatedAt = current && typeof current === 'object' && typeof current.updatedAt === 'string' ? current.updatedAt : null
      return sendJson(res, 409, { error: 'workspace_snapshot_conflict', message: 'This cloud snapshot changed since it was loaded. Load the latest snapshot and merge before saving again.', currentUpdatedAt })
    }
    return sendJson(res, 200, { ok: true, scope, role: access.role, snapshot })
  } catch (error) {
    return appError(res, error)
  }
}
