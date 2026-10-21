import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, Boxes, Check, CheckCircle2, ClipboardCheck, Clock3, Code2, Download, ExternalLink, Gauge, Github, Network, RefreshCw, Search, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useLanguage } from './i18n'
import { isWorkspaceCloudConfigured, loadControlPlaneChecklist, readWorkspaceCloudSession, saveControlPlaneChecklist, signInWorkspaceCloud, signOutWorkspaceCloud, signUpWorkspaceCloud, type CloudSession } from './workspace-cloud'

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
        const values = Array.isArray(payload.workflow_runs) ? payload.workflow_runs as GitHubWorkflowRun[] : []
        const valid = values.filter(run => Number.isInteger(run.id) && typeof run.name === 'string' && typeof run.html_url === 'string' && typeof run.status === 'string')
          .filter(run => run.html_url.startsWith('https://github.com/uknowdream/dreamex-tech/actions/runs/'))
          .slice(0, 8)
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
  const signOut = async () => {
    setBusy(true)
    try {
      await signOutWorkspaceCloud()
      setSession(null)
      setPassword('')
      setResult(en ? 'Signed out. Local checklist is unchanged.' : 'Berhasil keluar. Checklist lokal tidak berubah.')
    } catch (error) {
      setResult(error instanceof Error ? error.message : (en ? 'Could not finish sign-out.' : 'Gagal menyelesaikan proses keluar.'), true)
    } finally { setBusy(false) }
  }

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
    <p className="control-plane-integration-note">{en ? 'Cloud payloads are scoped per user. The migration also provides RLS-enforced team roles; team invitation UI and sync for other tools are not yet activated.' : 'Data cloud dibatasi per pengguna. Migrasi juga menyediakan role tim dengan RLS; UI undangan tim dan sinkronisasi tool lain belum diaktifkan.'}</p>
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
