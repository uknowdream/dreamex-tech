import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Github,
  KeyRound,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useLanguage } from './i18n'
import { AiCopilotPanel, SvgRingGauge, SvgStackedBar } from './DashboardKit'
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

type PullRequestItem = {
  id: number
  number: number
  title: string
  state: string
  draft: boolean
  userLogin: string
  headRef: string
  baseRef: string
  updatedAt: string
  htmlUrl: string
}

type WorkflowPayload = { workflow_runs?: unknown[]; message?: string }
const RUNS_URL = 'https://api.github.com/repos/uknowdream/dreamex-tech/actions/runs?per_page=15'
const PULLS_URL = 'https://api.github.com/repos/uknowdream/dreamex-tech/pulls?state=all&per_page=10'
const PAT_SESSION_KEY = 'dreamex-github-pat-session-v1'

function loadSessionPat(): string {
  try {
    return window.sessionStorage.getItem(PAT_SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}

function normalizeRun(value: unknown): WorkflowRun | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (
    typeof item.id !== 'number' ||
    typeof item.name !== 'string' ||
    typeof item.run_number !== 'number' ||
    typeof item.status !== 'string' ||
    typeof item.updated_at !== 'string'
  ) {
    return null
  }
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

function normalizePull(value: unknown): PullRequestItem | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'number' || typeof item.number !== 'number' || typeof item.title !== 'string') {
    return null
  }
  const user = (item.user as Record<string, unknown> | undefined)?.login
  const headRef = (item.head as Record<string, unknown> | undefined)?.ref
  const baseRef = (item.base as Record<string, unknown> | undefined)?.ref
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    state: typeof item.state === 'string' ? item.state : 'open',
    draft: Boolean(item.draft),
    userLogin: typeof user === 'string' ? user : 'contributor',
    headRef: typeof headRef === 'string' ? headRef : 'branch',
    baseRef: typeof baseRef === 'string' ? baseRef : 'main',
    updatedAt: typeof item.updated_at === 'string' ? item.updated_at : '',
    htmlUrl: 'https://github.com/uknowdream/dreamex-tech/pull/' + String(item.number),
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
  const [pulls, setPulls] = useState<PullRequestItem[]>([])
  const [activeView, setActiveView] = useState<'runs' | 'pulls'>('runs')
  const [showAuth, setShowAuth] = useState(false)
  const [patInput, setPatInput] = useState(loadSessionPat)
  const [loading, setLoading] = useState(true)
  const [pullsLoading, setPullsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'running' | 'success' | 'failure'>('all')
  const [error, setError] = useState('')
  const [pullsError, setPullsError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const controllerRef = useRef<AbortController | null>(null)

  const buildHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    const cleanPat = patInput.trim()
    if (cleanPat) {
      headers.Authorization = `Bearer ${cleanPat}`
    }
    return headers
  }, [patInput])

  const savePat = (nextVal: string) => {
    setPatInput(nextVal)
    try {
      const clean = nextVal.trim()
      if (!clean) window.sessionStorage.removeItem(PAT_SESSION_KEY)
      else window.sessionStorage.setItem(PAT_SESSION_KEY, clean)
    } catch {
      /* Ignore session storage errors */
    }
  }

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
        headers: buildHeaders(),
        signal: controller.signal,
      })
      const payload = (await response.json()) as WorkflowPayload
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new Error(en ? 'GitHub API rate limit reached. Wait a while, or configure an optional session PAT.' : 'Batas permintaan GitHub API tercapai. Tunggu sebentar, atau gunakan PAT sesi opsional.')
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
      setError(cause instanceof Error ? cause.message : en ? 'An unexpected GitHub integration error occurred.' : 'Terjadi kesalahan integrasi GitHub yang tidak diketahui.')
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setLoading(false)
      }
    }
  }, [buildHeaders, en])

  const loadPulls = useCallback(async () => {
    setPullsLoading(true)
    setPullsError('')
    try {
      const response = await fetch(PULLS_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: buildHeaders(),
      })
      const payload = (await response.json()) as unknown
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new Error(en ? 'GitHub API rate limit reached while fetching pull requests.' : 'Batas permintaan GitHub API tercapai saat mengambil pull request.')
        }
        throw new Error(en ? 'Pull request list failed (HTTP ' + response.status + ').' : 'Daftar pull request gagal dimuat (HTTP ' + response.status + ').')
      }
      if (!Array.isArray(payload)) {
        throw new Error(en ? 'Unexpected GitHub pull requests response.' : 'Respons pull request GitHub tidak dikenali.')
      }
      setPulls(payload.map(normalizePull).filter((item): item is PullRequestItem => item !== null))
    } catch (cause) {
      setPullsError(cause instanceof Error ? cause.message : en ? 'Could not load pull requests.' : 'Gagal memuat pull request.')
    } finally {
      setPullsLoading(false)
    }
  }, [buildHeaders, en])

  useEffect(() => {
    void refresh()
    return () => controllerRef.current?.abort()
  }, [refresh])

  const counts = useMemo(
    () =>
      runs.reduce(
        (result, run) => {
          result.total += 1
          result[runState(run)] += 1
          return result
        },
        { total: 0, running: 0, success: 0, failure: 0, other: 0 },
      ),
    [runs],
  )

  const visibleRuns = useMemo(() => runs.filter(run => filter === 'all' || runState(run) === filter), [filter, runs])
  const dateLabel = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(en ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <main id="main-content" className="container github-ci-page">
      <header className="workspace-hero github-ci-hero">
        <span className="section-kicker">
          <Github size={14} /> GITHUB / CONTINUOUS INTEGRATION
        </span>
        <h1>
          {en ? (
            <>
              See every build.
              <br />
              <span>Follow the evidence.</span>
            </>
          ) : (
            <>
              Pantau setiap build.
              <br />
              <span>Gunakan bukti nyata.</span>
            </>
          )}
        </h1>
        <p>
          {en
            ? 'Read-only workflow runs and pull request activity from DreamEx Tech. Works publicly or with an optional ephemeral session token for higher rate limits.'
            : 'Aktivitas workflow run dan pull request dari repositori DreamEx Tech. Bekerja publik atau dengan token sesi opsional untuk batas API lebih tinggi.'}
        </p>
        <div className="github-ci-actions">
          <button type="button" className="button button-primary" onClick={() => void (activeView === 'runs' ? refresh() : loadPulls())} disabled={loading || pullsLoading}>
            <RefreshCw size={15} className={loading || pullsLoading ? 'github-ci-spinning' : ''} /> {en ? 'Refresh runs' : 'Muat ulang run'}
          </button>
          <button
            type="button"
            className="button button-ghost"
            aria-expanded={showAuth}
            onClick={() => setShowAuth(open => !open)}
          >
            <KeyRound size={15} /> {patInput.trim() ? (en ? 'Session Token Active' : 'Token Sesi Aktif') : en ? 'Optional GitHub Token' : 'Token GitHub Opsional'}
          </button>
          <a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech/actions" target="_blank" rel="noreferrer">
            {en ? 'Open GitHub Actions' : 'Buka GitHub Actions'} <ExternalLink size={15} />
          </a>
        </div>

        {showAuth && (
          <div className="github-ci-auth-drawer">
            <label className="team-workspace-field">
              <span>{en ? 'Ephemeral GitHub PAT (stored in sessionStorage only — cleared when tab closes)' : 'GitHub PAT Sementara (hanya disimpan di sessionStorage)'}</span>
              <input
                type="password"
                value={patInput}
                onChange={e => savePat(e.target.value)}
                placeholder="github_pat_..."
                autoComplete="off"
              />
            </label>
            <button type="button" className="button button-secondary" onClick={() => savePat('')}>
              {en ? 'Clear token' : 'Hapus token'}
            </button>
          </div>
        )}
      </header>

      <section className="github-ci-summary" aria-label={en ? 'Workflow summary' : 'Ringkasan workflow'}>
        <article className="github-ci-stat">
          <span>
            <Activity size={15} /> {en ? 'RECENT RUNS' : 'RUN TERBARU'}
          </span>
          <strong>{counts.total}</strong>
          <small>{en ? 'Latest 15, when available' : 'Maksimal 15 run terbaru'}</small>
        </article>
        <article className="github-ci-stat">
          <span>
            <CheckCircle2 size={15} /> {en ? 'SUCCEEDED' : 'BERHASIL'}
          </span>
          <strong>{counts.success}</strong>
          <small>{en ? 'Successful runs in this sample' : 'Run berhasil dalam data ini'}</small>
        </article>
        <article className="github-ci-stat">
          <span>
            <XCircle size={15} /> {en ? 'FAILED' : 'GAGAL'}
          </span>
          <strong>{counts.failure}</strong>
          <small>{en ? 'Failed or timed-out runs' : 'Run gagal atau timeout'}</small>
        </article>
        <article className="github-ci-stat">
          <span>
            <Clock3 size={15} /> {en ? 'IN PROGRESS' : 'BERJALAN'}
          </span>
          <strong>{counts.running}</strong>
          <small>{en ? 'Not yet completed' : 'Belum selesai'}</small>
        </article>
      </section>

      {counts.total > 0 && (
        <div className="dx-split-grid">
          <div className="dx-kpi-card">
            <div className="dx-kpi-copy">
              <span className="dx-kpi-label">{en ? 'SAMPLE CI PASS RATE' : 'PASS RATE SAMPEL CI'}</span>
              <strong className="dx-kpi-value">{Math.round((counts.success / Math.max(1, counts.success + counts.failure)) * 100)}%</strong>
              <span className="dx-kpi-sub">{en ? `${counts.success} passed · ${counts.failure} failed · ${counts.running} running` : `${counts.success} lulus · ${counts.failure} gagal · ${counts.running} berjalan`}</span>
            </div>
            <SvgRingGauge
              value={Math.round((counts.success / Math.max(1, counts.success + counts.failure)) * 100)}
              label={en ? 'CI workflow pass rate gauge' : 'Indikator pass rate workflow CI'}
              tone={counts.failure > 0 ? 'amber' : 'emerald'}
              size={64}
            />
          </div>
          <SvgStackedBar
            title={en ? 'Workflow Run Outcomes' : 'Distribusi Hasil Workflow Run'}
            totalLabel={`${counts.total} ${en ? 'runs' : 'run'}`}
            segments={[
              { label: en ? 'Succeeded' : 'Berhasil', value: counts.success, color: '#c5ff70' },
              { label: en ? 'Running' : 'Berjalan', value: counts.running, color: '#38bdf8' },
              { label: en ? 'Failed' : 'Gagal', value: counts.failure, color: '#fb7185' },
            ]}
          />
        </div>
      )}

      <div className="github-ci-view-tabs" role="tablist" aria-label={en ? 'GitHub views' : 'Tampilan GitHub'}>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'runs'}
          className={activeView === 'runs' ? 'active' : ''}
          onClick={() => setActiveView('runs')}
        >
          <Activity size={14} /> {en ? 'Workflow Runs' : 'Workflow Run'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'pulls'}
          className={activeView === 'pulls' ? 'active' : ''}
          onClick={() => {
            setActiveView('pulls')
            if (pulls.length === 0 && !pullsLoading) void loadPulls()
          }}
        >
          <GitPullRequest size={14} /> {en ? 'Pull Requests' : 'Pull Request'}
        </button>
      </div>

      {activeView === 'runs' ? (
        <section className="github-ci-panel">
          <div className="github-ci-panel-head">
            <div>
              <span className="section-kicker">{en ? 'SOURCE: GITHUB REST API' : 'SUMBER: GITHUB REST API'}</span>
              <h2>{en ? 'Workflow activity' : 'Aktivitas workflow'}</h2>
            </div>
            <label className="github-ci-filter">
              <span>{en ? 'Filter' : 'Filter'}</span>
              <select aria-label={en ? 'Filter workflow status' : 'Filter status workflow'} value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
                <option value="all">{en ? 'All statuses' : 'Semua status'}</option>
                <option value="running">{en ? 'In progress' : 'Sedang berjalan'}</option>
                <option value="success">{en ? 'Succeeded' : 'Berhasil'}</option>
                <option value="failure">{en ? 'Failed' : 'Gagal'}</option>
              </select>
            </label>
          </div>
          {lastUpdated && (
            <p className="github-ci-updated" role="status">
              {en ? 'Last fetched: ' : 'Terakhir diambil: '}
              {dateLabel(lastUpdated)}
            </p>
          )}
          {error && (
            <div className="github-ci-notice github-ci-error" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>{en ? 'GitHub connection unavailable' : 'Koneksi GitHub belum tersedia'}</strong>
                <p>{error}</p>
                <small>{en ? 'Public unauthenticated requests have lower rate limits; add an optional session PAT above if needed.' : 'Permintaan publik tanpa token memiliki batas lebih rendah; tambahkan PAT sesi opsional jika diperlukan.'}</small>
              </div>
            </div>
          )}
          {loading && runs.length === 0 && (
            <div className="github-ci-empty" role="status">
              {en ? 'Loading public workflow runs…' : 'Memuat workflow run publik…'}
            </div>
          )}
          {!loading && !error && visibleRuns.length === 0 && (
            <div className="github-ci-empty">{en ? 'No runs match this filter in the latest fetched sample.' : 'Tidak ada run yang cocok dengan filter pada data terbaru yang diambil.'}</div>
          )}
          {visibleRuns.length > 0 && (
            <div className="github-ci-run-list">
              {visibleRuns.map(run => {
                const state = runState(run)
                const stateLabel = state === 'running' ? (en ? 'In progress' : 'Berjalan') : state === 'success' ? (en ? 'Succeeded' : 'Berhasil') : state === 'failure' ? (en ? 'Failed' : 'Gagal') : run.conclusion ?? 'Completed'
                return (
                  <article className="github-ci-run" key={run.id}>
                    <span className={'github-ci-state github-ci-state-' + state} aria-label={stateLabel}>
                      {state === 'success' ? <CheckCircle2 size={17} /> : state === 'failure' ? <XCircle size={17} /> : state === 'running' ? <RefreshCw size={17} /> : <Activity size={17} />}
                    </span>
                    <div className="github-ci-run-main">
                      <div className="github-ci-run-title">
                        <strong>{run.name}</strong>
                        <span>#{run.run_number}</span>
                      </div>
                      <div className="github-ci-run-meta">
                        <span>
                          <GitBranch size={13} /> {run.head_branch}
                        </span>
                        <span>{run.event}</span>
                        <span>{dateLabel(run.updated_at)}</span>
                      </div>
                      {run.head_sha && <code>{run.head_sha.slice(0, 7)}</code>}
                    </div>
                    <div className="github-ci-run-end">
                      <span className={'github-ci-status-pill github-ci-status-' + state}>{stateLabel}</span>
                      <a href={run.html_url} target="_blank" rel="noreferrer" aria-label={(en ? 'Open workflow run ' : 'Buka workflow run ') + String(run.run_number)}>
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <p className="github-ci-footnote">{en ? 'This is a snapshot of recent public runs, not an SLA monitor. GitHub API rate limits and repository visibility settings apply.' : 'Ini adalah cuplikan run publik terbaru, bukan pemantau SLA. Batas API GitHub dan pengaturan visibilitas repositori tetap berlaku.'}</p>
        </section>
      ) : (
        <section className="github-ci-panel">
          <div className="github-ci-panel-head">
            <div>
              <span className="section-kicker">{en ? 'SOURCE: GITHUB PULL REQUESTS' : 'SUMBER: PULL REQUEST GITHUB'}</span>
              <h2>{en ? 'Pull request history' : 'Riwayat pull request'}</h2>
            </div>
            <button type="button" className="button button-secondary" onClick={() => void loadPulls()} disabled={pullsLoading}>
              <RefreshCw size={14} /> {en ? 'Reload PRs' : 'Muat ulang PR'}
            </button>
          </div>
          {pullsError && (
            <div className="github-ci-notice github-ci-error" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>{en ? 'Could not fetch pull requests' : 'Gagal mengambil pull request'}</strong>
                <p>{pullsError}</p>
              </div>
            </div>
          )}
          {pullsLoading && <div className="github-ci-empty">{en ? 'Loading pull requests…' : 'Memuat daftar pull request…'}</div>}
          {!pullsLoading && !pullsError && pulls.length === 0 && (
            <div className="github-ci-empty">{en ? 'No pull requests found in the latest sample.' : 'Belum ada pull request dalam sampel terbaru.'}</div>
          )}
          {pulls.length > 0 && (
            <div className="github-ci-run-list">
              {pulls.map(pr => (
                <article className="github-ci-run" key={pr.id}>
                  <span className={'github-ci-state ' + (pr.state === 'open' ? 'github-ci-state-running' : 'github-ci-state-success')}>
                    <GitPullRequest size={17} />
                  </span>
                  <div className="github-ci-run-main">
                    <div className="github-ci-run-title">
                      <strong>{pr.title}</strong>
                      <span>#{pr.number}</span>
                    </div>
                    <div className="github-ci-run-meta">
                      <span>@{pr.userLogin}</span>
                      <span>
                        <GitBranch size={13} /> {pr.headRef} → {pr.baseRef}
                      </span>
                      {pr.updatedAt && <span>{dateLabel(pr.updatedAt)}</span>}
                    </div>
                  </div>
                  <div className="github-ci-run-end">
                    <span className={'github-ci-status-pill ' + (pr.state === 'open' ? 'github-ci-status-running' : 'github-ci-status-success')}>
                      {pr.draft ? 'Draft' : pr.state}
                    </span>
                    <a href={pr.htmlUrl} target="_blank" rel="noreferrer" aria-label={`Open pull request #${pr.number}`}>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <AiCopilotPanel
        kicker={en ? 'GITHUB CI CO-PILOT' : 'KO-PILOT GITHUB CI'}
        title={en ? 'Build & PR Readiness Brief' : 'Ringkasan Kesiapan Build & PR'}
        summaryLines={[
          en ? `Latest sample: ${counts.total} workflow runs (${counts.success} succeeded, ${counts.failure} failed, ${counts.running} in progress).` : `Sampel terbaru: ${counts.total} workflow run (${counts.success} berhasil, ${counts.failure} gagal, ${counts.running} berjalan).`,
          en ? `Pull requests fetched: ${pulls.length} total (${pulls.filter(p => p.state === 'open').length} open).` : `Pull request diambil: ${pulls.length} total (${pulls.filter(p => p.state === 'open').length} terbuka).`,
        ]}
        recommendations={[
          ...(counts.failure > 0 ? [en ? `Inspect ${counts.failure} failing workflow run(s) in the activity log or on GitHub Actions.` : `Periksa ${counts.failure} workflow run yang gagal di daftar aktivitas atau GitHub Actions.`] : [en ? 'No failed runs in the latest fetched sample.' : 'Tidak ada run yang gagal dalam sampel terbaru ini.']),
          en ? 'Use session-only PAT only if unauthenticated GitHub REST API rate limits are reached.' : 'Gunakan PAT sesi opsional hanya jika limit REST API publik tercapai.',
        ]}
        systemPrompt="You are a CI/CD reliability engineer. Summarize build & PR status cleanly from recent workflow runs without inventing logs not shown."
        userPrompt={`Workflows sampled=${counts.total} (success=${counts.success}, failure=${counts.failure}, running=${counts.running}). Open PRs=${pulls.filter(p => p.state === 'open').length}. Latest runs: ${runs.slice(0, 4).map(r => `${r.name}#${r.run_number}:${runState(r)}`).join(', ') || 'none'}. Give 3 focused recommendations.`}
        en={en}
      />
    </main>
  )
}
