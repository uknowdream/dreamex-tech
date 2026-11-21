export type ArticleSectionMeta = {
  id: string
  heading: string
  startParagraphIndex: number
}

export type ArticleCodeSnippet = {
  language: string
  filename: string
  caption: string
  code: string
}

export type ArticleEditorialEnhancement = {
  author: string
  authorRole: string
  updatedAt: string
  sections: ArticleSectionMeta[]
  snippet: ArticleCodeSnippet
}

export const articleEnhancementsEn: Record<string, ArticleEditorialEnhancement> = {
  'qa-automation-foundations': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Quality Engineering & Release Verification',
    updatedAt: '2026-10-29',
    sections: [
      { id: 'critical-path-prioritization', heading: '1. Fast, Actionable Feedback Loops', startParagraphIndex: 0 },
      { id: 'deterministic-test-signals', heading: '2. Deterministic Critical-Path Selection', startParagraphIndex: 1 },
      { id: 'ci-feedback-loops', heading: '3. Separating Fast Checks from Heavy Suites in CI', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'tests/e2e/critical-path.spec.ts',
      caption: 'Role-based Playwright assertion verifying user-visible state without brittle CSS selectors.',
      code: `import { expect, test } from '@playwright/test'

test('critical path: user can search and open an engineering workbench', async ({ page }) => {
  await page.goto('/workspace')
  await expect(page.getByRole('main')).toBeVisible()
  const search = page.getByRole('textbox', { name: /search workspace tools/i })
  await search.fill('OpenAPI')
  await expect(page.getByRole('link', { name: /API Playground/i })).toBeVisible()
})`,
    },
  },
  'typescript-for-maintainable-projects': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Type Systems & Platform Architecture',
    updatedAt: '2026-10-31',
    sections: [
      { id: 'domain-modeling-with-unions', heading: '1. Modeling Domain Contracts Instead of Noise', startParagraphIndex: 0 },
      { id: 'runtime-boundary-validation', heading: '2. Explicit Module Boundaries & Runtime Narrowing', startParagraphIndex: 1 },
      { id: 'pragmatic-type-ergonomics', heading: '3. Pairing Types with Runtime Tests & Review', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/contracts/apiResponse.ts',
      caption: 'Discriminated union with exhaustive narrowing at the API boundary.',
      code: `export type ApiResult<T> =
  | { ok: true; data: T; revision: number }
  | { ok: false; code: 'unauthorized' | 'conflict' | 'rate_limited'; retryAfterSeconds?: number }

export function formatApiOutcome<T>(result: ApiResult<T>, onSuccess: (data: T) => string): string {
  if (result.ok) return onSuccess(result.data)
  return \`Request failed (\${result.code})\`
}`,
    },
  },
  'practical-ai-engineering': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Applied AI & Developer Productivity',
    updatedAt: '2026-10-30',
    sections: [
      { id: 'representative-evaluation-sets', heading: '1. Representative Evaluation Sets & Acceptance Criteria', startParagraphIndex: 0 },
      { id: 'adversarial-and-edge-inputs', heading: '2. Testing Ambiguous, Empty, and Adversarial Inputs', startParagraphIndex: 1 },
      { id: 'telemetry-and-privacy-hygiene', heading: '3. Model Versioning, Latency & Privacy-Safe Observability', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/ai/evalGuard.ts',
      caption: 'Deterministic schema and latency gate wrapping an AI feature response.',
      code: `export interface ModelEvalEnvelope {
  modelVersion: string
  latencyMs: number
  confidence: 'high' | 'abstain'
  summary: string
}

export function validateModelEnvelope(payload: ModelEvalEnvelope, maxLatencyMs = 2500): boolean {
  if (!payload.modelVersion || payload.latencyMs > maxLatencyMs) return false
  return payload.confidence === 'abstain' || payload.summary.trim().length > 0
}`,
    },
  },
  'playwright-test-architecture': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Browser Automation & E2E Infrastructure',
    updatedAt: '2026-11-01',
    sections: [
      { id: 'user-facing-locators', heading: '1. High-Impact Journeys & Resilient Semantic Locators', startParagraphIndex: 0 },
      { id: 'state-isolation-and-fixtures', heading: '2. State Isolation, Fixtures & Proportional Page Objects', startParagraphIndex: 2 },
      { id: 'actionable-ci-diagnostics', heading: '3. Actionable CI Traces & Parallel Determinism', startParagraphIndex: 4 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'playwright.config.ts',
      caption: 'Playwright configuration isolating desktop and mobile projects with trace capture on retry.',
      code: `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
})`,
    },
  },
  'secure-ci-cd-basics': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Application Security & DevSecOps',
    updatedAt: '2026-11-01',
    sections: [
      { id: 'pipeline-least-privilege', heading: '1. Treating CI/CD as Attack Surface & Least Privilege', startParagraphIndex: 0 },
      { id: 'secrets-and-supply-chain', heading: '2. Secret Hygiene, Pinned Actions & SBOM Provenance', startParagraphIndex: 2 },
      { id: 'deployment-separation', heading: '3. Separating PR Validation from Privileged Deployments', startParagraphIndex: 4 },
    ],
    snippet: {
      language: 'yaml',
      filename: '.github/workflows/ci-least-privilege.yml',
      caption: 'Explicit read-only GITHUB_TOKEN permissions and pinned dependency audit in GitHub Actions.',
      code: `permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run verify:security
      - run: npm audit --audit-level=high`,
    },
  },
  'evaluating-ai-features': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'AI Quality & Production Observability',
    updatedAt: '2026-11-01',
    sections: [
      { id: 'repeatable-eval-datasets', heading: '1. Representative Datasets & Risk-Aligned Rubrics', startParagraphIndex: 0 },
      { id: 'baseline-regression-gates', heading: '2. Baseline Comparisons & Deterministic Checks', startParagraphIndex: 3 },
      { id: 'production-feedback-loop', heading: '3. Privacy-Safe Production Monitoring & Dataset Updates', startParagraphIndex: 5 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/ai/regressionGate.ts',
      caption: 'Comparing candidate evaluation pass rates and critical safety failures against a pinned baseline.',
      code: `export interface EvalRunSummary {
  passRate: number
  criticalSafetyFailures: number
  p95LatencyMs: number
}

export function passesRegressionGate(baseline: EvalRunSummary, candidate: EvalRunSummary): boolean {
  if (candidate.criticalSafetyFailures > 0) return false
  return candidate.passRate >= baseline.passRate - 0.01 && candidate.p95LatencyMs <= baseline.p95LatencyMs * 1.15
}`,
    },
  },
  'api-contract-governance-idempotency': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Distributed Systems & API Reliability',
    updatedAt: '2026-11-10',
    sections: [
      { id: 'idempotency-mutation-safety', heading: '1. Idempotency Keys for Network-Safe Retries', startParagraphIndex: 0 },
      { id: 'transactional-outbox-sync', heading: '2. Transactional Outbox & Consumer Deduplication', startParagraphIndex: 1 },
      { id: 'openapi-breaking-guards', heading: '3. Automated OpenAPI Breaking-Change Detection', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/settlement/idempotencyGuard.ts',
      caption: 'Atomic idempotency check preventing duplicate financial writes across retried HTTP requests.',
      code: `export async function executeIdempotent<T>(
  store: { acquire(key: string): Promise<'acquired' | 'duplicate'> },
  idempotencyKey: string,
  operation: () => Promise<T>,
): Promise<{ deduplicated: boolean; result?: T }> {
  if ((await store.acquire(idempotencyKey)) === 'duplicate') {
    return { deduplicated: true }
  }
  return { deduplicated: false, result: await operation() }
}`,
    },
  },
  'requirements-traceability-jira-adf': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Business Analysis & QA Orchestration',
    updatedAt: '2026-11-10',
    sections: [
      { id: 'bridging-spec-and-test', heading: '1. Closing the BRD-to-Verification Gap', startParagraphIndex: 0 },
      { id: 'gherkin-single-source', heading: '2. Compiling Gherkin BDD into Traceability Matrices', startParagraphIndex: 1 },
      { id: 'jira-adf-sla-automation', heading: '3. Automated Jira REST v3 ADF Payloads & SLA Scoring', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'gherkin',
      filename: 'specs/settlement-traceability.feature',
      caption: 'Executable Gherkin scenario linked to BRD and QA regression coverage.',
      code: `Feature: Idempotent Payment Settlement @BRD-PAY-02 @ENT-418
  Scenario: Reject duplicate settlement replay within concurrency window
    Given a settled transaction with idempotency key "idem_9f82a10c7b"
    When the client retries POST /api/v2/orders/settle
    Then the ledger balance remains unchanged and HTTP 200 cached result is returned`,
    },
  },
  'monte-carlo-forecasting-delivery': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Program Delivery & Engineering Physics',
    updatedAt: '2026-11-10',
    sections: [
      { id: 'beyond-average-velocity', heading: '1. Why Mean Velocity Hides Delivery Variance', startParagraphIndex: 0 },
      { id: 'probabilistic-sprint-curves', heading: '2. Running 10,000-Trial P50/P85/P95 Simulations', startParagraphIndex: 1 },
      { id: 'earned-value-early-warning', heading: '3. Combining SPI/CPI Early Warnings with Buffers', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/pm/monteCarloPercentile.ts',
      caption: 'Selecting objective delivery percentiles across simulated sprint completion counts.',
      code: `export function sprintPercentile(sortedTrials: number[], percentile: number): number {
  const index = Math.min(sortedTrials.length - 1, Math.floor((sortedTrials.length - 1) * percentile))
  return sortedTrials[index] ?? 0
}`,
    },
  },
  'realtime-collaboration-local-first': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Distributed State & Real-Time Architecture',
    updatedAt: '2026-11-22',
    sections: [
      { id: 'local-first-resilience', heading: '1. Local-First State as the Source of Speed', startParagraphIndex: 0 },
      { id: 'broadcast-channel-tabs', heading: '2. Sub-5ms Multi-Tab Sync with Echo Guards', startParagraphIndex: 1 },
      { id: 'optimistic-revision-409', heading: '3. Optimistic Revision Checks & Shareable Fallbacks', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/sync/optimisticRoomPush.ts',
      caption: 'Optimistic revision check preventing silent overwrites across concurrent collaborators.',
      code: `export async function pushBoardSnapshot(room: string, expectedRev: number, snapshot: unknown) {
  const res = await fetch(\`/api/jira-sync?room=\${encodeURIComponent(room)}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRev, snapshot }),
  })
  if (res.status === 409) throw new Error('Revision conflict: pull latest remote state first')
  return res.json() as Promise<{ ok: boolean; rev: number; driver: string }>
}`,
    },
  },
  'zero-vulnerability-dependency-upgrades': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Supply Chain Security & Release Engineering',
    updatedAt: '2026-11-22',
    sections: [
      { id: 'production-audit-triage', heading: '1. Auditing Production Trees & Root Packages', startParagraphIndex: 0 },
      { id: 'staged-verification-gates', heading: '2. Automated Verification Gates on Every Upgrade', startParagraphIndex: 2 },
      { id: 'bundle-budget-discipline', heading: '3. Code-Splitting & Enforced Gzip Budgets', startParagraphIndex: 3 },
    ],
    snippet: {
      language: 'bash',
      filename: 'scripts/release-gate.sh',
      caption: 'Zero-vulnerability production dependency gate paired with typecheck, build, and SEO checks.',
      code: `npm audit --omit=dev --audit-level=moderate
npm run typecheck && npm run lint
npm run verify:i18n && npm run verify:security
npm run test:api && npm run build && npm run verify:build`,
    },
  },
  'conversion-architecture-engineering-sites': {
    author: 'DreamEx Engineering Editorial',
    authorRole: 'Product Engineering & Trust Architecture',
    updatedAt: '2026-11-22',
    sections: [
      { id: 'focused-conversion-path', heading: '1. Traceable Demo Intake with Server Validation', startParagraphIndex: 0 },
      { id: 'measurable-case-studies', heading: '2. Outcome-Driven Case Studies Over Buzzwords', startParagraphIndex: 2 },
      { id: 'public-changelog-trust', heading: '3. Building Long-Term Trust with a Public Changelog', startParagraphIndex: 3 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'api/contact-reference.ts',
      caption: 'Generating a deterministic traceable reference ID while hashing prospect email at rest.',
      code: `import { createHash } from 'node:crypto'

export function buildInquiryReceipt(email: string) {
  const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16)
  const referenceId = \`DX-REQ-\${createHash('sha256').update(\`\${emailHash}:\${Date.now()}\`).digest('hex').slice(0, 8).toUpperCase()}\`
  return { referenceId, emailHash }
}`,
    },
  },
}

export const articleEnhancementsId: Record<string, ArticleEditorialEnhancement> = {
  'qa-automation-foundations': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Quality Engineering & Verifikasi Rilis',
    updatedAt: '2026-10-29',
    sections: [
      { id: 'critical-path-prioritization', heading: '1. Umpan Balik Cepat & Dapat Ditindaklanjuti', startParagraphIndex: 0 },
      { id: 'deterministic-test-signals', heading: '2. Memilih Alur Kritis yang Deterministik', startParagraphIndex: 1 },
      { id: 'ci-feedback-loops', heading: '3. Memisahkan Pemeriksaan Cepat di Pipeline CI', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'tests/e2e/critical-path.spec.ts',
      caption: 'Assertion Playwright berbasis role yang memverifikasi state terlihat pengguna tanpa selector CSS rapuh.',
      code: articleEnhancementsEn['qa-automation-foundations'].snippet.code,
    },
  },
  'typescript-for-maintainable-projects': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Sistem Tipe & Arsitektur Platform',
    updatedAt: '2026-10-31',
    sections: [
      { id: 'domain-modeling-with-unions', heading: '1. Memodelkan Kontrak Domain secara Eksplisit', startParagraphIndex: 0 },
      { id: 'runtime-boundary-validation', heading: '2. Batas Modul & Validasi Data Eksternal saat Runtime', startParagraphIndex: 1 },
      { id: 'pragmatic-type-ergonomics', heading: '3. Melengkapi Sistem Tipe dengan Unit Test & Review', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/contracts/apiResponse.ts',
      caption: 'Discriminated union dengan penyempitan tipe menyeluruh di batas respons API.',
      code: articleEnhancementsEn['typescript-for-maintainable-projects'].snippet.code,
    },
  },
  'practical-ai-engineering': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'AI Terapan & Produktivitas Developer',
    updatedAt: '2026-10-30',
    sections: [
      { id: 'representative-evaluation-sets', heading: '1. Kumpulan Evaluasi Representatif & Kriteria Penerimaan', startParagraphIndex: 0 },
      { id: 'adversarial-and-edge-inputs', heading: '2. Menguji Input Ambigu, Kosong, dan Berbahaya', startParagraphIndex: 1 },
      { id: 'telemetry-and-privacy-hygiene', heading: '3. Versi Model, Latensi & Observability Aman Privasi', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/ai/evalGuard.ts',
      caption: 'Gerbang skema dan latensi deterministik yang memvalidasi respons fitur AI.',
      code: articleEnhancementsEn['practical-ai-engineering'].snippet.code,
    },
  },
  'playwright-test-architecture': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Otomasi Browser & Infrastruktur E2E',
    updatedAt: '2026-11-01',
    sections: [
      { id: 'user-facing-locators', heading: '1. Perjalanan Kritis & Locator Semantik yang Tangguh', startParagraphIndex: 0 },
      { id: 'state-isolation-and-fixtures', heading: '2. Isolasi State, Fixture & Page Object Proporsional', startParagraphIndex: 2 },
      { id: 'actionable-ci-diagnostics', heading: '3. Diagnostik Trace CI & Determinisme Paralel', startParagraphIndex: 4 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'playwright.config.ts',
      caption: 'Konfigurasi Playwright yang mengisolasi proyek desktop dan mobile dengan perekaman trace saat retry.',
      code: articleEnhancementsEn['playwright-test-architecture'].snippet.code,
    },
  },
  'secure-ci-cd-basics': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Keamanan Aplikasi & DevSecOps',
    updatedAt: '2026-11-01',
    sections: [
      { id: 'pipeline-least-privilege', heading: '1. Pipeline sebagai Permukaan Serangan & Least Privilege', startParagraphIndex: 0 },
      { id: 'secrets-and-supply-chain', heading: '2. Pengelolaan Secret, Pinning Action & Provenance SBOM', startParagraphIndex: 2 },
      { id: 'deployment-separation', heading: '3. Memisahkan Validasi PR dari Job Deployment', startParagraphIndex: 4 },
    ],
    snippet: {
      language: 'yaml',
      filename: '.github/workflows/ci-least-privilege.yml',
      caption: 'Izin GITHUB_TOKEN read-only eksplisit dan audit dependensi tersemat di GitHub Actions.',
      code: articleEnhancementsEn['secure-ci-cd-basics'].snippet.code,
    },
  },
  'evaluating-ai-features': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Kualitas AI & Observability Produksi',
    updatedAt: '2026-11-01',
    sections: [
      { id: 'repeatable-eval-datasets', heading: '1. Dataset Evaluasi Representatif & Rubrik Risiko', startParagraphIndex: 0 },
      { id: 'baseline-regression-gates', heading: '2. Perbandingan Baseline & Pemeriksaan Deterministik', startParagraphIndex: 3 },
      { id: 'production-feedback-loop', heading: '3. Pemantauan Produksi Aman Privasi & Pembaruan Dataset', startParagraphIndex: 5 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/ai/regressionGate.ts',
      caption: 'Membandingkan pass rate kandidat evaluasi dan kegagalan keamanan kritis terhadap baseline.',
      code: articleEnhancementsEn['evaluating-ai-features'].snippet.code,
    },
  },
  'api-contract-governance-idempotency': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Sistem Terdistribusi & Reliabilitas API',
    updatedAt: '2026-11-10',
    sections: [
      { id: 'idempotency-mutation-safety', heading: '1. Idempotency Key untuk Retry Aman', startParagraphIndex: 0 },
      { id: 'transactional-outbox-sync', heading: '2. Transactional Outbox & Deduplikasi Event', startParagraphIndex: 1 },
      { id: 'openapi-breaking-guards', heading: '3. Deteksi Otomatis Perubahan Breaking OpenAPI', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/settlement/idempotencyGuard.ts',
      caption: 'Pemeriksaan idempotency atomik untuk mencegah penulisan ganda akibat HTTP retry.',
      code: articleEnhancementsEn['api-contract-governance-idempotency'].snippet.code,
    },
  },
  'requirements-traceability-jira-adf': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Analisis Bisnis & Orkestrasi QA',
    updatedAt: '2026-11-10',
    sections: [
      { id: 'bridging-spec-and-test', heading: '1. Menutup Celah BRD ke Skenario Pengujian', startParagraphIndex: 0 },
      { id: 'gherkin-single-source', heading: '2. Mengkompilasi Gherkin BDD ke Matriks RTM', startParagraphIndex: 1 },
      { id: 'jira-adf-sla-automation', heading: '3. Payload Jira REST v3 ADF & Penilaian SLA', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'gherkin',
      filename: 'specs/settlement-traceability.feature',
      caption: 'Skenario Gherkin terukur yang tertaut langsung ke baris BRD dan cakupan regresi QA.',
      code: articleEnhancementsEn['requirements-traceability-jira-adf'].snippet.code,
    },
  },
  'monte-carlo-forecasting-delivery': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Tata Kelola Delivery & Fisika Rekayasa',
    updatedAt: '2026-11-10',
    sections: [
      { id: 'beyond-average-velocity', heading: '1. Mengapa Rata-Rata Velocity Menutupi Variabilitas', startParagraphIndex: 0 },
      { id: 'probabilistic-sprint-curves', heading: '2. Simulasi 10.000 Iterasi P50/P85/P95', startParagraphIndex: 1 },
      { id: 'earned-value-early-warning', heading: '3. Memadukan Peringatan Dini SPI/CPI & Buffer', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/pm/monteCarloPercentile.ts',
      caption: 'Pemilihan persentil probabilitas penyelesaian sprint secara objektif.',
      code: articleEnhancementsEn['monte-carlo-forecasting-delivery'].snippet.code,
    },
  },
  'realtime-collaboration-local-first': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'State Terdistribusi & Arsitektur Real-Time',
    updatedAt: '2026-11-22',
    sections: [
      { id: 'local-first-resilience', heading: '1. State Local-First sebagai Sumber Kecepatan', startParagraphIndex: 0 },
      { id: 'broadcast-channel-tabs', heading: '2. Sinkronisasi Multi-Tab <5ms dengan Echo Guard', startParagraphIndex: 1 },
      { id: 'optimistic-revision-409', heading: '3. Revisi Optimistik 409 & Tautan Cadangan', startParagraphIndex: 2 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'src/sync/optimisticRoomPush.ts',
      caption: 'Pemeriksaan revisi optimistik untuk mencegah penulisan ganda oleh kolaborator bersamaan.',
      code: articleEnhancementsEn['realtime-collaboration-local-first'].snippet.code,
    },
  },
  'zero-vulnerability-dependency-upgrades': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Keamanan Rantai Pasok & Release Engineering',
    updatedAt: '2026-11-22',
    sections: [
      { id: 'production-audit-triage', heading: '1. Audit Dependensi Produksi & Paket Akar', startParagraphIndex: 0 },
      { id: 'staged-verification-gates', heading: '2. Gerbang Verifikasi Otomatis di Setiap Upgrade', startParagraphIndex: 2 },
      { id: 'bundle-budget-discipline', heading: '3. Code-Splitting & Disiplin Anggaran Gzip', startParagraphIndex: 3 },
    ],
    snippet: {
      language: 'bash',
      filename: 'scripts/release-gate.sh',
      caption: 'Gerbang audit nol kerentanan yang dipadukan dengan typecheck, build, dan validasi SEO.',
      code: articleEnhancementsEn['zero-vulnerability-dependency-upgrades'].snippet.code,
    },
  },
  'conversion-architecture-engineering-sites': {
    author: 'Redaksi Engineering DreamEx',
    authorRole: 'Product Engineering & Arsitektur Kepercayaan',
    updatedAt: '2026-11-22',
    sections: [
      { id: 'focused-conversion-path', heading: '1. Alur Demo Terlacak dengan Validasi Server', startParagraphIndex: 0 },
      { id: 'measurable-case-studies', heading: '2. Studi Kasus Berbasis Metrik Nyata', startParagraphIndex: 2 },
      { id: 'public-changelog-trust', heading: '3. Membangun Kepercayaan Jangka Panjang via Changelog', startParagraphIndex: 3 },
    ],
    snippet: {
      language: 'typescript',
      filename: 'api/contact-reference.ts',
      caption: 'Menghasilkan ID referensi deterministik sambil melakukan hash email calon klien.',
      code: articleEnhancementsEn['conversion-architecture-engineering-sites'].snippet.code,
    },
  },
}
