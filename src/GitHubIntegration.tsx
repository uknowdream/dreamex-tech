import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock3, ExternalLink, GitBranch, Github, RefreshCw, XCircle } from 'lucide-react'
import { useLanguage } from './i18n'
import './github-integration.css'

type WorkflowRun = {
  id: number
  name: string
  run_number: number
  event: string
  status: string
  conclusion: string | null
  head_branch: string
  head_sha: string
  updated_at: string
  html_url: string
}

type WorkflowPayload = { workflow_runs?: unknown[]; message?: string }
const RUNS_URL = 'https://api.github.com/repos/uknowdream/dreamex-tech/actions/runs?per_page=15'

function normalizeRun(value: unknown): WorkflowRun | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'number' || typeof item.name !== 'string' ||
      typeof item.run_number !== 'number' || typeof item.status !== 'string' ||
      typeof item.updated_at !== 'string') return null
  return {
    id: item.id,
    name: item.name,
    run_number: item.run_number,
    event: typeof item.event === 'string' ? item.event : 'unknown',
    status: item.status,
    conclusion: typeof item.conclusion === 'string' ? item.conclusion : null,
    head_branch: typeof item.head_branch === 'string' ? item.head_branch : 'unknown',
    head_sha: typeof item.head_sha === 'string' ? item.head_sha : '',
    updated_at: item.updated_at,
    html_url: 'https://github.com/uknowdream/dreamex-tech/actions/runs/' + String(item.id),
  }
}

function runState(run: WorkflowRun): 'running' | 'success' | 'failure' | 'other' {
  if (run.status !== 'completed') return 'running'
  if (run.conclusion === 'success') return 'success'
  if (['failure', 'timed_out', 'action_required'].includes(run.conclusion ?? '')) return 'failure'
  return 'other'
}

export function GitHubIntegrationPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'running' | 'success' | 'failure'>('all')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError('')
    try {
      const response = await fetch(RUNS_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: controller.signal,
      })
      const payload = await response.json() as WorkflowPayload
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new Error(en ? 'GitHub API rate limit reached. Wait a while, then refresh.' : 'Batas permintaan GitHub API tercapai. Tunggu sebentar, lalu muat ulang.')
        }
        throw new Error(en ? 'GitHub Actions data could not be loaded (HTTP ' + response.status + ').' : 'Data GitHub Actions tidak dapat dimuat (HTTP ' + response.status + ').')
      }
      if (!Array.isArray(payload.workflow_runs)) {
        throw new Error(en ? 'GitHub returned an unexpected workflow response.' : 'GitHub mengembalikan respons workflow yang tidak dikenali.')
      }
      setRuns(payload.workflow_runs.map(normalizeRun).filter((run): run is WorkflowRun => run !== null))
      setLastUpdated(new Date().toISOString())
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : (en ? 'An unexpected GitHub integration error occurred.' : 'Terjadi kesalahan integrasi GitHub yang tidak diketahui.'))
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setLoading(false)
      }
    }
  }, [en])

  useEffect(() => {
    void refresh()
    return () => controllerRef.current?.abort()
  }, [refresh])

  const counts = useMemo(() => runs.reduce((result, run) => {
    result.total += 1
    result[runState(run)] += 1
    return result
  }, { total: 0, running: 0, success: 0, failure: 0, other: 0 }), [runs])

  const visibleRuns = useMemo(() => runs.filter(run => filter === 'all' || runState(run) === filter), [filter, runs])
  const dateLabel = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(en ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return <main id="main-content" className="container github-ci-page">
    <header className="workspace-hero github-ci-hero">
      <span className="section-kicker"><Github size={14} /> GITHUB / CONTINUOUS INTEGRATION</span>
      <h1>{en ? <>See every build.<br /><span>Follow the evidence.</span></> : <>Pantau setiap build.<br /><span>Gunakan bukti nyata.</span></>}</h1>
      <p>{en ? 'Read-only activity from the public DreamEx Tech GitHub Actions history. Run details remain hosted by GitHub.' : 'Aktivitas read-only dari riwayat GitHub Actions publik DreamEx Tech. Detail setiap run tetap tersedia di GitHub.'}</p>
      <div className="github-ci-actions">
        <button type="button" className="button button-primary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'github-ci-spinning' : ''} /> {en ? 'Refresh runs' : 'Muat ulang run'}
        </button>
        <a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech/actions" target="_blank" rel="noreferrer">
          {en ? 'Open GitHub Actions' : 'Buka GitHub Actions'} <ExternalLink size={15} />
        </a>
      </div>
    </header>

    <section className="github-ci-summary" aria-label={en ? 'Workflow summary' : 'Ringkasan workflow'}>
      <article className="github-ci-stat"><span><Activity size={15} /> {en ? 'RECENT RUNS' : 'RUN TERBARU'}</span><strong>{counts.total}</strong><small>{en ? 'Latest 15, when available' : 'Maksimal 15 run terbaru'}</small></article>
      <article className="github-ci-stat"><span><CheckCircle2 size={15} /> {en ? 'SUCCEEDED' : 'BERHASIL'}</span><strong>{counts.success}</strong><small>{en ? 'Successful runs in this sample' : 'Run berhasil dalam data ini'}</small></article>
      <article className="github-ci-stat"><span><XCircle size={15} /> {en ? 'FAILED' : 'GAGAL'}</span><strong>{counts.failure}</strong><small>{en ? 'Failed or timed-out runs' : 'Run gagal atau timeout'}</small></article>
      <article className="github-ci-stat"><span><Clock3 size={15} /> {en ? 'IN PROGRESS' : 'BERJALAN'}</span><strong>{counts.running}</strong><small>{en ? 'Not yet completed' : 'Belum selesai'}</small></article>
    </section>

    <section className="github-ci-panel">
      <div className="github-ci-panel-head">
        <div><span className="section-kicker">{en ? 'SOURCE: GITHUB REST API' : 'SUMBER: GITHUB REST API'}</span><h2>{en ? 'Workflow activity' : 'Aktivitas workflow'}</h2></div>
        <label className="github-ci-filter"><span>{en ? 'Filter' : 'Filter'}</span><select aria-label={en ? 'Filter workflow status' : 'Filter status workflow'} value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
          <option value="all">{en ? 'All statuses' : 'Semua status'}</option>
          <option value="running">{en ? 'In progress' : 'Sedang berjalan'}</option>
          <option value="success">{en ? 'Succeeded' : 'Berhasil'}</option>
          <option value="failure">{en ? 'Failed' : 'Gagal'}</option>
        </select></label>
      </div>
      {lastUpdated && <p className="github-ci-updated" role="status">{en ? 'Last fetched: ' : 'Terakhir diambil: '}{dateLabel(lastUpdated)}</p>}
      {error && <div className="github-ci-notice github-ci-error" role="alert"><AlertTriangle size={18} /><div><strong>{en ? 'GitHub connection unavailable' : 'Koneksi GitHub belum tersedia'}</strong><p>{error}</p><small>{en ? 'This page uses public, unauthenticated API access and does not expose a repository token.' : 'Halaman ini menggunakan akses API publik tanpa autentikasi dan tidak mengekspos token repositori.'}</small></div></div>}
      {loading && runs.length === 0 && <div className="github-ci-empty" role="status">{en ? 'Loading public workflow runs…' : 'Memuat workflow run publik…'}</div>}
      {!loading && !error && visibleRuns.length === 0 && <div className="github-ci-empty">{en ? 'No runs match this filter in the latest fetched sample.' : 'Tidak ada run yang cocok dengan filter pada data terbaru yang diambil.'}</div>}
      {visibleRuns.length > 0 && <div className="github-ci-run-list">{visibleRuns.map(run => {
        const state = runState(run)
        const stateLabel = state === 'running' ? (en ? 'In progress' : 'Berjalan') : state === 'success' ? (en ? 'Succeeded' : 'Berhasil') : state === 'failure' ? (en ? 'Failed' : 'Gagal') : (run.conclusion ?? 'Completed')
        return <article className="github-ci-run" key={run.id}>
          <span className={'github-ci-state github-ci-state-' + state} aria-label={stateLabel}>{state === 'success' ? <CheckCircle2 size={17} /> : state === 'failure' ? <XCircle size={17} /> : state === 'running' ? <RefreshCw size={17} /> : <Activity size={17} />}</span>
          <div className="github-ci-run-main">
            <div className="github-ci-run-title"><strong>{run.name}</strong><span>#{run.run_number}</span></div>
            <div className="github-ci-run-meta"><span><GitBranch size={13} /> {run.head_branch}</span><span>{run.event}</span><span>{dateLabel(run.updated_at)}</span></div>
            {run.head_sha && <code>{run.head_sha.slice(0, 7)}</code>}
          </div>
          <div className="github-ci-run-end"><span className={'github-ci-status-pill github-ci-status-' + state}>{stateLabel}</span><a href={run.html_url} target="_blank" rel="noreferrer" aria-label={(en ? 'Open workflow run ' : 'Buka workflow run ') + String(run.run_number)}><ExternalLink size={16} /></a></div>
        </article>
      })}</div>}
      <p className="github-ci-footnote">{en ? 'This is a snapshot of recent public runs, not an SLA monitor. GitHub API rate limits and the repository visibility settings apply.' : 'Ini adalah cuplikan run publik terbaru, bukan pemantau SLA. Batas API GitHub dan pengaturan visibilitas repositori tetap berlaku.'}</p>
    </section>
  </main>
}
