import { Suspense, lazy, useMemo, useState } from 'react'
import {
  Activity,
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  FolderArchive,
  Laptop,
  Play,
  RotateCcw,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Workflow,
  Zap,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from './i18n'
import { useProjectContextBus } from './projectContextBus'
import { useTheme } from './themeUtils'
import { buildProductionStarterZip } from './zipBuilder'
import './AiPrototypeStudio.css'

const NeuralAiByokDrawer = lazy(() => import('./NeuralAiByokDrawer'))

type BlueprintId = 'fintech' | 'ai-gateway' | 'clinical-fhir' | 'edge-commerce'
type DeviceViewport = 'desktop' | 'tablet' | 'mobile'
type InspectorTab = 'live' | 'code' | 'playwright' | 'topology'
type RbacRole = 'admin' | 'operator' | 'auditor'
type ModelRouting = 'hybrid' | 'frontier' | 'flash'

interface AgentStepSpec {
  id: string
  code: string
  roleEn: string
  roleId: string
  summaryEn: string
  summaryId: string
  deliverableEn: string
  deliverableId: string
}

interface PrototypeBlueprint {
  id: BlueprintId
  tagEn: string
  tagId: string
  titleEn: string
  titleId: string
  descEn: string
  descId: string
  previewUrl: string
  baseLatencyMs: number
  uslCeilingNodes: number
  defaultPromptEn: string
  defaultPromptId: string
  actionLabelEn: string
  actionLabelId: string
  agents: AgentStepSpec[]
}

const BLUEPRINTS: Record<BlueprintId, PrototypeBlueprint> = {
  fintech: {
    id: 'fintech',
    tagEn: 'FINTECH · ZERO-DRIFT LEDGER',
    tagId: 'FINTECH · LEDGER IDEMPOTEN',
    titleEn: 'Autonomous Settlement & Fraud Shield',
    titleId: 'Settlement Otonom & Perisai Fraud AI',
    descEn: 'SHA-256 idempotency, real-time ML risk scoring, and dual-control maker-checker UI.',
    descId: 'Idempotensi SHA-256, skor risiko ML real-time, dan antarmuka maker-checker.',
    previewUrl: 'https://sandbox.dreamex.os/fintech/settlement-guard',
    baseLatencyMs: 14,
    uslCeilingNodes: 38,
    defaultPromptEn: 'Idempotent high-value wire settlement with real-time anomaly scoring & maker-checker gate',
    defaultPromptId: 'Settlement transfer bernilai tinggi idempoten dengan deteksi anomali & persetujuan ganda',
    actionLabelEn: 'Execute Settlement Batch',
    actionLabelId: 'Eksekusi Batch Settlement',
    agents: [
      {
        id: 'spec',
        code: '01',
        roleEn: 'Intent & BA Spec Agent',
        roleId: 'Agen Spesifikasi & BA',
        summaryEn: 'Compiles dual-control settlement invariants into executable Gherkin rules and audit fields.',
        summaryId: 'Mengompilasi aturan persetujuan ganda menjadi skenario Gherkin dan jejak audit.',
        deliverableEn: 'RULE: amount > $50k => require Maker != Checker + hardware WebAuthn signature',
        deliverableId: 'ATURAN: nominal > $50rb => wajib Maker != Checker + tanda tangan WebAuthn',
      },
      {
        id: 'arch',
        code: '02',
        roleEn: 'Distributed Architect Agent',
        roleId: 'Agen Arsitek Terdistribusi',
        summaryEn: 'Models Transactional Outbox, SHA-256 idempotency lock, and USL node ceiling.',
        summaryId: 'Memodelkan Transactional Outbox, kunci idempotensi SHA-256, dan batas node USL.',
        deliverableEn: 'USL N_max = 38 Nodes (α=0.021, β=0.0006) · Zero Duplicate Ledger Writes',
        deliverableId: 'USL N_max = 38 Node (α=0.021, β=0.0006) · Nol Duplikasi Buku Besar',
      },
      {
        id: 'ui',
        code: '03',
        roleEn: 'Spatial UI Synthesizer',
        roleId: 'Agen Sintesis UI Spasial',
        summaryEn: 'Generates accessible operator console with optimistic lock indicators and RBAC states.',
        summaryId: 'Menghasilkan konsol operator aksesibel dengan indikator kunci optimistik dan RBAC.',
        deliverableEn: '<SettlementCockpit role={rbac} idempotencyGuard={true} zodContract={LedgerV3} />',
        deliverableId: '<SettlementCockpit role={rbac} idempotencyGuard={true} zodContract={LedgerV3} />',
      },
      {
        id: 'qa',
        code: '04',
        roleEn: 'Self-Healing QA Agent',
        roleId: 'Agen QA Self-Healing',
        summaryEn: 'Synthesizes semantic Playwright assertions and double-submit race condition probes.',
        summaryId: 'Menyusun pengujian Playwright semantik dan simulasi klik ganda bersamaan.',
        deliverableEn: 'expect(orphanRows).toBe(0) · Role-based locator resilience: 99/100',
        deliverableId: 'expect(orphanRows).toBe(0) · Ketahanan selektor berbasis peran: 99/100',
      },
      {
        id: 'secops',
        code: '05',
        roleEn: 'Zero-Trust SRE Gate',
        roleId: 'Gerbang SRE Zero-Trust',
        summaryEn: 'Enforces strict CSP, mTLS service boundary, and automatic half-open circuit breaker.',
        summaryId: 'Menegakkan CSP ketat, batas mTLS antar-layanan, dan pemutus sirkuit otomatis.',
        deliverableEn: 'CSP: script-src self · Circuit Breaker trip @ P99 > 180ms -> Read-Replica Guard',
        deliverableId: 'CSP: script-src self · Pemutus sirkuit aktif @ P99 > 180ms -> Proteksi Failover',
      },
    ],
  },
  'ai-gateway': {
    id: 'ai-gateway',
    tagEn: 'GEN-AI · MULTI-MODEL MESH',
    tagId: 'GEN-AI · GATEWAY MULTI-MODEL',
    titleEn: 'Enterprise AI Gateway & Eval Guard',
    titleId: 'AI Gateway Enterprise & Guardrail Evaluasi',
    descEn: 'Semantic vector cache, cascade model routing, PII redaction, and live hallucination judge.',
    descId: 'Cache vektor semantik, routing model bertingkat, redaksi PII, dan deteksi halusinasi.',
    previewUrl: 'https://sandbox.dreamex.os/ai/sovereign-gateway',
    baseLatencyMs: 22,
    uslCeilingNodes: 44,
    defaultPromptEn: 'Multi-provider LLM router with cosine semantic cache, PII scrubber, and fallback failover',
    defaultPromptId: 'Router LLM multi-provider dengan semantic cache, penyaring PII, dan failover otomatis',
    actionLabelEn: 'Route Inference Prompt',
    actionLabelId: 'Jalankan Inferensi Gateway',
    agents: [
      {
        id: 'spec',
        code: '01',
        roleEn: 'Intent & BA Spec Agent',
        roleId: 'Agen Spesifikasi & BA',
        summaryEn: 'Defines token budget quotas, PII redaction policy, and rubric faithfulness thresholds.',
        summaryId: 'Menetapkan kuota token, kebijakan redaksi PII, dan ambang akurasi evaluasi.',
        deliverableEn: 'POLICY: Scrub SSN/Email pre-egress · Faithfulness rubric >= 0.92',
        deliverableId: 'KEBIJAKAN: Redaksi PII pra-kirim · Skor akurasi jawaban >= 0.92',
      },
      {
        id: 'arch',
        code: '02',
        roleEn: 'Distributed Architect Agent',
        roleId: 'Agen Arsitek Terdistribusi',
        summaryEn: 'Designs SSE streaming multiplexers, HNSW semantic cache, and provider health ring.',
        summaryId: 'Merancang multiplexer streaming SSE, semantic cache HNSW, dan failover provider.',
        deliverableEn: 'Cascade Router: 80% Flash Tier (19ms cache) + 20% Frontier Escalation',
        deliverableId: 'Cascade Router: 80% Flash Tier (19ms cache) + 20% Eskalasi Frontier',
      },
      {
        id: 'ui',
        code: '03',
        roleEn: 'Spatial UI Synthesizer',
        roleId: 'Agen Sintesis UI Spasial',
        summaryEn: 'Builds live streaming token telemetry, cost attribution meter, and guardrail inspector.',
        summaryId: 'Membangun telemetri streaming token, meter atribusi biaya, dan panel guardrail.',
        deliverableEn: '<AiGatewayConsole sseStream={true} semanticThreshold={0.94} />',
        deliverableId: '<AiGatewayConsole sseStream={true} semanticThreshold={0.94} />',
      },
      {
        id: 'qa',
        code: '04',
        roleEn: 'Self-Healing QA Agent',
        roleId: 'Agen QA Self-Healing',
        summaryEn: 'Runs prompt-injection regression corpus and SSE stream cancellation tests.',
        summaryId: 'Menjalankan korpus regresi prompt-injection dan uji pembatalan stream SSE.',
        deliverableEn: '48/48 Adversarial Prompt Vectors Blocked · AbortController Leak = 0',
        deliverableId: '48/48 Vektor Injeksi Diblokir · Kebocoran AbortController = 0',
      },
      {
        id: 'secops',
        code: '05',
        roleEn: 'Zero-Trust SRE Gate',
        roleId: 'Gerbang SRE Zero-Trust',
        summaryEn: 'Locks outbound host allowlist, ephemeral session keys, and per-tenant sliding rate limit.',
        summaryId: 'Mengunci daftar host tepercaya, kunci sesi sementara, dan batas laju per-tenant.',
        deliverableEn: 'RateLimit: 60 req/min sliding window · Ephemeral BYOK Vault Verified',
        deliverableId: 'RateLimit: 60 req/mnt jendela geser · Brankas BYOK Sesi Terverifikasi',
      },
    ],
  },
  'clinical-fhir': {
    id: 'clinical-fhir',
    tagEn: 'HEALTH · ZERO-DOWNTIME FHIR',
    tagId: 'KESEHATAN · TELEMETRI FHIR',
    titleEn: 'Clinical Triage & Audit Vault Mesh',
    titleId: 'Mesh Triase Klinis & Audit Zero-Downtime',
    descEn: 'HL7 FHIR R4 schema validation, tamper-evident hash chain, and sub-second alert routing.',
    descId: 'Validasi skema HL7 FHIR R4, rantai hash anti-manipulasi, dan eskalasi cepat.',
    previewUrl: 'https://sandbox.dreamex.os/health/fhir-triage-mesh',
    baseLatencyMs: 11,
    uslCeilingNodes: 32,
    defaultPromptEn: 'Zero-downtime HL7 FHIR R4 patient vitals triage pipeline with cryptographic audit trail',
    defaultPromptId: 'Pipeline triase tanda vital pasien HL7 FHIR R4 tanpa henti dengan audit kriptografi',
    actionLabelEn: 'Ingest FHIR Vitals Event',
    actionLabelId: 'Kirim Sinyal Vital FHIR',
    agents: [
      {
        id: 'spec',
        code: '01',
        roleEn: 'Intent & BA Spec Agent',
        roleId: 'Agen Spesifikasi & BA',
        summaryEn: 'Captures clinical escalation SLAs, PHI masking rules, and clinician acknowledgement flow.',
        summaryId: 'Memetakan SLA eskalasi klinis, aturan masking data pasien, dan konfirmasi dokter.',
        deliverableEn: 'SLA: Critical SpO2 < 90% alert routed < 250ms with immutable clinician sign-off',
        deliverableId: 'SLA: Peringatan SpO2 < 90% terkirim < 250ms dengan tanda tangan audit',
      },
      {
        id: 'arch',
        code: '02',
        roleEn: 'Distributed Architect Agent',
        roleId: 'Agen Arsitek Terdistribusi',
        summaryEn: 'Partitions telemetry streams by ward shard with Merkle-tree audit append log.',
        summaryId: 'Mempartisi aliran telemetri per unit perawatan dengan log Merkle-tree.',
        deliverableEn: 'Active-Active Region Pair · RPO = 0 · SHA-256 Tamper Chain Verified',
        deliverableId: 'Sepasang Region Aktif-Aktif · RPO = 0 · Rantai Hash SHA-256 Teruji',
      },
      {
        id: 'ui',
        code: '03',
        roleEn: 'Spatial UI Synthesizer',
        roleId: 'Agen Sintesis UI Spasial',
        summaryEn: 'Synthesizes WCAG AAA high-contrast clinical triage board with keyboard-first actions.',
        summaryId: 'Menghasilkan papan triase kontras tinggi WCAG AAA ramah navigasi keyboard.',
        deliverableEn: '<FhirTriageBoard contrast="AAA" roleMasking={true} liveAriaPolite />',
        deliverableId: '<FhirTriageBoard contrast="AAA" roleMasking={true} liveAriaPolite />',
      },
      {
        id: 'qa',
        code: '04',
        roleEn: 'Self-Healing QA Agent',
        roleId: 'Agen QA Self-Healing',
        summaryEn: 'Verifies malformed FHIR payload rejection and offline queue replay ordering.',
        summaryId: 'Memvalidasi penolakan payload FHIR rusak dan urutan sinkronisasi antrean luring.',
        deliverableEn: 'FIFO Replay Monotonicity: 100% · Schema Boundary Fuzzing: 0 Crashes',
        deliverableId: 'Urutan Replay FIFO: 100% · Fuzzing Batas Skema: 0 Kegagalan',
      },
      {
        id: 'secops',
        code: '05',
        roleEn: 'Zero-Trust SRE Gate',
        roleId: 'Gerbang SRE Zero-Trust',
        summaryEn: 'Applies least-privilege RBAC field encryption and automated chaos failover drills.',
        summaryId: 'Menerapkan enkripsi kolom RBAC hak-minimum dan simulasi failover otomatis.',
        deliverableEn: 'Envelope Encryption AES-256-GCM · Auditor Role = Masked PHI Read-Only',
        deliverableId: 'Enkripsi Amplop AES-256-GCM · Peran Auditor = Baca Terenkripsi Saja',
      },
    ],
  },
  'edge-commerce': {
    id: 'edge-commerce',
    tagEn: 'COMMERCE · GLOBAL FLASH SAGA',
    tagId: 'COMMERCE · SAGA SKALA GLOBAL',
    titleEn: 'Edge Flash-Sale & Inventory Saga',
    titleId: 'Checkout Flash-Sale Edge & Saga Inventaris',
    descEn: 'Distributed inventory reservation saga, queue backpressure, and zero-oversell guarantee.',
    descId: 'Saga reservasi stok terdistribusi, kendali antrean lonjakan, dan jaminan nol-oversell.',
    previewUrl: 'https://sandbox.dreamex.os/commerce/edge-saga',
    baseLatencyMs: 9,
    uslCeilingNodes: 64,
    defaultPromptEn: 'Global flash-sale checkout saga handling 50k RPS with zero inventory oversell',
    defaultPromptId: 'Saga checkout flash-sale global 50rb RPS dengan jaminan nol selisih stok',
    actionLabelEn: 'Reserve Atomic SKU',
    actionLabelId: 'Reservasi SKU Atomik',
    agents: [
      {
        id: 'spec',
        code: '01',
        roleEn: 'Intent & BA Spec Agent',
        roleId: 'Agen Spesifikasi & BA',
        summaryEn: 'Defines 8-minute cart TTL lease, compensating refund saga, and fair-queue token.',
        summaryId: 'Menentukan sewa stok 8 menit, saga kompensasi refund, dan antrean adil.',
        deliverableEn: 'INVARIANT: reserved_qty + available_qty === total_sku (Zero Oversell)',
        deliverableId: 'INVARIAN: stok_dipesan + stok_tersedia === total_sku (Nol Oversell)',
      },
      {
        id: 'arch',
        code: '02',
        roleEn: 'Distributed Architect Agent',
        roleId: 'Agen Arsitek Terdistribusi',
        summaryEn: 'Combines Edge KV atomic decrement with asynchronous payment-capture choreography.',
        summaryId: 'Menggabungkan dekremen atomik Edge KV dengan koreografi pembayaran asinkron.',
        deliverableEn: 'USL N_max = 64 Edge PoPs · P95 Reservation Latency = 9ms',
        deliverableId: 'USL N_max = 64 Edge PoP · Latensi Reservasi P95 = 9ms',
      },
      {
        id: 'ui',
        code: '03',
        roleEn: 'Spatial UI Synthesizer',
        roleId: 'Agen Sintesis UI Spasial',
        summaryEn: 'Creates optimistic stock ticker, backpressure queue indicator, and retry-safe CTA.',
        summaryId: 'Membuat indikator stok optimistik, status antrean lonjakan, dan tombol aman-retry.',
        deliverableEn: '<FlashCheckoutWidget leaseTtlSec={480} optimisticUi={true} />',
        deliverableId: '<FlashCheckoutWidget leaseTtlSec={480} optimisticUi={true} />',
      },
      {
        id: 'qa',
        code: '04',
        roleEn: 'Self-Healing QA Agent',
        roleId: 'Agen QA Self-Healing',
        summaryEn: 'Executes 1,000-virtual-buyer concurrency race assertions on the last remaining unit.',
        summaryId: 'Menjalankan uji balapan 1.000 pembeli paralel pada 1 unit stok terakhir.',
        deliverableEn: '1 Winner + 999 Clean Waitlist Responses · 0 Negative Stock Anomalies',
        deliverableId: '1 Berhasil + 999 Antrean Bersih · 0 Anomali Stok Negatif',
      },
      {
        id: 'secops',
        code: '05',
        roleEn: 'Zero-Trust SRE Gate',
        roleId: 'Gerbang SRE Zero-Trust',
        summaryEn: 'Activates token-bucket bot defense, signed checkout nonces, and graceful degradation.',
        summaryId: 'Mengaktifkan token-bucket anti-bot, nonce bertanda tangan, dan degradasi mulus.',
        deliverableEn: 'HMAC-SHA256 Checkout Nonce · Auto Load-Shedding @ CPU > 85%',
        deliverableId: 'Nonce Checkout HMAC-SHA256 · Pembatasan Beban Otomatis @ CPU > 85%',
      },
    ],
  },
}

interface TraceEntry {
  id: number
  status: 'ok' | 'guard' | 'denied'
  message: string
  latency: string
}

export default function AiPrototypeStudioPage() {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const { context: syncedContext, publishContext } = useProjectContextBus()
  const [searchParams, setSearchParams] = useSearchParams()
  const en = language === 'en'

  const initialBp = searchParams.get('bp')
  const [blueprintId, setBlueprintId] = useState<BlueprintId>(() =>
    initialBp && initialBp in BLUEPRINTS ? (initialBp as BlueprintId) : 'fintech',
  )
  const blueprint = BLUEPRINTS[blueprintId]

  const [customPrompt, setCustomPrompt] = useState(() => searchParams.get('q') || '')
  const [selectedAgentIdx, setSelectedAgentIdx] = useState(0)
  const [verifiedAgents, setVerifiedAgents] = useState<number[]>([0, 1, 2, 3, 4])
  const [runningAgentIdx, setRunningAgentIdx] = useState<number | null>(null)
  const [shareStatus, setShareStatus] = useState('')

  const [viewport, setViewport] = useState<DeviceViewport>('desktop')
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('live')
  const [rbacRole, setRbacRole] = useState<RbacRole>(() => {
    const r = searchParams.get('role')
    return r === 'operator' || r === 'auditor' ? r : 'admin'
  })
  const [cacheShieldOn, setCacheShieldOn] = useState(true)
  const [faultInjected, setFaultInjected] = useState(false)
  const [txCount, setTxCount] = useState(128)
  const [dedupSaved, setDedupSaved] = useState(42)
  const [copiedArtifact, setCopiedArtifact] = useState(false)
  const [traces, setTraces] = useState<TraceEntry[]>([
    { id: 1, status: 'ok', message: 'SHA-256 idempotency contract & Zod runtime schema verified', latency: '12ms' },
    { id: 2, status: 'ok', message: 'Semantic cache HIT · Zero upstream duplicate execution', latency: '4ms' },
  ])

  // Token Economics & Concurrency Calculator State
  const [dailyRequests, setDailyRequests] = useState(120_000)
  const [tokensPerReq, setTokensPerReq] = useState(2400)
  const [cacheHitPct, setCacheHitPct] = useState(55)
  const [routing, setRouting] = useState<ModelRouting>('hybrid')

  const effectivePrompt = customPrompt.trim() || (en ? blueprint.defaultPromptEn : blueprint.defaultPromptId)
  const activeAgent = blueprint.agents[selectedAgentIdx] ?? blueprint.agents[0]

  const selectBlueprint = (id: BlueprintId) => {
    setBlueprintId(id)
    setCustomPrompt('')
    setSelectedAgentIdx(0)
    setVerifiedAgents([0, 1, 2, 3, 4])
    setRunningAgentIdx(null)
    setFaultInjected(false)
  }

  const runAgentPipeline = () => {
    if (runningAgentIdx !== null) return
    setVerifiedAgents([])
    setRunningAgentIdx(0)
    setSelectedAgentIdx(0)
    ;[0, 1, 2, 3, 4].forEach((stepIdx) => {
      window.setTimeout(() => {
        setRunningAgentIdx(stepIdx)
        setSelectedAgentIdx(stepIdx)
      }, stepIdx * 180)
      window.setTimeout(() => {
        setVerifiedAgents(prev => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]))
        if (stepIdx === 4) setRunningAgentIdx(null)
      }, stepIdx * 180 + 165)
    })
  }

  const simulateRequests = (batchSize: number) => {
    if (rbacRole === 'auditor') {
      setTraces(prev => [
        {
          id: Date.now(),
          status: 'denied',
          message: en
            ? 'RBAC Zero-Trust Gate: "Auditor" role is strictly read-only; mutation blocked'
            : 'Gerbang Zero-Trust RBAC: peran "Auditor" hanya-baca; mutasi ditolak',
          latency: '1ms',
        },
        ...prev.slice(0, 4),
      ])
      return
    }

    setTxCount(c => c + batchSize)
    const cacheHits = cacheShieldOn ? Math.max(1, Math.round(batchSize * 0.6)) : 0
    if (cacheHits > 0) setDedupSaved(s => s + cacheHits)

    const computedLatency = faultInjected
      ? blueprint.baseLatencyMs + 34
      : Math.max(3, blueprint.baseLatencyMs - (cacheShieldOn ? 5 : 0))

    setTraces(prev => [
      {
        id: Date.now(),
        status: faultInjected ? 'guard' : 'ok',
        message: faultInjected
          ? en
            ? `Circuit Breaker FAILOVER_GUARD engaged (${batchSize}x routed to healthy replica)`
            : `Pemutus Sirkuit FAILOVER_GUARD aktif (${batchSize}x dialihkan ke replika sehat)`
          : en
            ? `Processed ${batchSize}x [${blueprint.id}] · ${cacheHits} idempotent/cache hits verified`
            : `Memproses ${batchSize}x [${blueprint.id}] · ${cacheHits} hit cache/idempoten tervalidasi`,
        latency: `${computedLatency}ms`,
      },
      ...prev.slice(0, 4),
    ])
  }

  const liveP95 = faultInjected
    ? blueprint.baseLatencyMs + 34
    : Math.max(3, blueprint.baseLatencyMs - (cacheShieldOn ? 5 : 0))

  const codeArtifact = useMemo(
    () =>
      [
        `// DreamEx Autonomous AI OS v5.0 — Synthesized Production Module`,
        `// Blueprint: ${blueprint.titleEn} | Target: "${effectivePrompt.slice(0, 72)}"`,
        `import { z } from 'zod'`,
        ``,
        `export const ${blueprint.id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}Contract = z.object({`,
        `  idempotencyKey: z.string().uuid(),`,
        `  actorRole: z.enum(['admin', 'operator', 'auditor']),`,
        `  tenantId: z.string().min(3).max(64),`,
        `  payloadDigestSha256: z.string().regex(/^[a-f0-9]{64}$/),`,
        `  createdAtIso: z.string().datetime(),`,
        `})`,
        ``,
        `export async function executeSovereignWorkflow(rawInput: unknown) {`,
        `  const parsed = ${blueprint.id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}Contract.parse(rawInput)`,
        `  if (parsed.actorRole === 'auditor') {`,
        `    throw new Error('ZERO_TRUST_RBAC_DENIED: Auditor role cannot mutate state')`,
        `  }`,
        `  return {`,
        `    status: '${faultInjected ? 'FAILOVER_REPLICA_COMMITTED' : 'COMMITTED_PRIMARY'}',`,
        `    idempotencyShield: ${cacheShieldOn},`,
        `    p95TargetMs: ${liveP95},`,
        `    uslOptimalNodes: ${blueprint.uslCeilingNodes},`,
        `  }`,
        `}`,
      ].join('\n'),
    [blueprint, effectivePrompt, faultInjected, cacheShieldOn, liveP95],
  )

  const playwrightArtifact = useMemo(
    () =>
      [
        `// Self-Healing Playwright E2E + Zero-Trust RBAC & Resilience Gate`,
        `import { test, expect } from '@playwright/test'`,
        ``,
        `test('${blueprint.titleEn} enforces RBAC, idempotency, and failover SLA', async ({ page }) => {`,
        `  await page.goto('/prototype?blueprint=${blueprint.id}')`,
        `  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()`,
        ``,
        `  // 1. Verify read-only Auditor role cannot mutate state`,
        `  await page.getByRole('button', { name: /Auditor/i }).click()`,
        `  await page.getByTestId('proto-dispatch-one').click()`,
        `  await expect(page.getByTestId('proto-trace-feed')).toContainText(/RBAC/i)`,
        ``,
        `  // 2. Verify Operator/Admin execution & Circuit-Breaker resilience`,
        `  await page.getByRole('button', { name: /Admin/i }).click()`,
        `  await page.getByTestId('proto-dispatch-one').click()`,
        `  await expect(page.getByTestId('proto-kpi-p95')).toBeVisible()`,
        `})`,
      ].join('\n'),
    [blueprint],
  )

  const economics = useMemo(() => {
    const monthlyRequests = dailyRequests * 30
    const monthlyMillionTokens = (monthlyRequests * tokensPerReq) / 1_000_000
    const frontierRatePerM = 5.0
    const flashRatePerM = 0.35
    const activeRate =
      routing === 'frontier' ? frontierRatePerM : routing === 'flash' ? flashRatePerM : frontierRatePerM * 0.2 + flashRatePerM * 0.8
    const uncachedFrontierCost = monthlyMillionTokens * frontierRatePerM
    const billableFactor = 1 - (cacheHitPct / 100) * 0.9
    const optimizedCost = monthlyMillionTokens * activeRate * billableFactor
    const savingsUsd = Math.max(0, uncachedFrontierCost - optimizedCost)
    const savingsPct = uncachedFrontierCost > 0 ? Math.round((savingsUsd / uncachedFrontierCost) * 100) : 0
    const peakRps = (dailyRequests / 86_400) * 4.5
    const concurrentWorkers = Math.max(2, Math.ceil(peakRps * (liveP95 / 1000) * 1.35))
    return {
      monthlyMillionTokens: monthlyMillionTokens.toFixed(1),
      uncachedFrontierCost: Math.round(uncachedFrontierCost),
      optimizedCost: Math.round(optimizedCost),
      savingsUsd: Math.round(savingsUsd),
      savingsPct,
      concurrentWorkers,
    }
  }, [dailyRequests, tokensPerReq, cacheHitPct, routing, liveP95])

  const copyActiveArtifact = async () => {
    const text = inspectorTab === 'playwright' ? playwrightArtifact : codeArtifact
    try {
      await navigator.clipboard.writeText(text)
      setCopiedArtifact(true)
      window.setTimeout(() => setCopiedArtifact(false), 1800)
    } catch {
      /* Clipboard permission restricted */
    }
  }

  const downloadBundleJson = () => {
    const payload = {
      schema: 'dreamex.ai-prototype-bundle.v5',
      generatedAt: new Date().toISOString(),
      blueprint: blueprint.id,
      requirement: effectivePrompt,
      agents: blueprint.agents.map(a => ({ step: a.code, role: a.roleEn, deliverable: a.deliverableEn })),
      telemetry: {
        processedRequests: txCount,
        idempotentHits: dedupSaved,
        p95LatencyMs: liveP95,
        circuitState: faultInjected ? 'FAILOVER_GUARD' : 'CLOSED_HEALTHY',
        uslCeilingNodes: blueprint.uslCeilingNodes,
      },
      tokenEconomics: economics,
      codeArtifact,
      playwrightArtifact,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dreamex-prototype-${blueprint.id}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const downloadStarterRepoZip = () => {
    const archive = buildProductionStarterZip({
      blueprintId: blueprint.id,
      title: en ? blueprint.titleEn : blueprint.titleId,
      intent: effectivePrompt,
      uslCeilingNodes: blueprint.uslCeilingNodes,
      p95Ms: liveP95,
      codeArtifact,
      playwrightArtifact,
    })
    const blob = new Blob([archive], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dreamex-${blueprint.id}-starter.zip`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setShareStatus(
      en
        ? '7-file production starter .zip generated locally!'
        : 'Paket proyek 7-berkas .zip berhasil dibuat di browser!',
    )
  }

  const shareLivePermalink = async () => {
    const params = new URLSearchParams()
    params.set('bp', blueprint.id)
    params.set('role', rbacRole)
    if (customPrompt.trim()) params.set('q', customPrompt.trim().slice(0, 160))
    setSearchParams(params, { replace: true })
    const shareUrl = `${window.location.origin}/prototype?${params.toString()}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus(en ? 'Shareable prototype link copied!' : 'Tautan berbagi prototipe tersalin!')
    } catch {
      setShareStatus(shareUrl)
    }
  }

  const syncAcrossSuites = () => {
    publishContext({
      blueprintId: blueprint.id,
      projectName: en ? blueprint.titleEn : blueprint.titleId,
      intentPrompt: effectivePrompt,
      uslCeilingNodes: blueprint.uslCeilingNodes,
      p95TargetMs: liveP95,
      rbacRole,
      gherkinScenario: blueprint.agents[0]?.deliverableEn || '',
      updatedAt: new Date().toISOString(),
    })
    setShareStatus(
      en
        ? 'Active blueprint synced to Unified OS Context Bus across all suites!'
        : 'Blueprint aktif berhasil disinkronkan ke seluruh suite OS!',
    )
  }

  const strokePrimary = theme === 'light' ? '#047857' : '#5eead4'
  const strokeSecondary = theme === 'light' ? '#0369a1' : '#38bdf8'
  const nodeFill = theme === 'light' ? '#ffffff' : '#0d182c'
  const nodeText = theme === 'light' ? '#0f172a' : '#f1f5fb'

  return (
    <main id="main-content" className="container proto-studio-page">
      <section className="proto-hero" aria-labelledby="proto-studio-heading">
        <div>
          <span className="proto-hero-kicker">
            <i className="proto-hero-dot" aria-hidden="true" />
            {en ? 'AUTONOMOUS AI PROTOTYPE STUDIO · v13.0' : 'STUDIO PROTOTIPE AI OTONOM · v13.0'}
          </span>
          <h1 id="proto-studio-heading" data-testid="proto-studio-title">
            {en ? (
              <>
                From system intent to <span>live interactive prototype.</span>
              </>
            ) : (
              <>
                Dari visi arsitektur ke <span>prototipe interaktif hidup.</span>
              </>
            )}
          </h1>
          <p className="proto-hero-desc">
            {en
              ? 'Orchestrate 5 specialized engineering AI agents—BA Spec, Distributed Architect, Spatial UI Synthesizer, Self-Healing QA, and Zero-Trust SRE—inside one 100% client-sovereign sandbox.'
              : 'Orkestrasi 5 agen AI rekayasa khusus—Spesifikasi BA, Arsitek Terdistribusi, Sintesis UI Spasial, QA Self-Healing, dan SRE Zero-Trust—dalam satu sandbox privat di browser Anda.'}
          </p>
          <div className="proto-hero-actions">
            <button type="button" className="button button-primary" data-testid="run-agent-dag" onClick={runAgentPipeline}>
              <Play size={16} />
              {runningAgentIdx !== null
                ? en
                  ? 'Synthesizing 5 Agents…'
                  : 'Menjalankan 5 Agen…'
                : en
                  ? 'Run 5-Agent Pipeline'
                  : 'Jalankan Pipeline 5-Agen'}
            </button>
            <button type="button" className="button button-ghost" data-testid="proto-download-zip" onClick={downloadStarterRepoZip}>
              <FolderArchive size={16} />
              {en ? 'Starter Repo (.zip)' : 'Unduh Proyek (.zip)'}
            </button>
            <button type="button" className="button button-ghost" data-testid="proto-share-link" onClick={() => void shareLivePermalink()}>
              <Share2 size={16} />
              {en ? 'Share Live Link' : 'Bagikan Tautan'}
            </button>
            <button type="button" className="button button-ghost" data-testid="proto-sync-bus" onClick={syncAcrossSuites}>
              <Cpu size={16} />
              {syncedContext?.blueprintId === blueprint.id
                ? en
                  ? 'Synced to OS ✓'
                  : 'Tersinkron OS ✓'
                : en
                  ? 'Sync Across OS'
                  : 'Sinkron ke OS'}
            </button>
            <button type="button" className="button button-ghost" onClick={downloadBundleJson}>
              <Download size={16} />
              .JSON
            </button>
          </div>
          {shareStatus && (
            <p role="status" style={{ margin: '10px 0 0', fontSize: 12.5, color: theme === 'light' ? '#047857' : '#6ee7b7', fontWeight: 600 }}>
              <Check size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {shareStatus}
            </p>
          )}
        </div>

        <div className="proto-hero-visual">
          <picture>
            <source srcSet="/images/cover-agentic-prototype.webp" type="image/webp" />
            <img
              src="/images/cover-agentic-prototype.jpg"
              alt={
                en
                  ? 'Autonomous 5-agent neural architecture orchestrating a live holographic UI prototype'
                  : 'Arsitektur neural 5-agen otonom yang mengorkestrasi prototipe antarmuka holografik'
              }
              width={960}
              height={540}
            />
          </picture>
          <div className="proto-hero-visual-hud">
            <div>
              <span>{en ? 'ACTIVE AGENTS' : 'AGEN AKTIF'}</span>
              <strong>{verifiedAgents.length} / 5 VERIFIED</strong>
            </div>
            <div>
              <span>{en ? 'USL CEILING' : 'BATAS SKALA USL'}</span>
              <strong>{blueprint.uslCeilingNodes} NODES</strong>
            </div>
            <div>
              <span>{en ? 'SANDBOX P95' : 'LATENSI P95'}</span>
              <strong>{liveP95} ms</strong>
            </div>
            <div>
              <span>{en ? 'EXECUTION MODE' : 'MODE EKSEKUSI'}</span>
              <strong>LOCAL + BYOK</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Section 01: Multi-Agent DAG & Blueprint Selector */}
      <section className="proto-section-card" aria-labelledby="proto-dag-heading">
        <div className="proto-section-head">
          <div>
            <span className="section-kicker">{en ? '01 / MULTI-AGENT DAG ORCHESTRATOR' : '01 / ORKESTRATOR DAG MULTI-AGEN'}</span>
            <h2 id="proto-dag-heading">
              {en ? 'Select an international architecture blueprint or customize intent' : 'Pilih cetak biru arsitektur internasional atau tulis spesifikasi Anda'}
            </h2>
            <p>
              {en
                ? 'Click any blueprint or agent node below to inspect how requirements compile into verified runtime contracts, UI states, and resilience gates.'
                : 'Klik cetak biru atau node agen di bawah untuk meninjau bagaimana kebutuhan bisnis dikompilasi menjadi kontrak runtime, antarmuka, dan gerbang keandalan.'}
            </p>
          </div>
        </div>

        <div className="proto-blueprint-grid" role="group" aria-label={en ? 'Architecture blueprints' : 'Cetak biru arsitektur'}>
          {(Object.values(BLUEPRINTS) as PrototypeBlueprint[]).map(item => (
            <button
              key={item.id}
              type="button"
              data-testid={`blueprint-${item.id}`}
              className={blueprintId === item.id ? 'proto-blueprint-btn is-active' : 'proto-blueprint-btn'}
              aria-pressed={blueprintId === item.id}
              onClick={() => selectBlueprint(item.id)}
            >
              <span className="proto-blueprint-tag">{en ? item.tagEn : item.tagId}</span>
              <strong>{en ? item.titleEn : item.titleId}</strong>
              <small>{en ? item.descEn : item.descId}</small>
            </button>
          ))}
        </div>

        <div className="proto-prompt-bar">
          <label className="proto-prompt-input-wrap">
            <Sparkles size={16} aria-hidden="true" />
            <input
              type="text"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder={en ? blueprint.defaultPromptEn : blueprint.defaultPromptId}
              aria-label={en ? 'Custom prototype requirement' : 'Spesifikasi prototipe kustom'}
            />
          </label>
          <button type="button" className="button button-primary" onClick={runAgentPipeline}>
            <Workflow size={15} />
            {en ? 'Re-Synthesize DAG' : 'Sintesis Ulang DAG'}
          </button>
        </div>

        <div className="proto-dag-grid" role="list" aria-label={en ? '5-Agent pipeline stages' : 'Tahapan pipeline 5-agen'}>
          {blueprint.agents.map((agent, index) => {
            const isRunning = runningAgentIdx === index
            const isVerified = verifiedAgents.includes(index)
            const stateClass = isRunning ? 'state-running' : isVerified ? 'state-verified' : ''
            return (
              <button
                key={agent.id}
                type="button"
                role="listitem"
                data-testid={`agent-node-${agent.id}`}
                className={`proto-agent-node ${stateClass} ${selectedAgentIdx === index ? 'is-selected' : ''}`.trim()}
                onClick={() => setSelectedAgentIdx(index)}
              >
                <div className="proto-agent-top">
                  <span className="proto-agent-step">AGENT {agent.code}</span>
                  <span className={`proto-agent-badge ${stateClass}`.trim()}>
                    {isRunning ? (en ? 'RUNNING' : 'AKTIF') : isVerified ? (en ? 'VERIFIED' : 'LOLOS') : 'IDLE'}
                  </span>
                </div>
                <strong>{en ? agent.roleEn : agent.roleId}</strong>
                <small>{en ? agent.summaryEn : agent.summaryId}</small>
              </button>
            )
          })}
        </div>

        <div className="proto-agent-detail" data-testid="proto-agent-inspector">
          <div>
            <span className="proto-blueprint-tag">
              AGENT {activeAgent.code} · {en ? activeAgent.roleEn : activeAgent.roleId}
            </span>
            <h3>{effectivePrompt}</h3>
            <p>{en ? activeAgent.summaryEn : activeAgent.summaryId}</p>
          </div>
          <div className="proto-agent-deliverable">
            {en ? activeAgent.deliverableEn : activeAgent.deliverableId}
          </div>
        </div>
      </section>

      {/* Section 02: Interactive Live Prototype Viewport & Code Inspector */}
      <section className="proto-section-card" aria-labelledby="proto-sandbox-heading">
        <div className="proto-section-head">
          <div>
            <span className="section-kicker">{en ? '02 / INTERACTIVE PROTOTYPE SANDBOX' : '02 / SANDBOX PROTOTIPE INTERAKTIF'}</span>
            <h2 id="proto-sandbox-heading">
              {en ? 'Test the live application prototype, fault resilience & code contracts' : 'Uji langsung prototipe aplikasi, ketahanan failover & kontrak kode'}
            </h2>
            <p>
              {en
                ? 'Switch responsive device frames, test Zero-Trust RBAC roles, inject upstream latency faults, or inspect the synthesized React/Zod and Playwright specs.'
                : 'Ubah ukuran layar perangkat, uji peran RBAC Zero-Trust, simulasikan gangguan latensi, atau periksa kode React/Zod dan spesifikasi Playwright.'}
            </p>
          </div>
        </div>

        <div className="proto-workbench-toolbar">
          <div className="proto-tab-group" role="tablist" aria-label={en ? 'Prototype inspector mode' : 'Mode inspeksi prototipe'}>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'live'}
              className={inspectorTab === 'live' ? 'proto-tab-btn is-active' : 'proto-tab-btn'}
              onClick={() => setInspectorTab('live')}
            >
              <Activity size={14} /> {en ? 'Live UI Prototype' : 'Prototipe UI Hidup'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'code'}
              className={inspectorTab === 'code' ? 'proto-tab-btn is-active' : 'proto-tab-btn'}
              onClick={() => setInspectorTab('code')}
            >
              <Code2 size={14} /> {en ? 'React + Zod Code' : 'Kode React + Zod'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'playwright'}
              className={inspectorTab === 'playwright' ? 'proto-tab-btn is-active' : 'proto-tab-btn'}
              onClick={() => setInspectorTab('playwright')}
            >
              <Terminal size={14} /> {en ? 'Playwright Spec' : 'Tes Playwright'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'topology'}
              className={inspectorTab === 'topology' ? 'proto-tab-btn is-active' : 'proto-tab-btn'}
              onClick={() => setInspectorTab('topology')}
            >
              <Workflow size={14} /> {en ? 'System Topology' : 'Topologi Sistem'}
            </button>
          </div>

          <div className="proto-device-group" role="group" aria-label={en ? 'Responsive preview size' : 'Ukuran pratinjau responsif'}>
            <button
              type="button"
              data-testid="proto-device-desktop"
              className={viewport === 'desktop' ? 'proto-device-btn is-active' : 'proto-device-btn'}
              aria-pressed={viewport === 'desktop'}
              onClick={() => setViewport('desktop')}
            >
              <Laptop size={14} /> Desktop
            </button>
            <button
              type="button"
              data-testid="proto-device-tablet"
              className={viewport === 'tablet' ? 'proto-device-btn is-active' : 'proto-device-btn'}
              aria-pressed={viewport === 'tablet'}
              onClick={() => setViewport('tablet')}
            >
              <Tablet size={14} /> Tablet
            </button>
            <button
              type="button"
              data-testid="proto-device-mobile"
              className={viewport === 'mobile' ? 'proto-device-btn is-active' : 'proto-device-btn'}
              aria-pressed={viewport === 'mobile'}
              onClick={() => setViewport('mobile')}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>
        </div>

        <div className={`proto-viewport-shell device-${viewport}`} data-testid="proto-viewport-shell">
          <div className="proto-window-bar">
            <span className="proto-window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="proto-window-url">{blueprint.previewUrl}</span>
            <span className="proto-blueprint-tag">
              {faultInjected
                ? en
                  ? 'CIRCUIT: FAILOVER_GUARD'
                  : 'SIRKUIT: PROTEKSI_FAILOVER'
                : en
                  ? 'CIRCUIT: CLOSED_HEALTHY'
                  : 'SIRKUIT: SEHAT_NORMAL'}
            </span>
          </div>

          {inspectorTab === 'live' && (
            <div className="proto-live-canvas">
              <div className="proto-live-controls">
                <div className="proto-role-pills" role="group" aria-label={en ? 'RBAC role simulation' : 'Simulasi peran RBAC'}>
                  {(['admin', 'operator', 'auditor'] as RbacRole[]).map(role => (
                    <button
                      key={role}
                      type="button"
                      className={rbacRole === role ? 'proto-pill-toggle is-on' : 'proto-pill-toggle'}
                      aria-pressed={rbacRole === role}
                      onClick={() => setRbacRole(role)}
                    >
                      {role.toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={cacheShieldOn ? 'proto-pill-toggle is-on' : 'proto-pill-toggle'}
                    aria-pressed={cacheShieldOn}
                    onClick={() => setCacheShieldOn(v => !v)}
                  >
                    <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {en ? 'Idempotency/Cache' : 'Cache/Idempoten'}
                  </button>
                  <button
                    type="button"
                    data-testid="proto-fault-toggle"
                    className={faultInjected ? 'proto-pill-toggle is-fault' : 'proto-pill-toggle'}
                    aria-pressed={faultInjected}
                    onClick={() => setFaultInjected(v => !v)}
                  >
                    <ShieldAlert size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {en ? 'Inject Chaos Spike' : 'Injeksi Gangguan'}
                  </button>
                </div>

                <div className="proto-sim-buttons">
                  <button
                    type="button"
                    data-testid="proto-dispatch-one"
                    className={rbacRole === 'auditor' ? 'button button-ghost' : 'button button-primary'}
                    onClick={() => simulateRequests(1)}
                  >
                    {rbacRole === 'auditor' ? <ShieldAlert size={14} /> : <Zap size={14} />}
                    {rbacRole === 'auditor'
                      ? en
                        ? 'Read-Only (Test RBAC Block)'
                        : 'Hanya-Baca (Uji Blokir RBAC)'
                      : en
                        ? blueprint.actionLabelEn
                        : blueprint.actionLabelId}
                  </button>
                  <button type="button" className="button button-ghost" onClick={() => simulateRequests(10)}>
                    +10 {en ? 'Burst' : 'Lonjakan'}
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    aria-label={en ? 'Reset prototype telemetry' : 'Reset telemetri prototipe'}
                    onClick={() => {
                      setTxCount(128)
                      setDedupSaved(42)
                      setFaultInjected(false)
                      setRbacRole('admin')
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <div className="proto-kpi-strip">
                <div className="proto-kpi-box">
                  <span>{en ? 'PROCESSED OPS' : 'OPERASI DIPROSES'}</span>
                  <strong data-testid="proto-kpi-ops">{txCount.toLocaleString()}</strong>
                  <small>{en ? 'Zero contract drift' : 'Nol penyimpangan skema'}</small>
                </div>
                <div className="proto-kpi-box">
                  <span>{en ? 'DEDUP / CACHE SAVED' : 'HEMAT CACHE / DEDUP'}</span>
                  <strong className="tone-good">{dedupSaved.toLocaleString()}</strong>
                  <small>{cacheShieldOn ? (en ? 'Shield active' : 'Proteksi aktif') : en ? 'Bypassed' : 'Nonaktif'}</small>
                </div>
                <div className="proto-kpi-box">
                  <span>{en ? 'LIVE P95 LATENCY' : 'LATENSI P95 AKTUAL'}</span>
                  <strong data-testid="proto-kpi-p95" className={faultInjected ? 'tone-warn' : 'tone-good'}>
                    {liveP95} ms
                  </strong>
                  <small>{faultInjected ? (en ? 'Replica failover active' : 'Failover replika aktif') : en ? 'Edge optimal' : 'Optimal di Edge'}</small>
                </div>
                <div className="proto-kpi-box">
                  <span>{en ? 'ACTIVE RBAC POLICY' : 'KEBIJAKAN RBAC AKTIF'}</span>
                  <strong>{rbacRole.toUpperCase()}</strong>
                  <small>{rbacRole === 'auditor' ? (en ? 'Read-only enforced' : 'Wajib hanya-baca') : en ? 'Write authorized' : 'Otorisasi tulis'}</small>
                </div>
              </div>

              <div className="proto-trace-feed" data-testid="proto-trace-feed" aria-live="polite">
                <div className="proto-trace-head">
                  <span>{en ? 'LIVE EXECUTION & GUARDRAIL TELEMETRY' : 'TELEMETRI EKSEKUSI & GUARDRAIL LANGSUNG'}</span>
                  <span>{blueprint.id.toUpperCase()}</span>
                </div>
                {traces.map(entry => (
                  <div key={entry.id} className="proto-trace-row">
                    <span className={`proto-trace-status ${entry.status}`}>{entry.status.toUpperCase()}</span>
                    <span>{entry.message}</span>
                    <span>{entry.latency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspectorTab === 'code' && (
            <pre className="proto-code-pane" data-testid="proto-code-output">
              <code>{codeArtifact}</code>
            </pre>
          )}

          {inspectorTab === 'playwright' && (
            <pre className="proto-code-pane" data-testid="proto-playwright-output">
              <code>{playwrightArtifact}</code>
            </pre>
          )}

          {inspectorTab === 'topology' && (
            <div className="proto-topology-pane" data-testid="proto-topology-output">
              <svg className="proto-topology-svg" viewBox="0 0 820 190" role="img" aria-label={en ? 'Synthesized system topology diagram' : 'Diagram topologi sistem hasil sintesis'}>
                <defs>
                  <linearGradient id="protoEdgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={strokePrimary} />
                    <stop offset="100%" stopColor={strokeSecondary} />
                  </linearGradient>
                </defs>
                <line x1="165" y1="95" x2="255" y2="95" stroke="url(#protoEdgeGrad)" strokeWidth="2.5" strokeDasharray="5 4" />
                <line x1="415" y1="95" x2="505" y2="95" stroke="url(#protoEdgeGrad)" strokeWidth="2.5" strokeDasharray="5 4" />
                <line x1="655" y1="95" x2="705" y2="95" stroke="url(#protoEdgeGrad)" strokeWidth="2.5" />

                <rect x="20" y="52" width="145" height="86" rx="12" fill={nodeFill} stroke={strokeSecondary} strokeWidth="1.6" />
                <text x="92" y="84" textAnchor="middle" fill={nodeText} fontSize="12" fontWeight="700">Client / Edge WAF</text>
                <text x="92" y="106" textAnchor="middle" fill={strokeSecondary} fontSize="10">CSP + RBAC ({rbacRole})</text>

                <rect x="255" y="52" width="160" height="86" rx="12" fill={nodeFill} stroke={strokePrimary} strokeWidth="1.8" />
                <text x="335" y="84" textAnchor="middle" fill={nodeText} fontSize="12" fontWeight="700">Idempotency & Cache</text>
                <text x="335" y="106" textAnchor="middle" fill={strokePrimary} fontSize="10">{cacheShieldOn ? 'SHA-256 Shield ON' : 'Direct Pass-Through'}</text>

                <rect x="505" y="52" width="150" height="86" rx="12" fill={nodeFill} stroke={strokeSecondary} strokeWidth="1.6" />
                <text x="580" y="84" textAnchor="middle" fill={nodeText} fontSize="12" fontWeight="700">Core Domain Mesh</text>
                <text x="580" y="106" textAnchor="middle" fill={strokeSecondary} fontSize="10">USL {blueprint.uslCeilingNodes} Nodes · {liveP95}ms</text>

                <rect x="705" y="52" width="95" height="86" rx="12" fill={nodeFill} stroke={strokePrimary} strokeWidth="1.6" />
                <text x="752" y="84" textAnchor="middle" fill={nodeText} fontSize="11" fontWeight="700">Audit Ledger</text>
                <text x="752" y="106" textAnchor="middle" fill={strokePrimary} fontSize="10">{faultInjected ? 'Failover' : 'Primary'}</text>
              </svg>
            </div>
          )}
        </div>

        <div className="proto-export-bar">
          <span className="proto-blueprint-tag">
            {en
              ? `READY FOR PRODUCTION HANDOFF · ${blueprint.uslCeilingNodes}-NODE USL VERIFIED`
              : `SIAP HANDOFF PRODUKSI · TERVERIFIKASI USL ${blueprint.uslCeilingNodes} NODE`}
          </span>
          <div className="proto-sim-buttons">
            <button type="button" className="button button-ghost" onClick={copyActiveArtifact}>
              {copiedArtifact ? <Check size={14} /> : <Copy size={14} />}
              {copiedArtifact ? (en ? 'Copied!' : 'Tersalin!') : en ? 'Copy Code / Spec' : 'Salin Kode / Spesifikasi'}
            </button>
            <button type="button" className="button button-ghost" onClick={downloadBundleJson}>
              <Download size={14} /> {en ? 'Download JSON Spec' : 'Unduh Spesifikasi JSON'}
            </button>
            <Link className="button button-ghost" to="/grader">
              <ShieldCheck size={14} /> {en ? 'Audit Domain Readiness' : 'Audit Kesiapan Domain'}
            </Link>
          </div>
        </div>
      </section>

      {/* Section 03: AI Token Economics & Concurrency Physics */}
      <section className="proto-section-card" aria-labelledby="proto-econ-heading">
        <div className="proto-section-head">
          <div>
            <span className="section-kicker">{en ? '03 / AI TOKEN ECONOMICS & CAPACITY PHYSICS' : '03 / EKONOMI TOKEN AI & FISIKA KAPASITAS'}</span>
            <h2 id="proto-econ-heading">
              {en ? 'Forecast monthly LLM inference cost, semantic cache ROI & worker concurrency' : 'Simulasikan biaya inferensi bulanan, penghematan semantic cache & kapasitas worker'}
            </h2>
            <p>
              {en
                ? 'Model real production unit economics before deploying agentic features at international scale.'
                : 'Hitung unit ekonomi produksi secara akurat sebelum merilis fitur AI agentik berskala internasional.'}
            </p>
          </div>
        </div>

        <div className="proto-econ-grid">
          <div className="proto-sliders">
            <label className="proto-slider-field">
              <div className="proto-slider-label">
                <span>{en ? 'Daily AI Requests' : 'Request AI Harian'}</span>
                <strong>{dailyRequests.toLocaleString()} / day</strong>
              </div>
              <input
                type="range"
                min={10000}
                max={1000000}
                step={10000}
                value={dailyRequests}
                onChange={e => setDailyRequests(Number(e.target.value))}
              />
            </label>

            <label className="proto-slider-field">
              <div className="proto-slider-label">
                <span>{en ? 'Avg Prompt + Output Tokens' : 'Rata-rata Token per Request'}</span>
                <strong>{tokensPerReq.toLocaleString()} tok</strong>
              </div>
              <input
                type="range"
                min={600}
                max={12000}
                step={200}
                value={tokensPerReq}
                onChange={e => setTokensPerReq(Number(e.target.value))}
              />
            </label>

            <label className="proto-slider-field">
              <div className="proto-slider-label">
                <span>{en ? 'Semantic Cache Hit Ratio' : 'Rasio Hit Semantic Cache'}</span>
                <strong>{cacheHitPct}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={85}
                step={5}
                value={cacheHitPct}
                onChange={e => setCacheHitPct(Number(e.target.value))}
              />
            </label>

            <div className="proto-role-pills" role="group" aria-label={en ? 'Model routing tier' : 'Strategi routing model'}>
              {(
                [
                  { id: 'hybrid', en: '80/20 Cascade Hybrid', idLabel: 'Hibrida Cascade 80/20' },
                  { id: 'flash', en: '100% Distilled Flash', idLabel: '100% Flash Cepat' },
                  { id: 'frontier', en: '100% Frontier Pro', idLabel: '100% Frontier Pro' },
                ] as const
              ).map(tier => (
                <button
                  key={tier.id}
                  type="button"
                  className={routing === tier.id ? 'proto-pill-toggle is-on' : 'proto-pill-toggle'}
                  aria-pressed={routing === tier.id}
                  onClick={() => setRouting(tier.id)}
                >
                  {en ? tier.en : tier.idLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="proto-econ-results">
            <div className="proto-kpi-box">
              <span>{en ? 'OPTIMIZED MONTHLY COST' : 'BIAYA BULANAN OPTIMAL'}</span>
              <strong className="tone-good" data-testid="proto-optimized-cost">
                ${economics.optimizedCost.toLocaleString()}/mo
              </strong>
              <small>
                {en
                  ? `vs $${economics.uncachedFrontierCost.toLocaleString()}/mo uncached Frontier`
                  : `vs $${economics.uncachedFrontierCost.toLocaleString()}/bln tanpa cache`}
              </small>
            </div>
            <div className="proto-kpi-box">
              <span>{en ? 'NET ARCHITECTURE SAVINGS' : 'PENGHEMATAN ARSITEKTUR'}</span>
              <strong className="tone-good">{economics.savingsPct}%</strong>
              <small>${economics.savingsUsd.toLocaleString()} / mo saved</small>
            </div>
            <div className="proto-kpi-box">
              <span>{en ? 'MONTHLY TOKEN VOLUME' : 'VOLUME TOKEN BULANAN'}</span>
              <strong>{economics.monthlyMillionTokens}M</strong>
              <small>{en ? '30-day rolling throughput' : 'Throughput 30 hari'}</small>
            </div>
            <div className="proto-kpi-box">
              <span>{en ? "LITTLE'S LAW EDGE CONCURRENCY" : 'KONKURENSI WORKER EDGE'}</span>
              <strong>{economics.concurrentWorkers} Workers</strong>
              <small>{en ? '4.5x peak burst factor included' : 'Termasuk buffer lonjakan 4.5x'}</small>
            </div>
          </div>
        </div>
      </section>

      {/* Section 04: Optional Ephemeral Session BYOK Live Streaming */}
      <section className="proto-section-card" aria-label={en ? 'Live BYOK AI Stream' : 'Stream AI BYOK Langsung'}>
        <Suspense fallback={null}>
          <NeuralAiByokDrawer
            en={en}
            roleLabel={en ? `5-Agent Prototype Synthesizer (${blueprint.titleEn})` : `Sintesis Prototipe 5-Agen (${blueprint.titleId})`}
            commandText={`dreamex prototype --blueprint=${blueprint.id} --agents=5`}
            promptSeed={effectivePrompt}
          />
        </Suspense>
      </section>
    </main>
  )
}
