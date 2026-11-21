export type ArticleCoverMeta = {
  src: string
  accent: string
  badgeEn: string
  badgeId: string
  altEn: string
  altId: string
}

const toWebp = (jpgPath: string) => jpgPath.replace(/\.jpg$/i, '.webp')

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
    src: '/images/cover-playwright-e2e.jpg',
    accent: '#06b6d4',
    badgeEn: 'E2E AUTOMATION',
    badgeId: 'OTOMASI E2E',
    altEn: 'Isometric constellation of translucent obsidian browser frames aligned with emerald and cyan Playwright verification beams.',
    altId: 'Konstelasi isometrik bingkai browser kaca obsidian dengan sinar laser verifikasi Playwright berwarna zamrud dan sian.',
  },
  'secure-ci-cd-basics': {
    src: '/images/cover-cicd-pipeline.jpg',
    accent: '#f59e0b',
    badgeEn: 'DEVSECOPS & CI/CD',
    badgeId: 'DEVSECOPS & CI/CD',
    altEn: 'Brushed titanium automated CI/CD optical rail passing crystalline build modules through amber-gold cryptographic shield rings.',
    altId: 'Rel optik pipeline CI/CD titanium gelap dengan cincin perisai kriptografi amber dan sian.',
  },
  'evaluating-ai-features': {
    src: '/images/cover-ai-benchmarks.jpg',
    accent: '#c5ff70',
    badgeEn: 'AI EVALUATION',
    badgeId: 'EVALUASI AI',
    altEn: 'Precision obsidian optical spectrograph splitting ultraviolet and electric-lime AI evaluation waveforms across crystal gauges.',
    altId: 'Spektrograf optik obsidian presisi memecah gelombang evaluasi AI berwarna ultraviolet dan hijau neon.',
  },
  'api-contract-governance-idempotency': {
    src: '/images/cover-api-idempotency.jpg',
    accent: '#38bdf8',
    badgeEn: 'API GOVERNANCE',
    badgeId: 'TATA KELOLA API',
    altEn: 'Interlocking dark sapphire and frosted obsidian vault blocks connected by atomic silver-blue optical transaction channels.',
    altId: 'Blok brankas safir gelap dan obsidian saling mengunci dengan saluran transaksi optik atomik biru-perak.',
  },
  'requirements-traceability-jira-adf': {
    src: '/images/cover-ba-pm-jira.jpg',
    accent: '#10b981',
    badgeEn: 'BA · QA · JIRA',
    badgeId: 'BA · QA · JIRA',
    altEn: 'Structured precision verification grid linking business requirements matrices directly to Jira automation flows.',
    altId: 'Grid verifikasi presisi yang menghubungkan matriks kebutuhan bisnis langsung ke alur otomasi Jira.',
  },
  'monte-carlo-forecasting-delivery': {
    src: '/images/cover-monte-carlo.jpg',
    accent: '#8b5cf6',
    badgeEn: 'DELIVERY PHYSICS',
    badgeId: 'ESTIMASI RILIS',
    altEn: 'Sculptural 3D smoked-quartz probability bell-curve wave glowing with violet, cyan, and lime edges above a dark metallic grid.',
    altId: 'Gelombang kurva probabilitas 3D dari kaca kuarsa gelap bercahaya ungu, sian, dan hijau neon di atas grid metalik.',
  },
  'realtime-collaboration-local-first': {
    src: '/images/showcase-neural-mesh.jpg',
    accent: '#38bdf8',
    badgeEn: 'REAL-TIME SYNC',
    badgeId: 'SINKRON REAL-TIME',
    altEn: 'Luminous neural mesh of connected nodes representing real-time local-first collaboration across devices.',
    altId: 'Jaringan neural bercahaya dengan node terhubung yang melambangkan kolaborasi real-time lintas perangkat.',
  },
  'zero-vulnerability-dependency-upgrades': {
    src: '/images/cover-security-vault.jpg',
    accent: '#10b981',
    badgeEn: 'SUPPLY CHAIN',
    badgeId: 'RANTAI PASOK',
    altEn: 'Zero-trust security vault visual representing safe dependency upgrades with zero vulnerabilities.',
    altId: 'Visual brankas keamanan zero-trust yang melambangkan upgrade dependensi aman tanpa kerentanan.',
  },
  'conversion-architecture-engineering-sites': {
    src: '/images/cover-conversion-growth.jpg',
    accent: '#f59e0b',
    badgeEn: 'GROWTH ENGINEERING',
    badgeId: 'GROWTH ENGINEERING',
    altEn: 'Ascending brushed obsidian monolith steps bridged by luminous gold and cyan light-paths converging on a crystalline core.',
    altId: 'Tangga monolit obsidian gelap yang dihubungkan jalur cahaya emas dan sian menuju inti kristal bercahaya.',
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
    webpSrc: toWebp(meta.src),
    accent: meta.accent,
    badge: language === 'en' ? meta.badgeEn : meta.badgeId,
    alt: language === 'en' ? meta.altEn : meta.altId,
  }
}
