import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, BookOpen, Braces, Check, ChevronUp, Github, Search, ShieldCheck, Sparkles, Terminal, Zap } from 'lucide-react'
import { articles } from './articles'

const categories = ['Semua', 'Software Engineering', 'QA Automation', 'AI & Technology']

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname])
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/" aria-label="DreamEx Tech beranda"><span className="brand-mark"><Braces size={21} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span><span className="brand-beta">ENGINEERING NOTES</span></Link>
    <button className="menu-toggle" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /></button>
    <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label="Navigasi utama"><NavLink to="/">Blog</NavLink><a href="/#topics">Topik</a><a href="/#latest">Artikel</a><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">GitHub <Github size={15} /></a></nav>
  </div></header>
}

function Footer() {
  return <footer className="footer"><div className="container footer-inner">
    <div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark"><Braces size={18} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span></Link><p>Curiosity into engineering. Ideas into impact.</p></div>
    <div className="footer-links"><a href="/#topics">Topics</a><a href="/#latest">Latest articles</a><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">Open source <ArrowRight size={13} /></a></div>
    <span className="copyright">© {new Date().getFullYear()} DreamEx Tech · Built to keep learning.</span>
  </div></footer>
}

function ArticleCard({ article, index = 0 }: { article: typeof articles[number]; index?: number }) {
  return <article className="article-card" style={{ animationDelay: `${index * 70}ms` }}>
    <div className="card-top"><span className="category-pill">{article.category}</span><span className="read-time">{article.readTime}</span></div>
    <h3><Link to={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p>
    <div className="tag-row">{article.tags.slice(0, 3).map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
    <Link className="read-link" to={`/blog/${article.slug}`}>Baca artikel <ArrowRight size={16} /></Link>
  </article>
}

function Home() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Semua')
  const filtered = useMemo(() => articles.filter(article => {
    const matchesCategory = category === 'Semua' || article.category === category
    const haystack = `${article.title} ${article.excerpt} ${article.category} ${article.tags.join(' ')} ${article.body.join(' ')}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase().trim())
  }), [category, query])
  const featured = articles[0]

  useEffect(() => { document.title = 'DreamEx Tech — Engineering, AI & QA' }, [])

  return <main>
    <section className="hero"><div className="hero-gridlines" /><div className="container hero-grid">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> INDEPENDENT TECH KNOWLEDGE PLATFORM</div>
        <h1>Think deeper.<br /><span>Build smarter.</span><br />Ship with quality.</h1>
        <p className="hero-description">Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern—dari konsep yang kuat hingga praktik yang bisa diterapkan.</p>
        <div className="hero-actions"><a className="button button-primary" href="#latest">Jelajahi knowledge base <ArrowRight size={17} /></a><a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={17} /> Source code</a></div>
        <div className="hero-stats"><div><strong>{String(articles.length).padStart(2, '0')}<i>+</i></strong><span>Engineering notes</span></div><div><strong>03</strong><span>Core disciplines</span></div><div><strong>∞</strong><span>Ideas to explore</span></div></div>
      </div>
      <div className="hero-visual"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="terminal">
        <div className="terminal-bar"><div className="terminal-dots"><span /><span /><span /></div><small><Terminal size={12} /> dreamex / engineering.ts</small><span className="terminal-live"><i /> LIVE</span></div>
        <div className="terminal-content"><p className="terminal-comment">// engineering principles</p><p><span className="syntax-purple">const</span> mindset = {'{'}</p><p className="indent"><span className="syntax-blue">quality</span>: <span className="syntax-green">'by design'</span>,</p><p className="indent"><span className="syntax-blue">learning</span>: <span className="syntax-green">'continuous'</span>,</p><p className="indent"><span className="syntax-blue">impact</span>: <span className="syntax-green">'measurable'</span></p><p>{'}'}</p><br /><p><span className="syntax-purple">for</span> (<span className="syntax-orange">const</span> idea <span className="syntax-purple">of</span> curiosity) {'{'}</p><p className="indent">build(idea);</p><p className="indent">test(assumptions);</p><p className="indent">improve(outcome);</p><p>{'}'}</p><div className="terminal-status"><span /> <span>pipeline</span><b>ready for iteration</b><Check size={13} /></div></div>
      </div><div className="floating-chip chip-top"><ShieldCheck size={16} /> Quality engineered</div><div className="floating-chip chip-bottom"><Sparkles size={16} /> Curiosity driven</div><div className="visual-caption"><span>01 / THE MINDSET</span><span>ALWAYS ITERATE <ArrowDownRight size={13} /></span></div></div>
    </div></section>
    <section className="trust-strip"><div className="container trust-inner"><span><Zap size={15} /> PRACTICAL KNOWLEDGE</span><span><ShieldCheck size={15} /> QUALITY FIRST</span><span><Braces size={15} /> ENGINEERING LED</span><span><Sparkles size={15} /> AI CONSCIOUS</span></div></section>
    <section className="topics-section" id="topics"><div className="container"><div className="topics-heading"><div><span className="section-kicker">01 — EXPLORE THE FIELD</span><h2>Ideas worth <span>building on.</span></h2></div><p>Teknologi bergerak cepat. Prinsip engineering yang baik membantu kita bergerak dengan arah.</p></div><div className="topics-grid">
      <a className="topic-card" href="#latest" onClick={() => setCategory('Software Engineering')}><span className="topic-number">01</span><span className="topic-icon purple"><Braces /></span><h3>Software Engineering</h3><p>Arsitektur, TypeScript, clean code, dan sistem yang maintainable.</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
      <a className="topic-card" href="#latest" onClick={() => setCategory('QA Automation')}><span className="topic-number">02</span><span className="topic-icon green"><ShieldCheck /></span><h3>Quality Engineering</h3><p>Automation, strategi pengujian, CI/CD, dan kualitas yang terukur.</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
      <a className="topic-card" href="#latest" onClick={() => setCategory('AI & Technology')}><span className="topic-number">03</span><span className="topic-icon blue"><Sparkles /></span><h3>AI & Emerging Tech</h3><p>Eksperimen AI, evaluasi, observability, dan teknologi baru.</p><span className="topic-arrow"><ArrowRight size={16} /></span></a>
    </div></div></section>
    <section className="featured-section"><div className="container featured-wrap"><div className="featured-label"><span className="section-kicker">EDITOR'S PICK</span><span className="featured-line" /></div><div className="featured-card"><div className="featured-art"><div className="art-grid" /><div className="art-symbol"><Braces size={72} strokeWidth={1.1} /></div><span className="art-index">DX / 001</span><span className="art-caption">ENGINEERING<br />FOR WHAT'S NEXT</span></div><div className="featured-copy"><span className="category-pill">{featured.category}</span><p className="featured-overline">FEATURED INSIGHT · {featured.readTime.toUpperCase()}</p><h2>{featured.title}</h2><p>{featured.excerpt}</p><Link className="read-link" to={`/blog/${featured.slug}`}>Baca insight pilihan <ArrowRight size={16} /></Link></div></div></div></section>
    <section className="articles-section" id="latest"><div className="container">
      <div className="section-heading"><div><span className="section-kicker">02 — THE KNOWLEDGE LOG</span><h2>Latest <span>thinking.</span></h2><p>Catatan, panduan, dan pelajaran engineering yang bisa diterapkan.</p></div><label className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari topik, tools, konsep..." aria-label="Cari artikel" /><kbd>/</kbd></label></div>
      <div className="filter-row" aria-label="Filter kategori">{categories.map(item => <button key={item} className={category === item ? 'filter active' : 'filter'} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="results-meta"><span>{filtered.length} artikel ditemukan</span>{query && <button onClick={() => setQuery('')}>Hapus pencarian <span>×</span></button>}</div>
      {filtered.length ? <div className="article-grid">{filtered.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div> : <div className="empty-state"><Search size={22} /><strong>Belum ada hasil yang cocok.</strong><span>Coba kata kunci atau kategori lain.</span></div>}
    </div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="section-kicker">BUILD IN PUBLIC</span><h2>Better systems.<br /><span>Better questions.</span></h2><p>Dokumentasikan proses. Bagikan pelajaran. Tingkatkan kualitas.</p></div><a className="button button-primary" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">Explore the code <ArrowRight size={17} /></a></div></section>
  </main>
}

function ArticlePage() {
  const { slug } = useParams()
  const article = articles.find(item => item.slug === slug)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    document.title = article ? `${article.title} — DreamEx Tech` : 'Artikel tidak ditemukan — DreamEx Tech'
    const description = document.querySelector('meta[name="description"]')
    if (description && article) description.setAttribute('content', article.excerpt)
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? Math.min(100, Math.round(window.scrollY / scrollable * 100)) : 0)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateProgress)
  }, [article])
  if (!article) return <main className="container not-found"><h1>Artikel tidak ditemukan</h1><p>Artikel mungkin dipindahkan atau belum tersedia.</p><Link className="read-link" to="/">Kembali ke beranda <ArrowRight size={16} /></Link></main>
  return <main className="article-page"><div className="reading-progress" style={{ width: `${progress}%` }} /><div className="container article-container">
    <Link className="back-link" to="/">← Semua artikel</Link>
    <div className="article-header"><span className="category-pill">{article.category}</span><h1>{article.title}</h1><p>{article.excerpt}</p><div className="article-meta"><span>{new Date(article.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>•</span><span>{article.readTime}</span><span>•</span><span>DreamEx Editorial</span></div></div>
    <div className="article-body">{article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="article-note"><strong><ShieldCheck size={16} /> Engineering note</strong><p>Gunakan artikel ini sebagai titik awal. Validasi pendekatan terhadap konteks, risiko, dan kebutuhan proyek nyata.</p></div></div>
    <div className="article-end"><span>TOPICS</span><div className="tag-row">{article.tags.map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div></div>
    <div className="article-next"><div><span className="section-kicker">KEEP EXPLORING</span><h2>Pengetahuan berkembang saat dibagikan.</h2></div><Link className="button button-primary" to="/">Jelajahi artikel <ArrowRight size={16} /></Link></div>
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
  return <><ScrollToTop /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main className="container not-found"><h1>Halaman tidak ditemukan</h1><p>Alamat yang dibuka tidak tersedia.</p><Link className="read-link" to="/">Kembali ke beranda <ArrowRight size={16} /></Link></main>} /></Routes><BackToTop /><Footer /></>
}
