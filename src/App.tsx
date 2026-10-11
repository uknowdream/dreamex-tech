import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Braces, Github, Search, ShieldCheck } from 'lucide-react'
import { articles } from './articles'

const categories = ['Semua', 'Software Engineering', 'QA Automation', 'AI & Technology']

function Header() {
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/"><span className="brand-mark"><Braces size={21} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span></Link>
    <nav className="nav-links"><NavLink to="/">Blog</NavLink><a href="/#topics">Topik</a><a href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">GitHub <Github size={15} /></a></nav>
  </div></header>
}

function Footer() {
  return <footer className="footer"><div className="container footer-inner">
    <Link className="brand" to="/"><span className="brand-mark"><Braces size={18} /></span><span>DreamEx<span className="brand-muted"> Tech</span></span></Link>
    <p>Catatan engineering untuk membangun teknologi yang lebih baik.</p><span className="copyright">© {new Date().getFullYear()} DreamEx Tech</span>
  </div></footer>
}

function ArticleCard({ article }: { article: typeof articles[number] }) {
  return <article className="article-card">
    <div className="card-top"><span className="category-pill">{article.category}</span><span className="read-time">{article.readTime}</span></div>
    <h3><Link to={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p>
    <div className="tag-row">{article.tags.map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
    <Link className="read-link" to={`/blog/${article.slug}`}>Baca artikel <ArrowRight size={16} /></Link>
  </article>
}

function Home() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Semua')
  const filtered = useMemo(() => articles.filter(article => {
    const matchesCategory = category === 'Semua' || article.category === category
    const haystack = `${article.title} ${article.excerpt} ${article.category} ${article.tags.join(' ')}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  }), [category, query])

  useEffect(() => { document.title = 'DreamEx Tech — Engineering, AI & QA' }, [])

  return <main>
    <section className="hero"><div className="container hero-grid">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> TECHNOLOGY • ENGINEERING • KNOWLEDGE</div>
        <h1>Build better.<br /><span>Test smarter.</span><br />Keep learning.</h1>
        <p className="hero-description">Catatan praktis tentang software engineering, QA automation, AI, dan teknologi—dibangun dari rasa ingin tahu dan praktik nyata.</p>
        <div className="hero-actions"><a className="button button-primary" href="#latest">Jelajahi artikel <ArrowRight size={17} /></a><a className="button button-ghost" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a></div>
        <div className="hero-stats"><div><strong>{String(articles.length).padStart(2, '0')}</strong><span>Artikel awal</span></div><div><strong>03</strong><span>Area teknologi</span></div><div><strong>∞</strong><span>Hal untuk dipelajari</span></div></div>
      </div>
      <div className="hero-visual" aria-label="Ilustrasi terminal kode"><div className="terminal">
        <div className="terminal-bar"><span></span><span></span><span></span><small>dreamex — ~/engineering</small></div>
        <div className="terminal-content"><p className="terminal-comment">// the engineering mindset</p><p><span className="syntax-purple">const</span> mission = {'{'}</p><p className="indent"><span className="syntax-blue">quality</span>: <span className="syntax-green">'by design'</span>,</p><p className="indent"><span className="syntax-blue">learning</span>: <span className="syntax-green">'continuous'</span>,</p><p className="indent"><span className="syntax-blue">impact</span>: <span className="syntax-green">'measurable'</span></p><p>{'}'}</p><br /><p><span className="syntax-purple">while</span> (curious) {'{'}</p><p className="indent">build();</p><p className="indent">test();</p><p className="indent">improve();</p><p>{'}'}</p><div className="terminal-status"><span></span> all systems learning</div></div>
      </div><div className="floating-chip chip-top"><ShieldCheck size={16} /> Quality first</div><div className="floating-chip chip-bottom"><BookOpen size={16} /> Learn in public</div></div>
    </div></section>
    <section className="topics-section" id="topics"><div className="container topics-grid">
      <div className="section-intro"><span className="section-kicker">EXPLORE BY TOPIC</span><h2>Knowledge with<br />a practical edge.</h2></div>
      <div className="topic-card"><span className="topic-icon purple"><Braces /></span><h3>Software Engineering</h3><p>Arsitektur, TypeScript, clean code, dan praktik development.</p></div>
      <div className="topic-card"><span className="topic-icon green"><ShieldCheck /></span><h3>QA Automation</h3><p>Testing strategy, automation framework, dan CI/CD quality gates.</p></div>
      <div className="topic-card"><span className="topic-icon blue"><BookOpen /></span><h3>AI & Technology</h3><p>Eksperimen, tools, evaluasi, dan penerapan teknologi modern.</p></div>
    </div></section>
    <section className="articles-section" id="latest"><div className="container">
      <div className="section-heading"><div><span className="section-kicker">THE KNOWLEDGE LOG</span><h2>Latest articles<span className="accent-dot">.</span></h2><p>Ide, panduan, dan pembelajaran yang layak dibagikan.</p></div>
        <label className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari artikel..." aria-label="Cari artikel" /></label>
      </div>
      <div className="filter-row">{categories.map(item => <button key={item} className={category === item ? 'filter active' : 'filter'} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {filtered.length ? <div className="article-grid">{filtered.map(article => <ArticleCard key={article.slug} article={article} />)}</div> : <div className="empty-state">Tidak ada artikel yang cocok. Coba kata kunci atau kategori lain.</div>}
    </div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="section-kicker">STAY CURIOUS</span><h2>Better engineering starts<br />with better questions.</h2><p>Dokumentasikan proses. Bagikan pelajaran. Tingkatkan kualitas.</p></div><a className="button button-primary" href="https://github.com/uknowdream/dreamex-tech" target="_blank" rel="noreferrer">Lihat proyek <ArrowRight size={17} /></a></div></section>
  </main>
}

function ArticlePage() {
  const { slug } = useParams()
  const article = articles.find(item => item.slug === slug)
  useEffect(() => {
    document.title = article ? `${article.title} — DreamEx Tech` : 'Artikel tidak ditemukan — DreamEx Tech'
    const description = document.querySelector('meta[name="description"]')
    if (description && article) description.setAttribute('content', article.excerpt)
  }, [article])
  if (!article) return <main className="container not-found"><h1>Artikel tidak ditemukan</h1><p>Artikel mungkin dipindahkan atau belum tersedia.</p><Link className="read-link" to="/">Kembali ke beranda <ArrowRight size={16} /></Link></main>
  return <main className="article-page"><div className="container article-container">
    <Link className="back-link" to="/">← Semua artikel</Link>
    <div className="article-header"><span className="category-pill">{article.category}</span><h1>{article.title}</h1><p>{article.excerpt}</p><div className="article-meta"><span>{new Date(article.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>•</span><span>{article.readTime}</span></div></div>
    <div className="article-body">{article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="article-note"><strong>Catatan DreamEx</strong><p>Artikel ini merupakan dokumentasi pembelajaran. Validasi pendekatan terhadap konteks dan kebutuhan proyek masing-masing.</p></div></div>
    <div className="article-end"><span>Topik terkait</span><div className="tag-row">{article.tags.map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div></div>
  </div></main>
}

export default function App() {
  return <><Header /><Routes><Route path="/" element={<Home />} /><Route path="/blog/:slug" element={<ArticlePage />} /><Route path="*" element={<main className="container not-found"><h1>Halaman tidak ditemukan</h1><Link className="read-link" to="/">Kembali ke beranda <ArrowRight size={16} /></Link></main>} /></Routes><Footer /></>
}
