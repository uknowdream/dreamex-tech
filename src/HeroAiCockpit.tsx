import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Copy, Cpu, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from './i18n'

type CockpitModeId = 'arch' | 'qa' | 'bpm'

interface CockpitMode {
  id: CockpitModeId
  labelEn: string
  labelId: string
  badgeEn: string
  badgeId: string
  image: string
  altEn: string
  altId: string
  href: string
  ctaEn: string
  ctaId: string
  metrics: Array<{ label: string; value: string }>
  linesEn: string[]
  linesId: string[]
}

const COCKPIT_MODES: Record<CockpitModeId, CockpitMode> = {
  arch: {
    id: 'arch',
    labelEn: '01 · Arch AI',
    labelId: '01 · Arsitek AI',
    badgeEn: 'USL SCALABILITY & CONTRACTS',
    badgeId: 'SKALABILITAS USL & KONTRAK',
    image: '/images/hero-neural-core.jpg',
    altEn: 'Quantum neural core visualization for AI systems architecture',
    altId: 'Visualisasi inti neural kuantum untuk arsitektur sistem AI',
    href: '/tools',
    ctaEn: 'Open 6-Pillar Workbench',
    ctaId: 'Buka Workbench 6-Pilar',
    metrics: [
      { label: 'CEILING', value: '34 Nodes' },
      { label: 'DB POOL', value: '34 Conn' },
      { label: 'LATENCY', value: '0.04 ms' },
    ],
    linesEn: [
      '▶ dreamex neural synthesize --mode=architect --usl',
      '✓ Pattern: Outbox + SHA-256 Idempotency + Circuit Guard',
      '✓ Universal Scalability: N_max = 34 Nodes (α=0.025, β=0.0008)',
      '✓ Runtime Zod Schema Verified · Zero Contract Drift',
    ],
    linesId: [
      '▶ dreamex neural synthesize --mode=arsitek --usl',
      '✓ Pola: Outbox + Idempotensi SHA-256 + Pemutus Sirkuit',
      '✓ Skalabilitas USL: N_max = 34 Node (α=0.025, β=0.0008)',
      '✓ Kontrak Zod Tervalidasi · Nol Penyimpangan Skema',
    ],
  },
  qa: {
    id: 'qa',
    labelEn: '02 · QA AI',
    labelId: '02 · QA Auto-Heal',
    badgeEn: 'SELF-HEALING PLAYWRIGHT & SQL',
    badgeId: 'PLAYWRIGHT AUTO-HEAL & SQL',
    image: '/images/cover-qa-automation.jpg',
    altEn: 'Precision laser calibration matrix for automated QA verification',
    altId: 'Matriks kalibrasi laser presisi untuk verifikasi QA otomatis',
    href: '/qa-studio',
    ctaEn: 'Launch QA Studio',
    ctaId: 'Buka Studio QA',
    metrics: [
      { label: 'SELECTOR', value: '99 / 100' },
      { label: 'ORPHANS', value: '0 Rows' },
      { label: 'UAT GATE', value: 'PASSED' },
    ],
    linesEn: [
      '▶ dreamex qa self-heal --playwright --sql-recon',
      '✓ Brittle CSS #btn_9x -> Healed to getByRole("button")',
      '✓ SQL Ledger Delta Check: orphan_rows === 0 && sum === 0',
      '✓ Zero-Flake Accessibility & Visual Gates Verified',
    ],
    linesId: [
      '▶ dreamex qa self-heal --playwright --sql-recon',
      '✓ Selektor rapuh #btn_9x -> Dipulihkan ke getByRole("button")',
      '✓ Cek Rekonsiliasi SQL: orphan_rows === 0 && delta === 0',
      '✓ Gerbang Aksesibilitas & Visual Lolos Tanpa Flake',
    ],
  },
  bpm: {
    id: 'bpm',
    labelEn: '03 · BA & Jira AI',
    labelId: '03 · BA & Jira AI',
    badgeEn: 'GHERKIN BDD · RTM · MONTE CARLO',
    badgeId: 'GHERKIN BDD · RTM · MONTE CARLO',
    image: '/images/cover-ba-pm-jira.jpg',
    altEn: 'Product telemetry and Monte Carlo sprint forecast interface',
    altId: 'Antarmuka telemetri produk dan peramalan sprint Monte Carlo',
    href: '/ba-hub',
    ctaEn: 'Open BA & Jira Hub',
    ctaId: 'Buka Hub BA & Jira',
    metrics: [
      { label: 'RTM LINK', value: '100%' },
      { label: 'P85 ETA', value: '4 Sprints' },
      { label: 'EVM SPI', value: '1.04 OK' },
    ],
    linesEn: [
      '▶ dreamex compile-brd --gherkin --jira-adf --trials=10000',
      '✓ Compiled: Maker-Checker Settlement (Given / When / Then)',
      '✓ Jira REST API v3 ADF + JQL Escalation Query Ready',
      '✓ 10,000-Trial Forecast: P50 = 3 Sprints · P85 = 4 Sprints',
    ],
    linesId: [
      '▶ dreamex compile-brd --gherkin --jira-adf --trials=10000',
      '✓ Tergenerasi: Skenario Maker-Checker (Given / When / Then)',
      '✓ Payload Jira REST v3 ADF + Query Eskalasi JQL Siap',
      '✓ Simulasi 10.000×: P50 = 3 Sprint · P85 Komitmen = 4 Sprint',
    ],
  },
}

export function HeroAiCockpit() {
  const { language, t } = useLanguage()
  const en = language === 'en'
  const [activeId, setActiveId] = useState<CockpitModeId>('arch')
  const [replaySeed, setReplaySeed] = useState(0)
  const [copied, setCopied] = useState(false)

  const mode = COCKPIT_MODES[activeId]
  const fullText = useMemo(() => (en ? mode.linesEn : mode.linesId).join('\n'), [en, mode])
  const [visibleChars, setVisibleChars] = useState(() => fullText.length)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || replaySeed === 0) {
      setVisibleChars(fullText.length)
      return
    }

    setVisibleChars(28)
    const timer = window.setInterval(() => {
      setVisibleChars(prev => {
        if (prev >= fullText.length) {
          window.clearInterval(timer)
          return prev
        }
        return Math.min(fullText.length, prev + 8)
      })
    }, 18)

    return () => window.clearInterval(timer)
  }, [fullText, replaySeed])

  const handleSelectMode = (nextId: CockpitModeId) => {
    setActiveId(nextId)
    setReplaySeed(s => s + 1)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const displayedText = fullText.slice(0, visibleChars)
  const isStreaming = visibleChars < fullText.length

  return (
    <div className="terminal hero-ai-cockpit" data-testid="hero-ai-cockpit">
      <div className="terminal-bar hero-cockpit-bar">
        <div className="terminal-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <small className="hero-cockpit-title">
          <Cpu size={13} /> DreamEx Neural Core · v3.0
        </small>
        <span className="terminal-live hero-cockpit-live">
          <i /> {t('terminalLive')}
        </span>
      </div>

      <div className="hero-cockpit-visual">
        <img
          src={mode.image}
          alt={en ? mode.altEn : mode.altId}
          width={640}
          height={360}
          loading="eager"
          decoding="async"
        />
        <div className="hero-cockpit-visual-scrim" aria-hidden="true" />
        <div className="hero-cockpit-hud">
          <span className="hero-cockpit-badge">
            <Sparkles size={11} /> {en ? mode.badgeEn : mode.badgeId}
          </span>
          <div className="hero-ai-wave" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div
        className="hero-cockpit-tabs"
        role="tablist"
        aria-label={en ? 'Select Hero AI engine mode' : 'Pilih mode mesin AI Hero'}
      >
        {(Object.keys(COCKPIT_MODES) as CockpitModeId[]).map(key => {
          const item = COCKPIT_MODES[key]
          const isActive = activeId === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? 'hero-cockpit-tab active' : 'hero-cockpit-tab'}
              onClick={() => handleSelectMode(key)}
            >
              {en ? item.labelEn : item.labelId}
            </button>
          )
        })}
      </div>

      <div className="terminal-content hero-cockpit-stream">
        <p className="hero-cockpit-subline">
          {en ? 'MODE' : 'MODE'}: {en ? mode.badgeEn : mode.badgeId} · 100% CLIENT SOVEREIGN
        </p>
        <pre className="hero-cockpit-output" data-testid="hero-cockpit-output">
          <code>
            {displayedText}
            {isStreaming && <span className="dx-typing-cursor" aria-hidden="true" />}
          </code>
        </pre>

        <div className="hero-cockpit-metrics">
          {mode.metrics.map(metric => (
            <div className="hero-cockpit-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="terminal-status hero-cockpit-footer">
        <div className="hero-cockpit-tools">
          <button
            type="button"
            className="hero-mini-btn"
            onClick={() => setReplaySeed(s => s + 1)}
            aria-label={en ? 'Replay AI stream' : 'Putar ulang stream AI'}
          >
            <Play size={11} /> {en ? 'Run' : 'Jalankan'}
          </button>
          <button
            type="button"
            className="hero-mini-btn"
            onClick={handleCopy}
            aria-label={en ? 'Copy AI cockpit output' : 'Salin output cockpit AI'}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? (en ? 'Copied' : 'Tersalin') : en ? 'Copy' : 'Salin'}
          </button>
        </div>

        <Link className="hero-cockpit-cta" to={mode.href}>
          <ShieldCheck size={12} />
          <span>{en ? mode.ctaEn : mode.ctaId}</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
