import { authConfigured, APP_ORIGIN, clearOAuthStateCookie, createSessionToken, newOAuthState, readCookie, sendJson, sessionCookie } from '../../server/platform.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }
  if (!authConfigured()) {
    return sendJson(res, 503, {
      error: 'github_oauth_not_configured',
      message: 'GitHub sign-in is not enabled yet. Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and a SESSION_SECRET of at least 32 characters in Vercel project settings.',
    })
  }

  const action = typeof req.query?.action === 'string' ? req.query.action : ''
  if (action === 'start') {
    const state = newOAuthState()
    const redirect = new URL('https://github.com/login/oauth/authorize')
    redirect.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID)
    redirect.searchParams.set('redirect_uri', APP_ORIGIN + '/api/auth/github')
    redirect.searchParams.set('scope', 'read:user')
    redirect.searchParams.set('state', state)
    res.setHeader('Set-Cookie', 'dreamex_oauth_state=' + state + '; Path=/api/auth/github; Max-Age=600; HttpOnly; Secure; SameSite=Lax')
    res.setHeader('Cache-Control', 'no-store')
    res.statusCode = 302
    res.setHeader('Location', redirect.toString())
    return res.end()
  }

  if (req.query?.error) {
    res.setHeader('Set-Cookie', clearOAuthStateCookie())
    res.statusCode = 302
    res.setHeader('Location', APP_ORIGIN + '/control-plane?account=cancelled')
    return res.end()
  }

  const code = typeof req.query?.code === 'string' ? req.query.code : ''
  const state = typeof req.query?.state === 'string' ? req.query.state : ''
  const storedState = readCookie(req, 'dreamex_oauth_state')
  if (!code || !state || !storedState || state.length !== storedState.length || state !== storedState) {
    res.setHeader('Set-Cookie', clearOAuthStateCookie())
    return sendJson(res, 400, { error: 'oauth_state_invalid', message: 'GitHub sign-in state could not be verified. Restart sign-in and try again.' })
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'DreamEx-Tech' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: APP_ORIGIN + '/api/auth/github',
      }),
      signal: AbortSignal.timeout(8000),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') throw new Error('GitHub token exchange failed.')

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + tokenData.access_token, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'DreamEx-Tech' },
      signal: AbortSignal.timeout(8000),
    })
    const profile = await profileResponse.json()
    if (!profileResponse.ok || !Number.isSafeInteger(profile.id) || typeof profile.login !== 'string') throw new Error('GitHub profile lookup failed.')

    const token = createSessionToken({ id: profile.id, login: profile.login, name: profile.name || profile.login, avatarUrl: profile.avatar_url || '' })
    res.setHeader('Set-Cookie', [sessionCookie(token), clearOAuthStateCookie()])
    res.setHeader('Cache-Control', 'no-store')
    res.statusCode = 302
    res.setHeader('Location', APP_ORIGIN + '/control-plane?account=connected')
    return res.end()
  } catch {
    res.setHeader('Set-Cookie', clearOAuthStateCookie())
    res.statusCode = 302
    res.setHeader('Location', APP_ORIGIN + '/control-plane?account=error')
    return res.end()
  }
}
