import { ArrowUpRight, Boxes, Code2, Gauge, ShieldCheck, Workflow, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from './i18n'

const destinations = [
  { href: '/workspace', icon: Workflow, key: 'workspace', en: 'Unified AI workspace', id: 'Workspace AI terpadu', detailEn: '24 integrated toolchains across software design, live prototyping, verification, specs, and operations.', detailId: '24 toolchain terpadu untuk arsitektur software, prototipe AI, verifikasi, spesifikasi, dan operasi.', labelEn: 'OS HUB', labelId: 'OS HUB', chips: ['24 SUITES', 'SVG + AI'] },
  { href: '/quality-intelligence', icon: Gauge, key: 'quality', en: 'Quality intelligence', id: 'Quality intelligence', detailEn: 'Parse Playwright & JUnit telemetry, isolate flakiness, and export audit proof.', detailId: 'Analisis telemetri Playwright & JUnit, isolasi tes flaky, dan ekspor bukti audit.', labelEn: 'QA ENGINE', labelId: 'QA ENGINE', chips: ['JUNIT / PW', 'FLAKE AI'] },
  { href: '/api-playground', icon: Code2, key: 'api', en: 'API contract runner', id: 'API contract runner', detailEn: 'Inspect HTTP payloads, validate strict schemas, and verify contract compatibility.', detailId: 'Periksa payload HTTP, validasi skema ketat, dan verifikasi kompatibilitas kontrak.', labelEn: 'API SPEC', labelId: 'API SPEC', chips: ['OPENAPI 3.X', 'SCHEMA DIFF'] },
  { href: '/security-center', icon: ShieldCheck, key: 'security', en: 'Zero-trust security center', id: 'Pusat keamanan zero-trust', detailEn: 'Evaluate CSP, header hardening, client privacy posture, and OWASP baselines.', detailId: 'Evaluasi CSP, hardening header, privasi klien, dan standar dasar OWASP.', labelEn: 'SECURITY', labelId: 'KEAMANAN', chips: ['CSP & OWASP', 'LOCAL VAULT'] },
  { href: '/supply-chain-intelligence', icon: Boxes, key: 'supply', en: 'SBOM & supply chain', id: 'SBOM & rantai pasok', detailEn: 'Trace CycloneDX/SPDX graphs, transitive exposure, and license compliance offline.', detailId: 'Telusuri grafik CycloneDX/SPDX, paparan dependensi, dan lisensi secara offline.', labelEn: 'SUPPLY CHAIN', labelId: 'RANTAI PASOK', chips: ['CYCLONEDX', 'SPDX AUDIT'] },
  { href: '/roadmap', icon: Wrench, key: 'roadmap', en: 'Architecture & release gate', id: 'Gerbang rilis & arsitektur', detailEn: 'Score release readiness, author ADR blueprints, and run STRIDE threat modeling.', detailId: 'Skor kesiapan rilis, susun blueprint ADR, dan lakukan pemodelan ancaman STRIDE.', labelEn: 'GOVERNANCE', labelId: 'TATA KELOLA', chips: ['ADR STUDIO', 'STRIDE'] },
]

export function EngineeringLaunchpad() {
  const { language } = useLanguage()
  const en = language === 'en'
  return <section className="launchpad-section" aria-labelledby="launchpad-title">
    <div className="container">
      <div className="launchpad-heading">
        <div>
          <span className="section-kicker">{en ? 'SPATIAL CAPABILITY MATRIX' : 'MATRIKS KAPABILITAS SPASIAL'}</span>
          <h2 id="launchpad-title">{en ? 'Your next move starts here.' : 'Mulai langkah engineering berikutnya di sini.'}</h2>
          <p>{en ? 'One AI operating plane uniting every engineering role—from distributed design to production release.' : 'Satu platform AI terpadu untuk setiap peran teknik—dari desain sistem hingga rilis produksi.'}</p>
        </div>
        <span className="launchpad-status"><i /> {en ? '6 CORE WORKFLOWS · LIVE TELEMETRY' : '6 ALUR INTI · TELEMETRI AKTIF'}</span>
      </div>
      <div className="launchpad-grid">
        {destinations.map((item, index) => {
          const Icon = item.icon
          return <Link className="launchpad-card" to={item.href} key={item.key} style={{ '--launch-delay': `${index * 65}ms` } as React.CSSProperties}>
            <div className="launchpad-card-top"><span className="launchpad-icon"><Icon size={19} strokeWidth={1.8} /></span><span className="launchpad-label">{en ? item.labelEn : item.labelId}</span></div>
            <h3>{en ? item.en : item.id}</h3>
            <p>{en ? item.detailEn : item.detailId}</p>
            <div className="launchpad-card-meta" aria-hidden="true">
              {item.chips.map(chip => <span key={chip} className="launchpad-chip">{chip}</span>)}
            </div>
            <span className="launchpad-open">{en ? 'Explore workflow' : 'Jelajahi fitur'} <ArrowUpRight size={16} /></span>
          </Link>
        })}
      </div>
      <div className="launchpad-foot">
        <span><span className="launchpad-foot-dot" /> {en ? 'Autonomous v6.0 Multi-Agent OS: Live Prototype · AI Grader · SE · QA · BA · Jira' : 'OS Multi-Agen v6.0 Otonom: Prototipe AI · AI Grader · SE · QA · BA · Jira'}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <Link to="/prototype">{en ? 'AI Prototype Studio (v6)' : 'Studio Prototipe AI (v6)'} <ArrowUpRight size={14} /></Link>
          <Link to="/grader">{en ? 'AI & Security URL Grader' : 'Audit URL AI & Keamanan'} <ArrowUpRight size={14} /></Link>
          <Link to="/tools">{en ? 'Open 6-Pillar IT Workbench' : 'Buka 6-Pilar IT Workbench'} <ArrowUpRight size={14} /></Link>
          <Link to="/ba-hub">{en ? 'BA Gherkin & RTM Hub' : 'Hub BA Gherkin & RTM'} <ArrowUpRight size={14} /></Link>
          <Link to="/pm-jira-hub">{en ? 'PM Monte Carlo & Jira Hub' : 'Hub PM Monte Carlo & Jira'} <ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </div>
  </section>
}
