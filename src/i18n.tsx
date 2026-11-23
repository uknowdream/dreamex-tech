/* eslint-disable react-refresh/only-export-components -- this module intentionally exports a provider and its hook. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Language = 'id' | 'en'

type Messages = Record<string, string>

const messages: Record<Language, Messages> = {
  id: {
    home: 'Beranda', blog: 'Blog', topics: 'Topik', articles: 'Artikel', github: 'GitHub',
    heroEyebrow: 'AUTONOMOUS AI ENGINEERING OS · v13.0', heroLine1: 'Rekayasa dengan tujuan.', heroLine2: 'Skalakan dengan AI.', heroLine3: 'Rilis penuh presisi.',
    topicsEyebrow: '01 — PILAR KAPABILITAS', topicsHeading: 'Ide yang layak', topicsHeadingAccent: 'diarsitekturkan.', featuredHeading: 'SOROTAN RISET', articlesEyebrow: '02 — ARSIP PENGETAHUAN', articlesHeading: 'Arsitektur &', articlesHeadingAccent: 'wawasan terbaru.',
    trustKnowledge: 'AI-FIRST ARCHITECTURE', trustQuality: 'SELF-HEALING QA', trustEngineering: 'SPEC EXECUTABLE BA', trustAI: 'ZERO-TRUST TELEMETRY',
    softwareTopic: 'Software Engineering', qaTopic: 'Quality Engineering', aiTopic: 'AI & Teknologi Baru',
    terminalComment: '// mesin neural aktif', terminalLive: 'NEURAL AKTIF', terminalPipeline: 'mesin', terminalReady: 'siap sintesis',
    visualChipQuality: 'Arsitektur Neural Zero-Trust', visualChipCuriosity: 'Mesin AI Multi-Peran', visualCaption: '01 / KOKPIT NEURAL AI', visualIterate: 'OTOMATISASI CERDAS', buildInPublic: 'BERKEMBANG SECARA TERBUKA',
    closeMenu: 'Tutup menu', openMenu: 'Buka menu', skip: 'Lewati ke konten utama',
    footerTagline: 'Global AI Operating System untuk IT Architecture, QA Automation, Business Analysis & Delivery.', footerTopics: 'Pilar Utama',
    latestArticles: 'Riset & Artikel', openSource: 'Kode Terbuka', footerCopyright: 'Arsitektur perangkat lunak modern untuk tim teknik berstandar internasional.',
    readArticle: 'Baca kajian teknis', readFeatured: 'Baca sorotan arsitektur',
    heroDescription: 'Satu platform AI spasial untuk arsitektur perangkat lunak, otomasi QA self-healing, spesifikasi BA/Gherkin, dan tata kelola PM Jira—berjalan privat 100% di klien tanpa vendor lock-in.',
    exploreKnowledge: 'Jelajahi Rilis & Riset', sourceCode: 'GitHub',
    engineeringNotes: 'Suite Platform AI & IT', coreDisciplines: 'Disiplin Peran Utama', ideasExplore: 'Verifikasi Client-Sovereign',
    topicsDescription: 'Rekayasa cepat membutuhkan landasan sistem yang presisi untuk IT, QA, Business Analyst, dan Product Delivery.',
    softwareDescription: 'Pola arsitektur terdistribusi, batas keandalan USL, TypeScript modern, dan kontrak runtime berketahanan tinggi.',
    qaDescription: 'Otomasi test self-healing, matrix ketertelusuran risiko, kontrak API, dan gate rilis CI/CD berbasis bukti.',
    aiDescription: 'Orkestrasi agentik multi-peran, evaluasi deterministik LLM, observability telemetri, dan guardrails zero-trust.',
    featuredInsight: 'INSIGHT PILIHAN', latestThinking: 'Pemikiran terbaru.',
    latestDescription: 'Catatan, panduan, dan pelajaran engineering yang bisa diterapkan.',
    searchPlaceholder: 'Cari topik, tools, konsep...', searchLabel: 'Cari artikel',
    all: 'Semua', found: 'artikel ditemukan', clearSearch: 'Hapus pencarian',
    noResults: 'Belum ada hasil yang cocok.', tryOther: 'Coba kata kunci atau kategori lain.',
    buildDescription: 'Synthesa ide, eksekusi spesifikasi terukur, dan kirim rilis berstandar global tanpa kebisingan.',
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
    heroEyebrow: 'AUTONOMOUS AI ENGINEERING OS · v13.0', heroLine1: 'Engineer with intent.', heroLine2: 'Scale with intelligence.', heroLine3: 'Ship with certainty.',
    topicsEyebrow: '01 — CORE CAPABILITIES', topicsHeading: 'Ideas worth', topicsHeadingAccent: 'architecting.', featuredHeading: 'RESEARCH SPOTLIGHT', articlesEyebrow: '02 — ARCHITECTURE & FIELD NOTES', articlesHeading: 'Engineering', articlesHeadingAccent: 'intelligence.',
    trustKnowledge: 'AI-FIRST ARCHITECTURE', trustQuality: 'SELF-HEALING QA', trustEngineering: 'EXECUTABLE SPECS', trustAI: 'ZERO-TRUST RUNTIME',
    softwareTopic: 'Software Engineering', qaTopic: 'Quality Engineering', aiTopic: 'AI & Emerging Tech',
    terminalComment: '// neural engine online', terminalLive: 'NEURAL ACTIVE', terminalPipeline: 'engine', terminalReady: 'synthesis ready',
    visualChipQuality: 'Zero-Trust Neural Guardrails', visualChipCuriosity: 'Multi-Role AI Engine', visualCaption: '01 / NEURAL AI COCKPIT', visualIterate: 'INTELLIGENT AUTOMATION', buildInPublic: 'BUILD IN PUBLIC',
    closeMenu: 'Close menu', openMenu: 'Open menu', skip: 'Skip to main content',
    footerTagline: 'Global AI Operating System for Software Architecture, Self-Healing QA, BA Specs & Delivery.', footerTopics: 'Capabilities',
    latestArticles: 'Research & Logs', openSource: 'Open Source', footerCopyright: 'Engineered for high-velocity global software teams.',
    readArticle: 'Read technical study', readFeatured: 'Inspect architecture note',
    heroDescription: 'One spatial AI operating system uniting distributed software architecture, self-healing QA automation, executable BA specs, and Jira delivery intelligence—100% client-sovereign.',
    exploreKnowledge: 'Explore Research & Specs', sourceCode: 'GitHub',
    engineeringNotes: 'Integrated AI & IT suites', coreDisciplines: 'IT, QA, BA & PM pillars', ideasExplore: 'Client-sovereign runtime',
    topicsDescription: 'Velocity demands architectural rigor. Unify design, verification, requirements, and release intelligence in one system.',
    softwareDescription: 'Distributed architectures, Universal Scalability Law limits, strict TypeScript contracts, and resilient outbox patterns.',
    qaDescription: 'Self-healing browser verification, risk traceability matrices, schema assertions, and evidence-backed CI release gates.',
    aiDescription: 'Multi-role agentic orchestration, deterministic LLM evaluation harnesses, observability traces, and zero-trust guardrails.',
    featuredInsight: "EDITOR'S PICK", latestThinking: 'Latest thinking.',
    latestDescription: 'Practical engineering notes, guides, and lessons you can apply.',
    searchPlaceholder: 'Search topics, tools, concepts...', searchLabel: 'Search articles',
    all: 'All', found: 'articles found', clearSearch: 'Clear search',
    noResults: 'No matching results.', tryOther: 'Try another keyword or category.',
    buildDescription: 'Receive high-signal architecture blueprints, self-healing QA patterns, and AI operating system releases.',
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
      const savedLanguage = localStorage.getItem('dreamex-language')
      if (savedLanguage === 'id' || savedLanguage === 'en') return savedLanguage
      return 'en'
    } catch {
      return 'en'
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
