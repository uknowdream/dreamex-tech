import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookOpen,
  Braces,
  Check,
  ClipboardCheck,
  Command,
  Copy,
  Download,
  FileJson,
  Network,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Terminal,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useLanguage } from './i18n'
import { ApiContractStudio } from './ApiContractStudio'
import { AiCopilotPanel, SvgRingGauge, SvgSparkBars, SvgStackedBar } from './DashboardKit'
import { readWorkspacePulse } from './workspacePulse'
import './EngineeringPlatform.css'

type RoleFocus = 'all' | 'dev' | 'qa' | 'ba' | 'pm'

interface WorkspaceToolItem {
  id: string
  title: string
  titleId: string
  description: string
  descriptionId: string
  category: string
  categoryId: string
  route: string
  keywords: string
  roles: Exclude<RoleFocus, 'all'>[]
  icon: typeof Terminal
}

const items: WorkspaceToolItem[] = [
  {
    id: 'prototype',
    title: 'Autonomous AI Prototype Studio',
    titleId: 'Studio Prototipe AI Otonom',
    description: 'Orchestrate a 5-agent DAG, interact with live RBAC & failover UI prototypes, and model token ROI.',
    descriptionId: 'Orkestrasi DAG 5-agen, uji prototipe UI interaktif dengan RBAC & failover, serta hitung token ROI.',
    category: 'AI Architecture',
    categoryId: 'Arsitektur AI',
    route: '/prototype',
    keywords: 'ai prototype multi-agent dag live sandbox rbac token economics v5',
    roles: ['dev', 'qa', 'ba', 'pm'],
    icon: Zap,
  },
  {
    id: 'grader',
    title: 'AI Readiness & Security URL Grader',
    titleId: 'Grader Kesiapan AI & Keamanan URL',
    description: 'Scan public HTTPS domains for enforcing CSP, HSTS, /llms.txt AI discovery, and generate live SVG badges.',
    descriptionId: 'Audit domain HTTPS publik untuk CSP, HSTS, manifes /llms.txt AI, dan hasilkan lencana skor SVG.',
    category: 'Security & AI',
    categoryId: 'Keamanan & AI',
    route: '/grader',
    keywords: 'grader scan url domain security csp hsts llms.txt badge seo ai readiness v6',
    roles: ['dev', 'qa', 'pm'],
    icon: ShieldCheck,
  },
  {
    id: 'lab',
    title: 'Engineering Lab',
    titleId: 'Lab Engineering',
    description: 'Test cases, bug reports, API matrices, OpenAPI contracts and release readiness.',
    descriptionId: 'Test case, laporan bug, matriks API, kontrak OpenAPI, dan kesiapan rilis.',
    category: 'Quality Engineering',
    categoryId: 'Quality Engineering',
    route: '/lab',
    keywords: 'qa test bug release incident',
    roles: ['qa', 'dev'],
    icon: Terminal,
  },
  {
    id: 'devtools',
    title: 'Developer Utilities',
    titleId: 'Utilitas Developer',
    description: 'JSON Schema generation, regex testing, and JWT inspection.',
    descriptionId: 'Pembuatan JSON Schema, pengujian regex, dan inspeksi token JWT lokal.',
    category: 'Developer Tools',
    categoryId: 'Tools Developer',
    route: '/devtools',
    keywords: 'json regex jwt schema',
    roles: ['dev', 'qa'],
    icon: Braces,
  },
  {
    id: 'api',
    title: 'API Playground',
    titleId: 'API Playground',
    description: 'Send HTTP requests, inspect responses, and export Postman collections.',
    descriptionId: 'Kirim request HTTP, periksa respons, dan ekspor koleksi Postman.',
    category: 'API Engineering',
    categoryId: 'Rekayasa API',
    route: '/api-playground',
    keywords: 'http rest request response headers postman',
    roles: ['dev', 'qa'],
    icon: Zap,
  },
  {
    id: 'observatory',
    title: 'Web Quality Observatory',
    titleId: 'Observatorium Kualitas Web',
    description: 'Audit metadata, accessibility signals, and responsive foundations.',
    descriptionId: 'Audit metadata SEO, sinyal aksesibilitas, dan fondasi tampilan responsif.',
    category: 'Quality Engineering',
    categoryId: 'Quality Engineering',
    route: '/observatory',
    keywords: 'accessibility seo audit',
    roles: ['qa', 'dev'],
    icon: Activity,
  },
  {
    id: 'performance',
    title: 'Performance Observatory',
    titleId: 'Observatorium Performa',
    description: 'Inspect navigation timing, resource costs, and available Web Vitals.',
    descriptionId: 'Periksa navigation timing, beban transfer aset, dan metrik Web Vitals.',
    category: 'Performance',
    categoryId: 'Performa',
    route: '/performance',
    keywords: 'lcp cls inp lighthouse',
    roles: ['dev', 'qa'],
    icon: Activity,
  },
  {
    id: 'learn',
    title: 'Interactive Learning Paths',
    titleId: 'Jalur Belajar Interaktif',
    description: 'Track QA Automation, Software Engineering, AI, and Cybersecurity.',
    descriptionId: 'Pelajari jalur terstruktur QA Automation, Software Engineering, AI, dan Keamanan.',
    category: 'Learning',
    categoryId: 'Pembelajaran',
    route: '/learn',
    keywords: 'course roadmap cybersecurity',
    roles: ['dev', 'qa', 'ba', 'pm'],
    icon: BookOpen,
  },
  {
    id: 'graph',
    title: 'Engineering Knowledge Graph',
    titleId: 'Graf Pengetahuan Engineering',
    description: 'Explore connections between concepts, articles, and tools visually.',
    descriptionId: 'Jelajahi relasi antar konsep, artikel teknis, dan modul tool secara visual.',
    category: 'Knowledge',
    categoryId: 'Pengetahuan',
    route: '/knowledge-graph',
    keywords: 'graph concept related knowledge mermaid',
    roles: ['dev', 'qa', 'ba', 'pm'],
    icon: Share2,
  },
  {
    id: 'roadmap',
    title: 'Product Roadmap & Readiness',
    titleId: 'Peta Jalan Produk & Kesiapan',
    description: 'Track platform priorities, assess release readiness, write ADRs, and model STRIDE threats.',
    descriptionId: 'Pantau prioritas produk, evaluasi kesiapan rilis, tulis ADR, dan pemodelan ancaman STRIDE.',
    category: 'Engineering Governance',
    categoryId: 'Tata Kelola Engineering',
    route: '/roadmap',
    keywords: 'roadmap project scorecard release readiness adr architecture threat model stride',
    roles: ['pm', 'dev', 'ba'],
    icon: ClipboardCheck,
  },
  {
    id: 'command-center',
    title: 'Engineering Command Center',
    titleId: 'Pusat Komando Engineering',
    description: 'Track work items, manage incident records, document architecture decisions, and review release gates.',
    descriptionId: 'Kelola antrean kerja, catat insiden, dokumentasikan keputusan arsitektur, dan gerbang rilis.',
    category: 'Engineering Governance',
    categoryId: 'Tata Kelola Engineering',
    route: '/command-center',
    keywords: 'command center incident postmortem tasks release readiness adr operations',
    roles: ['pm', 'dev'],
    icon: Activity,
  },
  {
    id: 'qa-studio',
    title: 'QA Automation Studio',
    titleId: 'Studio Otomasi QA',
    description: 'Generate editable test cases, Gherkin scenarios, bug reports, and test plans from explicit requirements.',
    descriptionId: 'Buat test case, skenario Gherkin, laporan bug, dan test plan dari kebutuhan eksplisit.',
    category: 'Quality Engineering',
    categoryId: 'Quality Engineering',
    route: '/qa-studio',
    keywords: 'test case test plan gherkin bdd bug report qa automation',
    roles: ['qa', 'ba'],
    icon: ClipboardCheck,
  },
  {
    id: 'security-center',
    title: 'Security & Privacy Center',
    titleId: 'Pusat Keamanan & Privasi',
    description: 'Review same-origin security headers, browser-visible quality signals, and export a verification report.',
    descriptionId: 'Tinjau security header same-origin, sinyal keamanan browser, dan ekspor laporan audit.',
    category: 'Security Engineering',
    categoryId: 'Keamanan Sistem',
    route: '/security-center',
    keywords: 'security headers csp hsts privacy audit owasp hardening',
    roles: ['dev', 'qa'],
    icon: ShieldCheck,
  },
  {
    id: 'engineering-intelligence',
    title: 'Engineering Intelligence',
    titleId: 'Inteligensi Arsitektur & Kontrak',
    description: 'Maintain a local software catalog, inspect OpenAPI contracts, and compare likely breaking changes.',
    descriptionId: 'Kelola katalog layanan software, periksa kontrak OpenAPI, dan deteksi perubahan breaking.',
    category: 'Engineering Governance',
    categoryId: 'Tata Kelola Engineering',
    route: '/engineering-intelligence',
    keywords: 'software catalog architecture explorer api contract openapi schema breaking change compatibility',
    roles: ['dev', 'ba'],
    icon: Network,
  },
  {
    id: 'control-plane',
    title: 'Engineering Control Plane',
    titleId: 'Control Plane Engineering',
    description: 'Unify engineering workflows, review browser-session signals, and maintain a release checklist.',
    descriptionId: 'Satukan alur kerja engineering, sinyal sesi browser, dan checklist kesiapan rilis.',
    category: 'Engineering Governance',
    categoryId: 'Tata Kelola Engineering',
    route: '/control-plane',
    keywords: 'control plane dashboard release checklist workflow engineering overview',
    roles: ['pm', 'dev'],
    icon: Activity,
  },
  {
    id: 'quality-intelligence',
    title: 'Quality Intelligence Center',
    titleId: 'Pusat Inteligensi Kualitas',
    description: 'Analyze Playwright JSON and JUnit XML reports, find flaky tests, cluster failures, and export evidence locally.',
    descriptionId: 'Analisis laporan Playwright JSON & JUnit XML, deteksi flaky test, dan ekspor bukti lokal.',
    category: 'Quality Engineering',
    categoryId: 'Quality Engineering',
    route: '/quality-intelligence',
    keywords: 'quality intelligence test report junit xml playwright json pass rate flaky failures regression',
    roles: ['qa', 'pm'],
    icon: Activity,
  },
  {
    id: 'reliability-center',
    title: 'Reliability & Incident Center',
    titleId: 'Pusat Reliabilitas & Insiden',
    description: 'Capture incident timelines, write postmortems, and track manually reported delivery metrics.',
    descriptionId: 'Susun linimasa insiden, tulis postmortem, dan pantau metrik reliabilitas tim.',
    category: 'Reliability Engineering',
    categoryId: 'Reliabilitas Sistem',
    route: '/reliability-center',
    keywords: 'incident sev postmortem timeline dora metrics restore time change failure rate',
    roles: ['dev', 'pm'],
    icon: AlertTriangle,
  },
  {
    id: 'supply-chain-intelligence',
    title: 'Software Supply Chain Intelligence',
    titleId: 'Inteligensi Rantai Pasok Software',
    description: 'Inspect CycloneDX and SPDX SBOMs, dependency metadata, license labels, and vulnerability records included in the imported inventory.',
    descriptionId: 'Periksa SBOM CycloneDX & SPDX, metadata dependensi, lisensi paket, dan catatan kerentanan.',
    category: 'Security Engineering',
    categoryId: 'Keamanan Sistem',
    route: '/supply-chain-intelligence',
    keywords: 'sbom software supply chain cyclonedx spdx dependencies licenses vulnerabilities package url purl',
    roles: ['dev', 'pm'],
    icon: ShieldCheck,
  },
  {
    id: 'sovereign-workbench',
    title: 'Sovereign IT Workbench (6-Pillar)',
    titleId: 'Workbench IT Terpadu (6 Pilar)',
    description: 'Interactive multi-role workbench uniting Software Engineering USL, QA trace matrices, BA Gherkin, and PM delivery simulation.',
    descriptionId: 'Workbench multi-peran untuk kalkulasi USL arsitektur, matriks QA, Gherkin BA, dan simulasi PM.',
    category: 'AI & Multi-Role',
    categoryId: 'AI & Multi-Peran',
    route: '/tools',
    keywords: 'workbench sovereign it usl architecture synthesis orchestrator multi role',
    roles: ['dev', 'qa', 'ba', 'pm'],
    icon: Zap,
  },
  {
    id: 'ba-hub',
    title: 'BA & Gherkin Requirements Studio',
    titleId: 'Studio Kebutuhan BA & Gherkin',
    description: 'Compile business requirements into testable Gherkin BDD scenarios and requirements traceability matrices.',
    descriptionId: 'Kompilasi kebutuhan bisnis menjadi skenario Gherkin BDD dan matriks ketertelusuran (RTM).',
    category: 'Business Analysis',
    categoryId: 'Analisis Bisnis',
    route: '/ba-hub',
    keywords: 'ba business analyst gherkin bdd requirements rtm traceability acceptance criteria',
    roles: ['ba', 'qa'],
    icon: ClipboardCheck,
  },
  {
    id: 'jira-enterprise-os',
    title: 'Jira Agile Board & Sprint OS',
    titleId: 'Board Jira Agile & Sprint OS',
    description: 'Full Jira Scrum/Kanban board with WIP limits, swimlanes, backlog capacity, Epic Gantt, live JQL, burndown, and REST v3 ADF export.',
    descriptionId: 'Board Scrum/Kanban Jira lengkap dengan batas WIP, swimlane, backlog sprint, roadmap Gantt Epic, JQL langsung, burndown, dan ekspor ADF.',
    category: 'Delivery Governance',
    categoryId: 'Tata Kelola Delivery',
    route: '/jira',
    keywords: 'jira kanban scrum sprint backlog epic gantt roadmap jql burndown velocity automation v7',
    roles: ['pm', 'dev', 'qa', 'ba'],
    icon: ClipboardCheck,
  },
  {
    id: 'pm-jira-hub',
    title: 'PM & Jira Automation Hub',
    titleId: 'Hub PM & Otomasi Jira',
    description: 'Run Monte Carlo delivery forecasting, generate Jira REST API v3 ADF payloads, and query sprint velocity.',
    descriptionId: 'Simulasi estimasi rilis Monte Carlo, buat payload Jira REST API v3 ADF, dan kueri JQL.',
    category: 'Delivery Governance',
    categoryId: 'Tata Kelola Delivery',
    route: '/pm-jira-hub',
    keywords: 'pm project manager jira jql adf monte carlo sprint forecast delivery',
    roles: ['pm', 'qa', 'ba'],
    icon: Activity,
  },
  {
    id: 'github-ci',
    title: 'GitHub CI Workflow Monitor',
    titleId: 'Pemantau Workflow GitHub',
    description: 'Inspect public GitHub Actions workflow runs, pull requests, and deployment readiness.',
    descriptionId: 'Pantau riwayat GitHub Actions, daftar pull request, dan kesiapan rilis proyek.',
    category: 'Engineering Governance',
    categoryId: 'Tata Kelola Engineering',
    route: '/github-ci',
    keywords: 'github actions workflow runs pull requests deployments build status',
    roles: ['dev', 'qa', 'pm'],
    icon: Terminal,
  },
  {
    id: 'team-workspace',
    title: 'Shared Team Snapshot Studio',
    titleId: 'Studio Snapshot Kolaborasi Tim',
    description: 'Collaborate across roles using exportable revision-safe JSON workspace snapshots and audit logs.',
    descriptionId: 'Kolaborasi lintas peran dengan snapshot JSON revisi aman, kontrol RBAC, dan log audit.',
    category: 'Collaboration',
    categoryId: 'Kolaborasi',
    route: '/team-workspace',
    keywords: 'team collaboration snapshot revision export import share workspace',
    roles: ['pm', 'dev', 'qa', 'ba'],
    icon: Share2,
  },
  {
    id: 'reading-list',
    title: 'Reading List',
    titleId: 'Daftar Bacaan',
    description: 'Return to saved engineering articles.',
    descriptionId: 'Buka kembali artikel rekayasa teknis yang telah Anda simpan.',
    category: 'Knowledge',
    categoryId: 'Pengetahuan',
    route: '/reading-list',
    keywords: 'bookmark saved reading',
    roles: ['dev', 'qa', 'ba', 'pm'],
    icon: Bookmark,
  },
]

export function EngineeringWorkspacePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [role, setRole] = useState<RoleFocus>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [pulse, setPulse] = useState(() => readWorkspacePulse())
  const normalizedQuery = query.trim().toLocaleLowerCase()

  useEffect(() => {
    const refreshPulse = () => setPulse(readWorkspacePulse())
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('storage', refreshPulse)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('storage', refreshPulse)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const visible = useMemo(
    () =>
      items.filter(x => {
        const localizedCategory = en ? x.category : x.categoryId
        const matchesCategory = category === 'All' || x.category === category || localizedCategory === category
        const matchesRole = role === 'all' || x.roles.includes(role)
        const searchable = [x.title, x.titleId, x.description, x.descriptionId, x.category, x.categoryId, x.keywords]
          .join(' ')
          .toLocaleLowerCase()
        return matchesCategory && matchesRole && (!normalizedQuery || searchable.includes(normalizedQuery))
      }),
    [category, en, normalizedQuery, role],
  )

  const categories = useMemo(() => ['All', ...new Set(items.map(x => x.category))], [])
  const categoryLabel = (rawCategory: string) => {
    if (rawCategory === 'All') return en ? 'All tools' : 'Semua tools'
    const match = items.find(x => x.category === rawCategory)
    return en ? rawCategory : match?.categoryId ?? rawCategory
  }

  const roleOptions: Array<{ id: RoleFocus; labelEn: string; labelId: string }> = [
    { id: 'all', labelEn: `All Roles (${items.length})`, labelId: `Semua Peran (${items.length})` },
    { id: 'dev', labelEn: 'Software & Architecture', labelId: 'Software & Arsitektur' },
    { id: 'qa', labelEn: 'QA & Automation', labelId: 'QA & Otomasi' },
    { id: 'ba', labelEn: 'Business Analyst', labelId: 'Business Analyst' },
    { id: 'pm', labelEn: 'PM & Delivery Ops', labelId: 'PM & Tata Kelola' },
  ]

  return (
    <main id="main-content" className="container workspace-page">
      <header className="workspace-hero workspace-hero-visual">
        <img className="workspace-hero-art" src="/images/spotlight-ai-os.jpg" alt="" aria-hidden="true" width={1376} height={768} />
        <span className="section-kicker">
          <Command size={14} /> DREAMEX AI OS / WORKSPACE ({items.length} SUITES)
        </span>
        <h1>
          {en ? (
            <>
              One workspace.
              <br />
              <span>Better engineering.</span>
            </>
          ) : (
            <>
              Satu workspace.
              <br />
              <span>Engineering lebih baik.</span>
            </>
          )}
        </h1>
        <p>
          {en
            ? 'A global AI operating plane uniting software architecture, self-healing QA automation, executable BA specs, and Jira delivery governance—100% client-sovereign.'
            : 'Ruang kerja AI global yang menyatukan arsitektur software, otomasi QA self-healing, spesifikasi BA, dan tata kelola delivery Jira secara privat di browser.'}
        </p>
        <label className="workspace-search">
          <Search size={18} />
          <input
            ref={searchInputRef}
            aria-label={en ? 'Search workspace tools' : 'Cari tools workspace'}
            placeholder={en ? 'Find an AI suite, QA workflow, BA compiler, or topic…' : 'Cari suite AI, alur QA, kompilator BA, atau topik…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd>/</kbd>
        </label>
        <div className="workspace-trust">
          <ShieldCheck size={15} />
          {en ? 'Client-sovereign runtime · explicit network actions · zero lock-in' : 'Runtime client-sovereign · aksi jaringan eksplisit · tanpa lock-in'}
        </div>
      </header>
      <section className="dx-kpi-grid" aria-label={en ? 'Browser workspace summary' : 'Ringkasan workspace browser'}>
        <article className="dx-kpi-card">
          <div className="dx-kpi-copy">
            <span className="dx-kpi-label">{en ? 'CONTROL PLANE GATE' : 'GERBANG CONTROL PLANE'}</span>
            <strong className="dx-kpi-value">{pulse.controlPlaneDone}/{pulse.controlPlaneTotal}</strong>
            <span className="dx-kpi-sub">{en ? 'Personal release checks marked' : 'Checklist rilis pribadi selesai'}</span>
          </div>
          <SvgRingGauge
            value={Math.round((pulse.controlPlaneDone / pulse.controlPlaneTotal) * 100)}
            label={en ? 'Control plane readiness' : 'Kesiapan control plane'}
            tone={pulse.controlPlaneDone >= pulse.controlPlaneTotal ? 'emerald' : 'cyan'}
            size={60}
          />
        </article>
        <article className="dx-kpi-card">
          <div className="dx-kpi-copy">
            <span className="dx-kpi-label">{en ? 'COMMAND QUEUE' : 'ANTREAN KOMANDO'}</span>
            <strong className="dx-kpi-value">{pulse.commandTasksOpen}</strong>
            <span className="dx-kpi-sub">{en ? `${pulse.commandTasksActive} active · ${pulse.commandIncidentsOpen} open incidents` : `${pulse.commandTasksActive} aktif · ${pulse.commandIncidentsOpen} insiden`}</span>
          </div>
          <SvgRingGauge
            value={Math.max(0, 100 - pulse.commandIncidentsOpen * 25)}
            label={en ? 'Operational stability' : 'Stabilitas operasional'}
            tone={pulse.commandIncidentsOpen > 0 ? 'amber' : 'emerald'}
            size={60}
          />
        </article>
        <article className="dx-kpi-card">
          <div className="dx-kpi-copy">
            <span className="dx-kpi-label">{en ? 'LOCAL ARTIFACTS' : 'ARTIFAK LOKAL'}</span>
            <strong className="dx-kpi-value">{pulse.qualityReportsCount + pulse.sbomSnapshotsCount}</strong>
            <span className="dx-kpi-sub">{en ? `${pulse.catalogServicesCount} services · ${pulse.roadmapDoneCount} roadmap items` : `${pulse.catalogServicesCount} layanan · ${pulse.roadmapDoneCount} item roadmap`}</span>
          </div>
          <SvgRingGauge
            value={Math.min(100, (pulse.qualityReportsCount + pulse.sbomSnapshotsCount) * 20)}
            label={en ? 'Local evidence coverage' : 'Cakupan bukti lokal'}
            tone="cyan"
            size={60}
          />
        </article>
      </section>
      <section className="workspace-section">
        <div className="workspace-section-heading">
          <div>
            <span className="section-kicker">{en ? 'GLOBAL AI TOOLCHAIN' : 'TOOLCHAIN AI GLOBAL'}</span>
            <h2>{en ? 'Engineering toolkit' : 'Toolkit engineering'}</h2>
          </div>
          <span className="workspace-result-count">{visible.length} tools</span>
        </div>
        <div className="workspace-role-bar" role="group" aria-label={en ? 'Filter tools by role' : 'Filter tool berdasarkan peran'}>
          <span className="workspace-role-label">{en ? 'ROLE ONBOARDING' : 'PERAN TIM'}</span>
          {roleOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className={'workspace-role-pill' + (role === option.id ? ' active' : '')}
              aria-pressed={role === option.id}
              onClick={() => setRole(option.id)}
            >
              {en ? option.labelEn : option.labelId}
            </button>
          ))}
        </div>
        <div className="workspace-filters">
          {categories.map(x => (
            <button type="button" key={x} className={category === x ? 'active' : ''} onClick={() => setCategory(x)}>
              {categoryLabel(x)}
            </button>
          ))}
        </div>
        <div className="workspace-grid">
          {visible.map((x, i) => {
            const Icon = x.icon
            return (
              <Link className="workspace-card" to={x.route} key={x.id}>
                <div className="workspace-card-top">
                  <span className="workspace-icon">
                    <Icon size={19} />
                  </span>
                  <span className="workspace-card-index">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <span className="workspace-card-category">{en ? x.category : x.categoryId}</span>
                <h3>{en ? x.title : x.titleId}</h3>
                <p>{en ? x.description : x.descriptionId}</p>
                <span className="workspace-open">
                  {en ? 'Open workspace' : 'Buka workspace'} <ArrowRight size={15} />
                </span>
              </Link>
            )
          })}
        </div>
        {!visible.length && <p className="devtools-footnote">{en ? 'No matching tools. Try another search.' : 'Tidak ada tool yang cocok. Coba kata kunci lain.'}</p>}
      </section>
      <aside className="workspace-note">
        <Activity size={18} />
        <div>
          <strong>{en ? 'Autonomous engineering loop' : 'Siklus engineering terpadu'}</strong>
          <p>
            {en
              ? 'Architect distributed boundaries, synthesize QA suites, compile BA specs, and ship with measurable confidence.'
              : 'Rancang arsitektur, sintesis suite QA, kompilasi spesifikasi BA, dan rilis dengan keyakinan terukur.'}
          </p>
        </div>
        <Link to="/knowledge-graph">
          {en ? 'Explore connections' : 'Jelajahi koneksi'} <ArrowRight size={15} />
        </Link>
      </aside>
    </main>
  )
}

type Saved = { id: string; name: string; method: string; url: string; headers: string; body: string; date: string }
const key = 'dreamex-api-collections-v1'
const secret = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key)$/i
function readSaved(): Saved[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string' && typeof x.url === 'string') : []
  } catch {
    return []
  }
}

function toPostmanHeaderList(rawHeadersJson: string): Array<{ key: string; value: string }> {
  try {
    const parsed = JSON.parse(rawHeadersJson || '{}') as Record<string, unknown>
    return Object.entries(parsed)
      .filter(([k, v]) => !secret.test(k) && typeof v === 'string')
      .map(([k, v]) => ({ key: k, value: String(v) }))
  } catch {
    return []
  }
}

export function ApiPlaygroundPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [headers, setHeaders] = useState('{\n  "Accept": "application/json"\n}')
  const [body, setBody] = useState('')
  const [name, setName] = useState('Example request')
  const [saved, setSaved] = useState<Saved[]>(readSaved)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{
    status: number
    statusText: string
    ms: number
    size: number
    headers: Record<string, string>
    body: string
    truncated: boolean
  } | null>(null)
  const [tab, setTab] = useState<'body' | 'headers'>('body')

  const send = async () => {
    setError('')
    setMessage('')
    setResponse(null)
    let target: URL
    let h: Record<string, string>
    try {
      target = new URL(url.trim())
      if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
        throw new Error(en ? 'Use HTTP(S), without embedded credentials.' : 'Gunakan HTTP(S), tanpa kredensial dalam URL.')
      }
      const raw: unknown = JSON.parse(headers || '{}')
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(en ? 'Headers must be a JSON object.' : 'Header harus berupa objek JSON.')
      }
      h = {}
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v !== 'string' || /[\r\n]/.test(k + v)) throw new Error('Header values must be strings without line breaks.')
        h[k] = v
      }
      if (Object.keys(h).length > 50) throw new Error('Maximum 50 headers allowed.')
    } catch (e) {
      setError((en ? 'Request setup: ' : 'Konfigurasi request: ') + (e instanceof Error ? e.message : 'Invalid input'))
      return
    }
    if (['GET', 'HEAD'].includes(method) && body.trim()) {
      setError(en ? 'GET and HEAD cannot include a body.' : 'GET dan HEAD tidak dapat memiliki body.')
      return
    }
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 15000)
    const start = performance.now()
    setLoading(true)
    try {
      const res = await fetch(target, {
        method,
        headers: h,
        body: ['GET', 'HEAD'].includes(method) ? undefined : body || undefined,
        signal: ctrl.signal,
        credentials: 'omit',
        mode: 'cors',
        cache: 'no-store',
      })
      const rh = Object.fromEntries([...res.headers.entries()].sort(([a], [b]) => a.localeCompare(b)))
      let text = ''
      let size = 0
      let truncated = false
      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        try {
          while (true) {
            const part = await reader.read()
            if (part.done) break
            size += part.value.byteLength
            if (size > 1048576) {
              text += decoder.decode(part.value.slice(0, Math.max(0, 1048576 - size + part.value.byteLength)), { stream: true })
              truncated = true
              await reader.cancel()
              break
            }
            text += decoder.decode(part.value, { stream: true })
          }
          text += decoder.decode()
        } finally {
          reader.releaseLock()
        }
      }
      setResponse({ status: res.status, statusText: res.statusText, ms: Math.round(performance.now() - start), size, headers: rh, body: text, truncated })
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'AbortError'
          ? en
            ? 'Request timed out after 15 seconds.'
            : 'Request melewati batas waktu 15 detik.'
          : en
            ? 'Request failed. CORS, browser network policies, or the target may block it; no proxy is used.'
            : 'Request gagal. CORS, kebijakan jaringan browser, atau target mungkin memblokirnya; tidak ada proxy.',
      )
    } finally {
      window.clearTimeout(timer)
      setLoading(false)
    }
  }

  const save = () => {
    let safe: string
    try {
      safe = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(headers || '{}')).filter(([k]) => !secret.test(k))), null, 2)
    } catch {
      setError(en ? 'Fix headers JSON before saving.' : 'Perbaiki JSON header sebelum menyimpan.')
      return
    }
    const item: Saved = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()),
      name: name.trim().slice(0, 80) || 'Untitled request',
      method,
      url,
      headers: safe,
      body,
      date: new Date().toISOString(),
    }
    const next = [item, ...saved].slice(0, 50)
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setSaved(next)
      setMessage(safe !== headers ? (en ? 'Saved locally; sensitive headers were omitted.' : 'Disimpan lokal; header sensitif dihilangkan.') : en ? 'Saved in this browser.' : 'Disimpan di browser ini.')
    } catch {
      setError('Local storage unavailable.')
    }
  }

  const exportPostman = () => {
    const entries: Saved[] = saved.length
      ? saved
      : [
          {
            id: 'active-request',
            name: name.trim() || 'DreamEx API Request',
            method,
            url,
            headers,
            body,
            date: new Date().toISOString(),
          },
        ]
    const collection = {
      info: {
        name: 'DreamEx API Playground Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: entries.map(entry => ({
        name: entry.name,
        request: {
          method: entry.method,
          header: toPostmanHeaderList(entry.headers),
          url: entry.url,
          ...(!['GET', 'HEAD'].includes(entry.method) && entry.body ? { body: { mode: 'raw', raw: entry.body } } : {}),
        },
      })),
    }
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = 'dreamex-api.postman_collection.json'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    setMessage(en ? 'Exported Postman v2.1 collection (.json). Sensitive headers excluded.' : 'Koleksi Postman v2.1 (.json) diekspor tanpa header sensitif.')
  }

  const load = (x: Saved) => {
    setName(x.name)
    setMethod(x.method)
    setUrl(x.url)
    setHeaders(x.headers)
    setBody(x.body)
    setResponse(null)
    setMessage(en ? 'Request loaded.' : 'Request dimuat.')
  }
  const remove = (id: string) => {
    const next = saved.filter(x => x.id !== id)
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setSaved(next)
    } catch {
      setError('Local storage unavailable.')
    }
  }

  return (
    <main id="main-content" className="container api-page">
      <header className="workspace-hero api-hero">
        <span className="section-kicker">
          <Zap size={14} /> API ENGINEERING / CLIENT-SIDE PLAYGROUND
        </span>
        <h1>
          {en ? (
            <>
              Explore APIs.
              <br />
              <span>Understand responses.</span>
            </>
          ) : (
            <>
              Jelajahi API.
              <br />
              <span>Pahami response.</span>
            </>
          )}
        </h1>
        <p>{en ? 'Requests run directly from your browser. No server-side proxy or hidden relay.' : 'Request dikirim langsung dari browser. Tidak ada proxy server atau relay tersembunyi.'}</p>
      </header>
      <aside className="api-security-notice">
        <ShieldCheck size={19} />
        <div>
          <strong>{en ? 'Security & browser limits' : 'Keamanan & batasan browser'}</strong>
          <p>
            {en
              ? 'Never paste production secrets on shared devices. Collections remain in this browser profile. Authorization, cookie, and API-key headers are omitted when saving. Requests use credentials: omit; CORS still applies.'
              : 'Jangan tempelkan secret produksi pada perangkat bersama. Koleksi tersimpan di profil browser ini. Header authorization, cookie, dan API key dihilangkan saat menyimpan. Request memakai credentials: omit; CORS tetap berlaku.'}
          </p>
        </div>
      </aside>
      <section className="api-workbench">
        <div className="api-request-head">
          <span className="section-kicker">01 / REQUEST</span>
          <label className="lab-field api-name-field">
            {en ? 'Request name' : 'Nama request'}
            <input aria-label={en ? 'Request name' : 'Nama request'} value={name} onChange={e => setName(e.target.value)} maxLength={80} />
          </label>
        </div>
        <div className="api-url-row">
          <label className="lab-field api-method-field">
            Method
            <select aria-label={en ? 'HTTP method' : 'Method HTTP'} value={method} onChange={e => setMethod(e.target.value)}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="lab-field api-url-field">
            URL
            <input aria-label={en ? 'Request URL' : 'URL request'} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/v1/resource" />
          </label>
          <button type="button" className="button button-primary api-send" onClick={() => void send()} disabled={loading}>
            {loading ? <Activity size={16} /> : <Zap size={16} />} {loading ? (en ? 'Sending…' : 'Mengirim…') : en ? 'Send request' : 'Kirim request'}
          </button>
        </div>
        <div className="api-editors">
          <label className="lab-field">
            {en ? 'Request headers (JSON)' : 'Header request (JSON)'}
            <textarea aria-label={en ? 'Request headers JSON' : 'JSON header request'} rows={6} spellCheck={false} value={headers} onChange={e => setHeaders(e.target.value)} />
          </label>
          <label className="lab-field">
            {en ? 'Request body' : 'Body request'}
            <textarea aria-label={en ? 'Request body' : 'Body request'} rows={6} value={body} onChange={e => setBody(e.target.value)} disabled={['GET', 'HEAD'].includes(method)} placeholder="JSON or text" />
          </label>
        </div>
        <div className="api-actions">
          <button type="button" className="button button-secondary" onClick={save}>
            <Bookmark size={15} />
            {en ? 'Save to collection' : 'Simpan ke koleksi'}
          </button>
          <button type="button" className="button button-secondary" onClick={exportPostman}>
            <FileJson size={15} />
            {en ? 'Export Postman v2.1' : 'Ekspor Postman v2.1'}
          </button>
          <span className="api-hint">1 MiB response cap · 15s timeout</span>
        </div>
        {error && (
          <p role="alert" className="lab-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="lab-copy-status">
            {message}
          </p>
        )}
      </section>
      <section className="api-response">
        <div className="workspace-section-heading">
          <div>
            <span className="section-kicker">02 / RESPONSE</span>
            <h2>{en ? 'Response inspector' : 'Pemeriksa response'}</h2>
          </div>
          {response && (
            <span className={'api-status ' + (response.status < 400 ? 'good' : 'bad')}>
              {response.status} {response.statusText}
            </span>
          )}
        </div>
        {response ? (
          <>
            <div className="api-response-stats">
              <div>
                <strong>{response.ms} ms</strong>
                <span>Duration</span>
              </div>
              <div>
                <strong>{(response.size / 1024).toFixed(1)} KB</strong>
                <span>Received{response.truncated ? ' · truncated' : ''}</span>
              </div>
              <div>
                <strong>{response.headers['content-type'] || '—'}</strong>
                <span>Content-Type</span>
              </div>
            </div>
            <div className="dx-kpi-card" style={{ margin: '12px 0' }}>
              <div className="dx-kpi-copy">
                <span className="dx-kpi-label">{en ? 'EXCHANGE STATUS HEALTH' : 'KESEHATAN STATUS PERTUKARAN'}</span>
                <strong className="dx-kpi-value">{response.status} {response.statusText}</strong>
                <span className="dx-kpi-sub">{en ? `Completed in ${response.ms} ms (${(response.size / 1024).toFixed(1)} KB)` : `Selesai dalam ${response.ms} ms (${(response.size / 1024).toFixed(1)} KB)`}</span>
              </div>
              <SvgRingGauge
                value={response.status < 300 ? 100 : response.status < 400 ? 85 : response.status < 500 ? 45 : 15}
                label={en ? 'HTTP response status indicator' : 'Indikator status response HTTP'}
                tone={response.status < 400 ? 'emerald' : response.status < 500 ? 'amber' : 'rose'}
                size={58}
              />
            </div>
            <div className="api-response-tabs">
              <button type="button" className={tab === 'body' ? 'active' : ''} onClick={() => setTab('body')}>
                Body
              </button>
              <button type="button" className={tab === 'headers' ? 'active' : ''} onClick={() => setTab('headers')}>
                Headers
              </button>
              <button
                type="button"
                className="copy-link-button"
                onClick={() => void navigator.clipboard.writeText(response.body).then(() => setMessage('Copied.')).catch(() => setMessage('Clipboard access blocked.'))}
              >
                <Copy size={14} />
                Copy body
              </button>
            </div>
            <pre className="lab-output api-response-body">{tab === 'body' ? response.body || '(empty response body)' : JSON.stringify(response.headers, null, 2)}</pre>
          </>
        ) : (
          <div className="devtools-empty">
            <Zap size={22} />
            <p>{en ? 'Send a request to inspect status, duration, headers, and response body.' : 'Kirim request untuk memeriksa status, durasi, header, dan body response.'}</p>
          </div>
        )}
      </section>
      <section className="api-collection">
        <div className="workspace-section-heading">
          <div>
            <span className="section-kicker">03 / LOCAL COLLECTION</span>
            <h2>{en ? 'Saved requests' : 'Request tersimpan'}</h2>
          </div>
          <span className="workspace-result-count">{saved.length}/50</span>
        </div>
        {saved.length ? (
          <div className="api-collection-list">
            {saved.map(x => (
              <article className="api-collection-item" key={x.id}>
                <span className="api-method-pill">{x.method}</span>
                <div className="api-collection-copy">
                  <strong>{x.name}</strong>
                  <code>{x.url}</code>
                  <small>{new Date(x.date).toLocaleString()}</small>
                </div>
                <button type="button" className="button button-secondary" onClick={() => load(x)}>
                  {en ? 'Load' : 'Muat'}
                </button>
                <button type="button" className="api-delete" aria-label={'Delete ' + x.name} onClick={() => remove(x.id)}>
                  <X size={15} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="devtools-footnote">{en ? 'Saved requests appear here. Sensitive headers are omitted when saving.' : 'Request tersimpan muncul di sini. Header sensitif dihilangkan saat menyimpan.'}</p>
        )}
      </section>
      <ApiContractStudio />
    </main>
  )
}

export function PerformanceObservatoryPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [snapshot, setSnapshot] = useState<{
    timing: Record<string, number>
    resources: Array<{ name: string; duration: number; size: number; type: string }>
    vitals: Record<string, { value: number; rating: string }>
  } | null>(null)
  const capture = () => {
    const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const timing: Record<string, number> = {}
    if (n) {
      timing['DNS lookup'] = Math.max(0, n.domainLookupEnd - n.domainLookupStart)
      timing['TCP connection'] = Math.max(0, n.connectEnd - n.connectStart)
      timing['Time to first byte'] = Math.max(0, n.responseStart - n.requestStart)
      timing['DOM interactive'] = Math.max(0, n.domInteractive - n.startTime)
      timing['Load event'] = Math.max(0, n.loadEventEnd - n.startTime)
    }
    const resources = performance
      .getEntriesByType('resource')
      .map(e => {
        const x = e as PerformanceResourceTiming
        let type = 'other'
        try {
          type = new URL(x.name).origin === location.origin ? 'same-origin' : 'third-party'
        } catch {
          type = 'other'
        }
        return { name: x.name, duration: Math.round(x.duration), size: x.transferSize || x.encodedBodySize || 0, type }
      })
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 25)
    const vitals: Record<string, { value: number; rating: string }> = {}
    const lcp = performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]
    if (lcp) {
      const value = Math.round(lcp.startTime)
      vitals.LCP = { value, rating: value <= 2500 ? 'good' : value <= 4000 ? 'needs improvement' : 'poor' }
    }
    const shifts = performance.getEntriesByType('layout-shift') as (PerformanceEntry & { value?: number; hadRecentInput?: boolean })[]
    if (shifts.length) {
      const value = Number(shifts.filter(x => !x.hadRecentInput).reduce((sum, x) => sum + (x.value || 0), 0).toFixed(3))
      vitals.CLS = { value, rating: value <= 0.1 ? 'good' : value <= 0.25 ? 'needs improvement' : 'poor' }
    }
    const events = performance.getEntriesByType('event') as (PerformanceEntry & { duration?: number; interactionId?: number })[]
    const map = new Map<number, number>()
    for (const e of events) if (e.interactionId) map.set(e.interactionId, Math.max(map.get(e.interactionId) || 0, e.duration || 0))
    if (map.size) {
      const value = Math.round([...map.values()].sort((a, b) => b - a)[Math.min(9, Math.floor(map.size / 50))] || 0)
      vitals.INP = { value, rating: value <= 200 ? 'good' : value <= 500 ? 'needs improvement' : 'poor' }
    }
    setSnapshot({ timing, resources, vitals })
  }
  useEffect(() => {
    capture()
  }, [])
  return (
    <main id="main-content" className="container performance-page">
      <header className="workspace-hero">
        <span className="section-kicker">
          <Activity size={14} /> PERFORMANCE ENGINEERING / OBSERVATORY
        </span>
        <h1>
          {en ? (
            <>
              Measure what{' '}
              <br />
              <span>users experience.</span>
            </>
          ) : (
            <>
              Ukur yang
              <br />
              <span>dialami pengguna.</span>
            </>
          )}
        </h1>
        <p>{en ? 'Inspect browser navigation timing, resource transfer, and Web Vitals exposed to this page. This is not a synthetic lab score.' : 'Periksa navigation timing, transfer resource, dan Web Vitals yang tersedia di browser. Ini bukan skor lab sintetis.'}</p>
      </header>
      <aside className="api-security-notice">
        <AlertTriangle size={19} />
        <div>
          <strong>{en ? 'Measurement scope' : 'Cakupan pengukuran'}</strong>
          <p>{en ? 'This page cannot run a full Lighthouse audit for arbitrary URLs. Use Lighthouse CLI or PageSpeed Insights for repeatable lab audits. Browser-exposed Web Vitals may be incomplete; INP needs interactions.' : 'Halaman ini tidak dapat menjalankan audit Lighthouse penuh untuk URL sembarang. Gunakan Lighthouse CLI atau PageSpeed Insights untuk audit lab. Web Vitals browser mungkin tidak lengkap; INP membutuhkan interaksi.'}</p>
        </div>
      </aside>
      <div className="performance-toolbar">
        <div>
          <span className="section-kicker">LIVE PAGE SNAPSHOT</span>
          <h2>{en ? 'Browser performance entries' : 'Entry performa browser'}</h2>
        </div>
        <button type="button" className="button button-primary" onClick={capture}>
          <Activity size={15} />
          {en ? 'Refresh snapshot' : 'Segarkan snapshot'}
        </button>
      </div>
      {snapshot && (
        <>
          <section className="performance-vitals">
            {['LCP', 'CLS', 'INP'].map(name => {
              const v = snapshot.vitals[name]
              return (
                <article className="performance-vital" key={name}>
                  <span>{name}</span>
                  <strong>{v ? String(v.value) + (name === 'CLS' ? '' : ' ms') : '—'}</strong>
                  <small className={v ? 'vital-' + v.rating.replaceAll(' ', '-') : 'vital-unknown'}>{v ? v.rating : en ? 'Not available yet' : 'Belum tersedia'}</small>
                  <p>{name === 'LCP' ? 'Largest Contentful Paint' : name === 'CLS' ? 'Cumulative Layout Shift' : 'Interaction to Next Paint'}</p>
                </article>
              )
            })}
          </section>
          <section className="performance-metrics">
            <div className="workspace-section-heading">
              <div>
                <span className="section-kicker">NAVIGATION TIMING</span>
                <h2>{en ? 'Page lifecycle' : 'Siklus halaman'}</h2>
              </div>
            </div>
            <SvgSparkBars
              title={en ? 'Navigation Phase Timing (ms)' : 'Timing Fase Navigasi (ms)'}
              meta={`${snapshot.resources.length} ${en ? 'resources sampled' : 'resource disampel'}`}
              items={Object.entries(snapshot.timing).slice(0, 6).map(([name, value]) => ({
                label: name.slice(0, 10),
                value: Math.round(value),
                suffix: 'ms',
                tone: value > 1000 ? 'amber' : 'cyan',
              }))}
            />
            <div className="performance-timing-list">
              {Object.entries(snapshot.timing).map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{Math.round(value)} ms</strong>
                  <i>
                    <span style={{ width: Math.min(100, (value / Math.max(1, ...Object.values(snapshot.timing))) * 100) + '%' }} />
                  </i>
                </div>
              ))}
            </div>
          </section>
          <section className="performance-metrics">
            <div className="workspace-section-heading">
              <div>
                <span className="section-kicker">RESOURCE WATERFALL / TOP 25</span>
                <h2>{en ? 'Slowest resources' : 'Resource paling lambat'}</h2>
              </div>
            </div>
            <div className="performance-resource-list">
              {snapshot.resources.map((x, i) => (
                <article key={x.name + i}>
                  <span className="performance-resource-index">{String(i + 1).padStart(2, '0')}</span>
                  <div className="performance-resource-copy">
                    <code title={x.name}>{x.name}</code>
                    <div>
                      <span>{x.type}</span>
                      <span>{(x.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <strong>{x.duration} ms</strong>
                </article>
              ))}
            </div>
          </section>
          <div className="performance-actions">
            <a className="button button-primary" href={'https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(location.href)} target="_blank" rel="noreferrer">
              {en ? 'Open PageSpeed Insights' : 'Buka PageSpeed Insights'} <ArrowRight size={15} />
            </a>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
                a.download = 'dreamex-performance-snapshot.json'
                a.click()
                URL.revokeObjectURL(a.href)
              }}
            >
              <Download size={15} />
              {en ? 'Export snapshot' : 'Ekspor snapshot'}
            </button>
          </div>
          <AiCopilotPanel
            kicker={en ? 'PERFORMANCE CO-PILOT' : 'KO-PILOT PERFORMA'}
            title={en ? 'Runtime Performance Brief' : 'Ringkasan Performa Runtime'}
            summaryLines={[
              en ? `Observed ${snapshot.resources.length} browser resource transfer entries.` : `Mengamati ${snapshot.resources.length} entri transfer resource browser.`,
              en ? `Exposed Web Vitals: LCP=${snapshot.vitals.LCP ? `${snapshot.vitals.LCP.value}ms` : 'n/a'}, CLS=${snapshot.vitals.CLS ? snapshot.vitals.CLS.value : 'n/a'}, INP=${snapshot.vitals.INP ? `${snapshot.vitals.INP.value}ms` : 'n/a'}.` : `Web Vitals browser: LCP=${snapshot.vitals.LCP ? `${snapshot.vitals.LCP.value}ms` : 'n/a'}, CLS=${snapshot.vitals.CLS ? snapshot.vitals.CLS.value : 'n/a'}, INP=${snapshot.vitals.INP ? `${snapshot.vitals.INP.value}ms` : 'n/a'}.`,
              snapshot.resources[0]
                ? (en ? `Slowest captured asset: ${snapshot.resources[0].name.split('/').pop() || snapshot.resources[0].name} (${snapshot.resources[0].duration} ms).` : `Aset paling lambat: ${snapshot.resources[0].name.split('/').pop() || snapshot.resources[0].name} (${snapshot.resources[0].duration} ms).`)
                : (en ? 'No slow resource transfers recorded yet.' : 'Belum ada transfer resource yang lambat.'),
            ]}
            recommendations={[
              ...(snapshot.resources.slice(0, 2).some(r => r.duration > 300) ? [en ? 'Inspect heavy chunks over 300ms for lazy splitting or caching optimization.' : 'Periksa aset di atas 300ms untuk optimasi code-splitting atau caching.'] : [en ? 'Sampled resource load times appear brisk in this browser session.' : 'Waktu muat resource yang disampel tampak cepat pada sesi browser ini.']),
              en ? 'Run Lighthouse CI or PageSpeed Insights for repeatable Core Web Vitals lab comparisons.' : 'Jalankan Lighthouse CI atau PageSpeed Insights untuk pengukuran lab terstandar.',
            ]}
            systemPrompt="You are a web performance engineer. Summarize runtime navigation timing & slowest assets concisely without claiming lab Lighthouse scores."
            userPrompt={`Resources=${snapshot.resources.length}. LCP=${snapshot.vitals.LCP?.value ?? 'n/a'}, CLS=${snapshot.vitals.CLS?.value ?? 'n/a'}, INP=${snapshot.vitals.INP?.value ?? 'n/a'}. Top slowest: ${snapshot.resources.slice(0, 3).map(r => `${r.name.split('/').pop()}(${r.duration}ms)`).join(', ') || 'none'}. Give 3 pragmatic tips.`}
            en={en}
          />
        </>
      )}
    </main>
  )
}

type Node = {
  id: string
  title: string
  kind: 'concept' | 'article' | 'tool'
  description: string
  route: string
  tags: string[]
  x: number
  y: number
}

const nodes: Node[] = [
  { id: 'qa', title: 'Quality Engineering', kind: 'concept', description: 'Risk, verification, test strategy, and quality signals.', route: '/learn', tags: ['testing', 'automation', 'release'], x: 20, y: 36 },
  { id: 'software', title: 'Software Engineering', kind: 'concept', description: 'Maintainability, correctness, and sustainable delivery.', route: '/learn', tags: ['architecture', 'ci/cd', 'typescript'], x: 20, y: 142 },
  { id: 'cyber', title: 'Cybersecurity', kind: 'concept', description: 'Threat modeling, least privilege, and secure defaults.', route: '/learn', tags: ['security', 'threat modeling'], x: 20, y: 248 },
  { id: 'ai', title: 'Reliable AI', kind: 'concept', description: 'Evaluate AI features with representative datasets and regression checks.', route: '/learn', tags: ['ai', 'evaluation', 'quality'], x: 20, y: 354 },

  { id: 'playwright', title: 'Playwright Architecture', kind: 'article', description: 'Stable browser automation and maintainable test boundaries.', route: '/blog/playwright-test-architecture', tags: ['qa', 'automation', 'e2e'], x: 300, y: 26 },
  { id: 'qa-foundations', title: 'QA Automation Foundations', kind: 'article', description: 'A practical foundation for automation strategy and coverage.', route: '/blog/qa-automation-foundations', tags: ['qa', 'testing'], x: 300, y: 102 },
  { id: 'typescript', title: 'Maintainable TypeScript', kind: 'article', description: 'Use clear types and contracts to lower change risk.', route: '/blog/typescript-for-maintainable-projects', tags: ['typescript', 'architecture'], x: 300, y: 178 },
  { id: 'secure', title: 'Secure CI/CD', kind: 'article', description: 'Pipeline permissions and practical delivery controls.', route: '/blog/secure-ci-cd-basics', tags: ['security', 'ci/cd'], x: 300, y: 254 },
  { id: 'ai-eval', title: 'Evaluating AI Features', kind: 'article', description: 'Design evaluation cases for AI-powered behavior.', route: '/blog/evaluating-ai-features', tags: ['ai', 'evaluation', 'qa'], x: 300, y: 330 },

  { id: 'lab', title: 'Engineering Lab', kind: 'tool', description: 'Generate test cases, bug reports, API matrices, and release scorecards.', route: '/lab', tags: ['qa', 'release', 'testing'], x: 600, y: 40 },
  { id: 'api', title: 'API Playground', kind: 'tool', description: 'Explore HTTP contracts, headers, and payload behavior.', route: '/api-playground', tags: ['api', 'testing', 'http'], x: 600, y: 128 },
  { id: 'jwt', title: 'JWT Inspector', kind: 'tool', description: 'Decode claims locally; decoding does not verify signatures.', route: '/devtools', tags: ['security', 'jwt', 'api'], x: 600, y: 216 },
  { id: 'performance', title: 'Performance Observatory', kind: 'tool', description: 'Inspect browser timing and available Web Vitals.', route: '/performance', tags: ['performance', 'lcp', 'cls'], x: 600, y: 304 },
  { id: 'web-quality', title: 'Web Quality Observatory', kind: 'tool', description: 'Audit metadata, accessibility, and responsive foundations.', route: '/observatory', tags: ['accessibility', 'seo', 'quality'], x: 860, y: 216 },
]

const edges: [string, string][] = [
  ['qa', 'playwright'],
  ['qa', 'qa-foundations'],
  ['qa', 'lab'],
  ['qa', 'api'],
  ['software', 'typescript'],
  ['software', 'secure'],
  ['cyber', 'secure'],
  ['cyber', 'jwt'],
  ['ai', 'ai-eval'],
  ['ai', 'qa'],
  ['performance', 'web-quality'],
  ['performance', 'software'],
  ['api', 'jwt'],
  ['playwright', 'lab'],
  ['ai-eval', 'performance'],
]

export function EngineeringKnowledgeGraphPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [selected, setSelected] = useState('qa')
  const [zoom, setZoom] = useState(1)
  const [statusMsg, setStatusMsg] = useState('')
  const svgRef = useRef<SVGSVGElement | null>(null)

  const visible = nodes.filter(
    x => (kind === 'all' || x.kind === kind) && (x.title + ' ' + x.description + ' ' + x.tags.join(' ')).toLowerCase().includes(query.trim().toLowerCase()),
  )
  const visibleIds = useMemo(() => new Set(visible.map(n => n.id)), [visible])
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [])
  const current = nodes.find(x => x.id === selected)
  const neighborIds = useMemo(() => new Set(edges.filter(e => e.includes(selected)).flatMap(e => e.filter(id => id !== selected))), [selected])
  const related = nodes.filter(x => neighborIds.has(x.id))

  const copyMermaid = async () => {
    const lines = [
      'flowchart LR',
      ...nodes.map(n => `  ${n.id.replaceAll('-', '_')}["${n.title}"]`),
      ...edges.map(([a, b]) => `  ${a.replaceAll('-', '_')} --> ${b.replaceAll('-', '_')}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(lines)
      setStatusMsg(en ? 'Copied Mermaid flowchart LR syntax to clipboard.' : 'Sintaks Mermaid flowchart LR disalin ke clipboard.')
    } catch {
      setStatusMsg(en ? 'Clipboard blocked; copy blocked in browser settings.' : 'Akses clipboard diblokir oleh pengaturan browser.')
    }
  }

  const downloadSvg = () => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgRef.current)
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = 'dreamex-knowledge-topology.svg'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    setStatusMsg(en ? 'Downloaded interactive SVG diagram.' : 'Diagram SVG interaktif berhasil diunduh.')
  }

  const NODE_W = 205
  const NODE_H = 54

  return (
    <main id="main-content" className="container knowledge-page">
      <header className="workspace-hero">
        <span className="section-kicker">
          <Share2 size={14} /> ENGINEERING KNOWLEDGE / GRAPH
        </span>
        <h1>
          {en ? (
            <>
              Follow the <span>connections.</span>
            </>
          ) : (
            <>
              Ikuti <span>keterkaitannya.</span>
            </>
          )}
        </h1>
        <p>{en ? 'Explore interactive architecture relationships between concepts, articles, and tools. Click any node in the topology canvas or grid.' : 'Jelajahi relasi arsitektur interaktif antara konsep, artikel, dan tools. Klik node pada kanvas topologi atau daftar grid.'}</p>
      </header>
      <div className="knowledge-controls">
        <label className="workspace-search">
          <Search size={17} />
          <input aria-label={en ? 'Search knowledge graph' : 'Cari knowledge graph'} placeholder={en ? 'Search concepts, tools, articles…' : 'Cari konsep, tools, artikel…'} value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <div className="workspace-filters">
          {[
            ['all', en ? 'All' : 'Semua'],
            ['concept', en ? 'Concepts' : 'Konsep'],
            ['article', en ? 'Articles' : 'Artikel'],
            ['tool', 'Tools'],
          ].map(([v, label]) => (
            <button type="button" key={v} className={kind === v ? 'active' : ''} onClick={() => setKind(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="kg-visual-card" aria-label={en ? 'Interactive node-link topology diagram' : 'Diagram topologi node-link interaktif'}>
        <div className="kg-toolbar">
          <div className="kg-toolbar-left">
            <span className="kg-toolbar-title">
              TOPOLOGY CANVAS · {nodes.length} NODES · {edges.length} EDGES
            </span>
          </div>
          <div className="kg-toolbar-actions">
            <button type="button" className="kg-tool-btn" onClick={() => setZoom(z => Math.max(0.75, Number((z - 0.15).toFixed(2))))} aria-label={en ? 'Zoom out graph' : 'Perkecil graf'}>
              <ZoomOut size={13} /> {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="kg-tool-btn" onClick={() => setZoom(z => Math.min(1.4, Number((z + 0.15).toFixed(2))))} aria-label={en ? 'Zoom in graph' : 'Perbesar graf'}>
              <ZoomIn size={13} />
            </button>
            <button type="button" className="kg-tool-btn" onClick={() => setZoom(1)}>
              <RotateCcw size={13} /> {en ? 'Reset' : 'Atur ulang'}
            </button>
            <button type="button" className="kg-tool-btn primary" onClick={() => void copyMermaid()}>
              {statusMsg.includes('Mermaid') ? <Check size={13} /> : <Copy size={13} />} {en ? 'Copy Mermaid' : 'Salin Mermaid'}
            </button>
            <button type="button" className="kg-tool-btn" onClick={downloadSvg}>
              <Download size={13} /> SVG
            </button>
          </div>
        </div>
        <div className="kg-canvas-wrap">
          <svg
            ref={svgRef}
            className="kg-svg"
            viewBox="0 0 1100 430"
            role="listbox"
            aria-label={en ? 'DreamEx Engineering Knowledge Topology Graph' : 'Graf Topologi Pengetahuan DreamEx'}
            style={{ transform: `scale(${zoom})` }}
          >
            {edges.map(([sourceId, targetId]) => {
              const s = nodeMap.get(sourceId)
              const t = nodeMap.get(targetId)
              if (!s || !t) return null
              const x1 = s.x + NODE_W
              const y1 = s.y + NODE_H / 2
              const x2 = t.x
              const y2 = t.y + NODE_H / 2
              const mx = (x1 + x2) / 2
              const active = sourceId === selected || targetId === selected
              const dimmed = !visibleIds.has(sourceId) || !visibleIds.has(targetId)
              return (
                <path
                  key={`${sourceId}-${targetId}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  className={'kg-edge' + (active ? ' is-active' : '') + (dimmed ? ' is-dim' : '')}
                />
              )
            })}
            {nodes.map(node => {
              const isSelected = node.id === selected
              const isNeighbor = neighborIds.has(node.id)
              const hiddenByFilter = !visibleIds.has(node.id)
              const dimmed = hiddenByFilter || (!isSelected && !isNeighbor && selected !== '')
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={'kg-node-group kind-' + node.kind + (isSelected ? ' is-selected' : '') + (dimmed ? ' is-dim' : '')}
                  onClick={() => setSelected(node.id)}
                  tabIndex={0}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${node.title} (${node.kind})`}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(node.id)
                    }
                  }}
                >
                  <rect width={NODE_W} height={NODE_H} rx={11} className="kg-node-rect" />
                  <text x={14} y={20} className="kg-node-kind">
                    {node.kind.toUpperCase()}
                  </text>
                  <text x={14} y={39} className="kg-node-title">
                    {node.title}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        {statusMsg && (
          <div className="kg-mermaid-status" role="status">
            {statusMsg}
          </div>
        )}
      </section>

      <SvgStackedBar
        title={en ? 'Graph Topology Mix' : 'Komposisi Topologi Graf'}
        totalLabel={`${visible.length} nodes · ${edges.length} ${en ? 'edges' : 'koneksi'}`}
        segments={[
          { label: en ? 'Concepts' : 'Konsep', value: visible.filter(n => n.kind === 'concept').length, color: '#a78bfa' },
          { label: en ? 'Articles' : 'Artikel', value: visible.filter(n => n.kind === 'article').length, color: '#38bdf8' },
          { label: en ? 'Tools' : 'Tools', value: visible.filter(n => n.kind === 'tool').length, color: '#c5ff70' },
        ]}
      />

      <div className="knowledge-layout">
        <section className="knowledge-network" aria-label={en ? 'Interactive knowledge graph nodes' : 'Node knowledge graph interaktif'}>
          <div className="knowledge-network-top">
            <span>KNOWLEDGE MAP</span>
            <span>{visible.length} nodes</span>
          </div>
          <div className="knowledge-node-grid">
            {visible.map(x => (
              <button
                type="button"
                key={x.id}
                className={'knowledge-node kind-' + x.kind + (selected === x.id ? ' selected' : '')}
                onClick={() => setSelected(x.id)}
                aria-pressed={selected === x.id}
              >
                <span>{x.kind.toUpperCase()}</span>
                <strong>{x.title}</strong>
                <small>{x.tags.join(' · ')}</small>
              </button>
            ))}
          </div>
          <p className="knowledge-graph-footnote">{en ? 'Curated relationships with live topology exploration & Mermaid export.' : 'Relasi terkurasi lengkap dengan eksplorasi topologi langsung & ekspor Mermaid.'}</p>
        </section>
        <aside className="knowledge-detail">
          {current && (
            <>
              <span className="section-kicker">
                {en ? 'SELECTED NODE' : 'NODE TERPILIH'} / {current.kind.toUpperCase()}
              </span>
              <h2>{current.title}</h2>
              <p>{current.description}</p>
              <div className="knowledge-tags">
                {current.tags.map(x => (
                  <span key={x}>#{x}</span>
                ))}
              </div>
              <Link className="button button-primary" to={current.route}>
                {en ? 'Open resource' : 'Buka resource'} <ArrowRight size={15} />
              </Link>
              <div className="knowledge-related">
                <strong>
                  {en ? 'Connected resources' : 'Resource terhubung'} ({related.length})
                </strong>
                {related.map(x => (
                  <button
                    type="button"
                    key={x.id}
                    onClick={() => {
                      setSelected(x.id)
                      setKind('all')
                    }}
                  >
                    <span className={'knowledge-kind-dot kind-' + x.kind} />
                    <span>
                      <b>{x.title}</b>
                      <small>{x.kind}</small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
