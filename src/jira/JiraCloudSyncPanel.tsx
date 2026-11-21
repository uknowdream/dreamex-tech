import { useEffect, useState } from 'react'
import { Cloud, Copy, Database, Github, KeyRound, Link2, Radio, RefreshCw, ShieldCheck, Webhook } from 'lucide-react'
import { DEFAULT_MODELS, loadSessionAiConfig, saveSessionAiConfig, type AiProviderId } from '../aiClient'
import type { JiraIssue } from '../JiraEnterpriseBoard'

interface JiraCloudSyncPanelProps {
  en: boolean
  activeProjectKey: string
  issuesCount: number
  broadcastPeers: number
  onGetSnapshot: () => unknown
  onApplyRemoteSnapshot: (snapshot: unknown) => void
  onImportGithubIssues: (imported: Array<{ title: string; body: string; labels: string[]; htmlUrl: string; number: number }>) => void
  onFlashNotice: (msg: string) => void
}

export function JiraCloudSyncPanel({
  en,
  activeProjectKey,
  issuesCount,
  broadcastPeers,
  onGetSnapshot,
  onApplyRemoteSnapshot,
  onImportGithubIssues,
  onFlashNotice,
}: JiraCloudSyncPanelProps) {
  const [roomCode, setRoomCode] = useState('dreamex-squad-24')
  const [cloudRev, setCloudRev] = useState(0)
  const [cloudStatus, setCloudStatus] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)
  const [activeDriver, setActiveDriver] = useState<string>('stateless-sovereign')

  useEffect(() => {
    let active = true
    fetch('/api/jira-sync', { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { activeDriver?: string } | null) => {
        if (active && d?.activeDriver) setActiveDriver(d.activeDriver)
      })
      .catch(() => {
        /* Safe local fallback */
      })
    return () => {
      active = false
    }
  }, [])

  // Live GitHub Issues Bridge
  const [repoInput, setRepoInput] = useState('uknowdream/dreamex-tech')
  const [ghBusy, setGhBusy] = useState(false)
  const [ghStatus, setGhStatus] = useState('')

  // Inline BYOK AI Session Key (sessionStorage only)
  const initialCfg = loadSessionAiConfig()
  const [provider, setProvider] = useState<AiProviderId>(initialCfg.provider)
  const [apiKey, setApiKey] = useState(initialCfg.apiKey)
  const [byokSaved, setByokSaved] = useState(Boolean(initialCfg.apiKey))

  const pushToCloudRoom = async () => {
    setCloudBusy(true)
    setCloudStatus('')
    try {
      const res = await fetch(`/api/jira-sync?room=${encodeURIComponent(roomCode.trim())}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ expectedRev: cloudRev, snapshot: onGetSnapshot() }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; rev?: number; currentRev?: number; message?: string; error?: string }
      if (res.ok && data.ok) {
        setCloudRev(Number(data.rev) || cloudRev + 1)
        setCloudStatus(en ? `Synced revision #${data.rev} to Cloud Room "${roomCode}".` : `Berhasil menyinkronkan revisi #${data.rev} ke Ruang Cloud "${roomCode}".`)
      } else if (res.status === 409) {
        setCloudRev(Number(data.currentRev) || cloudRev)
        setCloudStatus(en ? `Revision conflict (remote is #${data.currentRev}). Pull latest first.` : `Konflik revisi (server #${data.currentRev}). Tarik data terbaru dahulu.`)
      } else if (res.status === 503) {
        setCloudStatus(
          en
            ? 'Cloud Redis env vars are not yet configured in Vercel. Use "Copy Shareable Sync URL" below for instant cross-device sync!'
            : 'Variabel Redis belum dipasang di Vercel. Gunakan "Salin Tautan Sinkronisasi" di bawah untuk berbagi instan lintas perangkat!',
        )
      } else {
        setCloudStatus(data.message || data.error || `HTTP ${res.status}`)
      }
    } catch {
      setCloudStatus(en ? 'Network unavailable; local BroadcastChannel sync remains active.' : 'Jaringan tidak tersedia; sinkronisasi BroadcastChannel tetap aktif.')
    } finally {
      setCloudBusy(false)
    }
  }

  const pullFromCloudRoom = async () => {
    setCloudBusy(true)
    setCloudStatus('')
    try {
      const res = await fetch(`/api/jira-sync?room=${encodeURIComponent(roomCode.trim())}`, {
        headers: { Accept: 'application/json' },
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; found?: boolean; rev?: number; snapshot?: unknown; message?: string }
      if (res.ok && data.ok && data.found && data.snapshot) {
        onApplyRemoteSnapshot(data.snapshot)
        setCloudRev(Number(data.rev) || 1)
        setCloudStatus(en ? `Loaded revision #${data.rev} from Cloud Room "${roomCode}".` : `Memuat revisi #${data.rev} dari Ruang Cloud "${roomCode}".`)
      } else if (res.ok && data.ok && !data.found) {
        setCloudStatus(en ? `Room "${roomCode}" is empty. Click Push to initialize it.` : `Ruang "${roomCode}" masih kosong. Klik Push untuk menyimpan.`)
      } else {
        setCloudStatus(data.message || (en ? 'Cloud room unavailable; use Shareable Sync URL below.' : 'Ruang cloud belum aktif; gunakan Tautan Sinkronisasi.'))
      }
    } catch {
      setCloudStatus(en ? 'Unable to reach /api/jira-sync.' : 'Tidak dapat menghubungi /api/jira-sync.')
    } finally {
      setCloudBusy(false)
    }
  }

  const copyShareableSyncUrl = () => {
    try {
      const snap = onGetSnapshot() as { activeSprintName?: string; issues?: JiraIssue[] }
      const compact = {
        activeSprintName: snap.activeSprintName,
        issues: (snap.issues ?? []).slice(0, 12).map(i => ({
          id: i.id,
          key: i.key,
          title: i.title.slice(0, 90),
          type: i.type,
          status: i.status,
          priority: i.priority,
          points: i.points,
          assignee: i.assignee,
          epicKey: i.epicKey,
          sprintId: i.sprintId,
          dueDate: i.dueDate,
        })),
      }
      const bytes = new TextEncoder().encode(JSON.stringify(compact))
      let bin = ''
      bytes.forEach(b => {
        bin += String.fromCharCode(b)
      })
      const encoded = btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
      const url = `${window.location.origin}/jira?sync=${encoded}`
      void navigator.clipboard?.writeText(url)
      onFlashNotice(
        en
          ? 'Copied Shareable Multi-Device Board URL! Open on phone or teammate browser to hydrate this exact board.'
          : 'Tautan Sinkronisasi Lintas Perangkat disalin! Buka di HP atau browser rekan untuk memuat board ini.',
      )
    } catch {
      onFlashNotice(en ? 'Could not serialize board URL.' : 'Gagal membuat tautan board.')
    }
  }

  const importGithubRepoIssues = async () => {
    const cleanRepo = repoInput.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '')
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cleanRepo)) {
      setGhStatus(en ? 'Enter a valid owner/repo (e.g. uknowdream/dreamex-tech).' : 'Masukkan format owner/repo yang valid.')
      return
    }
    setGhBusy(true)
    setGhStatus('')
    try {
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}/issues?state=open&per_page=6`, {
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`)
      const items = (await res.json()) as Array<{
        number: number
        title: string
        body?: string | null
        html_url: string
        pull_request?: unknown
        labels?: Array<{ name?: string }>
      }>
      const realIssues = items.filter(i => !i.pull_request).slice(0, 5)
      if (!realIssues.length) {
        onImportGithubIssues([
          {
            number: 901,
            title: `[GitHub:${cleanRepo}] Audit production telemetry & CI matrix health`,
            body: `Imported from public repository https://github.com/${cleanRepo}`,
            labels: ['github-sync', 'ci-cd'],
            htmlUrl: `https://github.com/${cleanRepo}/issues`,
          },
        ])
        setGhStatus(
          en
            ? `Repository ${cleanRepo} has 0 open issues (all clean!) — added 1 synced governance check ticket to ${activeProjectKey}.`
            : `Repositori ${cleanRepo} memiliki 0 issue terbuka (bersih!) — menambahkan 1 tiket tata kelola ke ${activeProjectKey}.`,
        )
      } else {
        onImportGithubIssues(
          realIssues.map(i => ({
            number: i.number,
            title: `[GH#${i.number}] ${i.title}`,
            body: (i.body || '').slice(0, 260) || `Imported from ${i.html_url}`,
            labels: (i.labels || []).map(l => l.name || '').filter(Boolean),
            htmlUrl: i.html_url,
          })),
        )
        setGhStatus(
          en
            ? `Imported ${realIssues.length} live open GitHub issue(s) from ${cleanRepo} onto ${activeProjectKey} board!`
            : `Berhasil mengimpor ${realIssues.length} issue GitHub aktif dari ${cleanRepo} ke board ${activeProjectKey}!`,
        )
      }
    } catch {
      setGhStatus(en ? 'GitHub API rate-limited or unreachable right now.' : 'API GitHub sedang dibatasi atau tidak terjangkau.')
    } finally {
      setGhBusy(false)
    }
  }

  return (
    <div className="jira-backlog-stack" data-testid="jira-cloud-sync-panel">
      {/* Real-Time Multi-Device & Multi-Tab Collaboration */}
      <article className="jira-panel-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <span className="jira-kpi-label">
              <Cloud size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {en ? 'MULTI-DEVICE CLOUD SYNC & REAL-TIME BROADCAST' : 'SINKRONISASI CLOUD & REAL-TIME MULTI-TAB'}
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
              {en
                ? 'Sync Board Across Tabs, Mobile Devices & Team Redis Rooms'
                : 'Sinkronkan Board Lintas Tab, Perangkat Mobile & Ruang Cloud Tim'}
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span className="jira-kpi-badge" data-testid="jira-storage-driver-badge">
              <Database size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {en ? `Vercel Driver: ${activeDriver}` : `Driver Vercel: ${activeDriver}`}
            </span>
            <span className="jira-kpi-badge">
              <Radio size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {en ? `Live Tab Sync Active (${issuesCount} issues · ${broadcastPeers} syncs)` : `Live Tab Aktif (${issuesCount} tiket · ${broadcastPeers} sync)`}
            </span>
          </div>
        </div>

        <div className="jira-goal-compiler">
          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            placeholder="Room code (e.g. dreamex-squad-24)"
            aria-label={en ? 'Cloud sync room code' : 'Kode ruang sinkronisasi cloud'}
          />
          <button
            type="button"
            className="button button-primary"
            disabled={cloudBusy}
            onClick={() => void pushToCloudRoom()}
          >
            <Cloud size={14} /> {en ? 'Push Cloud Room' : 'Simpan ke Cloud'}
          </button>
          <button
            type="button"
            className="button button-ghost"
            disabled={cloudBusy}
            onClick={() => void pullFromCloudRoom()}
          >
            <RefreshCw size={14} /> {en ? 'Pull Cloud Room' : 'Tarik dari Cloud'}
          </button>
          <button
            type="button"
            className="button button-ghost"
            data-testid="jira-copy-share-url-btn"
            onClick={copyShareableSyncUrl}
          >
            <Link2 size={14} /> {en ? 'Copy Shareable Sync URL' : 'Salin Tautan Sinkronisasi'}
          </button>
        </div>
        {cloudStatus && (
          <div className="jira-kpi-sub" role="status">
            {cloudStatus}
          </div>
        )}
      </article>

      {/* Live 2-Way GitHub Issues Bridge */}
      <article className="jira-panel-card">
        <div>
          <span className="jira-kpi-label">
            <Github size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {en ? 'LIVE GITHUB ISSUES BRIDGE' : 'JEMBATAN LANGSUNG GITHUB ISSUES'}
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
            {en ? 'Import Live Public GitHub Issues Directly Into Sprint Board' : 'Impor Issue GitHub Publik Langsung ke Sprint Board'}
          </h2>
        </div>

        <div className="jira-goal-compiler">
          <input
            data-testid="jira-gh-repo-input"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="owner/repo (e.g. uknowdream/dreamex-tech)"
            aria-label="GitHub repository owner/repo"
          />
          <button
            type="button"
            className="button button-primary"
            data-testid="jira-gh-import-btn"
            disabled={ghBusy}
            onClick={() => void importGithubRepoIssues()}
          >
            <Github size={14} /> {ghBusy ? (en ? 'Importing…' : 'Mengimpor…') : en ? 'Import Live Issues' : 'Impor Issue GitHub'}
          </button>
        </div>
        {ghStatus && (
          <div className="jira-kpi-sub" role="status">
            {ghStatus}
          </div>
        )}
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid rgba(148, 163, 184, 0.16)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span className="jira-kpi-sub">
            <Webhook size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {en
              ? '2-Way GitHub Webhook (auto-moves DX-### cards on PR open/merge): '
              : 'Webhook GitHub 2-Arah (pindah tiket DX-### otomatis saat PR dibuka/merge): '}
            <code>https://dreamex.tech/api/github-webhook</code>
          </span>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              void navigator.clipboard?.writeText('https://dreamex.tech/api/github-webhook')
              onFlashNotice(
                en
                  ? 'Copied GitHub 2-Way Webhook URL! Add it in GitHub Repo -> Settings -> Webhooks.'
                  : 'URL Webhook GitHub 2-Arah disalin! Pasang di GitHub Repo -> Settings -> Webhooks.',
              )
            }}
          >
            <Copy size={13} /> {en ? 'Copy Webhook URL' : 'Salin URL Webhook'}
          </button>
        </div>
      </article>

      {/* Optional Live BYOK AI Session Connector */}
      <article className="jira-panel-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <span className="jira-kpi-label">
              <KeyRound size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {en ? 'LIVE LLM REASONING · SESSION-ONLY BYOK CONNECTOR' : 'KONEKTOR LLM LANGSUNG BYOK (KHUSUS SESI BROWSER)'}
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
              {en ? 'Upgrade Deterministic Autopilot to Live Gemini / OpenAI' : 'Tingkatkan AI Autopilot ke Inferensi Langsung Gemini / OpenAI'}
            </h2>
          </div>
          <span className="jira-kpi-badge">
            <ShieldCheck size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {byokSaved ? (en ? 'SESSION KEY READY' : 'KEY SESI AKTIF') : en ? 'DETERMINISTIC FREE MODE' : 'MODE DETERMINISTIK GRATIS'}
          </span>
        </div>

        <div className="jira-goal-compiler">
          <select
            className="jira-select"
            value={provider}
            onChange={e => setProvider(e.target.value as AiProviderId)}
            aria-label="BYOK AI Provider"
          >
            <option value="gemini">Google Gemini ({DEFAULT_MODELS.gemini[0]})</option>
            <option value="openai">OpenAI ({DEFAULT_MODELS.openai[0]})</option>
          </select>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={en ? 'Optional API key (stored strictly in sessionStorage, wiped on tab close)…' : 'API key opsional (hanya di sessionStorage)…'}
            aria-label="BYOK API key"
          />
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              saveSessionAiConfig({ provider, apiKey, model: DEFAULT_MODELS[provider][0] })
              setByokSaved(Boolean(apiKey.trim()))
              onFlashNotice(
                apiKey.trim()
                  ? en
                    ? `Saved ${provider.toUpperCase()} session key! AI Autopilot Deep Strategic Foresight now uses live LLM.`
                    : `Key sesi ${provider.toUpperCase()} tersimpan! Analisis Strategis AI kini memakai LLM langsung.`
                  : en
                    ? 'Cleared session key. Reverted to free deterministic AI mode.'
                    : 'Key sesi dihapus. Kembali ke mode AI deterministik gratis.',
              )
            }}
          >
            <Copy size={14} /> {en ? 'Save Session Key' : 'Simpan Key Sesi'}
          </button>
        </div>
      </article>
    </div>
  )
}
