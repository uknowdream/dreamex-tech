import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Cloud, Copy, ExternalLink, Github, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { useLanguage } from './i18n'

type Role = 'admin' | 'editor' | 'viewer' | null
type User = { id: string; login: string; name: string; avatarUrl: string }
type AccountState = { configured: boolean; authenticated: boolean; cloudSyncReady: boolean; teamRole: Role; canManageTeam: boolean; teamRoleAvailable: boolean; user: User | null }
type Snapshot = { format: string; version: number; updatedAt: string | null; updatedBy: { id: string; login: string } | null; entries: Record<string, string> }
type Repository = { name: string; fullName: string; htmlUrl: string; defaultBranch: string; stars: number; updatedAt: string; workflow: { state: string; run: null | { name: string; status: string; conclusion: string | null; url: string | null; updatedAt: string | null } } }
type GithubIntegration = { username: string; fetchedAt: string; source: string; limitations: string; repositories: Repository[] }

const TEAM_KEYS = new Set([
  'dreamex-command-center-v1',
  'dreamex-control-plane-checklist-v1',
  'dreamex-roadmap-v1',
  'dreamex-readiness-scorecard-v1',
  'dreamex-threat-model-v1',
  'dreamex-qa-studio-history-v1',
  'dreamex-reliability-incidents-v1',
  'dreamex-reliability-metrics-v1',
])
const SENSITIVE_FIELD = /authorization|cookie|password|secret|token|api[-_]?key|client[-_]?secret|access[-_]?key|credential|private[-_]?key/i
const UNSAFE_STORAGE_KEY = /api-playground|token|secret|credential|auth-session|private-key/i
const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/g,
]
const emptyAccount: AccountState = { configured: false, authenticated: false, cloudSyncReady: false, teamRole: null, canManageTeam: false, teamRoleAvailable: true, user: null }

function scrubText(value: string) {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), value)
}
function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') return scrubText(value)
  if (Array.isArray(value)) return value.map(scrubValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_FIELD.test(key))
      .map(([key, item]) => [key, scrubValue(item)]))
  }
  return value
}
function localEntries(scope: 'personal' | 'team') {
  const entries: Record<string, string> = {}
  let skipped = 0
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith('dreamex-')) continue
      if (UNSAFE_STORAGE_KEY.test(key) || (scope === 'team' && !TEAM_KEYS.has(key))) { skipped += 1; continue }
      const raw = window.localStorage.getItem(key)
      if (raw === null) continue
      try { entries[key] = JSON.stringify(scrubValue(JSON.parse(raw))) }
      catch { entries[key] = scrubText(raw) }
    }
  } catch { throw new Error('Browser storage is unavailable or blocked.') }
  const bytes = new TextEncoder().encode(JSON.stringify(entries)).byteLength
  if (bytes > 400 * 1024) throw new Error('The sanitized snapshot exceeds the 400 KiB cloud limit. Export or remove large drafts before syncing.')
  return { entries, skipped, bytes }
}
async function apiJson(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options })
  let payload: Record<string, unknown>
  try { payload = await response.json() as Record<string, unknown> }
  catch { throw new Error('The API is not responding with JSON. Check that the Vercel API routes are deployed.') }
  if (!response.ok) throw new Error(typeof payload.message === 'string' ? payload.message : 'The request failed (' + response.status + ').')
  return payload
}
function niceDate(value: string | null | undefined, en: boolean) {
  if (!value) return en ? 'No cloud snapshot yet' : 'Belum ada snapshot cloud'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString(en ? 'en-US' : 'id-ID')
}

export function CloudWorkspacePanel() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [account, setAccount] = useState<AccountState>(emptyAccount)
  const [accountLoading, setAccountLoading] = useState(true)
  const [scope, setScope] = useState<'personal' | 'team'>('personal')
  const [consent, setConsent] = useState(false)
  const [overwrite, setOverwrite] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [remote, setRemote] = useState<Snapshot | null>(null)
  const [integration, setIntegration] = useState<GithubIntegration | null>(null)
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    let active = true
    const url = new URL(window.location.href)
    const accountResult = url.searchParams.get('account')
    const invitation = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '').get('invite')
    if (invitation) setInviteCode(invitation)
    if (accountResult === 'connected') setNotice(en ? 'GitHub sign-in completed.' : 'Login GitHub berhasil.')
    if (accountResult === 'cancelled') setNotice(en ? 'GitHub sign-in was cancelled.' : 'Login GitHub dibatalkan.')
    if (accountResult === 'error') setError(en ? 'GitHub sign-in did not complete. Check the OAuth app configuration and try again.' : 'Login GitHub belum berhasil. Periksa konfigurasi OAuth lalu coba lagi.')
    if (accountResult || invitation) window.history.replaceState(null, '', window.location.pathname)
    apiJson('/api/auth/me').then(payload => {
      if (!active) return
      setAccount({
        configured: payload.configured === true,
        authenticated: payload.authenticated === true,
        cloudSyncReady: payload.cloudSyncReady === true,
        teamRole: ['admin', 'editor', 'viewer'].includes(String(payload.teamRole)) ? payload.teamRole as Role : null,
        canManageTeam: payload.canManageTeam === true,
        teamRoleAvailable: payload.teamRoleAvailable !== false,
        user: payload.user && typeof payload.user === 'object' ? payload.user as User : null,
      })
    }).catch(() => {
      if (active) setError(en ? 'Cloud API is not reachable from this deployment. The local tools remain available.' : 'API cloud belum dapat diakses dari deployment ini. Tools lokal tetap dapat digunakan.')
    }).finally(() => { if (active) setAccountLoading(false) })
    return () => { active = false }
  }, [en])

  const canUseTeam = account.canManageTeam || account.teamRole !== null
  const canWriteTeam = account.canManageTeam || account.teamRole === 'editor' || account.teamRole === 'admin'
  const roleLabel = useMemo(() => {
    const role = account.canManageTeam ? 'admin' : account.teamRole
    if (!role) return en ? 'Not a member' : 'Belum menjadi anggota'
    return role === 'admin' ? 'Admin' : role === 'editor' ? (en ? 'Editor' : 'Editor') : (en ? 'Viewer · read only' : 'Viewer · hanya baca')
  }, [account.canManageTeam, account.teamRole, en])

  const refreshAccount = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const payload = await apiJson('/api/auth/me')
      const next: AccountState = {
        configured: payload.configured === true,
        authenticated: payload.authenticated === true,
        cloudSyncReady: payload.cloudSyncReady === true,
        teamRole: ['admin', 'editor', 'viewer'].includes(String(payload.teamRole)) ? payload.teamRole as Role : null,
        canManageTeam: payload.canManageTeam === true,
        teamRoleAvailable: payload.teamRoleAvailable !== false,
        user: payload.user && typeof payload.user === 'object' ? payload.user as User : null,
      }
      setAccount(next)
      if (!next.authenticated) { setRemote(null); setIntegration(null); setScope('personal') }
      setNotice(en ? 'Account status refreshed.' : 'Status akun diperbarui.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed.') }
    finally { setBusy(false) }
  }

  const logout = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      await apiJson('/api/auth/logout', { method: 'POST' })
      setAccount(emptyAccount); setRemote(null); setIntegration(null); setScope('personal')
      setNotice(en ? 'Signed out. Local browser data was not deleted.' : 'Berhasil keluar. Data lokal browser tidak dihapus.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-out failed.') }
    finally { setBusy(false) }
  }

  const loadGitHub = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const payload = await apiJson('/api/integrations/github')
      setIntegration(payload as unknown as GithubIntegration)
      setNotice(en ? 'Latest public GitHub repository and workflow data loaded.' : 'Data repositori publik dan workflow GitHub terbaru berhasil dimuat.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'GitHub integration failed.') }
    finally { setBusy(false) }
  }

  const loadSnapshot = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const payload = await apiJson('/api/workspace?scope=' + scope)
      const snapshot = payload.snapshot as Snapshot
      if (!snapshot || !snapshot.entries || typeof snapshot.entries !== 'object') throw new Error('The cloud snapshot has an unsupported format.')
      setRemote(snapshot)
      setNotice(en
        ? 'Cloud snapshot loaded: ' + Object.keys(snapshot.entries).length + ' keys · ' + niceDate(snapshot.updatedAt, true)
        : 'Snapshot cloud dimuat: ' + Object.keys(snapshot.entries).length + ' key · ' + niceDate(snapshot.updatedAt, false))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the cloud snapshot.') }
    finally { setBusy(false) }
  }

  const saveSnapshot = async () => {
    if (!consent) { setError(en ? 'Confirm the privacy notice before uploading data.' : 'Konfirmasi pemberitahuan privasi sebelum mengunggah data.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const local = localEntries(scope)
      const payload = await apiJson('/api/workspace?scope=' + scope, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: local.entries, expectedUpdatedAt: remote?.updatedAt ?? null }),
      })
      const snapshot = payload.snapshot as Snapshot
      setRemote(snapshot)
      setNotice(en
        ? 'Cloud snapshot saved (' + Object.keys(local.entries).length + ' keys, ' + Math.ceil(local.bytes / 1024) + ' KiB). ' + local.skipped + ' sensitive or out-of-scope keys were excluded.'
        : 'Snapshot cloud tersimpan (' + Object.keys(local.entries).length + ' key, ' + Math.ceil(local.bytes / 1024) + ' KiB). ' + local.skipped + ' key sensitif atau di luar cakupan tidak disertakan.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cloud save failed.') }
    finally { setBusy(false) }
  }

  const mergeSnapshot = () => {
    if (!remote) { setError(en ? 'Load a cloud snapshot first.' : 'Muat snapshot cloud terlebih dahulu.'); return }
    let added = 0; let replaced = 0
    try {
      for (const [key, value] of Object.entries(remote.entries)) {
        if (!key.startsWith('dreamex-') || typeof value !== 'string') continue
        const current = window.localStorage.getItem(key)
        if (current === null) { window.localStorage.setItem(key, value); added += 1 }
        else if (overwrite) { window.localStorage.setItem(key, value); replaced += 1 }
      }
      setNotice(en
        ? 'Merge finished: ' + added + ' keys restored, ' + replaced + ' keys overwritten. Reload the page to refresh tools.'
        : 'Penggabungan selesai: ' + added + ' key dipulihkan, ' + replaced + ' key ditimpa. Muat ulang halaman agar tools membaca data terbaru.')
    } catch {
      setError(en ? 'Browser storage is unavailable. Some values may not have been restored.' : 'Penyimpanan browser tidak tersedia. Sebagian nilai mungkin belum dipulihkan.')
    }
  }

  const createInvite = async () => {
    setBusy(true); setError(''); setNotice(''); setInviteUrl('')
    try {
      const payload = await apiJson('/api/workspace/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: inviteRole }),
      })
      setInviteCode(String(payload.code || ''))
      setInviteUrl(String(payload.joinUrl || ''))
      setNotice(en ? 'Invitation created. Share it only with the intended teammate; it expires in seven days and can be used once.' : 'Undangan dibuat. Bagikan hanya kepada anggota tim yang dituju; undangan berlaku tujuh hari dan hanya dapat digunakan sekali.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create invitation.') }
    finally { setBusy(false) }
  }

  const redeemInvite = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const payload = await apiJson('/api/workspace/invites/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: inviteCode }),
      })
      setNotice(typeof payload.message === 'string' ? payload.message : (en ? 'Invitation accepted.' : 'Undangan diterima.'))
      await refreshAccount()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not redeem invitation.') }
    finally { setBusy(false) }
  }

  const copyInvite = async () => {
    if (!inviteUrl) return
    try { await navigator.clipboard.writeText(inviteUrl); setNotice(en ? 'Invitation link copied.' : 'Tautan undangan disalin.') }
    catch { setNotice(en ? 'Select and copy the invitation URL manually.' : 'Pilih dan salin URL undangan secara manual.') }
  }

  return <section className="cloud-workspace-section" aria-labelledby="cloud-workspace-heading">
    <div className="cloud-workspace-heading">
      <div><span className="section-kicker"><Cloud size={14} /> {en ? 'CONNECTED ENGINEERING' : 'ENGINEERING TERHUBUNG'}</span><h2 id="cloud-workspace-heading">{en ? 'Cloud workspace & integrations' : 'Workspace cloud & integrasi'}</h2><p>{en ? 'Sign in, inspect live public GitHub signals, and move selected engineering work between your browsers or a shared team snapshot.' : 'Login, periksa sinyal GitHub publik terbaru, dan pindahkan data engineering terpilih antar-browser atau ke snapshot tim bersama.'}</p></div>
      <span className={'cloud-workspace-status ' + (account.authenticated ? 'is-connected' : '')}><span />{accountLoading ? (en ? 'Checking account' : 'Memeriksa akun') : account.authenticated ? (en ? 'GitHub connected' : 'GitHub terhubung') : (en ? 'Not connected' : 'Belum terhubung')}</span>
    </div>

    {account.authenticated && account.user ? <div className="cloud-workspace-account">
      {account.user.avatarUrl && <img src={account.user.avatarUrl} alt="" width="40" height="40" />}
      <div className="cloud-workspace-account-copy"><strong>{account.user.name || account.user.login}</strong><span>@{account.user.login} · {roleLabel}</span></div>
      <button type="button" className="button button-secondary" onClick={logout} disabled={busy}>{en ? 'Sign out' : 'Keluar'}</button>
    </div> : <div className="cloud-workspace-signin">
      <div><h3>{en ? 'Connect your GitHub identity' : 'Hubungkan identitas GitHub'}</h3><p>{en ? 'OAuth requests read:user only. This integration does not request repository write access or access to private repositories.' : 'OAuth hanya meminta read:user. Integrasi ini tidak meminta akses tulis repositori atau akses ke repositori privat.'}</p></div>
      {account.configured
        ? <a className="button button-primary" href="/api/auth/github?action=start"><Github size={16} />{en ? 'Sign in with GitHub' : 'Login dengan GitHub'}</a>
        : <button className="button button-secondary" disabled title={en ? 'OAuth environment variables are not configured.' : 'Variabel lingkungan OAuth belum dikonfigurasi.'}><Github size={16} />{en ? 'GitHub sign-in not configured' : 'Login GitHub belum dikonfigurasi'}</button>}
    </div>}

    {!account.configured && <p className="cloud-workspace-warning" role="note">{en ? 'Setup required: create a GitHub OAuth App with callback https://dreamex.tech/api/auth/github, then configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and a random SESSION_SECRET (32+ characters) in Vercel. Full steps are in the repository operations guide.' : 'Perlu setup: buat GitHub OAuth App dengan callback https://dreamex.tech/api/auth/github, lalu atur GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, dan SESSION_SECRET acak (32+ karakter) di Vercel. Panduan lengkap tersedia di dokumentasi operasi repositori.'} <a href="https://github.com/uknowdream/dreamex-tech/blob/main/docs/OPERATIONS.md" target="_blank" rel="noreferrer">{en ? 'Open setup guide' : 'Buka panduan setup'} <ExternalLink size={13} /></a></p>}

    {account.authenticated && <div className="cloud-workspace-integration">
      <div className="cloud-workspace-subheading"><div><Github size={17} /><div><h3>{en ? 'GitHub public repositories & Actions' : 'Repositori publik & Actions GitHub'}</h3><p>{en ? 'Reads recent public repositories and the latest workflow run for up to four repositories.' : 'Membaca repositori publik terbaru dan workflow terakhir untuk maksimal empat repositori.'}</p></div></div><button className="button button-secondary" type="button" onClick={loadGitHub} disabled={busy}><RefreshCw size={14} />{en ? 'Refresh GitHub' : 'Perbarui GitHub'}</button></div>
      {integration && <><p className="cloud-workspace-small">{en ? 'Fetched' : 'Diambil'}: {niceDate(integration.fetchedAt, en)} · {integration.repositories.length} {en ? 'repositories' : 'repositori'}</p>
        <div className="cloud-workspace-repos">{integration.repositories.map(repo => <article key={repo.fullName} className="cloud-workspace-repo"><div><a href={repo.htmlUrl} target="_blank" rel="noreferrer">{repo.fullName} <ExternalLink size={12} /></a><small>{repo.defaultBranch || 'default branch'} · ★ {repo.stars} · {en ? 'updated' : 'diperbarui'} {niceDate(repo.updatedAt, en)}</small></div><div className="cloud-workspace-run">{repo.workflow.run ? <><span className={'cloud-workspace-run-dot ' + (repo.workflow.run.conclusion === 'success' ? 'is-good' : repo.workflow.run.conclusion === 'failure' ? 'is-bad' : '')} /><div><strong>{repo.workflow.run.conclusion || repo.workflow.run.status}</strong><small>{repo.workflow.run.name}</small></div>{repo.workflow.run.url && <a href={repo.workflow.run.url} target="_blank" rel="noreferrer" aria-label={en ? 'Open latest workflow run' : 'Buka workflow terakhir'}><ExternalLink size={13} /></a>}</> : <span>{repo.workflow.state === 'no_runs' ? (en ? 'No public Actions runs' : 'Tidak ada run Actions publik') : (en ? 'Workflow status unavailable' : 'Status workflow tidak tersedia')}</span>}</div></article>)}</div>
        <p className="cloud-workspace-small">{integration.limitations}</p>
      </>}
    </div>}

    {account.authenticated && <div className="cloud-workspace-sync">
      <div className="cloud-workspace-subheading"><div><ShieldCheck size={17} /><div><h3>{en ? 'Cloud backup & shared team workspace' : 'Backup cloud & workspace tim bersama'}</h3><p>{en ? 'Snapshots are encrypted in transit, scoped by account/workspace and guarded by server-side role checks. They are not real-time sync.' : 'Snapshot dikirim melalui HTTPS, dipisahkan per akun/workspace, dan dilindungi pengecekan role server-side. Ini bukan sinkronisasi real-time.'}</p></div></div></div>
      {!account.cloudSyncReady && <p className="cloud-workspace-warning" role="note">{en ? 'Cloud persistence is not active yet. Create a Vercel KV/Upstash Redis database and configure KV_REST_API_URL and KV_REST_API_TOKEN. No data is uploaded until the API reports cloud storage ready.' : 'Penyimpanan cloud belum aktif. Buat database Vercel KV/Upstash Redis lalu atur KV_REST_API_URL dan KV_REST_API_TOKEN. Tidak ada data yang diunggah sebelum API menyatakan penyimpanan cloud siap.'}</p>}
      <div className="cloud-workspace-toolbar">
        <label>{en ? 'Snapshot scope' : 'Cakupan snapshot'}<select value={scope} onChange={event => { setScope(event.target.value as 'personal' | 'team'); setRemote(null); setConsent(false); setError(''); setNotice('') }}><option value="personal">{en ? 'Personal account' : 'Akun pribadi'}</option>{canUseTeam && <option value="team">{en ? 'Shared team workspace' : 'Workspace tim bersama'}</option>}</select></label>
        <button type="button" className="button button-secondary" onClick={loadSnapshot} disabled={busy || !account.cloudSyncReady || (scope === 'team' && !canUseTeam)}><Cloud size={14} />{en ? 'Load cloud snapshot' : 'Muat snapshot cloud'}</button>
        <button type="button" className="button button-primary" onClick={saveSnapshot} disabled={busy || !account.cloudSyncReady || (scope === 'team' && !canWriteTeam) || !consent}><CheckCircle2 size={14} />{en ? 'Save local snapshot to cloud' : 'Simpan snapshot lokal ke cloud'}</button>
      </div>
      <div className="cloud-workspace-consent"><label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{en ? 'I have reviewed the selected data and understand this action uploads a sanitized snapshot to the selected cloud scope.' : 'Saya telah meninjau data yang dipilih dan memahami bahwa tindakan ini mengunggah snapshot yang disanitasi ke cakupan cloud yang dipilih.'}</span></label></div>
      <div className="cloud-workspace-restore">
        <div><strong>{en ? 'Remote snapshot' : 'Snapshot remote'}</strong><span>{remote ? niceDate(remote.updatedAt, en) + ' · ' + Object.keys(remote.entries).length + (en ? ' keys' : ' key') + (remote.updatedBy?.login ? ' · ' + remote.updatedBy.login : '') : (en ? 'Not loaded' : 'Belum dimuat')}</span></div>
        <label><input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)} />{en ? 'Overwrite matching local keys' : 'Timpa key lokal yang sama'}</label>
        <button type="button" className="button button-secondary" onClick={mergeSnapshot} disabled={busy || !remote}>{en ? 'Merge snapshot into browser' : 'Gabungkan snapshot ke browser'}</button>
        <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>{en ? 'Reload tools' : 'Muat ulang tools'}</button>
      </div>
      <p className="cloud-workspace-small">{scope === 'team'
        ? (en ? 'Team snapshots are limited to release checklist, command center, roadmap, threat model, QA drafts, and reliability incidents/metrics. Keep customer data, production secrets, tokens, and private incident details out of shared notes.' : 'Snapshot tim dibatasi pada checklist rilis, command center, roadmap, threat model, draft QA, serta insiden/metrik reliability. Jangan masukkan data pelanggan, secret produksi, token, atau detail insiden privat.')
        : (en ? 'API Playground collections are excluded. Sensitive fields and recognizable bearer/GitHub/cloud credentials are redacted. Review the snapshot and never intentionally upload production secrets.' : 'Koleksi API Playground tidak disertakan. Field sensitif dan kredensial bearer/GitHub/cloud yang dikenali akan disamarkan. Tinjau snapshot dan jangan sengaja mengunggah secret produksi.')}</p>
    </div>}

    {account.authenticated && (account.canManageTeam || account.teamRole || inviteCode) && <div className="cloud-workspace-team">
      <div className="cloud-workspace-subheading"><div><Users size={17} /><div><h3>{en ? 'Team access' : 'Akses tim'}</h3><p>{en ? 'Role enforcement happens on the API, not only in this interface.' : 'Pengecekan role dilakukan di API, bukan hanya di antarmuka.'}</p></div></div></div>
      <div className="cloud-workspace-toolbar"><span className="cloud-workspace-role">{en ? 'Your role' : 'Role Anda'}: <strong>{roleLabel}</strong></span>{account.canManageTeam && <button className="button button-secondary" type="button" onClick={() => setShowInviteForm(value => !value)}><Users size={14} />{en ? 'Invite teammate' : 'Undang anggota tim'}</button>}</div>
      {showInviteForm && account.canManageTeam && <div className="cloud-workspace-invite-form"><label>{en ? 'Access level' : 'Tingkat akses'}<select value={inviteRole} onChange={event => setInviteRole(event.target.value as 'editor' | 'viewer')}><option value="editor">{en ? 'Editor — can update shared snapshot' : 'Editor — dapat memperbarui snapshot bersama'}</option><option value="viewer">{en ? 'Viewer — read only' : 'Viewer — hanya baca'}</option></select></label><button type="button" className="button button-primary" onClick={createInvite} disabled={busy || !account.cloudSyncReady}>{en ? 'Create one-time invitation' : 'Buat undangan sekali pakai'}</button></div>}
      {inviteUrl && <div className="cloud-workspace-invite-output"><code>{inviteUrl}</code><button className="button button-secondary" type="button" onClick={copyInvite}><Copy size={14} />{en ? 'Copy invite link' : 'Salin tautan undangan'}</button></div>}
      {inviteCode && !canUseTeam && account.authenticated && <div className="cloud-workspace-invite-form"><label>{en ? 'Invitation code' : 'Kode undangan'}<input value={inviteCode} onChange={event => setInviteCode(event.target.value)} /></label><button className="button button-primary" type="button" onClick={redeemInvite} disabled={busy || !account.cloudSyncReady}>{en ? 'Accept invitation' : 'Terima undangan'}</button></div>}
    </div>}

    {accountLoading && <p className="cloud-workspace-small" role="status">{en ? 'Checking authentication and storage configuration…' : 'Memeriksa autentikasi dan konfigurasi penyimpanan…'}</p>}
    {error && <p className="cloud-workspace-message is-error" role="alert">{error}</p>}
    {notice && <p className="cloud-workspace-message" role="status">{notice}</p>}
    <p className="cloud-workspace-disclaimer"><Activity size={14} />{en ? 'GitHub integration is read-only and limited to public repositories. Personal cloud snapshots are private to the signed-in GitHub account; team data is shared with invited members. Cloud features remain unavailable until required Vercel environment variables are configured.' : 'Integrasi GitHub bersifat read-only dan hanya untuk repositori publik. Snapshot pribadi hanya untuk akun GitHub yang login; data tim dibagikan kepada anggota yang diundang. Fitur cloud belum aktif sampai variabel lingkungan Vercel yang dibutuhkan dikonfigurasi.'}</p>
  </section>
}
