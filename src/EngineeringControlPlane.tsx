import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Boxes, Check, CheckCircle2, ClipboardCheck, Code2, Download, Gauge, Network, Search, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useLanguage } from './i18n'

const CHECKLIST_KEY = 'dreamex-control-plane-checklist-v1'

const workflows = [
  { id: 'catalog', title: 'Software Catalog', description: 'Map services, ownership, repositories, and dependencies.', route: '/engineering-intelligence', category: 'Architecture', icon: Boxes, keywords: 'catalog service ownership repo dependencies architecture' },
  { id: 'api', title: 'API Contract Studio', description: 'Inspect OpenAPI contracts and compare likely breaking changes.', route: '/engineering-intelligence', category: 'API Engineering', icon: Code2, keywords: 'api openapi contract schema compatibility' },
  { id: 'quality', title: 'QA Automation Studio', description: 'Create test cases, Gherkin scenarios, plans, and defect reports.', route: '/qa-studio', category: 'Quality Engineering', icon: ClipboardCheck, keywords: 'qa test case gherkin bdd regression defect' },
  { id: 'security', title: 'Security & Privacy Center', description: 'Review browser-visible security signals and manage local data.', route: '/security-center', category: 'Security', icon: ShieldCheck, keywords: 'security privacy headers audit' },
  { id: 'performance', title: 'Performance Observatory', description: 'Inspect browser timing and available performance signals.', route: '/performance', category: 'Reliability', icon: Gauge, keywords: 'performance vitals timing observability' },
  { id: 'operations', title: 'Engineering Command Center', description: 'Organize work items, incident notes, and release checklists.', route: '/command-center', category: 'Operations', icon: Activity, keywords: 'command center incident release work queue' },
  { id: 'workspace', title: 'Engineering Workspace', description: 'Search and launch the broader engineering toolkit.', route: '/workspace', category: 'Developer Experience', icon: Workflow, keywords: 'workspace tools search developer' },
  { id: 'learning', title: 'Learning Hub', description: 'Follow curated paths and strengthen engineering fundamentals.', route: '/learn', category: 'Knowledge', icon: Network, keywords: 'learning courses glossary qa automation' },
] as const

const checks = [
  { id: 'scope', title: 'Define change scope and acceptance criteria', group: 'Plan' },
  { id: 'contract', title: 'Review API contracts and compatibility', group: 'Design' },
  { id: 'tests', title: 'Run relevant functional and regression tests', group: 'Verify' },
  { id: 'security', title: 'Review security and privacy impact', group: 'Verify' },
  { id: 'evidence', title: 'Capture test evidence and unresolved risks', group: 'Release' },
  { id: 'rollback', title: 'Confirm rollback and recovery approach', group: 'Release' },
] as const

type CheckState = Record<string, boolean>
type BrowserSignals = { online: boolean; secure: boolean; width: number; height: number }

function readChecks(): CheckState {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(checks.map(item => [item.id, (value as Record<string, unknown>)[item.id] === true]))
  } catch { return {} }
}

function getBrowserSignals(): BrowserSignals {
  return {
    online: typeof navigator === 'undefined' ? false : navigator.onLine,
    secure: typeof window === 'undefined' ? false : window.isSecureContext,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }
}

export function EngineeringControlPlanePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<CheckState>(readChecks)
  const [signals, setSignals] = useState<BrowserSignals>(getBrowserSignals)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try { window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checked)) } catch {
      setNotice(en ? 'Browser storage is unavailable; checklist changes may not persist.' : 'Penyimpanan browser tidak tersedia; perubahan checklist mungkin tidak tersimpan.')
    }
  }, [checked, en])

  useEffect(() => {
    const update = () => setSignals(getBrowserSignals())
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const filteredWorkflows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return workflows
    return workflows.filter(item => [item.title, item.description, item.category, item.keywords].join(' ').toLocaleLowerCase().includes(term))
  }, [query])
  const completed = checks.filter(item => checked[item.id]).length
  const readiness = Math.round(completed / checks.length * 100)

  const downloadSnapshot = () => {
    const snapshot = {
      format: 'dreamex-control-plane-snapshot',
      version: 1,
      exportedAt: new Date().toISOString(),
      checklist: checks.map(item => ({ ...item, complete: checked[item.id] === true })),
      browserSignals: signals,
      note: 'Browser-session signals and a user-maintained checklist only; this is not a live backend health report or release certification.',
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-control-plane-snapshot.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setNotice(en ? 'Control plane snapshot exported.' : 'Snapshot control plane berhasil diekspor.')
  }

  return <main id="main-content" className="container control-plane-page">
    <header className="control-plane-hero">
      <div className="control-plane-hero-copy">
        <span className="section-kicker"><Sparkles size={14} /> DREAMEX ENGINEERING / CONTROL PLANE</span>
        <h1>{en ? <>Engineering, <span>in control.</span></> : <>Engineering, <span>lebih terkendali.</span></>}</h1>
        <p>{en ? 'A single launchpad for architecture, quality, security, performance, and delivery workflows. Keep the signal honest, the evidence visible, and the next action clear.' : 'Satu pusat untuk workflow arsitektur, kualitas, keamanan, performa, dan delivery. Jaga indikator tetap akurat, bukti terlihat, dan langkah berikutnya jelas.'}</p>
        <div className="control-plane-actions">
          <Link className="button button-primary" to="/workspace">{en ? 'Explore all tools' : 'Jelajahi semua tools'} <ArrowRight size={16} /></Link>
          <button className="button button-secondary" type="button" onClick={downloadSnapshot}><Download size={15} /> {en ? 'Export snapshot' : 'Ekspor snapshot'}</button>
        </div>
      </div>
      <aside className="control-plane-score" aria-label={en ? 'Personal checklist progress' : 'Progres checklist pribadi'}>
        <span className="control-plane-score-label">{en ? 'RELEASE CHECKLIST' : 'CHECKLIST RILIS'}</span>
        <div className="control-plane-score-value"><strong>{readiness}%</strong><span>{en ? 'completed' : 'selesai'}</span></div>
        <div className="control-plane-progress" role="progressbar" aria-label={en ? 'Release checklist completion' : 'Penyelesaian checklist rilis'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness}><span style={{ width: readiness + '%' }} /></div>
        <p>{completed} / {checks.length} {en ? 'checks complete' : 'pemeriksaan selesai'}</p>
        <small>{en ? 'Personal checklist only — not a deployment status.' : 'Checklist pribadi — bukan status deployment.'}</small>
      </aside>
    </header>

    <section className="control-plane-signals" aria-label={en ? 'Browser session signals' : 'Sinyal sesi browser'}>
      <div className="control-plane-signal"><span className={signals.online ? 'signal-dot is-good' : 'signal-dot is-warn'} /><div><small>{en ? 'Network' : 'Jaringan'}</small><strong>{signals.online ? (en ? 'Browser online' : 'Browser online') : (en ? 'Browser offline' : 'Browser offline')}</strong></div></div>
      <div className="control-plane-signal"><span className={signals.secure ? 'signal-dot is-good' : 'signal-dot is-warn'} /><div><small>{en ? 'Context' : 'Konteks'}</small><strong>{signals.secure ? (en ? 'Secure context' : 'Konteks aman') : (en ? 'Non-secure context' : 'Konteks tidak aman')}</strong></div></div>
      <div className="control-plane-signal"><span className="signal-dot is-neutral" /><div><small>{en ? 'Viewport' : 'Viewport'}</small><strong>{signals.width} × {signals.height}</strong></div></div>
      <p>{en ? 'Signals describe this browser session only. They do not query Vercel, CI, APIs, or production services.' : 'Sinyal hanya menjelaskan sesi browser ini. Tidak mengakses Vercel, CI, API, atau layanan produksi.'}</p>
    </section>

    <section className="control-plane-workflows">
      <div className="control-plane-section-heading"><div><span className="section-kicker">{en ? 'ENGINEERING TOOLCHAIN' : 'TOOLCHAIN ENGINEERING'}</span><h2>{en ? 'Choose your next workflow' : 'Pilih workflow berikutnya'}</h2><p>{en ? 'Search across the core capabilities and jump straight into a focused tool.' : 'Cari kemampuan utama dan langsung buka tool yang dibutuhkan.'}</p></div><label className="control-plane-search"><Search size={17} /><input type="search" aria-label={en ? 'Search engineering workflows' : 'Cari workflow engineering'} placeholder={en ? 'Search tools and workflows…' : 'Cari tools dan workflow…'} value={query} onChange={event => setQuery(event.target.value)} /><kbd>/</kbd></label></div>
      <div className="control-plane-grid">{filteredWorkflows.map((item, index) => { const Icon = item.icon; return <Link key={item.id} to={item.route} className="control-plane-card"><div className="control-plane-card-top"><span className="control-plane-icon"><Icon size={19} /></span><span>{String(index + 1).padStart(2, '0')}</span></div><small>{item.category}</small><h3>{item.title}</h3><p>{item.description}</p><span className="control-plane-card-link">{en ? 'Open workflow' : 'Buka workflow'} <ArrowRight size={15} /></span></Link> })}</div>
      {filteredWorkflows.length === 0 && <p className="control-plane-empty">{en ? 'No workflows match that search. Try another keyword.' : 'Tidak ada workflow yang cocok. Coba kata kunci lain.'}</p>}
    </section>

    <section className="control-plane-checklist">
      <div className="control-plane-section-heading"><div><span className="section-kicker">{en ? 'DELIVERY DISCIPLINE' : 'DISIPLIN DELIVERY'}</span><h2>{en ? 'Release readiness checklist' : 'Checklist kesiapan rilis'}</h2><p>{en ? 'A lightweight, editable checklist saved in this browser. Use it as a reminder, not as an automated quality gate.' : 'Checklist ringan yang bisa diedit dan disimpan di browser ini. Gunakan sebagai pengingat, bukan quality gate otomatis.'}</p></div><span className="control-plane-check-count"><CheckCircle2 size={16} /> {completed}/{checks.length}</span></div>
      <div className="control-plane-check-list">{checks.map(item => <label key={item.id} className={checked[item.id] ? 'control-plane-check is-checked' : 'control-plane-check'}><input type="checkbox" checked={checked[item.id] === true} onChange={event => setChecked(current => ({ ...current, [item.id]: event.target.checked }))} /><span className="control-plane-checkbox"><Check size={13} /></span><span className="control-plane-check-copy"><small>{item.group}</small><strong>{en ? item.title : ({ scope: 'Tentukan ruang lingkup dan kriteria penerimaan', contract: 'Tinjau kontrak API dan kompatibilitas', tests: 'Jalankan pengujian fungsional dan regresi', security: 'Tinjau dampak keamanan dan privasi', evidence: 'Catat bukti pengujian dan risiko tersisa', rollback: 'Pastikan pendekatan rollback dan pemulihan' }[item.id])}</strong></span></label>)}</div>
    </section>
    {notice && <p className="control-plane-notice" role="status">{notice}</p>}
    <p className="control-plane-disclaimer"><ShieldCheck size={15} /> {en ? 'Privacy-first by design: checklist data stays in this browser. Export creates a portable JSON snapshot; it does not upload project data.' : 'Privasi sejak awal: data checklist tersimpan di browser ini. Ekspor membuat snapshot JSON portabel dan tidak mengunggah data proyek.'}</p>
  </main>
}
