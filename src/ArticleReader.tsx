import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Bookmark, Copy, Share2, ShieldCheck, Terminal } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { articles } from './articles'
import { articleTranslations } from './articleTranslations'
import { getArticleCover } from './articleCovers'
import { useLanguage } from './i18n'
import { ArticleCard } from './ArticleCard'
import {
  categoryLabel,
  READING_PROGRESS_EVENT,
  READING_PROGRESS_KEY,
  readReadingProgress,
  useReadingList,
} from './readingUtils'

export function ArticleReaderView() {
  const { t, language } = useLanguage()
  const { slug } = useParams()
  const articleIndex = articles.findIndex(item => item.slug === slug)
  const article = articleIndex >= 0 ? articles[articleIndex] : undefined
  const prevArticle = articleIndex > 0 ? articles[articleIndex - 1] : undefined
  const nextArticle = articleIndex >= 0 && articleIndex < articles.length - 1 ? articles[articleIndex + 1] : undefined
  const translated = article && language === 'en' ? articleTranslations[article.slug] : undefined
  const [enhancementsBundle, setEnhancementsBundle] = useState<{
    en: typeof import('./articleEnhancements').articleEnhancementsEn
    id: typeof import('./articleEnhancements').articleEnhancementsId
  } | null>(null)
  const enhancement = article && enhancementsBundle
    ? (language === 'en' ? enhancementsBundle.en[article.slug] : enhancementsBundle.id[article.slug])
    : undefined

  useEffect(() => {
    let active = true
    void import('./articleEnhancements')
      .then(mod => {
        if (active) setEnhancementsBundle({ en: mod.articleEnhancementsEn, id: mod.articleEnhancementsId })
      })
      .catch(() => {
        /* Article enhancement metadata loads progressively. */
      })
    return () => { active = false }
  }, [])
  const [progress, setProgress] = useState(0)
  const lastSavedProgress = useRef(-1)
  const { isSaved, toggleSaved } = useReadingList()
  const [linkCopied, setLinkCopied] = useState(false)
  const [citationCopied, setCitationCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
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
  const copyCodeSnippet = async () => {
    if (!enhancement) return
    try {
      await navigator.clipboard.writeText(enhancement.snippet.code)
      setCodeCopied(true)
      setCopyError(false)
      window.setTimeout(() => setCodeCopied(false), 2400)
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
        dateModified: enhancement?.updatedAt ?? article.date,
        author: { '@type': 'Organization', name: 'DreamEx Tech' },
        publisher: { '@type': 'Organization', name: 'DreamEx Tech' },
        mainEntityOfPage: canonicalUrl,
      })
      document.head.appendChild(structuredData)
      const breadcrumbData = document.createElement('script')
      breadcrumbData.type = 'application/ld+json'
      breadcrumbData.dataset.breadcrumbSchema = 'true'
      breadcrumbData.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'DreamEx Tech', item: 'https://dreamex.tech/' },
          { '@type': 'ListItem', position: 2, name: categoryLabel(article.category, language), item: 'https://dreamex.tech/#latest' },
          { '@type': 'ListItem', position: 3, name: translated?.title ?? article.title, item: canonicalUrl },
        ],
      })
      document.head.appendChild(breadcrumbData)
    }
    return () => {
      document.querySelector('script[data-article-schema="true"]')?.remove()
      document.querySelector('script[data-breadcrumb-schema="true"]')?.remove()
      const canonical = document.querySelector('link[rel="canonical"]')
      canonical?.setAttribute('href', 'https://dreamex.tech/')
      setMeta('meta[property="og:title"]', 'content', 'DreamEx Tech — Think deeper. Build smarter.')
      setMeta('meta[property="og:description"]', 'content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
      setMeta('meta[property="og:url"]', 'content', 'https://dreamex.tech/')
      setMeta('meta[name="twitter:title"]', 'content', 'DreamEx Tech — Think deeper. Build smarter.')
      setMeta('meta[name="twitter:description"]', 'content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
      setMeta('meta[name="description"]', 'content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
    }
  }, [article, enhancement?.updatedAt, language, t, translated?.excerpt, translated?.title])

  useEffect(() => {
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
    }
  }, [article])

  if (!article) {
    return (
      <main id="main-content" className="container not-found">
        <h1>{t('articleNotFound')}</h1>
        <p>{t('articleMissingDescription')}</p>
        <Link className="read-link" to="/">{t('backHome')} <ArrowRight size={16} /></Link>
      </main>
    )
  }

  const paragraphs = translated?.body ?? article.body
  const articleCover = getArticleCover(article.slug, language)
  return (
    <main id="main-content" className="article-page">
      <div className="reading-progress" role="progressbar" aria-label={language === 'en' ? 'Article reading progress' : 'Progres membaca artikel'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <div className="container article-container">
        <Link className="back-link" to="/">{t('backAll')}</Link>
        <div className="article-header">
          <span className="category-pill">{categoryLabel(article.category, language)}</span>
          <h1>{translated?.title ?? article.title}</h1>
          <p>{translated?.excerpt ?? article.excerpt}</p>
          <div className="article-meta">
            <span>{new Date(article.date + 'T00:00:00').toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {enhancement?.updatedAt && <><span>•</span><span>{language === 'en' ? `Updated ${new Date(enhancement.updatedAt + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}` : `Diperbarui ${new Date(enhancement.updatedAt + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}</span></>}
            <span>•</span>
            <span>{language === 'en' ? article.readTime.replace('menit', 'min') : article.readTime}</span>
            <span>•</span>
            <span>{enhancement ? `${enhancement.author} (${enhancement.authorRole})` : t('editorial')}</span>
          </div>
        </div>
        <figure className="article-hero-figure">
          <picture>
            <source srcSet={articleCover.webpSrc} type="image/webp" />
            <img src={articleCover.src} alt={articleCover.alt} width={1200} height={630} />
          </picture>
          <figcaption>{articleCover.badge}</figcaption>
        </figure>
        {enhancement && enhancement.sections.length > 0 && (
          <nav className="article-toc" aria-label={language === 'en' ? 'Table of contents' : 'Daftar isi'}>
            <strong><BookOpen size={15} /> {language === 'en' ? 'Table of contents' : 'Daftar isi'}</strong>
            <ol>
              {enhancement.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}
            </ol>
          </nav>
        )}
        <div className="article-body">
          {paragraphs.map((paragraph, index) => {
            const sectionHeading = enhancement?.sections.find(section => section.startParagraphIndex === index)
            return (
              <div key={index} className="article-paragraph-group">
                {sectionHeading && <h2 id={sectionHeading.id} className="article-section-heading">{sectionHeading.heading}</h2>}
                <p>{paragraph}</p>
              </div>
            )
          })}
          {enhancement && (
            <section className="article-code-block" aria-label={language === 'en' ? 'Reference implementation' : 'Implementasi referensi'}>
              <div className="article-code-header">
                <div className="article-code-meta"><Terminal size={14} /> <code>{enhancement.snippet.filename}</code> <span className="article-code-lang">{enhancement.snippet.language}</span></div>
                <button type="button" className="copy-link-button article-copy-code" onClick={copyCodeSnippet} aria-label={language === 'en' ? 'Copy code snippet' : 'Salin potongan kode'}><Copy size={13} /> {codeCopied ? (language === 'en' ? 'Code copied' : 'Kode disalin') : (language === 'en' ? 'Copy code' : 'Salin kode')}</button>
              </div>
              <pre><code>{enhancement.snippet.code}</code></pre>
              <p className="article-code-caption">{enhancement.snippet.caption}</p>
            </section>
          )}
          <div className="article-note"><strong><ShieldCheck size={16} /> {t('engineeringNote')}</strong><p>{t('noteDescription')}</p></div>
        </div>
        <div className="article-end">
          <span>{t('topicsLabel')}</span>
          <div className="tag-row">{article.tags.map(tag => <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
          <button className="copy-link-button" onClick={() => toggleSaved(article.slug)} aria-pressed={isSaved(article.slug)}><Bookmark size={14} /> {isSaved(article.slug) ? (language === 'en' ? 'Saved to reading list' : 'Tersimpan di daftar bacaan') : (language === 'en' ? 'Save to reading list' : 'Simpan ke daftar bacaan')}</button>
          <button className="copy-link-button" onClick={shareArticle}><Share2 size={14} /> {language === 'en' ? 'Share article' : 'Bagikan artikel'}</button>
          <button className="copy-link-button" onClick={copyCitation}><Copy size={14} /> {citationCopied ? (language === 'en' ? 'Citation copied' : 'Sitasi disalin') : (language === 'en' ? 'Copy Markdown citation' : 'Salin sitasi Markdown')}</button>
          <button className="copy-link-button" onClick={copyArticleLink}><Copy size={14} /> {linkCopied ? t('copied') : t('copyLink')}</button>
        </div>
        {copyError && <p className="copy-error" role="status">{t('copyError')}</p>}
        {(prevArticle || nextArticle) && (
          <nav className="article-prev-next" aria-label={language === 'en' ? 'Previous and next articles' : 'Artikel sebelumnya dan berikutnya'}>
            {prevArticle ? <Link className="article-sequence-card prev" to={`/blog/${prevArticle.slug}`}><span className="section-kicker">← {language === 'en' ? 'PREVIOUS ARTICLE' : 'ARTIKEL SEBELUMNYA'}</span><strong>{(language === 'en' ? articleTranslations[prevArticle.slug]?.title : undefined) ?? prevArticle.title}</strong></Link> : <div />}
            {nextArticle ? <Link className="article-sequence-card next" to={`/blog/${nextArticle.slug}`}><span className="section-kicker">{language === 'en' ? 'NEXT ARTICLE' : 'ARTIKEL BERIKUTNYA'} →</span><strong>{(language === 'en' ? articleTranslations[nextArticle.slug]?.title : undefined) ?? nextArticle.title}</strong></Link> : <div />}
          </nav>
        )}
        {relatedArticles.length > 0 && (
          <section className="related-section">
            <div className="related-heading"><span className="section-kicker">{t('nextLearning')}</span><h2>{t('continueExploring')}</h2></div>
            <div className="related-grid">{relatedArticles.map((related, index) => <ArticleCard key={related.slug} article={related} index={index} />)}</div>
          </section>
        )}
        <div className="article-next"><div><span className="section-kicker">{t('keepExploring')}</span><h2>{t('shareKnowledge')}</h2></div><Link className="button button-primary" to="/">{t('exploreArticles')} <ArrowRight size={16} /></Link></div>
      </div>
    </main>
  )
}
