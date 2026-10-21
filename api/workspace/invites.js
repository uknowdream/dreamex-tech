import { appError, cloudConfigured, getSession, getTeamRole, hashInvite, kvSet, newInviteCode, requireSameOrigin, sendJson, sendMethodNotAllowed, readJsonBody, APP_ORIGIN } from '../../server/platform.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, ['POST'])
  if (!requireSameOrigin(req, res)) return
  const user = getSession(req)
  if (!user) return sendJson(res, 401, { error: 'authentication_required', message: 'Sign in with GitHub to continue.' })
  if (!cloudConfigured()) return sendJson(res, 503, { error: 'cloud_storage_not_configured', message: 'Configure KV_REST_API_URL and KV_REST_API_TOKEN in Vercel before creating workspace invitations.' })

  try {
    const role = await getTeamRole(user)
    if (role !== 'admin') return sendJson(res, 403, { error: 'admin_required', message: 'Only a configured workspace admin can create invitations.' })
    const body = await readJsonBody(req)
    const inviteRole = body.role === 'viewer' ? 'viewer' : body.role === 'editor' ? 'editor' : ''
    if (!inviteRole) return sendJson(res, 400, { error: 'invalid_invite_role', message: 'Choose editor or viewer access.' })

    const code = newInviteCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await kvSet('dreamex_invite_' + hashInvite(code), { role: inviteRole, createdBy: user.id, createdAt: new Date().toISOString(), expiresAt }, 7 * 24 * 60 * 60)
    return sendJson(res, 201, { ok: true, role: inviteRole, expiresAt, code, joinUrl: APP_ORIGIN + '/control-plane#invite=' + code })
  } catch (error) {
    return appError(res, error)
  }
}
