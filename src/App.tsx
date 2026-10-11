import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, Braces, Check, ChevronUp, Copy, Github, Search, ShieldCheck, Sparkles, Terminal, Zap } from 'lucide-react'
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

function Header() {
  const { language, setLanguage, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname])
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/" aria-label="DreamEx Tech beranda"><span className="brand-mark"><Braces size={21} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span><span className="brand-beta">ENGINEERING NOTES</span></Link>
    <button className="menu-toggle" aria-label={menuOpen ? t('closeMenu') : t('openMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /></button>
    <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label={t('blog')}><NavLink to="/">{t('blog')}</NavLink><a href="/#topics">{t('topics')}</a><a href="/#latest">{t('articles')}</a><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">GitHub <Github size={15} /></a><div className="language-switch" role="group" aria-label={t('language')}><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div></nav>
  </div></header>
}

function Footer() {
  const { t } = useLanguage()
  return <footer className="footer"><div className="container footer-inner">
    <div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark"><Braces size={18} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span></Link><p>{t('footerTagline')}</p></div>
    <div className="footer-links"><a href="/#topics">{t('footerTopics')}</a><a href="/#latest">{t('latestArticles')}</a><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{t('openSource')} <ArrowRight size={13} /></a></div>
    <span className="copyright">© {new Date().getFullYear()} DreamEx Tech · {t('footerCopyright')}</span>
  </div></footer>
}

function ArticleCard({ article, index = 0 }: { article: typeof articles[number]; index?: number }) {
  const { t, language } = useLanguage()
  const translated = language === 'en' ? articleTranslations[article.slug] : undefined
  return <article className="article-card" style={{ animationDelay: `${index * 70}ms` }}>
    <div className="card-top"><span className="category-pill">{categoryLabel(article.category, language)}</span><span className="read-time">{language === 'en' ? article.readTime.replace('menit', 'min') : article.readTime}</span></div>
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

  useEffect(() => { document.title = 'DreamEx Tech — Engineering, AI & QA' }, [language])

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
      <div className="section-heading"><div><span className="section-kicker">{t('articlesEyebrow')}</span><h2>{t('articlesHeading')} <span>{t('articlesHeadingAccent')}</span></h2><p>{t('latestDescription')}</p></div><label className="search-box"><Search size={18} /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchLabel')} /><kbd>/</kbd></label></div>
      <div className="filter-row" aria-label={t('topics')}>{categories.map(item => <button key={item} className={category === item ? 'filter active' : 'filter'} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item, language)}</button>)}</div>
      <div className="results-meta"><span>{filtered.length} {t('found')}</span>{query && <button onClick={() => setQuery('')}>{t('clearSearch')} <span>×</span></button>}</div>
      {filtered.length ? <div className="article-grid">{filtered.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div> : <div className="empty-state"><Search size={22} /><strong>{t('noResults')}</strong><span>{t('tryOther')}</span></div>}
    </div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="section-kicker">{t('buildInPublic')}</span><h2>Better systems.<br /><span>Better questions.</span></h2><p>{t('buildDescription')}</p></div><a className="button button-primary" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{t('exploreCode')} <ArrowRight size={17} /></a></div></section>
  </main>
}

function ArticlePage() {
  const { t, language } = useLanguage()
  const { slug } = useParams()
  const article = articles.find(item => item.slug === slug)
  const translated = article && language === 'en' ? articleTranslations[article.slug] : undefined
  const [progress, setProgress] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
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
      setProgress(scrollable > 0 ? Math.min(100, Math.round(window.scrollY / scrollable * 100)) : 0)
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
    <div className="article-end"><span>{t('topicsLabel')}</span><div className="tag-row">{article.tags.map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div><button className="copy-link-button" onClick={copyArticleLink}><Copy size={14} /> {linkCopied ? t('copied') : t('copyLink')}</button></div>
    {copyError && <p className="copy-error" role="status">{t('copyError')}</p>}
    {relatedArticles.length > 0 && <section className="related-section"><div className="related-heading"><span className="section-kicker">{t('nextLearning')}</span><h2>{t('continueExploring')}</h2></div><div className="related-grid">{relatedArticles.map((related, index) => <ArticleCard key={related.slug} article={related} index={index} />)}</div></section>}
    <div className="article-next"><div><span className="section-kicker">{t('keepExploring')}</span><h2>{t('shareKnowledge')}</h2></div><Link className="button button-primary" to="/">{t('exploreArticles')} <ArrowRight size={16} /></Link></div>
  </div></main>
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
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
  return <><a className="skip-link" href="#main-content">{t('skip')}</a><ScrollToTop /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main id="main-content" className="container not-found"><h1>{t('pageNotFound')}</h1><p>{t('pageMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>} /></Routes><BackToTop /><Footer /></>
}
