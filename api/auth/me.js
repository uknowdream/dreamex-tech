import { authConfigured, cloudConfigured, getSession, getTeamRole, noStore, sendJson } from '../_lib/platform.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }
  noStore(res)
  res.setHeader('Vary', 'Cookie')
  const user = getSession(req)
  let teamRole = null
  let teamRoleAvailable = true
  if (user && cloudConfigured()) {
    try { teamRole = await getTeamRole(user) } catch { teamRoleAvailable = false }
  }
  return sendJson(res, 200, {
    configured: authConfigured(),
    authenticated: Boolean(user),
    cloudSyncReady: cloudConfigured(),
    teamRole,
    canManageTeam: Boolean(user && (teamRole === 'admin' || (process.env.WORKSPACE_ADMIN_GITHUB_IDS || '').split(',').map(value => value.trim()).includes(user.id))),
    teamRoleAvailable,
    user: user ? { id: user.id, login: user.login, name: user.name, avatarUrl: user.avatarUrl } : null,
  })
}
