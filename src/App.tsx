import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, BookOpen, Bookmark, Braces, Check, ChevronUp, ChevronDown, Layers3, Command, Copy, Github, Home as HomeIcon, Search, Share2, ShieldCheck, Sparkles, Terminal, X, Zap, Rss, Activity, CheckCircle2, ClipboardList, Network, Gauge, Clock3 } from 'lucide-react'
import { articles } from './articles'
import { articleTranslations } from './articleTranslations'
import { getArticleCover } from './articleCovers'
import { useLanguage } from './i18n'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from './themeUtils'
import { ArticleCard } from './ArticleCard'
import { ArticleReaderView } from './ArticleReader'
import {
  categoryLabel,
  READING_LIST_EVENT,
  READING_LIST_KEY,
  READING_PROGRESS_EVENT,
  READING_PROGRESS_KEY,
  readReadingProgress as readSharedReadingProgress,
  readSavedSlugs,
  useReadingList,
  type ReadingProgressRecord,
} from './readingUtils'
import { EngineeringLaunchpad } from './EngineeringLaunchpad'
import { HeroAiCockpit } from './HeroAiCockpit'
import { HeroNeuralCanvas } from './HeroNeuralCanvas'
import { HoloMotionFx } from './HoloMotionFx'
import { useProjectContextBus } from './projectContextBus'
const LazyEngineeringLab = lazy(() => import('./EngineeringLab').then(module => ({ default: module.EngineeringLabView })))
const LazyWebQualityObservatory = lazy(() => import('./DevUtilitiesSuite').then(module => ({ default: module.WebQualityObservatoryView })))
const LazyDeveloperUtilities = lazy(() => import('./DevUtilitiesSuite').then(module => ({ default: module.DeveloperUtilitiesView })))
const NeuralAiStudio = lazy(() => import('./NeuralAiStudio').then(module => ({ default: module.NeuralAiStudio })))
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
const GitHubIntegrationPage = lazy(() => import('./GitHubIntegration').then(module => ({ default: module.GitHubIntegrationPage })))
const TeamWorkspacePage = lazy(() => import('./TeamWorkspace').then(module => ({ default: module.TeamWorkspacePage })))
const SiteAuditPage = lazy(() => import('./SiteAudit').then(module => ({ default: module.SiteAuditPage })))
const SovereignWorkbenchPage = lazy(() => import('./SovereignWorkbench').then(module => ({ default: module.SovereignWorkbenchPage })))
const AiPrototypeStudioPage = lazy(() => import('./AiPrototypeStudio'))
const HomePrototypeStage = lazy(() => import('./HomePrototypeStage'))
const HomeJiraShowcase = lazy(() => import('./HomeJiraShowcase'))
const AiReadinessGraderPage = lazy(() => import('./AiReadinessGrader'))
const GuidedProductTour = lazy(() => import('./GuidedProductTour'))
const JiraEnterpriseBoardPage = lazy(() => import('./JiraEnterpriseBoard'))
const ContactDemoPage = lazy(() => import('./ContactDemoPage'))

const categories = ['Semua', 'Software Engineering', 'QA Automation', 'AI & Technology']

// Keep explicit verification identifiers linked cleanly to shared reading helpers.
void READING_PROGRESS_KEY
void READING_LIST_KEY
function readReadingProgress(): ReadingProgressRecord | null {
  return readSharedReadingProgress()
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

const RECENT_NAV_STORAGE_KEY = 'dreamex.navigation.recent.v1'
const RECENT_NAV_LIMIT = 4
const NAV_DESTINATIONS: Record<string, { id: string; en: string; descriptionId: string; descriptionEn: string }> = {
  '/github-ci': { id: 'Status CI GitHub', en: 'GitHub CI Activity', descriptionId: 'Status workflow GitHub publik', descriptionEn: 'Live public workflow status' },
  '/team-workspace': { id: 'Team Workspace Bersama', en: 'Shared Team Workspace', descriptionId: 'Snapshot bersama dengan kontrol akses', descriptionEn: 'Shared snapshots with access controls' },
  '/workspace': { id: 'Engineering Workspace', en: 'Engineering Workspace', descriptionId: 'Ruang kerja terpadu', descriptionEn: 'Unified engineering workspace' },
  '/control-plane': { id: 'Pusat Kendali Engineering', en: 'Engineering Control Plane', descriptionId: 'Kesiapan rilis dan operasi', descriptionEn: 'Release readiness and operations' },
  '/engineering-intelligence': { id: 'Engineering Intelligence', en: 'Engineering Intelligence', descriptionId: 'Insight kualitas lintas tools', descriptionEn: 'Cross-tool quality insights' },
  '/command-center': { id: 'Command Center', en: 'Command Center', descriptionId: 'Tugas, insiden, dan keputusan', descriptionEn: 'Tasks, incidents and decisions' },
  '/qa-studio': { id: 'QA Automation Studio', en: 'QA Automation Studio', descriptionId: 'Rencana dan otomasi pengujian', descriptionEn: 'Test planning and automation' },
  '/quality-intelligence': { id: 'Quality Intelligence', en: 'Quality Intelligence', descriptionId: 'Laporan dan tren kualitas', descriptionEn: 'Quality reports and trends' },
  '/reliability-center': { id: 'Reliability & Insiden', en: 'Reliability & Incidents', descriptionId: 'Timeline insiden dan metrik', descriptionEn: 'Incident timelines and metrics' },
  '/supply-chain-intelligence': { id: 'Supply Chain', en: 'Supply Chain Intelligence', descriptionId: 'Inventaris dan provenance SBOM', descriptionEn: 'SBOM inventory and provenance' },
  '/security-center': { id: 'Pusat Keamanan', en: 'Security Center', descriptionId: 'Privasi dan praktik keamanan', descriptionEn: 'Privacy and security practices' },
  '/api-playground': { id: 'API Playground', en: 'API Playground', descriptionId: 'Kontrak dan workflow API', descriptionEn: 'API contracts and workflows' },
  '/performance': { id: 'Performance Observatory', en: 'Performance Observatory', descriptionId: 'Performa dan budget aset', descriptionEn: 'Performance and asset budgets' },
  '/knowledge-graph': { id: 'Knowledge Graph', en: 'Knowledge Graph', descriptionId: 'Relasi platform engineering', descriptionEn: 'Engineering platform relationships' },
  '/roadmap': { id: 'Roadmap Produk', en: 'Product Roadmap', descriptionId: 'Prioritas dan milestone', descriptionEn: 'Priorities and milestones' },
  '/lab': { id: 'Engineering Lab', en: 'Engineering Lab', descriptionId: 'Tools praktis developer dan QA', descriptionEn: 'Practical developer and QA tools' },
  '/devtools': { id: 'Developer Utilities', en: 'Developer Utilities', descriptionId: 'Utilitas developer', descriptionEn: 'Developer utilities' },
  '/observatory': { id: 'Web Quality Observatory', en: 'Web Quality Observatory', descriptionId: 'Sinyal kualitas web', descriptionEn: 'Web quality signals' },
  '/site-audit': { id: 'Audit Kesehatan Halaman', en: 'Page Health Audit', descriptionId: 'Audit metadata, aksesibilitas dan responsivitas', descriptionEn: 'Audit metadata, accessibility and responsiveness' },
  '/learn': { id: 'Pusat Belajar', en: 'Learning Hub', descriptionId: 'Jalur belajar terstruktur', descriptionEn: 'Structured learning paths' },
  '/tools': { id: 'Sovereign IT Workbench (6-Pilar)', en: 'Sovereign IT Workbench (6-Pillar)', descriptionId: 'Workbench IT, QA, BA, PM & Otomasi Jira', descriptionEn: 'Unified IT, QA, BA, PM & Jira Automation suite' },
  '/prototype': { id: 'Studio Prototipe AI (5-Agen)', en: 'AI Prototype Studio (5-Agent)', descriptionId: 'Orkestrasi DAG 5-agen, sandbox UI responsif & ekonomi token', descriptionEn: '5-agent DAG orchestrator, live responsive UI sandbox & token ROI' },
  '/grader': { id: 'Grader Kesiapan AI & Keamanan', en: 'AI Readiness & Security Grader', descriptionId: 'Audit domain untuk CSP, HSTS, /llms.txt & lencana SVG', descriptionEn: 'Audit domains for CSP, HSTS, /llms.txt & live SVG badges' },
  '/ba-hub': { id: 'BA Gherkin & RTM Studio', en: 'BA Gherkin & RTM Studio', descriptionId: 'Kompilator BRD ke Gherkin & matriks RTM', descriptionEn: 'BRD-to-Gherkin compiler & bi-directional RTM' },
  '/pm-jira-hub': { id: 'PM Monte Carlo & Jira Hub', en: 'PM Monte Carlo & Jira Hub', descriptionId: 'Payload Jira REST API v3, JQL & Monte Carlo', descriptionEn: 'Jira REST API v3 ADF, JQL & Monte Carlo forecasting' },
  '/jira': { id: 'Board Jira Agile & Sprint OS', en: 'Jira Agile Board & Sprint OS', descriptionId: 'Kanban drag-drop, backlog sprint, roadmap Gantt Epic, JQL & otomasi', descriptionEn: 'Kanban swimlanes, sprint backlog, Epic Gantt roadmap, live JQL & automation' },
}

function Header() {
  const { language, setLanguage, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')
  const [desktopMegaQuery, setDesktopMegaQuery] = useState('')
  const [activeMegaPillar, setActiveMegaPillar] = useState<'all' | 'plan' | 'build' | 'secure'>('all')
  const [recentRoutes, setRecentRoutes] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(RECENT_NAV_STORAGE_KEY) || '[]')
      return Array.isArray(saved)
        ? [...new Set(saved.filter((path): path is string => typeof path === 'string' && Object.prototype.hasOwnProperty.call(NAV_DESTINATIONS, path)))].slice(0, RECENT_NAV_LIMIT)
        : []
    } catch { return [] }
  })
  const location = useLocation()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const menuOpenRef = useRef(false)
  const previousPathRef = useRef(location.pathname)
  const setDrawerOpen = useCallback((open: boolean) => {
    menuOpenRef.current = open
    setMenuOpen(open)
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const query = menuOpen ? navQuery.trim().toLocaleLowerCase() : ''
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href]:not(.nav-recent-link)'))
    const recentLinks = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a.nav-recent-link'))
    const platform = nav.querySelector<HTMLDetailsElement>('.nav-platform')
    const summary = platform?.querySelector<HTMLElement>('summary')
    const intro = platform?.querySelector<HTMLElement>('.nav-mega-intro')
    const pillars = platform?.querySelector<HTMLElement>('.nav-mega-pillars')
    const groups = Array.from(nav.querySelectorAll<HTMLElement>('.nav-mega-group'))
    const empty = nav.querySelector<HTMLElement>('.nav-search-empty')
    const resultCount = nav.querySelector<HTMLElement>('.nav-search-count')

    if (!query) {
      links.forEach(link => { link.hidden = false })
      recentLinks.forEach(link => { link.hidden = false })
      groups.forEach(group => { group.hidden = false })
      if (intro) intro.hidden = false
      if (pillars) pillars.hidden = false
      if (summary) summary.hidden = false
      if (platform) platform.hidden = false
      if (empty) empty.hidden = true
      if (resultCount) resultCount.hidden = true
      if (!menuOpen) setNavQuery('')
      return
    }

    links.forEach(link => { link.hidden = !link.textContent?.toLocaleLowerCase().includes(query) })
    // Recent tools and spotlight promo card are excluded from Quick Find results so matching links appear first.
    recentLinks.forEach(link => { link.hidden = true })
    if (intro) {
      intro.hidden = true
      intro.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => { link.hidden = true })
    }
    if (pillars) pillars.hidden = true
    groups.forEach(group => {
      group.hidden = !Array.from(group.querySelectorAll<HTMLAnchorElement>('a[href]')).some(link => !link.hidden)
    })
    if (summary) summary.hidden = !summary.textContent?.toLocaleLowerCase().includes(query)
    if (platform) {
      const platformHasMatches = Boolean(platform.querySelector('.nav-mega-group:not([hidden])'))
      platform.hidden = !platformHasMatches
      if (platformHasMatches) platform.open = true
    }
    const visibleLinks = links.filter(link => !link.hidden).length
    if (empty) empty.hidden = visibleLinks > 0
    if (resultCount) {
      resultCount.hidden = false
      resultCount.textContent = language === 'en'
        ? `${visibleLinks} destination${visibleLinks === 1 ? '' : 's'} found`
        : `${visibleLinks} tujuan ditemukan`
    }
  }, [menuOpen, navQuery, language])

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return
    previousPathRef.current = location.pathname
    setDrawerOpen(false)
    setNavQuery('')
    setDesktopMegaQuery('')
    setActiveMegaPillar('all')
    document.querySelector('.nav-platform')?.removeAttribute('open')
  }, [location.pathname, setDrawerOpen])

  useEffect(() => {
    if (!NAV_DESTINATIONS[location.pathname]) return
    setRecentRoutes(previous => {
      const next = [location.pathname, ...previous.filter(path => path !== location.pathname)].slice(0, RECENT_NAV_LIMIT)
      try { window.localStorage.setItem(RECENT_NAV_STORAGE_KEY, JSON.stringify(next)) } catch { /* Recent tools are optional when browser storage is blocked. */ }
      return next
    })
  }, [location.pathname])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuOpen) return
      const platform = document.querySelector<HTMLDetailsElement>('.nav-platform')
      if (!platform?.open) return
      if (event.target instanceof Node && !platform.contains(event.target)) {
        platform.open = false
        setActiveMegaPillar('all')
      }
    }
    const handlePlatformEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || menuOpen) return
      const platform = document.querySelector<HTMLDetailsElement>('.nav-platform')
      if (!platform?.open) return
      platform.open = false
      setActiveMegaPillar('all')
      platform.querySelector<HTMLElement>('summary')?.focus()
    }
    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handlePlatformEscape)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('keydown', handlePlatformEscape)
    }
  }, [menuOpen])

  useEffect(() => {
    const handleQuickFindShortcut = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)) return
      const nav = navRef.current
      if (!nav?.classList.contains('nav-open')) return
      const input = nav.querySelector<HTMLInputElement>('#nav-drawer-search-input')
      if (!input) return
      event.preventDefault()
      // Claim the shortcut before window-level palettes or article search can steal focus.
      event.stopImmediatePropagation()
      const focusBeforeShortcut = document.activeElement
      input.focus({ preventScroll: true })
      if (document.activeElement !== input) {
        // Retry after the drawer transition only if the user has not moved focus.
        const retryFocus = () => {
          if (document.activeElement !== focusBeforeShortcut) return
          const currentNav = navRef.current
          if (!currentNav?.classList.contains('nav-open')) return
          const currentInput = currentNav.querySelector<HTMLInputElement>('#nav-drawer-search-input')
          currentInput?.focus({ preventScroll: true })
        }
        window.requestAnimationFrame(retryFocus)
        window.setTimeout(retryFocus, 350)
      }
    }
    document.addEventListener('keydown', handleQuickFindShortcut, true)
    return () => document.removeEventListener('keydown', handleQuickFindShortcut, true)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDrawerOpen(false)
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
  }, [menuOpen, setDrawerOpen])

  // Focus the close control after React opens the drawer. Do not depend on
  // transitionend: reduced-motion settings and the drawer's fixed geometry may
  // intentionally disable CSS transitions.
  useEffect(() => {
    if (!menuOpen) return
    const frame = window.requestAnimationFrame(() => {
      const nav = navRef.current
      const closeButton = nav?.querySelector<HTMLButtonElement>('.nav-drawer-close')
      if (nav && closeButton && !nav.contains(document.activeElement)) {
        closeButton.focus({ preventScroll: true })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [menuOpen])

  const closeDrawer = () => {
    setDrawerOpen(false)
    window.requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  return <>
    {menuOpen && <button className="nav-backdrop" type="button" aria-label={language === 'en' ? 'Close navigation' : 'Tutup navigasi'} onClick={closeDrawer} />}
    <header className={menuOpen ? 'site-header navigation-open' : 'site-header'}>
      <div className="container nav-wrap">
        <Link className="brand" to="/" aria-label={language === 'en' ? 'DreamEx Tech home' : 'Beranda DreamEx Tech'}>
          <span className="brand-mark"><Braces size={21} /></span>
          <span>DreamEx<span className="brand-muted"> Tech</span></span>
          <span className="brand-beta">{language === 'en' ? 'AI ENGINEERING OS' : 'OS REKAYASA AI'}</span>
        </Link>
        <button className="command-trigger" type="button" aria-keyshortcuts="Control+K Meta+K" aria-label={language === 'en' ? 'Search tools and articles' : 'Cari tools dan artikel'} onClick={() => { setDrawerOpen(false); document.querySelector('.nav-platform')?.removeAttribute('open'); window.dispatchEvent(new Event('dreamex-open-command-palette')) }}>
          <Search size={16} /><span>{language === 'en' ? 'Search tools' : 'Cari fitur'}</span><kbd>{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <button ref={menuButtonRef} className="menu-toggle" type="button" aria-label={menuOpen ? (language === 'en' ? 'Close navigation' : 'Tutup navigasi') : t('openMenu')} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setDrawerOpen(!menuOpenRef.current)}>
          <span /><span /><span className="menu-toggle-label">{language === 'en' ? 'MENU' : 'MENU'}</span>
        </button>
        <nav ref={navRef} id="primary-navigation" className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'} role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen ? true : undefined} aria-labelledby={menuOpen ? 'mobile-navigation-title' : undefined} onTransitionEnd={event => {
          const nav = navRef.current
          if (event.target === event.currentTarget && event.propertyName === 'transform' && menuOpen && nav && !nav.contains(document.activeElement)) {
            nav.querySelector<HTMLElement>('.nav-drawer-close')?.focus({ preventScroll: true })
          }
        }}>
          <div className="nav-drawer-head">
            <div><span className="nav-drawer-eyebrow">{language === 'en' ? 'DREAMEX ENGINEERING SUITE' : 'SUITE REKAYASA DREAMEX'}</span><strong id="mobile-navigation-title">{language === 'en' ? 'Navigation' : 'Navigasi'}</strong></div>
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
            <p className="nav-search-hint">{language === 'en' ? 'Tip: press / to focus search' : 'Tip: tekan / untuk fokus ke pencarian'}</p>
          </div>
          {recentRoutes.length > 0 && <section className="nav-recent-tools" hidden={Boolean(navQuery.trim())} aria-labelledby="nav-recent-tools-title">
            <div className="nav-recent-heading"><span id="nav-recent-tools-title">{language === 'en' ? 'RECENTLY OPENED' : 'BARU DIBUKA'}</span><div className="nav-recent-heading-actions"><span className="nav-recent-count">{recentRoutes.length}</span><button type="button" className="nav-recent-clear" aria-label={language === 'en' ? 'Clear recent tools' : 'Hapus riwayat tools'} onClick={() => { setRecentRoutes([]); try { window.localStorage.removeItem(RECENT_NAV_STORAGE_KEY) } catch { /* Core navigation must work when storage is unavailable. */ } }}>{language === 'en' ? 'Clear' : 'Hapus'}</button></div></div>
            <div className="nav-recent-list">
              {recentRoutes.map(path => {
                const destination = NAV_DESTINATIONS[path]
                if (!destination) return null
                const label = language === 'en' ? destination.en : destination.id
                return <Link to={path} className="nav-recent-link" key={path} aria-label={language === 'en' ? `Open recent tool ${label}` : `Buka tool terbaru ${label}`} onClick={() => { setNavQuery(''); closeDrawer() }}>
                  <span className="nav-recent-icon"><Clock3 size={14}/></span>
                  <span className="nav-recent-copy"><b>{label}</b><small>{language === 'en' ? destination.descriptionEn : destination.descriptionId}</small></span>
                  <ArrowRight size={14} className="nav-recent-arrow" aria-hidden="true"/>
                </Link>
              })}
            </div>
          </section>}
          <NavLink to="/" end onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><HomeIcon size={16}/></span><span><b>{language === 'en' ? 'Journal' : 'Jurnal'}</b><small>{language === 'en' ? 'AI OS overview & research' : 'Ikhtisar AI OS & riset'}</small></span></NavLink>
          <details
            className={NAV_DESTINATIONS[location.pathname] ? 'nav-platform nav-platform-current' : 'nav-platform'}
            onToggle={event => {
              if (!event.currentTarget.open) {
                setActiveMegaPillar('all')
                setDesktopMegaQuery('')
              }
            }}
          >
            <summary><span className="nav-link-icon"><Layers3 size={16}/></span><span><b>{language === 'en' ? 'Engineering platform' : 'Platform rekayasa'}</b><small>{language === 'en' ? '25 AI suites for Dev, QA, BA & PM' : '25 suite AI untuk Dev, QA, BA & PM'}</small></span><ChevronDown size={15} className="nav-chevron" /></summary>
            <div
              className="nav-mega-panel"
              ref={el => {
                if (!el || menuOpen) return
                const q = desktopMegaQuery.trim().toLocaleLowerCase()
                const groupEls = Array.from(el.querySelectorAll<HTMLElement>('.nav-mega-group'))
                groupEls.forEach(group => {
                  const groupLinks = Array.from(group.querySelectorAll<HTMLAnchorElement>('a[href]'))
                  groupLinks.forEach(a => {
                    a.hidden = Boolean(q) && !a.textContent?.toLocaleLowerCase().includes(q)
                  })
                  group.hidden = Boolean(q) && !groupLinks.some(a => !a.hidden)
                })
              }}
            >
              <div className="nav-mega-desktop-bar" hidden={Boolean(navQuery.trim())}>
                <label className="nav-mega-desktop-search">
                  <Search size={14} aria-hidden="true" />
                  <input
                    type="text"
                    value={desktopMegaQuery}
                    onChange={e => setDesktopMegaQuery(e.target.value)}
                    placeholder={language === 'en' ? 'Instant filter 25 suites (e.g. Jira, Playwright, SBOM)…' : 'Filter cepat 25 suite (mis. Jira, Playwright, SBOM)…'}
                    aria-label={language === 'en' ? 'Filter platform suites' : 'Filter suite platform'}
                  />
                  {desktopMegaQuery && (
                    <button type="button" onClick={() => setDesktopMegaQuery('')} aria-label="Clear filter">
                      ×
                    </button>
                  )}
                </label>
                <div className="nav-mega-featured-strip">
                  <Link to="/jira" onClick={() => document.querySelector('.nav-platform')?.removeAttribute('open')}>
                    ⚡ {language === 'en' ? 'Jira Cloud v9 (14 Modules)' : 'Jira Cloud v9 (14 Modul)'}
                  </Link>
                  <Link to="/prototype" onClick={() => document.querySelector('.nav-platform')?.removeAttribute('open')}>
                    🤖 {language === 'en' ? '5-Agent Studio' : 'Studio 5-Agen'}
                  </Link>
                  <Link to="/grader" onClick={() => document.querySelector('.nav-platform')?.removeAttribute('open')}>
                    🛡️ {language === 'en' ? 'URL Grader' : 'Audit URL'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      document.querySelector('.nav-platform')?.removeAttribute('open')
                      window.dispatchEvent(new CustomEvent('dreamex-open-guided-tour'))
                    }}
                  >
                    🎬 {language === 'en' ? '60s Tour' : 'Tur 60d'}
                  </button>
                </div>
              </div>
              <div className="nav-mega-intro" hidden={Boolean(navQuery.trim() || desktopMegaQuery.trim())}>
                <picture>
                  <source srcSet="/images/spotlight-ai-os.webp" type="image/webp" />
                  <img className="nav-mega-spotlight-art" src="/images/spotlight-ai-os.jpg" alt="" aria-hidden="true" width={360} height={200} />
                </picture>
                <span className="nav-mega-kicker">{language === 'en' ? 'AUTONOMOUS AI WORKSPACE · v9.0' : 'RUANG KERJA AI OTONOM · v9.0'}</span>
                <strong>{language === 'en' ? 'From live prototype to autonomous release.' : 'Dari prototipe hidup hingga rilis otonom.'}</strong>
                <p>{language === 'en' ? 'Unify 5-agent UI prototyping, full Jira Agile & Sprint boards, AI/Security URL grading, USL architecture, and self-healing QA.' : 'Satukan prototipe UI 5-agen, board Jira Agile & Sprint lengkap, audit URL AI/Keamanan, arsitektur USL, dan QA self-healing.'}</p>
                <div className="nav-mega-badges" aria-hidden="true"><span>25 Suites</span><span>MCP + BYOK</span><span>Zero-Trust</span></div>
                <div className="nav-mega-intro-stats" aria-hidden="true">
                  <div><b>01–05</b>{' '}<span>{language === 'en' ? 'Agent stages' : 'Tahap agen'}</span></div>
                  <div><b>100%</b>{' '}<span>{language === 'en' ? 'Browser-first' : 'Berbasis browser'}</span></div>
                </div>
                <Link to="/workspace" onClick={() => setDrawerOpen(false)}>{language === 'en' ? 'Open workspace' : 'Buka workspace'} <ArrowRight size={14}/></Link>
                <span className="nav-mega-orbit" aria-hidden="true"><span /><span /><span /></span>
              </div>
              <div className="nav-mega-pillars" hidden={Boolean(navQuery.trim())} role="group" aria-label={language === 'en' ? 'Filter platform pillar' : 'Filter pilar platform'}>
                {([
                  { id: 'all', en: 'All Suites (25)', idLabel: 'Semua Suite (25)' },
                  { id: 'plan', en: 'Control & Ops (10)', idLabel: 'Kendali & Ops (10)' },
                  { id: 'build', en: 'Build & QA (9)', idLabel: 'Bangun & QA (9)' },
                  { id: 'secure', en: 'Security & Learn (6)', idLabel: 'Keamanan & Edukasi (6)' },
                ] as const).map(pillar => (
                  <button
                    key={pillar.id}
                    type="button"
                    className={activeMegaPillar === pillar.id ? 'nav-mega-pillar-tab is-active' : 'nav-mega-pillar-tab'}
                    aria-pressed={activeMegaPillar === pillar.id}
                    onClick={() => setActiveMegaPillar(pillar.id)}
                  >
                    {language === 'en' ? pillar.en : pillar.idLabel}
                  </button>
                ))}
              </div>
              <div className={activeMegaPillar !== 'all' && activeMegaPillar !== 'plan' && !navQuery.trim() ? 'nav-mega-group is-pillar-filtered' : 'nav-mega-group'} data-pillar="plan">
                <span className="nav-group-label">{language === 'en' ? 'PLAN & OPERATE' : 'RENCANAKAN & KELOLA'}</span>
                <NavLink to="/jira" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ClipboardList size={15}/></span><span><b>{language === 'en' ? 'Jira Agile & Sprint OS' : 'Board Jira Agile & Sprint'}</b><small>{language === 'en' ? 'Kanban, backlog, Gantt, JQL & burndown' : 'Kanban, backlog, Gantt, JQL & burndown'}</small></span><i className="nav-item-tag" aria-hidden="true">JIRA</i></NavLink>
                <NavLink to="/prototype" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Sparkles size={15}/></span><span><b>{language === 'en' ? 'AI Prototype Studio' : 'Studio Prototipe AI'}</b><small>{language === 'en' ? '5-agent DAG, live UI sandbox & token ROI' : 'DAG 5-agen, sandbox UI hidup & token ROI'}</small></span><i className="nav-item-tag" aria-hidden="true">v6</i></NavLink>
                <NavLink to="/control-plane" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Activity size={15}/></span><span><b>Control Plane</b><small>{language === 'en' ? 'Unified release & governance plane' : 'Bidang kendali rilis & tata kelola'}</small></span></NavLink>
                <NavLink to="/team-workspace" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Layers3 size={15}/></span><span><b>{language === 'en' ? 'Shared Team Workspace' : 'Workspace Tim Bersama'}</b><small>{language === 'en' ? 'Revision-controlled team snapshots' : 'Snapshot tim dengan kontrol revisi'}</small></span></NavLink>
                <NavLink to="/engineering-intelligence" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Activity size={15}/></span><span><b>Engineering Intelligence</b><small>{language === 'en' ? 'Service catalog & schema diff' : 'Katalog layanan & diff skema API'}</small></span></NavLink>
                <NavLink to="/command-center" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ClipboardList size={15}/></span><span><b>Command Center</b><small>{language === 'en' ? 'Live incidents, ADRs & gates' : 'Insiden aktif, ADR & gate rilis'}</small></span></NavLink>
                <NavLink to="/roadmap" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ArrowDownRight size={15}/></span><span><b>{language === 'en' ? 'Product Roadmap' : 'Roadmap Produk'}</b><small>{language === 'en' ? 'STRIDE threats & delivery readiness' : 'Ancaman STRIDE & kesiapan rilis'}</small></span></NavLink>
                <NavLink to="/tools" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Zap size={15}/></span><span><b>{language === 'en' ? 'Sovereign IT Suite (v6)' : 'Suite IT Sovereign (v6)'}</b><small>{language === 'en' ? '6-pillar AI Workbench for Dev, QA, BA, PM' : 'Workbench AI 6-pilar Dev, QA, BA, PM'}</small></span><i className="nav-item-tag" aria-hidden="true">AI</i></NavLink>
                <NavLink to="/ba-hub" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ClipboardList size={15}/></span><span><b>{language === 'en' ? 'BA & Gherkin Studio' : 'Studio BA & Gherkin'}</b><small>{language === 'en' ? 'Executable specs & RTM matrices' : 'Spesifikasi BDD & matriks RTM'}</small></span></NavLink>
                <NavLink to="/pm-jira-hub" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Gauge size={15}/></span><span><b>{language === 'en' ? 'PM & Jira Automation' : 'Otomasi PM & Jira'}</b><small>{language === 'en' ? 'Jira ADF payloads, JQL & Monte Carlo' : 'Jira API v3 ADF, JQL & Monte Carlo'}</small></span></NavLink>
              </div>
              <div className={activeMegaPillar !== 'all' && activeMegaPillar !== 'build' && !navQuery.trim() ? 'nav-mega-group is-pillar-filtered' : 'nav-mega-group'} data-pillar="build">
                <span className="nav-group-label">{language === 'en' ? 'BUILD & VERIFY' : 'BANGUN & VALIDASI'}</span>
                <NavLink to="/lab" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Terminal size={15}/></span><span><b>Engineering Lab</b><small>{language === 'en' ? 'QA matrices & API verification' : 'Matriks QA & verifikasi API'}</small></span></NavLink>
                <NavLink to="/quality-intelligence" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ShieldCheck size={15}/></span><span><b>Quality Intelligence</b><small>{language === 'en' ? 'Flake clustering & JUnit analytics' : 'Deteksi flaky & analitik JUnit'}</small></span><i className="nav-item-tag" aria-hidden="true">QA</i></NavLink>
                <NavLink to="/reliability-center" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Gauge size={15}/></span><span><b>{language === 'en' ? 'Reliability & Incidents' : 'Reliability & Insiden'}</b><small>{language === 'en' ? 'DORA delivery metrics & postmortems' : 'Metrik DORA & postmortem insiden'}</small></span></NavLink>
                <NavLink to="/performance" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Gauge size={15}/></span><span><b>Performance Observatory</b><small>{language === 'en' ? 'Core Web Vitals & bundle budgets' : 'Core Web Vitals & budget aset'}</small></span></NavLink>
                <NavLink to="/knowledge-graph" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Network size={15}/></span><span><b>Knowledge Graph</b><small>{language === 'en' ? 'Interactive architecture topology' : 'Topologi arsitektur interaktif'}</small></span></NavLink>
                <NavLink to="/devtools" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Terminal size={15}/></span><span><b>Developer Utilities</b><small>{language === 'en' ? 'Schema generator, Regex & JWT' : 'Generator Skema, Regex & JWT'}</small></span></NavLink>
                <NavLink to="/api-playground" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Braces size={15}/></span><span><b>API Playground</b><small>{language === 'en' ? 'Inspect REST endpoints locally' : 'Validasi endpoint REST secara lokal'}</small></span></NavLink>
                <NavLink to="/qa-studio" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><CheckCircle2 size={15}/></span><span><b>QA Automation Studio</b><small>{language === 'en' ? 'Playwright specs & test syntheses' : 'Sintesis skrip Playwright & test plan'}</small></span></NavLink>
                <NavLink to="/github-ci" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Github size={15}/></span><span><b>GitHub CI Activity</b><small>{language === 'en' ? 'Live Actions pipeline telemetry' : 'Telemetri langsung GitHub Actions'}</small></span><i className="nav-item-tag" aria-hidden="true">RUNS</i></NavLink>
              </div>
              <div className={activeMegaPillar !== 'all' && activeMegaPillar !== 'secure' && !navQuery.trim() ? 'nav-mega-group is-pillar-filtered' : 'nav-mega-group'} data-pillar="secure">
                <span className="nav-group-label">{language === 'en' ? 'SECURE & LEARN' : 'AMANKAN & PELAJARI'}</span>
                <NavLink to="/grader" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Sparkles size={15}/></span><span><b>{language === 'en' ? 'AI & Security URL Grader' : 'Grader URL AI & Keamanan'}</b><small>{language === 'en' ? 'Audit CSP, /llms.txt & share SVG badges' : 'Audit CSP, /llms.txt & lencana SVG'}</small></span><i className="nav-item-tag" aria-hidden="true">v6</i></NavLink>
                <NavLink to="/security-center" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ShieldCheck size={15}/></span><span><b>{language === 'en' ? 'Security Center' : 'Pusat Keamanan'}</b><small>{language === 'en' ? 'Zero-trust headers & CSP auditing' : 'Audit header zero-trust & CSP'}</small></span><i className="nav-item-tag" aria-hidden="true">SEC</i></NavLink>
                <NavLink to="/supply-chain-intelligence" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Network size={15}/></span><span><b>Supply Chain</b><small>{language === 'en' ? 'CycloneDX/SPDX SBOM intelligence' : 'Intelijen SBOM CycloneDX & SPDX'}</small></span></NavLink>
                <NavLink to="/observatory" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Activity size={15}/></span><span><b>Web Quality Observatory</b><small>{language === 'en' ? 'Accessibility, SEO & DOM signals' : 'Audit aksesibilitas, SEO & DOM'}</small></span></NavLink>
                <NavLink to="/site-audit" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><ShieldCheck size={15}/></span><span><b>{language === 'en' ? 'Page Health Audit' : 'Audit Kesehatan Halaman'}</b><small>{language === 'en' ? 'Offline DOM, SEO & a11y scanner' : 'Pemindai DOM, SEO & aksesibilitas'}</small></span></NavLink>
                <NavLink to="/learn" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><BookOpen size={15}/></span><span><b>{language === 'en' ? 'Learning Hub' : 'Pusat Belajar'}</b><small>{language === 'en' ? 'Interactive engineering roadmaps' : 'Jalur belajar engineering interaktif'}</small></span></NavLink>
              </div>
            </div>
          </details>
          <NavLink to="/reading-list" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Bookmark size={16}/></span><span><b>{language === 'en' ? 'Reading list' : 'Daftar bacaan'}</b><small>{language === 'en' ? 'Your saved articles' : 'Artikel yang disimpan'}</small></span></NavLink>
          <NavLink to="/about" aria-label={language === 'en' ? 'About' : 'Tentang'} onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Sparkles size={16}/></span><span><b>{language === 'en' ? 'About DreamEx' : 'Tentang DreamEx'}</b><small>{language === 'en' ? 'Purpose and project details' : 'Tujuan dan detail proyek'}</small></span></NavLink>
          <a className="nav-github" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer" onClick={() => setDrawerOpen(false)}><span className="nav-link-icon"><Github size={16}/></span><span><b>GitHub</b><small>{language === 'en' ? 'Source code & releases' : 'Kode sumber dan rilis'}</small></span></a>
          <InstallAppButton />
          <div className="language-switch nav-desktop-language" role="group" aria-label={t('language')}><ThemeToggle en={language === 'en'} compact /><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>
          <div className="nav-drawer-footer">
            <div className="language-switch" role="group" aria-label={t('language')}><ThemeToggle en={language === 'en'} /><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>
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
          <span className="footer-status"><i /> {en ? 'Spatial AI OS · Client-Sovereign · Zero Lock-In.' : 'OS AI Spasial · Client-Sovereign · Tanpa Lock-In.'}</span>
        </div>
        <div className="footer-column">
          <span className="footer-heading">{en ? 'EXPLORE' : 'JELAJAHI'}</span>
          <Link to="/#topics">{t('footerTopics')} {arrow}</Link>
          <Link to="/#latest">{t('latestArticles')} {arrow}</Link>
          <Link to="/reading-list">{en ? 'Reading list' : 'Daftar bacaan'} {arrow}</Link>
          <Link to="/learn">{en ? 'Learning hub' : 'Pusat belajar'} {arrow}</Link>
          <Link to="/about">{en ? 'About DreamEx' : 'Tentang DreamEx'} {arrow}</Link>
          <Link to="/contact">{en ? 'Book a demo & contact' : 'Pesan demo & kontak'} {arrow}</Link>
          <Link to="/roadmap">{en ? 'Product roadmap' : 'Roadmap produk'} {arrow}</Link>
        </div>
        <div className="footer-column">
          <span className="footer-heading">{en ? 'BUILD & VERIFY' : 'BANGUN & UJI'}</span>
          <Link to="/jira">{en ? 'Jira Agile & Sprint OS' : 'Board Jira Agile & Sprint'} {arrow}</Link>
          <Link to="/prototype">{en ? 'AI Prototype Studio (v6)' : 'Studio Prototipe AI (v6)'} {arrow}</Link>
          <Link to="/grader">{en ? 'AI & Security URL Grader' : 'Grader URL AI & Keamanan'} {arrow}</Link>
          <Link to="/lab">Engineering Lab {arrow}</Link>
          <Link to="/tools">{en ? 'Sovereign IT Suite (6-Pillar)' : 'Suite IT Sovereign (6-Pilar)'} {arrow}</Link>
          <Link to="/ba-hub">{en ? 'BA Gherkin & RTM Studio' : 'Studio BA Gherkin & RTM'} {arrow}</Link>
          <Link to="/pm-jira-hub">{en ? 'PM Monte Carlo & Jira Hub' : 'Hub PM Monte Carlo & Jira'} {arrow}</Link>
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
          <Link to="/github-ci">{en ? 'GitHub CI Activity' : 'Aktivitas CI GitHub'} {arrow}</Link>
          <Link to="/team-workspace">{en ? 'Shared Team Workspace' : 'Workspace Tim Bersama'} {arrow}</Link>
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


function Home() {
  const { t, language } = useLanguage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Semua')
  const [selectedTag, setSelectedTag] = useState('')
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'shortest' | 'title'>('default')
  const [digestEmail, setDigestEmail] = useState('')
  const [digestStatus, setDigestStatus] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const [showAllTags, setShowAllTags] = useState(false)
  const allTags = useMemo(() => [...new Set(articles.flatMap(item => item.tags))], [])
  const visibleTags = useMemo(
    () => (showAllTags ? allTags : [...new Set([...allTags.slice(0, 9), ...(selectedTag ? [selectedTag] : [])])]),
    [allTags, showAllTags, selectedTag],
  )


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
      // The navigation drawer owns "/" while open; do not steal focus back to article search.
      if (event.defaultPrevented) return
      const target = event.target
      const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
      if (event.key === '/' && !isEditing) {
        event.preventDefault()
        searchInput.current?.focus()
      }
      if (event.key === 'Escape' && target instanceof HTMLInputElement && target === searchInput.current) searchInput.current?.blur()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
  const filtered = useMemo(() => {
    const matches = articles.filter(article => {
      const matchesCategory = category === 'Semua' || article.category === category
      const matchesTag = !selectedTag || article.tags.includes(selectedTag)
      const translated = language === 'en' ? articleTranslations[article.slug] : undefined
      const haystack = `${translated?.title ?? article.title} ${translated?.excerpt ?? article.excerpt} ${article.category} ${article.tags.join(' ')} ${article.body.join(' ')}`.toLowerCase()
      return matchesCategory && matchesTag && haystack.includes(query.toLowerCase().trim())
    })
    if (sortBy === 'newest') return [...matches].sort((a, b) => b.date.localeCompare(a.date))
    if (sortBy === 'oldest') return [...matches].sort((a, b) => a.date.localeCompare(b.date))
    if (sortBy === 'shortest') return [...matches].sort((a, b) => Number.parseInt(a.readTime, 10) - Number.parseInt(b.readTime, 10))
    if (sortBy === 'title') {
      return [...matches].sort((a, b) => {
        const leftTitle = language === 'en' ? (articleTranslations[a.slug]?.title ?? a.title) : a.title
        const rightTitle = language === 'en' ? (articleTranslations[b.slug]?.title ?? b.title) : b.title
        return leftTitle.localeCompare(rightTitle)
      })
    }
    return matches
  }, [category, selectedTag, query, sortBy, language])
  const featured = articles[0]
  const featuredTranslation = language === 'en' ? articleTranslations[featured.slug] : undefined
  const featuredCover = getArticleCover(featured.slug, language)
  const [digestBusy, setDigestBusy] = useState(false)
  const submitDigest = (event: React.FormEvent) => {
    event.preventDefault()
    const clean = digestEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setDigestStatus(language === 'en' ? 'Enter a valid engineering email address.' : 'Masukkan alamat email engineering yang valid.')
      return
    }
    try {
      window.localStorage.setItem('dreamex-digest-subscriber-v1', JSON.stringify({ email: clean, savedAt: new Date().toISOString() }))
    } catch { /* Safe fallback when storage is disabled */ }
    setDigestEmail('')
    setDigestBusy(true)
    void (async () => {
      try {
        const res = await fetch('/api/radar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: clean, locale: language }),
        })
        const data = (await res.json().catch(() => ({}))) as { mode?: string; ok?: boolean }
        if (res.ok && data.ok) {
          setDigestStatus(
            data.mode === 'persisted'
              ? (language === 'en' ? `Subscribed ${clean} via Edge Radar API.` : `${clean} terdaftar di Edge Radar API.`)
              : (language === 'en' ? `Validated ${clean} on Radar API & saved local alert. Follow live updates via /rss.` : `${clean} tervalidasi di Radar API & tersimpan lokal. Ikuti rilis via /rss.`),
          )
        } else {
          setDigestStatus(language === 'en' ? `Saved local radar alert for ${clean}. Follow live updates via /rss.` : `Preferensi radar dicatat lokal untuk ${clean}. Ikuti rilis langsung via /rss.`)
        }
      } catch {
        setDigestStatus(language === 'en' ? `Saved local radar alert for ${clean}. Follow live updates via /rss.` : `Preferensi radar dicatat lokal untuk ${clean}. Ikuti rilis langsung via /rss.`)
      } finally {
        setDigestBusy(false)
      }
    })()
  }

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

  return <main id="main-content" className="home-page">
    <section className="hero"><div className="hero-gridlines" /><picture><source srcSet="/images/hero-neural-core.webp" type="image/webp" /><img className="hero-core-backdrop" src="/images/hero-neural-core.jpg" alt="" aria-hidden="true" width={1408} height={768} /></picture><HeroNeuralCanvas /><div className="container hero-grid">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {t('heroEyebrow')}</div>
        <h1>{t('heroLine1')}<br /><span>{t('heroLine2')}</span><br />{t('heroLine3')}</h1>
        <p className="hero-description">{t('heroDescription')}</p>
        <div className="hero-actions"><Link className="button button-primary" to="/tools"><Sparkles size={17} /> {language === 'en' ? 'Launch AI Workbench' : 'Buka Workbench AI'}</Link><Link className="button button-ghost hero-proto-btn" to="/prototype"><Layers3 size={17} /> {language === 'en' ? 'Interactive AI Prototype' : 'Prototipe AI Interaktif'}</Link><button type="button" className="button button-ghost" data-testid="open-guided-tour" onClick={() => window.dispatchEvent(new CustomEvent('dreamex-open-guided-tour'))}><Clock3 size={17} /> {language === 'en' ? '60s Product Tour' : 'Tur Produk 60d'}</button><a className="button button-ghost hero-github-btn" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={17} /> {t('sourceCode')}</a></div>
        <div className="hero-stats"><div><strong>25<i>+</i></strong><span>{t('engineeringNotes')}</span></div><div><strong>04</strong><span>{t('coreDisciplines')}</span></div><div><strong>0.04<i>ms</i></strong><span>{t('ideasExplore')}</span></div></div>
      </div>
      <div className="hero-visual"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><HeroAiCockpit /><div className="hero-bento-meta"><div className="hero-chips-rack"><div className="floating-chip chip-top"><ShieldCheck size={16} /> {t('visualChipQuality')}</div><div className="floating-chip chip-bottom"><Sparkles size={16} /> {t('visualChipCuriosity')}</div></div><div className="hero-signal-card" aria-hidden="true">
        <div className="hero-signal-head"><span>{language === 'en' ? 'ENGINEERING LOOP' : 'SIKLUS ENGINEERING'}</span><span>03</span></div>
        <strong>{language === 'en' ? 'From idea to release' : 'Dari ide hingga rilis'}</strong>
        <div className="hero-signal-steps">
          <span><i>01</i>{language === 'en' ? 'Plan' : 'Rencana'}</span>
          <span><i>02</i>{language === 'en' ? 'Build' : 'Bangun'}</span>
          <span><i>03</i>{language === 'en' ? 'Verify' : 'Validasi'}</span>
        </div>
        <div className="hero-signal-track"><span /></div>
      </div></div><div className="visual-caption"><span>{t('visualCaption')}</span><span>{t('visualIterate')} <ArrowDownRight size={13} /></span></div></div>
    </div></section>
    <section className="trust-strip"><div className="container trust-inner"><span><Zap size={15} /> {t('trustKnowledge')}</span><span><ShieldCheck size={15} /> {t('trustQuality')}</span><span><Braces size={15} /> {t('trustEngineering')}</span><span><Sparkles size={15} /> {t('trustAI')}</span></div></section>
    <section className="role-funnel-strip" data-testid="role-guided-funnel" aria-label={language === 'en' ? 'Start by engineering role' : 'Mulai sesuai peran engineering'}>
      <div className="container role-funnel-inner">
        <span className="role-funnel-label">{language === 'en' ? 'START BY ROLE:' : 'MULAI SESUAI PERAN:'}</span>
        <div className="role-funnel-pills">
          <Link className="role-funnel-pill" to="/prototype"><b>01</b> {language === 'en' ? 'CTO & Architect · 5-Agent Prototype' : 'CTO & Arsitek · Prototipe 5-Agen'}</Link>
          <Link className="role-funnel-pill" to="/grader"><b>02</b> {language === 'en' ? 'SecOps · AI & CSP URL Grader' : 'SecOps · Audit URL AI & CSP'}</Link>
          <Link className="role-funnel-pill" to="/qa-studio"><b>03</b> {language === 'en' ? 'QA / SDET · Self-Healing Playwright' : 'QA / SDET · Playwright Auto-Heal'}</Link>
          <Link className="role-funnel-pill" to="/ba-hub"><b>04</b> {language === 'en' ? 'Business Analyst · Gherkin & RTM' : 'Business Analyst · Gherkin & RTM'}</Link>
          <Link className="role-funnel-pill" to="/jira"><b>05</b> {language === 'en' ? 'PM & Scrum · Jira Agile & Sprint OS' : 'PM & Scrum · Board Jira & Sprint OS'}</Link>
          <Link className="role-funnel-pill" to="/supply-chain-intelligence"><b>06</b> {language === 'en' ? 'DevSecOps · SBOM & Supply Chain' : 'DevSecOps · SBOM & Rantai Pasok'}</Link>
        </div>
      </div>
    </section>
    <Suspense fallback={null}><HomePrototypeStage /></Suspense>
    <Suspense fallback={null}><HomeJiraShowcase /></Suspense>
    <Suspense fallback={null}><NeuralAiStudio /></Suspense>
    <EngineeringLaunchpad />
    <section className="topics-section" id="topics"><div className="container"><div className="topics-heading"><div><span className="section-kicker">{t('topicsEyebrow')}</span><h2>{t('topicsHeading')} <span>{t('topicsHeadingAccent')}</span></h2></div><p>{t('topicsDescription')}</p></div><div className="topics-grid">
      <a className="topic-card" href="#latest" onClick={() => setCategory('Software Engineering')}><span className="topic-holo-stage" aria-hidden="true"><picture><source srcSet="/images/cover-software-arch.webp" type="image/webp" /><img className="topic-holo-img" src="/images/cover-software-arch.jpg" alt="" loading="lazy" decoding="async" width={640} height={360} /></picture><HoloMotionFx variant="arch" /></span><span className="topic-number">01</span><span className="topic-icon purple"><Braces /></span><h3>{t('softwareTopic')}</h3><p>{t('softwareDescription')}</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
      <a className="topic-card" href="#latest" onClick={() => setCategory('QA Automation')}><span className="topic-holo-stage" aria-hidden="true"><picture><source srcSet="/images/cover-qa-automation.webp" type="image/webp" /><img className="topic-holo-img" src="/images/cover-qa-automation.jpg" alt="" loading="lazy" decoding="async" width={640} height={360} /></picture><HoloMotionFx variant="qa" /></span><span className="topic-number">02</span><span className="topic-icon green"><ShieldCheck /></span><h3>{t('qaTopic')}</h3><p>{t('qaDescription')}</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
      <a className="topic-card" href="#latest" onClick={() => setCategory('AI & Technology')}><span className="topic-holo-stage" aria-hidden="true"><picture><source srcSet="/images/cover-ai-eval.webp" type="image/webp" /><img className="topic-holo-img" src="/images/cover-ai-eval.jpg" alt="" loading="lazy" decoding="async" width={640} height={360} /></picture><HoloMotionFx variant="neural" /></span><span className="topic-number">03</span><span className="topic-icon blue"><Sparkles /></span><h3>{t('aiTopic')}</h3><p>{t('aiDescription')}</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
    </div></div></section>
    <section className="featured-section"><div className="container featured-wrap"><div className="featured-label"><span className="section-kicker">{t('featuredHeading')}</span><span className="featured-line" /></div><div className="featured-card"><div className="featured-art"><picture><source srcSet={featuredCover.webpSrc} type="image/webp" /><img className="featured-cover-img" src={featuredCover.src} alt={featuredCover.alt} width={960} height={540} loading="lazy" /></picture><HoloMotionFx variant="qa" /><div className="art-grid" /><div className="art-symbol"><Braces size={72} strokeWidth={1.1} /></div><span className="art-index">DX / 001</span><span className="art-caption">ENGINEERING<br />FOR WHAT'S NEXT</span></div><div className="featured-copy"><span className="category-pill">{categoryLabel(featured.category, language)}</span><p className="featured-overline">{t('featuredInsight')} · {(language === 'en' ? featured.readTime.replace('menit', 'min read') : `${featured.readTime} baca`).toUpperCase()}</p><h2>{featuredTranslation?.title ?? featured.title}</h2><p>{featuredTranslation?.excerpt ?? featured.excerpt}</p><Link className="read-link" to={`/blog/${featured.slug}`}>{t('readFeatured')} <ArrowRight size={16} /></Link></div></div></div></section>
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

      <div className="section-heading"><div><span className="section-kicker">{t('articlesEyebrow')}</span><h2>{t('articlesHeading')} <span>{t('articlesHeadingAccent')}</span></h2><p>{t('latestDescription')}</p></div><div className="discovery-toolbar"><label className="search-box"><Search size={18} /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchLabel')} /><kbd>/</kbd></label><label className="article-sort-control"><span>{language === 'en' ? 'Sort' : 'Urutkan'}</span><select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} aria-label={language === 'en' ? 'Sort articles' : 'Urutkan artikel'}><option value="default">{language === 'en' ? 'Featured order' : 'Urutan utama'}</option><option value="newest">{language === 'en' ? 'Newest first' : 'Terbaru'}</option><option value="oldest">{language === 'en' ? 'Oldest first' : 'Terlama'}</option><option value="shortest">{language === 'en' ? 'Shortest read' : 'Waktu baca tercepat'}</option><option value="title">{language === 'en' ? 'Title A–Z' : 'Judul A–Z'}</option></select></label></div></div>
      <div className="filter-row" aria-label={t('topics')}>{categories.map(item => <button key={item} className={category === item ? 'filter active' : 'filter'} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item, language)}</button>)}</div>
      <div className="tag-filter-row" role="group" aria-label={language === 'en' ? 'Filter by tag' : 'Filter berdasarkan tag'}>{visibleTags.map(tag => <button key={tag} type="button" className={selectedTag === tag ? 'tag-filter-pill active' : 'tag-filter-pill'} aria-pressed={selectedTag === tag} onClick={() => setSelectedTag(current => current === tag ? '' : tag)}>#{tag.replaceAll(' ', '')}</button>)}{allTags.length > 9 && <button type="button" className="tag-filter-pill" aria-expanded={showAllTags} onClick={() => setShowAllTags(current => !current)}>{showAllTags ? (language === 'en' ? 'Show less' : 'Ringkas') : (language === 'en' ? `+${allTags.length - visibleTags.length} more` : `+${allTags.length - visibleTags.length} lainnya`)}</button>}</div>
      <div className="results-meta"><span>{filtered.length} {filtered.length === 1 && language === 'en' ? 'article found' : t('found')}{selectedTag ? ` · #${selectedTag.replaceAll(' ', '')}` : ''}</span>{(query || selectedTag) && <button onClick={() => { setQuery(''); setSelectedTag('') }}>{t('clearSearch')} <span>×</span></button>}</div>
      {filtered.length ? <div className="article-grid">{filtered.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} activeTag={selectedTag} onSelectTag={setSelectedTag} />)}</div> : <div className="empty-state"><Search size={22} /><strong>{t('noResults')}</strong><span>{t('tryOther')}</span></div>}
    </div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="section-kicker">{t('buildInPublic')}</span><h2>{language === 'en' ? <>Ship with clarity.<br /><span>Iterate with AI precision.</span></> : <>Rilis penuh kejelasan.<br /><span>Beriterasi cepat dengan AI.</span></>}</h2><p>{t('buildDescription')}</p><form className="newsletter-form" onSubmit={submitDigest}><input type="email" value={digestEmail} onChange={e => setDigestEmail(e.target.value)} placeholder={language === 'en' ? 'you@company.dev' : 'anda@tim.dev'} aria-label={language === 'en' ? 'Email for engineering radar updates' : 'Email untuk pembaruan radar engineering'} /><button type="submit" className="button button-primary" disabled={digestBusy}>{digestBusy ? (language === 'en' ? 'Saving…' : 'Menyimpan…') : (language === 'en' ? 'Save Radar' : 'Simpan Radar')} <ArrowRight size={15} /></button><Link className="button button-ghost" to="/rss"><Rss size={15} /> RSS</Link></form>{digestStatus && <p className="newsletter-status" role="status">{digestStatus}</p>}</div><a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={16} /> {t('exploreCode')} <ArrowRight size={17} /></a></div></section>
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


function WebQualityObservatoryPage() {
  const { language } = useLanguage()
  return (
    <Suspense fallback={<div className="container route-loading" role="status">{language === 'en' ? 'Loading Web Quality Observatory…' : 'Memuat Observatory Kualitas Web…'}</div>}>
      <LazyWebQualityObservatory />
    </Suspense>
  )
}

function EngineeringLabPage() {
  const { language } = useLanguage()
  return (
    <Suspense fallback={<div className="container route-loading" role="status">{language === 'en' ? 'Loading Engineering Lab…' : 'Memuat Lab Engineering…'}</div>}>
      <LazyEngineeringLab />
    </Suspense>
  )
}


function DeveloperUtilitiesPage() {
  const { language } = useLanguage()
  return (
    <Suspense fallback={<div className="container route-loading" role="status">{language === 'en' ? 'Loading Developer Utilities…' : 'Memuat Utilitas Developer…'}</div>}>
      <LazyDeveloperUtilities />
    </Suspense>
  )
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
  return <ArticleReaderView />
}


function CommandPalette() {
  const { language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
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
    { id: 'guided-tour', label: isEnglish ? 'Interactive 60-Second Executive Product Tour' : 'Tur Produk Interaktif 60 Detik', detail: isEnglish ? 'Guided walkthrough across 5-agent prototyping, URL grader, USL & MCP' : 'Panduan interaktif prototipe 5-agen, audit URL, USL & MCP', icon: Clock3, run: () => window.dispatchEvent(new CustomEvent('dreamex-open-guided-tour')) },
    { id: 'prototype', label: isEnglish ? 'Autonomous AI Prototype & Multi-Agent Studio' : 'Studio Prototipe AI Otonom & Multi-Agen', detail: isEnglish ? '5-agent DAG orchestrator, live responsive UI sandbox & .zip repo export' : 'Orkestrator DAG 5-agen, sandbox UI hidup & ekspor proyek .zip', icon: Sparkles, run: () => navigate('/prototype') },
    { id: 'grader', label: isEnglish ? 'AI Readiness, Security & Architecture URL Grader' : 'Grader Kesiapan AI, Keamanan & Arsitektur URL', detail: isEnglish ? 'Scan domains for CSP, HSTS, /llms.txt & generate live SVG badges' : 'Audit domain untuk CSP, HSTS, /llms.txt & lencana skor SVG', icon: ShieldCheck, run: () => navigate('/grader') },
    { id: 'tools', label: isEnglish ? 'Sovereign IT Workbench (6-Pillar Suite)' : 'Workbench IT Sovereign (6-Pilar)', detail: isEnglish ? 'SE, QA/UAT, BA Gherkin/RTM, PM Monte Carlo & Jira API v3' : 'SE, QA/UAT, BA Gherkin/RTM, PM Monte Carlo & Jira API v3', icon: Zap, run: () => navigate('/tools') },
    { id: 'ba-hub', label: isEnglish ? 'BA Requirement, Gherkin & RTM Studio' : 'Studio BA Requirement, Gherkin & RTM', detail: isEnglish ? 'BRD-to-Gherkin compiler & bi-directional RTM gap detector' : 'Kompilator BRD ke Gherkin & detektor celah RTM', icon: ClipboardList, run: () => navigate('/ba-hub') },
    { id: 'jira', label: isEnglish ? 'Jira Agile Board, Backlog & Sprint OS' : 'Board Jira Agile, Backlog & Sprint OS', detail: isEnglish ? 'Kanban drag-drop swimlanes, sprint backlog, Epic Gantt, live JQL & burndown' : 'Kanban swimlane, backlog sprint, roadmap Gantt Epic, JQL & burndown', icon: ClipboardList, run: () => navigate('/jira') },
    { id: 'contact', label: isEnglish ? 'Book Enterprise Demo & Case Studies' : 'Pesan Demo Enterprise & Studi Kasus', detail: isEnglish ? 'Demo request, measurable case studies & public changelog' : 'Permintaan demo, studi kasus terukur & changelog publik', icon: Gauge, run: () => navigate('/contact') },
    { id: 'pm-jira-hub', label: isEnglish ? 'PM Monte Carlo & Jira Neural Hub' : 'Hub PM Monte Carlo & Otomasi Jira', detail: isEnglish ? 'Jira REST API v3 ADF synthesizer, JQL Studio & 10,000-trial Monte Carlo' : 'Generator JSON Jira REST API v3 ADF, Studio JQL & Monte Carlo', icon: Gauge, run: () => navigate('/pm-jira-hub') },
    { id: 'toggle-theme', label: isEnglish ? `Switch to ${theme === 'dark' ? 'Daylight Light' : 'Obsidian Dark'} Theme` : `Ubah ke Tema ${theme === 'dark' ? 'Terang Daylight' : 'Gelap Obsidian'}`, detail: isEnglish ? 'Adaptive theme polarity · Shortcut Alt+T' : 'Polaritas tema adaptif · Pintasan Alt+T', icon: Sparkles, run: () => toggleTheme() },
  ]
  const actionCategory: Record<string, string> = {
    home: 'learn', about: 'learn', topics: 'learn', articles: 'learn', 'reading-list': 'learn', workspace: 'learn', 'knowledge-graph': 'learn', learn: 'learn', 'toggle-theme': 'learn',
    prototype: 'ai', tools: 'ai', 'guided-tour': 'ai',
    jira: 'ba', 'ba-hub': 'ba', 'pm-jira-hub': 'ba', 'command-center': 'ba',
    lab: 'qa', 'qa-studio': 'qa', 'quality-intelligence': 'qa',
    'api-playground': 'api', 'engineering-intelligence': 'api',
    devtools: 'security', 'security-center': 'security', 'supply-chain-intelligence': 'security', grader: 'security',
    observatory: 'reliability', 'control-plane': 'reliability', 'reliability-center': 'reliability', performance: 'reliability',
  }
  const categories = [
    { id: 'all', label: isEnglish ? 'All tools' : 'Semua tools' },
    { id: 'ai', label: 'AI & Proto' },
    { id: 'qa', label: 'QA' },
    { id: 'ba', label: 'BA & PM' },
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
    inputRef.current?.focus()
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
        <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> {isEnglish ? 'Navigate' : 'Navigasi'}</span><span><kbd>↵</kbd> {isEnglish ? 'Open' : 'Buka'}</span><span><kbd>Alt</kbd>+<kbd>T</kbd> {isEnglish ? 'Theme' : 'Tema'}</span><span><kbd>Esc</kbd> {isEnglish ? 'Close' : 'Tutup'}</span></footer>
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
  const { pathname } = useLocation()

  useEffect(() => {
    const selector = '.topics-heading, .topic-card, .featured-card, .section-heading, .newsletter-inner, .article-card, .trust-inner span, .featured-art, .article-header, .article-body > p, .article-note, .article-next, .footer-inner'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const observed = new Set<Element>()
    const pendingNodes = new Set<Element>()
    let observer: IntersectionObserver | null = null
    let mutationObserver: MutationObserver | null = null
    let scheduledFrame = 0
    let discoveryIndex = 0

    const scanCandidate = (element: Element) => {
      if (!observer || observed.has(element) || !element.matches(selector)) return
      observed.add(element)
      element.classList.add('motion-reveal')
      ;(element as HTMLElement).style.setProperty('--reveal-delay', `${Math.min(discoveryIndex % 3, 2) * 90}ms`)
      discoveryIndex += 1
      observer.observe(element)
    }

    const scanSubtree = (root: Element) => {
      scanCandidate(root)
      root.querySelectorAll(selector).forEach(scanCandidate)
    }

    const start = () => {
      if (observer || reduceMotion.matches) return
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer?.unobserve(entry.target)
          }
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' })

      document.querySelectorAll(selector).forEach(scanCandidate)
      mutationObserver = new MutationObserver(records => {
        let hasElementAdditions = false
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node instanceof Element) {
              pendingNodes.add(node)
              hasElementAdditions = true
            }
          })
        })
        if (!hasElementAdditions || scheduledFrame) return
        scheduledFrame = window.requestAnimationFrame(() => {
          scheduledFrame = 0
          pendingNodes.forEach(scanSubtree)
          pendingNodes.clear()
        })
      })
      if (document.body) mutationObserver.observe(document.body, { childList: true, subtree: true })
    }

    const stop = () => {
      observer?.disconnect()
      observer = null
      mutationObserver?.disconnect()
      mutationObserver = null
      if (scheduledFrame) window.cancelAnimationFrame(scheduledFrame)
      scheduledFrame = 0
      pendingNodes.clear()
      observed.forEach(element => {
        element.classList.remove('motion-reveal', 'is-visible')
        ;(element as HTMLElement).style.removeProperty('--reveal-delay')
      })
      observed.clear()
    }

    const syncMotionPreference = () => {
      if (reduceMotion.matches) stop()
      else start()
    }

    syncMotionPreference()
    reduceMotion.addEventListener('change', syncMotionPreference)
    return () => {
      reduceMotion.removeEventListener('change', syncMotionPreference)
      stop()
    }
  }, [pathname])

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
  const progressRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      // Coalesce scroll events into a single frame and update the tiny indicator directly.
      // Avoid scheduling a React render for every wheel/trackpad frame.
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        const atBottom = scrollable > 0 && window.scrollY >= scrollable - 2
        const next = atBottom ? 100 : (scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0)
        fillRef.current?.style.setProperty('transform', `scaleX(${next / 100})`)
        progressRef.current?.setAttribute('aria-valuenow', String(Math.round(next)))
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    ro?.observe(document.documentElement)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [])

  return <div ref={progressRef} className="site-scroll-progress" role="progressbar" aria-label="Page scroll progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span ref={fillRef} style={{ transform: 'scaleX(0)' }} /></div>
}



type RouteSeoCopy = { title: string; description: string }
type LocalizedRouteSeo = { id: RouteSeoCopy; en: RouteSeoCopy }

const ROUTE_SEO: Record<string, LocalizedRouteSeo> = {
  '/': { en: { title: 'DreamEx Tech — Think deeper. Build smarter.', description: 'Practical notes on software engineering, quality engineering, AI, and modern technology.' }, id: { title: 'DreamEx Tech — Think deeper. Build smarter.', description: 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern.' } },
  '/observatory': { en: { title: 'Web Quality Observatory — DreamEx Tech', description: 'Review browser-side web quality signals, responsive behavior, accessibility basics, and metadata with transparent limitations.' }, id: { title: 'Observatorium Kualitas Web — DreamEx Tech', description: 'Tinjau sinyal kualitas web di browser, perilaku responsif, dasar aksesibilitas, dan metadata dengan batasan yang jelas.' } },
  '/site-audit': { en: { title: 'Page Health Audit — DreamEx Tech', description: 'Run a privacy-friendly browser audit for page metadata, accessibility names, headings, internal anchors, duplicate IDs, and responsive overflow.' }, id: { title: 'Audit Kesehatan Halaman — DreamEx Tech', description: 'Jalankan audit browser yang menjaga privasi untuk metadata, nama aksesibel, heading, tautan internal, ID duplikat, dan overflow responsif.' } },
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
  '/github-ci': { en: { title: 'GitHub CI Activity — DreamEx Tech', description: 'Inspect recent public GitHub Actions runs for DreamEx Tech with explicit status, result filters, and verified workflow links.' }, id: { title: 'Aktivitas CI GitHub — DreamEx Tech', description: 'Periksa hasil GitHub Actions publik DreamEx Tech dengan status eksplisit, filter hasil, dan tautan workflow yang terverifikasi.' } },
  '/team-workspace': { en: { title: 'Shared Team Workspace — DreamEx Tech', description: 'Share revision-checked engineering snapshots across trusted collaborators with an optional server-side Redis backend.' }, id: { title: 'Workspace Tim Bersama — DreamEx Tech', description: 'Bagikan snapshot engineering dengan pemeriksaan revisi kepada kolaborator tepercaya melalui backend Redis opsional.' } },
  '/contact': { en: { title: 'Book an Enterprise Demo & Case Studies — DreamEx Tech', description: 'Request a guided Jira Sprint OS demo or architecture review, explore measurable engineering case studies, and read the public release changelog.' }, id: { title: 'Pesan Demo Enterprise & Studi Kasus — DreamEx Tech', description: 'Minta demo Jira Sprint OS atau review arsitektur, pelajari studi kasus engineering terukur, dan baca changelog rilis publik.' } },
  '/about': { en: { title: 'About DreamEx Tech — Engineering, AI & QA', description: 'Learn about DreamEx Tech, a practical publication and browser-first engineering toolkit for software quality and technology.' }, id: { title: 'Tentang DreamEx Tech — Engineering, AI & QA', description: 'Kenali DreamEx Tech, publikasi praktis dan toolkit engineering berbasis browser untuk kualitas software dan teknologi.' } },
  '/rss': { en: { title: 'Latest Articles & RSS — DreamEx Tech', description: 'Browse the latest DreamEx Tech articles and subscribe to the RSS 2.0 feed for engineering, QA, AI, and technology.' }, id: { title: 'Artikel Terbaru & RSS — DreamEx Tech', description: 'Jelajahi artikel terbaru DreamEx Tech dan berlangganan RSS 2.0 untuk engineering, QA, AI, dan teknologi.' } },
  '/tools': { en: { title: 'Sovereign IT, QA, BA, PM & Jira Workbench — DreamEx Tech', description: 'Unified 6-pillar client-sovereign workbench for Software Engineers, QA/UAT, Business Analysts, Project Managers, and Jira Automation.' }, id: { title: 'Workbench Terpadu IT, QA, BA, PM & Jira — DreamEx Tech', description: 'Ruang kerja 6-pilar di browser untuk Software Engineer, QA/UAT, Business Analyst, Project Manager, dan Otomasi Jira.' } },
  '/prototype': { en: { title: 'Autonomous AI Prototype & Multi-Agent Studio — DreamEx Tech', description: 'Orchestrate 5 specialized engineering AI agents, test responsive live UI prototypes with RBAC and failover, and model LLM token economics.' }, id: { title: 'Studio Prototipe AI Otonom & Multi-Agen — DreamEx Tech', description: 'Orkestrasi 5 agen AI rekayasa, uji prototipe UI responsif dengan RBAC dan failover, serta hitung ekonomi token LLM di browser.' } },
  '/grader': { en: { title: 'AI Readiness, Security & Architecture Grader — DreamEx Tech', description: 'Audit any public HTTPS website for Zero-Trust CSP headers, llms.txt AI discovery, JSON-LD, semantic accessibility, and embed live SVG badges.' }, id: { title: 'Grader Kesiapan AI, Keamanan & Arsitektur — DreamEx Tech', description: 'Audit website HTTPS publik untuk header keamanan CSP, manifes llms.txt bagi agen AI, JSON-LD, aksesibilitas, dan lencana skor SVG langsung.' } },
  '/ba-hub': { en: { title: 'BA Requirement, Gherkin & RTM Studio — DreamEx Tech', description: 'Compile business requirements into Agile user stories, Gherkin BDD scenarios, and bi-directional Requirement Traceability Matrices.' }, id: { title: 'Studio BA Requirement, Gherkin & RTM — DreamEx Tech', description: 'Kompilasi kebutuhan bisnis menjadi User Story, skenario BDD Gherkin, dan matriks ketertelusuran RTM dua arah.' } },
  '/pm-jira-hub': { en: { title: 'PM Monte Carlo & Jira Neural Automation Hub — DreamEx Tech', description: 'Synthesize Jira REST API v3 ADF payloads, build visual JQL queries, and run 10,000-trial Monte Carlo sprint forecasts.' }, id: { title: 'Hub PM Monte Carlo & Otomasi Jira — DreamEx Tech', description: 'Hasilkan payload JSON Jira REST API v3 ADF, bangun kueri JQL visual, dan jalankan simulasi rilis Monte Carlo 10.000 iterasi.' } },
  '/jira': { en: { title: 'Jira Agile Board, Backlog & Sprint OS — DreamEx Tech', description: 'Plan sprints, drag issues across WIP-guarded Kanban swimlanes, run live JQL filters, inspect Epic Gantt roadmaps and Burndown charts, and export Jira ADF.' }, id: { title: 'Board Agile Jira, Backlog & Sprint OS — DreamEx Tech', description: 'Rencanakan sprint, geser tiket di Kanban swimlane berbatas WIP, jalankan filter JQL langsung, pantau roadmap Gantt Epic dan Burndown, serta ekspor Jira ADF.' } },
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
    const socialImage = route === '/prototype'
      ? 'https://dreamex.tech/images/og-prototype.jpg'
      : route === '/grader'
        ? 'https://dreamex.tech/images/og-grader.jpg'
        : 'https://dreamex.tech/images/og-default.jpg'
    document.title = page.title
    upsertMeta('description', page.description)
    upsertMeta('og:title', page.title, true)
    upsertMeta('og:description', page.description, true)
    upsertMeta('og:url', canonicalUrl, true)
    upsertMeta('og:type', article ? 'article' : 'website', true)
    upsertMeta('og:image', socialImage, true)
    upsertMeta('twitter:title', page.title)
    upsertMeta('twitter:description', page.description)
    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:image', socialImage)
    const privateUtilityRoute = route === '/reading-list'
    upsertMeta('robots', unknownArticle || privateUtilityRoute ? 'noindex, follow' : 'index, follow')
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
  '/github-ci': { id: 'Aktivitas CI GitHub', en: 'GitHub CI Activity' },
  '/team-workspace': { id: 'Workspace Tim Bersama', en: 'Shared Team Workspace' },
  '/prototype': { id: 'Studio Prototipe AI (5-Agen)', en: 'AI Prototype Studio (5-Agent)' },
  '/grader': { id: 'Grader Kesiapan AI & Keamanan', en: 'AI Readiness & Security Grader' },
  '/tools': { id: 'Workbench IT Sovereign (6-Pilar)', en: 'Sovereign IT Workbench (6-Pillar)' },
  '/ba-hub': { id: 'Studio BA Gherkin & RTM', en: 'BA Gherkin & RTM Studio' },
  '/pm-jira-hub': { id: 'Hub PM Monte Carlo & Jira', en: 'PM Monte Carlo & Jira Hub' },
  '/jira': { id: 'Board Jira Agile & Sprint OS', en: 'Jira Agile Board & Sprint OS' },
  '/contact': { id: 'Demo Enterprise & Kontak', en: 'Enterprise Demo & Contact' },
  '/observatory': { id: 'Web Quality Observatory', en: 'Web Quality Observatory' },
  '/site-audit': { id: 'Audit Kesehatan Halaman', en: 'Page Health Audit' },
  '/devtools': { id: 'Utilitas Developer', en: 'Developer Utilities' },
  '/learn': { id: 'Pusat Belajar', en: 'Learning Hub' },
}

const PINNED_SUITES_KEY = 'dreamex-pinned-suites-v8'
const DEFAULT_PINNED_SUITES = ['/jira', '/prototype', '/grader']

const TOOL_SUBNAV_CLUSTERS = [
  {
    id: 'agile',
    en: '01 Agile & Jira (5)',
    idLabel: '01 Agile & Jira (5)',
    routes: ['/jira', '/pm-jira-hub', '/ba-hub', '/roadmap', '/command-center'],
  },
  {
    id: 'plan',
    en: '02 Plan & Govern (5)',
    idLabel: '02 Rencana & Kendali (5)',
    routes: ['/control-plane', '/engineering-intelligence', '/team-workspace', '/knowledge-graph', '/workspace'],
  },
  {
    id: 'build',
    en: '03 Build & QA (8)',
    idLabel: '03 Bangun & Uji (8)',
    routes: ['/qa-studio', '/quality-intelligence', '/reliability-center', '/performance', '/api-playground', '/github-ci', '/lab', '/devtools'],
  },
  {
    id: 'secure',
    en: '04 SecOps & Audit (6)',
    idLabel: '04 Keamanan & Audit (6)',
    routes: ['/grader', '/security-center', '/supply-chain-intelligence', '/observatory', '/site-audit', '/learn'],
  },
  {
    id: 'workbench',
    en: '05 Agentic AI (2)',
    idLabel: '05 Agen & AI (2)',
    routes: ['/prototype', '/tools'],
  },
] as const

type SubnavClusterId = (typeof TOOL_SUBNAV_CLUSTERS)[number]['id']

function ToolRouteBreadcrumbs() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  const { context: syncedProject, resetContext } = useProjectContextBus()
  const cleanPath = pathname.replace(/\/+$/, '') || '/'
  const label = TOOL_BREADCRUMB_LABELS[cleanPath]
  const detectedCluster: SubnavClusterId =
    TOOL_SUBNAV_CLUSTERS.find(cluster => (cluster.routes as readonly string[]).includes(cleanPath))?.id ?? 'agile'
  const [selectedCluster, setSelectedCluster] = useState<SubnavClusterId>(detectedCluster)
  const [pinnedSuites, setPinnedSuites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PINNED_SUITES
    try {
      const raw = JSON.parse(window.localStorage.getItem(PINNED_SUITES_KEY) || 'null')
      return Array.isArray(raw) && raw.length > 0
        ? raw.filter((p): p is string => typeof p === 'string' && Boolean(NAV_DESTINATIONS[p]))
        : DEFAULT_PINNED_SUITES
    } catch {
      return DEFAULT_PINNED_SUITES
    }
  })

  useEffect(() => {
    setSelectedCluster(detectedCluster)
  }, [detectedCluster])

  const togglePinCurrent = () => {
    if (!NAV_DESTINATIONS[cleanPath]) return
    setPinnedSuites(prev => {
      const next = prev.includes(cleanPath)
        ? prev.filter(p => p !== cleanPath)
        : [cleanPath, ...prev].slice(0, 6)
      try {
        window.localStorage.setItem(PINNED_SUITES_KEY, JSON.stringify(next))
      } catch {
        /* Safe fallback */
      }
      return next
    })
  }

  const activeGroup = TOOL_SUBNAV_CLUSTERS.find(cluster => cluster.id === selectedCluster) ?? TOOL_SUBNAV_CLUSTERS[0]
  const hasClusterRoute = TOOL_SUBNAV_CLUSTERS.some(cluster => (cluster.routes as readonly string[]).includes(cleanPath))

  if (!label && !hasClusterRoute) return null
  const en = language === 'en'
  const homeLabel = en ? 'Home' : 'Beranda'
  const currentLabel = label ? (en ? label.en : label.id) : (NAV_DESTINATIONS[cleanPath]?.[en ? 'en' : 'id'] ?? cleanPath)
  const isPinned = pinnedSuites.includes(cleanPath)

  return <div className="tool-context-shell">
    <div className="tool-context-top">
      <div className="tool-breadcrumb-wrap">
        {label ? (
          <nav className="tool-route-breadcrumbs" aria-label={en ? 'Breadcrumb' : 'Navigasi lokasi'}>
            <ol>
              <li><Link to="/">{homeLabel}</Link></li>
              <li aria-hidden="true" className="tool-route-breadcrumb-separator">/</li>
              <li aria-current="page"><span>{currentLabel}</span></li>
            </ol>
          </nav>
        ) : (
          <span className="tool-context-kicker">{en ? 'ENGINEERING OS MODULE' : 'MODUL OS ENGINEERING'}</span>
        )}
        {NAV_DESTINATIONS[cleanPath] && (
          <button
            type="button"
            className={isPinned ? 'tool-pin-btn is-pinned' : 'tool-pin-btn'}
            aria-pressed={isPinned}
            onClick={togglePinCurrent}
          >
            {isPinned ? (en ? '★ Pinned' : '★ Disematkan') : en ? '☆ Pin Suite' : '☆ Sematkan'}
          </button>
        )}
        <button
          type="button"
          className="tool-pin-btn"
          onClick={() => window.dispatchEvent(new Event('dreamex-open-command-palette'))}
        >
          Ctrl+K
        </button>
      </div>
      <div className="tool-context-clusters" role="group" aria-label={en ? 'Switch OS pillar submenu' : 'Ganti submenu pilar OS'}>
        {TOOL_SUBNAV_CLUSTERS.map(cluster => (
          <button
            key={cluster.id}
            type="button"
            className={selectedCluster === cluster.id ? 'tool-cluster-tab is-active' : 'tool-cluster-tab'}
            aria-pressed={selectedCluster === cluster.id}
            onClick={() => setSelectedCluster(cluster.id)}
          >
            {en ? cluster.en : cluster.idLabel}
          </button>
        ))}
      </div>
    </div>
    <nav className="tool-context-subnav" aria-label={en ? 'Suite pillar quick navigation' : 'Navigasi cepat suite engineering'}>
      {activeGroup.routes.map(routePath => {
        const dest = NAV_DESTINATIONS[routePath]
        if (!dest) return null
        const active = cleanPath === routePath
        return (
          <Link
            key={routePath}
            to={routePath}
            className={active ? 'tool-subnav-pill is-active' : 'tool-subnav-pill'}
            aria-current={active ? 'page' : undefined}
          >
            {en ? dest.en : dest.id}
          </Link>
        )
      })}
    </nav>
    {pinnedSuites.length > 0 && (
      <div className="tool-pinned-strip" aria-label={en ? 'Pinned favorite suites' : 'Suite favorit disematkan'}>
        <span className="tool-pinned-label">★ {en ? 'PINNED:' : 'FAVORIT:'}</span>
        {pinnedSuites.map(routePath => {
          const dest = NAV_DESTINATIONS[routePath]
          if (!dest) return null
          return (
            <Link
              key={routePath}
              to={routePath}
              className={cleanPath === routePath ? 'tool-pinned-chip is-active' : 'tool-pinned-chip'}
            >
              {en ? dest.en : dest.id}
            </Link>
          )
        })}
      </div>
    )}
    {syncedProject && (
      <div className="os-context-bus-bar" data-testid="os-context-pill">
        <span>
          <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          <b>{en ? 'ACTIVE OS BLUEPRINT:' : 'BLUEPRINT OS AKTIF:'}</b> {syncedProject.projectName} · USL {syncedProject.uslCeilingNodes} Nodes · P95 {syncedProject.p95TargetMs}ms
        </span>
        <div className="os-context-bus-actions">
          {cleanPath !== '/prototype' && <Link to={`/prototype?bp=${encodeURIComponent(syncedProject.blueprintId)}`}>{en ? 'Inspect Prototype' : 'Buka Prototipe'}</Link>}
          <button type="button" onClick={resetContext} aria-label={en ? 'Clear synced blueprint' : 'Hapus sinkronisasi blueprint'}>×</button>
        </div>
      </div>
    )}
  </div>
}

export default function App() {
  const { t, language } = useLanguage()
  const en = language === 'en'
  const [tourOpen, setTourOpen] = useState(false)
  const loadingBox = (labelEn: string, labelId: string) => (
    <div className="container route-loading" role="status">{en ? labelEn : labelId}</div>
  )
  const location = useLocation()

  useEffect(() => {
    const openTour = () => setTourOpen(true)
    window.addEventListener('dreamex-open-guided-tour', openTour)
    return () => window.removeEventListener('dreamex-open-guided-tour', openTour)
  }, [])

  useLayoutEffect(() => {
    // The preload is fetched in index.html; attach it before paint on later SPA navigation.
    if (location.pathname !== '/') return
    const selector = 'link[data-dreamex-premium-experience]'
    if (document.head.querySelector(selector)) return
    const stylesheet = document.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href = '/premium-experience.v2.css'
    stylesheet.dataset.dreamexPremiumExperience = 'true'
    document.head.append(stylesheet)
  }, [location.pathname])
  return <><a className="skip-link" href="#main-content" tabIndex={0}>{t('skip')}</a><OfflineNotice /><ScrollProgress /><CommandPalette />{tourOpen && <Suspense fallback={null}><GuidedProductTour onClose={() => setTourOpen(false)} /></Suspense>}<ScrollToTop /><MotionOnScroll /><Header /><ToolRouteBreadcrumbs /><Routes><Route path="/" element={<Home />} /><Route path="/prototype" element={<Suspense fallback={loadingBox('Loading AI Prototype Studio…', 'Memuat Studio Prototipe AI…')}><AiPrototypeStudioPage /></Suspense>} /><Route path="/grader" element={<Suspense fallback={loadingBox('Loading AI & Security URL Grader…', 'Memuat Grader URL AI & Keamanan…')}><AiReadinessGraderPage /></Suspense>} /><Route path="/tools" element={<Suspense fallback={loadingBox('Loading Sovereign IT Workbench…', 'Memuat Workbench IT Sovereign…')}><SovereignWorkbenchPage initialPillar="eng" /></Suspense>} /><Route path="/ba-hub" element={<Suspense fallback={loadingBox('Loading BA Gherkin & RTM Studio…', 'Memuat Studio BA Gherkin & RTM…')}><SovereignWorkbenchPage initialPillar="ba" /></Suspense>} /><Route path="/pm-jira-hub" element={<Suspense fallback={loadingBox('Loading PM & Jira Automation Hub…', 'Memuat Hub PM & Otomasi Jira…')}><SovereignWorkbenchPage initialPillar="jira" /></Suspense>} /><Route path="/jira" element={<Suspense fallback={loadingBox('Loading Jira Agile & Sprint OS…', 'Memuat Board Jira Agile & Sprint…')}><JiraEnterpriseBoardPage /></Suspense>} /><Route path="/github-ci" element={<Suspense fallback={loadingBox('Loading GitHub CI Activity…', 'Memuat Aktivitas CI GitHub…')}><GitHubIntegrationPage /></Suspense>} /><Route path="/team-workspace" element={<Suspense fallback={loadingBox('Loading Shared Team Workspace…', 'Memuat Workspace Tim Bersama…')}><TeamWorkspacePage /></Suspense>} /><Route path="/observatory" element={<WebQualityObservatoryPage />} /><Route path="/site-audit" element={<Suspense fallback={loadingBox('Loading Page Health Audit…', 'Memuat Audit Kesehatan Halaman…')}><SiteAuditPage /></Suspense>} /> <Route path="/devtools" element={<DeveloperUtilitiesPage />} /> <Route path="/workspace" element={<Suspense fallback={loadingBox('Loading Engineering Workspace…', 'Memuat Engineering Workspace…')}><EngineeringWorkspacePage /></Suspense>} /><Route path="/control-plane" element={<Suspense fallback={loadingBox('Loading Engineering Control Plane…', 'Memuat Engineering Control Plane…')}><EngineeringControlPlanePage /></Suspense>} /><Route path="/engineering-intelligence" element={<Suspense fallback={loadingBox('Loading Engineering Intelligence…', 'Memuat Engineering Intelligence…')}><EngineeringIntelligencePage /></Suspense>} /><Route path="/command-center" element={<Suspense fallback={loadingBox('Loading Command Center…', 'Memuat Command Center…')}><EngineeringCommandCenterPage /></Suspense>} /><Route path="/qa-studio" element={<Suspense fallback={loadingBox('Loading QA Automation Studio…', 'Memuat Studio Otomasi QA…')}><QAAutomationStudioPage /></Suspense>} /><Route path="/quality-intelligence" element={<Suspense fallback={loadingBox('Loading Quality Intelligence…', 'Memuat Quality Intelligence…')}><QualityIntelligencePage /></Suspense>} /><Route path="/reliability-center" element={<Suspense fallback={loadingBox('Loading Reliability Center…', 'Memuat Pusat Reliability…')}><ReliabilityCenterPage /></Suspense>} /><Route path="/supply-chain-intelligence" element={<Suspense fallback={loadingBox('Loading Supply Chain Intelligence…', 'Memuat Supply Chain Intelligence…')}><SupplyChainIntelligencePage /></Suspense>} /><Route path="/security-center" element={<Suspense fallback={loadingBox('Loading Security Center…', 'Memuat Pusat Keamanan…')}><SecurityCenterPage /></Suspense>} /><Route path="/api-playground" element={<Suspense fallback={loadingBox('Loading API Playground…', 'Memuat API Playground…')}><ApiPlaygroundPage /></Suspense>} /><Route path="/performance" element={<Suspense fallback={loadingBox('Loading Performance Observatory…', 'Memuat Observatory Performa…')}><PerformanceObservatoryPage /></Suspense>} /><Route path="/knowledge-graph" element={<Suspense fallback={loadingBox('Loading Engineering Knowledge Graph…', 'Memuat Graf Pengetahuan Engineering…')}><EngineeringKnowledgeGraphPage /></Suspense>} /><Route path="/roadmap" element={<Suspense fallback={loadingBox('Loading Product Roadmap…', 'Memuat Roadmap Produk…')}><EngineeringRoadmapPage /></Suspense>} /><Route path="/contact" element={<Suspense fallback={loadingBox('Loading Enterprise Demo…', 'Memuat Demo Enterprise…')}><ContactDemoPage /></Suspense>} /><Route path="/about" element={<AboutPage />} /><Route path="/reading-list" element={<ReadingListPage />} /><Route path="/lab" element={<EngineeringLabPage />} /><Route path="/learn" element={<LearningHubPage />} /><Route path="/rss" element={<RssPage />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main id="main-content" className="container not-found"><h1>{t('pageNotFound')}</h1><p>{t('pageMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>} /></Routes><Footer /><RouteMetadata /></>
}
