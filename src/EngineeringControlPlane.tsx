import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, Boxes, Check, CheckCircle2, ClipboardCheck, Clock3, Code2, Download, ExternalLink, Gauge, Github, Network, RefreshCw, Search, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useLanguage } from './i18n'
import { addWorkspaceTeamMember, createWorkspaceTeam, isWorkspaceCloudConfigured, loadControlPlaneChecklist, loadTeamControlPlaneChecklist, loadWorkspaceTeamMembers, loadWorkspaceTeams, readWorkspaceCloudSession, removeWorkspaceTeamMember, saveControlPlaneChecklist, saveTeamControlPlaneChecklist, signInWorkspaceCloud, signOutWorkspaceCloud, signUpWorkspaceCloud, updateWorkspaceTeamMemberRole, type CloudSession, type CloudTeam, type CloudTeamMember, type CloudTeamRole } from './workspace-cloud'

const CHECKLIST_KEY = 'dreamex-control-plane-checklist-v1'

const workflows = [
  { id: 'catalog', title: 'Software Catalog', description: 'Map services, ownership, repositories, and dependencies.', route: '/engineering-intelligence', category: 'Architecture', icon: Boxes, keywords: 'catalog service ownership repo dependencies architecture' },
  { id: 'api', title: 'API Contract Studio', description: 'Inspect OpenAPI contracts and compare likely breaking changes.', route: '/engineering-intelligence', category: 'API Engineering', icon: Code2, keywords: 'api openapi contract schema compatibility' },
  { id: 'quality', title: 'QA Automation Studio', description: 'Create test cases, Gherkin scenarios, plans, and defect reports.', route: '/qa-studio', category: 'Quality Engineering', icon: ClipboardCheck, keywords: 'qa test case gherkin bdd regression defect' },
  { id: 'security', title: 'Security & Privacy Center', description: 'Review browser-visible security signals and manage local data.', route: '/security-center', category: 'Security', icon: ShieldCheck, keywords: 'security privacy headers audit' },
  { id: 'performance', title: 'Performance Observatory', description: 'Inspect browser timing and available performance signals.', route: '/performance', category: 'Reliability', icon: Gauge, keywords: 'performance vitals timing observability' },
  { id: 'operations', title: 'Engineering Command Center', description: 'Organize work items, incident notes, and release checklists.', route: '/command-center', category: 'Operations', icon: Activity, keywords: 'command center incident release work queue' },
  { id: 'workspace', title: 'Engineering Workspace', description: 'Search and launch the broader engineering toolkit.', route: '/workspace', category: 'Developer Experience', icon: Workflow, keywords: 'workspace tools search developer' },
  { id: 'learning', title: 'Learning Hub', description: 'Follow curated paths and strengthen engineering fundamentals.', route: '/learn', category: 'Knowledge', icon: Network, keywords: 'learning courses glossary qa automation' },
] as const

const checks = [
  { id: 'scope', title: 'Define change scope and acceptance criteria', group: 'Plan' },
  { id: 'contract', title: 'Review API contracts and compatibility', group: 'Design' },
  { id: 'tests', title: 'Run relevant functional and regression tests', group: 'Verify' },
  { id: 'security', title: 'Review security and privacy impact', group: 'Verify' },
  { id: 'evidence', title: 'Capture test evidence and unresolved risks', group: 'Release' },
  { id: 'rollback', title: 'Confirm rollback and recovery approach', group: 'Release' },
] as const

type CheckState = Record<string, boolean>
type BrowserSignals = { online: boolean; secure: boolean; width: number; height: number }

function readChecks(): CheckState {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(checks.map(item => [item.id, (value as Record<string, unknown>)[item.id] === true]))
  } catch { return {} }
}

function getBrowserSignals(): BrowserSignals {
  return {
    online: typeof navigator === 'undefined' ? false : navigator.onLine,
    secure: typeof window === 'undefined' ? false : window.isSecureContext,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }
}


type GitHubWorkflowRun = {
  id: number
  name: string
  display_title: string
  run_number: number
  status: string
  conclusion: string | null
  html_url: string
  created_at: string
  head_branch: string
}

function LiveGitHubActions() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [runs, setRuns] = useState<GitHubWorkflowRun[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const load = async () => {
      setState('loading')
      setMessage('')
      try {
        const response = await fetch('https://api.github.com/repos/uknowdream/dreamex-tech/actions/runs?per_page=8', {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
        })
        if (!response.ok) {
          if (response.status === 403) throw new Error(en ? 'GitHub API rate limit reached. Retry shortly.' : 'Batas permintaan GitHub API tercapai. Coba lagi sebentar.')
          throw new Error(en ? 'GitHub Actions could not be loaded (HTTP ' + response.status + ').' : 'Data GitHub Actions tidak dapat dimuat (HTTP ' + response.status + ').')
        }
        const payload = await response.json() as { workflow_runs?: unknown }
        const values: unknown[] = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : []
        const valid = values.filter((value): value is GitHubWorkflowRun => {
          if (!value || typeof value !== 'object') return false
          const run = value as Record<string, unknown>
          return Number.isInteger(run.id)
            && typeof run.name === 'string'
            && typeof run.html_url === 'string'
            && run.html_url.startsWith('https://github.com/uknowdream/dreamex-tech/actions/runs/')
            && typeof run.status === 'string'
            && typeof run.created_at === 'string'
            && typeof run.head_branch === 'string'
            && typeof run.run_number === 'number'
        }).slice(0, 8)
        if (active) {
          setRuns(valid)
          setState('ready')
          setUpdatedAt(new Date().toISOString())
          if (valid.length === 0) setMessage(en ? 'No workflow runs were returned by GitHub.' : 'GitHub tidak mengembalikan data workflow.')
        }
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
        setState('error')
        setMessage(error instanceof Error ? error.message : (en ? 'Unknown GitHub API error.' : 'Kesalahan GitHub API yang tidak diketahui.'))
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [reloadKey, en])

  const stateLabel = (run: GitHubWorkflowRun) => {
    if (run.status !== 'completed') return en ? 'In progress' : 'Berjalan'
    if (run.conclusion === 'success') return en ? 'Passed' : 'Lulus'
    if (run.conclusion === 'failure') return en ? 'Failed' : 'Gagal'
    if (run.conclusion === 'cancelled') return en ? 'Cancelled' : 'Dibatalkan'
    if (run.conclusion === 'skipped') return en ? 'Skipped' : 'Dilewati'
    return run.conclusion || (en ? 'Completed' : 'Selesai')
  }
  const stateClass = (run: GitHubWorkflowRun) => run.status !== 'completed'
    ? 'is-running'
    : run.conclusion === 'success' ? 'is-success' : run.conclusion === 'failure' ? 'is-failure' : ''

  return <section className="control-plane-github" aria-labelledby="control-plane-github-title">
    <div className="control-plane-integration-heading">
      <div>
        <span className="section-kicker"><Github size={14} /> {en ? 'LIVE INTEGRATION / GITHUB ACTIONS' : 'INTEGRASI LANGSUNG / GITHUB ACTIONS'}</span>
        <h2 id="control-plane-github-title">{en ? 'CI evidence from the repository' : 'Bukti CI dari repositori'}</h2>
        <p>{en ? 'Latest workflow runs fetched directly from the public GitHub Actions API. Open a run for full logs and artifacts.' : 'Workflow terbaru diambil langsung dari GitHub Actions API publik. Buka run untuk melihat log dan artefak lengkap.'}</p>
      </div>
      <div className="control-plane-integration-actions">
        <button className="control-plane-integration-button" type="button" onClick={() => setReloadKey(value => value + 1)} disabled={state === 'loading'}>
          <RefreshCw size={14} /> {en ? 'Refresh' : 'Muat ulang'}
        </button>
        <a className="control-plane-integration-button" href="https://github.com/uknowdream/dreamex-tech/actions" target="_blank" rel="noreferrer">
          {en ? 'All workflows' : 'Semua workflow'} <ExternalLink size={13} />
        </a>
      </div>
    </div>
    {state === 'loading' && <p className="control-plane-integration-empty" role="status">{en ? 'Loading live GitHub workflow evidence…' : 'Memuat bukti workflow GitHub secara langsung…'}</p>}
    {state === 'error' && <div className="control-plane-integration-empty" role="status"><AlertTriangle size={15} /> {message} <a href="https://github.com/uknowdream/dreamex-tech/actions" target="_blank" rel="noreferrer">{en ? 'Open GitHub Actions' : 'Buka GitHub Actions'}</a></div>}
    {state === 'ready' && runs.length > 0 && <ul className="control-plane-ci-list">
      {runs.map(run => <li className="control-plane-ci-row" key={run.id}>
        <div className="control-plane-ci-run">
          <a href={run.html_url} target="_blank" rel="noreferrer">{run.name}: {run.display_title || ('Run #' + run.run_number)} <ExternalLink size={12} /></a>
          <div className="control-plane-ci-meta">
            <span>{en ? 'Branch' : 'Branch'}: {run.head_branch}</span>
            <span>#{run.run_number}</span>
            <span><Clock3 size={11} /> {Number.isFinite(Date.parse(run.created_at)) ? new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(run.created_at)) : run.created_at}</span>
          </div>
        </div>
        <span className={'control-plane-ci-state ' + stateClass(run)}>{run.status !== 'completed' ? <Activity size={12} /> : run.conclusion === 'success' ? <CheckCircle2 size={12} /> : run.conclusion === 'failure' ? <AlertTriangle size={12} /> : null}{stateLabel(run)}</span>
      </li>)}
    </ul>}
    {state === 'ready' && updatedAt && <p className="control-plane-integration-note">{en ? 'Fetched ' : 'Diambil '}{new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))}{en ? '. Public GitHub API; refresh is manual to respect rate limits.' : '. API GitHub publik; pemuatan ulang manual untuk menjaga batas permintaan.'}</p>}
    {state === 'ready' && runs.length === 0 && <p className="control-plane-integration-empty">{message}</p>}
  </section>
}

function CloudChecklistSync({ checked, onRestore }: { checked: CheckState; onRestore: (value: CheckState) => void }) {
  const { language } = useLanguage()
  const en = language === 'en'
  const configured = isWorkspaceCloudConfigured()
  const [session, setSession] = useState<CloudSession | null>(() => readWorkspaceCloudSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [teams, setTeams] = useState<CloudTeam[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamLoading, setTeamLoading] = useState(false)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<CloudTeamRole>('editor')
  const [members, setMembers] = useState<CloudTeamMember[]>([])
  const [memberRevision, setMemberRevision] = useState(0)

  const setResult = (message: string, isError = false) => {
    setNotice(message)
    setNoticeIsError(isError)
  }
  const signIn = async () => {
    setBusy(true)
    setResult('')
    try {
      const next = await signInWorkspaceCloud(email, password)
      setSession(next)
      setPassword('')
      setResult(en ? 'Signed in. Your personal cloud workspace is ready.' : 'Berhasil masuk. Workspace cloud pribadi siap digunakan.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Sign-in failed.' : 'Gagal masuk.'), true)
    } finally { setBusy(false) }
  }
  const signUp = async () => {
    if (password.length < 10) {
      setResult(en ? 'Use a password with at least 10 characters.' : 'Gunakan kata sandi minimal 10 karakter.', true)
      return
    }
    setBusy(true)
    setResult('')
    try {
      const result = await signUpWorkspaceCloud(email, password)
      setPassword('')
      if (result.session) {
        setSession(result.session)
        setResult(en ? 'Account created and signed in.' : 'Akun berhasil dibuat dan Anda sudah masuk.')
      } else {
        setResult(en ? 'Account request created. Confirm your email, then sign in here.' : 'Permintaan akun dibuat. Konfirmasi email, lalu masuk di sini.')
      }
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Account creation failed.' : 'Gagal membuat akun.'), true)
    } finally { setBusy(false) }
  }
  const save = async () => {
    setBusy(true)
    setResult('')
    try {
      const savedAt = await saveControlPlaneChecklist(checked)
      setSession(readWorkspaceCloudSession())
      setResult((en ? 'Checklist synced to your account at ' : 'Checklist tersinkron ke akun pada ') + new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt)))
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Cloud save failed.' : 'Penyimpanan cloud gagal.'), true)
      if (/session expired|sign in/i.test(error instanceof Error ? error.message : '')) setSession(readWorkspaceCloudSession())
    } finally { setBusy(false) }
  }
  const restore = async () => {
    setBusy(true)
    setResult('')
    try {
      const snapshot = await loadControlPlaneChecklist()
      if (!snapshot) {
        setResult(en ? 'No cloud checklist was found yet. Save this checklist first.' : 'Checklist cloud belum ditemukan. Simpan checklist ini terlebih dahulu.')
      } else {
        const allowed = new Set(checks.map(item => item.id))
        onRestore(Object.fromEntries(Object.entries(snapshot.checked).filter(([key, value]) => allowed.has(key as typeof checks[number]['id']) && typeof value === 'boolean')) as CheckState)
        setResult((en ? 'Checklist restored from cloud, updated ' : 'Checklist dipulihkan dari cloud, diperbarui ') + (snapshot.updatedAt ? new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(snapshot.updatedAt)) : (en ? 'at an unknown time.' : 'pada waktu yang tidak diketahui.')))
      }
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Cloud restore failed.' : 'Pemulihan cloud gagal.'), true)
      if (/session expired|sign in/i.test(error instanceof Error ? error.message : '')) setSession(readWorkspaceCloudSession())
    } finally { setBusy(false) }
  }
  const refreshTeams = async () => {
    if (!configured || !session) return
    setTeamLoading(true)
    try {
      const next = await loadWorkspaceTeams()
      setTeams(next)
      setSelectedTeamId(current => next.some(team => team.id === current) ? current : (next[0]?.id ?? ''))
      setResult(en ? 'Team list refreshed.' : 'Daftar tim diperbarui.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not load teams.' : 'Tidak dapat memuat tim.'), true)
    } finally { setTeamLoading(false) }
  }
  const createTeam = async () => {
    if (!teamName.trim()) return
    setTeamLoading(true)
    try {
      const created = await createWorkspaceTeam(teamName)
      setTeams(current => [...current.filter(team => team.id !== created.id), created])
      setSelectedTeamId(created.id)
      setTeamName('')
      setMemberRevision(value => value + 1)
      setResult(en ? 'Team created. Your account is its owner.' : 'Tim dibuat. Akun Anda menjadi pemilik tim.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not create team.' : 'Tidak dapat membuat tim.'), true)
    } finally { setTeamLoading(false) }
  }
  const addMember = async () => {
    if (!selectedTeamId || !memberUserId.trim()) return
    setTeamLoading(true)
    try {
      await addWorkspaceTeamMember(selectedTeamId, memberUserId.trim(), memberRole)
      setMemberUserId('')
      setMemberRevision(value => value + 1)
      setResult(en ? 'Team member added with the selected role.' : 'Anggota tim ditambahkan dengan role yang dipilih.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not add team member.' : 'Tidak dapat menambahkan anggota tim.'), true)
    } finally { setTeamLoading(false) }
  }
  const changeMemberRole = async (userId: string, role: CloudTeamRole) => {
    if (!selectedTeamId) return
    setTeamLoading(true)
    try {
      await updateWorkspaceTeamMemberRole(selectedTeamId, userId, role)
      setMemberRevision(value => value + 1)
      setResult(en ? 'Member role updated.' : 'Role anggota diperbarui.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not change member role.' : 'Tidak dapat mengubah role anggota.'), true)
    } finally { setTeamLoading(false) }
  }
  const removeMember = async (userId: string) => {
    if (!selectedTeamId || !window.confirm(en ? 'Remove this member from the team?' : 'Hapus anggota ini dari tim?')) return
    setTeamLoading(true)
    try {
      await removeWorkspaceTeamMember(selectedTeamId, userId)
      setMemberRevision(value => value + 1)
      setResult(en ? 'Member removed.' : 'Anggota dihapus.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not remove member.' : 'Tidak dapat menghapus anggota.'), true)
    } finally { setTeamLoading(false) }
  }
  const saveTeamChecklist = async () => {
    if (!selectedTeamId) return
    setTeamLoading(true)
    try {
      const savedAt = await saveTeamControlPlaneChecklist(selectedTeamId, checked)
      setResult((en ? 'Shared checklist saved at ' : 'Checklist bersama disimpan pada ') + new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt)))
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Team save failed.' : 'Gagal menyimpan checklist tim.'), true)
    } finally { setTeamLoading(false) }
  }
  const restoreTeamChecklist = async () => {
    if (!selectedTeamId) return
    setTeamLoading(true)
    try {
      const snapshot = await loadTeamControlPlaneChecklist(selectedTeamId)
      if (!snapshot) {
        setResult(en ? 'No shared checklist exists for this team yet.' : 'Checklist bersama belum tersedia untuk tim ini.')
      } else {
        const allowed = new Set(checks.map(item => item.id))
        onRestore(Object.fromEntries(Object.entries(snapshot.checked).filter(([key, value]) => allowed.has(key as typeof checks[number]['id']) && typeof value === 'boolean')) as CheckState)
        setResult((en ? 'Shared checklist restored, updated ' : 'Checklist bersama dipulihkan, diperbarui ') + (snapshot.updatedAt ? new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(snapshot.updatedAt)) : (en ? 'at an unknown time.' : 'pada waktu yang tidak diketahui.')))
      }
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not restore shared checklist.' : 'Tidak dapat memulihkan checklist bersama.'), true)
    } finally { setTeamLoading(false) }
  }
  const selectedTeam = teams.find(team => team.id === selectedTeamId)
  const currentMembership = members.find(member => member.user_id === session?.user.id)
  const canManageTeam = currentMembership?.role === 'owner' || currentMembership?.role === 'admin'
  const canWriteTeam = canManageTeam || currentMembership?.role === 'editor'

  useEffect(() => {
    if (!configured || !session) {
      setTeams([])
      setMembers([])
      setSelectedTeamId('')
      return
    }
    let active = true
    setTeamLoading(true)
    void loadWorkspaceTeams().then(next => {
      if (!active) return
      setTeams(next)
      setSelectedTeamId(current => next.some(team => team.id === current) ? current : (next[0]?.id ?? ''))
      setNotice('')
      setNoticeIsError(false)
    }).catch(error => {
      if (active) {
        setNotice(error instanceof Error ? error.message : (en ? 'Could not load teams.' : 'Tidak dapat memuat tim.'))
        setNoticeIsError(true)
      }
    }).finally(() => { if (active) setTeamLoading(false) })
    return () => { active = false }
  }, [configured, session?.user.id, en])

  useEffect(() => {
    if (!configured || !session || !selectedTeamId) {
      setMembers([])
      return
    }
    let active = true
    void loadWorkspaceTeamMembers(selectedTeamId).then(next => {
      if (active) setMembers(next)
    }).catch(error => {
      if (active) {
        setNotice(error instanceof Error ? error.message : (en ? 'Could not load team members.' : 'Tidak dapat memuat anggota tim.'))
        setNoticeIsError(true)
      }
    })
    return () => { active = false }
  }, [configured, session?.user.id, selectedTeamId, memberRevision, en])

  return <section className="control-plane-cloud" aria-labelledby="control-plane-cloud-title">
    <div className="control-plane-integration-heading">
      <div>
        <span className="section-kicker"><ShieldCheck size={14} /> {en ? 'OPTIONAL BACKEND / AUTHENTICATED STORAGE' : 'BACKEND OPSIONAL / PENYIMPANAN TERAUTENTIKASI'}</span>
        <h2 id="control-plane-cloud-title">{en ? 'Cloud workspace sync' : 'Sinkronisasi workspace cloud'}</h2>
        <p>{en ? 'Save and restore the release checklist across devices using Supabase Auth and row-level security. Local mode remains available.' : 'Simpan dan pulihkan checklist rilis lintas perangkat dengan Supabase Auth dan row-level security. Mode lokal tetap tersedia.'}</p>
      </div>
    </div>
    {!configured && <div className="control-plane-cloud-config">
      <p className="control-plane-integration-empty">{en ? 'Cloud sync is not configured on this deployment yet. No credentials are embedded in the source.' : 'Sinkronisasi cloud belum dikonfigurasi pada deployment ini. Tidak ada kredensial yang ditanam di source code.'}</p>
      <p className="control-plane-cloud-copy">{en ? 'Setup: create a Supabase project, apply the documented SQL migration, then configure these Vercel build variables:' : 'Penyiapan: buat proyek Supabase, jalankan migrasi SQL yang tersedia, lalu atur variabel build Vercel berikut:'}</p>
      <code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code>
      <p className="control-plane-cloud-copy"><a href="https://github.com/uknowdream/dreamex-tech/blob/main/docs/cloud-workspace-setup.md" target="_blank" rel="noreferrer">{en ? 'Open configuration and RLS guide' : 'Buka panduan konfigurasi dan RLS'} <ExternalLink size={12} /></a></p>
    </div>}
    {configured && !session && <>
      <div className="control-plane-cloud-grid">
        <label className="control-plane-cloud-field">{en ? 'Email' : 'Email'}<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label>
        <label className="control-plane-cloud-field">{en ? 'Password (10+ characters for sign-up)' : 'Kata sandi (10+ karakter untuk daftar)'}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} /></label>
      </div>
      <div className="control-plane-cloud-actions">
        <button type="button" className="control-plane-integration-button" onClick={() => void signIn()} disabled={busy || !email.trim() || !password}>{busy ? (en ? 'Please wait…' : 'Tunggu…') : (en ? 'Sign in' : 'Masuk')}</button>
        <button type="button" className="control-plane-integration-button" onClick={() => void signUp()} disabled={busy || !email.trim() || password.length < 10}>{en ? 'Create account' : 'Buat akun'}</button>
      </div>
    </>}
    {configured && session && <>
      <p className="control-plane-cloud-account">{en ? 'Signed in as ' : 'Masuk sebagai '}{session.user.email || session.user.id}</p>
      <div className="control-plane-cloud-actions">
        <button type="button" className="control-plane-integration-button" onClick={() => void save()} disabled={busy}><CheckCircle2 size={14} /> {en ? 'Save to cloud' : 'Simpan ke cloud'}</button>
        <button type="button" className="control-plane-integration-button" onClick={() => void restore()} disabled={busy}><Download size={14} /> {en ? 'Restore from cloud' : 'Pulihkan dari cloud'}</button>
        <button type="button" className="control-plane-integration-button" onClick={() => void signOut()} disabled={busy}>{en ? 'Sign out' : 'Keluar'}</button>
      </div>
    </>}
    {notice && <p className={'control-plane-cloud-notice' + (noticeIsError ? ' control-plane-cloud-danger' : '')} role="status">{notice}</p>}
    {configured && session && <section className="control-plane-team" aria-labelledby="control-plane-team-title">
      <div className="control-plane-integration-heading">
        <div>
          <span className="section-kicker">{en ? 'TEAM WORKSPACE / ROLE-BASED ACCESS' : 'WORKSPACE TIM / AKSES BERBASIS ROLE'}</span>
          <h3 id="control-plane-team-title">{en ? 'Shared team checklist' : 'Checklist bersama tim'}</h3>
          <p>{en ? 'Owners/admins manage membership, editors can save shared checklists, and viewers are read-only. Database row-level security is the authorization boundary.' : 'Owner/admin mengelola anggota, editor dapat menyimpan checklist bersama, dan viewer hanya membaca. Row-level security database menjadi batas otorisasi.'}</p>
        </div>
        <button type="button" className="control-plane-integration-button" onClick={() => void refreshTeams()} disabled={teamLoading}><RefreshCw size={13} /> {en ? 'Refresh teams' : 'Muat ulang tim'}</button>
      </div>
      <div className="control-plane-cloud-grid control-plane-team-create">
        <label className="control-plane-cloud-field">{en ? 'New team name' : 'Nama tim baru'}<input value={teamName} onChange={event => setTeamName(event.target.value)} maxLength={100} placeholder={en ? 'Platform Engineering' : 'Platform Engineering'} /></label>
        <button type="button" className="control-plane-integration-button" onClick={() => void createTeam()} disabled={teamLoading || teamName.trim().length < 2}>{en ? 'Create team' : 'Buat tim'}</button>
      </div>
      <div className="control-plane-cloud-grid control-plane-team-select">
        <label className="control-plane-cloud-field">{en ? 'Team' : 'Tim'}<select value={selectedTeamId} onChange={event => setSelectedTeamId(event.target.value)} disabled={!teams.length || teamLoading}><option value="">{en ? 'Select a team' : 'Pilih tim'}</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        {selectedTeam && <div className="control-plane-team-id"><span>{en ? 'Team ID (for reference)' : 'ID tim (referensi)'}</span><code>{selectedTeam.id}</code></div>}
      </div>
      {configured && session && teams.length === 0 && !teamLoading && <p className="control-plane-integration-empty">{en ? 'No teams found yet. Create a team to get the owner role.' : 'Belum ada tim. Buat tim untuk mendapatkan role owner.'}</p>}
      {selectedTeam && <>
        <div className="control-plane-team-roster-heading"><strong>{en ? 'Members' : 'Anggota'} ({members.length})</strong><span>{en ? 'Your role: ' : 'Role Anda: '}{currentMembership?.role ?? (teamLoading ? (en ? 'loading' : 'memuat') : (en ? 'not a member' : 'bukan anggota'))}</span></div>
        <ul className="control-plane-team-roster">
          {members.map(member => <li key={member.user_id} className="control-plane-team-member">
            <div className="control-plane-team-member-identity"><strong>{member.user_id === session.user.id ? (en ? 'You' : 'Anda') : (en ? 'Member UUID' : 'UUID anggota')}</strong><code>{member.user_id}</code></div>
            <span className={'control-plane-team-role is-' + member.role}>{member.role}</span>
            {canManageTeam && member.role !== 'owner' && <div className="control-plane-team-member-actions">
              <label className="control-plane-visually-hidden" htmlFor={'team-role-' + member.user_id}>{en ? 'Member role' : 'Role anggota'}</label>
              <select id={'team-role-' + member.user_id} value={member.role} disabled={teamLoading} onChange={event => void changeMemberRole(member.user_id, event.target.value as CloudTeamRole)}>
                <option value="admin">admin</option><option value="editor">editor</option><option value="viewer">viewer</option>
              </select>
              <button type="button" className="control-plane-integration-button" disabled={teamLoading} onClick={() => void removeMember(member.user_id)}>{en ? 'Remove' : 'Hapus'}</button>
            </div>}
          </li>)}
        </ul>
        {canManageTeam && <div className="control-plane-team-invite">
          <div className="control-plane-team-roster-heading"><strong>{en ? 'Add an existing Supabase user' : 'Tambahkan pengguna Supabase yang sudah terdaftar'}</strong></div>
          <p className="control-plane-cloud-copy">{en ? 'Ask the teammate to sign up first and share their user UUID. Your own user UUID is ' : 'Minta rekan mendaftar terlebih dahulu dan membagikan UUID pengguna. UUID akun Anda adalah '}<code>{session.user.id}</code>. {en ? 'Membership changes are authorized by database policy; a client cannot grant itself a role.' : 'Perubahan keanggotaan diotorisasi oleh kebijakan database; client tidak dapat menaikkan role sendiri.'}</p>
          <div className="control-plane-cloud-grid">
            <label className="control-plane-cloud-field">{en ? 'Teammate user UUID' : 'UUID pengguna rekan'}<input value={memberUserId} onChange={event => setMemberUserId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" /></label>
            <label className="control-plane-cloud-field">{en ? 'Role' : 'Role'}<select value={memberRole} onChange={event => setMemberRole(event.target.value as CloudTeamRole)}><option value="viewer">viewer — read only</option><option value="editor">editor — edit checklist</option><option value="admin">admin — manage members</option></select></label>
          </div>
          <div className="control-plane-cloud-actions"><button type="button" className="control-plane-integration-button" onClick={() => void addMember()} disabled={teamLoading || !/^[0-9a-f-]{36}$/i.test(memberUserId.trim())}>{en ? 'Add member' : 'Tambah anggota'}</button></div>
        </div>}
        <div className="control-plane-cloud-actions control-plane-team-actions">
          <button type="button" className="control-plane-integration-button" onClick={() => void saveTeamChecklist()} disabled={teamLoading || !canWriteTeam}><CheckCircle2 size={14} /> {en ? 'Save shared checklist' : 'Simpan checklist bersama'}</button>
          <button type="button" className="control-plane-integration-button" onClick={() => void restoreTeamChecklist()} disabled={teamLoading}><Download size={14} /> {en ? 'Restore team checklist' : 'Pulihkan checklist tim'}</button>
        </div>
        {!canWriteTeam && <p className="control-plane-integration-note">{en ? 'The selected team role is read-only. Ask an owner/admin for edit access.' : 'Role tim terpilih hanya dapat membaca. Minta akses edit dari owner/admin.'}</p>}
      </>}
      <p className="control-plane-integration-note">{en ? 'Team membership requires an existing authenticated user UUID. Owners cannot be removed or demoted through this UI; team deletion/ownership transfer remains an administrator operation.' : 'Keanggotaan tim memerlukan UUID pengguna yang sudah terautentikasi. Owner tidak dapat dihapus atau diturunkan melalui UI ini; penghapusan tim/perpindahan kepemilikan tetap merupakan operasi administrator.'}</p>
    </section>}
    <p className="control-plane-integration-note">{en ? 'Personal cloud snapshots are isolated per user. Cloud sync does not automatically migrate the local data of other tools.' : 'Snapshot cloud pribadi terisolasi per pengguna. Sinkronisasi cloud tidak otomatis memindahkan data lokal tool lain.'}</p>
  </section>
}


export function EngineeringControlPlanePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<CheckState>(readChecks)
  const [signals, setSignals] = useState<BrowserSignals>(getBrowserSignals)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try { window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checked)) } catch {
      setNotice(en ? 'Browser storage is unavailable; checklist changes may not persist.' : 'Penyimpanan browser tidak tersedia; perubahan checklist mungkin tidak tersimpan.')
    }
  }, [checked, en])

  useEffect(() => {
    const update = () => setSignals(getBrowserSignals())
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const filteredWorkflows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return workflows
    return workflows.filter(item => [item.title, item.description, item.category, item.keywords].join(' ').toLocaleLowerCase().includes(term))
  }, [query])
  const completed = checks.filter(item => checked[item.id]).length
  const readiness = Math.round(completed / checks.length * 100)

  const downloadSnapshot = () => {
    const snapshot = {
      format: 'dreamex-control-plane-snapshot',
      version: 1,
      exportedAt: new Date().toISOString(),
      checklist: checks.map(item => ({ ...item, complete: checked[item.id] === true })),
      browserSignals: signals,
      note: 'Browser-session signals and a user-maintained checklist only; this is not a live backend health report or release certification.',
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-control-plane-snapshot.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setNotice(en ? 'Control plane snapshot exported.' : 'Snapshot control plane berhasil diekspor.')
  }

  return <main id="main-content" className="container control-plane-page">
    <header className="control-plane-hero">
      <div className="control-plane-hero-copy">
        <span className="section-kicker"><Sparkles size={14} /> DREAMEX ENGINEERING / CONTROL PLANE</span>
        <h1>{en ? <>Engineering, <span>in control.</span></> : <>Engineering, <span>lebih terkendali.</span></>}</h1>
        <p>{en ? 'A single launchpad for architecture, quality, security, performance, and delivery workflows. Keep the signal honest, the evidence visible, and the next action clear.' : 'Satu pusat untuk workflow arsitektur, kualitas, keamanan, performa, dan delivery. Jaga indikator tetap akurat, bukti terlihat, dan langkah berikutnya jelas.'}</p>
        <div className="control-plane-actions">
          <Link className="button button-primary" to="/workspace">{en ? 'Explore all tools' : 'Jelajahi semua tools'} <ArrowRight size={16} /></Link>
          <button className="button button-secondary" type="button" onClick={downloadSnapshot}><Download size={15} /> {en ? 'Export snapshot' : 'Ekspor snapshot'}</button>
        </div>
      </div>
      <aside className="control-plane-score" aria-label={en ? 'Personal checklist progress' : 'Progres checklist pribadi'}>
        <span className="control-plane-score-label">{en ? 'RELEASE CHECKLIST' : 'CHECKLIST RILIS'}</span>
        <div className="control-plane-score-value"><strong>{readiness}%</strong><span>{en ? 'completed' : 'selesai'}</span></div>
        <div className="control-plane-progress" role="progressbar" aria-label={en ? 'Release checklist completion' : 'Penyelesaian checklist rilis'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness}><span style={{ width: readiness + '%' }} /></div>
        <p>{completed} / {checks.length} {en ? 'checks complete' : 'pemeriksaan selesai'}</p>
        <small>{en ? 'Personal checklist only — not a deployment status.' : 'Checklist pribadi — bukan status deployment.'}</small>
      </aside>
    </header>

    <section className="control-plane-signals" aria-label={en ? 'Browser session signals' : 'Sinyal sesi browser'}>
      <div className="control-plane-signal"><span className={signals.online ? 'signal-dot is-good' : 'signal-dot is-warn'} /><div><small>{en ? 'Network' : 'Jaringan'}</small><strong>{signals.online ? (en ? 'Browser online' : 'Browser online') : (en ? 'Browser offline' : 'Browser offline')}</strong></div></div>
      <div className="control-plane-signal"><span className={signals.secure ? 'signal-dot is-good' : 'signal-dot is-warn'} /><div><small>{en ? 'Context' : 'Konteks'}</small><strong>{signals.secure ? (en ? 'Secure context' : 'Konteks aman') : (en ? 'Non-secure context' : 'Konteks tidak aman')}</strong></div></div>
      <div className="control-plane-signal"><span className="signal-dot is-neutral" /><div><small>{en ? 'Viewport' : 'Viewport'}</small><strong>{signals.width} × {signals.height}</strong></div></div>
      <p>{en ? 'Signals describe this browser session only. They do not query Vercel, CI, APIs, or production services.' : 'Sinyal hanya menjelaskan sesi browser ini. Tidak mengakses Vercel, CI, API, atau layanan produksi.'}</p>
    </section>

    <section className="control-plane-workflows">
      <div className="control-plane-section-heading"><div><span className="section-kicker">{en ? 'ENGINEERING TOOLCHAIN' : 'TOOLCHAIN ENGINEERING'}</span><h2>{en ? 'Choose your next workflow' : 'Pilih workflow berikutnya'}</h2><p>{en ? 'Search across the core capabilities and jump straight into a focused tool.' : 'Cari kemampuan utama dan langsung buka tool yang dibutuhkan.'}</p></div><label className="control-plane-search"><Search size={17} /><input type="search" aria-label={en ? 'Search engineering workflows' : 'Cari workflow engineering'} placeholder={en ? 'Search tools and workflows…' : 'Cari tools dan workflow…'} value={query} onChange={event => setQuery(event.target.value)} /><kbd>/</kbd></label></div>
      <div className="control-plane-grid">{filteredWorkflows.map((item, index) => { const Icon = item.icon; return <Link key={item.id} to={item.route} className="control-plane-card"><div className="control-plane-card-top"><span className="control-plane-icon"><Icon size={19} /></span><span>{String(index + 1).padStart(2, '0')}</span></div><small>{item.category}</small><h3>{item.title}</h3><p>{item.description}</p><span className="control-plane-card-link">{en ? 'Open workflow' : 'Buka workflow'} <ArrowRight size={15} /></span></Link> })}</div>
      {filteredWorkflows.length === 0 && <p className="control-plane-empty">{en ? 'No workflows match that search. Try another keyword.' : 'Tidak ada workflow yang cocok. Coba kata kunci lain.'}</p>}
    </section>

    <LiveGitHubActions />
    <CloudChecklistSync checked={checked} onRestore={value => setChecked(value)} />

    <section className="control-plane-checklist">
      <div className="control-plane-section-heading"><div><span className="section-kicker">{en ? 'DELIVERY DISCIPLINE' : 'DISIPLIN DELIVERY'}</span><h2>{en ? 'Release readiness checklist' : 'Checklist kesiapan rilis'}</h2><p>{en ? 'A lightweight, editable checklist saved in this browser. Use it as a reminder, not as an automated quality gate.' : 'Checklist ringan yang bisa diedit dan disimpan di browser ini. Gunakan sebagai pengingat, bukan quality gate otomatis.'}</p></div><span className="control-plane-check-count"><CheckCircle2 size={16} /> {completed}/{checks.length}</span></div>
      <div className="control-plane-check-list">{checks.map(item => <label key={item.id} className={checked[item.id] ? 'control-plane-check is-checked' : 'control-plane-check'}><input type="checkbox" checked={checked[item.id] === true} onChange={event => setChecked(current => ({ ...current, [item.id]: event.target.checked }))} /><span className="control-plane-checkbox"><Check size={13} /></span><span className="control-plane-check-copy"><small>{item.group}</small><strong>{en ? item.title : ({ scope: 'Tentukan ruang lingkup dan kriteria penerimaan', contract: 'Tinjau kontrak API dan kompatibilitas', tests: 'Jalankan pengujian fungsional dan regresi', security: 'Tinjau dampak keamanan dan privasi', evidence: 'Catat bukti pengujian dan risiko tersisa', rollback: 'Pastikan pendekatan rollback dan pemulihan' }[item.id])}</strong></span></label>)}</div>
    </section>
    {notice && <p className="control-plane-notice" role="status">{notice}</p>}
    <p className="control-plane-disclaimer"><ShieldCheck size={15} /> {en ? 'Privacy-first by design: checklist data stays in this browser. Export creates a portable JSON snapshot; it does not upload project data.' : 'Privasi sejak awal: data checklist tersimpan di browser ini. Ekspor membuat snapshot JSON portabel dan tidak mengunggah data proyek.'}</p>
  </main>
}
