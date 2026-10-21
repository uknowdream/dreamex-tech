type CloudUser = { id: string; email?: string }
export type CloudSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: CloudUser
}
export type CloudChecklistSnapshot = {
  checked: Record<string, boolean>
  updatedAt: string
}

const SESSION_KEY = 'dreamex-cloud-session-v1'
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export function isWorkspaceCloudConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  try {
    const url = new URL(SUPABASE_URL)
    return (url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') && Boolean(url.host)
  } catch {
    return false
  }
}

function configuration() {
  if (!isWorkspaceCloudConfigured()) {
    throw new Error('Cloud sync is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply the Supabase migration.')
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY }
}

function sessionFrom(value: unknown): CloudSession | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const user = row.user && typeof row.user === 'object' ? row.user as Record<string, unknown> : null
  if (typeof row.access_token !== 'string' || typeof row.refresh_token !== 'string' || !user || typeof user.id !== 'string') return null
  const expiresIn = typeof row.expires_in === 'number' ? row.expires_in : 3600
  const expiresAt = typeof row.expires_at === 'number' ? row.expires_at : Math.floor(Date.now() / 1000) + expiresIn
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: expiresAt,
    user: { id: user.id, email: typeof user.email === 'string' ? user.email : undefined },
  }
}

export function readWorkspaceCloudSession(): CloudSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = sessionFrom(JSON.parse(raw))
    if (!session) window.sessionStorage.removeItem(SESSION_KEY)
    return session
  } catch {
    return null
  }
}

function storeSession(session: CloudSession | null) {
  try {
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    throw new Error('Browser session storage is unavailable. Enable storage for this site and try again.')
  }
}

function parseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>
    for (const key of ['message', 'msg', 'error_description', 'error']) {
      if (typeof row[key] === 'string' && row[key]) return row[key] as string
    }
  }
  return fallback
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const { url, key } = configuration()
  const response = await fetch(url + '/auth/v1/' + path, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseMessage(payload, 'Authentication request failed with HTTP ' + response.status))
  return payload
}

export async function signInWorkspaceCloud(email: string, password: string) {
  const payload = await authRequest('token?grant_type=password', { email: email.trim(), password })
  const session = sessionFrom(payload)
  if (!session) throw new Error('The auth provider did not return a valid session.')
  storeSession(session)
  return session
}

export async function signUpWorkspaceCloud(email: string, password: string) {
  const payload = await authRequest('signup', { email: email.trim(), password })
  const session = sessionFrom(payload)
  if (session) storeSession(session)
  return { session, confirmationRequired: !session }
}

async function requireSession() {
  const session = readWorkspaceCloudSession()
  if (!session) throw new Error('Sign in before syncing workspace data.')
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session

  const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
  const refreshed = sessionFrom(payload)
  if (!refreshed) {
    storeSession(null)
    throw new Error('Your cloud session expired. Sign in again.')
  }
  storeSession(refreshed)
  return refreshed
}

export async function signOutWorkspaceCloud() {
  const session = readWorkspaceCloudSession()
  try {
    if (session && isWorkspaceCloudConfigured()) {
      const { url, key } = configuration()
      await fetch(url + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + session.access_token },
      })
    }
  } finally {
    storeSession(null)
  }
}

function restHeaders(key: string, accessToken: string) {
  return {
    apikey: key,
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function restError(response: Response) {
  const payload: unknown = await response.json().catch(() => null)
  return new Error(parseMessage(payload, 'Workspace database request failed with HTTP ' + response.status))
}

export async function saveControlPlaneChecklist(checked: Record<string, boolean>): Promise<string> {
  const session = await requireSession()
  const { url, key } = configuration()
  const response = await fetch(url + '/rest/v1/workspace_snapshots?on_conflict=owner_id%2Cworkspace_key', {
    method: 'POST',
    headers: {
      ...restHeaders(key, session.access_token),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      owner_id: session.user.id,
      workspace_key: 'control-plane-checklist',
      payload: { checked },
      updated_at: new Date().toISOString(),
    }),
  })
  if (!response.ok) throw await restError(response)
  const rows: unknown = await response.json().catch(() => [])
  const row = Array.isArray(rows) ? rows[0] as Record<string, unknown> | undefined : undefined
  return typeof row?.updated_at === 'string' ? row.updated_at : new Date().toISOString()
}

export async function loadControlPlaneChecklist(): Promise<CloudChecklistSnapshot | null> {
  const session = await requireSession()
  const { url, key } = configuration()
  const params = new URLSearchParams({
    select: 'payload,updated_at',
    workspace_key: 'eq.control-plane-checklist',
    limit: '1',
  })
  const response = await fetch(url + '/rest/v1/workspace_snapshots?' + params.toString(), {
    headers: restHeaders(key, session.access_token),
  })
  if (!response.ok) throw await restError(response)
  const rows: unknown = await response.json().catch(() => [])
  if (!Array.isArray(rows) || !rows.length) return null
  const row = rows[0] as Record<string, unknown>
  const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {}
  const checked = payload.checked && typeof payload.checked === 'object' ? payload.checked as Record<string, unknown> : {}
  return {
    checked: Object.fromEntries(Object.entries(checked).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}
