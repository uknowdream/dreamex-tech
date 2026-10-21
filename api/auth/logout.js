import { clearSessionCookie, requireSameOrigin, sendJson } from '../_lib/platform.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }
  if (!requireSameOrigin(req, res)) return
  res.setHeader('Set-Cookie', clearSessionCookie())
  return sendJson(res, 200, { ok: true })
}
