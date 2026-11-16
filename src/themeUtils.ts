import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'dreamex-theme-v1'
const THEME_EVENT = 'dreamex-theme-changed'

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* Optional when storage is unavailable */
  }
  return 'dark'
}

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeColor?.setAttribute('content', theme === 'light' ? '#f8fafc' : '#080d19')
  const colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
  colorScheme?.setAttribute('content', theme === 'light' ? 'light dark' : 'dark')
}

export function applyInitialThemeBeforeRender() {
  applyThemeToDocument(readInitialTheme())
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme)

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  useEffect(() => {
    const sync = () => setThemeState(readInitialTheme())
    window.addEventListener('storage', sync)
    window.addEventListener(THEME_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(THEME_EVENT, sync)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(current => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        /* Ignore storage quota errors */
      }
      applyThemeToDocument(next)
      window.dispatchEvent(new Event(THEME_EVENT))
      return next
    })
  }, [])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && (event.code === 'KeyT' || event.key.toLowerCase() === 't')) {
        const target = event.target
        const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
        if (isTyping) return
        event.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [toggleTheme])

  return { theme, toggleTheme }
}
