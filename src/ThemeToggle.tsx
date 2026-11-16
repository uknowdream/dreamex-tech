import { Moon, Sun } from 'lucide-react'
import { useTheme } from './themeUtils'

export function ThemeToggle({ en, compact = false }: { en: boolean; compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const nextLabel = theme === 'dark'
    ? (en ? 'Switch to Daylight light theme (Alt+T)' : 'Aktifkan tema terang Daylight (Alt+T)')
    : (en ? 'Switch to Obsidian dark theme (Alt+T)' : 'Aktifkan tema gelap Obsidian (Alt+T)')

  return (
    <button
      type="button"
      className={compact ? 'theme-toggle-btn is-compact' : 'theme-toggle-btn'}
      onClick={toggleTheme}
      aria-label={nextLabel}
      aria-pressed={theme === 'light'}
      title={nextLabel}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      {!compact && <span>{theme === 'dark' ? (en ? 'Light' : 'Terang') : (en ? 'Dark' : 'Gelap')}</span>}
    </button>
  )
}
