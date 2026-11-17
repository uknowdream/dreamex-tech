import { useEffect, useState } from 'react'
import { ArrowRight, Pause, Play, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from './i18n'
import './GuidedProductTour.css'

interface TourStage {
  code: string
  shortEn: string
  shortId: string
  titleEn: string
  titleId: string
  descEn: string
  descId: string
  terminal: string
  route: string
  ctaEn: string
  ctaId: string
  metrics: Array<{ label: string; value: string }>
}

const TOUR_STAGES: TourStage[] = [
  {
    code: '01',
    shortEn: '01 · 5-Agent OS',
    shortId: '01 · 5-Agen AI',
    titleEn: 'Synthesize Live Interactive UI Prototypes with 5 Autonomous Agents',
    titleId: 'Sintesis Prototipe UI Interaktif Hidup dengan 5 Agen AI Otonom',
    descEn: 'Turn one system requirement into an interactive Desktop/Tablet/Mobile prototype with live Zero-Trust RBAC enforcement, Chaos Spike failover, Token ROI math, and 1-click 7-file .zip starter export.',
    descId: 'Ubah satu kebutuhan bisnis menjadi prototipe responsif Desktop/Tablet/Mobile lengkap dengan simulasi RBAC, uji Chaos Failover, kalkulator Token AI, dan unduhan proyek .zip siap produksi.',
    terminal: '▶ dreamex prototype --agents=5 --sandbox=live-ui --export=starter.zip\n✓ 01 BA -> 02 USL Arch -> 03 Spatial UI -> 04 Auto-QA -> 05 SRE\n✓ Exported: ADR + Gherkin + OpenAPI 3.1 + Zod + Playwright (.zip)',
    route: '/prototype',
    ctaEn: 'Open AI Prototype Studio',
    ctaId: 'Buka Studio Prototipe AI',
    metrics: [
      { label: 'AGENT DAG', value: '5 Stages' },
      { label: 'EXPORT PACK', value: '7-File .ZIP' },
      { label: 'PRIVACY', value: 'Client-Sovereign' },
    ],
  },
  {
    code: '02',
    shortEn: '02 · URL Grader',
    shortId: '02 · Audit URL',
    titleEn: 'Audit Any Public Website or Repo for AI Readiness & Zero-Trust Security',
    titleId: 'Audit Kesiapan AI & Keamanan Zero-Trust pada Website Publik',
    descEn: 'Scan any HTTPS domain for enforcing CSP, HSTS, /llms.txt AI discovery manifests, JSON-LD, and edge TTFB—then generate a live SVG shield badge for GitHub & LinkedIn.',
    descId: 'Pindai domain HTTPS untuk memeriksa header CSP, HSTS, manifes /llms.txt bagi agen AI, JSON-LD, dan latensi Edge—lalu bagikan sertifikat & lencana SVG ke LinkedIn atau GitHub.',
    terminal: '▶ dreamex grade https://dreamex.tech --verify-llms-txt --csp\n✓ Score: 99 / 100 (Grade A+) · CSP Enforced · /llms.txt Active\n✓ Badge Ready: https://dreamex.tech/api/badge?domain=dreamex.tech',
    route: '/grader',
    ctaEn: 'Launch AI & Security Grader',
    ctaId: 'Buka AI & Security Grader',
    metrics: [
      { label: 'AUDIT PILLARS', value: '5 Dimensions' },
      { label: 'VIRAL BADGE', value: 'Live SVG API' },
      { label: 'SSRF GUARD', value: 'DNS Verified' },
    ],
  },
  {
    code: '03',
    shortEn: '03 · USL & SE',
    shortId: '03 · USL & SE',
    titleEn: 'Model Distributed Scalability Limits & Strict Runtime Contracts',
    titleId: 'Hitung Batas Skalabilitas Terdistribusi USL & Kontrak Runtime',
    descEn: 'Compute Gunther Universal Scalability Law node ceilings (N_max), Little’s Law database connection pools, OpenAPI breaking-change diffs, and SHA-256 idempotency schemas.',
    descId: 'Hitung batas maksimum node klaster (USL N_max), ukuran pool database Little’s Law, analisis diff OpenAPI, dan skema idempotensi SHA-256.',
    terminal: '▶ dreamex workbench --pillar=se --usl --littles-law\n✓ Gunther USL Ceiling: N_max = 34 Nodes (α=0.025, β=0.0008)\n✓ Recommended DB Pool: 34 Connections / Node · Zero Retrograde',
    route: '/tools',
    ctaEn: 'Open 6-Pillar Workbench',
    ctaId: 'Buka Workbench 6-Pilar',
    metrics: [
      { label: 'ROLE PILLARS', value: '6 Integrated' },
      { label: 'LATENCY', value: '0.04 ms Local' },
      { label: 'CONTEXT BUS', value: 'Synced Across OS' },
    ],
  },
  {
    code: '04',
    shortEn: '04 · QA & BA',
    shortId: '04 · QA & BA',
    titleEn: 'Self-Healing Playwright Automation, Gherkin BDD & Bi-Directional RTM',
    titleId: 'Otomasi Playwright Self-Healing, Gherkin BDD & Matriks RTM',
    descEn: 'Compile business requirements directly into Gherkin scenarios, detect uncovered RTM requirement gaps, heal brittle CSS selectors to resilient ARIA roles, and analyze JUnit/Playwright telemetry.',
    descId: 'Kompilasi dokumen BRD menjadi skenario Gherkin, deteksi celah cakupan RTM, pulihkan selektor CSS rapuh ke ARIA role, dan analisis laporan JUnit/Playwright.',
    terminal: '▶ dreamex qa-ba --compile-gherkin --heal-selectors\n✓ Selector #submit_9x -> page.getByRole("button", { name: "Commit" })\n✓ RTM Traceability Coverage: 100% Linked · 0 Unverified Risks',
    route: '/ba-hub',
    ctaEn: 'Explore BA & QA Studio',
    ctaId: 'Jelajahi Studio BA & QA',
    metrics: [
      { label: 'RTM COVERAGE', value: '100% Linked' },
      { label: 'SELECTOR SCORE', value: '99 / 100' },
      { label: 'FLAKE CLUSTER', value: 'Automated' },
    ],
  },
  {
    code: '05',
    shortEn: '05 · Jira & MCP',
    shortId: '05 · Jira & MCP',
    titleEn: '10,000-Trial Monte Carlo Forecasting & Public IDE MCP Server',
    titleId: 'Simulasi Rilis Monte Carlo 10.000× & Server MCP Publik untuk IDE',
    descEn: 'Generate Jira REST API v3 ADF payloads, run statistical sprint commitments (P50/P85/P95), and connect Cursor, Claude Code, or Antigravity directly to https://dreamex.tech/api/mcp.',
    descId: 'Hasilkan JSON Jira REST API v3 ADF, jalankan simulasi probabilitas rilis (P50/P85/P95), dan hubungkan langsung AI IDE Anda ke https://dreamex.tech/api/mcp.',
    terminal: '▶ POST https://dreamex.tech/api/mcp {"method":"tools/list"}\n✓ Exposed Tools: calculate_usl · compile_gherkin · monte_carlo · token_roi\n✓ Ready for Antigravity, Cursor, Claude Code & VS Code',
    route: '/pm-jira-hub',
    ctaEn: 'Open PM, Jira & MCP Hub',
    ctaId: 'Buka Hub PM, Jira & MCP',
    metrics: [
      { label: 'MONTE CARLO', value: '10,000 Trials' },
      { label: 'MCP PROTOCOL', value: 'JSON-RPC 2.0' },
      { label: 'THEMES', value: 'Dark + Daylight' },
    ],
  },
]

export default function GuidedProductTour({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage()
  const en = language === 'en'
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setStep(prev => (prev + 1) % TOUR_STAGES.length)
      if (event.key === 'ArrowLeft') setStep(prev => (prev - 1 + TOUR_STAGES.length) % TOUR_STAGES.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!autoPlay) return
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const timer = window.setInterval(() => {
      setStep(prev => (prev + 1) % TOUR_STAGES.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [autoPlay])

  const active = TOUR_STAGES[step] ?? TOUR_STAGES[0]

  return (
    <div
      className="dx-tour-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dx-tour-heading"
      data-testid="guided-product-tour"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dx-tour-dialog">
        <div className="dx-tour-top">
          <span className="dx-tour-kicker">
            <Sparkles size={13} />
            {en ? `EXECUTIVE INTERACTIVE TOUR · STEP ${active.code}/05` : `TUR EKSEKUTIF INTERAKTIF · TAHAP ${active.code}/05`}
          </span>
          <button type="button" className="dx-tour-close" onClick={onClose} aria-label={en ? 'Close tour' : 'Tutup tur'}>
            <X size={16} />
          </button>
        </div>

        <div className="dx-tour-progress" role="tablist" aria-label={en ? 'Tour stages' : 'Tahapan tur'}>
          {TOUR_STAGES.map((item, idx) => (
            <button
              key={item.code}
              type="button"
              role="tab"
              aria-selected={idx === step}
              className={idx === step ? 'dx-tour-step-pill is-active' : 'dx-tour-step-pill'}
              onClick={() => {
                setStep(idx)
                setAutoPlay(false)
              }}
            >
              {en ? item.shortEn : item.shortId}
            </button>
          ))}
        </div>

        <div className="dx-tour-body">
          <h2 id="dx-tour-heading">{en ? active.titleEn : active.titleId}</h2>
          <p>{en ? active.descEn : active.descId}</p>
          <pre className="dx-tour-terminal">
            <code>{active.terminal}</code>
          </pre>

          <div className="dx-tour-highlights">
            {active.metrics.map(metric => (
              <div key={metric.label} className="dx-tour-metric">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dx-tour-footer">
          <div className="dx-tour-nav">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setAutoPlay(v => !v)}
            >
              {autoPlay ? <Pause size={14} /> : <Play size={14} />}
              {autoPlay ? (en ? 'Pause Auto-Play' : 'Jeda Otomatis') : en ? 'Resume Auto-Play' : 'Putar Otomatis'}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                setAutoPlay(false)
                setStep(prev => (prev + 1) % TOUR_STAGES.length)
              }}
            >
              {en ? 'Next Stage' : 'Tahap Berikutnya'} <ArrowRight size={14} />
            </button>
          </div>

          <button
            type="button"
            className="button button-primary"
            data-testid="tour-launch-stage"
            onClick={() => {
              onClose()
              navigate(active.route)
            }}
          >
            {en ? active.ctaEn : active.ctaId} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
