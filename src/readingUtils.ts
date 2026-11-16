import { useEffect, useState } from 'react'
import { articles } from './articles'

export const READING_LIST_KEY = 'dreamex-reading-list-v1'
export const READING_LIST_EVENT = 'dreamex-reading-list-updated'
export const READING_PROGRESS_KEY = 'dreamex-reading-progress-v1'
export const READING_PROGRESS_EVENT = 'dreamex-reading-progress-updated'

export type ReadingProgressRecord = { slug: string; progress: number }

export const categoryLabel = (category: string, language: 'id' | 'en') => {
  if (category === 'Semua') return language === 'en' ? 'All' : 'Semua'
  return category
}

export function readReadingProgress(): ReadingProgressRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(READING_PROGRESS_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const record = value as Partial<ReadingProgressRecord>
    if (typeof record.slug !== 'string' || !articles.some(article => article.slug === record.slug)) return null
    if (typeof record.progress !== 'number' || !Number.isFinite(record.progress) || record.progress < 5 || record.progress >= 100) return null
    return { slug: record.slug, progress: Math.round(record.progress) }
  } catch {
    return null
  }
}

export function readSavedSlugs(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(READING_LIST_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === 'string' && articles.some(article => article.slug === slug)) : []
  } catch {
    return []
  }
}

export function useReadingList() {
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
    try { window.localStorage.setItem(READING_LIST_KEY, JSON.stringify(next)) } catch { /* Keep session usable. */ }
    setSavedSlugs(next)
    window.dispatchEvent(new Event(READING_LIST_EVENT))
  }
  return { savedSlugs, toggleSaved, isSaved: (slug: string) => savedSlugs.includes(slug) }
}
