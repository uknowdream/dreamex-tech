import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Language = 'id' | 'en'

type Messages = Record<string, string>

const messages: Record<Language, Messages> = {
  id: {
    home: 'Beranda', blog: 'Blog', topics: 'Topik', articles: 'Artikel', github: 'GitHub',
    closeMenu: 'Tutup menu', openMenu: 'Buka menu', skip: 'Lewati ke konten utama',
    footerTagline: 'Curiosity into engineering. Ideas into impact.', footerTopics: 'Topik',
    latestArticles: 'Artikel terbaru', openSource: 'Open source', footerCopyright: 'Dibangun untuk terus belajar.',
    readArticle: 'Baca artikel', readFeatured: 'Baca insight pilihan',
    heroDescription: 'Ruang eksplorasi software engineering, quality engineering, AI, dan teknologi modern—dari konsep yang kuat hingga praktik yang bisa diterapkan.',
    exploreKnowledge: 'Jelajahi knowledge base', sourceCode: 'Source code',
    engineeringNotes: 'Catatan engineering', coreDisciplines: 'Disiplin utama', ideasExplore: 'Ide untuk dieksplorasi',
    topicsDescription: 'Teknologi bergerak cepat. Prinsip engineering yang baik membantu kita bergerak dengan arah.',
    softwareDescription: 'Arsitektur, TypeScript, clean code, dan sistem yang mudah dipelihara.',
    qaDescription: 'Automation, strategi pengujian, CI/CD, dan kualitas yang terukur.',
    aiDescription: 'Eksperimen AI, evaluasi, observability, dan teknologi baru.',
    featuredInsight: 'INSIGHT PILIHAN', latestThinking: 'Pemikiran terbaru.',
    latestDescription: 'Catatan, panduan, dan pelajaran engineering yang bisa diterapkan.',
    searchPlaceholder: 'Cari topik, tools, konsep...', searchLabel: 'Cari artikel',
    all: 'Semua', found: 'artikel ditemukan', clearSearch: 'Hapus pencarian',
    noResults: 'Belum ada hasil yang cocok.', tryOther: 'Coba kata kunci atau kategori lain.',
    buildDescription: 'Dokumentasikan proses. Bagikan pelajaran. Tingkatkan kualitas.',
    exploreCode: 'Jelajahi kode', backAll: '← Semua artikel', editorial: 'DreamEx Editorial',
    engineeringNote: 'Catatan engineering',
    noteDescription: 'Gunakan artikel ini sebagai titik awal. Validasi pendekatan terhadap konteks, risiko, dan kebutuhan proyek nyata.',
    topicsLabel: 'TOPIK', copied: 'Link tersalin', copyLink: 'Salin tautan',
    copyError: 'Browser tidak mengizinkan penyalinan otomatis. Salin URL dari bilah alamat.',
    nextLearning: 'LANJUTKAN JALUR BELAJAR', continueExploring: 'Jelajahi lebih lanjut.',
    keepExploring: 'TERUS EKSPLORASI', shareKnowledge: 'Pengetahuan berkembang saat dibagikan.',
    exploreArticles: 'Jelajahi artikel', articleNotFound: 'Artikel tidak ditemukan',
    articleMissingDescription: 'Artikel mungkin dipindahkan atau belum tersedia.',
    pageNotFound: 'Halaman tidak ditemukan', pageMissingDescription: 'Alamat yang dibuka tidak tersedia.',
    backHome: 'Kembali ke beranda', language: 'Bahasa', languageName: 'Bahasa Indonesia',
    categoryAll: 'Semua', minutes: 'menit',
  },
  en: {
    home: 'Home', blog: 'Blog', topics: 'Topics', articles: 'Articles', github: 'GitHub',
    closeMenu: 'Close menu', openMenu: 'Open menu', skip: 'Skip to main content',
    footerTagline: 'Curiosity into engineering. Ideas into impact.', footerTopics: 'Topics',
    latestArticles: 'Latest articles', openSource: 'Open source', footerCopyright: 'Built to keep learning.',
    readArticle: 'Read article', readFeatured: 'Read featured insight',
    heroDescription: 'Explore software engineering, quality engineering, AI, and modern technology—from strong fundamentals to practical implementation.',
    exploreKnowledge: 'Explore the knowledge base', sourceCode: 'Source code',
    engineeringNotes: 'Engineering notes', coreDisciplines: 'Core disciplines', ideasExplore: 'Ideas to explore',
    topicsDescription: 'Technology moves fast. Strong engineering principles help us move with purpose.',
    softwareDescription: 'Architecture, TypeScript, clean code, and maintainable systems.',
    qaDescription: 'Automation, test strategy, CI/CD, and measurable quality.',
    aiDescription: 'AI experiments, evaluation, observability, and emerging technology.',
    featuredInsight: "EDITOR'S PICK", latestThinking: 'Latest thinking.',
    latestDescription: 'Practical engineering notes, guides, and lessons you can apply.',
    searchPlaceholder: 'Search topics, tools, concepts...', searchLabel: 'Search articles',
    all: 'All', found: 'articles found', clearSearch: 'Clear search',
    noResults: 'No matching results.', tryOther: 'Try another keyword or category.',
    buildDescription: 'Document the process. Share the lessons. Improve quality.',
    exploreCode: 'Explore the code', backAll: '← All articles', editorial: 'DreamEx Editorial',
    engineeringNote: 'Engineering note',
    noteDescription: 'Use this article as a starting point. Validate the approach against the context, risks, and needs of a real project.',
    topicsLabel: 'TOPICS', copied: 'Link copied', copyLink: 'Copy link',
    copyError: 'Your browser blocked automatic copying. Copy the URL from the address bar.',
    nextLearning: 'NEXT IN YOUR LEARNING PATH', continueExploring: 'Continue exploring.',
    keepExploring: 'KEEP EXPLORING', shareKnowledge: 'Knowledge grows when it is shared.',
    exploreArticles: 'Explore articles', articleNotFound: 'Article not found',
    articleMissingDescription: 'This article may have moved or is not available yet.',
    pageNotFound: 'Page not found', pageMissingDescription: 'The requested address is unavailable.',
    backHome: 'Back to home', language: 'Language', languageName: 'English',
    categoryAll: 'All', minutes: 'min',
  },
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return localStorage.getItem('dreamex-language') === 'en' ? 'en' : 'id'
    } catch {
      return 'id'
    }
  })

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    try {
      localStorage.setItem('dreamex-language', nextLanguage)
    } catch {
      // Language selection still works when storage is unavailable.
    }
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key: string) => messages[language][key] ?? messages.id[key] ?? key,
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
