function send(res, status, payload, headOnly = false) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (headOnly) return res.end()
  return res.end(JSON.stringify(payload))
}

function sharedWorkspaceReady() {
  const ownerToken = process.env.DREAMEX_WORKSPACE_TOKEN
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  const rawUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  if (typeof ownerToken !== 'string' || ownerToken.length < 32 || typeof token !== 'string' || !token) return false
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
  } catch {
    return false
  }
}

export default function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD')
    return send(res, 405, { error: 'method_not_allowed' })
  }
  return send(res, 200, {
    status: 'ok',
    integrations: {
      githubActions: 'public-read',
      vulnerabilityAdvisories: 'OSV.dev',
      teamWorkspace: sharedWorkspaceReady() ? 'configured' : 'configuration_required',
    },
    checkedAt: new Date().toISOString(),
  }, req.method === 'HEAD')
}
