import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, BookOpen, Bookmark, BookmarkCheck, Braces, Check, ChevronUp, Command, Copy, Github, Home as HomeIcon, Search, Share2, ShieldCheck, Sparkles, Terminal, X, Zap, Rss } from 'lucide-react'
import { articles } from './articles'
import { articleTranslations } from './articleTranslations'
import { useLanguage } from './i18n'

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
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname])
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/" aria-label="DreamEx Tech beranda"><span className="brand-mark"><Braces size={21} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span><span className="brand-beta">ENGINEERING NOTES</span></Link>
    <button className="menu-toggle" aria-label={menuOpen ? t('closeMenu') : t('openMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /></button>
    <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label={t('blog')}><NavLink to="/">{t('blog')}</NavLink><a href="/#topics">{t('topics')}</a><a href="/#latest">{t('articles')}</a><NavLink to="/reading-list">{language === 'en' ? 'Reading list' : 'Daftar bacaan'}</NavLink><NavLink to="/lab">{language === 'en' ? 'Engineering Lab' : 'Lab Engineering'}</NavLink><NavLink to="/learn">{language === 'en' ? 'Learning Hub' : 'Pusat Belajar'}</NavLink><NavLink to="/about">{language === 'en' ? 'About' : 'Tentang'}</NavLink><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">GitHub <Github size={15} /></a><InstallAppButton /><div className="language-switch" role="group" aria-label={t('language')}><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div></nav>
  </div></header>
}

function Footer() {
  const { t, language } = useLanguage()
  const en = language === 'en'
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
          <Link to="/#topics">{t('footerTopics')} <ArrowRight size={13} /></Link>
          <Link to="/#latest">{t('latestArticles')} <ArrowRight size={13} /></Link>
          <Link to="/reading-list">{en ? 'Reading list' : 'Daftar bacaan'} <ArrowRight size={13} /></Link>
          <Link to="/lab">Engineering Lab <ArrowRight size={13} /></Link>
          <Link to="/learn">{en ? 'Learning hub' : 'Pusat belajar'} <ArrowRight size={13} /></Link>
          <Link to="/about">{en ? 'About DreamEx' : 'Tentang DreamEx'} <ArrowRight size={13} /></Link>
        </div>
        <div className="footer-column">
          <span className="footer-heading">{en ? 'ENGINEERING' : 'ENGINEERING'}</span>
          <a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{en ? 'Open-source repository' : 'Repositori open-source'} <ArrowRight size={13} /></a>
          <a href="https://github.com/uknowdream" target="_blank" rel="noreferrer">{en ? 'GitHub profile' : 'Profil GitHub'} <ArrowRight size={13} /></a>
          <a href="/rss">{en ? 'RSS feed' : 'Feed RSS'} <ArrowRight size={13} /></a>
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

function EngineeringLabPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [activeTool, setActiveTool] = useState<'test-cases' | 'bug-report' | 'json'>('test-cases')
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
  const [copyStatus, setCopyStatus] = useState('')
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
  return <main id="main-content" className="engineering-lab container">
    <header className="lab-header"><span className="section-kicker">{en ? 'PRACTICAL ENGINEERING TOOLKIT' : 'TOOLKIT ENGINEERING PRAKTIS'}</span><h1>{en ? 'Engineering' : 'Engineering'} <span>Lab.</span></h1><p>{en ? 'Small, useful tools for QA workflows, clearer bug reports, and safer data handling. Processing runs locally in your browser.' : 'Perangkat praktis untuk alur kerja QA, laporan bug yang jelas, dan pengolahan data yang aman. Pemrosesan berjalan lokal di browser Anda.'}</p><div className="lab-local-note"><ShieldCheck size={16} /> {en ? 'No account or backend required — your inputs stay in this browser session.' : 'Tanpa akun atau backend — input Anda tetap diproses di browser ini.'}</div></header>
    <div className="lab-tool-tabs" role="tablist" aria-label={en ? 'Engineering tools' : 'Tool engineering'}>
      <button role="tab" aria-selected={activeTool === 'test-cases'} className={activeTool === 'test-cases' ? 'active' : ''} onClick={() => { setActiveTool('test-cases'); setCopyStatus('') }}><ShieldCheck size={16} /> {en ? 'Test Case Builder' : 'Pembuat Test Case'}</button>
      <button role="tab" aria-selected={activeTool === 'bug-report'} className={activeTool === 'bug-report' ? 'active' : ''} onClick={() => { setActiveTool('bug-report'); setCopyStatus('') }}><BookOpen size={16} /> {en ? 'Bug Report' : 'Laporan Bug'}</button>
      <button role="tab" aria-selected={activeTool === 'json'} className={activeTool === 'json' ? 'active' : ''} onClick={() => { setActiveTool('json'); setCopyStatus('') }}><Braces size={16} /> JSON {en ? 'Formatter' : 'Formatter'}</button>
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
      {copyStatus && <p className="lab-copy-status" role="status">{copyStatus}</p>}
    </section>
    <p className="lab-disclaimer">{en ? 'Generated checklists are starting points, not a substitute for risk analysis, product requirements, or human review.' : 'Checklist yang dihasilkan adalah titik awal, bukan pengganti analisis risiko, kebutuhan produk, atau review manusia.'}</p>
  </main>
}

type LearningPath = { id: string; title: string; description: string; level: string; duration: string; slugs: string[] }

function LearningHubPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [tab, setTab] = useState<'paths' | 'glossary'>('paths')
  const [glossaryQuery, setGlossaryQuery] = useState('')
  const paths: LearningPath[] = [
    { id: 'quality-engineering', title: en ? 'Quality Engineering Foundations' : 'Fondasi Quality Engineering', description: en ? 'Build a reliable test strategy, then scale stable browser automation and CI feedback.' : 'Bangun strategi pengujian yang andal, lalu kembangkan otomasi browser dan umpan balik CI yang stabil.', level: en ? 'Beginner → Intermediate' : 'Pemula → Menengah', duration: en ? '3 articles · 22 min' : '3 artikel · 22 menit', slugs: ['qa-automation-foundations', 'playwright-test-architecture', 'evaluating-ai-features'] },
    { id: 'secure-delivery', title: en ? 'Secure Software Delivery' : 'Pengiriman Software yang Aman', description: en ? 'Understand maintainable contracts, pipeline permissions, and practical DevSecOps controls.' : 'Pahami kontrak kode yang mudah dirawat, izin pipeline, dan kontrol DevSecOps praktis.', level: en ? 'Beginner → Intermediate' : 'Pemula → Menengah', duration: en ? '2 articles · 12 min' : '2 artikel · 12 menit', slugs: ['typescript-for-maintainable-projects', 'secure-ci-cd-basics'] },
    { id: 'production-ai', title: en ? 'Engineering Reliable AI' : 'Membangun AI yang Andal', description: en ? 'Learn evaluation design, regression testing, observability, and safe rollout thinking.' : 'Pelajari desain evaluasi, regression testing, observability, dan strategi rilis yang aman.', level: en ? 'Intermediate' : 'Menengah', duration: en ? '2 articles · 15 min' : '2 artikel · 15 menit', slugs: ['practical-ai-engineering', 'evaluating-ai-features'] },
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
    {tab === 'paths' ? <section className="learning-path-grid" aria-label={en ? 'Curated learning paths' : 'Jalur belajar terkurasi'}>{paths.map((path, index) => <article className="learning-path-card" key={path.id}><div className="learning-path-top"><span>PATH / 0{index + 1}</span><span className="learning-level">{path.level}</span></div><h2>{path.title}</h2><p>{path.description}</p><div className="learning-path-meta"><span><BookOpen size={14} /> {path.duration}</span></div><ol>{path.slugs.map((slug, stepIndex) => { const article = articles.find(item => item.slug === slug); return article ? <li key={slug}><span className="learning-step-number">{String(stepIndex + 1).padStart(2, '0')}</span><Link to={`/blog/${slug}`}>{(en ? articleTranslations[slug]?.title : undefined) ?? article.title}</Link><ArrowRight size={14} /></li> : null })}</ol></article>)}</section> : <section className="glossary-section"><label className="glossary-search"><Search size={17} /><input value={glossaryQuery} onChange={event => setGlossaryQuery(event.target.value)} placeholder={en ? 'Search a term, topic, or definition…' : 'Cari istilah, topik, atau definisi…'} aria-label={en ? 'Search glossary' : 'Cari glosarium'} /><kbd>/</kbd></label><p className="glossary-results">{filteredGlossary.length} {en ? 'terms found' : 'istilah ditemukan'}</p>{filteredGlossary.length ? <div className="glossary-grid">{filteredGlossary.map(item => <article className="glossary-card" key={item.term}><div><h2>{item.term}</h2><span>{item.category}</span></div><p>{item.definition}</p></article>)}</div> : <div className="empty-state"><Search size={22} /><strong>{en ? 'No matching terms' : 'Istilah tidak ditemukan'}</strong><span>{en ? 'Try another keyword.' : 'Coba kata kunci lain.'}</span></div>}</section>}
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
  }, [article, language])
  if (!article) return <main id="main-content" className="container not-found"><h1>{t('articleNotFound')}</h1><p>{t('articleMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>
  return <main id="main-content" className="article-page"><div className="reading-progress" style={{ width: `${progress}%` }} /><div className="container article-container">
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
  const inputRef = useRef<HTMLInputElement>(null)
  const isEnglish = language === 'en'
  const actions = [
    { id: 'home', label: isEnglish ? 'Go to home' : 'Ke beranda', detail: isEnglish ? 'Main page' : 'Halaman utama', icon: HomeIcon, run: () => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
    { id: 'about', label: isEnglish ? 'About DreamEx Tech' : 'Tentang DreamEx Tech', detail: isEnglish ? 'Mission, disciplines, and principles' : 'Misi, disiplin, dan prinsip', icon: Braces, run: () => navigate('/about') },
    { id: 'topics', label: isEnglish ? 'Explore topics' : 'Jelajahi topik', detail: isEnglish ? 'Software · QA · AI' : 'Software · QA · AI', icon: Command, run: () => { if (location.pathname !== '/') navigate('/'); window.setTimeout(() => document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' }), 60) } },
    { id: 'articles', label: isEnglish ? 'Browse articles' : 'Jelajahi artikel', detail: isEnglish ? 'Search the knowledge base' : 'Cari di basis pengetahuan', icon: BookOpen, run: () => { if (location.pathname !== '/') navigate('/'); window.setTimeout(() => { document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth' }); document.querySelector<HTMLInputElement>('.search-box input')?.focus() }, 60) } },
    { id: 'reading-list', label: isEnglish ? 'Open reading list' : 'Buka daftar bacaan', detail: isEnglish ? 'Your saved engineering notes' : 'Catatan engineering tersimpan', icon: Bookmark, run: () => navigate('/reading-list') },
    { id: 'lab', label: isEnglish ? 'Open Engineering Lab' : 'Buka Lab Engineering', detail: isEnglish ? 'QA tools, bug reports, and JSON utilities' : 'Tool QA, laporan bug, dan utilitas JSON', icon: Terminal, run: () => navigate('/lab') },
    { id: 'learn', label: isEnglish ? 'Open Learning Hub' : 'Buka Pusat Belajar', detail: isEnglish ? 'Curated paths and engineering glossary' : 'Jalur belajar dan glosarium engineering', icon: BookOpen, run: () => navigate('/learn') },
  ]
  const term = query.trim().toLowerCase()
  const filteredArticles = articles.filter(article => {
    const translated = isEnglish ? articleTranslations[article.slug] : undefined
    return `${translated?.title ?? article.title} ${translated?.excerpt ?? article.excerpt} ${article.category} ${article.tags.join(' ')}`.toLowerCase().includes(term)
  }).slice(0, 6)
  const items = [
    ...actions.filter(action => !term || `${action.label} ${action.detail}`.toLowerCase().includes(term)).map(action => ({ id: action.id, label: action.label, detail: action.detail, icon: action.icon, run: action.run })),
    ...filteredArticles.map(article => {
      const translated = isEnglish ? articleTranslations[article.slug] : undefined
      return { id: article.slug, label: translated?.title ?? article.title, detail: categoryLabel(article.category, language), icon: BookOpen, run: () => navigate(`/blog/${article.slug}`) }
    }),
  ]
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
      } else if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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
  useEffect(() => setActiveIndex(0), [query])
  useEffect(() => { setOpen(false) }, [location.pathname])
  const runItem = (item: typeof items[number]) => {
    setOpen(false)
    item.run()
  }
  return <>
    <button className="command-trigger" onClick={() => setOpen(true)} aria-label={isEnglish ? 'Open command palette' : 'Buka command palette'}><Search size={15} /><span>{isEnglish ? 'Quick search' : 'Pencarian cepat'}</span><kbd>{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd></button>
    {open && <div className="command-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title">
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
          if (event.key === 'Enter' && items[activeIndex]) { event.preventDefault(); runItem(items[activeIndex]) }
        }} placeholder={isEnglish ? 'Search articles, topics, and pages…' : 'Cari artikel, topik, dan halaman…'} aria-label={isEnglish ? 'Search commands' : 'Cari perintah'} /><button onClick={() => setOpen(false)} aria-label={isEnglish ? 'Close command palette' : 'Tutup command palette'}><X size={18} /></button></div>
        <div className="command-results" id="command-results">
          <p className="command-section-label" id="command-title">{term ? (isEnglish ? 'SEARCH RESULTS' : 'HASIL PENCARIAN') : (isEnglish ? 'QUICK ACTIONS & ARTICLES' : 'AKSI CEPAT & ARTIKEL')}</p>
          {items.length ? items.map((item, index) => {
            const Icon = item.icon
            return <button key={item.id} className={index === activeIndex ? 'command-item active' : 'command-item'} onMouseEnter={() => setActiveIndex(index)} onClick={() => runItem(item)}><span className="command-item-icon"><Icon size={16} /></span><span className="command-item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight size={14} className="command-item-arrow" /></button>
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

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return visible ? <button className="back-to-top" aria-label="Kembali ke atas" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronUp size={19} /></button> : null
}

export default function App() {
  const { t } = useLanguage()
  return <><a className="skip-link" href="#main-content">{t('skip')}</a><OfflineNotice /><ScrollProgress /><CommandPalette /><ScrollToTop /><MotionOnScroll /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/about" element={<AboutPage />} /><Route path="/reading-list" element={<ReadingListPage />} /><Route path="/lab" element={<EngineeringLabPage />} /><Route path="/learn" element={<LearningHubPage />} /><Route path="/rss" element={<RssPage />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main id="main-content" className="container not-found"><h1>{t('pageNotFound')}</h1><p>{t('pageMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>} /></Routes><BackToTop /><Footer /></>
}
