import { useState, type FormEvent } from 'react'
import { Check, Copy, KeyRound, Sparkles, Wand2 } from 'lucide-react'
import { DEFAULT_MODELS, generateWithByokAi, loadSessionAiConfig, saveSessionAiConfig, type AiProviderId } from './aiClient'
import './engineering-page-system.css'
import './DashboardKit.css'

export type GaugeTone = 'emerald' | 'cyan' | 'amber' | 'rose'

const TONE_COLORS: Record<GaugeTone, string> = {
  emerald: '#c5ff70',
  cyan: '#38bdf8',
  amber: '#fbbf24',
  rose: '#fb7185',
}

export function SvgRingGauge({
  value,
  max = 100,
  label,
  sublabel,
  tone = 'emerald',
  size = 70,
  unit = '%',
}: {
  value: number
  max?: number
  label: string
  sublabel?: string
  tone?: GaugeTone
  size?: number
  unit?: string
}) {
  const safeMax = max > 0 ? max : 100
  const clamped = Math.max(0, Math.min(safeMax, Number.isFinite(value) ? value : 0))
  const ratio = clamped / safeMax
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - ratio)
  const displayValue = unit === '%' && safeMax === 100
    ? `${Math.round(clamped)}%`
    : `${Number.isInteger(clamped) ? clamped : clamped.toFixed(1)}${unit}`

  return (
    <div className="dx-ring-wrap" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${displayValue}${sublabel ? `, ${sublabel}` : ''}`}>
      <svg className="dx-ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="dx-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="dx-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={TONE_COLORS[tone]}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="dx-ring-center" aria-hidden="true">
        <strong>{displayValue}</strong>
        {sublabel && <small>{sublabel}</small>}
      </div>
    </div>
  )
}

export function SvgStackedBar({
  title,
  segments,
  totalLabel,
}: {
  title: string
  segments: Array<{ label: string; value: number; color: string }>
  totalLabel?: string
}) {
  const sum = segments.reduce((acc, item) => acc + Math.max(0, item.value), 0)
  return (
    <div className="dx-stacked-card">
      <div className="dx-stacked-head">
        <strong>{title}</strong>
        <span>{totalLabel ?? `${sum} total`}</span>
      </div>
      <div className="dx-stacked-track" role="img" aria-label={`${title}: ${segments.map(s => `${s.label} ${s.value}`).join(', ')}`}>
        {sum > 0 && segments.filter(s => s.value > 0).map(seg => (
          <span
            key={seg.label}
            className="dx-stacked-seg"
            style={{ width: `${(seg.value / sum) * 100}%`, background: seg.color }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <div className="dx-stacked-legend">
        {segments.map(seg => (
          <span key={seg.label} className="dx-stacked-legend-item">
            <span className="dx-stacked-swatch" style={{ background: seg.color }} aria-hidden="true" />
            <span>{seg.label}</span>
            <b>{seg.value}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

export function SvgSparkBars({
  title,
  meta,
  items,
}: {
  title: string
  meta?: string
  items: Array<{ label: string; value: number; tone?: GaugeTone; suffix?: string }>
}) {
  const maxVal = Math.max(1, ...items.map(item => Math.max(0, item.value)))
  return (
    <div className="dx-spark-card">
      <div className="dx-stacked-head">
        <strong>{title}</strong>
        {meta && <span>{meta}</span>}
      </div>
      <div className="dx-spark-grid" role="img" aria-label={`${title}: ${items.map(item => `${item.label} ${item.value}${item.suffix ?? ''}`).join(', ')}`}>
        {items.map(item => {
          const pct = Math.max(6, Math.round((Math.max(0, item.value) / maxVal) * 100))
          const color = TONE_COLORS[item.tone ?? 'cyan']
          return (
            <div key={item.label} className="dx-spark-col">
              <span className="dx-spark-val">{item.value}{item.suffix ?? ''}</span>
              <div className="dx-spark-bar-shell" aria-hidden="true">
                <div className="dx-spark-bar-fill" style={{ height: `${item.value <= 0 ? 4 : pct}%`, background: `linear-gradient(180deg, ${color}, rgba(56,189,248,0.28))` }} />
              </div>
              <span className="dx-spark-lbl">{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PipelineStageStrip({
  stages,
  ariaLabel,
}: {
  stages: Array<{ id: string; step: string; title: string; subtitle: string; complete: number; total: number }>
  ariaLabel?: string
}) {
  return (
    <div className="dx-pipeline-strip" role="region" aria-label={ariaLabel}>
      {stages.map(stage => {
        const pct = stage.total > 0 ? Math.round((stage.complete / stage.total) * 100) : 0
        const done = stage.total > 0 && stage.complete >= stage.total
        return (
          <article key={stage.id} className={done ? 'dx-pipeline-stage is-complete' : 'dx-pipeline-stage'}>
            <div className="dx-pipeline-stage-top">
              <span className="dx-pipeline-step">{stage.step}</span>
              <span className="dx-pipeline-ratio">{stage.complete}/{stage.total}</span>
            </div>
            <strong>{stage.title}</strong>
            <small>{stage.subtitle}</small>
            <div className="dx-pipeline-meter" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

export interface WorkspacePulseSummary {
  commandTasksOpen: number
  commandTasksActive: number
  commandIncidentsOpen: number
  controlPlaneDone: number
  controlPlaneTotal: number
  reliabilityIncidents: number
  qualityReportsCount: number
  sbomSnapshotsCount: number
  catalogServicesCount: number
  roadmapDoneCount: number
  hasSessionByok: boolean
}

function safeParseJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function readWorkspacePulse(): WorkspacePulseSummary {
  const command = safeParseJson<{ tasks?: Array<{ status?: string }>; incidents?: Array<{ status?: string }> }>('dreamex-command-center-v1', {})
  const tasks = Array.isArray(command.tasks) ? command.tasks : []
  const cmdIncidents = Array.isArray(command.incidents) ? command.incidents : []
  const checklist = safeParseJson<Record<string, unknown>>('dreamex-control-plane-checklist-v1', {})
  const relIncidents = safeParseJson<unknown[]>('dreamex-reliability-incidents-v1', [])
  const qiHistory = safeParseJson<unknown[]>('dreamex-quality-intelligence-history-v1', [])
  const scHistory = safeParseJson<unknown[]>('dreamex-supply-chain-history-v1', [])
  const catalog = safeParseJson<unknown[]>('dreamex-engineering-catalog-v1', [])
  const roadmap = safeParseJson<Record<string, unknown>>('dreamex-roadmap-v1', {})
  const byok = typeof window !== 'undefined' ? loadSessionAiConfig() : null

  return {
    commandTasksOpen: tasks.filter(t => t?.status !== 'done').length,
    commandTasksActive: tasks.filter(t => t?.status === 'active').length,
    commandIncidentsOpen: cmdIncidents.filter(i => i?.status !== 'resolved').length,
    controlPlaneDone: Object.values(checklist).filter(v => v === true).length,
    controlPlaneTotal: 6,
    reliabilityIncidents: Array.isArray(relIncidents) ? relIncidents.length : 0,
    qualityReportsCount: Array.isArray(qiHistory) ? qiHistory.length : 0,
    sbomSnapshotsCount: Array.isArray(scHistory) ? scHistory.length : 0,
    catalogServicesCount: Array.isArray(catalog) ? catalog.length : 3,
    roadmapDoneCount: Object.values(roadmap).filter(v => v === true).length,
    hasSessionByok: Boolean(byok?.apiKey?.trim()),
  }
}

export function AiCopilotPanel({
  title,
  kicker,
  summaryLines,
  recommendations,
  systemPrompt,
  userPrompt,
  en,
}: {
  title: string
  kicker?: string
  summaryLines: string[]
  recommendations: string[]
  systemPrompt: string
  userPrompt: string
  en: boolean
}) {
  const [byok, setByok] = useState(loadSessionAiConfig)
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [aiResult, setAiResult] = useState<{ text: string; model: string; latencyMs: number } | null>(null)
  const [aiError, setAiError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const markdown = [
      `# ${title}`,
      '',
      '## Telemetry Signals',
      ...summaryLines.map(line => `- ${line}`),
      '',
      '## Recommended Next Actions',
      ...recommendations.map(rec => `- ${rec}`),
      ...(aiResult ? ['', `## Live AI Synthesis (${aiResult.model})`, aiResult.text] : []),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setAiError(en ? 'Clipboard unavailable in this browser context.' : 'Clipboard tidak tersedia di konteks browser ini.')
    }
  }

  const runLiveAi = async () => {
    setAiError('')
    const current = loadSessionAiConfig()
    if (!current.apiKey.trim()) {
      setShowKeyForm(true)
      return
    }
    setBusy(true)
    try {
      const result = await generateWithByokAi(current, {
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 900,
      })
      setAiResult({ text: result.text, model: result.model, latencyMs: result.latencyMs })
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : (en ? 'Live AI synthesis failed.' : 'Sintesis AI gagal.'))
    } finally {
      setBusy(false)
    }
  }

  const saveKey = (event: FormEvent) => {
    event.preventDefault()
    saveSessionAiConfig(byok)
    setShowKeyForm(false)
    if (byok.apiKey.trim()) {
      void runLiveAi()
    }
  }

  return (
    <section className="dx-copilot-panel" aria-label={title}>
      <div className="dx-copilot-head">
        <div className="dx-copilot-title-wrap">
          <span className="dx-copilot-kicker"><Sparkles size={13} /> {kicker ?? (en ? 'AI CO-PILOT · LOCAL + BYOK SYNTHESIS' : 'KO-PILOT AI · ANALISIS LOKAL + BYOK')}</span>
          <h3>{title}</h3>
        </div>
        <div className="dx-copilot-actions">
          <button type="button" className="button button-secondary" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? (en ? 'Copied brief' : 'Brief disalin') : (en ? 'Copy brief' : 'Salin brief')}
          </button>
          <button type="button" className="button button-secondary" onClick={() => setShowKeyForm(prev => !prev)}>
            <KeyRound size={14} />
            {byok.apiKey.trim() ? (en ? 'Session key set' : 'Key sesi aktif') : (en ? 'BYOK key' : 'Atur key BYOK')}
          </button>
          <button type="button" className="button button-primary" disabled={busy} onClick={() => void runLiveAi()}>
            <Wand2 size={14} />
            {busy ? (en ? 'Synthesizing…' : 'Menyintesis…') : (en ? 'AI Deep Brief' : 'Brief AI Mendalam')}
          </button>
        </div>
      </div>

      {showKeyForm && (
        <form className="dx-copilot-byok-bar" onSubmit={saveKey}>
          <label>
            {en ? 'Provider' : 'Penyedia'}
            <select
              value={byok.provider}
              onChange={event => {
                const provider = event.target.value as AiProviderId
                setByok(curr => ({ ...curr, provider, model: DEFAULT_MODELS[provider][0] }))
              }}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI / Compatible</option>
            </select>
          </label>
          <label>
            {en ? 'Session API key (sessionStorage only)' : 'API key sesi (hanya sessionStorage)'}
            <input
              type="password"
              value={byok.apiKey}
              onChange={event => setByok(curr => ({ ...curr, apiKey: event.target.value }))}
              placeholder={byok.provider === 'gemini' ? 'AIza…' : 'sk-…'}
              autoComplete="off"
            />
          </label>
          <label>
            {en ? 'Model' : 'Model'}
            <input
              value={byok.model}
              onChange={event => setByok(curr => ({ ...curr, model: event.target.value }))}
              placeholder={DEFAULT_MODELS[byok.provider][0]}
            />
          </label>
          <button type="submit" className="button button-primary">
            {en ? 'Save & Run' : 'Simpan & Jalankan'}
          </button>
        </form>
      )}

      <div className="dx-copilot-grid">
        <div className="dx-copilot-box">
          <span>{en ? 'DETERMINISTIC SIGNALS' : 'SINYAL DETERMINISTIK'}</span>
          <ul>
            {summaryLines.map(line => <li key={line}>{line}</li>)}
          </ul>
        </div>
        <div className="dx-copilot-box">
          <span>{en ? 'RECOMMENDED NEXT ACTIONS' : 'REKOMENDASI TINDAK LANJUT'}</span>
          <ul>
            {recommendations.map(rec => <li key={rec}>{rec}</li>)}
          </ul>
        </div>
      </div>

      {aiError && <p className="dx-copilot-error" role="alert">{aiError}</p>}
      {aiResult && (
        <div className="dx-copilot-ai-output">
          <div className="dx-copilot-ai-meta">
            <span>{en ? 'LIVE BYOK AI BRIEF' : 'RINGKASAN AI BYOK LANGSUNG'} · {aiResult.model}</span>
            <span>{aiResult.latencyMs}ms</span>
          </div>
          <pre>{aiResult.text}</pre>
        </div>
      )}
    </section>
  )
}
