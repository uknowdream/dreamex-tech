import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, BookOpen, Bookmark, BookmarkCheck, Braces, Check, ChevronUp, ChevronDown, Layers3, Command, Copy, Github, Home as HomeIcon, Search, Share2, ShieldCheck, Sparkles, Terminal, X, Zap, Rss, Activity, AlertTriangle, CheckCircle2, Download, ClipboardList, Network, Gauge } from 'lucide-react'
import { articles } from './articles'
import { articleTranslations } from './articleTranslations'
import { useLanguage } from './i18n'
import { EngineeringLaunchpad } from './EngineeringLaunchpad'
const EngineeringControlPlanePage = lazy(() => import('./EngineeringControlPlane').then(module => ({ default: module.EngineeringControlPlanePage })))
const QualityIntelligencePage = lazy(() => import('./QualityIntelligence').then(module => ({ default: module.QualityIntelligencePage })))
const ReliabilityCenterPage = lazy(() => import('./ReliabilityCenter').then(module => ({ default: module.ReliabilityCenterPage })))
const SupplyChainIntelligencePage = lazy(() => import('./SupplyChainIntelligence').then(module => ({ default: module.SupplyChainIntelligencePage })))
const EngineeringWorkspacePage = lazy(() => import('./EngineeringPlatform').then(module => ({ default: module.EngineeringWorkspacePage })))
const ApiPlaygroundPage = lazy(() => import('./EngineeringPlatform').then(module => ({ default: module.ApiPlaygroundPage })))
const PerformanceObservatoryPage = lazy(() => import('./EngineeringPlatform').then(module => ({ default: module.PerformanceObservatoryPage })))
const EngineeringKnowledgeGraphPage = lazy(() => import('./EngineeringPlatform').then(module => ({ default: module.EngineeringKnowledgeGraphPage })))
const EngineeringRoadmapPage = lazy(() => import('./EngineeringRoadmap').then(module => ({ default: module.EngineeringRoadmapPage })))
const EngineeringCommandCenterPage = lazy(() => import('./EngineeringCommandCenter').then(module => ({ default: module.EngineeringCommandCenterPage })))
const QAAutomationStudioPage = lazy(() => import('./EngineeringQualitySuite').then(module => ({ default: module.QAAutomationStudioPage })))
const SecurityCenterPage = lazy(() => import('./EngineeringQualitySuite').then(module => ({ default: module.SecurityCenterPage })))
const EngineeringIntelligencePage = lazy(() => import('./EngineeringIntelligence').then(module => ({ default: module.EngineeringIntelligencePage })))

const categories = ['Semua', 'Software Engineering', 'QA Automation', 'AI & Technology']
const categoryLabel = (category: string, language: 'id' | 'en') => {
  if (category === 'Semua') return language === 'en' ? 'All' : 'Semua'
  if (category === 'QA Automation') return language === 'en' ? 'QA Automation' : 'QA Automation'
  if (category === 'AI & Technology') return language === 'en' ? 'AI & Technology' : 'AI & Technology'
  return category
}

const READING_LIST_KEY = 'dreamex-reading-list-v1'
const READING_LIST_EVENT = 'dreamex-reading-list-updated'

const READING_PROGRESS_KEY = 'dreamex-reading-progress-v1'
const READING_PROGRESS_EVENT = 'dreamex-reading-progress-updated'

type ReadingProgressRecord = { slug: string; progress: number }

function readReadingProgress(): ReadingProgressRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(READING_PROGRESS_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const record = value as Partial<ReadingProgressRecord>
    if (typeof record.slug !== 'string' || !articles.some(article => article.slug === record.slug)) return null
    if (typeof record.progress !== 'number' || !Number.isFinite(record.progress) || record.progress < 5 || record.progress >= 100) return null
    return { slug: record.slug, progress: Math.round(record.progress) }
  } catch { return null }
}

function readSavedSlugs(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(READING_LIST_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === 'string' && articles.some(article => article.slug === slug)) : []
  } catch {
    return []
  }
}

function useReadingList() {
  const [savedSlugs, setSavedSlugs] = useState<string[]>(readSavedSlugs)
  useEffect(() => {
    const sync = () => setSavedSlugs(readSavedSlugs())
    window.addEventListener('storage', sync)
    window.addEventListener(READING_LIST_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(READING_LIST_EVENT, sync)
    }
  }, [])
  const toggleSaved = (slug: string) => {
    const current = readSavedSlugs()
    const next = current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug]
    try { window.localStorage.setItem(READING_LIST_KEY, JSON.stringify(next)) } catch { /* Keep the current session usable when storage is blocked. */ }
    setSavedSlugs(next)
    window.dispatchEvent(new Event(READING_LIST_EVENT))
  }
  return { savedSlugs, toggleSaved, isSaved: (slug: string) => savedSlugs.includes(slug) }
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function InstallAppButton() {
  const { language } = useLanguage()
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [status, setStatus] = useState('')
  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const installed = () => {
      setInstallPrompt(null)
      setStatus(language === 'en' ? 'DreamEx Tech is installed.' : 'DreamEx Tech berhasil dipasang.')
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', installed)
    }
  }, [language])
  const install = async () => {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      setStatus(choice.outcome === 'accepted'
        ? (language === 'en' ? 'Installation accepted.' : 'Pemasangan disetujui.')
        : (language === 'en' ? 'Installation was dismissed.' : 'Pemasangan dibatalkan.'))
    } catch {
      setStatus(language === 'en' ? 'Use your browser menu to install this app.' : 'Gunakan menu browser untuk memasang aplikasi ini.')
      setInstallPrompt(null)
    }
  }
  return <>{installPrompt && <button type="button" className="install-app-button" onClick={install}><Zap size={14} /> {language === 'en' ? 'Install app' : 'Pasang aplikasi'}</button>}{status && <span className="install-app-status" role="status">{status}</span>}</>
}

function Header() {
  const { language, setLanguage, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')
  const location = useLocation()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const previousPathRef = useRef(location.pathname)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const query = menuOpen ? navQuery.trim().toLocaleLowerCase() : ''
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href]'))
    const platform = nav.querySelector<HTMLDetailsElement>('.nav-platform')
    const summary = platform?.querySelector<HTMLElement>('summary')
    const intro = platform?.querySelector<HTMLElement>('.nav-mega-intro')
    const groups = Array.from(nav.querySelectorAll<HTMLElement>('.nav-mega-group'))
    const empty = nav.querySelector<HTMLElement>('.nav-search-empty')
    const resultCount = nav.querySelector<HTMLElement>('.nav-search-count')

    if (!query) {
      links.forEach(link => { link.hidden = false })
      groups.forEach(group => { group.hidden = false })
      if (intro) intro.hidden = false
      if (summary) summary.hidden = false
      if (platform) platform.hidden = false
      if (empty) empty.hidden = true
      if (resultCount) resultCount.hidden = true
      if (!menuOpen) setNavQuery('')
      return
    }

    links.forEach(link => { link.hidden = !link.textContent?.toLocaleLowerCase().includes(query) })
    groups.forEach(group => {
      group.hidden = !Array.from(group.querySelectorAll<HTMLAnchorElement>('a[href]')).some(link => !link.hidden)
    })
    if (intro) intro.hidden = !intro.textContent?.toLocaleLowerCase().includes(query)
    if (summary) summary.hidden = !summary.textContent?.toLocaleLowerCase().includes(query)
    if (platform) {
      const platformHasMatches = Boolean(platform.querySelector('.nav-mega-intro:not([hidden])')) ||
        Boolean(platform.querySelector('.nav-mega-group:not([hidden])'))
      platform.hidden = !platformHasMatches
      if (platformHasMatches) platform.open = true
    }
    const visibleLinks = links.filter(link => !link.hidden).length
    if (empty) empty.hidden = visibleLinks > 0
    if (resultCount) {
      resultCount.hidden = visibleLinks === 0
      resultCount.textContent = language === 'en'
        ? `${visibleLinks} destination${visibleLinks === 1 ? '' : 's'} found`
        : `${visibleLinks} tujuan ditemukan`
    }
  }, [menuOpen, navQuery, language])

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return
    previousPathRef.current = location.pathname
    setMenuOpen(false)
    document.querySelector('.nav-platform')?.removeAttribute('open')
  }, [location.pathname])

  useEffect(() => {
    const handlePlatformEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || menuOpen) return
      const platform = document.querySelector<HTMLDetailsElement>('.nav-platform')
      if (!platform?.open) return
      platform.open = false
      platform.querySelector<HTMLElement>('summary')?.focus()
    }
    document.addEventListener('keydown', handlePlatformEscape)
    return () => document.removeEventListener('keydown', handlePlatformEscape)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        window.requestAnimationFrame(() => menuButtonRef.current?.focus())
        return
      }
      if (event.key !== 'Tab') return
      const focusables = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])') ?? [])
        .filter(element => element.getClientRects().length > 0)
      if (!focusables.length) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  const closeDrawer = () => {
    setMenuOpen(false)
    window.requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  return <>
    {menuOpen && <button className="nav-backdrop" type="button" aria-label={language === 'en' ? 'Close navigation' : 'Tutup navigasi'} onClick={closeDrawer} />}
    <header className={menuOpen ? 'site-header navigation-open' : 'site-header'}>
      <div className="container nav-wrap">
        <Link className="brand" to="/" aria-label="DreamEx Tech beranda">
          <span className="brand-mark"><Braces size={21} /></span>
          <span>DreamEx<span className="brand-muted"> Tech</span></span>
          <span className="brand-beta">ENGINEERING NOTES</span>
        </Link>
        <button className="command-trigger" type="button" aria-keyshortcuts="Control+K Meta+K" aria-label={language === 'en' ? 'Search tools and articles' : 'Cari tools dan artikel'} onClick={() => { setMenuOpen(false); document.querySelector('.nav-platform')?.removeAttribute('open'); window.dispatchEvent(new Event('dreamex-open-command-palette')) }}>
          <Search size={16} /><span>{language === 'en' ? 'Search tools' : 'Cari tools'}</span><kbd>{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <button ref={menuButtonRef} className="menu-toggle" type="button" aria-label={menuOpen ? (language === 'en' ? 'Close navigation' : 'Tutup navigasi') : t('openMenu')} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(value => !value)}>
          <span /><span /><span className="menu-toggle-label">{language === 'en' ? 'MENU' : 'MENU'}</span>
        </button>
        <nav ref={navRef} id="primary-navigation" className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'} role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen ? true : undefined} aria-labelledby={menuOpen ? 'mobile-navigation-title' : undefined} onTransitionEnd={event => {
          if (event.target === event.currentTarget && event.propertyName === 'transform' && menuOpen) {
            navRef.current?.querySelector<HTMLElement>('.nav-drawer-close')?.focus({ preventScroll: true })
          }
        }}>
          <div className="nav-drawer-head">
            <div><span className="nav-drawer-eyebrow">{language === 'en' ? 'DREAMEX ENGINEERING SUITE' : 'DREAMEX ENGINEERING SUITE'}</span><strong id="mobile-navigation-title">{language === 'en' ? 'Navigation' : 'Navigasi'}</strong></div>
            <button className="nav-drawer-close" type="button" data-drawer-close onClick={closeDrawer} aria-label={language === 'en' ? 'Close navigation' : 'Tutup navigasi'}><X size={18}/></button>
          </div>
          <div className="nav-drawer-search">
            <label htmlFor="nav-drawer-search-input">{language === 'en' ? 'QUICK FIND' : 'CARI CEPAT'}</label>
            <div className="nav-drawer-search-control">
              <Search size={16} aria-hidden="true" />
              <input id="nav-drawer-search-input" type="search" value={navQuery} onChange={event => setNavQuery(event.target.value)} placeholder={language === 'en' ? 'Find a tool or destination…' : 'Cari tools atau halaman…'} autoComplete="off" spellCheck={false} />
              {navQuery && <button type="button" onClick={() => { setNavQuery(''); navRef.current?.querySelector<HTMLInputElement>('#nav-drawer-search-input')?.focus() }} aria-label={language === 'en' ? 'Clear navigation search' : 'Hapus pencarian navigasi'}><X size={15}/></button>}
            </div>
            <p className="nav-search-empty" role="status" hidden>{language === 'en' ? 'No destinations match this search. Try another keyword.' : 'Tidak ada halaman yang cocok. Coba kata kunci lain.'}</p>
            <p className="nav-search-count" role="status" aria-live="polite" hidden />
          </div>
          <NavLink to="/" end onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><HomeIcon size={16}/></span><span><b>{language === 'en' ? 'Journal' : 'Jurnal'}</b><small>{language === 'en' ? 'Articles, ideas and guides' : 'Artikel, ide, dan panduan'}</small></span></NavLink>
          <details className="nav-platform">
            <summary><span className="nav-link-icon"><Layers3 size={16}/></span><span><b>{language === 'en' ? 'Engineering platform' : 'Platform engineering'}</b><small>{language === 'en' ? 'Explore all engineering tools' : 'Jelajahi semua tools engineering'}</small></span><ChevronDown size={15} className="nav-chevron" /></summary>
            <div className="nav-mega-panel">
              <div className="nav-mega-intro">
                <span className="nav-mega-kicker">{language === 'en' ? 'ENGINEERING WORKSPACE' : 'RUANG KERJA ENGINEERING'}</span>
                <strong>{language === 'en' ? 'From first idea to reliable release.' : 'Dari ide hingga rilis yang andal.'}</strong>
                <p>{language === 'en' ? 'A focused workspace for building, testing, securing and improving software.' : 'Ruang kerja terpadu untuk membangun, menguji, mengamankan, dan meningkatkan software.'}</p>
                <Link to="/workspace" onClick={() => setMenuOpen(false)}>{language === 'en' ? 'Open workspace' : 'Buka workspace'} <ArrowRight size={14}/></Link>
              </div>
              <div className="nav-mega-group">
                <span className="nav-group-label">{language === 'en' ? 'PLAN & OPERATE' : 'RENCANAKAN & KELOLA'}</span>
                <NavLink to="/control-plane" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Activity size={15}/></span><span><b>Control Plane</b><small>{language === 'en' ? 'Release readiness & operations' : 'Kesiapan rilis dan operasi'}</small></span></NavLink>
                <NavLink to="/engineering-intelligence" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Activity size={15}/></span><span><b>Engineering Intelligence</b><small>{language === 'en' ? 'Cross-tool quality insights' : 'Insight kualitas lintas tools'}</small></span></NavLink>
                <NavLink to="/command-center" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><ClipboardList size={15}/></span><span><b>Command Center</b><small>{language === 'en' ? 'Tasks, incidents & decisions' : 'Tugas, insiden, dan keputusan'}</small></span></NavLink>
                <NavLink to="/roadmap" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><ArrowDownRight size={15}/></span><span><b>{language === 'en' ? 'Product Roadmap' : 'Roadmap Produk'}</b><small>{language === 'en' ? 'Priorities and milestones' : 'Prioritas dan pencapaian'}</small></span></NavLink>
              </div>
              <div className="nav-mega-group">
                <span className="nav-group-label">{language === 'en' ? 'BUILD & VERIFY' : 'BANGUN & VALIDASI'}</span>
                <NavLink to="/lab" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Terminal size={15}/></span><span><b>Engineering Lab</b><small>{language === 'en' ? 'Practical QA tools' : 'Perangkat QA praktis'}</small></span></NavLink>
                <NavLink to="/quality-intelligence" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><ShieldCheck size={15}/></span><span><b>Quality Intelligence</b><small>{language === 'en' ? 'Test reports & failure signals' : 'Laporan tes dan sinyal kegagalan'}</small></span></NavLink>
                <NavLink to="/reliability-center" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Gauge size={15}/></span><span><b>{language === 'en' ? 'Reliability & Incidents' : 'Reliability & Insiden'}</b><small>{language === 'en' ? 'Incident timelines & delivery metrics' : 'Timeline insiden dan metrik delivery'}</small></span></NavLink>
                <NavLink to="/performance" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Gauge size={15}/></span><span><b>Performance Observatory</b><small>{language === 'en' ? 'Performance and asset budgets' : 'Performa dan budget aset'}</small></span></NavLink>
                <NavLink to="/knowledge-graph" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Network size={15}/></span><span><b>Knowledge Graph</b><small>{language === 'en' ? 'Explore platform relationships' : 'Jelajahi relasi platform'}</small></span></NavLink>
                <NavLink to="/devtools" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Terminal size={15}/></span><span><b>Developer Utilities</b><small>{language === 'en' ? 'Everyday developer helpers' : 'Tools bantu developer'}</small></span></NavLink>
                <NavLink to="/api-playground" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Braces size={15}/></span><span><b>API Playground</b><small>{language === 'en' ? 'Inspect API contracts' : 'Periksa kontrak API'}</small></span></NavLink>
                <NavLink to="/qa-studio" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><CheckCircle2 size={15}/></span><span><b>QA Automation Studio</b><small>{language === 'en' ? 'Build and review test plans' : 'Bangun dan tinjau rencana tes'}</small></span></NavLink>
              </div>
              <div className="nav-mega-group">
                <span className="nav-group-label">{language === 'en' ? 'SECURE & LEARN' : 'AMANKAN & PELAJARI'}</span>
                <NavLink to="/security-center" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><ShieldCheck size={15}/></span><span><b>{language === 'en' ? 'Security Center' : 'Pusat Keamanan'}</b><small>{language === 'en' ? 'Privacy and secure practices' : 'Privasi dan praktik aman'}</small></span></NavLink>
                <NavLink to="/supply-chain-intelligence" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Network size={15}/></span><span><b>Supply Chain</b><small>{language === 'en' ? 'SBOM inventory insights' : 'Insight inventaris SBOM'}</small></span></NavLink>
                <NavLink to="/observatory" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Activity size={15}/></span><span><b>Web Quality Observatory</b><small>{language === 'en' ? 'Explore web quality signals' : 'Pantau sinyal kualitas web'}</small></span></NavLink>
                <NavLink to="/learn" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><BookOpen size={15}/></span><span><b>{language === 'en' ? 'Learning Hub' : 'Pusat Belajar'}</b><small>{language === 'en' ? 'Structured learning paths' : 'Jalur belajar terstruktur'}</small></span></NavLink>
              </div>
            </div>
          </details>
          <NavLink to="/reading-list" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Bookmark size={16}/></span><span><b>{language === 'en' ? 'Reading list' : 'Daftar bacaan'}</b><small>{language === 'en' ? 'Your saved articles' : 'Artikel yang disimpan'}</small></span></NavLink>
          <NavLink to="/about" aria-label={language === 'en' ? 'About' : 'Tentang'} onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Sparkles size={16}/></span><span><b>{language === 'en' ? 'About DreamEx' : 'Tentang DreamEx'}</b><small>{language === 'en' ? 'Purpose and project details' : 'Tujuan dan detail proyek'}</small></span></NavLink>
          <a className="nav-github" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}><span className="nav-link-icon"><Github size={16}/></span><span><b>GitHub</b><small>{language === 'en' ? 'Source code & releases' : 'Kode sumber dan rilis'}</small></span></a>
          <InstallAppButton />
          <div className="language-switch nav-desktop-language" role="group" aria-label={t('language')}><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>
          <div className="nav-drawer-footer">
            <div className="language-switch" role="group" aria-label={t('language')}><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>
            <span>{language === 'en' ? 'BUILD WITH EVIDENCE' : 'BANGUN DENGAN BUKTI'}</span>
          </div>
        </nav>
      </div>
    </header>
  </>
}

function Footer() {
  const { t, language } = useLanguage()
  const en = language === 'en'
  const arrow = <ArrowRight size={13} aria-hidden="true" />
  return <footer className="footer">
    <div className="container footer-inner">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand" to="/" aria-label="DreamEx Tech home">
            <span className="brand-mark"><Braces size={19} /></span>
            <span>DreamEx<span className="brand-muted"> Tech</span></span>
          </Link>
          <p>{t('footerTagline')}</p>
          <span className="footer-status"><i /> {en ? 'Built with curiosity. Refined through iteration.' : 'Dibangun dengan rasa ingin tahu. Disempurnakan lewat iterasi.'}</span>
        </div>
        <div className="footer-column">
          <span className="footer-heading">{en ? 'EXPLORE' : 'JELAJAHI'}</span>
          <Link to="/#topics">{t('footerTopics')} {arrow}</Link>
          <Link to="/#latest">{t('latestArticles')} {arrow}</Link>
          <Link to="/reading-list">{en ? 'Reading list' : 'Daftar bacaan'} {arrow}</Link>
          <Link to="/learn">{en ? 'Learning hub' : 'Pusat belajar'} {arrow}</Link>
          <Link to="/about">{en ? 'About DreamEx' : 'Tentang DreamEx'} {arrow}</Link>
          <Link to="/roadmap">{en ? 'Product roadmap' : 'Roadmap produk'} {arrow}</Link>
        </div>
        <div className="footer-column">
          <span className="footer-heading">{en ? 'BUILD & VERIFY' : 'BANGUN & UJI'}</span>
          <Link to="/lab">Engineering Lab {arrow}</Link>
          <Link to="/workspace">Engineering Workspace {arrow}</Link>
          <Link to="/api-playground">API Playground {arrow}</Link>
          <Link to="/qa-studio">{en ? 'QA Automation Studio' : 'Studio Otomasi QA'} {arrow}</Link>
          <Link to="/quality-intelligence">{en ? 'Quality Intelligence' : 'Quality Intelligence'} {arrow}</Link>
          <Link to="/performance">{en ? 'Performance Observatory' : 'Observatory Performa'} {arrow}</Link>
        </div>
        <div className="footer-column">
          <span className="footer-heading">{en ? 'PLATFORM & RESOURCES' : 'PLATFORM & SUMBER DAYA'}</span>
          <Link to="/engineering-intelligence">{en ? 'Engineering Intelligence' : 'Engineering Intelligence'} {arrow}</Link>
          <Link to="/control-plane">{en ? 'Engineering Control Plane' : 'Pusat Kendali Engineering'} {arrow}</Link>
          <Link to="/command-center">{en ? 'Command Center' : 'Pusat Kendali'} {arrow}</Link>
          <Link to="/supply-chain-intelligence">{en ? 'Supply Chain Intelligence' : 'Supply Chain Intelligence'} {arrow}</Link>
          <Link to="/security-center">{en ? 'Security & Privacy' : 'Keamanan & Privasi'} {arrow}</Link>
          <Link to="/knowledge-graph">{en ? 'Knowledge Graph' : 'Graf Pengetahuan'} {arrow}</Link>
          <a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{en ? 'GitHub repository' : 'Repositori GitHub'} {arrow}</a>
          <a href="https://github.com/uknowdream" target="_blank" rel="noreferrer">{en ? 'GitHub profile' : 'Profil GitHub'} {arrow}</a>
          <Link to="/rss">{en ? 'RSS feed' : 'Feed RSS'} {arrow}</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="copyright">© {new Date().getFullYear()} DreamEx Tech. {t('footerCopyright')}</span>
        <span className="footer-manifesto">{en ? 'THINK DEEPER. BUILD SMARTER.' : 'BERPIKIR LEBIH DALAM. MEMBANGUN LEBIH CERDAS.'}</span>
        <Link className="footer-top-link" to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{en ? 'Back to top' : 'Kembali ke atas'} <ChevronUp size={14} /></Link>
      </div>
    </div>
  </footer>
}

function ArticleCard({ article, index = 0 }: { article: typeof articles[number]; index?: number }) {
  const { t, language } = useLanguage()
  const { isSaved, toggleSaved } = useReadingList()
  const translated = language === 'en' ? articleTranslations[article.slug] : undefined
  const saved = isSaved(article.slug)
  return <article className="article-card" style={{ animationDelay: `${index * 70}ms` }}>
    <div className="card-top"><span className="category-pill">{categoryLabel(article.category, language)}</span><div className="card-meta-actions"><span className="read-time">{language === 'en' ? article.readTime.replace('menit', 'min') : article.readTime}</span><button className="bookmark-button" type="button" aria-pressed={saved} aria-label={`${saved ? (language === 'en' ? 'Remove saved article' : 'Hapus artikel tersimpan') : (language === 'en' ? 'Save article' : 'Simpan artikel')}: ${translated?.title ?? article.title}`} onClick={() => toggleSaved(article.slug)} title={saved ? (language === 'en' ? 'Remove from reading list' : 'Hapus dari daftar bacaan') : (language === 'en' ? 'Save to reading list' : 'Simpan ke daftar bacaan')}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}</button></div></div>
    <h3><Link to={`/blog/${article.slug}`}>{translated?.title ?? article.title}</Link></h3><p>{translated?.excerpt ?? article.excerpt}</p>
    <div className="tag-row">{article.tags.slice(0, 3).map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
    <Link className="read-link" to={`/blog/${article.slug}`}>{t('readArticle')} <ArrowRight size={16} /></Link>
  </article>
}

function Home() {
  const { t, language } = useLanguage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Semua')
  const searchInput = useRef<HTMLInputElement>(null)

  const [resumeRecord, setResumeRecord] = useState<ReadingProgressRecord | null>(readReadingProgress)
  useEffect(() => {
    const syncProgress = () => setResumeRecord(readReadingProgress())
    window.addEventListener('storage', syncProgress)
    window.addEventListener(READING_PROGRESS_EVENT, syncProgress)
    return () => {
      window.removeEventListener('storage', syncProgress)
      window.removeEventListener(READING_PROGRESS_EVENT, syncProgress)
    }
  }, [])
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        searchInput.current?.focus()
      }
      if (event.key === 'Escape') searchInput.current?.blur()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
  const filtered = useMemo(() => articles.filter(article => {
    const matchesCategory = category === 'Semua' || article.category === category
    const translated = language === 'en' ? articleTranslations[article.slug] : undefined
    const haystack = `${translated?.title ?? article.title} ${translated?.excerpt ?? article.excerpt} ${article.category} ${article.tags.join(' ')} ${article.body.join(' ')}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase().trim())
  }), [category, query, language])
  const featured = articles[0]
  const featuredTranslation = language === 'en' ? articleTranslations[featured.slug] : undefined

  useEffect(() => {
    document.title = language === 'en' ? 'DreamEx Tech — Engineering, AI & QA' : 'DreamEx Tech — Engineering, AI & QA'
    const description = t('heroDescription')
    const setMeta = (selector: string, attribute: string, value: string) => {
      document.querySelector(selector)?.setAttribute(attribute, value)
    }
    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', 'DreamEx Tech — Think deeper. Build smarter.')
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', 'https://dreamex.tech/')
    setMeta('meta[name="twitter:title"]', 'content', 'DreamEx Tech — Think deeper. Build smarter.')
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', 'https://dreamex.tech/')
  }, [language, t])

  return <main id="main-content">
    <section className="hero"><div className="hero-gridlines" /><div className="container hero-grid">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {t('heroEyebrow')}</div>
        <h1>{t('heroLine1')}<br /><span>{t('heroLine2')}</span><br />{t('heroLine3')}</h1>
        <p className="hero-description">{t('heroDescription')}</p>
        <div className="hero-actions"><a className="button button-primary" href="#latest">{t('exploreKnowledge')} <ArrowRight size={17} /></a><a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={17} /> {t('sourceCode')}</a></div>
        <div className="hero-stats"><div><strong>{String(articles.length).padStart(2, '0')}<i>+</i></strong><span>{t('engineeringNotes')}</span></div><div><strong>03</strong><span>{t('coreDisciplines')}</span></div><div><strong>∞</strong><span>{t('ideasExplore')}</span></div></div>
      </div>
      <div className="hero-visual"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="terminal">
        <div className="terminal-bar"><div className="terminal-dots"><span /><span /><span /></div><small><Terminal size={12} /> dreamex / engineering.ts</small><span className="terminal-live"><i /> {t('terminalLive')}</span></div>
        <div className="terminal-content"><p className="terminal-comment">{t('terminalComment')}</p><p><span className="syntax-purple">const</span> mindset = {'{'}</p><p className="indent"><span className="syntax-blue">quality</span>: <span className="syntax-green">'by design'</span>,</p><p className="indent"><span className="syntax-blue">learning</span>: <span className="syntax-green">'continuous'</span>,</p><p className="indent"><span className="syntax-blue">impact</span>: <span className="syntax-green">'measurable'</span></p><p>{'}'}</p><br /><p><span className="syntax-purple">for</span> (<span className="syntax-orange">const</span> idea <span className="syntax-purple">of</span> curiosity) {'{'}</p><p className="indent">build(idea);</p><p className="indent">test(assumptions);</p><p className="indent">improve(outcome);</p><p>{'}'}</p><div className="terminal-status"><span /> <span>{t('terminalPipeline')}</span><b>{t('terminalReady')}</b><Check size={13} /></div></div>
      </div><div className="floating-chip chip-top"><ShieldCheck size={16} /> {t('visualChipQuality')}</div><div className="floating-chip chip-bottom"><Sparkles size={16} /> {t('visualChipCuriosity')}</div><div className="visual-caption"><span>{t('visualCaption')}</span><span>{t('visualIterate')} <ArrowDownRight size={13} /></span></div></div>
    </div></section>
    <section className="trust-strip"><div className="container trust-inner"><span><Zap size={15} /> {t('trustKnowledge')}</span><span><ShieldCheck size={15} /> {t('trustQuality')}</span><span><Braces size={15} /> {t('trustEngineering')}</span><span><Sparkles size={15} /> {t('trustAI')}</span></div></section>
    <section className="topics-section" id="topics"><div className="container"><div className="topics-heading"><div><span className="section-kicker">{t('topicsEyebrow')}</span><h2>{t('topicsHeading')} <span>{t('topicsHeadingAccent')}</span></h2></div><p>{t('topicsDescription')}</p></div><div className="topics-grid">
      <a className="topic-card" href="#latest" onClick={() => setCategory('Software Engineering')}><span className="topic-number">01</span><span className="topic-icon purple"><Braces /></span><h3>{t('softwareTopic')}</h3><p>{t('softwareDescription')}</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
      <a className="topic-card" href="#latest" onClick={() => setCategory('QA Automation')}><span className="topic-number">02</span><span className="topic-icon green"><ShieldCheck /></span><h3>{t('qaTopic')}</h3><p>{t('qaDescription')}</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
      <a className="topic-card" href="#latest" onClick={() => setCategory('AI & Technology')}><span className="topic-number">03</span><span className="topic-icon blue"><Sparkles /></span><h3>{t('aiTopic')}</h3><p>{t('aiDescription')}</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
    </div></div></section>
    <EngineeringLaunchpad />
    <section className="featured-section"><div className="container featured-wrap"><div className="featured-label"><span className="section-kicker">{t('featuredHeading')}</span><span className="featured-line" /></div><div className="featured-card"><div className="featured-art"><div className="art-grid" /><div className="art-symbol"><Braces size={72} strokeWidth={1.1} /></div><span className="art-index">DX / 001</span><span className="art-caption">ENGINEERING<br />FOR WHAT'S NEXT</span></div><div className="featured-copy"><span className="category-pill">{categoryLabel(featured.category, language)}</span><p className="featured-overline">{t('featuredInsight')} · {featured.readTime.toUpperCase()}</p><h2>{featuredTranslation?.title ?? featured.title}</h2><p>{featuredTranslation?.excerpt ?? featured.excerpt}</p><Link className="read-link" to={`/blog/${featured.slug}`}>{t('readFeatured')} <ArrowRight size={16} /></Link></div></div></div></section>
    <section className="articles-section" id="latest"><div className="container">
      {resumeRecord && (() => {
        const resumeArticle = articles.find(item => item.slug === resumeRecord.slug)
        if (!resumeArticle) return null
        const resumeTranslation = language === 'en' ? articleTranslations[resumeArticle.slug] : undefined
        return <section className="resume-reading" aria-label={language === 'en' ? 'Resume reading' : 'Lanjutkan membaca'}>
          <div className="resume-reading-icon"><BookOpen size={21} /></div>
          <div className="resume-reading-copy">
            <span className="section-kicker">{language === 'en' ? 'PICK UP WHERE YOU LEFT OFF' : 'LANJUTKAN DARI TERAKHIR'}</span>
            <h2>{resumeTranslation?.title ?? resumeArticle.title}</h2>
            <p>{language === 'en' ? 'You have read about ' + resumeRecord.progress + '% of this article.' : 'Anda sudah membaca sekitar ' + resumeRecord.progress + '% artikel ini.'}</p>
            <div className="resume-progress-track" role="progressbar" aria-label={language === 'en' ? 'Reading progress' : 'Progres membaca'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumeRecord.progress}><span style={{ width: resumeRecord.progress + '%' }} /></div>
          </div>
          <Link className="button button-primary resume-reading-action" to={'/blog/' + resumeArticle.slug}>{language === 'en' ? 'Continue reading' : 'Lanjut membaca'} <ArrowRight size={16} /></Link>
        </section>
      })()}

      <div className="section-heading"><div><span className="section-kicker">{t('articlesEyebrow')}</span><h2>{t('articlesHeading')} <span>{t('articlesHeadingAccent')}</span></h2><p>{t('latestDescription')}</p></div><label className="search-box"><Search size={18} /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchLabel')} /><kbd>/</kbd></label></div>
      <div className="filter-row" aria-label={t('topics')}>{categories.map(item => <button key={item} className={category === item ? 'filter active' : 'filter'} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item, language)}</button>)}</div>
      <div className="results-meta"><span>{filtered.length} {t('found')}</span>{query && <button onClick={() => setQuery('')}>{t('clearSearch')} <span>×</span></button>}</div>
      {filtered.length ? <div className="article-grid">{filtered.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div> : <div className="empty-state"><Search size={22} /><strong>{t('noResults')}</strong><span>{t('tryOther')}</span></div>}
    </div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="section-kicker">{t('buildInPublic')}</span><h2>Better systems.<br /><span>Better questions.</span></h2><p>{t('buildDescription')}</p></div><a className="button button-primary" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{t('exploreCode')} <ArrowRight size={17} /></a></div></section>
  </main>
}

function ReadingListPage() {
  const { language } = useLanguage()
  const { savedSlugs } = useReadingList()
  const en = language === 'en'
  const [exportStatus, setExportStatus] = useState('')
  const [importing, setImporting] = useState(false)
  const savedArticles = savedSlugs.map(slug => articles.find(article => article.slug === slug)).filter((article): article is typeof articles[number] => Boolean(article))
  const [readingQuery, setReadingQuery] = useState('')
  const [readingSort, setReadingSort] = useState<'saved' | 'newest' | 'title' | 'shortest'>('saved')
  const visibleSavedArticles = useMemo(() => {
    const query = readingQuery.trim().toLocaleLowerCase()
    const matches = savedArticles.filter(article => {
      const translated = en ? articleTranslations[article.slug] : undefined
      return `${translated?.title ?? article.title} ${translated?.excerpt ?? article.excerpt} ${article.tags.join(' ')} ${article.category}`.toLocaleLowerCase().includes(query)
    })
    if (readingSort === 'newest') return [...matches].sort((a, b) => b.date.localeCompare(a.date))
    if (readingSort === 'title') return [...matches].sort((a, b) => (en ? articleTranslations[a.slug]?.title ?? a.title : a.title).localeCompare(en ? articleTranslations[b.slug]?.title ?? b.title : b.title))
    if (readingSort === 'shortest') return [...matches].sort((a, b) => Number.parseInt(a.readTime, 10) - Number.parseInt(b.readTime, 10))
    return matches
  }, [savedArticles, readingQuery, readingSort, en])
  const estimatedMinutes = savedArticles.reduce((total, article) => total + (Number.parseInt(article.readTime, 10) || 0), 0)
  const exportBackup = () => {
    const backup = {
      format: 'dreamex-reading-list',
      version: 1,
      exportedAt: new Date().toISOString(),
      slugs: savedArticles.map(article => article.slug),
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-reading-list.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setExportStatus(en ? 'Reading list backup downloaded.' : 'Cadangan daftar bacaan berhasil diunduh.')
  }
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setExportStatus('')
    setImporting(true)
    try {
      if (file.size > 1024 * 1024) throw new Error('file-too-large')
      const backup: unknown = JSON.parse(await file.text())
      if (!backup || typeof backup !== 'object') throw new Error('invalid-format')
      const record = backup as { format?: unknown; version?: unknown; slugs?: unknown }
      if (record.format !== 'dreamex-reading-list' || record.version !== 1 || !Array.isArray(record.slugs)) throw new Error('invalid-format')
      const validSlugs = [...new Set(record.slugs.filter((slug): slug is string => typeof slug === 'string' && articles.some(article => article.slug === slug)))]
      if (validSlugs.length === 0) throw new Error('no-valid-articles')
      const merged = [...new Set([...readSavedSlugs(), ...validSlugs])]
      window.localStorage.setItem(READING_LIST_KEY, JSON.stringify(merged))
      window.dispatchEvent(new Event(READING_LIST_EVENT))
      setExportStatus(en ? `Imported ${validSlugs.length} valid article(s) into your reading list.` : `${validSlugs.length} artikel valid berhasil diimpor ke daftar bacaan.`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'invalid-format'
      setExportStatus(reason === 'file-too-large'
        ? (en ? 'Backup is too large. Choose a file under 1 MB.' : 'File cadangan terlalu besar. Pilih file di bawah 1 MB.')
        : reason === 'no-valid-articles'
          ? (en ? 'No valid article links were found in this backup.' : 'Tidak ditemukan tautan artikel valid dalam cadangan ini.')
          : (en ? 'Invalid backup file. Use a DreamEx Tech reading-list JSON backup.' : 'File cadangan tidak valid. Gunakan cadangan JSON daftar bacaan DreamEx Tech.'))
    } finally {
      setImporting(false)
      input.value = ''
    }
  }
  const copyReadingList = async () => {
    const markdown = [
      `# ${en ? 'My DreamEx Tech Reading List' : 'Daftar Bacaan DreamEx Tech Saya'}`,
      '',
      ...savedArticles.flatMap(article => {
        const translated = en ? articleTranslations[article.slug] : undefined
        return [`- [${translated?.title ?? article.title}](https://dreamex.tech/blog/${article.slug})`, `  ${translated?.excerpt ?? article.excerpt}`]
      }),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(markdown)
      setExportStatus(en ? 'Reading list copied as Markdown.' : 'Daftar bacaan disalin dalam format Markdown.')
    } catch {
      setExportStatus(en ? 'Clipboard unavailable. Allow clipboard access and try again.' : 'Clipboard tidak tersedia. Izinkan akses clipboard lalu coba lagi.')
    }
  }
  useEffect(() => {
    document.title = en ? 'Reading List — DreamEx Tech' : 'Daftar Bacaan — DreamEx Tech'
    return () => { document.title = 'DreamEx Tech — Engineering, AI & QA' }
  }, [en])
  return <main id="main-content" className="reading-list-page container">
    <div className="reading-list-header"><span className="section-kicker">{en ? 'YOUR KNOWLEDGE SPACE' : 'RUANG PENGETAHUAN ANDA'}</span><h1>{en ? 'Reading list' : 'Daftar bacaan'} <span>{en ? 'for later.' : 'untuk nanti.'}</span></h1><p>{en ? 'Keep useful engineering notes close and return whenever you are ready.' : 'Simpan catatan engineering yang berguna dan baca kembali kapan pun Anda siap.'}</p><span className="reading-list-count">{savedArticles.length} {en ? (savedArticles.length === 1 ? 'article saved' : 'articles saved') : 'artikel tersimpan'} · {en ? `about ${estimatedMinutes} min to read` : `estimasi ${estimatedMinutes} menit membaca`}</span>
    {savedArticles.length > 0 && <div className="reading-list-controls">
      <label className="reading-list-search"><Search size={16} /><span className="sr-only">{en ? 'Search saved articles' : 'Cari artikel tersimpan'}</span><input type="search" value={readingQuery} onChange={event => setReadingQuery(event.target.value)} placeholder={en ? 'Search saved articles…' : 'Cari artikel tersimpan…'} /></label>
      <label className="reading-list-sort"><span>{en ? 'Sort' : 'Urutkan'}</span><select value={readingSort} onChange={event => setReadingSort(event.target.value as typeof readingSort)} aria-label={en ? 'Sort saved articles' : 'Urutkan artikel tersimpan'}>
        <option value="saved">{en ? 'Saved order' : 'Urutan tersimpan'}</option>
        <option value="newest">{en ? 'Newest articles' : 'Artikel terbaru'}</option>
        <option value="title">{en ? 'Title A–Z' : 'Judul A–Z'}</option>
        <option value="shortest">{en ? 'Shortest read' : 'Bacaan tercepat'}</option>
      </select></label>
    </div>}
    {savedArticles.length > 0 && <div className="reading-list-tools">
      <button type="button" className="copy-link-button reading-list-export" onClick={copyReadingList}><Copy size={14} /> {en ? 'Copy as Markdown' : 'Salin sebagai Markdown'}</button>
      <button type="button" className="copy-link-button reading-list-export" onClick={exportBackup}><ArrowDownRight size={14} /> {en ? 'Download JSON backup' : 'Unduh cadangan JSON'}</button>
      <label className={importing ? 'copy-link-button reading-list-import is-disabled' : 'copy-link-button reading-list-import'}>
        <ArrowRight size={14} /> {importing ? (en ? 'Importing…' : 'Mengimpor…') : (en ? 'Import JSON backup' : 'Impor cadangan JSON')}
        <input type="file" accept="application/json,.json" aria-label={en ? 'Import reading list JSON backup' : 'Impor cadangan JSON daftar bacaan'} disabled={importing} onChange={importBackup} />
      </label>
    </div>}
    {exportStatus && <p className="reading-list-export-status" role="status" aria-live="polite">{exportStatus}</p>}</div>
    {savedArticles.length > 0 && visibleSavedArticles.length > 0 && <div className="article-grid">{visibleSavedArticles.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div>}
    {savedArticles.length > 0 && visibleSavedArticles.length === 0 && <div className="reading-list-no-results"><Search size={20} /><h2>{en ? 'No saved articles match.' : 'Tidak ada artikel tersimpan yang cocok.'}</h2><p>{en ? 'Try another title, topic, or tag.' : 'Coba judul, topik, atau tag lain.'}</p><button className="copy-link-button" onClick={() => setReadingQuery('')}>{en ? 'Clear search' : 'Hapus pencarian'}</button></div>}
    {savedArticles.length === 0 && <div className="reading-list-empty"><Bookmark size={24} /><h2>{en ? 'Your reading list is ready.' : 'Daftar bacaan Anda siap.'}</h2><p>{en ? 'Save an article with the bookmark icon to build your personal reading list.' : 'Tekan ikon bookmark pada artikel untuk membuat daftar bacaan pribadi.'}</p><Link className="button button-primary" to="/#latest">{en ? 'Explore articles' : 'Jelajahi artikel'} <ArrowRight size={16} /></Link></div>}
  </main>
}


type ObservatoryCheck = { id: string; category: string; title: string; description: string; severity: 'high' | 'medium' | 'info'; run: () => Promise<{ status: 'pass' | 'warn' | 'fail'; detail: string }> }

function WebQualityObservatoryPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [results, setResults] = useState<Record<string, { status: 'pass' | 'warn' | 'fail'; detail: string }>>({})
  const [running, setRunning] = useState(false)
  const [ranAt, setRanAt] = useState('')
  const [copied, setCopied] = useState(false)
  const checks = useMemo<ObservatoryCheck[]>(() => [
    { id: 'https', category: en ? 'Security & transport' : 'Keamanan & transport', title: en ? 'HTTPS page context' : 'Konteks halaman HTTPS', description: en ? 'Confirms the current page uses a secure transport context.' : 'Memastikan halaman saat ini menggunakan konteks transport yang aman.', severity: 'high', run: async () => ({ status: window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'pass' : 'fail', detail: window.location.protocol + '//' + window.location.host }) },
    { id: 'viewport', category: en ? 'Responsive experience' : 'Pengalaman responsif', title: en ? 'Viewport configuration' : 'Konfigurasi viewport', description: en ? 'Checks whether a viewport meta tag is present.' : 'Memeriksa keberadaan meta tag viewport.', severity: 'high', run: async () => { const tag = document.querySelector<HTMLMetaElement>('meta[name="viewport"]'); return { status: tag?.content.includes('width=device-width') ? 'pass' : 'fail', detail: tag?.content || (en ? 'Viewport meta tag is missing.' : 'Meta tag viewport tidak ditemukan.') } } },
    { id: 'title', category: en ? 'Search & metadata' : 'Pencarian & metadata', title: en ? 'Unique page title' : 'Judul halaman', description: en ? 'Checks for a non-empty document title.' : 'Memeriksa judul dokumen yang tidak kosong.', severity: 'high', run: async () => ({ status: document.title.trim() ? 'pass' : 'fail', detail: document.title.trim() || (en ? 'Document title is empty.' : 'Judul dokumen kosong.') }) },
    { id: 'description', category: en ? 'Search & metadata' : 'Pencarian & metadata', title: en ? 'Meta description' : 'Meta description', description: en ? 'Checks for a non-empty description meta tag.' : 'Memeriksa meta description yang tidak kosong.', severity: 'medium', run: async () => { const value = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content.trim() || ''; return { status: value.length >= 50 && value.length <= 180 ? 'pass' : value ? 'warn' : 'fail', detail: value ? (en ? value.length + ' characters' : value.length + ' karakter') : (en ? 'Description is missing.' : 'Description tidak ditemukan.') } } },
    { id: 'canonical', category: en ? 'Search & metadata' : 'Pencarian & metadata', title: en ? 'Canonical URL' : 'URL canonical', description: en ? 'Checks that a canonical link points to an absolute HTTPS URL.' : 'Memeriksa link canonical dengan URL HTTPS absolut.', severity: 'medium', run: async () => { const value = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || ''; return { status: /^https:\/\//.test(value) ? 'pass' : 'warn', detail: value || (en ? 'Canonical URL is missing.' : 'URL canonical tidak ditemukan.') } } },
    { id: 'h1', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Single primary heading' : 'Satu heading utama', description: en ? 'Checks the current document for exactly one H1.' : 'Memeriksa apakah dokumen memiliki tepat satu H1.', severity: 'medium', run: async () => { const count = document.querySelectorAll('h1').length; return { status: count === 1 ? 'pass' : 'warn', detail: en ? count + ' H1 elements found' : count + ' elemen H1 ditemukan' } } },
    { id: 'landmarks', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Main landmark' : 'Landmark utama', description: en ? 'Checks for a main landmark or main-content target.' : 'Memeriksa landmark main atau target main-content.', severity: 'medium', run: async () => { const found = Boolean(document.querySelector('main, [role="main"], #main-content')); return { status: found ? 'pass' : 'fail', detail: found ? (en ? 'Main content landmark found.' : 'Landmark konten utama ditemukan.') : (en ? 'No main landmark found.' : 'Landmark utama tidak ditemukan.') } } },
    { id: 'skip-link', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Skip navigation link' : 'Tautan lewati navigasi', description: en ? 'Checks for a keyboard-friendly skip link.' : 'Memeriksa tautan untuk melewati navigasi dengan keyboard.', severity: 'medium', run: async () => { const found = Boolean(document.querySelector('a.skip-link[href^="#"]')); return { status: found ? 'pass' : 'warn', detail: found ? (en ? 'Skip link found.' : 'Tautan skip ditemukan.') : (en ? 'No skip link detected.' : 'Tautan skip tidak ditemukan.') } } },
    { id: 'images', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Image alternative text' : 'Teks alternatif gambar', description: en ? 'Flags images that have no alt attribute.' : 'Menandai gambar yang tidak memiliki atribut alt.', severity: 'medium', run: async () => { const images = [...document.images]; const missing = images.filter(image => !image.hasAttribute('alt')).length; return { status: missing === 0 ? 'pass' : 'warn', detail: en ? missing + ' of ' + images.length + ' images missing alt attributes' : missing + ' dari ' + images.length + ' gambar tidak memiliki atribut alt' } } },
    { id: 'links', category: en ? 'Navigation integrity' : 'Integritas navigasi', title: en ? 'Empty link labels' : 'Label tautan kosong', description: en ? 'Finds links without readable text or an accessible name.' : 'Mencari tautan tanpa teks terbaca atau nama aksesibel.', severity: 'medium', run: async () => { const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]; const missing = links.filter(link => !(link.innerText || link.getAttribute('aria-label') || link.querySelector('img[alt]')?.getAttribute('alt') || '').trim()).length; return { status: missing === 0 ? 'pass' : 'warn', detail: en ? missing + ' of ' + links.length + ' links have no detectable label' : missing + ' dari ' + links.length + ' tautan tidak memiliki label terdeteksi' } } },
    { id: 'motion', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Reduced-motion support' : 'Dukungan reduced-motion', description: en ? 'Checks whether the site defines a reduced-motion CSS preference.' : 'Memeriksa apakah situs mendefinisikan preferensi CSS reduced-motion.', severity: 'info', run: async () => { const rules = [...document.styleSheets].flatMap(sheet => { try { return [...(sheet.cssRules || [])] } catch { return [] } }); const found = rules.some(rule => rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion')); return { status: found ? 'pass' : 'warn', detail: found ? (en ? 'Reduced-motion media rule found in accessible stylesheets.' : 'Aturan media reduced-motion ditemukan pada stylesheet yang dapat dibaca.') : (en ? 'No accessible reduced-motion media rule detected; cross-origin stylesheets may be unreadable.' : 'Aturan reduced-motion tidak terdeteksi; stylesheet lintas origin mungkin tidak dapat dibaca.') } } },
    { id: 'storage', category: en ? 'Privacy & resilience' : 'Privasi & ketahanan', title: en ? 'Browser storage availability' : 'Ketersediaan penyimpanan browser', description: en ? 'Tests whether local storage can be accessed without writing user data.' : 'Menguji akses local storage tanpa menulis data pengguna.', severity: 'info', run: async () => { try { void window.localStorage.length; return { status: 'pass', detail: en ? 'Local storage is readable.' : 'Local storage dapat dibaca.' } } catch { return { status: 'warn', detail: en ? 'Storage is restricted in this context.' : 'Penyimpanan dibatasi pada konteks ini.' } } } },
  ], [en])
  const score = useMemo(() => {
    const values = checks.map(check => results[check.id]).filter(Boolean)
    const weights = checks.reduce((sum, check) => sum + (check.severity === 'high' ? 2 : 1), 0)
    const earned = checks.reduce((sum, check) => sum + (results[check.id]?.status === 'pass' ? (check.severity === 'high' ? 2 : 1) : 0), 0)
    return { value: Math.round(earned / weights * 100), complete: values.length, pass: values.filter(value => value.status === 'pass').length, warn: values.filter(value => value.status === 'warn').length, fail: values.filter(value => value.status === 'fail').length }
  }, [results, checks])
  const runChecks = async () => {
    setRunning(true)
    setResults({})
    const next: Record<string, { status: 'pass' | 'warn' | 'fail'; detail: string }> = {}
    for (const check of checks) {
      try { next[check.id] = await check.run() } catch { next[check.id] = { status: 'warn', detail: en ? 'The browser could not complete this check.' : 'Browser tidak dapat menyelesaikan pemeriksaan ini.' } }
      setResults({ ...next })
    }
    setRanAt(new Date().toLocaleString(en ? 'en-US' : 'id-ID'))
    setCopied(false)
    setRunning(false)
  }
  const report = useMemo(() => [
    '# DreamEx Tech — Web Quality Observatory',
    '',
    '- Page: ' + window.location.href,
    '- Audited at: ' + (ranAt || (en ? 'Not run yet' : 'Belum dijalankan')),
    '- Score: ' + score.value + '/100 (weighted heuristic, not a compliance certification)',
    '- Checks: ' + score.complete + '/' + checks.length,
    '',
    ...checks.map(check => '- [' + (results[check.id]?.status === 'pass' ? 'x' : ' ') + '] ' + check.title + ' — ' + (results[check.id]?.status || 'not run').toUpperCase() + ': ' + (results[check.id]?.detail || (en ? 'Not run' : 'Belum dijalankan'))),
    '',
    'Note: This is a browser-side heuristic scan. It does not crawl the site, test server headers, run Lighthouse, or certify WCAG conformance.',
  ].join('\n'), [checks, en, ranAt, results, score])
  const exportReport = () => {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-web-quality-report.md'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
  const copyReport = async () => {
    try { await navigator.clipboard.writeText(report); setCopied(true) }
    catch { setCopied(false) }
  }
  return <main id="main-content" className="container observatory-page">
    <header className="observatory-header">
      <span className="section-kicker"><Activity size={14} /> {en ? 'ENGINEERING QUALITY / BROWSER AUDIT' : 'KUALITAS ENGINEERING / AUDIT BROWSER'}</span>
      <h1>{en ? <>Web Quality <span>Observatory.</span></> : <>Observatory <span>Kualitas Web.</span></>}</h1>
      <p>{en ? 'A practical, transparent health check for the page you are viewing. Inspect metadata, accessibility signals, navigation, privacy basics, and responsive foundations — without uploading page data.' : 'Pemeriksaan praktis dan transparan untuk halaman yang sedang Anda buka. Periksa metadata, sinyal aksesibilitas, navigasi, privasi dasar, dan fondasi responsif — tanpa mengunggah data halaman.'}</p>
      <div className="observatory-disclaimer"><ShieldCheck size={16} /><span>{en ? 'Local-only audit · no analytics upload · heuristic results, not a replacement for Lighthouse or a WCAG audit.' : 'Audit lokal · tidak mengunggah analitik · hasil heuristik, bukan pengganti Lighthouse atau audit WCAG.'}</span></div>
    </header>
    <section className="observatory-dashboard" aria-label={en ? 'Audit summary' : 'Ringkasan audit'}>
      <div className="observatory-score" role="img" aria-label={(en ? 'Quality score ' : 'Skor kualitas ') + score.value + ' percent'} style={{ '--observatory-score': score.value } as React.CSSProperties}><div><strong>{score.value}</strong><span>/100</span></div></div>
      <div className="observatory-summary"><span className="section-kicker">{en ? 'CURRENT PAGE' : 'HALAMAN SAAT INI'}</span><h2>{score.complete === 0 ? (en ? 'Ready for inspection' : 'Siap diperiksa') : score.fail > 0 ? (en ? 'Critical signals need attention' : 'Sinyal kritis perlu ditinjau') : score.warn > 0 ? (en ? 'Review recommended' : 'Disarankan untuk ditinjau') : (en ? 'Healthy signals detected' : 'Sinyal baik terdeteksi')}</h2><p>{en ? 'The score rewards passed checks and weights foundational security and viewport checks more heavily. A completed scan is required before interpreting the score.' : 'Skor menghargai pemeriksaan yang lulus dan memberi bobot lebih besar pada keamanan dasar dan viewport. Jalankan pemindaian sebelum menafsirkan skor.'}</p><div className="observatory-stats"><div><strong>{score.complete}/{checks.length}</strong><span>{en ? 'Checked' : 'Diperiksa'}</span></div><div><strong>{score.pass}</strong><span>{en ? 'Passed' : 'Lulus'}</span></div><div><strong>{score.warn}</strong><span>{en ? 'Warnings' : 'Peringatan'}</span></div><div><strong>{score.fail}</strong><span>{en ? 'Failed' : 'Gagal'}</span></div></div></div>
    </section>
    <div className="observatory-toolbar"><div><span className="section-kicker">{en ? 'QUALITY SIGNALS' : 'SINYA KUALITAS'}</span><h2>{en ? 'Audit checklist' : 'Checklist audit'}</h2><p>{ranAt ? (en ? 'Last run: ' : 'Terakhir dijalankan: ') + ranAt : (en ? 'Run the audit to inspect this page.' : 'Jalankan audit untuk memeriksa halaman ini.')}</p></div><div className="observatory-actions"><button className="button button-primary" type="button" onClick={runChecks} disabled={running}><Activity size={16} /> {running ? (en ? 'Scanning…' : 'Memindai…') : (en ? 'Run page audit' : 'Jalankan audit')}</button><button className="copy-link-button" type="button" onClick={copyReport} disabled={score.complete === 0}><Copy size={14} /> {copied ? (en ? 'Copied' : 'Disalin') : (en ? 'Copy report' : 'Salin laporan')}</button><button className="copy-link-button" type="button" onClick={exportReport} disabled={score.complete === 0}><Download size={14} /> {en ? 'Export .md' : 'Ekspor .md'}</button></div></div>
    <div className="observatory-groups">{[...new Set(checks.map(check => check.category))].map(category => <section className="observatory-group" key={category}><h3>{category}<span>{checks.filter(check => check.category === category && results[check.id]).length}/{checks.filter(check => check.category === category).length}</span></h3>{checks.filter(check => check.category === category).map(check => { const result = results[check.id]; return <article className="observatory-check" key={check.id}><div className="observatory-check-icon"><span className={'observatory-status status-' + (result?.status || 'idle')}>{result?.status === 'pass' ? <CheckCircle2 size={17} /> : result?.status === 'fail' ? <AlertTriangle size={17} /> : result?.status === 'warn' ? <AlertTriangle size={17} /> : <Activity size={17} />}</span></div><div className="observatory-check-copy"><div><h4>{check.title}</h4><span className={'observatory-severity severity-' + check.severity}>{check.severity.toUpperCase()}</span></div><p>{check.description}</p><small>{result?.detail || (en ? 'Not run yet.' : 'Belum dijalankan.')}</small></div><span className={'observatory-result-badge result-' + (result?.status || 'idle')}>{result?.status ? (en ? result.status.toUpperCase() : result.status === 'pass' ? 'LULUS' : result.status === 'warn' ? 'PERINGATAN' : 'GAGAL') : (en ? 'PENDING' : 'MENUNGGU')}</span></article> })}</section>)}</div>
    <aside className="observatory-note"><AlertTriangle size={17} /><p>{en ? 'Scope limits: this checks the current rendered page only. It does not crawl internal links, measure Core Web Vitals, validate HTTP security headers, test contrast ratios, or guarantee WCAG conformance. Use Lighthouse and a manual keyboard/screen-reader review for deeper validation.' : 'Batasan: pemeriksaan hanya mencakup halaman yang sedang dirender. Tool ini tidak merayapi tautan internal, mengukur Core Web Vitals, memvalidasi security headers HTTP, menguji rasio kontras, atau menjamin kepatuhan WCAG. Gunakan Lighthouse dan tinjauan keyboard/screen reader manual untuk validasi lanjutan.'}</p></aside>
  </main>
}

function EngineeringLabPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [activeTool, setActiveTool] = useState<'test-cases' | 'bug-report' | 'json' | 'api-matrix' | 'openapi' | 'release-scorecard' | 'postmortem'>('test-cases')
  const [releaseChecked, setReleaseChecked] = useState<Record<string, boolean>>({})
  const [feature, setFeature] = useState(en ? 'Login form' : 'Form login')
  const [generated, setGenerated] = useState(false)
  const [bugTitle, setBugTitle] = useState('')
  const [environment, setEnvironment] = useState('Chrome / Windows 11')
  const [steps, setSteps] = useState('')
  const [actual, setActual] = useState('')
  const [expected, setExpected] = useState('')
  const [severity, setSeverity] = useState('High')
  const [bugReport, setBugReport] = useState('')
  const [jsonInput, setJsonInput] = useState('{"status":"ok","data":[1,2,3]}')
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [apiMethod, setApiMethod] = useState('POST')
  const [apiPath, setApiPath] = useState('/api/v1/users')
  const [apiAuth, setApiAuth] = useState('required')
  const [apiPayload, setApiPayload] = useState('json')
  const [apiMatrixGenerated, setApiMatrixGenerated] = useState(false)
  const [openApiSpec, setOpenApiSpec] = useState(`{
  "openapi": "3.0.3",
  "info": { "title": "Sample Users API", "version": "1.0.0" },
  "paths": {
    "/api/v1/users": {
      "get": { "summary": "List users", "operationId": "listUsers", "responses": { "200": { "description": "Users returned" }, "401": { "description": "Unauthorized" } } },
      "post": { "summary": "Create a user", "operationId": "createUser", "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object" } } } }, "responses": { "201": { "description": "Created" }, "400": { "description": "Invalid input" } } }
    },
    "/api/v1/users/{userId}": {
      "get": { "summary": "Get user by ID", "parameters": [{ "name": "userId", "in": "path", "required": true, "schema": { "type": "string" } }], "responses": { "200": { "description": "User returned" }, "404": { "description": "Not found" } } }
    }
  }
}`)
  const [openApiError, setOpenApiError] = useState('')
  const [openApiResults, setOpenApiResults] = useState<Array<{ method: string; path: string; summary: string; operationId: string; responses: string; parameters: string; requestBody: boolean; security: boolean }>>([])
  const [openApiAnalyzed, setOpenApiAnalyzed] = useState(false)
  const [openApiIssues, setOpenApiIssues] = useState<Array<{ method: string; path: string; severity: 'error' | 'warning' | 'info'; code: string; message: string }>>([])
  const [copyStatus, setCopyStatus] = useState('')
  const [incidentTitle, setIncidentTitle] = useState('')
  const [incidentSeverity, setIncidentSeverity] = useState('SEV-2')
  const [incidentStatus, setIncidentStatus] = useState('Resolved')
  const [incidentStart, setIncidentStart] = useState('')
  const [incidentEnd, setIncidentEnd] = useState('')
  const [incidentImpact, setIncidentImpact] = useState('')
  const [incidentDetection, setIncidentDetection] = useState('')
  const [incidentTimeline, setIncidentTimeline] = useState('')
  const [incidentRootCause, setIncidentRootCause] = useState('')
  const [incidentContributors, setIncidentContributors] = useState('')
  const [incidentResolution, setIncidentResolution] = useState('')
  const [incidentFollowUps, setIncidentFollowUps] = useState('')
  const [postmortemReport, setPostmortemReport] = useState('')

  const releaseChecks = [
    { id: 'requirements', category: en ? 'Product & scope' : 'Produk & ruang lingkup', title: en ? 'Acceptance criteria are reviewed and traceable' : 'Acceptance criteria telah ditinjau dan dapat ditelusuri', critical: true },
    { id: 'coverage', category: en ? 'Product & scope' : 'Produk & ruang lingkup', title: en ? 'Critical user journeys and regression coverage are tested' : 'Alur pengguna kritis dan cakupan regresi telah diuji', critical: true },
    { id: 'accessibility', category: en ? 'Product & scope' : 'Produk & ruang lingkup', title: en ? 'Keyboard navigation and accessible names are verified' : 'Navigasi keyboard dan nama aksesibel telah diverifikasi', critical: false },
    { id: 'contract', category: en ? 'API & data contracts' : 'Kontrak API & data', title: en ? 'API contract and response schemas are validated' : 'Kontrak API dan schema respons telah divalidasi', critical: true },
    { id: 'errors', category: en ? 'API & data contracts' : 'Kontrak API & data', title: en ? 'Negative paths, validation, and error responses are covered' : 'Skenario negatif, validasi, dan respons error telah dicakup', critical: true },
    { id: 'migration', category: en ? 'API & data contracts' : 'Kontrak API & data', title: en ? 'Data migration and backward compatibility are checked' : 'Migrasi data dan kompatibilitas ke belakang telah diperiksa', critical: false },
    { id: 'security', category: en ? 'Security & privacy' : 'Keamanan & privasi', title: en ? 'Authentication, authorization, and access boundaries are tested' : 'Autentikasi, otorisasi, dan batas akses telah diuji', critical: true },
    { id: 'privacy', category: en ? 'Security & privacy' : 'Keamanan & privasi', title: en ? 'Sensitive data, secrets, and logs are reviewed for exposure' : 'Data sensitif, secret, dan log telah diperiksa dari risiko kebocoran', critical: true },
    { id: 'performance', category: en ? 'Reliability & operations' : 'Keandalan & operasional', title: en ? 'Performance and timeout behavior meet agreed thresholds' : 'Performa dan perilaku timeout memenuhi ambang yang disepakati', critical: false },
    { id: 'monitoring', category: en ? 'Reliability & operations' : 'Keandalan & operasional', title: en ? 'Health checks, alerts, and actionable logs are verified' : 'Health check, alert, dan log yang dapat ditindaklanjuti telah diverifikasi', critical: false },
    { id: 'rollback', category: en ? 'Release & recovery' : 'Rilis & pemulihan', title: en ? 'Rollback or recovery procedure is documented and viable' : 'Prosedur rollback atau pemulihan terdokumentasi dan layak dijalankan', critical: true },
    { id: 'signoff', category: en ? 'Release & recovery' : 'Rilis & pemulihan', title: en ? 'Known defects, release notes, and stakeholder sign-off are complete' : 'Defect yang diketahui, catatan rilis, dan persetujuan stakeholder telah lengkap', critical: false },
  ]
  const releaseCompleted = releaseChecks.filter(item => releaseChecked[item.id]).length
  const releaseWeightTotal = releaseChecks.reduce((total, item) => total + (item.critical ? 2 : 1), 0)
  const releaseScore = Math.round(releaseChecks.reduce((total, item) => total + (releaseChecked[item.id] ? (item.critical ? 2 : 1) : 0), 0) / releaseWeightTotal * 100)
  const releaseCriticalMissing = releaseChecks.filter(item => item.critical && !releaseChecked[item.id]).length
  const releaseStatus = releaseScore === 100 ? (en ? 'Ready for release' : 'Siap dirilis') : releaseCriticalMissing > 0 ? (en ? 'Release blocked' : 'Rilis tertahan') : releaseScore >= 80 ? (en ? 'Ready with follow-ups' : 'Siap dengan tindak lanjut') : (en ? 'Needs more evidence' : 'Perlu bukti tambahan')

  const generatedCases = useMemo(() => {
    const subject = feature.trim() || (en ? 'the feature' : 'fitur ini')
    return en ? [
      { title: `Verify the happy path for ${subject}`, steps: 'Provide valid input and submit the primary action.', expected: 'The operation succeeds and the expected result is shown.' },
      { title: `Validate required fields in ${subject}`, steps: 'Leave each required field empty and submit.', expected: 'Submission is blocked and clear field-level guidance appears.' },
      { title: `Reject invalid input in ${subject}`, steps: 'Submit malformed or unsupported values.', expected: 'Invalid data is rejected without corrupting application state.' },
      { title: `Check boundary values in ${subject}`, steps: 'Test minimum, maximum, and just-outside-limit values.', expected: 'Documented limits are enforced consistently.' },
      { title: `Prevent duplicate submission in ${subject}`, steps: 'Trigger the primary action repeatedly in quick succession.', expected: 'Duplicate processing is prevented or handled idempotently.' },
      { title: `Verify keyboard accessibility for ${subject}`, steps: 'Navigate controls with Tab, Shift+Tab, Enter, and Space.', expected: 'Focus order is logical and every action is keyboard operable.' },
      { title: `Handle service failure in ${subject}`, steps: 'Simulate a timeout or server error during submission.', expected: 'A helpful error appears and the user can recover safely.' },
      { title: `Recover after an error in ${subject}`, steps: 'Correct invalid input or retry after a failed request.', expected: 'The operation can complete without refreshing the page.' },
    ] : [
      { title: `Verifikasi alur normal ${subject}`, steps: 'Masukkan data valid lalu jalankan aksi utama.', expected: 'Proses berhasil dan hasil yang diharapkan ditampilkan.' },
      { title: `Validasi field wajib pada ${subject}`, steps: 'Kosongkan setiap field wajib lalu kirim.', expected: 'Pengiriman dicegah dan petunjuk yang jelas ditampilkan.' },
      { title: `Tolak input tidak valid pada ${subject}`, steps: 'Kirim nilai dengan format salah atau tidak didukung.', expected: 'Data tidak valid ditolak tanpa merusak state aplikasi.' },
      { title: `Uji batas nilai pada ${subject}`, steps: 'Uji nilai minimum, maksimum, dan di luar batas.', expected: 'Batas yang didokumentasikan diterapkan secara konsisten.' },
      { title: `Cegah pengiriman duplikat pada ${subject}`, steps: 'Jalankan aksi utama berulang kali dalam waktu singkat.', expected: 'Pemrosesan duplikat dicegah atau ditangani secara idempoten.' },
      { title: `Uji aksesibilitas keyboard pada ${subject}`, steps: 'Navigasikan kontrol dengan Tab, Shift+Tab, Enter, dan Space.', expected: 'Urutan fokus logis dan seluruh aksi dapat dijalankan dengan keyboard.' },
      { title: `Tangani kegagalan layanan pada ${subject}`, steps: 'Simulasikan timeout atau error server saat pengiriman.', expected: 'Pesan error yang membantu muncul dan pengguna dapat pulih dengan aman.' },
      { title: `Pulihkan proses setelah error pada ${subject}`, steps: 'Perbaiki input atau ulangi setelah request gagal.', expected: 'Proses dapat selesai tanpa memuat ulang halaman.' },
    ]
  }, [feature, en])
  useEffect(() => {
    document.title = en ? 'Engineering Lab — DreamEx Tech' : 'Lab Engineering — DreamEx Tech'
    return () => { document.title = 'DreamEx Tech — Engineering, AI & QA' }
  }, [en])
  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(en ? 'Copied to clipboard.' : 'Berhasil disalin.')
    } catch {
      setCopyStatus(en ? 'Clipboard unavailable. Select and copy the output manually.' : 'Clipboard tidak tersedia. Pilih dan salin hasil secara manual.')
    }
  }
  const generatePostmortem = () => {
    const lines = (value: string) => value.trim() ? value.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean) : []
    const timeline = lines(incidentTimeline)
    const followUps = lines(incidentFollowUps)
    const timelineEvents = timeline.map(line => {
      const prefix = line.match(/^\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?|\d{1,2}:\d{2}(?:\s+(?:UTC|WIB|WITA|WIT))?)/i)?.[1]
      if (!prefix) return { line, value: null as number | null, mode: '' }
      if (/^\d{4}-/.test(prefix)) {
        const value = Date.parse(prefix)
        return { line, value: Number.isFinite(value) ? value : null, mode: 'absolute' }
      }
      const clock = prefix.match(/^(\d{1,2}):(\d{2})(?:\s+(UTC|WIB|WITA|WIT))?$/i)
      if (!clock) return { line, value: null as number | null, mode: '' }
      const offsets: Record<string, number> = { UTC: 0, WIB: 7, WITA: 8, WIT: 9 }
      const zone = (clock[3] || 'LOCAL').toUpperCase()
      const value = Number(clock[1]) * 60 + Number(clock[2]) - (offsets[zone] ?? 0) * 60
      return { line, value, mode: 'clock:' + zone }
    })
    const comparableTimeline = timelineEvents.length > 0 && timelineEvents.every(event => event.value !== null && event.mode === timelineEvents[0].mode)
    const chronological = comparableTimeline && timelineEvents.every((event, index) => index === 0 || (event.value as number) >= (timelineEvents[index - 1].value as number))
    const timelineStatus = !timeline.length ? 'NOT PROVIDED' : !comparableTimeline ? 'NOT VERIFIED' : chronological ? 'PASS' : 'WARNING'
    const followUpEntries = followUps.map(line => {
      const parts = line.split(/\s*(?:\||—|–)\s*/).map(part => part.trim())
      const action = parts[0] || line
      const owner = parts[1] || ''
      const dueDate = parts[2] || ''
      const parsedDue = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? Date.parse(dueDate + 'T00:00:00Z') : NaN
      const validDueDate = Number.isFinite(parsedDue) && new Date(parsedDue).toISOString().slice(0, 10) === dueDate
      return { action, owner, dueDate, validDueDate, complete: Boolean(owner && validDueDate) }
    })
    const accountableFollowUps = followUpEntries.filter(item => item.complete).length
    const startMs = incidentStart ? Date.parse(incidentStart) : NaN
    const endMs = incidentEnd ? Date.parse(incidentEnd) : NaN
    const invalidIncidentWindow = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs
    const warnings = [
      ...(timelineStatus === 'WARNING' ? ['Timeline events are not in chronological order. Review the supplied timestamps.'] : []),
      ...(timelineStatus === 'NOT VERIFIED' ? ['Timeline chronology could not be verified. Use consistent ISO 8601 timestamps or HH:mm values with a consistent timezone.'] : []),
      ...(invalidIncidentWindow ? ['Incident end time is earlier than start time. Correct the incident window before sharing.'] : []),
      ...(followUpEntries.some(item => !item.complete) ? ['Some follow-up actions are missing an owner or a valid YYYY-MM-DD due date.'] : []),
    ]
    const report = [
      '# ' + (incidentTitle.trim() || (en ? 'Incident postmortem' : 'Postmortem insiden')),
      '',
      '> ' + (en ? 'Blameless review: focus on system conditions, learning, and prevention.' : 'Tinjauan tanpa menyalahkan: fokus pada kondisi sistem, pembelajaran, dan pencegahan.'),
      '',
      '## Incident summary',
      '- **Severity:** ' + incidentSeverity,
      '- **Status:** ' + incidentStatus,
      '- **Start:** ' + (incidentStart || (en ? 'Not recorded' : 'Belum dicatat')),
      '- **End:** ' + (incidentEnd || (en ? 'Not recorded' : 'Belum dicatat')),
      '',
      '## Customer and business impact',
      incidentImpact.trim() || (en ? 'Describe affected users, services, duration, and measurable impact.' : 'Jelaskan pengguna/layanan terdampak, durasi, dan dampak terukur.'),
      '',
      '## Detection',
      incidentDetection.trim() || (en ? 'Explain how the incident was detected and why earlier signals did or did not help.' : 'Jelaskan bagaimana insiden terdeteksi dan apakah sinyal sebelumnya membantu.'),
      '',
      '## Timeline',
      ...(timeline.length ? timeline.map(line => '- ' + line) : ['- ' + (en ? 'Add timestamped events in chronological order.' : 'Tambahkan peristiwa bertimestamp secara kronologis.')]),
      '',
      '## Timeline integrity',
      '- Timestamped events: ' + timelineEvents.filter(event => event.value !== null).length + ' / ' + timeline.length,
      '- Chronology check: ' + timelineStatus,
      '- Check scope: compares timestamps only when every event uses a supported, consistent format; it does not verify the truth of the events.',
      '',
      '## Root cause',
      incidentRootCause.trim() || (en ? 'Describe the underlying system conditions, not an individual to blame.' : 'Jelaskan kondisi sistem yang mendasari, bukan menyalahkan individu.'),
      '',
      '## Contributing factors',
      ...(lines(incidentContributors).length ? lines(incidentContributors).map(line => '- ' + line) : ['- ' + (en ? 'No contributing factors documented yet.' : 'Belum ada faktor kontribusi yang didokumentasikan.')]),
      '',
      '## Resolution and recovery',
      incidentResolution.trim() || (en ? 'Document mitigation, recovery steps, and validation performed.' : 'Dokumentasikan mitigasi, langkah pemulihan, dan validasi yang dilakukan.'),
      '',
      '## Follow-up accountability',
      '- Actions with owner and valid due date: ' + accountableFollowUps + ' / ' + followUpEntries.length,
      ...(followUpEntries.length ? followUpEntries.map(item => '- [ ] ' + item.action + ' — Owner: ' + (item.owner || 'UNASSIGNED') + ' — Due: ' + (item.validDueDate ? item.dueDate : 'UNSCHEDULED')) : ['- [ ] ' + (en ? 'Add an action, owner, due date, and measurable completion criteria.' : 'Tambahkan aksi, penanggung jawab, tenggat, dan kriteria penyelesaian terukur.')]),
      '',
      '## Completeness warnings',
      ...(warnings.length ? warnings.map(warning => '- WARNING: ' + warning) : ['- No chronology/window/follow-up completeness warning was detected by these basic checks.']),
      '',
      '## Review notes',
      en ? 'Review this document with relevant stakeholders. Avoid sensitive credentials, personal data, and blame-focused language.' : 'Tinjau dokumen ini bersama stakeholder terkait. Hindari kredensial sensitif, data pribadi, dan bahasa yang menyalahkan individu.',
    ].join('\n')
    setPostmortemReport(report)
    setCopyStatus('')
  }
  const downloadPostmortem = () => {
    if (!postmortemReport) return
    const blob = new Blob([postmortemReport], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const slug = (incidentTitle.trim() || 'incident-postmortem').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'incident-postmortem'
    anchor.href = url
    anchor.download = slug + '-postmortem.md'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'Postmortem Markdown downloaded.' : 'Markdown postmortem berhasil diunduh.')
  }
  const generateBugReport = () => setBugReport([
    `# ${bugTitle.trim() || (en ? 'Bug report title' : 'Judul laporan bug')}`,
    '',
    `- Severity: ${severity}`,
    `- Environment: ${environment.trim() || (en ? 'Not specified' : 'Belum ditentukan')}`,
    '',
    '## Steps to Reproduce',
    steps.trim() || (en ? '1. Add reproduction steps.' : '1. Tambahkan langkah reproduksi.'),
    '',
    '## Actual Result',
    actual.trim() || (en ? 'Describe what happened.' : 'Jelaskan apa yang terjadi.'),
    '',
    '## Expected Result',
    expected.trim() || (en ? 'Describe the expected behavior.' : 'Jelaskan perilaku yang diharapkan.'),
  ].join('\n'))
  const formatJson = () => {
    try {
      setJsonOutput(JSON.stringify(JSON.parse(jsonInput), null, 2))
      setJsonError('')
    } catch (error) {
      setJsonOutput('')
      setJsonError(error instanceof Error ? error.message : (en ? 'Invalid JSON.' : 'JSON tidak valid.'))
    }
  }
  const apiScenarios = useMemo(() => {
    const endpoint = apiPath.trim() || '/api/v1/resource'
    const method = apiMethod.toUpperCase()
    const scenarios: { id: string; title: string; steps: string; expected: string }[] = [
      {
        id: 'TC-API-01',
        title: en ? 'Successful request with valid input' : 'Request berhasil dengan input valid',
        steps: en ? `Send a valid ${method} request to ${endpoint} with valid credentials and a valid payload where applicable.` : `Kirim request ${method} yang valid ke ${endpoint} dengan kredensial dan payload valid jika diperlukan.`,
        expected: en ? 'The API returns the documented success status and a response matching its schema.' : 'API mengembalikan status sukses yang didokumentasikan dan respons sesuai schema.',
      },
      ...(apiAuth === 'required' ? [{
        id: 'TC-API-02',
        title: en ? 'Reject missing or invalid credentials' : 'Tolak kredensial yang hilang atau tidak valid',
        steps: en ? `Send ${method} ${endpoint} without a valid access token.` : `Kirim ${method} ${endpoint} tanpa access token yang valid.`,
        expected: en ? 'The API returns 401 Unauthorized without exposing protected data.' : 'API mengembalikan 401 Unauthorized tanpa membocorkan data terlindungi.',
      }] : []),
      {
        id: 'TC-API-03',
        title: en ? 'Enforce resource permissions' : 'Terapkan izin akses resource',
        steps: en ? 'Authenticate as a user without the required permission and request the resource.' : 'Login sebagai pengguna tanpa izin yang diperlukan lalu akses resource.',
        expected: en ? 'The API returns 403 Forbidden and does not disclose restricted data.' : 'API mengembalikan 403 Forbidden dan tidak mengungkap data terbatas.',
      },
      {
        id: 'TC-API-04',
        title: en ? 'Handle an unknown resource' : 'Tangani resource yang tidak ditemukan',
        steps: en ? 'Request a non-existent identifier or an unknown route.' : 'Minta identifier yang tidak ada atau route yang tidak dikenal.',
        expected: en ? 'The API returns 404 Not Found with a consistent error structure.' : 'API mengembalikan 404 Not Found dengan struktur error yang konsisten.',
      },
      {
        id: 'TC-API-05',
        title: en ? 'Reject an unsupported HTTP method' : 'Tolak HTTP method yang tidak didukung',
        steps: en ? 'Send a method that is not supported by the endpoint contract.' : 'Kirim method yang tidak didukung oleh kontrak endpoint.',
        expected: en ? 'The API returns 405 Method Not Allowed and documents allowed methods where applicable.' : 'API mengembalikan 405 Method Not Allowed dan mendokumentasikan method yang diizinkan bila relevan.',
      },
      ...(apiPayload === 'json' && ['POST', 'PUT', 'PATCH'].includes(method) ? [
        {
          id: 'TC-API-06',
          title: en ? 'Reject malformed JSON' : 'Tolak JSON dengan format salah',
          steps: en ? 'Send a request body containing malformed JSON.' : 'Kirim request body dengan JSON yang tidak valid.',
          expected: en ? 'The API returns 400 Bad Request and does not partially persist the request.' : 'API mengembalikan 400 Bad Request dan tidak menyimpan sebagian data.',
        },
        {
          id: 'TC-API-07',
          title: en ? 'Validate the request content type' : 'Validasi content type request',
          steps: en ? 'Send a body with a missing or unsupported Content-Type header.' : 'Kirim body tanpa header Content-Type atau dengan nilai yang tidak didukung.',
          expected: en ? 'The API returns 415 Unsupported Media Type or a clearly documented validation response.' : 'API mengembalikan 415 Unsupported Media Type atau respons validasi yang terdokumentasi.',
        },
        {
          id: 'TC-API-08',
          title: en ? 'Validate required fields and data types' : 'Validasi field wajib dan tipe data',
          steps: en ? 'Omit a required field and then submit a value with an incorrect data type.' : 'Hilangkan field wajib lalu kirim nilai dengan tipe data yang salah.',
          expected: en ? 'The API returns a documented validation response, commonly 422, without persisting invalid data.' : 'API mengembalikan respons validasi yang terdokumentasi, umumnya 422, tanpa menyimpan data invalid.',
        },
      ] : []),
      {
        id: 'TC-API-09',
        title: en ? 'Respect rate limits' : 'Patuhi batas rate limit',
        steps: en ? 'Send requests above the documented rate threshold in a controlled test environment.' : 'Kirim request melebihi ambang rate limit yang didokumentasikan di lingkungan pengujian terkontrol.',
        expected: en ? 'The API returns 429 Too Many Requests and provides retry guidance where supported.' : 'API mengembalikan 429 Too Many Requests dan memberikan panduan retry bila didukung.',
      },
      {
        id: 'TC-API-10',
        title: en ? 'Fail safely during a server error' : 'Gagal dengan aman saat server error',
        steps: en ? 'Simulate a controlled upstream failure or timeout.' : 'Simulasikan kegagalan upstream atau timeout secara terkontrol.',
        expected: en ? 'The API returns a documented 5xx response, avoids leaking internals, and records diagnostic details securely.' : 'API mengembalikan respons 5xx yang terdokumentasi, tidak membocorkan detail internal, dan mencatat diagnostik secara aman.',
      },
    ]
    return scenarios
  }, [apiMethod, apiPath, apiAuth, apiPayload, en])

  const downloadReleaseScorecard = () => {
    const rows = [
      ['Category', 'Check', 'Critical', 'Status'],
      ...releaseChecks.map(item => [item.category, item.title, item.critical ? 'Yes' : 'No', releaseChecked[item.id] ? 'Complete' : 'Open']),
      ['Summary', 'Weighted readiness score', '', String(releaseScore) + '%'],
      ['Summary', 'Release decision', '', releaseStatus],
    ]
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-release-readiness.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'Release readiness scorecard CSV downloaded.' : 'CSV kesiapan rilis berhasil diunduh.')
  }
  const copyReleaseScorecard = () => {
    const report = [
      '# ' + (en ? 'Release readiness scorecard' : 'Scorecard kesiapan rilis'),
      '',
      '- ' + (en ? 'Weighted readiness score' : 'Skor kesiapan berbobot') + ': ' + releaseScore + '%',
      '- ' + (en ? 'Decision' : 'Keputusan') + ': ' + releaseStatus,
      '- ' + (en ? 'Critical checks still open' : 'Pemeriksaan kritis yang belum selesai') + ': ' + releaseCriticalMissing,
      '',
      ...releaseChecks.map(item => '- [' + (releaseChecked[item.id] ? 'x' : ' ') + '] ' + item.category + ' — ' + item.title + (item.critical ? ' (CRITICAL)' : '')),
    ].join('\n')
    copyText(report)
  }
  const downloadApiMatrix = () => {
    const rows = [
      ['Case ID', 'HTTP Method', 'Endpoint', 'Scenario', 'Steps', 'Expected Result'],
      ...apiScenarios.map(item => [item.id, apiMethod, apiPath.trim() || '/api/v1/resource', item.title, item.steps, item.expected]),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-api-test-matrix.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'API test matrix CSV downloaded.' : 'CSV matriks pengujian API berhasil diunduh.')
  }
  const analyzeOpenApi = () => {
    try {
      const document = JSON.parse(openApiSpec) as Record<string, unknown>
      const version = typeof document.openapi === 'string' ? document.openapi : ''
      if (!version.startsWith('3.')) throw new Error(en ? 'This analyzer currently supports OpenAPI 3.x JSON documents.' : 'Analyzer ini saat ini mendukung dokumen JSON OpenAPI 3.x.')
      if (!document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) throw new Error(en ? 'The document must contain a valid "paths" object.' : 'Dokumen harus memiliki objek "paths" yang valid.')
      const paths = document.paths as Record<string, unknown>
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']
      const results: Array<{ method: string; path: string; summary: string; operationId: string; responses: string; parameters: string; requestBody: boolean; security: boolean }> = []
      Object.entries(paths).forEach(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) return
        const pathObject = pathItem as Record<string, unknown>
        methods.forEach(method => {
          const operation = pathObject[method]
          if (!operation || typeof operation !== 'object' || Array.isArray(operation)) return
          const op = operation as Record<string, unknown>
          const pathParameters = Array.isArray(pathObject.parameters) ? pathObject.parameters : []
          const operationParameters = Array.isArray(op.parameters) ? op.parameters : []
          const parameterNames = [...pathParameters, ...operationParameters].flatMap(parameter => {
            if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) return []
            const item = parameter as Record<string, unknown>
            return typeof item.name === 'string' ? [item.name + (item.required === true ? ' *' : '')] : []
          })
          const responseObject = op.responses && typeof op.responses === 'object' && !Array.isArray(op.responses) ? op.responses as Record<string, unknown> : {}
          const responseCodes = Object.keys(responseObject).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          const rootSecurity = Array.isArray(document.security) && document.security.length > 0
          const operationSecurity = Array.isArray(op.security) ? op.security.length > 0 : rootSecurity
          results.push({
            method: method.toUpperCase(),
            path,
            summary: typeof op.summary === 'string' ? op.summary : typeof op.description === 'string' ? op.description : (en ? 'No summary provided' : 'Ringkasan belum tersedia'),
            operationId: typeof op.operationId === 'string' ? op.operationId : '',
            responses: responseCodes.join(', ') || (en ? 'Undocumented' : 'Belum didokumentasikan'),
            parameters: parameterNames.join(', '),
            requestBody: Boolean(op.requestBody),
            security: operationSecurity,
          })
        })
      })

      const findings: Array<{ method: string; path: string; severity: 'error' | 'warning' | 'info'; code: string; message: string }> = []
      const addFinding = (method: string, path: string, severity: 'error' | 'warning' | 'info', code: string, english: string, indonesian: string) => {
        findings.push({ method, path, severity, code, message: en ? english : indonesian })
      }
      Object.entries(paths).forEach(([path, rawPathItem]) => {
        if (!rawPathItem || typeof rawPathItem !== 'object' || Array.isArray(rawPathItem)) return
        const pathItem = rawPathItem as Record<string, unknown>
        methods.forEach(method => {
          const rawOperation = pathItem[method]
          if (!rawOperation || typeof rawOperation !== 'object' || Array.isArray(rawOperation)) return
          const operation = rawOperation as Record<string, unknown>
          const responses = operation.responses && typeof operation.responses === 'object' && !Array.isArray(operation.responses) ? operation.responses as Record<string, unknown> : {}
          const responseCodes = Object.keys(responses)
          if (!responseCodes.length) addFinding(method.toUpperCase(), path, 'error', 'RESPONSES_MISSING', 'No responses are documented for this operation.', 'Operasi ini belum mendokumentasikan respons.')
          else {
            if (!responseCodes.some(code => code.length === 3 && code.startsWith('2')) && !responseCodes.includes('default')) addFinding(method.toUpperCase(), path, 'warning', 'SUCCESS_RESPONSE_MISSING', 'No 2xx success response or default response is documented.', 'Belum ada respons sukses 2xx atau respons default yang didokumentasikan.')
            responseCodes.forEach(code => {
              const response = responses[code]
              if (response && typeof response === 'object' && !Array.isArray(response) && (typeof (response as Record<string, unknown>).description !== 'string' || !String((response as Record<string, unknown>).description ?? '').trim())) {
                addFinding(method.toUpperCase(), path, 'warning', 'RESPONSE_DESCRIPTION_MISSING', 'Response "' + code + '" has no description.', 'Respons "' + code + '" belum memiliki deskripsi.')
              }
            })
          }
          const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : []
          const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : []
          const parameters = [...pathParameters, ...operationParameters].filter(parameter => parameter && typeof parameter === 'object' && !Array.isArray(parameter)) as Record<string, unknown>[]
          const byName = new Map<string, Record<string, unknown>>()
          parameters.forEach(parameter => { if (parameter.in === 'path' && typeof parameter.name === 'string') byName.set(parameter.name, parameter) })
          const variables = path.split('{').slice(1).map(part => part.split('}')[0]).filter(Boolean)
          variables.forEach(name => {
            const parameter = byName.get(name)
            if (!parameter) addFinding(method.toUpperCase(), path, 'error', 'PATH_PARAM_MISSING', 'Path variable "' + name + '" has no declared path parameter.', 'Variabel path "' + name + '" belum memiliki deklarasi parameter path.')
            else if (parameter.required !== true) addFinding(method.toUpperCase(), path, 'error', 'PATH_PARAM_NOT_REQUIRED', 'Path parameter "' + name + '" must set required: true.', 'Parameter path "' + name + '" harus menetapkan required: true.')
            else if (!parameter.schema || typeof parameter.schema !== 'object' || Array.isArray(parameter.schema)) addFinding(method.toUpperCase(), path, 'warning', 'PATH_PARAM_SCHEMA_MISSING', 'Path parameter "' + name + '" has no schema.', 'Parameter path "' + name + '" belum memiliki schema.')
          })
          if (['post', 'put', 'patch'].includes(method) && operation.requestBody && typeof operation.requestBody === 'object' && !Array.isArray(operation.requestBody)) {
            const body = operation.requestBody as Record<string, unknown>
            const content = body.content && typeof body.content === 'object' && !Array.isArray(body.content) ? body.content as Record<string, unknown> : {}
            const hasRequestSchema = Object.values(content).some(media => media && typeof media === 'object' && !Array.isArray(media) && (media as Record<string, unknown>).schema && typeof (media as Record<string, unknown>).schema === 'object')
            if (!hasRequestSchema) addFinding(method.toUpperCase(), path, 'warning', 'REQUEST_SCHEMA_MISSING', 'Request body is declared but has no usable schema.', 'Request body dideklarasikan tetapi belum memiliki schema yang dapat digunakan.')
          } else if (['post', 'put', 'patch'].includes(method) && !operation.requestBody) {
            addFinding(method.toUpperCase(), path, 'info', 'REQUEST_BODY_UNDECLARED', 'Write operation has no request body; confirm this is intentional.', 'Operasi penulisan tidak memiliki request body; pastikan ini memang disengaja.')
          }
          if (typeof operation.operationId !== 'string' || !operation.operationId.trim()) addFinding(method.toUpperCase(), path, 'info', 'OPERATION_ID_MISSING', 'No operationId is declared; generated clients may have less stable names.', 'operationId belum dideklarasikan; nama pada client hasil generasi mungkin kurang stabil.')
        })
      })
      setOpenApiIssues(findings)
      if (!results.length) throw new Error(en ? 'No HTTP operations were found under "paths".' : 'Tidak ada operasi HTTP yang ditemukan di dalam "paths".')
      setOpenApiResults(results)
      setOpenApiError('')
      setOpenApiAnalyzed(true)
      setCopyStatus('')
    } catch (error) {
      setOpenApiResults([])
      setOpenApiIssues([])
      setOpenApiAnalyzed(false)
      setOpenApiError(error instanceof Error ? error.message : (en ? 'Unable to analyze this document.' : 'Dokumen tidak dapat dianalisis.'))
    }
  }
  const downloadOpenApiMatrix = () => {
    const rows = [
      ['Method', 'Path', 'Summary', 'Operation ID', 'Documented Responses', 'Parameters', 'Request Body', 'Security'],
      ...openApiResults.map(item => [item.method, item.path, item.summary, item.operationId, item.responses, item.parameters, item.requestBody ? 'Yes' : 'No', item.security ? 'Required' : 'Not declared']),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-openapi-contract-matrix.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'OpenAPI contract matrix CSV downloaded.' : 'CSV matriks kontrak OpenAPI berhasil diunduh.')
  }
  return <main id="main-content" className="engineering-lab container">
    <header className="lab-header"><span className="section-kicker">{en ? 'PRACTICAL ENGINEERING TOOLKIT' : 'TOOLKIT ENGINEERING PRAKTIS'}</span><h1>{en ? 'Engineering' : 'Engineering'} <span>Lab.</span></h1><p>{en ? 'Small, useful tools for QA workflows, clearer bug reports, and safer data handling. Processing runs locally in your browser.' : 'Perangkat praktis untuk alur kerja QA, laporan bug yang jelas, dan pengolahan data yang aman. Pemrosesan berjalan lokal di browser Anda.'}</p><div className="lab-local-note"><ShieldCheck size={16} /> {en ? 'No account or backend required — your inputs stay in this browser session.' : 'Tanpa akun atau backend — input Anda tetap diproses di browser ini.'}</div></header>
    <div className="lab-tool-tabs" role="tablist" aria-label={en ? 'Engineering tools' : 'Tool engineering'}>
      <button role="tab" aria-selected={activeTool === 'test-cases'} className={activeTool === 'test-cases' ? 'active' : ''} onClick={() => { setActiveTool('test-cases'); setCopyStatus('') }}><ShieldCheck size={16} /> {en ? 'Test Case Builder' : 'Pembuat Test Case'}</button>
      <button role="tab" aria-selected={activeTool === 'bug-report'} className={activeTool === 'bug-report' ? 'active' : ''} onClick={() => { setActiveTool('bug-report'); setCopyStatus('') }}><BookOpen size={16} /> {en ? 'Bug Report' : 'Laporan Bug'}</button>
      <button role="tab" aria-selected={activeTool === 'json'} className={activeTool === 'json' ? 'active' : ''} onClick={() => { setActiveTool('json'); setCopyStatus('') }}><Braces size={16} /> JSON {en ? 'Formatter' : 'Formatter'}</button>
      <button role="tab" aria-selected={activeTool === 'api-matrix'} className={activeTool === 'api-matrix' ? 'active' : ''} onClick={() => { setActiveTool('api-matrix'); setCopyStatus(''); setApiMatrixGenerated(false) }}><ShieldCheck size={16} /> {en ? 'API Test Matrix' : 'Matriks Tes API'}</button>
      <button role="tab" aria-selected={activeTool === 'openapi'} className={activeTool === 'openapi' ? 'active' : ''} onClick={() => { setActiveTool('openapi'); setCopyStatus(''); setOpenApiError(''); setOpenApiAnalyzed(false) }}><Braces size={16} /> {en ? 'OpenAPI Analyzer' : 'Analyzer OpenAPI'}</button>
      <button role="tab" aria-selected={activeTool === 'release-scorecard'} className={activeTool === 'release-scorecard' ? 'active' : ''} onClick={() => { setActiveTool('release-scorecard'); setCopyStatus('') }}><ShieldCheck size={16} /> {en ? 'Release Readiness' : 'Kesiapan Rilis'}</button>
      <button role="tab" aria-selected={activeTool === 'postmortem'} className={activeTool === 'postmortem' ? 'active' : ''} onClick={() => { setActiveTool('postmortem'); setCopyStatus('') }}><BookOpen size={16} /> {en ? 'Incident Postmortem' : 'Postmortem Insiden'}</button>
    </div>
    <section className="lab-tool-panel" role="tabpanel">
      {activeTool === 'test-cases' && <div className="lab-form">
        <div className="lab-panel-heading"><span className="section-kicker">01 / QA AUTOMATION</span><h2>{en ? 'Test case starter kit' : 'Starter kit test case'}</h2><p>{en ? 'Create a baseline checklist, then refine each case against the product requirements.' : 'Buat checklist awal, lalu sesuaikan setiap kasus dengan kebutuhan produk.'}</p></div>
        <label className="lab-field"><span>{en ? 'Feature or user journey' : 'Fitur atau alur pengguna'}</span><input value={feature} onChange={event => { setFeature(event.target.value); setGenerated(false) }} placeholder={en ? 'e.g. Password reset' : 'mis. Reset password'} /></label>
        <button className="button button-primary lab-action" onClick={() => setGenerated(true)}>{en ? 'Generate test cases' : 'Buat test case'} <ArrowRight size={16} /></button>
        {generated && <div className="lab-generated"><div className="lab-output-heading"><h3>{en ? 'Generated test cases' : 'Test case yang dihasilkan'}</h3><button className="copy-link-button" onClick={() => copyText(generatedCases.map((item, index) => `TC-${String(index + 1).padStart(2, '0')} — ${item.title}\nSteps: ${item.steps}\nExpected: ${item.expected}`).join('\n\n'))}><Copy size={14} /> {en ? 'Copy all' : 'Salin semua'}</button></div><div className="lab-case-list">{generatedCases.map((item, index) => <article className="lab-case" key={item.title}><span className="lab-case-id">TC-{String(index + 1).padStart(2, '0')}</span><div><h4>{item.title}</h4><p><strong>{en ? 'Steps' : 'Langkah'}:</strong> {item.steps}</p><p><strong>{en ? 'Expected' : 'Hasil yang diharapkan'}:</strong> {item.expected}</p></div></article>)}</div></div>}
      </div>}
      {activeTool === 'bug-report' && <div className="lab-form">
        <div className="lab-panel-heading"><span className="section-kicker">02 / DEFECT MANAGEMENT</span><h2>{en ? 'Build a clear bug report' : 'Susun laporan bug yang jelas'}</h2><p>{en ? 'Capture reproducible steps, impact, and expected behavior in a consistent format.' : 'Catat langkah reproduksi, dampak, dan perilaku yang diharapkan dengan format konsisten.'}</p></div>
        <label className="lab-field"><span>{en ? 'Bug title' : 'Judul bug'}</span><input value={bugTitle} onChange={event => setBugTitle(event.target.value)} placeholder={en ? 'e.g. Login button stays disabled' : 'mis. Tombol login tetap nonaktif'} /></label>
        <div className="lab-field-row"><label className="lab-field"><span>{en ? 'Severity' : 'Severity'}</span><select value={severity} onChange={event => setSeverity(event.target.value)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label className="lab-field"><span>{en ? 'Environment' : 'Lingkungan'}</span><input value={environment} onChange={event => setEnvironment(event.target.value)} /></label></div>
        <label className="lab-field"><span>{en ? 'Steps to reproduce' : 'Langkah reproduksi'}</span><textarea rows={3} value={steps} onChange={event => setSteps(event.target.value)} placeholder={en ? '1. Open the page…' : '1. Buka halaman…'} /></label>
        <div className="lab-field-row"><label className="lab-field"><span>{en ? 'Actual result' : 'Hasil aktual'}</span><textarea rows={3} value={actual} onChange={event => setActual(event.target.value)} /></label><label className="lab-field"><span>{en ? 'Expected result' : 'Hasil yang diharapkan'}</span><textarea rows={3} value={expected} onChange={event => setExpected(event.target.value)} /></label></div>
        <button className="button button-primary lab-action" onClick={generateBugReport}>{en ? 'Generate bug report' : 'Buat laporan bug'} <ArrowRight size={16} /></button>
        {bugReport && <div className="lab-generated"><div className="lab-output-heading"><h3>{en ? 'Ready-to-copy report' : 'Laporan siap disalin'}</h3><button className="copy-link-button" onClick={() => copyText(bugReport)}><Copy size={14} /> {en ? 'Copy report' : 'Salin laporan'}</button></div><pre className="lab-output">{bugReport}</pre></div>}
      </div>}
      {activeTool === 'json' && <div className="lab-form">
        <div className="lab-panel-heading"><span className="section-kicker">03 / DATA UTILITIES</span><h2>{en ? 'Format and validate JSON' : 'Rapikan dan validasi JSON'}</h2><p>{en ? 'Validate syntax and format JSON locally. No payload is sent to a server.' : 'Validasi sintaks dan rapikan JSON secara lokal. Tidak ada payload yang dikirim ke server.'}</p></div>
        <label className="lab-field"><span>{en ? 'JSON input' : 'Input JSON'}</span><textarea rows={9} spellCheck={false} value={jsonInput} onChange={event => { setJsonInput(event.target.value); setJsonOutput(''); setJsonError('') }} /></label>
        <button className="button button-primary lab-action" onClick={formatJson}>{en ? 'Format JSON' : 'Rapikan JSON'} <Braces size={16} /></button>
        {jsonError && <p className="lab-error" role="alert">{en ? 'Invalid JSON:' : 'JSON tidak valid:'} {jsonError}</p>}
        {jsonOutput && <div className="lab-generated"><div className="lab-output-heading"><h3>{en ? 'Formatted output' : 'Hasil format'}</h3><button className="copy-link-button" onClick={() => copyText(jsonOutput)}><Copy size={14} /> {en ? 'Copy JSON' : 'Salin JSON'}</button></div><pre className="lab-output" aria-label={en ? 'Formatted JSON output' : 'Hasil JSON terformat'}>{jsonOutput}</pre></div>}
      </div>}
      {activeTool === 'api-matrix' && <div className="lab-form api-matrix-form">
        <div className="lab-panel-heading"><span className="section-kicker">04 / API QUALITY ENGINEERING</span><h2>{en ? 'Design an API test matrix' : 'Rancang matriks pengujian API'}</h2><p>{en ? 'Generate a practical contract-testing checklist for an endpoint, then refine it against your API specification. This tool creates test ideas only; it does not send requests.' : 'Buat checklist contract testing praktis untuk sebuah endpoint, lalu sesuaikan dengan spesifikasi API Anda. Tool ini hanya membuat ide pengujian dan tidak mengirim request.'}</p></div>
        <div className="api-matrix-fields">
          <label className="lab-field"><span>{en ? 'HTTP method' : 'HTTP method'}</span><select value={apiMethod} onChange={event => { setApiMethod(event.target.value); setApiMatrixGenerated(false) }}><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option><option>OPTIONS</option></select></label>
          <label className="lab-field"><span>{en ? 'Endpoint path' : 'Path endpoint'}</span><input value={apiPath} onChange={event => { setApiPath(event.target.value); setApiMatrixGenerated(false) }} placeholder="/api/v1/users" /></label>
          <label className="lab-field"><span>{en ? 'Authentication' : 'Autentikasi'}</span><select value={apiAuth} onChange={event => { setApiAuth(event.target.value); setApiMatrixGenerated(false) }}><option value="required">{en ? 'Required' : 'Wajib'}</option><option value="optional">{en ? 'Optional / public' : 'Opsional / publik'}</option></select></label>
          <label className="lab-field"><span>{en ? 'Request payload' : 'Payload request'}</span><select value={apiPayload} onChange={event => { setApiPayload(event.target.value); setApiMatrixGenerated(false) }}><option value="json">JSON</option><option value="none">{en ? 'No body' : 'Tanpa body'}</option></select></label>
        </div>
        <div className="api-matrix-note"><ShieldCheck size={15} /><span>{en ? 'Privacy-first: all inputs stay in your browser. No API endpoint is called.' : 'Mengutamakan privasi: semua input tetap di browser. Tidak ada endpoint API yang dipanggil.'}</span></div>
        <button className="button button-primary lab-action" onClick={() => { setApiMatrixGenerated(true); setCopyStatus('') }}>{en ? 'Generate API test matrix' : 'Buat matriks tes API'} <ArrowRight size={16} /></button>
        {apiMatrixGenerated && <div className="lab-generated"><div className="lab-output-heading"><div><h3>{en ? 'Generated API scenarios' : 'Skenario API yang dihasilkan'}</h3><p className="api-matrix-count">{apiScenarios.length} {en ? 'scenarios · review before execution' : 'skenario · tinjau sebelum dijalankan'}</p></div><div className="api-matrix-actions"><button className="copy-link-button" onClick={() => copyText(apiScenarios.map(item => `## ${item.id} — ${item.title}\n\n- Request: ${apiMethod} ${apiPath.trim() || '/api/v1/resource'}\n- Steps: ${item.steps}\n- Expected: ${item.expected}`).join('\n\n'))}><Copy size={14} /> {en ? 'Copy Markdown' : 'Salin Markdown'}</button><button className="copy-link-button" onClick={downloadApiMatrix}><ArrowDownRight size={14} /> {en ? 'Download CSV' : 'Unduh CSV'}</button></div></div><div className="lab-case-list">{apiScenarios.map(item => <article className="lab-case api-matrix-case" key={item.id}><span className="lab-case-id">{item.id}</span><div><h4>{item.title}</h4><p><strong>{en ? 'Request' : 'Request'}:</strong> {apiMethod} {apiPath.trim() || '/api/v1/resource'}</p><p><strong>{en ? 'Steps' : 'Langkah'}:</strong> {item.steps}</p><p><strong>{en ? 'Expected' : 'Hasil yang diharapkan'}:</strong> {item.expected}</p></div></article>)}</div></div>}
      </div>}

      {activeTool === 'release-scorecard' && <div className="lab-form release-scorecard">
        <div className="lab-panel-heading"><span className="section-kicker">06 / RELEASE GOVERNANCE</span><h2>{en ? 'Release readiness scorecard' : 'Scorecard kesiapan rilis'}</h2><p>{en ? 'Turn release confidence into an evidence-based checklist across product quality, API contracts, security, reliability, and recovery. This score is a planning aid, not an automatic production approval.' : 'Ubah keyakinan rilis menjadi checklist berbasis bukti untuk kualitas produk, kontrak API, keamanan, keandalan, dan pemulihan. Skor ini membantu perencanaan, bukan persetujuan produksi otomatis.'}</p></div>
        <div className="release-score-overview">
          <div className="release-score-ring" style={{ '--release-score': releaseScore } as React.CSSProperties} role="img" aria-label={(en ? 'Readiness score ' : 'Skor kesiapan ') + releaseScore + ' percent'}><div><strong>{releaseScore}%</strong><span>{en ? 'Readiness' : 'Kesiapan'}</span></div></div>
          <div className="release-score-summary"><span className={'release-status-pill ' + (releaseScore === 100 ? 'status-ready' : releaseCriticalMissing > 0 ? 'status-blocked' : 'status-follow-up')}>{releaseStatus}</span><h3>{releaseCompleted} / {releaseChecks.length} {en ? 'checks complete' : 'pemeriksaan selesai'}</h3><p>{releaseCriticalMissing ? (en ? releaseCriticalMissing + ' critical checks remain open. Treat this as a release blocker until the evidence is reviewed.' : releaseCriticalMissing + ' pemeriksaan kritis masih terbuka. Perlakukan sebagai penghambat rilis sampai buktinya ditinjau.') : (en ? 'All critical checks are complete. Review remaining evidence and obtain the required sign-off.' : 'Semua pemeriksaan kritis selesai. Tinjau bukti yang tersisa dan dapatkan persetujuan yang diperlukan.')}</p><div className="release-progress-track" role="progressbar" aria-label={en ? 'Release checklist completion' : 'Penyelesaian checklist rilis'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(releaseCompleted / releaseChecks.length * 100)}><span style={{ width: Math.round(releaseCompleted / releaseChecks.length * 100) + '%' }} /></div><small>{Math.round(releaseCompleted / releaseChecks.length * 100)}% {en ? 'checklist completion' : 'checklist selesai'} · {en ? 'weighted score' : 'skor berbobot'}</small></div>
        </div>
        <div className="release-checklist-heading"><div><h3>{en ? 'Evidence checklist' : 'Checklist bukti'}</h3><p>{en ? 'Mark a check complete only when supporting evidence has been reviewed.' : 'Tandai selesai hanya jika bukti pendukung sudah ditinjau.'}</p></div><div className="release-score-actions"><button className="copy-link-button" onClick={copyReleaseScorecard}><Copy size={14} /> {en ? 'Copy report' : 'Salin laporan'}</button><button className="copy-link-button" onClick={downloadReleaseScorecard}><ArrowDownRight size={14} /> {en ? 'Export CSV' : 'Ekspor CSV'}</button></div></div>
        <div className="release-check-groups">{[...new Set(releaseChecks.map(item => item.category))].map(category => <section className="release-check-group" key={category}><h4>{category}<span>{releaseChecks.filter(item => item.category === category && releaseChecked[item.id]).length}/{releaseChecks.filter(item => item.category === category).length}</span></h4>{releaseChecks.filter(item => item.category === category).map(item => <label className={'release-check-item ' + (releaseChecked[item.id] ? 'is-complete' : '')} key={item.id}><input type="checkbox" checked={Boolean(releaseChecked[item.id])} onChange={event => setReleaseChecked(current => ({ ...current, [item.id]: event.target.checked }))} /><span className="release-check-copy"><strong>{item.title}</strong><small>{item.critical ? (en ? 'Critical gate' : 'Gerbang kritis') : (en ? 'Quality check' : 'Pemeriksaan kualitas')}</small></span>{item.critical && <span className="release-critical-tag">{en ? 'CRITICAL' : 'KRITIS'}</span>}</label>)}</section>)}</div>
        <p className="release-score-footnote"><ShieldCheck size={15} /> {en ? 'Local-only checklist: selections stay in this browser session. Export the report before leaving if you need a record.' : 'Checklist lokal: pilihan tersimpan selama sesi browser ini. Ekspor laporan sebelum keluar jika Anda memerlukan catatan.'}</p>
      </div>}
      {activeTool === 'postmortem' && <div className="lab-form postmortem-form">
        <div className="lab-panel-heading"><span className="section-kicker">07 / INCIDENT LEARNING</span><h2>{en ? 'Build a blameless incident postmortem' : 'Susun postmortem insiden tanpa menyalahkan'}</h2><p>{en ? 'Turn an incident into a structured learning record: impact, timeline, root cause, recovery, and accountable follow-ups. Everything is processed locally.' : 'Ubah insiden menjadi catatan pembelajaran terstruktur: dampak, linimasa, akar penyebab, pemulihan, dan tindak lanjut yang jelas. Semua diproses secara lokal.'}</p></div>
        <div className="api-matrix-note"><ShieldCheck size={15} /><span>{en ? 'Blameless by design · local-only processing · no incident data is uploaded. Avoid entering credentials or personal data.' : 'Dirancang tanpa menyalahkan · pemrosesan lokal · data insiden tidak diunggah. Hindari memasukkan kredensial atau data pribadi.'}</span></div>
        <div className="postmortem-section"><h3>{en ? 'Incident overview' : 'Ringkasan insiden'}</h3>
          <label className="lab-field"><span>{en ? 'Incident title' : 'Judul insiden'}</span><input value={incidentTitle} onChange={event => setIncidentTitle(event.target.value)} placeholder={en ? 'e.g. Checkout latency spike' : 'mis. Lonjakan latensi checkout'} /></label>
          <div className="postmortem-grid">
            <label className="lab-field"><span>{en ? 'Severity' : 'Tingkat keparahan'}</span><select value={incidentSeverity} onChange={event => setIncidentSeverity(event.target.value)}><option value="SEV-1">SEV-1 — {en ? 'Critical' : 'Kritis'}</option><option value="SEV-2">SEV-2 — {en ? 'High' : 'Tinggi'}</option><option value="SEV-3">SEV-3 — {en ? 'Moderate' : 'Sedang'}</option><option value="SEV-4">SEV-4 — {en ? 'Low' : 'Rendah'}</option></select></label>
            <label className="lab-field"><span>{en ? 'Current status' : 'Status saat ini'}</span><select value={incidentStatus} onChange={event => setIncidentStatus(event.target.value)}><option value="Investigating">{en ? 'Investigating' : 'Diinvestigasi'}</option><option value="Monitoring">{en ? 'Monitoring' : 'Dipantau'}</option><option value="Resolved">{en ? 'Resolved' : 'Selesai'}</option></select></label>
          </div>
          <div className="postmortem-grid">
            <label className="lab-field"><span>{en ? 'Start time' : 'Waktu mulai'}</span><input type="datetime-local" value={incidentStart} onChange={event => setIncidentStart(event.target.value)} /></label>
            <label className="lab-field"><span>{en ? 'End time' : 'Waktu berakhir'}</span><input type="datetime-local" value={incidentEnd} onChange={event => setIncidentEnd(event.target.value)} /></label>
          </div>
        </div>
        <div className="postmortem-section"><h3>{en ? 'Impact and detection' : 'Dampak dan deteksi'}</h3>
          <label className="lab-field"><span>{en ? 'Customer and business impact' : 'Dampak terhadap pelanggan dan bisnis'}</span><textarea rows={3} value={incidentImpact} onChange={event => setIncidentImpact(event.target.value)} placeholder={en ? 'Affected services, users, duration, and measurable impact…' : 'Layanan/pengguna terdampak, durasi, dan dampak terukur…'} /></label>
          <label className="lab-field"><span>{en ? 'Detection and signals' : 'Deteksi dan sinyal'}</span><textarea rows={2} value={incidentDetection} onChange={event => setIncidentDetection(event.target.value)} placeholder={en ? 'Alert, monitoring signal, or customer report…' : 'Alert, sinyal monitoring, atau laporan pelanggan…'} /></label>
          <label className="lab-field"><span>{en ? 'Timeline (one event per line)' : 'Linimasa (satu peristiwa per baris)'}</span><textarea rows={4} value={incidentTimeline} onChange={event => setIncidentTimeline(event.target.value)} placeholder={en ? '09:02 UTC — Alert triggered\n09:08 UTC — Mitigation started\n09:21 UTC — Service recovered' : '16:02 WIB — Alert terpicu\n16:08 WIB — Mitigasi dimulai\n16:21 WIB — Layanan pulih'} /></label>
        </div>
        <div className="postmortem-section"><h3>{en ? 'Analysis and recovery' : 'Analisis dan pemulihan'}</h3>
          <label className="lab-field"><span>{en ? 'Root cause' : 'Akar penyebab'}</span><textarea rows={3} value={incidentRootCause} onChange={event => setIncidentRootCause(event.target.value)} placeholder={en ? 'Which system conditions made this incident possible?' : 'Kondisi sistem apa yang memungkinkan insiden ini terjadi?'} /></label>
          <label className="lab-field"><span>{en ? 'Contributing factors (one per line)' : 'Faktor kontribusi (satu per baris)'}</span><textarea rows={2} value={incidentContributors} onChange={event => setIncidentContributors(event.target.value)} placeholder={en ? 'Missing alert\nInsufficient load test' : 'Alert belum tersedia\nLoad test belum memadai'} /></label>
          <label className="lab-field"><span>{en ? 'Resolution and recovery' : 'Resolusi dan pemulihan'}</span><textarea rows={3} value={incidentResolution} onChange={event => setIncidentResolution(event.target.value)} placeholder={en ? 'Mitigation, rollback, recovery, and verification…' : 'Mitigasi, rollback, pemulihan, dan verifikasi…'} /></label>
          <label className="lab-field"><span>{en ? 'Follow-up actions (one per line)' : 'Tindak lanjut (satu per baris)'}</span><textarea rows={3} value={incidentFollowUps} onChange={event => setIncidentFollowUps(event.target.value)} placeholder={en ? 'Add latency alert — Platform — 2026-10-20' : 'Tambah alert latensi — Platform — 2026-10-20'} /></label>
        </div>
        <div className="postmortem-actions"><button className="button button-primary lab-action" onClick={generatePostmortem}>{en ? 'Generate postmortem' : 'Buat postmortem'} <ArrowRight size={16} /></button></div>
        {postmortemReport && <div className="lab-generated"><div className="lab-output-heading"><div><h3>{en ? 'Postmortem report' : 'Laporan postmortem'}</h3><p>{en ? 'Review the report and assign follow-up owners before sharing.' : 'Tinjau laporan dan tetapkan penanggung jawab tindak lanjut sebelum dibagikan.'}</p></div><div className="postmortem-actions"><button className="copy-link-button" onClick={() => copyText(postmortemReport)}><Copy size={14} /> {en ? 'Copy Markdown' : 'Salin Markdown'}</button><button className="copy-link-button" onClick={downloadPostmortem}><ArrowDownRight size={14} /> {en ? 'Download .md' : 'Unduh .md'}</button></div></div><pre className="lab-output postmortem-output" aria-label={en ? 'Postmortem Markdown output' : 'Output Markdown postmortem'}>{postmortemReport}</pre></div>}
      </div>}
      {activeTool === 'openapi' && <div className="lab-form openapi-form">
        <div className="lab-panel-heading"><span className="section-kicker">05 / CONTRACT QUALITY</span><h2>{en ? 'Inspect an OpenAPI contract' : 'Periksa kontrak OpenAPI'}</h2><p>{en ? 'Paste an OpenAPI 3.x JSON document to inventory endpoints, methods, response codes, parameters, request bodies, and declared security. Analysis runs locally; it never calls your API.' : 'Tempel dokumen JSON OpenAPI 3.x untuk memetakan endpoint, method, kode respons, parameter, request body, dan keamanan yang dideklarasikan. Analisis berjalan lokal dan tidak memanggil API Anda.'}</p></div>
        <label className="lab-field"><span>{en ? 'OpenAPI JSON document' : 'Dokumen JSON OpenAPI'}</span><textarea className="openapi-input" rows={13} spellCheck={false} value={openApiSpec} onChange={event => { setOpenApiSpec(event.target.value); setOpenApiAnalyzed(false); setOpenApiError('') }} /></label>
        <div className="api-matrix-note"><ShieldCheck size={15} /><span>{en ? 'Local-only parsing · OpenAPI 3.x JSON · no network requests · required path parameters are marked with *' : 'Parsing lokal · JSON OpenAPI 3.x · tanpa request jaringan · parameter path wajib ditandai *'}</span></div>
        <button className="button button-primary lab-action" onClick={analyzeOpenApi}>{en ? 'Analyze contract' : 'Analisis kontrak'} <ArrowRight size={16} /></button>
        {openApiError && <p className="lab-error" role="alert">{openApiError}</p>}
        {openApiAnalyzed && <div className="lab-generated"><div className="lab-output-heading"><div><h3>{en ? 'Endpoint inventory' : 'Inventaris endpoint'}</h3><p className="api-matrix-count">{openApiResults.length} {en ? 'operations discovered' : 'operasi ditemukan'}</p></div><div className="api-matrix-actions"><button className="copy-link-button" onClick={() => copyText(openApiResults.map(item => `## ${item.method} ${item.path}\n\n- Summary: ${item.summary}\n- Operation ID: ${item.operationId || '—'}\n- Responses: ${item.responses}\n- Parameters: ${item.parameters || '—'}\n- Request body: ${item.requestBody ? 'Yes' : 'No'}\n- Security declared: ${item.security ? 'Yes' : 'No'}`).join('\n\n'))}><Copy size={14} /> {en ? 'Copy Markdown' : 'Salin Markdown'}</button><button className="copy-link-button" onClick={downloadOpenApiMatrix}><ArrowDownRight size={14} /> {en ? 'Export CSV' : 'Ekspor CSV'}</button></div></div><div className="openapi-summary-grid"><div><span>{en ? 'Operations' : 'Operasi'}</span><strong>{openApiResults.length}</strong></div><div><span>{en ? 'Errors' : 'Error'}</span><strong>{openApiIssues.filter(issue => issue.severity === 'error').length}</strong></div><div><span>{en ? 'Warnings' : 'Peringatan'}</span><strong>{openApiIssues.filter(issue => issue.severity === 'warning').length}</strong></div><div><span>{en ? 'Info' : 'Info'}</span><strong>{openApiIssues.filter(issue => issue.severity === 'info').length}</strong></div></div><section className="openapi-issues" aria-label={en ? 'Contract validation issues' : 'Temuan validasi kontrak'}><div className="openapi-issues-heading"><div><h3>{en ? 'Contract quality checks' : 'Pemeriksaan kualitas kontrak'}</h3><p>{en ? 'Static checks for response coverage, path parameters, request schemas, and operation metadata.' : 'Pemeriksaan statis untuk cakupan respons, parameter path, schema request, dan metadata operasi.'}</p></div><span className={openApiIssues.some(issue => issue.severity === 'error') ? 'openapi-quality-status has-errors' : openApiIssues.some(issue => issue.severity === 'warning') ? 'openapi-quality-status has-warnings' : 'openapi-quality-status'}>{openApiIssues.length} {en ? 'findings' : 'temuan'}</span></div>{openApiIssues.length ? <div className="openapi-issue-list">{openApiIssues.map((issue, index) => <article className={'openapi-issue issue-' + issue.severity} key={issue.method + issue.path + issue.code + index}><span className="openapi-issue-severity">{issue.severity.toUpperCase()}</span><div><strong>{issue.code}</strong><p>{issue.method} {issue.path} — {issue.message}</p></div></article>)}</div> : <p className="openapi-no-issues"><Check size={16} /> {en ? 'No issues found by the current static checks.' : 'Tidak ada temuan dari pemeriksaan statis saat ini.'}</p>}</section><div className="openapi-endpoint-list">{openApiResults.map((item, index) => <article className="openapi-endpoint" key={item.method + item.path + index}><div className="openapi-endpoint-top"><span className={'openapi-method method-' + item.method.toLowerCase()}>{item.method}</span><code>{item.path}</code></div><h4>{item.summary}</h4>{item.operationId && <p className="openapi-operation">{en ? 'Operation ID' : 'ID Operasi'}: <code>{item.operationId}</code></p>}<div className="openapi-meta"><span>{en ? 'Responses' : 'Respons'}: <strong>{item.responses}</strong></span><span>{en ? 'Body' : 'Body'}: <strong>{item.requestBody ? (en ? 'Yes' : 'Ya') : (en ? 'No' : 'Tidak')}</strong></span><span>{en ? 'Security' : 'Keamanan'}: <strong>{item.security ? (en ? 'Declared' : 'Dideklarasikan') : (en ? 'Not declared' : 'Tidak dideklarasikan')}</strong></span></div>{item.parameters && <p className="openapi-parameters">{en ? 'Parameters' : 'Parameter'}: {item.parameters}</p>}</article>)}</div></div>}
      </div>}
      {copyStatus && <p className="lab-copy-status" role="status">{copyStatus}</p>}
    </section>
    <p className="lab-disclaimer">{en ? 'Generated checklists are starting points, not a substitute for risk analysis, product requirements, or human review.' : 'Checklist yang dihasilkan adalah titik awal, bukan pengganti analisis risiko, kebutuhan produk, atau review manusia.'}</p>
  </main>
}


function inferJsonSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: 'null' }
  if (Array.isArray(value)) {
    const variants = [...new Map(value.map(item => {
      const schema = inferJsonSchema(item)
      return [JSON.stringify(schema), schema] as const
    })).values()]
    return { type: 'array', items: variants.length === 0 ? {} : variants.length === 1 ? variants[0] : { anyOf: variants } }
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return {
      type: 'object',
      properties: Object.fromEntries(entries.map(([key, item]) => [key, inferJsonSchema(item)])),
      ...(entries.length ? { required: entries.map(([key]) => key) } : {}),
      additionalProperties: false,
    }
  }
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' }
  return { type: typeof value }
}

function decodeJwtPart(part: string): unknown {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function DeveloperUtilitiesPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [activeTool, setActiveTool] = useState<'schema' | 'regex' | 'jwt'>('schema')
  const [sampleJson, setSampleJson] = useState('{\n  "id": 42,\n  "name": "Ada Lovelace",\n  "active": true,\n  "roles": ["admin", "editor"],\n  "profile": { "city": "London", "verified": null }\n}')
  const [schemaOutput, setSchemaOutput] = useState('')
  const [schemaError, setSchemaError] = useState('')
  const [regexPattern, setRegexPattern] = useState('(?<email>[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,})')
  const [regexFlags, setRegexFlags] = useState('g')
  const [regexSample, setRegexSample] = useState('Contact support@example.com or hello@dreamex.tech for help.')
  const [regexError, setRegexError] = useState('')
  const [regexMatches, setRegexMatches] = useState<Array<{ match: string; index: number; groups: Record<string, string> }>>([])
  const [jwtInput, setJwtInput] = useState('')
  const [jwtOutput, setJwtOutput] = useState('')
  const [jwtError, setJwtError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    const title = en ? 'Developer Utilities — DreamEx Tech' : 'Utilitas Developer — DreamEx Tech'
    const description = en
      ? 'Privacy-first browser tools for JSON Schema generation, regular-expression testing, and JWT inspection.'
      : 'Tool browser yang mengutamakan privasi untuk membuat JSON Schema, menguji regular expression, dan memeriksa JWT.'
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dreamex.tech/devtools')
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://dreamex.tech/devtools')
    return () => {
      document.title = 'DreamEx Tech — Engineering, AI & QA'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'DreamEx Tech — Think deeper. Build smarter.')
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern.')
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dreamex.tech/')
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://dreamex.tech/')
    }
  }, [en])

  const generateSchema = () => {
    setSchemaError('')
    setSchemaOutput('')
    try {
      const parsed: unknown = JSON.parse(sampleJson)
      setSchemaOutput(JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Generated schema',
        ...inferJsonSchema(parsed),
      }, null, 2))
    } catch (error) {
      setSchemaError((en ? 'Invalid JSON: ' : 'JSON tidak valid: ') + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const testRegex = () => {
    setRegexError('')
    setRegexMatches([])
    if (regexPattern.length > 160 || regexSample.length > 4000) {
      setRegexError(en ? 'Keep patterns under 160 characters and sample text under 4,000 characters.' : 'Batasi pola hingga 160 karakter dan teks sampel hingga 4.000 karakter.')
      return
    }
    // Block common catastrophic-backtracking shapes before executing untrusted patterns.
    if (/\([^)]*[+*][^)]*\)\s*(?:[+*]|\{\d*,?\d*\})/.test(regexPattern) || /\([^)]*\|[^)]*\)\s*(?:[+*]|\{\d*,?\d*\})/.test(regexPattern)) {
      setRegexError(en ? 'This pattern uses a potentially expensive nested or ambiguous quantifier. Simplify it before testing.' : 'Pola ini memakai quantifier bertingkat atau ambigu yang berpotensi mahal. Sederhanakan sebelum diuji.')
      return
    }
    try {
      const flags = [...new Set(regexFlags.split('').filter(flag => 'dgimsuvy'.includes(flag)))].join('')
      const expression = new RegExp(regexPattern, flags)
      const matches: Array<{ match: string; index: number; groups: Record<string, string> }> = []
      if (expression.global || expression.sticky) {
        let match: RegExpExecArray | null
        while ((match = expression.exec(regexSample)) !== null && matches.length < 100) {
          matches.push({ match: match[0], index: match.index, groups: match.groups ? Object.fromEntries(Object.entries(match.groups).map(([key, value]) => [key, value ?? ''])) : {} })
          if (match[0] === '') expression.lastIndex += 1
        }
      } else {
        const match = expression.exec(regexSample)
        if (match) matches.push({ match: match[0], index: match.index, groups: match.groups ? Object.fromEntries(Object.entries(match.groups).map(([key, value]) => [key, value ?? ''])) : {} })
      }
      setRegexMatches(matches)
    } catch (error) {
      setRegexError((en ? 'Regex error: ' : 'Kesalahan regex: ') + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const decodeJwt = () => {
    setJwtError('')
    setJwtOutput('')
    const parts = jwtInput.trim().split('.')
    if (parts.length !== 3 || parts.some(part => !part)) {
      setJwtError(en ? 'A JWT must contain three non-empty dot-separated segments.' : 'JWT harus memiliki tiga segmen tidak kosong yang dipisahkan titik.')
      return
    }
    try {
      const header = decodeJwtPart(parts[0])
      const payload = decodeJwtPart(parts[1])
      setJwtOutput(JSON.stringify({ header, payload, signature: en ? 'Not verified — signature bytes are not validated.' : 'Belum diverifikasi — byte tanda tangan tidak divalidasi.' }, null, 2))
    } catch {
      setJwtError(en ? 'The header or payload is not valid base64url-encoded JSON.' : 'Header atau payload bukan JSON base64url yang valid.')
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus(en ? 'Copied to clipboard.' : 'Berhasil disalin.')
    } catch {
      setCopyStatus(en ? 'Clipboard access was blocked by the browser.' : 'Akses clipboard diblokir oleh browser.')
    }
  }

  const downloadSchema = () => {
    if (!schemaOutput) return
    const url = URL.createObjectURL(new Blob([schemaOutput], { type: 'application/schema+json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'schema.generated.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return <main id="main-content" className="container devtools-page">
    <header className="devtools-header">
      <span className="section-kicker"><Braces size={14} /> {en ? 'ENGINEERING TOOLKIT / PRIVACY-FIRST' : 'TOOLKIT ENGINEERING / UTAMAKAN PRIVASI'}</span>
      <h1>{en ? <>Developer <span>Utilities.</span></> : <>Utilitas <span>Developer.</span></>}</h1>
      <p>{en ? 'Small, focused tools for everyday engineering workflows. Validate, inspect, and generate locally in your browser — no account or upload required.' : 'Tool ringkas dan fokus untuk alur kerja engineering sehari-hari. Validasi, periksa, dan buat output langsung di browser — tanpa akun atau unggahan.'}</p>
      <div className="devtools-trust"><ShieldCheck size={16} /><span>{en ? 'Local processing · no telemetry added · never paste production secrets into shared devices.' : 'Pemrosesan lokal · tanpa telemetri tambahan · jangan tempelkan secret produksi pada perangkat bersama.'}</span></div>
    </header>
    <nav className="devtools-tabs" aria-label={en ? 'Developer utilities' : 'Utilitas developer'}>
      <button type="button" className={activeTool === 'schema' ? 'active' : ''} aria-pressed={activeTool === 'schema'} onClick={() => { setActiveTool('schema'); setCopyStatus('') }}><Braces size={16} /><span>JSON Schema</span></button>
      <button type="button" className={activeTool === 'regex' ? 'active' : ''} aria-pressed={activeTool === 'regex'} onClick={() => { setActiveTool('regex'); setCopyStatus('') }}><Search size={16} /><span>{en ? 'Regex Tester' : 'Penguji Regex'}</span></button>
      <button type="button" className={activeTool === 'jwt' ? 'active' : ''} aria-pressed={activeTool === 'jwt'} onClick={() => { setActiveTool('jwt'); setCopyStatus('') }}><ShieldCheck size={16} /><span>{en ? 'JWT Inspector' : 'Pemeriksa JWT'}</span></button>
    </nav>

    {activeTool === 'schema' && <section className="devtools-panel" aria-labelledby="schema-title">
      <div className="devtools-panel-heading"><span className="devtools-index">01 / GENERATE</span><h2 id="schema-title">{en ? 'JSON Schema Generator' : 'Generator JSON Schema'}</h2><p>{en ? 'Infer a JSON Schema Draft 2020-12 from a sample payload, including nested objects, arrays, nulls, and mixed array types.' : 'Buat inferensi JSON Schema Draft 2020-12 dari payload sampel, termasuk objek bertingkat, array, null, dan tipe array campuran.'}</p></div>
      <div className="devtools-workspace"><label className="lab-field">{en ? 'Sample JSON' : 'JSON sampel'}<textarea aria-label={en ? 'Sample JSON' : 'JSON sampel'} rows={10} spellCheck={false} value={sampleJson} onChange={event => setSampleJson(event.target.value)} /></label><div className="devtools-output-column"><div className="devtools-output-heading"><strong>{en ? 'Generated schema' : 'Schema hasil'}</strong><span className="devtools-format">DRAFT 2020-12</span></div>{schemaOutput ? <pre className="lab-output" aria-label={en ? 'Generated JSON Schema output' : 'Output JSON Schema'}>{schemaOutput}</pre> : <div className="devtools-empty"><Braces size={22} /><p>{en ? 'Your schema will appear here.' : 'Schema akan muncul di sini.'}</p></div>}{schemaError && <p className="lab-error" role="alert">{schemaError}</p>}</div></div>
      <div className="devtools-actions"><button type="button" className="button button-primary" onClick={generateSchema}><Sparkles size={15} /> {en ? 'Generate schema' : 'Buat schema'}</button>{schemaOutput && <><button type="button" className="button button-secondary" onClick={() => void copyText(schemaOutput)}><Copy size={15} /> {en ? 'Copy schema' : 'Salin schema'}</button><button type="button" className="button button-secondary" onClick={downloadSchema}><Download size={15} /> {en ? 'Download JSON' : 'Unduh JSON'}</button></>}</div>
    </section>}

    {activeTool === 'regex' && <section className="devtools-panel" aria-labelledby="regex-title">
      <div className="devtools-panel-heading"><span className="devtools-index">02 / INSPECT</span><h2 id="regex-title">{en ? 'Regular Expression Tester' : 'Penguji Regular Expression'}</h2><p>{en ? 'Test a pattern against sample text and inspect match offsets and named capture groups.' : 'Uji pola pada teks sampel dan periksa posisi kecocokan serta named capture group.'}</p></div>
      <div className="devtools-regex-line"><label className="lab-field">{en ? 'Pattern' : 'Pola'}<input aria-label={en ? 'Regex pattern' : 'Pola regex'} value={regexPattern} onChange={event => setRegexPattern(event.target.value)} maxLength={160} /></label><label className="lab-field devtools-flags">{en ? 'Flags' : 'Flags'}<input aria-label={en ? 'Regex flags' : 'Flag regex'} value={regexFlags} onChange={event => setRegexFlags(event.target.value)} maxLength={8} /><small>g i m s u y</small></label></div>
      <label className="lab-field devtools-sample">{en ? 'Sample text' : 'Teks sampel'}<textarea aria-label={en ? 'Regex sample text' : 'Teks sampel regex'} rows={5} value={regexSample} onChange={event => setRegexSample(event.target.value)} maxLength={4000} /></label>
      <div className="devtools-actions"><button type="button" className="button button-primary" onClick={testRegex}><Search size={15} /> {en ? 'Test pattern' : 'Uji pola'}</button><span className="devtools-count">{regexMatches.length} {en ? 'matches' : 'kecocokan'} · {en ? 'maximum 100 shown' : 'maksimal 100 ditampilkan'}</span></div>
      {regexError && <p className="lab-error" role="alert">{regexError}</p>}
      <div className="devtools-match-list" aria-live="polite">{regexMatches.length ? regexMatches.map((item, index) => <article className="devtools-match" key={item.index + ':' + index}><span className="devtools-match-index">#{index + 1} · {en ? 'offset' : 'posisi'} {item.index}</span><code>{item.match || (en ? '(empty match)' : '(kecocokan kosong)')}</code>{Object.keys(item.groups).length > 0 && <pre className="lab-output">{JSON.stringify(item.groups, null, 2)}</pre>}</article>) : <div className="devtools-empty"><Search size={22} /><p>{en ? 'Run the test to see matches.' : 'Jalankan pengujian untuk melihat kecocokan.'}</p></div>}</div>
      <p className="devtools-footnote">{en ? 'Safety guard: pattern and input length are capped, and common nested/ambiguous quantifiers are rejected. This is a convenience tool, not a complete ReDoS defense.' : 'Pengaman: panjang pola dan input dibatasi serta quantifier bertingkat/ambigu yang umum ditolak. Ini alat bantu, bukan pertahanan ReDoS lengkap.'}</p>
    </section>}

    {activeTool === 'jwt' && <section className="devtools-panel" aria-labelledby="jwt-title">
      <div className="devtools-panel-heading"><span className="devtools-index">03 / DECODE</span><h2 id="jwt-title">{en ? 'JWT Inspector' : 'Pemeriksa JWT'}</h2><p>{en ? 'Decode the header and payload of a JSON Web Token for debugging. The token stays in this browser session.' : 'Dekode header dan payload JSON Web Token untuk debugging. Token tetap diproses di sesi browser ini.'}</p></div>
      <label className="lab-field">{en ? 'JWT token' : 'Token JWT'}<textarea aria-label={en ? 'JWT token' : 'Token JWT'} rows={4} spellCheck={false} value={jwtInput} onChange={event => setJwtInput(event.target.value)} placeholder="eyJhbGciOi...eyJzdWIiOi..." /></label>
      <div className="devtools-actions"><button type="button" className="button button-primary" onClick={decodeJwt}><ShieldCheck size={15} /> {en ? 'Decode token' : 'Dekode token'}</button>{jwtOutput && <button type="button" className="button button-secondary" onClick={() => void copyText(jwtOutput)}><Copy size={15} /> {en ? 'Copy decoded JSON' : 'Salin JSON hasil'}</button>}</div>
      {jwtError && <p className="lab-error" role="alert">{jwtError}</p>}
      {jwtOutput ? <pre className="lab-output devtools-jwt-output" aria-label={en ? 'Decoded JWT output' : 'Output JWT hasil dekode'}>{jwtOutput}</pre> : <div className="devtools-empty"><ShieldCheck size={22} /><p>{en ? 'Decoded header and payload will appear here.' : 'Header dan payload hasil dekode akan muncul di sini.'}</p></div>}
      <aside className="devtools-warning"><AlertTriangle size={16} /><p>{en ? 'Decoding is not verification. This tool does not validate signatures, issuer, audience, expiry, or trust. Never use decoded claims alone to authorize a request.' : 'Dekode bukan verifikasi. Tool ini tidak memvalidasi tanda tangan, issuer, audience, kedaluwarsa, atau kepercayaan. Jangan gunakan klaim hasil dekode saja untuk mengotorisasi permintaan.'}</p></aside>
    </section>}
    {copyStatus && <p className="lab-copy-status" role="status">{copyStatus}</p>}
    <p className="devtools-disclaimer">{en ? 'Everything runs client-side in this page. Outputs are generated from the input you provide and should be reviewed before production use.' : 'Semua proses berjalan di sisi klien pada halaman ini. Output dibuat dari input Anda dan harus ditinjau sebelum digunakan di produksi.'}</p>
  </main>
}


type LearningPath = { id: string; title: string; description: string; level: string; duration: string; slugs: string[]; skills: string[] }

function LearningHubPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [tab, setTab] = useState<'paths' | 'glossary'>('paths')
  const [glossaryQuery, setGlossaryQuery] = useState('')
  const [learningProgress, setLearningProgress] = useState<Record<string, boolean>>(() => { try { const v: unknown = JSON.parse(localStorage.getItem('dreamex-learning-progress-v1') ?? '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, boolean> : {} } catch { return {} } })
  const toggleLearningStep = (key: string) => setLearningProgress(current => { const next = { ...current, [key]: !current[key] }; try { localStorage.setItem('dreamex-learning-progress-v1', JSON.stringify(next)) } catch { /* session fallback */ } return next })
  const paths: LearningPath[] = [
    { id: 'quality-engineering', title: en ? 'QA Automation Engineering' : 'QA Automation Engineering', description: en ? 'Design reliable tests, automate critical journeys, and build fast CI feedback.' : 'Rancang tes andal, otomatisasi alur kritis, dan bangun umpan balik CI.', level: en ? 'Beginner → Intermediate' : 'Pemula → Menengah', duration: en ? '3 articles · 22 min' : '3 artikel · 22 menit', slugs: ['qa-automation-foundations', 'playwright-test-architecture', 'evaluating-ai-features'], skills: en ? ['Risk-based test design', 'Playwright architecture', 'AI feature regression'] : ['Desain tes berbasis risiko', 'Arsitektur Playwright', 'Regresi fitur AI'] },
    { id: 'software-engineering', title: 'Software Engineering', description: en ? 'Improve maintainability, type safety, and delivery through practical architecture.' : 'Tingkatkan maintainability, type safety, dan delivery melalui arsitektur praktis.', level: en ? 'Beginner → Intermediate' : 'Pemula → Menengah', duration: en ? '2 articles · 14 min' : '2 artikel · 14 menit', slugs: ['typescript-for-maintainable-projects', 'secure-ci-cd-basics'], skills: en ? ['Maintainable TypeScript', 'Clear contracts', 'Repeatable CI/CD'] : ['TypeScript yang mudah dirawat', 'Kontrak jelas', 'CI/CD berulang'] },
    { id: 'ai-engineering', title: en ? 'AI Engineering & Evaluation' : 'AI Engineering & Evaluasi', description: en ? 'Build evaluation datasets, regression suites, and responsible rollout habits.' : 'Bangun dataset evaluasi, suite regresi, dan kebiasaan rilis bertanggung jawab.', level: en ? 'Intermediate' : 'Menengah', duration: en ? '2 articles · 15 min' : '2 artikel · 15 menit', slugs: ['practical-ai-engineering', 'evaluating-ai-features'], skills: en ? ['Evaluation design', 'Representative datasets', 'Monitoring and regression'] : ['Desain evaluasi', 'Dataset representatif', 'Monitoring dan regresi'] },
    { id: 'cybersecurity', title: en ? 'Cybersecurity & Secure Delivery' : 'Cybersecurity & Secure Delivery', description: en ? 'Learn threat modeling, least privilege, and secure-by-default delivery.' : 'Pelajari threat modeling, least privilege, dan delivery aman sejak awal.', level: en ? 'Beginner → Intermediate' : 'Pemula → Menengah', duration: en ? '2 articles · 12 min' : '2 artikel · 12 menit', slugs: ['secure-ci-cd-basics', 'typescript-for-maintainable-projects'], skills: en ? ['Threat modeling', 'Least-privilege pipelines', 'Secure configuration'] : ['Threat modeling', 'Pipeline least privilege', 'Konfigurasi aman'] },
  ]
  const glossary = [
    { term: 'CI/CD', category: en ? 'Delivery' : 'Delivery', definition: en ? 'Automated practices that integrate changes, validate them, and deliver software through repeatable pipelines.' : 'Praktik otomatis untuk mengintegrasikan perubahan, memvalidasinya, dan merilis software melalui pipeline yang berulang.' },
    { term: 'E2E Testing', category: 'QA', definition: en ? 'Testing a complete user journey across the application to validate behavior from the user perspective.' : 'Pengujian alur pengguna secara menyeluruh di aplikasi untuk memvalidasi perilaku dari sudut pandang pengguna.' },
    { term: 'Flaky Test', category: 'QA', definition: en ? 'A test that produces inconsistent results without a relevant change to the product or test conditions.' : 'Tes yang memberikan hasil tidak konsisten tanpa perubahan relevan pada produk atau kondisi pengujian.' },
    { term: 'Observability', category: en ? 'Reliability' : 'Reliability', definition: en ? 'The ability to infer internal system behavior from outputs such as logs, metrics, and traces.' : 'Kemampuan memahami perilaku internal sistem melalui output seperti log, metrik, dan trace.' },
    { term: 'Least Privilege', category: en ? 'Security' : 'Security', definition: en ? 'Granting each user, service, or pipeline only the permissions required to perform its task.' : 'Memberikan setiap pengguna, layanan, atau pipeline hanya izin yang diperlukan untuk menjalankan tugasnya.' },
    { term: 'Idempotency', category: en ? 'Architecture' : 'Architecture', definition: en ? 'A property where repeating the same operation has the same intended effect as performing it once.' : 'Sifat operasi yang ketika diulang menghasilkan efek yang sama seperti saat dijalankan sekali.' },
    { term: 'Type Safety', category: en ? 'Engineering' : 'Engineering', definition: en ? 'Using type constraints to catch invalid operations and contract mismatches before runtime where possible.' : 'Penggunaan batasan tipe untuk mendeteksi operasi tidak valid dan ketidakcocokan kontrak sebelum runtime jika memungkinkan.' },
    { term: 'Regression Testing', category: 'QA', definition: en ? 'Re-running relevant checks to detect whether a change has broken previously working behavior.' : 'Menjalankan ulang pemeriksaan relevan untuk mendeteksi apakah perubahan merusak perilaku yang sebelumnya berjalan.' },
    { term: 'Threat Modeling', category: en ? 'Security' : 'Security', definition: en ? 'A structured process for identifying assets, trust boundaries, likely threats, and mitigations.' : 'Proses terstruktur untuk mengidentifikasi aset, batas kepercayaan, ancaman yang mungkin, dan mitigasinya.' },
    { term: 'Evaluation Dataset', category: en ? 'AI' : 'AI', definition: en ? 'A curated set of representative cases used to measure model or AI-feature quality consistently.' : 'Kumpulan kasus representatif yang dikurasi untuk mengukur kualitas model atau fitur AI secara konsisten.' },
    { term: 'RAG', category: en ? 'AI' : 'AI', definition: en ? 'Retrieval-augmented generation: retrieving relevant sources to ground a model response in external knowledge.' : 'Retrieval-augmented generation: mengambil sumber relevan agar respons model berpijak pada pengetahuan eksternal.' },
    { term: 'Core Web Vitals', category: en ? 'Performance' : 'Performance', definition: en ? 'Google user-experience metrics focused on loading, interactivity, and visual stability.' : 'Metrik pengalaman pengguna Google yang berfokus pada pemuatan, interaktivitas, dan stabilitas visual.' },
  ]
  const filteredGlossary = glossary.filter(item => `${item.term} ${item.category} ${item.definition}`.toLowerCase().includes(glossaryQuery.trim().toLowerCase()))
  useEffect(() => {
    document.title = en ? 'Learning Hub — DreamEx Tech' : 'Pusat Belajar — DreamEx Tech'
    return () => { document.title = 'DreamEx Tech — Engineering, AI & QA' }
  }, [en])
  return <main id="main-content" className="learning-hub container">
    <header className="learning-header"><span className="section-kicker">{en ? 'STRUCTURED KNOWLEDGE, PRACTICAL PROGRESS' : 'PENGETAHUAN TERSTRUKTUR, PROGRES PRAKTIS'}</span><h1>{en ? 'Learn with' : 'Belajar lebih'} <span>{en ? 'direction.' : 'terarah.'}</span></h1><p>{en ? 'Follow a curated path, connect the concepts, and turn engineering knowledge into practical skills.' : 'Ikuti jalur belajar terkurasi, hubungkan konsep, dan ubah pengetahuan engineering menjadi keterampilan praktis.'}</p></header>
    <div className="learning-tabs" role="tablist" aria-label={en ? 'Learning hub sections' : 'Bagian pusat belajar'}>
      <button role="tab" aria-selected={tab === 'paths'} className={tab === 'paths' ? 'active' : ''} onClick={() => setTab('paths')}><BookOpen size={16} /> {en ? 'Learning paths' : 'Jalur belajar'}</button>
      <button role="tab" aria-selected={tab === 'glossary'} className={tab === 'glossary' ? 'active' : ''} onClick={() => setTab('glossary')}><Braces size={16} /> {en ? 'Engineering glossary' : 'Glosarium engineering'}</button>
    </div>
    {tab === 'paths' ? <section className="learning-path-grid" aria-label={en ? 'Curated learning paths' : 'Jalur belajar terkurasi'}>{paths.map((path, index) => { const steps = [...path.slugs.map((slug, stepIndex) => ({ id: slug, title: (en ? articleTranslations[slug]?.title : undefined) ?? articles.find(item => item.slug === slug)?.title ?? slug, route: '/blog/' + slug, skill: path.skills[stepIndex] ?? slug })), { id: 'practice-' + path.id, title: en ? 'Practice in Engineering Lab' : 'Praktik di Engineering Lab', route: '/lab', skill: en ? 'Apply the concepts' : 'Terapkan konsep' }]; const completed = steps.filter(step => learningProgress[path.id + ':' + step.id]).length; return <article className="learning-path-card" key={path.id}><div className="learning-path-top"><span>PATH / 0{index + 1}</span><span className="learning-level">{path.level}</span></div><h2>{path.title}</h2><p>{path.description}</p><div className="learning-path-meta"><span><BookOpen size={14} /> {path.duration}</span><span>{completed}/{steps.length} {en ? 'complete' : 'selesai'}</span></div><div className="learning-progress-track" role="progressbar" aria-label={path.title + ' progress'} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed}><span style={{ width: (completed / steps.length * 100) + '%' }} /></div><ol>{steps.map((step, stepIndex) => <li key={step.id} className={learningProgress[path.id + ':' + step.id] ? 'learning-step-complete' : ''}><label><input type="checkbox" checked={!!learningProgress[path.id + ':' + step.id]} onChange={() => toggleLearningStep(path.id + ':' + step.id)} /><span className="learning-step-number">{String(stepIndex + 1).padStart(2, '0')}</span></label><Link to={step.route}>{step.title}</Link><span className="learning-step-skill">{step.skill}</span></li>)}</ol></article> })}</section> : <section className="glossary-section"><label className="glossary-search"><Search size={17} /><input value={glossaryQuery} onChange={event => setGlossaryQuery(event.target.value)} placeholder={en ? 'Search a term, topic, or definition…' : 'Cari istilah, topik, atau definisi…'} aria-label={en ? 'Search glossary' : 'Cari glosarium'} /><kbd>/</kbd></label><p className="glossary-results">{filteredGlossary.length} {en ? 'terms found' : 'istilah ditemukan'}</p>{filteredGlossary.length ? <div className="glossary-grid">{filteredGlossary.map(item => <article className="glossary-card" key={item.term}><div><h2>{item.term}</h2><span>{item.category}</span></div><p>{item.definition}</p></article>)}</div> : <div className="empty-state"><Search size={22} /><strong>{en ? 'No matching terms' : 'Istilah tidak ditemukan'}</strong><span>{en ? 'Try another keyword.' : 'Coba kata kunci lain.'}</span></div>}</section>}
    <aside className="learning-next"><Sparkles size={18} /><p>{en ? 'Learning tip: read actively, try the ideas in a small project, and revisit the concepts when you encounter them in real work.' : 'Tips belajar: baca secara aktif, coba idenya dalam proyek kecil, lalu tinjau kembali konsep saat menemukannya dalam pekerjaan nyata.'}</p><Link className="read-link" to="/lab">{en ? 'Practice in Engineering Lab' : 'Praktik di Lab Engineering'} <ArrowRight size={16} /></Link></aside>
  </main>
}

function AboutPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  useEffect(() => {
    const title = en ? 'About DreamEx Tech — Engineering with Intent' : 'Tentang DreamEx Tech — Rekayasa dengan Tujuan'
    const description = en
      ? 'Discover the principles behind DreamEx Tech: practical engineering, quality by design, continuous learning, and responsible technology.'
      : 'Kenali prinsip DreamEx Tech: engineering praktis, kualitas sejak perancangan, pembelajaran berkelanjutan, dan teknologi yang bertanggung jawab.'
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dreamex.tech/about')
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://dreamex.tech/about')
    return () => {
      document.title = 'DreamEx Tech — Engineering, AI & QA'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'DreamEx Tech — Think deeper. Build smarter.')
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern.')
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dreamex.tech/')
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://dreamex.tech/')
    }
  }, [en])
  const principles = en ? [
    { number: '01', title: 'Quality by design', text: 'Build quality into the process from the start—not as a final checkpoint. Clear requirements, thoughtful design, and continuous verification reduce avoidable risk.' },
    { number: '02', title: 'Curiosity with purpose', text: 'Explore emerging ideas, test assumptions, and turn research into practical understanding instead of chasing technology for its own sake.' },
    { number: '03', title: 'Evidence over guesswork', text: 'Use observable behavior, reproducible tests, and transparent reasoning to make decisions more reliable and easier to improve.' },
    { number: '04', title: 'Responsible innovation', text: 'Consider security, accessibility, maintainability, privacy, and real-world impact alongside performance and new capabilities.' },
  ] : [
    { number: '01', title: 'Kualitas sejak perancangan', text: 'Bangun kualitas sejak awal proses, bukan hanya sebagai pemeriksaan akhir. Requirement yang jelas, desain matang, dan verifikasi berkelanjutan membantu mengurangi risiko.' },
    { number: '02', title: 'Rasa ingin tahu yang terarah', text: 'Jelajahi gagasan baru, uji asumsi, dan ubah riset menjadi pemahaman praktis—bukan sekadar mengikuti tren teknologi.' },
    { number: '03', title: 'Bukti, bukan tebakan', text: 'Gunakan perilaku yang terukur, pengujian yang dapat diulang, dan penalaran transparan agar keputusan lebih andal.' },
    { number: '04', title: 'Inovasi yang bertanggung jawab', text: 'Pertimbangkan keamanan, aksesibilitas, kemudahan pemeliharaan, privasi, dan dampak nyata bersama performa dan kapabilitas baru.' },
  ]
  const disciplines = en ? [
    { icon: <Braces size={20} />, title: 'Software engineering', text: 'Architecture, implementation, maintainability, and developer experience.' },
    { icon: <ShieldCheck size={20} />, title: 'Quality engineering', text: 'Test strategy, automation, risk-based coverage, and dependable delivery.' },
    { icon: <Sparkles size={20} />, title: 'AI & emerging technology', text: 'Practical exploration of AI-enabled workflows, tools, and responsible adoption.' },
  ] : [
    { icon: <Braces size={20} />, title: 'Software engineering', text: 'Arsitektur, implementasi, maintainability, dan pengalaman developer.' },
    { icon: <ShieldCheck size={20} />, title: 'Quality engineering', text: 'Strategi pengujian, automation, cakupan berbasis risiko, dan delivery yang andal.' },
    { icon: <Sparkles size={20} />, title: 'AI & teknologi baru', text: 'Eksplorasi praktis workflow berbasis AI, tools, dan adopsi yang bertanggung jawab.' },
  ]
  return <main id="main-content" className="about-page">
    <section className="about-hero"><div className="about-hero-grid" /><div className="container about-hero-inner">
      <span className="eyebrow"><span className="eyebrow-dot" /> {en ? 'THE THINKING BEHIND THE BUILD' : 'PRINSIP DI BALIK SETIAP KARYA'}</span>
      <h1>{en ? <>Engineering with <span>intent.</span><br />Technology with <span>impact.</span></> : <>Rekayasa dengan <span>tujuan.</span><br />Teknologi dengan <span>dampak.</span></>}</h1>
      <p>{en ? 'DreamEx Tech is an independent knowledge space for exploring software engineering, quality engineering, AI, and modern technology—with a focus on ideas you can understand, test, and put to work.' : 'DreamEx Tech adalah ruang pengetahuan independen untuk mengeksplorasi software engineering, quality engineering, AI, dan teknologi modern—dengan fokus pada gagasan yang bisa dipahami, diuji, dan diterapkan.'}</p>
      <div className="about-hero-actions"><Link className="button button-primary" to="/">{en ? 'Explore the knowledge base' : 'Jelajahi basis pengetahuan'} <ArrowRight size={17} /></Link><a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={17} /> {en ? 'Explore the source' : 'Lihat source code'}</a></div>
      <div className="about-signal"><span><i /> {en ? 'PRACTICAL BY DEFAULT' : 'PRAKTIS SEJAK AWAL'}</span><span>{en ? 'LEARN → TEST → IMPROVE' : 'PELAJARI → UJI → TINGKATKAN'}</span></div>
    </div></section>
    <section className="about-intro-section"><div className="container about-intro-grid"><div><span className="section-kicker">{en ? '01 / OUR PURPOSE' : '01 / TUJUAN KAMI'}</span><h2>{en ? <>Turn curiosity into <span>capability.</span></> : <>Ubah rasa ingin tahu menjadi <span>kapabilitas.</span></>}</h2></div><div className="about-prose"><p>{en ? 'Technology moves quickly. Understanding what works, why it works, and where it can fail takes deliberate practice. DreamEx Tech documents that process through clear explanations, engineering notes, and quality-minded perspectives.' : 'Teknologi bergerak cepat. Memahami apa yang bekerja, mengapa itu bekerja, dan kapan bisa gagal membutuhkan latihan yang terarah. DreamEx Tech mendokumentasikan proses tersebut melalui penjelasan yang jelas, catatan engineering, dan perspektif yang berorientasi pada kualitas.'}</p><p>{en ? 'The goal is not to promise perfect systems. It is to make better decisions repeatable: ask sharper questions, validate assumptions, share what was learned, and keep improving.' : 'Tujuannya bukan menjanjikan sistem yang sempurna. Tujuannya adalah membuat keputusan yang lebih baik dapat diulang: ajukan pertanyaan yang tepat, validasi asumsi, bagikan pembelajaran, dan terus tingkatkan hasil.'}</p></div></div></section>
    <section className="about-disciplines"><div className="container"><div className="about-section-heading"><div><span className="section-kicker">{en ? '02 / AREAS OF EXPLORATION' : '02 / AREA EKSPLORASI'}</span><h2>{en ? 'Three disciplines. One mindset.' : 'Tiga disiplin. Satu pola pikir.'}</h2></div><p>{en ? 'Connected practices for building technology that is useful, testable, and maintainable.' : 'Praktik yang saling terhubung untuk membangun teknologi yang berguna, teruji, dan mudah dipelihara.'}</p></div><div className="about-discipline-grid">{disciplines.map((item, index) => <article className="about-discipline-card" key={item.title}><span className="about-discipline-number">0{index + 1}</span><span className="about-discipline-icon">{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p><span className="about-card-line" /></article>)}</div></div></section>
    <section className="about-principles"><div className="container"><div className="about-section-heading"><div><span className="section-kicker">{en ? '03 / ENGINEERING PRINCIPLES' : '03 / PRINSIP ENGINEERING'}</span><h2>{en ? 'The standards behind the work.' : 'Standar di balik setiap proses.'}</h2></div><p>{en ? 'A practical framework for how we learn, evaluate, and communicate technology.' : 'Kerangka praktis untuk mempelajari, mengevaluasi, dan membahas teknologi.'}</p></div><div className="about-principle-list">{principles.map(item => <article className="about-principle" key={item.number}><span className="about-principle-number">{item.number}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><ArrowDownRight size={19} /></article>)}</div></div></section>
    <section className="about-workflow"><div className="container about-workflow-inner"><div><span className="section-kicker">{en ? '04 / THE ITERATION LOOP' : '04 / SIKLUS ITERASI'}</span><h2>{en ? <>Progress is a <span>practice.</span></> : <>Kemajuan adalah sebuah <span>praktik.</span></>}</h2><p>{en ? 'Every useful improvement starts with a question and gets stronger through evidence.' : 'Setiap peningkatan yang bermanfaat dimulai dari pertanyaan dan menjadi lebih kuat melalui bukti.'}</p></div><div className="about-loop">{(en ? [['01','Explore','Understand the problem'],['02','Build','Create a focused solution'],['03','Verify','Test the assumptions'],['04','Improve','Learn and iterate']] : [['01','Eksplorasi','Pahami masalah'],['02','Bangun','Buat solusi terarah'],['03','Verifikasi','Uji asumsi'],['04','Tingkatkan','Pelajari dan ulangi']]).map(([number,title,detail]) => <div className="about-loop-step" key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div><Check size={15} /></div>)}</div></div></section>
    <section className="about-cta"><div className="container about-cta-inner"><div><span className="section-kicker">{en ? 'KEEP EXPLORING' : 'LANJUTKAN EKSPLORASI'}</span><h2>{en ? <>Build thoughtfully.<br /><span>Improve continuously.</span></> : <>Bangun dengan matang.<br /><span>Tingkatkan berkelanjutan.</span></>}</h2><p>{en ? 'Explore the articles, inspect the source, and use what is useful in your own work.' : 'Jelajahi artikel, tinjau source code, dan terapkan hal yang bermanfaat dalam pekerjaan Anda.'}</p></div><div className="about-cta-actions"><Link className="button button-primary" to="/#latest">{en ? 'Read engineering notes' : 'Baca catatan engineering'} <ArrowRight size={17} /></Link><a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a></div></div></section>
  </main>
}


function RssPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [feedCopied, setFeedCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const sortedArticles = useMemo(() => [...articles].sort((a, b) => b.date.localeCompare(a.date)), [])
  const copyRssUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://www.dreamex.tech/rss.xml')
      setFeedCopied(true)
      setCopyFailed(false)
    } catch {
      setFeedCopied(false)
      setCopyFailed(true)
    }
  }
  useEffect(() => {
    const previousTitle = document.title
    document.title = en ? 'Latest Articles & RSS — DreamEx Tech' : 'Artikel Terbaru & RSS — DreamEx Tech'
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content')
    description?.setAttribute('content', en
      ? 'Browse the latest DreamEx Tech articles on software engineering, QA automation, AI, and modern technology.'
      : 'Jelajahi artikel terbaru DreamEx Tech tentang software engineering, QA automation, AI, dan teknologi modern.')
    const canonical = document.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    canonical?.setAttribute('href', 'https://dreamex.tech/rss')
    return () => {
      document.title = previousTitle
      if (previousDescription) description?.setAttribute('content', previousDescription)
      if (previousCanonical) canonical?.setAttribute('href', previousCanonical)
    }
  }, [en])
  return <main id="main-content" className="rss-page">
    <div className="container rss-container">
      <div className="rss-hero">
        <span className="section-kicker"><Rss size={14} /> {en ? 'DREAMEX TECH / READING ROOM' : 'DREAMEX TECH / RUANG BACA'}</span>
        <h1>{en ? 'Ideas worth your time.' : 'Ide yang layak dibaca.'}</h1>
        <p>{en
          ? 'Practical notes on software engineering, quality engineering, AI, and modern technology — collected in one clean reading view.'
          : 'Catatan praktis tentang software engineering, quality engineering, AI, dan teknologi modern — dirangkum dalam satu halaman yang nyaman dibaca.'}</p>
        <div className="rss-hero-actions">
          <button className="button button-primary" type="button" onClick={copyRssUrl}><Rss size={16} /> {en ? 'Copy RSS subscription URL' : 'Salin URL langganan RSS'}</button>
          <Link className="button button-secondary" to="/">{en ? 'Back to homepage' : 'Kembali ke beranda'} <ArrowRight size={16} /></Link>
        </div>
        <p className="rss-subscribe-status" aria-live="polite">
          {feedCopied
            ? (en ? 'RSS URL copied. Paste it into your preferred feed reader.' : 'URL RSS berhasil disalin. Tempelkan ke aplikasi pembaca RSS pilihan Anda.')
            : copyFailed
              ? (en ? 'Clipboard access is unavailable. Copy this feed URL manually: https://www.dreamex.tech/rss.xml' : 'Clipboard tidak tersedia. Salin URL feed ini secara manual: https://www.dreamex.tech/rss.xml')
              : (en ? 'Subscribe using a feed reader; this page stays open as the readable web version.' : 'Berlangganan melalui aplikasi pembaca RSS; halaman web ini tetap terbuka sebagai versi yang nyaman dibaca.')}
        </p>
      </div>
      <section className="rss-list-section" aria-labelledby="rss-list-heading">
        <div className="rss-list-heading"><div><span className="section-kicker">{en ? 'THE LATEST' : 'TERBARU'}</span><h2 id="rss-list-heading">{en ? 'Latest articles' : 'Artikel terbaru'}</h2></div><span className="rss-count">{sortedArticles.length} {en ? 'articles' : 'artikel'}</span></div>
        <div className="rss-article-list">
          {sortedArticles.map((article, index) => {
            const translated = en ? articleTranslations[article.slug] : undefined
            return <article className="rss-article-card" key={article.slug}>
              <div className="rss-article-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="rss-article-content">
                <div className="rss-article-meta"><span>{categoryLabel(article.category, language)}</span><span>·</span><time dateTime={article.date}>{new Date(article.date + 'T00:00:00').toLocaleDateString(en ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</time><span>·</span><span>{en ? article.readTime.replace('menit', 'min') : article.readTime}</span></div>
                <h3><Link to={`/blog/${article.slug}`}>{translated?.title ?? article.title}</Link></h3>
                <p>{translated?.excerpt ?? article.excerpt}</p>
                <Link className="rss-read-link" to={`/blog/${article.slug}`}>{en ? 'Read article' : 'Baca artikel'} <ArrowRight size={15} /></Link>
              </div>
            </article>
          })}
        </div>
      </section>
      <div className="rss-bottom-note"><Rss size={18} /><p>{en ? 'This is the human-friendly web view. The RSS XML URL is copied for your feed reader instead of navigating away to raw XML.' : 'Ini adalah tampilan web yang nyaman dibaca. URL RSS XML disalin untuk aplikasi pembaca feed sehingga Anda tidak dialihkan ke tampilan XML mentah.'}</p></div>
    </div>
  </main>
}

function ArticlePage() {
  const { t, language } = useLanguage()
  const { slug } = useParams()
  const article = articles.find(item => item.slug === slug)
  const translated = article && language === 'en' ? articleTranslations[article.slug] : undefined
  const [progress, setProgress] = useState(0)
  const lastSavedProgress = useRef(-1)
  const { isSaved, toggleSaved } = useReadingList()
  const [linkCopied, setLinkCopied] = useState(false)
  const [citationCopied, setCitationCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const relatedArticles = useMemo(() => article ? articles
    .filter(item => item.slug !== article.slug)
    .map(item => ({ item, score: (item.category === article.category ? 3 : 0) + item.tags.filter(tag => article.tags.includes(tag)).length }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(result => result.item) : [], [article])
  const copyArticleLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }
  const copyCitation = async () => {
    if (!article) return
    const title = translated?.title ?? article.title
    const citation = `[${title}](https://dreamex.tech/blog/${article.slug}) — DreamEx Tech (${article.date})`
    try {
      await navigator.clipboard.writeText(citation)
      setCitationCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }
  const shareArticle = async () => {
    if (!article) return
    const title = `${translated?.title ?? article.title} — DreamEx Tech`
    const shareData = { title, text: translated?.excerpt ?? article.excerpt, url: window.location.href }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        setCopyError(false)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copyArticleLink()
  }
  useEffect(() => {
    document.title = article ? `${translated?.title ?? article.title} — DreamEx Tech` : `${t('articleNotFound')} — DreamEx Tech`
    const setMeta = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector(selector)
      if (element) element.setAttribute(attribute, value)
    }
    if (article) {
      const canonicalUrl = `https://dreamex.tech/blog/${article.slug}`
      setMeta('meta[name="description"]', 'content', translated?.excerpt ?? article.excerpt)
      setMeta('meta[property="og:title"]', 'content', `${translated?.title ?? article.title} — DreamEx Tech`)
      setMeta('meta[property="og:description"]', 'content', translated?.excerpt ?? article.excerpt)
      setMeta('meta[property="og:url"]', 'content', canonicalUrl)
      setMeta('meta[name="twitter:title"]', 'content', `${translated?.title ?? article.title} — DreamEx Tech`)
      setMeta('meta[name="twitter:description"]', 'content', translated?.excerpt ?? article.excerpt)
      const canonical = document.querySelector('link[rel="canonical"]')
      canonical?.setAttribute('href', canonicalUrl)
      const structuredData = document.createElement('script')
      structuredData.type = 'application/ld+json'
      structuredData.dataset.articleSchema = 'true'
      structuredData.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article', headline: translated?.title ?? article.title,
        description: translated?.excerpt ?? article.excerpt, datePublished: article.date,
        author: { '@type': 'Organization', name: 'DreamEx Tech' },
        publisher: { '@type': 'Organization', name: 'DreamEx Tech' },
        mainEntityOfPage: canonicalUrl,
      })
      document.head.appendChild(structuredData)
    }
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const nextProgress = scrollable > 0 ? Math.min(100, Math.round(window.scrollY / scrollable * 100)) : 0
      setProgress(nextProgress)
      if (!article || nextProgress === lastSavedProgress.current) return
      lastSavedProgress.current = nextProgress
      try {
        if (nextProgress >= 100) window.localStorage.removeItem(READING_PROGRESS_KEY)
        else if (nextProgress >= 5) window.localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify({ slug: article.slug, progress: nextProgress }))
        window.dispatchEvent(new Event(READING_PROGRESS_EVENT))
      } catch { /* Reading progress is optional when browser storage is unavailable. */ }
    }
    lastSavedProgress.current = -1
    const savedProgress = readReadingProgress()
    if (article && savedProgress?.slug === article.slug) {
      window.requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        if (scrollable > 0) window.scrollTo({ top: scrollable * savedProgress.progress / 100, behavior: 'auto' })
      })
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateProgress)
      document.querySelector('script[data-article-schema="true"]')?.remove()
      const canonical = document.querySelector('link[rel="canonical"]')
      canonical?.setAttribute('href', 'https://dreamex.tech/')
      setMeta('meta[property="og:title"]', 'content', 'DreamEx Tech — Think deeper. Build smarter.')
      setMeta('meta[property="og:description"]', 'content', 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern.')
      setMeta('meta[property="og:url"]', 'content', 'https://dreamex.tech/')
      setMeta('meta[name="twitter:title"]', 'content', 'DreamEx Tech — Think deeper. Build smarter.')
      setMeta('meta[name="twitter:description"]', 'content', 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern.')
      setMeta('meta[name="description"]', 'content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
    }
  }, [article, language, t, translated?.excerpt, translated?.title])
  if (!article) return <main id="main-content" className="container not-found"><h1>{t('articleNotFound')}</h1><p>{t('articleMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>
  return <main id="main-content" className="article-page"><div className="reading-progress" role="progressbar" aria-label={language === 'en' ? 'Article reading progress' : 'Progres membaca artikel'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ transform: `scaleX(${progress / 100})` }} /></div><div className="container article-container">
    <Link className="back-link" to="/">{t('backAll')}</Link>
    <div className="article-header"><span className="category-pill">{categoryLabel(article.category, language)}</span><h1>{translated?.title ?? article.title}</h1><p>{translated?.excerpt ?? article.excerpt}</p><div className="article-meta"><span>{new Date(article.date + 'T00:00:00').toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>•</span><span>{language === 'en' ? article.readTime.replace('menit', 'min') : article.readTime}</span><span>•</span><span>{t('editorial')}</span></div></div>
    <div className="article-body">{(translated?.body ?? article.body).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="article-note"><strong><ShieldCheck size={16} /> {t('engineeringNote')}</strong><p>{t('noteDescription')}</p></div></div>
    <div className="article-end"><span>{t('topicsLabel')}</span><div className="tag-row">{article.tags.map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div><button className="copy-link-button" onClick={() => toggleSaved(article.slug)} aria-pressed={isSaved(article.slug)}><Bookmark size={14} /> {isSaved(article.slug) ? (language === 'en' ? 'Saved to reading list' : 'Tersimpan di daftar bacaan') : (language === 'en' ? 'Save to reading list' : 'Simpan ke daftar bacaan')}</button><button className="copy-link-button" onClick={shareArticle}><Share2 size={14} /> {language === 'en' ? 'Share article' : 'Bagikan artikel'}</button><button className="copy-link-button" onClick={copyCitation}><Copy size={14} /> {citationCopied ? (language === 'en' ? 'Citation copied' : 'Sitasi disalin') : (language === 'en' ? 'Copy Markdown citation' : 'Salin sitasi Markdown')}</button><button className="copy-link-button" onClick={copyArticleLink}><Copy size={14} /> {linkCopied ? t('copied') : t('copyLink')}</button></div>
    {copyError && <p className="copy-error" role="status">{t('copyError')}</p>}
    {relatedArticles.length > 0 && <section className="related-section"><div className="related-heading"><span className="section-kicker">{t('nextLearning')}</span><h2>{t('continueExploring')}</h2></div><div className="related-grid">{relatedArticles.map((related, index) => <ArticleCard key={related.slug} article={related} index={index} />)}</div></section>}
    <div className="article-next"><div><span className="section-kicker">{t('keepExploring')}</span><h2>{t('shareKnowledge')}</h2></div><Link className="button button-primary" to="/">{t('exploreArticles')} <ArrowRight size={16} /></Link></div>
  </div></main>
}


function CommandPalette() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [recentTools, setRecentTools] = useState<string[]>(() => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem('dreamex-recent-tools-v1') ?? '[]')
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string').slice(0, 4) : []
    } catch { return [] }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const previousPath = useRef(location.pathname)
  const isEnglish = language === 'en'
  const actions = [
    { id: 'home', label: isEnglish ? 'Go to home' : 'Ke beranda', detail: isEnglish ? 'Main page' : 'Halaman utama', icon: HomeIcon, run: () => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
    { id: 'about', label: isEnglish ? 'About DreamEx Tech' : 'Tentang DreamEx Tech', detail: isEnglish ? 'Mission, disciplines, and principles' : 'Misi, disiplin, dan prinsip', icon: Braces, run: () => navigate('/about') },
    { id: 'topics', label: isEnglish ? 'Explore topics' : 'Jelajahi topik', detail: isEnglish ? 'Software · QA · AI' : 'Software · QA · AI', icon: Command, run: () => { if (location.pathname !== '/') navigate('/'); window.setTimeout(() => document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' }), 60) } },
    { id: 'articles', label: isEnglish ? 'Browse articles' : 'Jelajahi artikel', detail: isEnglish ? 'Search the knowledge base' : 'Cari di basis pengetahuan', icon: BookOpen, run: () => { if (location.pathname !== '/') navigate('/'); window.setTimeout(() => { document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); document.querySelector<HTMLInputElement>('.search-box input')?.focus() }, 60) } },
    { id: 'reading-list', label: isEnglish ? 'Open reading list' : 'Buka daftar bacaan', detail: isEnglish ? 'Your saved engineering notes' : 'Catatan engineering tersimpan', icon: Bookmark, run: () => navigate('/reading-list') },
    { id: 'lab', label: isEnglish ? 'Open Engineering Lab' : 'Buka Lab Engineering', detail: isEnglish ? 'QA tools, bug reports, and JSON utilities' : 'Tool QA, laporan bug, dan utilitas JSON', icon: Terminal, run: () => navigate('/lab') },
    { id: 'observatory', label: isEnglish ? 'Web Quality Observatory' : 'Observatory Kualitas Web', detail: isEnglish ? 'Inspect metadata, accessibility signals, and responsive foundations' : 'Periksa metadata, aksesibilitas, dan fondasi responsif', icon: Activity, run: () => navigate('/observatory') },
    { id: 'devtools', label: isEnglish ? 'Developer Utilities' : 'Utilitas Developer', detail: isEnglish ? 'JSON Schema, regex testing, and JWT inspection' : 'JSON Schema, pengujian regex, dan pemeriksaan JWT', icon: Braces, run: () => navigate('/devtools') },
    { id: 'workspace', label: 'Engineering Workspace', detail: isEnglish ? 'Unified search across tools and learning' : 'Pencarian terpadu tools dan pembelajaran', icon: Command, run: () => navigate('/workspace') },
    { id: 'engineering-intelligence', label: isEnglish ? 'Engineering Intelligence' : 'Engineering Intelligence', detail: isEnglish ? 'Software catalog, OpenAPI analysis, and breaking-change review' : 'Katalog software, analisis OpenAPI, dan tinjauan breaking change', icon: Activity, run: () => navigate('/engineering-intelligence') },
    { id: 'control-plane', label: isEnglish ? 'Engineering Control Plane' : 'Pusat Kendali Engineering Terpadu', detail: isEnglish ? 'Unified workflows, browser signals, and release checklist' : 'Workflow terpadu, sinyal browser, dan checklist rilis', icon: Activity, run: () => navigate('/control-plane') },
    { id: 'command-center', label: isEnglish ? 'Engineering Command Center' : 'Pusat Kendali Engineering', detail: isEnglish ? 'Work items, incident records, ADRs, and release gates' : 'Tugas, insiden, ADR, dan gerbang rilis', icon: Activity, run: () => navigate('/command-center') },
    { id: 'qa-studio', label: isEnglish ? 'QA Automation Studio' : 'Studio Otomasi QA', detail: isEnglish ? 'Generate test cases, Gherkin, bug reports, and plans' : 'Buat test case, Gherkin, laporan bug, dan test plan', icon: ClipboardList, run: () => navigate('/qa-studio') },
    { id: 'quality-intelligence', label: isEnglish ? 'Quality Intelligence Center' : 'Pusat Quality Intelligence', detail: isEnglish ? 'Analyze Playwright JSON and JUnit XML reports locally' : 'Analisis laporan Playwright JSON dan JUnit XML secara lokal', icon: Activity, run: () => navigate('/quality-intelligence') },
    { id: 'reliability-center', label: isEnglish ? 'Reliability & Incident Center' : 'Pusat Reliability & Insiden', detail: isEnglish ? 'Incident timelines, postmortems, and manually reported delivery metrics' : 'Timeline insiden, postmortem, dan metrik delivery manual', icon: Gauge, run: () => navigate('/reliability-center') },
    { id: 'supply-chain-intelligence', label: isEnglish ? 'Software Supply Chain Intelligence' : 'Intelligence Software Supply Chain', detail: isEnglish ? 'Inspect CycloneDX/SPDX SBOMs and included vulnerability records locally' : 'Tinjau SBOM CycloneDX/SPDX dan data kerentanan secara lokal', icon: ShieldCheck, run: () => navigate('/supply-chain-intelligence') },
    { id: 'security-center', label: isEnglish ? 'Security & Privacy Center' : 'Pusat Keamanan & Privasi', detail: isEnglish ? 'Review security headers and browser-visible signals' : 'Tinjau security header dan sinyal browser', icon: ShieldCheck, run: () => navigate('/security-center') },
    { id: 'api-playground', label: 'API Playground', detail: isEnglish ? 'Send requests and inspect responses' : 'Kirim request dan periksa response', icon: Zap, run: () => navigate('/api-playground') },
    { id: 'performance', label: 'Performance Observatory', detail: isEnglish ? 'Browser timing and available Web Vitals' : 'Timing browser dan Web Vitals', icon: Activity, run: () => navigate('/performance') },
    { id: 'knowledge-graph', label: 'Engineering Knowledge Graph', detail: isEnglish ? 'Explore relationships between concepts and tools' : 'Jelajahi relasi konsep dan tools', icon: Share2, run: () => navigate('/knowledge-graph') },
    { id: 'learn', label: isEnglish ? 'Open Learning Hub' : 'Buka Pusat Belajar', detail: isEnglish ? 'Curated paths and engineering glossary' : 'Jalur belajar dan glosarium engineering', icon: BookOpen, run: () => navigate('/learn') },
  ]
  const actionCategory: Record<string, string> = {
    home: 'learn', about: 'learn', topics: 'learn', articles: 'learn', 'reading-list': 'learn', workspace: 'learn', 'knowledge-graph': 'learn', learn: 'learn',
    lab: 'qa', 'qa-studio': 'qa', 'quality-intelligence': 'qa',
    'api-playground': 'api', 'engineering-intelligence': 'api',
    devtools: 'security', 'security-center': 'security', 'supply-chain-intelligence': 'security',
    observatory: 'reliability', 'control-plane': 'reliability', 'command-center': 'reliability', performance: 'reliability',
  }
  const categories = [
    { id: 'all', label: isEnglish ? 'All tools' : 'Semua tools' },
    { id: 'qa', label: 'QA' },
    { id: 'api', label: 'API' },
    { id: 'security', label: isEnglish ? 'Security' : 'Keamanan' },
    { id: 'reliability', label: isEnglish ? 'Reliability' : 'Reliabilitas' },
    { id: 'learn', label: isEnglish ? 'Learn & discover' : 'Belajar & jelajahi' },
  ]
  const term = query.trim().toLowerCase()
  const filteredArticles = articles.filter(article => {
    const translated = articleTranslations[article.slug]
    const searchableText = [
      article.title, article.excerpt, article.body.join(' '),
      translated?.title, translated?.excerpt, translated?.body.join(' '),
      article.category, ...article.tags, article.slug.replaceAll('-', ' '),
    ].filter(Boolean).join(' ').toLowerCase()
    return searchableText.includes(term)
  }).slice(0, 6)
  const items = [
    ...actions.filter(action => (!term || `${action.label} ${action.detail}`.toLowerCase().includes(term)) && (categoryFilter === 'all' || actionCategory[action.id] === categoryFilter)).map(action => ({ id: action.id, label: action.label, detail: action.detail, icon: action.icon, run: action.run })),
    ...(categoryFilter === 'all' ? filteredArticles.map(article => {
      const translated = articleTranslations[article.slug]
      const label = isEnglish ? (translated?.title ?? article.title) : article.title
      const alternateTitle = isEnglish ? article.title : translated?.title
      return {
        id: article.slug,
        label,
        detail: categoryLabel(article.category, language),
        accessibleLabel: alternateTitle && alternateTitle !== label ? `${label} — ${alternateTitle}` : label,
        icon: BookOpen,
        run: () => navigate(`/blog/${article.slug}`),
      }
    }) : []),
  ]
  const recentItems = recentTools.map(id => actions.find(action => action.id === id)).filter(action => action && (categoryFilter === 'all' || actionCategory[action.id] === categoryFilter)).slice(0, 4)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      } else if (event.key === 'Escape') setOpen(false)
    }
    const onOpenPalette = () => setOpen(true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('dreamex-open-command-palette', onOpenPalette)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('dreamex-open-command-palette', onOpenPalette)
    }
  }, [])
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setQuery('')
    setActiveIndex(0)
    window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])
  useEffect(() => setActiveIndex(0), [query, categoryFilter])
  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname
    setOpen(false)
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#main-content h1')
      if (!heading) return
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])
  const runItem = (item: typeof items[number]) => {
    if (actions.some(action => action.id === item.id)) {
      const next = [item.id, ...recentTools.filter(id => id !== item.id)].slice(0, 4)
      setRecentTools(next)
      try { window.localStorage.setItem('dreamex-recent-tools-v1', JSON.stringify(next)) } catch { /* Recent tools are optional convenience only. */ }
    }
    setOpen(false)
    item.run()
  }
  const clearRecentTools = () => {
    setRecentTools([])
    try { window.localStorage.removeItem('dreamex-recent-tools-v1') } catch { /* The current UI state is still cleared. */ }
  }
  return <>
    {open && <div className="command-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-label={isEnglish ? 'Jump to anything' : 'Cari dan buka apa saja'}>
        <div className="command-search-row"><Search size={19} /><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Tab') {
            const dialog = event.currentTarget.closest('[role="dialog"]')
            const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
            if (focusable?.length) {
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
            }
          }
          if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, items.length - 1)) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(0, index - 1)) }
          if (event.key === 'Enter' && items.length) { event.preventDefault(); runItem(items[Math.min(activeIndex, items.length - 1)]) }
        }} placeholder={isEnglish ? 'Search articles, topics, and pages…' : 'Cari artikel, topik, dan halaman…'} aria-label={isEnglish ? 'Search commands' : 'Cari perintah'} /><button onClick={() => setOpen(false)} aria-label={isEnglish ? 'Close command palette' : 'Tutup command palette'}><X size={18} /></button></div>
        <div className="command-discovery">
          <div className="command-category-filters" role="group" aria-label={isEnglish ? 'Tool categories' : 'Kategori tools'}>
            {categories.map(category => <button key={category.id} type="button" aria-pressed={categoryFilter === category.id} className={categoryFilter === category.id ? 'active' : ''} onClick={() => setCategoryFilter(category.id)}>{category.label}</button>)}
          </div>
          {!term && recentItems.length > 0 && <section className="command-recent" aria-label={isEnglish ? 'Recently used tools' : 'Tools yang baru digunakan'}>
            <div className="command-recent-heading"><p>{isEnglish ? 'RECENTLY USED' : 'BARU DIGUNAKAN'}</p><button type="button" onClick={clearRecentTools}>{isEnglish ? 'Clear recent' : 'Hapus riwayat'}</button></div>
            <div className="command-recent-items">{recentItems.map(action => {
              const Icon = action!.icon
              return <button key={action!.id} type="button" onClick={() => runItem({ id: action!.id, label: action!.label, detail: action!.detail, icon: action!.icon, run: action!.run })}><Icon size={14}/><span>{action!.label}</span></button>
            })}</div>
            <p className="command-recent-privacy">{isEnglish ? 'Stored only in this browser profile.' : 'Disimpan hanya di profil browser ini.'}</p>
          </section>}
        </div>
        <div className="command-results" id="command-results">
          <p className="command-section-label" id="command-title">{term ? (isEnglish ? 'SEARCH RESULTS' : 'HASIL PENCARIAN') : (isEnglish ? 'QUICK ACTIONS & ARTICLES' : 'AKSI CEPAT & ARTIKEL')}</p>
          {items.length ? items.map((item, index) => {
            const Icon = item.icon
            return <button key={item.id} type="button" aria-label={String('accessibleLabel' in item ? item.accessibleLabel : item.label)} className={index === activeIndex ? 'command-item active' : 'command-item'} onMouseEnter={() => setActiveIndex(index)} onClick={() => runItem(item)}><span className="command-item-icon"><Icon size={16} /></span><span className="command-item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight size={14} className="command-item-arrow" /></button>
          }) : <div className="command-empty">{isEnglish ? 'No matches. Try another keyword.' : 'Tidak ada hasil. Coba kata kunci lain.'}</div>}
        </div>
        <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> {isEnglish ? 'Navigate' : 'Navigasi'}</span><span><kbd>↵</kbd> {isEnglish ? 'Open' : 'Buka'}</span><span><kbd>Esc</kbd> {isEnglish ? 'Close' : 'Tutup'}</span></footer>
      </section>
    </div>}
  </>
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

function MotionOnScroll() {
  useEffect(() => {
    const selector = '.topics-heading, .topic-card, .featured-card, .section-heading, .newsletter-inner, .article-card, .trust-inner span, .featured-art, .article-header, .article-body > p, .article-note, .article-next, .footer-inner'
    const observed = new WeakSet<Element>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' })
    const reveal = () => {
      document.querySelectorAll(selector).forEach((element, index) => {
        if (observed.has(element)) return
        observed.add(element)
        element.classList.add('motion-reveal')
        element.setAttribute('style', `${element.getAttribute('style') ?? ''};--reveal-delay:${Math.min(index % 3, 2) * 90}ms`)
        observer.observe(element)
      })
    }
    reveal()
    const mutationObserver = new MutationObserver(reveal)
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
  return null
}

function OfflineNotice() {
  const { language } = useLanguage()
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  useEffect(() => {
    const online = () => setOffline(false)
    const offlineEvent = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offlineEvent)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offlineEvent)
    }
  }, [])
  return offline ? <div className="offline-notice" role="status"><span />{language === 'en' ? 'You are offline. Cached pages may still be available.' : 'Anda sedang offline. Halaman yang tersimpan mungkin tetap tersedia.'}</div> : null
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let frame = 0
    const update = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        const next = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0
        setProgress(Math.min(100, Math.max(0, next)))
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return <div className="site-scroll-progress" role="progressbar" aria-label="Page scroll progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
}



type RouteSeoCopy = { title: string; description: string }
type LocalizedRouteSeo = { id: RouteSeoCopy; en: RouteSeoCopy }

const ROUTE_SEO: Record<string, LocalizedRouteSeo> = {
  '/': { en: { title: 'DreamEx Tech — Think deeper. Build smarter.', description: 'Practical notes on software engineering, quality engineering, AI, and modern technology.' }, id: { title: 'DreamEx Tech — Think deeper. Build smarter.', description: 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern.' } },
  '/observatory': { en: { title: 'Web Quality Observatory — DreamEx Tech', description: 'Review browser-side web quality signals, responsive behavior, accessibility basics, and metadata with transparent limitations.' }, id: { title: 'Observatorium Kualitas Web — DreamEx Tech', description: 'Tinjau sinyal kualitas web di browser, perilaku responsif, dasar aksesibilitas, dan metadata dengan batasan yang jelas.' } },
  '/devtools': { en: { title: 'Developer Utilities — DreamEx Tech', description: 'Use practical browser-first utilities for developer workflows, formatting, inspection, and lightweight validation.' }, id: { title: 'Utilitas Developer — DreamEx Tech', description: 'Gunakan utilitas berbasis browser untuk alur developer, pemformatan, inspeksi, dan validasi ringan.' } },
  '/workspace': { en: { title: 'Engineering Workspace — DreamEx Tech', description: 'Find engineering tools, navigate QA workflows, and organize software quality tasks in one workspace.' }, id: { title: 'Engineering Workspace — DreamEx Tech', description: 'Temukan tools engineering, navigasi alur QA, dan atur tugas kualitas software dalam satu workspace.' } },
  '/control-plane': { en: { title: 'Engineering Control Plane — DreamEx Tech', description: 'Review release readiness, operational signals, risks, and evidence with a transparent engineering checklist.' }, id: { title: 'Engineering Control Plane — DreamEx Tech', description: 'Tinjau kesiapan rilis, sinyal operasional, risiko, dan bukti melalui checklist engineering yang transparan.' } },
  '/engineering-intelligence': { en: { title: 'Engineering Intelligence — DreamEx Tech', description: 'Explore engineering catalogs, API contract insights, and explainable static analysis for software delivery.' }, id: { title: 'Engineering Intelligence — DreamEx Tech', description: 'Jelajahi katalog engineering, insight kontrak API, dan analisis statis yang transparan untuk delivery software.' } },
  '/command-center': { en: { title: 'Engineering Command Center — DreamEx Tech', description: 'Organize engineering tasks, incident follow-ups, decisions, and manual reliability planning in one local-first center.' }, id: { title: 'Engineering Command Center — DreamEx Tech', description: 'Atur tugas engineering, tindak lanjut insiden, keputusan, dan perencanaan reliability manual dalam satu pusat kerja.' } },
  '/qa-studio': { en: { title: 'QA Automation Studio — DreamEx Tech', description: 'Prepare test plans, generate editable Playwright scaffolds, and organize QA artifacts with browser-local workflows.' }, id: { title: 'QA Automation Studio — DreamEx Tech', description: 'Siapkan rencana tes, buat kerangka Playwright yang dapat diedit, dan kelola artefak QA secara lokal di browser.' } },
  '/quality-intelligence': { en: { title: 'Quality Intelligence — DreamEx Tech', description: 'Compare imported test reports, inspect failure patterns, and review flaky-test signals with sample-size context.' }, id: { title: 'Quality Intelligence — DreamEx Tech', description: 'Bandingkan laporan tes, tinjau pola kegagalan, dan evaluasi sinyal flaky test dengan konteks ukuran sampel.' } },
  '/reliability-center': { en: { title: 'Reliability & Incident Center — DreamEx Tech', description: 'Document incidents, timelines, follow-up ownership, and manual delivery metrics with portable postmortem exports.' }, id: { title: 'Pusat Reliability & Insiden — DreamEx Tech', description: 'Dokumentasikan insiden, timeline, pemilik tindak lanjut, dan metrik delivery manual dengan ekspor postmortem.' } },
  '/supply-chain-intelligence': { en: { title: 'Software Supply Chain Intelligence — DreamEx Tech', description: 'Inspect imported SBOM packages, dependency metadata, and license signals without claiming a live vulnerability scan.' }, id: { title: 'Software Supply Chain Intelligence — DreamEx Tech', description: 'Periksa paket SBOM, metadata dependensi, dan sinyal lisensi tanpa mengklaim pemindaian kerentanan langsung.' } },
  '/security-center': { en: { title: 'Security & Privacy Center — DreamEx Tech', description: 'Review security headers, privacy controls, local data handling, and practical threat-modeling guidance.' }, id: { title: 'Pusat Keamanan & Privasi — DreamEx Tech', description: 'Tinjau header keamanan, kontrol privasi, pengelolaan data lokal, dan panduan threat modeling praktis.' } },
  '/api-playground': { en: { title: 'API Playground & Contract Studio — DreamEx Tech', description: 'Inspect API workflows and compare OpenAPI contracts for potential compatibility changes using static browser-local analysis.' }, id: { title: 'API Playground & Contract Studio — DreamEx Tech', description: 'Periksa alur API dan bandingkan kontrak OpenAPI untuk menemukan potensi perubahan kompatibilitas melalui analisis statis lokal.' } },
  '/performance': { en: { title: 'Performance Observatory — DreamEx Tech', description: 'Review performance budgets, browser-side measurements, and optimization guidance without implying real-user telemetry.' }, id: { title: 'Observatorium Performa — DreamEx Tech', description: 'Tinjau budget performa, pengukuran di browser, dan panduan optimasi tanpa mengklaim telemetry pengguna nyata.' } },
  '/knowledge-graph': { en: { title: 'Engineering Knowledge Graph — DreamEx Tech', description: 'Explore relationships among engineering topics, tools, practices, and learning resources in a navigable knowledge graph.' }, id: { title: 'Graf Pengetahuan Engineering — DreamEx Tech', description: 'Jelajahi hubungan topik engineering, tools, praktik, dan sumber belajar melalui graf pengetahuan yang mudah dinavigasi.' } },
  '/roadmap': { en: { title: 'Product Roadmap & Readiness — DreamEx Tech', description: 'Plan engineering improvements, review release-readiness criteria, and track decisions with clear evidence and limitations.' }, id: { title: 'Roadmap Produk & Kesiapan Rilis — DreamEx Tech', description: 'Rencanakan peningkatan engineering, tinjau kriteria kesiapan rilis, dan lacak keputusan beserta bukti serta batasannya.' } },
  '/lab': { en: { title: 'Engineering Lab — DreamEx Tech', description: 'Explore practical quality engineering tools, test data helpers, and safe starter workflows for software teams.' }, id: { title: 'Engineering Lab — DreamEx Tech', description: 'Jelajahi tools quality engineering, pembantu data tes, dan alur awal yang aman untuk tim software.' } },
  '/learn': { en: { title: 'Engineering Learning Hub — DreamEx Tech', description: 'Follow structured learning paths, explore an engineering glossary, and track progress through practical software topics.' }, id: { title: 'Pusat Belajar Engineering — DreamEx Tech', description: 'Ikuti jalur belajar terstruktur, jelajahi glosarium engineering, dan pantau progres topik software praktis.' } },
  '/reading-list': { en: { title: 'Reading List — DreamEx Tech', description: 'Return to saved engineering articles and manage a portable browser-local reading list without an account.' }, id: { title: 'Daftar Bacaan — DreamEx Tech', description: 'Buka kembali artikel engineering tersimpan dan kelola daftar bacaan lokal yang portabel tanpa akun.' } },
  '/about': { en: { title: 'About DreamEx Tech — Engineering, AI & QA', description: 'Learn about DreamEx Tech, a practical publication and browser-first engineering toolkit for software quality and technology.' }, id: { title: 'Tentang DreamEx Tech — Engineering, AI & QA', description: 'Kenali DreamEx Tech, publikasi praktis dan toolkit engineering berbasis browser untuk kualitas software dan teknologi.' } },
  '/rss': { en: { title: 'Latest Articles & RSS — DreamEx Tech', description: 'Browse the latest DreamEx Tech articles and subscribe to the RSS 2.0 feed for engineering, QA, AI, and technology.' }, id: { title: 'Artikel Terbaru & RSS — DreamEx Tech', description: 'Jelajahi artikel terbaru DreamEx Tech dan berlangganan RSS 2.0 untuk engineering, QA, AI, dan teknologi.' } },
}

function upsertMeta(key: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name'
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

function RouteMetadata() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  useEffect(() => {
    const route = pathname.replace(/\/+$/, '') || '/'
    const slug = route.match(/^\/blog\/([^/]+)$/)?.[1]
    const article = slug ? articles.find(item => item.slug === slug) : undefined
    const translated = article && language === 'en' ? articleTranslations[article.slug] : undefined
    const unknownArticle = Boolean(slug && !article)
    const page = article
      ? { title: `${translated?.title ?? article.title} — DreamEx Tech`, description: translated?.excerpt ?? article.excerpt }
      : ROUTE_SEO[route]?.[language] ?? {
          title: language === 'en' ? 'Page not found — DreamEx Tech' : 'Halaman tidak ditemukan — DreamEx Tech',
          description: language === 'en' ? 'This DreamEx Tech route could not be found. Return to the homepage to explore engineering tools and articles.' : 'Halaman DreamEx Tech ini tidak ditemukan. Kembali ke beranda untuk menjelajahi tools engineering dan artikel.',
        }
    const canonicalUrl = `https://dreamex.tech${route === '/' ? '/' : route}`
    document.title = page.title
    upsertMeta('description', page.description)
    upsertMeta('og:title', page.title, true)
    upsertMeta('og:description', page.description, true)
    upsertMeta('og:url', canonicalUrl, true)
    upsertMeta('og:type', article ? 'article' : 'website', true)
    upsertMeta('twitter:title', page.title)
    upsertMeta('twitter:description', page.description)
    upsertMeta('twitter:card', 'summary')
    upsertMeta('robots', unknownArticle ? 'noindex, follow' : 'index, follow')
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = canonicalUrl
  }, [pathname, language])
  return null
}

const TOOL_BREADCRUMB_LABELS: Record<string, { id: string; en: string }> = {
  '/workspace': { id: 'Engineering Workspace', en: 'Engineering Workspace' },
  '/control-plane': { id: 'Pusat Kendali Engineering', en: 'Engineering Control Plane' },
  '/engineering-intelligence': { id: 'Engineering Intelligence', en: 'Engineering Intelligence' },
  '/command-center': { id: 'Engineering Command Center', en: 'Engineering Command Center' },
  '/qa-studio': { id: 'QA Automation Studio', en: 'QA Automation Studio' },
  '/quality-intelligence': { id: 'Quality Intelligence Center', en: 'Quality Intelligence Center' },
  '/reliability-center': { id: 'Pusat Reliability & Insiden', en: 'Reliability & Incident Center' },
  '/supply-chain-intelligence': { id: 'Supply Chain Intelligence', en: 'Supply Chain Intelligence' },
  '/security-center': { id: 'Pusat Keamanan & Privasi', en: 'Security & Privacy Center' },
  '/api-playground': { id: 'API Playground', en: 'API Playground' },
  '/performance': { id: 'Performance Observatory', en: 'Performance Observatory' },
  '/knowledge-graph': { id: 'Engineering Knowledge Graph', en: 'Engineering Knowledge Graph' },
  '/roadmap': { id: 'Product Roadmap', en: 'Product Roadmap' },
  '/lab': { id: 'Engineering Lab', en: 'Engineering Lab' },
}

function ToolRouteBreadcrumbs() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  const label = TOOL_BREADCRUMB_LABELS[pathname.replace(/\/+$/, '') || '/']
  if (!label) return null
  const homeLabel = language === 'en' ? 'Home' : 'Beranda'
  const currentLabel = language === 'en' ? label.en : label.id
  return <nav className="tool-route-breadcrumbs" aria-label={language === 'en' ? 'Breadcrumb' : 'Navigasi lokasi'}>
    <ol>
      <li><Link to="/">{homeLabel}</Link></li>
      <li aria-hidden="true" className="tool-route-breadcrumb-separator">/</li>
      <li aria-current="page"><span>{currentLabel}</span></li>
    </ol>
  </nav>
}

export default function App() {
  const { t } = useLanguage()
  return <><a className="skip-link" href="#main-content">{t('skip')}</a><OfflineNotice /><ScrollProgress /><CommandPalette /><ScrollToTop /><MotionOnScroll /><Header /><ToolRouteBreadcrumbs /><Routes><Route path="/" element={<Home />} /><Route path="/observatory" element={<WebQualityObservatoryPage />} /> <Route path="/devtools" element={<DeveloperUtilitiesPage />} /> <Route path="/workspace" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Engineering Workspace…</div>}><EngineeringWorkspacePage /></Suspense>} /><Route path="/control-plane" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Engineering Control Plane…</div>}><EngineeringControlPlanePage /></Suspense>} /><Route path="/engineering-intelligence" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Engineering Intelligence…</div>}><EngineeringIntelligencePage /></Suspense>} /><Route path="/command-center" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Command Center…</div>}><EngineeringCommandCenterPage /></Suspense>} /><Route path="/qa-studio" element={<Suspense fallback={<div className="container route-loading" role="status">Loading QA Automation Studio…</div>}><QAAutomationStudioPage /></Suspense>} /><Route path="/quality-intelligence" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Quality Intelligence…</div>}><QualityIntelligencePage /></Suspense>} /><Route path="/reliability-center" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Reliability Center…</div>}><ReliabilityCenterPage /></Suspense>} /><Route path="/supply-chain-intelligence" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Supply Chain Intelligence…</div>}><SupplyChainIntelligencePage /></Suspense>} /><Route path="/security-center" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Security Center…</div>}><SecurityCenterPage /></Suspense>} /><Route path="/api-playground" element={<Suspense fallback={<div className="container route-loading" role="status">Loading API Playground…</div>}><ApiPlaygroundPage /></Suspense>} /><Route path="/performance" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Performance Observatory…</div>}><PerformanceObservatoryPage /></Suspense>} /><Route path="/knowledge-graph" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Engineering Knowledge Graph…</div>}><EngineeringKnowledgeGraphPage /></Suspense>} /><Route path="/roadmap" element={<Suspense fallback={<div className="container route-loading" role="status">Loading Product Roadmap…</div>}><EngineeringRoadmapPage /></Suspense>} /><Route path="/about" element={<AboutPage />} /><Route path="/reading-list" element={<ReadingListPage />} /><Route path="/lab" element={<EngineeringLabPage />} /><Route path="/learn" element={<LearningHubPage />} /><Route path="/rss" element={<RssPage />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main id="main-content" className="container not-found"><h1>{t('pageNotFound')}</h1><p>{t('pageMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>} /></Routes><Footer /><RouteMetadata /></>
}
