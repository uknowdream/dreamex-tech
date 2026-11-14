export type ArticleCoverMeta = {
  src: string
  accent: string
  badgeEn: string
  badgeId: string
  altEn: string
  altId: string
}

export const ARTICLE_COVERS: Record<string, ArticleCoverMeta> = {
  'qa-automation-foundations': {
    src: '/images/cover-qa-automation.jpg',
    accent: '#10b981',
    badgeEn: 'QA & RELIABILITY',
    badgeId: 'QA & RELIABILITAS',
    altEn: 'Precision dark titanium cybernetic calibration matrix with emerald and cyan laser beams representing reliable QA automation.',
    altId: 'Matriks kalibrasi siber titanium gelap dengan sinar laser zamrud dan sian melambangkan fondasi QA automation.',
  },
  'typescript-for-maintainable-projects': {
    src: '/images/cover-software-arch.jpg',
    accent: '#38bdf8',
    badgeEn: 'TYPE ARCHITECTURE',
    badgeId: 'ARSITEKTUR TIPE',
    altEn: 'Isometric crystalline distributed software architecture nodes connected by luminous golden amber and cyan optical fibers.',
    altId: 'Node arsitektur perangkat lunak terdistribusi kristalin isometrik yang terhubung serat optik sian dan amber.',
  },
  'practical-ai-engineering': {
    src: '/images/cover-ai-eval.jpg',
    accent: '#8b5cf6',
    badgeEn: 'AI SYSTEMS',
    badgeId: 'SISTEM AI',
    altEn: 'Translucent obsidian glass prisms refracting violet and cyan neural data waves representing practical AI engineering.',
    altId: 'Prisma kaca obsidian transparan membiaskan gelombang data neural ungu dan sian untuk engineering AI praktis.',
  },
  'playwright-test-architecture': {
    src: '/images/cover-qa-automation.jpg',
    accent: '#06b6d4',
    badgeEn: 'E2E AUTOMATION',
    badgeId: 'OTOMASI E2E',
    altEn: 'Self-healing automated browser testing grid architecture illuminated in glowing emerald and cyan light.',
    altId: 'Arsitektur grid pengujian browser otomatis dengan sorotan cahaya zamrud dan sian.',
  },
  'secure-ci-cd-basics': {
    src: '/images/cover-software-arch.jpg',
    accent: '#f59e0b',
    badgeEn: 'DEVSECOPS & CI/CD',
    badgeId: 'DEVSECOPS & CI/CD',
    altEn: 'Zero-trust software supply chain nodes and fortified CI/CD infrastructure channels in obsidian studio lighting.',
    altId: 'Node rantai pasok perangkat lunak zero-trust dan saluran infrastruktur CI/CD di pencahayaan studio obsidian.',
  },
  'evaluating-ai-features': {
    src: '/images/cover-ai-eval.jpg',
    accent: '#c5ff70',
    badgeEn: 'AI EVALUATION',
    badgeId: 'EVALUASI AI',
    altEn: 'Multi-spectral AI evaluation glass prism splitting neural signals into measurable observability benchmarks.',
    altId: 'Prisma evaluasi AI multispektral yang memecah sinyal neural menjadi metrik observabilitas terukur.',
  },
}

const FALLBACK_COVER: ArticleCoverMeta = {
  src: '/images/hero-neural-core.jpg',
  accent: '#c5ff70',
  badgeEn: 'ENGINEERING',
  badgeId: 'REKAYASA',
  altEn: 'Futuristic quantum neural core inside luminous concentric orbital rings.',
  altId: 'Inti neural kuantum futuristik di dalam cincin orbit konsentris bercahaya.',
}

export function getArticleCover(slug: string, language: 'en' | 'id') {
  const meta = ARTICLE_COVERS[slug] ?? FALLBACK_COVER
  return {
    src: meta.src,
    accent: meta.accent,
    badge: language === 'en' ? meta.badgeEn : meta.badgeId,
    alt: language === 'en' ? meta.altEn : meta.altId,
  }
}
