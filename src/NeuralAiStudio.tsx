import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Maximize2, Play, Sparkles, Terminal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from './i18n'
import { HoloMotionFx } from './HoloMotionFx'
import './NeuralAiStudio.css'

type AiRolePreset = 'architect' | 'qa' | 'ba' | 'pm'

const ROLE_BLUEPRINTS: Record<
  AiRolePreset,
  {
    labelEn: string
    labelId: string
    command: string
    defaultPromptEn: string
    defaultPromptId: string
    output: (promptText: string, en: boolean) => string
  }
> = {
  architect: {
    labelEn: 'AI System Architect',
    labelId: 'Arsitek Sistem AI',
    command: 'dreamex synthesize --role=architect --usl-physics',
    defaultPromptEn: 'High-throughput idempotent payment webhook gateway with LLM anomaly detection',
    defaultPromptId: 'Gateway webhook pembayaran idempoten berkecepatan tinggi dengan deteksi anomali AI',
    output: (input, en) =>
      [
        `# ${en ? 'ARCHITECTURAL SYNTHESIS' : 'SINTESIS ARSITEKTUR'} :: "${input.slice(0, 68)}"`,
        `> PATTERN: Outbox + Idempotency-Key (SHA-256) + Adaptive Circuit Breaker`,
        `> SCALABILITY PHYSICS (USL α=0.025, β=0.0008): Optimal Ceiling = 34 Nodes`,
        `> LITTLE'S LAW POOLING (λ=1,800 req/s, W=14ms): 34 DB Connections (35% Burst Buffer)`,
        ``,
        `// TypeScript Runtime Contract Guard`,
        `export const WebhookSchema = z.object({`,
        `  idempotencyKey: z.string().uuid(),`,
        `  amountMinor: z.number().int().positive(),`,
        `  riskConfidence: z.number().min(0).max(1),`,
        `});`,
      ].join('\n'),
  },
  qa: {
    labelEn: 'QA & Self-Healing AI',
    labelId: 'QA & Self-Healing AI',
    command: 'dreamex qa-matrix --playwright --sql-recon',
    defaultPromptEn: 'Verify ledger reconciliation & prevent duplicate UI settlement submission',
    defaultPromptId: 'Validasi rekonsiliasi buku besar & cegah klik ganda pengiriman settlement UI',
    output: (input, en) =>
      [
        `# ${en ? 'AUTONOMOUS QA & PLAYWRIGHT MATRIX' : 'MATRIKS QA & PLAYWRIGHT OTOMATIS'}`,
        `> TARGET: "${input.slice(0, 64)}"`,
        `> SELECTOR SCORE R_sel: 98/100 (Resilient Role + TestId Locator)`,
        `await expect(page.getByRole('button', { name: /Submit/i })).toBeEnabled();`,
        ``,
        `-- Post-Deploy UAT SQL Migration Recon Check --`,
        `SELECT COUNT(*) AS orphan_rows FROM target_ledger t`,
        `LEFT JOIN source_ledger s ON s.tx_id = t.tx_id WHERE s.tx_id IS NULL;`,
        `-- Gate Condition: orphan_rows === 0 && SUM(delta) === 0`,
      ].join('\n'),
  },
  ba: {
    labelEn: 'Business Analyst Studio',
    labelId: 'Studio Business Analyst',
    command: 'dreamex compile-brd --gherkin --rtm',
    defaultPromptEn: 'As a Finance Lead, approve high-value settlement transfers with maker-checker',
    defaultPromptId: 'Sebagai Finance Lead, setujui transfer settlement bernilai tinggi dengan maker-checker',
    output: (input, en) =>
      [
        `# ${en ? 'GHERKIN BDD SPECIFICATION & RTM TRACE' : 'SPESIFIKASI GHERKIN BDD & RANTAI RTM'}`,
        `Feature: ${input.slice(0, 62)}`,
        `  Rule: Dual-control verification required above $50,000 threshold`,
        `  Scenario Outline: Verified Maker-Checker Settlement`,
        `    Given an authenticated "Maker" initiates settlement of <amount>`,
        `    When a separate "Checker" signs the approval payload under 200ms P95`,
        `    Then status transitions cleanly to "SETTLED" with 100% RTM trace`,
      ].join('\n'),
  },
  pm: {
    labelEn: 'PM & Jira Neural Engine',
    labelId: 'PM & Mesin Jira Neural',
    command: 'dreamex jira-adf --monte-carlo=10000',
    defaultPromptEn: 'P0 UAT blocker: race condition during concurrent retry Settlement Webhook',
    defaultPromptId: 'Blocker UAT P0: race condition saat retry bersamaan Webhook Settlement',
    output: (input, en) =>
      [
        `# ${en ? 'JIRA REST API v3 (ADF) + MONTE CARLO P85 FORECAST' : 'JIRA REST API v3 (ADF) + RAMALAN MONTE CARLO P85'}`,
        `{ "fields": { "project": { "key": "ENT" }, "issuetype": { "name": "Bug" },`,
        `  "priority": { "name": "Highest" }, "labels": ["UAT-Blocker", "P0"],`,
        `  "summary": "${input.slice(0, 64)}" } }`,
        `> MONTE CARLO (M=10,000 TRIALS): P50 = 4 Sprints | P85 Commitment = 5 Sprints`,
        `> SLA RESPONSE: Escalate & Hotfix within 2h | EVM Health: SPI 1.04 · CPI 1.02`,
      ].join('\n'),
  },
}

type GalleryCategory = 'all' | 'ai' | 'qa' | 'arch'

const GALLERY_ITEMS: Array<{
  id: string
  category: Exclude<GalleryCategory, 'all'>
  image: string
  badgeEn: string
  badgeId: string
  titleEn: string
  titleId: string
  descEn: string
  descId: string
  altEn: string
  altId: string
  href: string
  ctaEn: string
  ctaId: string
}> = [
  {
    id: 'neural-core',
    category: 'ai',
    image: '/images/hero-neural-core.jpg',
    badgeEn: 'NEURAL CORE · 01',
    badgeId: 'INTI NEURAL · 01',
    titleEn: 'Quantum Neural Observability Architecture',
    titleId: 'Arsitektur Observabilitas Neural Kuantum',
    descEn: 'Real-time evaluation pipelines, deterministic schema guardrails, and telemetry orchestration for production AI.',
    descId: 'Pipeline evaluasi real-time, pagar skema deterministik, dan orkestrasi telemetri untuk AI produksi.',
    altEn: 'Luminous quantum neural orb framed inside dark obsidian glass concentric orbital rings with cyan and violet light trails.',
    altId: 'Bola neural kuantum bercahaya di dalam cincin orbit kaca obsidian gelap dengan jejak cahaya sian dan ungu.',
    href: '/tools',
    ctaEn: 'Launch 6-Pillar Workbench',
    ctaId: 'Buka Workbench 6-Pilar',
  },
  {
    id: 'ai-eval-prisms',
    category: 'ai',
    image: '/images/cover-ai-eval.jpg',
    badgeEn: 'AI EVALUATION · 02',
    badgeId: 'EVALUASI AI · 02',
    titleEn: 'Multi-Spectral LLM Benchmark & Evaluation Matrix',
    titleId: 'Matriks Evaluasi & Benchmark LLM Multispektral',
    descEn: 'Compare prompt revisions against regression baselines, hallucination checks, and strict latency budgets.',
    descId: 'Bandingkan revisi prompt terhadap baseline regresi, pemeriksaan halusinasi, dan budget latensi.',
    altEn: 'Obsidian glass prisms refracting laser-sharp cyan, violet, and lime neural wave spectra over dark slate.',
    altId: 'Prisma kaca obsidian membiaskan spektrum gelombang neural sian, ungu, dan limau tajam di atas batu tulis gelap.',
    href: '/blog/evaluating-ai-features',
    ctaEn: 'Read Evaluation Blueprint',
    ctaId: 'Baca Panduan Evaluasi',
  },
  {
    id: 'qa-matrix',
    category: 'qa',
    image: '/images/cover-qa-automation.jpg',
    badgeEn: 'QA & UAT STUDIO · 03',
    badgeId: 'STUDIO QA & UAT · 03',
    titleEn: 'Self-Healing Playwright & SQL UAT Reconciliation',
    titleId: 'Playwright Self-Healing & Rekonsiliasi SQL UAT',
    descEn: 'Score fragile CSS selectors quantitatively, auto-heal to ARIA roles, and validate source-to-target migrations.',
    descId: 'Skor ketahanan selektor CSS secara objektif, perbaiki otomatis ke role ARIA, dan validasi migrasi data SQL.',
    altEn: 'Dark titanium cybernetic matrix aligned with glowing emerald green and cyan precision calibration laser beams.',
    altId: 'Matriks sibernetika titanium gelap yang selaras dengan sinar laser kalibrasi presisi hijau zamrud dan sian.',
    href: '/qa-studio',
    ctaEn: 'Open QA Automation Studio',
    ctaId: 'Buka Studio Otomasi QA',
  },
  {
    id: 'distributed-arch',
    category: 'arch',
    image: '/images/cover-software-arch.jpg',
    badgeEn: 'SCALABILITY PHYSICS · 04',
    badgeId: 'FISIKA SKALABILITAS · 04',
    titleEn: 'OpenAPI Fuzzing & Universal Scalability Modeling',
    titleId: 'Fuzzing OpenAPI & Pemodelan Skalabilitas Universal',
    descEn: 'Calculate horizontal node ceilings N_max with Universal Scalability Law and optimal DB pools with Little’s Law.',
    descId: 'Hitung batas optimal node horizontal N_max dengan USL serta ukuran pool DB optimal menggunakan Hukum Little.',
    altEn: 'Isometric crystalline distributed cloud compute nodes linked by amber and cyan fiber-optic light bridges.',
    altId: 'Node komputasi awan terdistribusi kristalin isometrik yang dihubungkan jembatan cahaya serat optik amber dan sian.',
    href: '/api-playground',
    ctaEn: 'Explore API Playground',
    ctaId: 'Jelajahi API Playground',
  },
  {
    id: 'ba-pm-jira',
    category: 'arch',
    image: '/images/cover-ba-pm-jira.jpg',
    badgeEn: 'BA · PM · JIRA · 05',
    badgeId: 'BA · PM · JIRA · 05',
    titleEn: 'Gherkin BDD, RTM Traceability & Monte Carlo P85',
    titleId: 'Gherkin BDD, Matriks RTM & Simulasi Monte Carlo P85',
    descEn: 'Compile requirements into Gherkin, track bi-directional RTM coverage, and forecast sprints via 10,000 trials.',
    descId: 'Kompilasi kebutuhan ke Gherkin, lacak cakupan RTM dua arah, dan ramalkan sprint via 10.000 simulasi Monte Carlo.',
    altEn: 'Floating translucent dark glass product dashboards with violet, amber, and cyan probability distribution waves.',
    altId: 'Panel produk kaca gelap transparan melayang dengan gelombang distribusi probabilitas ungu, amber, dan sian.',
    href: '/ba-hub',
    ctaEn: 'Open BA & PM Studios',
    ctaId: 'Buka Studio BA & PM',
  },
  {
    id: 'sovereign-factory',
    category: 'qa',
    image: '/images/showcase-datacenter-ai.jpg',
    badgeEn: 'ZERO-TRUST INFRA · 06',
    badgeId: 'INFRA ZERO-TRUST · 06',
    titleEn: 'Sovereign Zero-Trust AI Engineering Command Center',
    titleId: 'Pusat Kendali Rekayasa AI Zero-Trust Mandiri',
    descEn: 'Inspect CycloneDX SBOM supply chains, ephemeral OIDC CI gates, and client-sovereign zero-leak workflows.',
    descId: 'Periksa rantai pasok SBOM CycloneDX, gerbang CI OIDC sementara, dan alur kerja browser bebas kebocoran data.',
    altEn: 'Panoramic dark futuristic AI engineering command center atrium with navy glass monoliths and cyan floor rim lights.',
    altId: 'Panorama atrium pusat kendali rekayasa AI futuristik gelap dengan monolit kaca biru tua dan lampu lantai sian.',
    href: '/supply-chain-intelligence',
    ctaEn: 'Inspect Security & SBOM',
    ctaId: 'Periksa Keamanan & SBOM',
  },
]

const MARQUEE_ROW_1 = [
  { color: '#10b981', text: '01 / SE & ARCHITECT · UNIVERSAL SCALABILITY LAW (USL)' },
  { color: '#06b6d4', text: '02 / QA AUTOMATION · PLAYWRIGHT AUTO-HEALER & SQL RECON' },
  { color: '#8b5cf6', text: '03 / BUSINESS ANALYST · GHERKIN BDD & BI-DIRECTIONAL RTM' },
  { color: '#f59e0b', text: '04 / JIRA NEURAL ENGINE · REST API v3 ADF + JQL STUDIO' },
  { color: '#38bdf8', text: '05 / PM OBSERVATORY · 10,000-TRIAL MONTE CARLO P85 + EVM' },
  { color: '#f43f5e', text: '06 / DEVSECOPS · ZERO-TRUST CYCLONEDX SBOM & OIDC GATES' },
]

const MARQUEE_ROW_2 = [
  { color: '#c5ff70', text: '100% CLIENT-SOVEREIGN · 0.04ms LATENCY' },
  { color: '#38bdf8', text: 'OPENAPI 3.1 CONTRACT & BOUNDARY FUZZING' },
  { color: '#a78bfa', text: 'LITTLE’S LAW CONNECTION POOL CALCULATOR' },
  { color: '#10b981', text: 'AUTOMATED UAT GO-LIVE SIGN-OFF CERTIFICATES' },
  { color: '#f59e0b', text: 'RISK-WEIGHTED SLA TRIAGE MATRIX (P0–P3)' },
  { color: '#c5ff70', text: 'BILINGUAL EN / ID ENGINEERING KNOWLEDGE LOG' },
]

export function NeuralAiStudio() {
  const { language } = useLanguage()
  const en = language === 'en'

  const [rolePreset, setRolePreset] = useState<AiRolePreset>('architect')
  const [promptInput, setPromptInput] = useState('')
  const [replaySeed, setReplaySeed] = useState(0)
  const [streamedLength, setStreamedLength] = useState(0)
  const [copiedOutput, setCopiedOutput] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState<GalleryCategory>('all')
  const [lightboxItem, setLightboxItem] = useState<(typeof GALLERY_ITEMS)[number] | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentRole = ROLE_BLUEPRINTS[rolePreset]
  const effectivePrompt = promptInput.trim() || (en ? currentRole.defaultPromptEn : currentRole.defaultPromptId)
  const fullOutput = useMemo(() => currentRole.output(effectivePrompt, en), [currentRole, effectivePrompt, en])

  // Stream typewriter simulation only on user replay / tab switch (avoids boot-frame churn)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || replaySeed === 0) {
      setStreamedLength(fullOutput.length)
      return
    }
    setStreamedLength(24)
    let timer = 0
    let count = 24
    const step = () => {
      count = Math.min(fullOutput.length, count + Math.max(14, Math.ceil(fullOutput.length / 20)))
      setStreamedLength(count)
      if (count < fullOutput.length) {
        timer = window.setTimeout(step, 16)
      }
    }
    timer = window.setTimeout(step, 16)
    return () => window.clearTimeout(timer)
  }, [fullOutput, replaySeed])

  // Interactive neural particle constellation canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    let inViewport = false
    let width = (canvas.width = canvas.offsetWidth || 460)
    let height = (canvas.height = canvas.offsetHeight || 400)

    const onResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth || 460
      height = canvas.height = canvas.offsetHeight || 400
    }
    window.addEventListener('resize', onResize, { passive: true })

    const nodes = Array.from({ length: 20 }, (_, idx) => ({
      x: ((idx * 97) % 100) * 0.01 * width,
      y: ((idx * 53) % 100) * 0.01 * height,
      vx: ((idx % 5) - 2) * 0.28 + 0.14,
      vy: ((idx % 3) - 1) * 0.24 - 0.1,
      r: idx % 4 === 0 ? 3.1 : 2.2,
      color: idx % 3 === 0 ? 'rgba(56, 189, 248, 0.9)' : idx % 3 === 1 ? 'rgba(197, 255, 112, 0.86)' : 'rgba(167, 139, 250, 0.9)',
      bloom: idx % 3 === 0 ? 'rgba(56, 189, 248, 0.16)' : idx % 3 === 1 ? 'rgba(197, 255, 112, 0.16)' : 'rgba(167, 139, 250, 0.16)',
    }))

    let phase = 0
    const draw = (scheduleNext: boolean) => {
      phase += 0.025
      ctx.clearRect(0, 0, width, height)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        a.x += a.vx
        a.y += a.vy
        if (a.x < 8 || a.x > width - 8) a.vx *= -1
        if (a.y < 8 || a.y > height - 8) a.vy *= -1

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < 142) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(139, 220, 255, ${(1 - dist / 142) * 0.34})`
            ctx.lineWidth = 1.05
            ctx.stroke()

            if ((i + j) % 6 === 0) {
              const t = (phase * 0.8 + i * 0.19) % 1
              const px = a.x + (b.x - a.x) * t
              const py = a.y + (b.y - a.y) * t
              ctx.beginPath()
              ctx.arc(px, py, 2.2, 0, Math.PI * 2)
              ctx.fillStyle = j % 2 === 0 ? 'rgba(197, 255, 112, 0.95)' : 'rgba(56, 189, 248, 0.95)'
              ctx.fill()
            }
          }
        }

        if (a.r > 2.6) {
          ctx.beginPath()
          ctx.arc(a.x, a.y, 8, 0, Math.PI * 2)
          ctx.fillStyle = a.bloom
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fillStyle = a.color
        ctx.fill()
      }
      if (scheduleNext && inViewport) {
        animId = window.requestAnimationFrame(() => draw(true))
      }
    }

    // Paint initial frame immediately, animate whenever visible in viewport
    draw(false)
    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries[0]?.isIntersecting ?? true
              if (visible === inViewport) return
              inViewport = visible
              window.cancelAnimationFrame(animId)
              if (inViewport) animId = window.requestAnimationFrame(() => draw(true))
            },
            { threshold: 0.01 }
          )
        : null
    if (observer) {
      observer.observe(canvas)
    } else {
      inViewport = true
      animId = window.requestAnimationFrame(() => draw(true))
    }

    return () => {
      window.cancelAnimationFrame(animId)
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Escape key handler for Lightbox
  useEffect(() => {
    if (!lightboxItem) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxItem(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxItem])

  const filteredGallery = useMemo(
    () => (galleryFilter === 'all' ? GALLERY_ITEMS : GALLERY_ITEMS.filter(item => item.category === galleryFilter)),
    [galleryFilter],
  )

  const replaySynthesis = () => {
    setReplaySeed(s => s + 1)
  }

  const copySynthesized = async () => {
    try {
      await navigator.clipboard.writeText(fullOutput)
      setCopiedOutput(true)
      window.setTimeout(() => setCopiedOutput(false), 1800)
    } catch {
      setCopiedOutput(false)
    }
  }

  return (
    <div className="dx-ai-suite">
      {/* 1. Kinetic Dual-Track Capability Marquee */}
      <div className="dx-marquee-band" aria-label={en ? 'Platform engineering capabilities ticker' : 'Daftar kapabilitas rekayasa platform'}>
        <div className="dx-marquee-track forward">
          {[...MARQUEE_ROW_1, ...MARQUEE_ROW_1].map((item, idx) => (
            <span className="dx-marquee-pill" key={`r1-${idx}`}>
              <i style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
              {item.text}
            </span>
          ))}
        </div>
        <div className="dx-marquee-track reverse">
          {[...MARQUEE_ROW_2, ...MARQUEE_ROW_2].map((item, idx) => (
            <span className="dx-marquee-pill" key={`r2-${idx}`}>
              <i style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Neural Topology Canvas + Live Interactive AI Co-Pilot Synthesizer */}
      <section className="dx-studio-section" aria-labelledby="dx-neural-studio-title">
        <div className="container">
          <div className="dx-studio-head">
            <div>
              <span className="section-kicker">{en ? 'INTERACTIVE AI SYNTHESIS ENGINE' : 'MESIN SINTESIS AI INTERAKTIF'}</span>
              <h2 id="dx-neural-studio-title">
                {en ? 'Experience live multi-role ' : 'Simulasikan alur rekayasa '}
                <span>{en ? 'AI engineering synthesis.' : 'AI multi-peran secara langsung.'}</span>
              </h2>
              <p>
                {en
                  ? 'Select a role lens or type any system requirement below to watch DreamEx synthesize architecture contracts, Gherkin BDD, Playwright checks, and Jira ADF specs.'
                  : 'Pilih perspektif peran atau ketik kebutuhan sistem Anda untuk melihat DreamEx menyusun kontrak arsitektur, Gherkin BDD, tes Playwright, dan tiket Jira ADF.'}
              </p>
            </div>
            <Link className="button button-primary" to="/tools">
              <Sparkles size={16} /> {en ? 'Open Full 6-Pillar Workbench' : 'Buka Workbench 6-Pilar Lengkap'} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="dx-studio-grid">
            <div className="dx-neural-canvas-card">
              <img
                className="dx-neural-bg-img"
                src="/images/showcase-datacenter-ai.jpg"
                alt={en ? 'Futuristic AI command center neural compute cluster' : 'Pusat kendali komputasi neural AI futuristik'}
                loading="lazy"
                decoding="async"
                width={1200}
                height={520}
              />
              <div className="dx-neural-scrim" />
              <canvas ref={canvasRef} className="dx-neural-canvas" aria-hidden="true" />
              <div className="dx-neural-hud-top">
                <span className="dx-live-pill">
                  <i /> {en ? 'NEURAL MESH ACTIVE · 60 FPS' : 'JARINGAN NEURAL AKTIF · 60 FPS'}
                </span>
                <span className="category-pill">{en ? 'CLIENT SOVEREIGN' : 'LOKAL DI BROWSER'}</span>
              </div>
              <div className="dx-neural-hud-bottom">
                <span className="section-kicker">{en ? 'TELEMETRY SNAPSHOT' : 'TELEMETRI SISTEM'}</span>
                <div className="dx-neural-stats-grid">
                  <div className="dx-neural-stat">
                    <span>LATENCY</span>
                    <strong>0.04 ms</strong>
                  </div>
                  <div className="dx-neural-stat">
                    <span>TRIALS</span>
                    <strong>10,000×</strong>
                  </div>
                  <div className="dx-neural-stat">
                    <span>PRIVACY</span>
                    <strong>100%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="dx-synth-panel">
              <div className="dx-role-tabs" role="tablist" aria-label={en ? 'Select AI engineering role' : 'Pilih peran rekayasa AI'}>
                {(Object.keys(ROLE_BLUEPRINTS) as AiRolePreset[]).map(key => {
                  const item = ROLE_BLUEPRINTS[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={rolePreset === key}
                      className={rolePreset === key ? 'dx-role-tab active' : 'dx-role-tab'}
                      onClick={() => {
                        setRolePreset(key)
                        setReplaySeed(s => s + 1)
                      }}
                    >
                      {en ? item.labelEn : item.labelId}
                    </button>
                  )
                })}
              </div>

              <div className="dx-synth-input-row">
                <input
                  type="text"
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  placeholder={en ? currentRole.defaultPromptEn : currentRole.defaultPromptId}
                  aria-label={en ? 'System requirement or scenario input' : 'Input kebutuhan sistem atau skenario'}
                />
                <button type="button" className="button button-primary" onClick={replaySynthesis}>
                  <Play size={14} /> {en ? 'Synthesize' : 'Sintesis AI'}
                </button>
              </div>

              <div className="dx-synth-terminal">
                <div className="dx-synth-terminal-bar">
                  <span>
                    <Terminal size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    {currentRole.command}
                  </span>
                  <span>{streamedLength >= fullOutput.length ? (en ? 'COMPLETE' : 'SELESAI') : (en ? 'STREAMING…' : 'MEMPROSES…')}</span>
                </div>
                <pre className="dx-synth-output" data-testid="ai-synth-output">
                  <code>
                    {fullOutput.slice(0, streamedLength)}
                    {streamedLength < fullOutput.length && <span className="dx-typing-cursor" aria-hidden="true" />}
                  </code>
                </pre>
              </div>

              <div className="dx-synth-actions">
                <button type="button" className="button button-ghost" onClick={copySynthesized}>
                  {copiedOutput ? <Check size={15} /> : <Copy size={15} />}
                  {copiedOutput ? (en ? 'Copied Output' : 'Tersalin') : en ? 'Copy Blueprint' : 'Salin Blueprint'}
                </button>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link className="button button-ghost" to="/ba-hub">
                    BA Gherkin & RTM
                  </Link>
                  <Link className="button button-ghost" to="/pm-jira-hub">
                    PM & Jira Hub
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. High-Tech Visual AI & Infrastructure Gallery */}
      <section className="dx-gallery-section" aria-labelledby="dx-visual-gallery-title">
        <div className="container">
          <div className="dx-studio-head">
            <div>
              <span className="section-kicker">{en ? 'VISUAL ARCHITECTURE GALLERY' : 'GALERI ARSITEKTUR VISUAL AI'}</span>
              <h2 id="dx-visual-gallery-title">
                {en ? 'High-tech blueprints across ' : 'Cetak biru visual lintas '}
                <span>{en ? 'every engineering discipline.' : 'disiplin rekayasa modern.'}</span>
              </h2>
              <p>
                {en
                  ? 'Click any visual canvas to inspect in high resolution or jump directly into its interactive engineering workspace.'
                  : 'Klik gambar visual mana pun untuk melihat pratinjau resolusi penuh atau masuk langsung ke workspace rekayasanya.'}
              </p>
            </div>
          </div>

          <div className="dx-gallery-filters" role="group" aria-label={en ? 'Filter visual blueprints' : 'Filter galeri visual'}>
            {[
              { id: 'all', en: 'All Visuals (6)', idLabel: 'Semua Visual (6)' },
              { id: 'ai', en: 'AI & Neural', idLabel: 'AI & Neural' },
              { id: 'qa', en: 'QA & Zero-Trust', idLabel: 'QA & Keamanan' },
              { id: 'arch', en: 'Architecture, BA & PM', idLabel: 'Arsitektur, BA & PM' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={galleryFilter === tab.id ? 'dx-role-tab active' : 'dx-role-tab'}
                aria-pressed={galleryFilter === tab.id}
                onClick={() => setGalleryFilter(tab.id as GalleryCategory)}
              >
                {en ? tab.en : tab.idLabel}
              </button>
            ))}
          </div>

          <div className="dx-gallery-grid">
            {filteredGallery.map(item => (
              <article className="dx-gallery-card" key={item.id}>
                <button
                  type="button"
                  className="dx-gallery-media"
                  onClick={() => setLightboxItem(item)}
                  aria-label={en ? `Preview full visual: ${item.titleEn}` : `Lihat gambar penuh: ${item.titleId}`}
                >
                  <img
                    src={item.image}
                    alt={en ? item.altEn : item.altId}
                    loading="lazy"
                    decoding="async"
                    width={960}
                    height={540}
                  />
                  <HoloMotionFx variant={item.category} />
                  <span className="dx-gallery-media-badge">{en ? item.badgeEn : item.badgeId}</span>
                  <span className="dx-gallery-zoom-chip">
                    <Maximize2 size={12} /> {en ? 'Inspect' : 'Perbesar'}
                  </span>
                </button>
                <div className="dx-gallery-body">
                  <h3>{en ? item.titleEn : item.titleId}</h3>
                  <p>{en ? item.descEn : item.descId}</p>
                  <Link className="dx-gallery-link" to={item.href}>
                    {en ? item.ctaEn : item.ctaId} <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Fullscreen Preview Modal */}
      {lightboxItem && (
        <div
          className="dx-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={en ? lightboxItem.titleEn : lightboxItem.titleId}
          onClick={e => {
            if (e.target === e.currentTarget) setLightboxItem(null)
          }}
        >
          <div className="dx-lightbox-dialog">
            <div className="dx-lightbox-top">
              <strong>{en ? lightboxItem.titleEn : lightboxItem.titleId}</strong>
              <button
                type="button"
                className="dx-lightbox-close"
                onClick={() => setLightboxItem(null)}
                aria-label={en ? 'Close visual preview' : 'Tutup pratinjau visual'}
              >
                <X size={18} />
              </button>
            </div>
            <img
              className="dx-lightbox-media"
              src={lightboxItem.image}
              alt={en ? lightboxItem.altEn : lightboxItem.altId}
            />
            <div className="dx-lightbox-footer">
              <p>{en ? lightboxItem.descEn : lightboxItem.descId}</p>
              <Link className="button button-primary" to={lightboxItem.href} onClick={() => setLightboxItem(null)}>
                {en ? lightboxItem.ctaEn : lightboxItem.ctaId} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
