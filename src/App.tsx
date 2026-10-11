import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, BookOpen, Braces, Check, ChevronUp, Command, Copy, Github, Home as HomeIcon, Search, ShieldCheck, Sparkles, Terminal, X, Zap } from 'lucide-react'
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
    <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label={t('blog')}><NavLink to="/">{t('blog')}</NavLink><a href="/#topics">{t('topics')}</a><a href="/#latest">{t('articles')}</a><NavLink to="/about">{language === 'en' ? 'About' : 'Tentang'}</NavLink><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">GitHub <Github size={15} /></a><div className="language-switch" role="group" aria-label={t('language')}><button type="button" className={language === 'id' ? 'language-option active' : 'language-option'} aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button><button type="button" className={language === 'en' ? 'language-option active' : 'language-option'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div></nav>
  </div></header>
}

function Footer() {
  const { t, language } = useLanguage()
  return <footer className="footer"><div className="container footer-inner">
    <div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark"><Braces size={18} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span></Link><p>{t('footerTagline')}</p></div>
    <div className="footer-links"><a href="/#topics">{t('footerTopics')}</a><a href="/#latest">{t('latestArticles')}</a><Link to="/about">{language === 'en' ? 'About DreamEx' : 'Tentang DreamEx'}</Link><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{t('openSource')} <ArrowRight size={13} /></a></div>
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
      <div className="section-heading"><div><span className="section-kicker">{t('articlesEyebrow')}</span><h2>{t('articlesHeading')} <span>{t('articlesHeadingAccent')}</span></h2><p>{t('latestDescription')}</p></div><label className="search-box"><Search size={18} /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchLabel')} /><kbd>/</kbd></label></div>
      <div className="filter-row" aria-label={t('topics')}>{categories.map(item => <button key={item} className={category === item ? 'filter active' : 'filter'} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item, language)}</button>)}</div>
      <div className="results-meta"><span>{filtered.length} {t('found')}</span>{query && <button onClick={() => setQuery('')}>{t('clearSearch')} <span>×</span></button>}</div>
      {filtered.length ? <div className="article-grid">{filtered.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div> : <div className="empty-state"><Search size={22} /><strong>{t('noResults')}</strong><span>{t('tryOther')}</span></div>}
    </div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="section-kicker">{t('buildInPublic')}</span><h2>Better systems.<br /><span>Better questions.</span></h2><p>{t('buildDescription')}</p></div><a className="button button-primary" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">{t('exploreCode')} <ArrowRight size={17} /></a></div></section>
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
  return <><a className="skip-link" href="#main-content">{t('skip')}</a><ScrollProgress /><CommandPalette /><ScrollToTop /><MotionOnScroll /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/about" element={<AboutPage />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main id="main-content" className="container not-found"><h1>{t('pageNotFound')}</h1><p>{t('pageMissingDescription')}</p><Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link></main>} /></Routes><BackToTop /><Footer /></>
}
