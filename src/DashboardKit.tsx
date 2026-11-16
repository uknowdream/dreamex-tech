import { useId, useRef, useState, type FormEvent } from 'react'
import { Check, Copy, KeyRound, Send, Sparkles, Square, Wand2 } from 'lucide-react'
import {
  DEFAULT_MODELS,
  generateWithByokAiStream,
  inspectEndpointTrust,
  loadSessionAiConfig,
  saveSessionAiConfig,
  type AiProviderId,
} from './aiClient'
import { useLanguage } from './i18n'
import { useTheme } from './themeUtils'
import './engineering-page-system.css'
import './DashboardKit.css'

export type GaugeTone = 'emerald' | 'cyan' | 'amber' | 'rose'

const DARK_TONE_COLORS: Record<GaugeTone, string> = {
  emerald: '#c5ff70',
  cyan: '#38bdf8',
  amber: '#fbbf24',
  rose: '#fb7185',
}

const LIGHT_TONE_COLORS: Record<GaugeTone, string> = {
  emerald: '#047857',
  cyan: '#0284c7',
  amber: '#b45309',
  rose: '#be123c',
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
  const { theme } = useTheme()
  const tonePalette = theme === 'light' ? LIGHT_TONE_COLORS : DARK_TONE_COLORS
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
          stroke={tonePalette[tone]}
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
  const { theme } = useTheme()
  const tonePalette = theme === 'light' ? LIGHT_TONE_COLORS : DARK_TONE_COLORS
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
          const color = tonePalette[item.tone ?? 'cyan']
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

export function SvgTrendArea({
  title,
  meta,
  points,
  tone = 'cyan',
}: {
  title: string
  meta?: string
  points: Array<{ label: string; value: number }>
  tone?: GaugeTone
}) {
  const { theme } = useTheme()
  const tonePalette = theme === 'light' ? LIGHT_TONE_COLORS : DARK_TONE_COLORS
  const gradId = useId()
  const safePoints = points.length >= 2 ? points : [{ label: 'T0', value: 0 }, { label: 'T1', value: 0 }]
  const width = 340
  const height = 104
  const padX = 12
  const padY = 14
  const max = Math.max(1, ...safePoints.map(p => p.value))
  const min = Math.min(0, ...safePoints.map(p => p.value))
  const span = Math.max(1, max - min)

  const coords = safePoints.map((pt, index) => {
    const x = padX + (index / (safePoints.length - 1)) * (width - padX * 2)
    const y = height - padY - ((pt.value - min) / span) * (height - padY * 2)
    return { x, y, ...pt }
  })
  const linePath = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - padY).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - padY).toFixed(1)} Z`
  const color = tonePalette[tone]

  return (
    <div className="dx-trend-card">
      <div className="dx-stacked-head">
        <strong>{title}</strong>
        {meta && <span>{meta}</span>}
      </div>
      <svg className="dx-trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${safePoints.map(p => `${p.label} ${p.value}`).join(', ')}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path className="dx-trend-line" d={linePath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(pt => (
          <circle key={pt.label} cx={pt.x} cy={pt.y} r="3.2" fill="var(--dx-dot-bg, #071021)" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="dx-trend-labels" aria-hidden="true">
        {safePoints.map(pt => <span key={pt.label}>{pt.label} <b>{pt.value}</b></span>)}
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

export function AiCopilotPanel({
  title,
  kicker,
  summaryLines,
  recommendations,
  systemPrompt,
  userPrompt,
  en: explicitEn,
}: {
  title: string
  kicker?: string
  summaryLines: string[]
  recommendations: string[]
  systemPrompt: string
  userPrompt: string
  en?: boolean
}) {
  const { language } = useLanguage()
  const en = explicitEn ?? language === 'en'
  const [byok, setByok] = useState(loadSessionAiConfig)
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const [aiResult, setAiResult] = useState<{ text: string; model: string; latencyMs: number; streamed?: boolean } | null>(null)
  const [aiError, setAiError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const endpointStatus = inspectEndpointTrust(byok.customEndpoint ?? '')

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

  const runLiveAi = async (customFollowUp?: string) => {
    setAiError('')
    const current = loadSessionAiConfig()
    const trust = inspectEndpointTrust(current.customEndpoint ?? '')
    const isLocalhost = trust.host === 'localhost' || trust.host === '127.0.0.1' || trust.host === '[::1]'
    if (!current.apiKey.trim() && !isLocalhost) {
      setShowKeyForm(true)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    const composedPrompt = customFollowUp?.trim()
      ? `${userPrompt}\n\nPrior AI brief:\n${aiResult?.text ?? '(none)'}\n\nFollow-up engineering question:\n${customFollowUp.trim()}`
      : userPrompt

    try {
      setAiResult({ text: '', model: current.model, latencyMs: 0, streamed: true })
      const result = await generateWithByokAiStream(
        current,
        { systemPrompt, userPrompt: composedPrompt, temperature: 0.3, maxTokens: 900 },
        accumulated => {
          setAiResult({ text: accumulated, model: current.model, latencyMs: 0, streamed: true })
        },
        controller.signal,
      )
      setAiResult({ text: result.text, model: result.model, latencyMs: result.latencyMs, streamed: result.streamed })
      if (customFollowUp?.trim()) setFollowUp('')
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : (en ? 'Live AI synthesis failed.' : 'Sintesis AI gagal.'))
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }

  const saveKey = (event: FormEvent) => {
    event.preventDefault()
    saveSessionAiConfig(byok)
    setShowKeyForm(false)
    if (byok.apiKey.trim() || byok.customEndpoint?.trim()) {
      void runLiveAi()
    }
  }

  return (
    <section className="dx-copilot-panel" aria-label={title}>
      <div className="dx-copilot-head">
        <div className="dx-copilot-title-wrap">
          <span className="dx-copilot-kicker"><Sparkles size={13} /> {kicker ?? (en ? 'AI CO-PILOT · LOCAL + BYOK SSE STREAMING' : 'KO-PILOT AI · ANALISIS LOKAL + STREAMING SSE BYOK')}</span>
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
          {busy ? (
            <button type="button" className="button button-secondary" onClick={() => abortRef.current?.abort()}>
              <Square size={14} /> {en ? 'Stop' : 'Hentikan'}
            </button>
          ) : (
            <button type="button" className="button button-primary" onClick={() => void runLiveAi()}>
              <Wand2 size={14} /> {en ? 'AI Deep Brief' : 'Brief AI Mendalam'}
            </button>
          )}
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
              <option value="gemini">Google Gemini (SSE)</option>
              <option value="openai">OpenAI / Compatible (SSE)</option>
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
          <label className="dx-copilot-endpoint-field">
            {en ? 'Optional endpoint (trusted HTTPS or localhost Ollama)' : 'Endpoint opsional (HTTPS tepercaya atau Ollama lokal)'}
            <input
              value={byok.customEndpoint ?? ''}
              onChange={event => setByok(curr => ({ ...curr, customEndpoint: event.target.value }))}
              placeholder="http://127.0.0.1:11434/v1/chat/completions"
            />
          </label>
          {!endpointStatus.trusted && endpointStatus.host && (
            <label className="dx-copilot-trust-check">
              <input
                type="checkbox"
                checked={Boolean(byok.allowUntrustedEndpoint)}
                onChange={event => setByok(curr => ({ ...curr, allowUntrustedEndpoint: event.target.checked }))}
              />
              <span>{en ? `Confirm sending session key to custom host "${endpointStatus.host}"` : `Konfirmasi pengiriman key sesi ke host "${endpointStatus.host}"`}</span>
            </label>
          )}
          <button type="submit" className="button button-primary">
            {en ? 'Save & Stream' : 'Simpan & Stream'}
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
            <span>{aiResult.streamed ? (en ? 'LIVE SSE STREAM' : 'STREAM SSE LANGSUNG') : (en ? 'LIVE BYOK AI BRIEF' : 'RINGKASAN AI BYOK')} · {aiResult.model}</span>
            <span>{busy ? (en ? 'Streaming…' : 'Mengalirkan…') : `${aiResult.latencyMs}ms`}</span>
          </div>
          <pre>{aiResult.text || (busy ? '▍' : '')}</pre>
          <form
            className="dx-copilot-followup"
            onSubmit={event => {
              event.preventDefault()
              if (followUp.trim() && !busy) void runLiveAi(followUp)
            }}
          >
            <input
              value={followUp}
              onChange={event => setFollowUp(event.target.value)}
              placeholder={en ? 'Ask a follow-up question about this telemetry…' : 'Ajukan pertanyaan lanjutan tentang telemetri ini…'}
              aria-label={en ? 'Follow-up AI prompt' : 'Pertanyaan lanjutan AI'}
            />
            <button type="submit" className="button button-secondary" disabled={busy || !followUp.trim()}>
              <Send size={13} /> {en ? 'Ask' : 'Tanya'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
