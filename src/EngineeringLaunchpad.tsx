import { ArrowUpRight, Boxes, Code2, Gauge, ShieldCheck, Workflow, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from './i18n'

const destinations = [
  { href: '/workspace', icon: Workflow, key: 'workspace', en: 'Engineering workspace', id: 'Workspace engineering', detailEn: 'Bring daily engineering workflows into one place.', detailId: 'Satukan alur kerja engineering harian dalam satu tempat.', labelEn: 'WORKFLOW', labelId: 'ALUR KERJA' },
  { href: '/quality-intelligence', icon: Gauge, key: 'quality', en: 'Quality intelligence', id: 'Quality intelligence', detailEn: 'Read test results, spot flaky patterns, and prioritize fixes.', detailId: 'Analisis hasil tes, temukan pola flaky, dan prioritaskan perbaikan.', labelEn: 'QUALITY', labelId: 'KUALITAS' },
  { href: '/api-playground', icon: Code2, key: 'api', en: 'API playground', id: 'API playground', detailEn: 'Explore requests and validate API behavior with focus.', detailId: 'Jelajahi request dan validasi perilaku API dengan terarah.', labelEn: 'DEVELOP', labelId: 'PENGEMBANGAN' },
  { href: '/security-center', icon: ShieldCheck, key: 'security', en: 'Security center', id: 'Security center', detailEn: 'Review practical security checks and defensive guidance.', detailId: 'Tinjau pemeriksaan keamanan praktis dan panduan defensif.', labelEn: 'SECURITY', labelId: 'KEAMANAN' },
  { href: '/supply-chain-intelligence', icon: Boxes, key: 'supply', en: 'Supply chain', id: 'Supply chain', detailEn: 'Inspect SBOM data and understand dependency exposure.', detailId: 'Periksa data SBOM dan pahami paparan dependensi.', labelEn: 'DEPENDENCIES', labelId: 'DEPENDENSI' },
  { href: '/roadmap', icon: Wrench, key: 'roadmap', en: 'Platform roadmap', id: 'Roadmap platform', detailEn: 'See what is available now and what is planned next.', detailId: 'Lihat fitur yang tersedia dan rencana pengembangan berikutnya.', labelEn: 'WHAT’S NEXT', labelId: 'BERIKUTNYA' },
]

export function EngineeringLaunchpad() {
  const { language } = useLanguage()
  const en = language === 'en'
  return <section className="launchpad-section" aria-labelledby="launchpad-title">
    <div className="container">
      <div className="launchpad-heading">
        <div>
          <span className="section-kicker">{en ? 'THE ENGINEERING PLATFORM' : 'PLATFORM ENGINEERING'}</span>
          <h2 id="launchpad-title">{en ? 'Your next move starts here.' : 'Mulai langkah engineering berikutnya di sini.'}</h2>
          <p>{en ? 'Purpose-built tools for building, testing, understanding, and shipping better software.' : 'Tools terarah untuk membangun, menguji, memahami, dan merilis software yang lebih baik.'}</p>
        </div>
        <span className="launchpad-status"><i /> {en ? '6 WORKFLOWS · READY TO EXPLORE' : '6 ALUR KERJA · SIAP DIJELAJAHI'}</span>
      </div>
      <div className="launchpad-grid">
        {destinations.map((item, index) => {
          const Icon = item.icon
          return <Link className="launchpad-card" to={item.href} key={item.key} style={{ '--launch-delay': `${index * 65}ms` } as React.CSSProperties}>
            <div className="launchpad-card-top"><span className="launchpad-icon"><Icon size={19} strokeWidth={1.8} /></span><span className="launchpad-label">{en ? item.labelEn : item.labelId}</span></div>
            <h3>{en ? item.en : item.id}</h3>
            <p>{en ? item.detailEn : item.detailId}</p>
            <span className="launchpad-open">{en ? 'Explore workflow' : 'Jelajahi fitur'} <ArrowUpRight size={16} /></span>
          </Link>
        })}
      </div>
      <div className="launchpad-foot">
        <span><span className="launchpad-foot-dot" /> {en ? 'Sovereign v3.0 Multi-Role Suite: SE · QA/UAT · BA · PM · Jira Automation' : 'Suite Sovereign v3.0 Multi-Peran: SE · QA/UAT · BA · PM · Otomasi Jira'}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <Link to="/tools">{en ? 'Open 6-Pillar IT Workbench' : 'Buka 6-Pilar IT Workbench'} <ArrowUpRight size={14} /></Link>
          <Link to="/ba-hub">{en ? 'BA Gherkin & RTM Hub' : 'Hub BA Gherkin & RTM'} <ArrowUpRight size={14} /></Link>
          <Link to="/pm-jira-hub">{en ? 'PM Monte Carlo & Jira Hub' : 'Hub PM Monte Carlo & Jira'} <ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </div>
  </section>
}
