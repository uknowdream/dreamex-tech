import { ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { articles } from './articles'
import { articleTranslations } from './articleTranslations'
import { getArticleCover } from './articleCovers'
import { useLanguage } from './i18n'
import { HoloMotionFx } from './HoloMotionFx'
import { categoryLabel, useReadingList } from './readingUtils'

export function ArticleCard({
  article,
  index = 0,
  activeTag = '',
  onSelectTag,
}: {
  article: typeof articles[number]
  index?: number
  activeTag?: string
  onSelectTag?: (tag: string) => void
}) {
  const { t, language } = useLanguage()
  const { isSaved, toggleSaved } = useReadingList()
  const translated = language === 'en' ? articleTranslations[article.slug] : undefined
  const saved = isSaved(article.slug)
  const cover = getArticleCover(article.slug, language)
  return (
    <article className="article-card" style={{ animationDelay: `${index * 70}ms` }}>
      <Link className="article-cover-thumb" to={`/blog/${article.slug}`} tabIndex={-1} aria-hidden="true">
        <picture>
          <source srcSet={cover.webpSrc} type="image/webp" />
          <img className="article-cover-img" src={cover.src} alt="" width={640} height={360} loading="lazy" decoding="async" />
        </picture>
        <HoloMotionFx variant={article.category.includes('QA') ? 'qa' : article.category.includes('AI') ? 'neural' : 'arch'} />
        <span className="article-cover-badge" style={{ borderColor: cover.accent }}>{cover.badge}</span>
      </Link>
      <div className="card-top">
        <span className="category-pill">{categoryLabel(article.category, language)}</span>
        <div className="card-meta-actions">
          <span className="read-time">{language === 'en' ? article.readTime.replace('menit', 'min') : article.readTime}</span>
          <button
            className="bookmark-button"
            type="button"
            aria-pressed={saved}
            aria-label={`${saved ? (language === 'en' ? 'Remove saved article' : 'Hapus artikel tersimpan') : (language === 'en' ? 'Save article' : 'Simpan artikel')}: ${translated?.title ?? article.title}`}
            onClick={() => toggleSaved(article.slug)}
            title={saved ? (language === 'en' ? 'Remove from reading list' : 'Hapus dari daftar bacaan') : (language === 'en' ? 'Save to reading list' : 'Simpan ke daftar bacaan')}
          >
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>
      <h3><Link to={`/blog/${article.slug}`}>{translated?.title ?? article.title}</Link></h3>
      <p>{translated?.excerpt ?? article.excerpt}</p>
      <div className="tag-row">
        {article.tags.slice(0, 3).map(tag => onSelectTag
          ? <button key={tag} type="button" className={activeTag === tag ? 'tag-chip active' : 'tag-chip'} aria-pressed={activeTag === tag} onClick={() => onSelectTag(activeTag === tag ? '' : tag)}>#{tag.replaceAll(' ', '')}</button>
          : <span key={tag}>#{tag.replaceAll(' ', '')}</span>)}
      </div>
      <Link className="read-link" to={`/blog/${article.slug}`}>{t('readArticle')} <ArrowRight size={16} /></Link>
    </article>
  )
}
