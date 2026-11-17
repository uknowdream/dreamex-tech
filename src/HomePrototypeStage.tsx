import { useState } from 'react'
import { ArrowRight, Cpu, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from './i18n'
import { HoloMotionFx } from './HoloMotionFx'
import './HomePrototypeStage.css'

type MiniPresetId = 'fintech' | 'gateway' | 'commerce'

const AGENT_PIPELINE = [
  {
    step: '01',
    en: 'Intent & Executable BA Spec',
    id: 'Spesifikasi BA & Gherkin',
    detailEn: 'Translates business intent into deterministic Gherkin invariants & RTM links.',
    detailId: 'Menerjemahkan kebutuhan bisnis ke invarian Gherkin & rantai RTM.',
    tag: 'BDD + RTM',
    href: '/ba-hub',
  },
  {
    step: '02',
    en: 'Distributed Systems Architect',
    id: 'Arsitek Sistem Terdistribusi',
    detailEn: 'Computes Universal Scalability Law ceilings, DB pools & SHA-256 idempotency.',
    detailId: 'Menghitung batas skala USL, koneksi DB & kunci idempotensi SHA-256.',
    tag: 'USL MATH',
    href: '/tools',
  },
  {
    step: '03',
    en: 'Interactive Spatial UI Prototype',
    id: 'Prototipe UI Spasial Hidup',
    detailEn: 'Renders responsive Desktop/Tablet/Mobile sandboxes with strict Zod contracts.',
    detailId: 'Merender sandbox responsif Desktop/Tablet/Mobile dengan kontrak Zod.',
    tag: 'LIVE UI',
    href: '/prototype',
  },
  {
    step: '04',
    en: 'Self-Healing Playwright QA',
    id: 'Otomasi QA Self-Healing',
    detailEn: 'Synthesizes semantic role locators, SQL recon checks & accessibility gates.',
    detailId: 'Menghasilkan selektor semantik Playwright, rekonsiliasi SQL & audit WCAG.',
    tag: '99/100 LOC',
    href: '/qa-studio',
  },
  {
    step: '05',
    en: 'Zero-Trust SRE & Edge Gate',
    id: 'Gerbang SRE & Zero-Trust Edge',
    detailEn: 'Verifies enforcing CSP, RBAC policies, SBOM provenance & failover readiness.',
    detailId: 'Memvalidasi CSP ketat, kebijakan RBAC, rantai SBOM & kesiapan failover.',
    tag: 'SECOPS',
    href: '/security-center',
  },
] as const

const MINI_PRESETS: Record<
  MiniPresetId,
  {
    labelEn: string
    labelId: string
    host: string
    baseMs: number
    uslNodes: number
    traceEn: string
    traceId: string
  }
> = {
  fintech: {
    labelEn: 'FinTech Settlement Guard',
    labelId: 'Settlement FinTech Otonom',
    host: 'sandbox.dreamex.os/fintech-ledger',
    baseMs: 11,
    uslNodes: 38,
    traceEn: '✓ Outbox + SHA-256 Idempotency · Maker-Checker Dual Approval · 0 Duplicate Writes',
    traceId: '✓ Outbox + Idempotensi SHA-256 · Persetujuan Ganda Maker-Checker · 0 Duplikasi',
  },
  gateway: {
    labelEn: 'Multi-Model AI Gateway',
    labelId: 'AI Gateway Multi-Model',
    host: 'sandbox.dreamex.os/neural-router',
    baseMs: 18,
    uslNodes: 44,
    traceEn: '✓ Semantic Vector Cache (80/20 Cascade) · PII Redacted · Faithfulness >= 0.94',
    traceId: '✓ Semantic Cache (Cascade 80/20) · Redaksi PII Aktif · Akurasi >= 0.94',
  },
  commerce: {
    labelEn: 'Global Flash-Sale Saga',
    labelId: 'Saga Flash-Sale Global',
    host: 'sandbox.dreamex.os/edge-saga',
    baseMs: 8,
    uslNodes: 64,
    traceEn: '✓ Atomic Edge KV Reservation · 50k RPS Queue Backpressure · Zero Oversell',
    traceId: '✓ Reservasi Atomik Edge KV · Antrean 50rb RPS · Jaminan Nol Oversell',
  },
}

export default function HomePrototypeStage() {
  const { language } = useLanguage()
  const en = language === 'en'

  const [activeStage, setActiveStage] = useState(2)
  const [presetId, setPresetId] = useState<MiniPresetId>('fintech')
  const [ops, setOps] = useState(2048)
  const [guardOn, setGuardOn] = useState(true)
  const [failoverDrill, setFailoverDrill] = useState(false)

  const preset = MINI_PRESETS[presetId]
  const currentStage = AGENT_PIPELINE[activeStage] ?? AGENT_PIPELINE[2]
  const p95 = failoverDrill ? preset.baseMs + 19 : Math.max(4, preset.baseMs - (guardOn ? 3 : 0))

  return (
    <section className="dx-proto-home-section" aria-labelledby="dx-proto-home-title" data-testid="home-prototype-stage">
      <div className="container">
        <div className="dx-proto-home-head">
          <div>
            <span className="section-kicker">
              {en ? 'AUTONOMOUS 5-AGENT PROTOTYPE ENGINE' : 'MESIN PROTOTIPE OTONOM 5-AGEN'}
            </span>
            <h2 id="dx-proto-home-title">
              {en ? (
                <>
                  Prototype production systems <span>before writing boilerplate.</span>
                </>
              ) : (
                <>
                  Uji prototipe sistem produksi <span>secara instan & terukur.</span>
                </>
              )}
            </h2>
            <p>
              {en
                ? 'Inspect how 5 specialized AI agents collaborate from requirement specification to interactive UI sandbox, self-healing QA, and zero-trust deployment.'
                : 'Simulasikan kolaborasi 5 agen AI khusus dari spesifikasi kebutuhan hingga prototipe UI hidup, otomasi QA self-healing, dan kesiapan rilis produksi.'}
            </p>
          </div>
          <Link className="button button-primary" to="/prototype">
            <Sparkles size={16} />
            {en ? 'Launch Full AI Prototype Studio' : 'Buka Studio Prototipe AI'}
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="dx-proto-bento">
          <div className="dx-proto-agent-card">
            <div className="dx-proto-holo-frame">
              <picture>
                <source srcSet="/images/cover-agentic-prototype.webp" type="image/webp" />
                <img
                  src="/images/cover-agentic-prototype.jpg"
                  alt={
                    en
                      ? 'Five autonomous neural engineering agents orchestrating an interactive spatial prototype'
                      : 'Lima agen rekayasa AI otonom yang mengorkestrasi prototipe antarmuka spasial'
                  }
                  loading="lazy"
                  decoding="async"
                  width={960}
                  height={540}
                />
              </picture>
              <HoloMotionFx variant="neural" />
              <span className="dx-proto-holo-badge">
                <i aria-hidden="true" />
                {en ? '5 AGENTS SYNCED · CLIENT SOVEREIGN' : '5 AGEN AKTIF · PRIVAT DI BROWSER'}
              </span>
            </div>

            <div className="dx-proto-stage-list" role="tablist" aria-label={en ? '5-Agent engineering pipeline' : 'Pipeline rekayasa 5-agen'}>
              {AGENT_PIPELINE.map((item, idx) => (
                <button
                  key={item.step}
                  type="button"
                  role="tab"
                  aria-selected={activeStage === idx}
                  className={activeStage === idx ? 'dx-proto-stage-btn is-active' : 'dx-proto-stage-btn'}
                  onClick={() => setActiveStage(idx)}
                >
                  <span className="dx-proto-stage-num">{item.step}</span>
                  <span className="dx-proto-stage-copy">
                    <strong>{en ? item.en : item.id}</strong>
                    <small>{en ? item.detailEn : item.detailId}</small>
                  </span>
                  <span className="dx-proto-stage-tag">{item.tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dx-proto-sandbox-card">
            <div className="dx-proto-preset-tabs" role="group" aria-label={en ? 'Live prototype presets' : 'Preset prototipe langsung'}>
              {(Object.keys(MINI_PRESETS) as MiniPresetId[]).map(id => (
                <button
                  key={id}
                  type="button"
                  className={presetId === id ? 'dx-proto-preset-pill is-active' : 'dx-proto-preset-pill'}
                  aria-pressed={presetId === id}
                  onClick={() => setPresetId(id)}
                >
                  {en ? MINI_PRESETS[id].labelEn : MINI_PRESETS[id].labelId}
                </button>
              ))}
            </div>

            <div className="dx-proto-window">
              <div className="dx-proto-window-top">
                <span className="dx-proto-window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="dx-proto-window-host">{preset.host}</span>
                <span className="dx-proto-stage-tag">USL {preset.uslNodes} NODES</span>
              </div>

              <div className="dx-proto-window-body">
                <div className="dx-proto-metrics">
                  <div className="dx-proto-metric-tile">
                    <span>{en ? 'SIMULATED OPS' : 'OPERASI SIMULASI'}</span>
                    <strong data-testid="home-proto-ops">{ops.toLocaleString()}</strong>
                  </div>
                  <div className="dx-proto-metric-tile">
                    <span>{en ? 'EDGE P95' : 'LATENSI P95'}</span>
                    <strong>{p95} ms</strong>
                  </div>
                  <div className="dx-proto-metric-tile">
                    <span>{en ? 'CIRCUIT STATE' : 'STATUS SIRKUIT'}</span>
                    <strong>{failoverDrill ? 'FAILOVER' : 'HEALTHY'}</strong>
                  </div>
                </div>

                <div className="dx-proto-log" aria-live="polite">
                  <div>▶ agent[{currentStage.step}] :: {en ? currentStage.en : currentStage.id}</div>
                  <div>{en ? preset.traceEn : preset.traceId}</div>
                  <div>
                    {failoverDrill
                      ? en
                        ? '⚡ Chaos drill active -> traffic cleanly shifted to secondary replica'
                        : '⚡ Simulasi failover aktif -> trafik dialihkan mulus ke replika sekunder'
                      : guardOn
                        ? en
                          ? '🛡️ Zero-Trust CSP + SHA-256 Idempotency Shield active'
                          : '🛡️ Proteksi Zero-Trust CSP + Idempotensi SHA-256 aktif'
                        : en
                          ? 'ℹ️ Direct pass-through mode (cache shield paused)'
                          : 'ℹ️ Mode langsung (cache sementara dinonaktifkan)'}
                  </div>
                </div>

                <div className="dx-proto-controls">
                  <button
                    type="button"
                    data-testid="home-proto-simulate"
                    className="button button-primary"
                    onClick={() => setOps(n => n + 12)}
                  >
                    <Play size={14} /> {en ? 'Simulate +12 Edge Ops' : 'Simulasi +12 Operasi'}
                  </button>
                  <button
                    type="button"
                    className={guardOn ? 'dx-proto-chip-btn is-active' : 'dx-proto-chip-btn'}
                    aria-pressed={guardOn}
                    onClick={() => setGuardOn(v => !v)}
                  >
                    <ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {en ? 'Zero-Trust Shield' : 'Perisai Zero-Trust'}
                  </button>
                  <button
                    type="button"
                    className={failoverDrill ? 'dx-proto-chip-btn is-active' : 'dx-proto-chip-btn'}
                    aria-pressed={failoverDrill}
                    onClick={() => setFailoverDrill(v => !v)}
                  >
                    <Zap size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {en ? 'Failover Drill' : 'Uji Failover'}
                  </button>
                </div>
              </div>
            </div>

            <div className="dx-proto-footer-links">
              <Link className="read-link" to="/prototype">
                <Cpu size={15} />
                {en ? 'Inspect responsive Desktop/Mobile sandbox & Token ROI' : 'Buka sandbox Desktop/Mobile & Kalkulator Token AI'}
                <ArrowRight size={15} />
              </Link>
              <Link className="read-link" to={currentStage.href}>
                {en ? `Open Stage ${currentStage.step} Module` : `Buka Modul Tahap ${currentStage.step}`}
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
