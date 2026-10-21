import { appError, cloudConfigured, getSession, hashInvite, kvGetDelete, kvSet, requireSameOrigin, sendJson, sendMethodNotAllowed, readJsonBody } from '../../../server/platform.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, ['POST'])
  if (!requireSameOrigin(req, res)) return
  const user = getSession(req)
  if (!user) return sendJson(res, 401, { error: 'authentication_required', message: 'Sign in with GitHub before accepting a workspace invitation.' })
  if (!cloudConfigured()) return sendJson(res, 503, { error: 'cloud_storage_not_configured', message: 'Cloud storage is not configured for team invitations.' })

  try {
    const body = await readJsonBody(req)
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!/^[A-Za-z0-9_-]{24,80}$/.test(code)) return sendJson(res, 400, { error: 'invalid_invite_code', message: 'Enter a valid invite code or open the invitation link.' })
    const key = 'dreamex_invite_' + hashInvite(code)
    const invite = await kvGetDelete(key)
    if (!invite || !['editor', 'viewer'].includes(invite.role) || typeof invite.expiresAt !== 'string' || Date.parse(invite.expiresAt) <= Date.now()) {
      return sendJson(res, 410, { error: 'invite_expired_or_used', message: 'This invitation has expired or has already been used. Ask an admin for a new link.' })
    }

    await kvSet('dreamex_member_shared_' + user.id, { role: invite.role, invitedAt: new Date().toISOString(), invitedBy: invite.createdBy }, 365 * 24 * 60 * 60)
    return sendJson(res, 200, { ok: true, role: invite.role, message: 'You now have access to the shared engineering workspace.' })
  } catch (error) {
    return appError(res, error)
  }
}
