import type { JiraIssue } from './JiraEnterpriseBoard'

export interface JiraProjectMeta {
  key: string
  nameEn: string
  nameId: string
  methodology: 'Scrum' | 'Kanban' | 'ITSM'
  lead: string
  categoryEn: string
  categoryId: string
}

export interface ProductDiscoveryIdea {
  id: string
  code: string
  titleEn: string
  titleId: string
  reach: number // users/month (10..1000)
  impact: 1 | 2 | 3 // 1=Medium, 2=High, 3=Massive
  confidence: number // 50..100 (%)
  effort: number // person-weeks (1..12)
  epicKey: string
  promotedKey?: string
}

export interface JsmServiceTicket {
  id: string
  key: string
  kind: 'incident' | 'change'
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3'
  summaryEn: string
  summaryId: string
  service: string
  requester: string
  cabStatus: 'pending' | 'approved' | 'mitigated'
  slaRemainingEn: string
  slaRemainingId: string
  linkedBoardKey?: string
}

export interface ConfluenceSpecDoc {
  id: string
  code: string
  category: 'PRD' | 'ADR' | 'RUNBOOK'
  titleEn: string
  titleId: string
  author: string
  updatedAt: string
  linkedKeys: string[]
  bodyEn: string
  bodyId: string
}

export interface SavedJqlFilter {
  id: string
  name: string
  jql: string
}

export const INITIAL_PROJECTS: JiraProjectMeta[] = [
  {
    key: 'DX',
    nameEn: 'DreamEx Sovereign Core',
    nameId: 'Inti Sovereign DreamEx',
    methodology: 'Scrum',
    lead: 'Bima',
    categoryEn: 'Platform Engineering',
    categoryId: 'Rekayasa Platform',
  },
  {
    key: 'FIN',
    nameEn: 'Global QRIS & Payment Rail',
    nameId: 'Jaringan QRIS & Pembayaran Global',
    methodology: 'Scrum',
    lead: 'Rizky',
    categoryEn: 'Financial Ledger',
    categoryId: 'Ledger Finansial',
  },
  {
    key: 'OPS',
    nameEn: 'Cloud SRE & Service Desk',
    nameId: 'SRE Cloud & Layanan Insiden',
    methodology: 'ITSM',
    lead: 'Alya',
    categoryEn: 'Service Management',
    categoryId: 'Manajemen Layanan',
  },
  {
    key: 'AI',
    nameEn: 'Autonomous Multi-Agent Lab',
    nameId: 'Lab Multi-Agen Otonom',
    methodology: 'Kanban',
    lead: 'Nadia',
    categoryEn: 'Applied AI R&D',
    categoryId: 'Riset AI Terapan',
  },
]

export const JIRA_COMPONENTS = [
  'Zero-Trust Auth',
  'Ledger Core',
  'QA Playwright Mesh',
  'AI Orchestrator',
  'Edge API Gateway',
] as const

export const INITIAL_SAVED_FILTERS: SavedJqlFilter[] = [
  { id: 'sf-1', name: 'P0/P1 Unresolved', jql: 'priority in (Highest, High) AND status != Done' },
  { id: 'sf-2', name: 'Security & Bugs', jql: 'labels = security' },
  { id: 'sf-3', name: 'Rizky Active Queue', jql: 'assignee = "Rizky" AND status != Done' },
  { id: 'sf-4', name: 'Ready for QA Review', jql: 'status = review' },
]

export const INITIAL_DISCOVERY_IDEAS: ProductDiscoveryIdea[] = [
  {
    id: 'idea-1',
    code: 'IDEA-01',
    titleEn: 'Biometric Passkey (WebAuthn) passwordless step-up for high-value settlements',
    titleId: 'Verifikasi Passkey Biometrik (WebAuthn) untuk otorisasi settlement bernilai besar',
    reach: 850,
    impact: 3,
    confidence: 90,
    effort: 3,
    epicKey: 'DX-EPIC-1',
  },
  {
    id: 'idea-2',
    code: 'IDEA-02',
    titleEn: 'Autonomous PR Risk Scorer with automatic canary traffic throttling',
    titleId: 'Penilai Risiko Pull Request Otonom dengan pembatas trafik canary otomatis',
    reach: 620,
    impact: 3,
    confidence: 85,
    effort: 4,
    epicKey: 'DX-EPIC-4',
  },
  {
    id: 'idea-3',
    code: 'IDEA-03',
    titleEn: 'Visual GraphQL & OpenAPI breaking-change simulator inside Jira tickets',
    titleId: 'Simulator breaking-change OpenAPI & GraphQL visual langsung di tiket Jira',
    reach: 480,
    impact: 2,
    confidence: 80,
    effort: 3,
    epicKey: 'DX-EPIC-3',
  },
]

export const INITIAL_JSM_TICKETS: JsmServiceTicket[] = [
  {
    id: 'jsm-1',
    key: 'INC-501',
    kind: 'incident',
    severity: 'SEV-1',
    summaryEn: 'Elevated P99 latency (410ms) on APAC edge webhook verifier during burst traffic',
    summaryId: 'Lonjakan latensi P99 (410ms) pada verifikator webhook APAC saat trafik puncak',
    service: 'Edge API Gateway',
    requester: 'Datadog Alert Sentinel',
    cabStatus: 'pending',
    slaRemainingEn: '18m to SLA breach',
    slaRemainingId: '18 menit menuju batas SLA',
  },
  {
    id: 'jsm-2',
    key: 'CHG-704',
    kind: 'change',
    severity: 'SEV-2',
    summaryEn: 'Production PostgreSQL 17 read-replica promotion & zero-downtime connection drain',
    summaryId: 'Promosi read-replica PostgreSQL 17 produksi & pengalihan koneksi tanpa downtime',
    service: 'Ledger Core',
    requester: 'Rizky · Staff SE',
    cabStatus: 'approved',
    slaRemainingEn: 'CAB Window: Tonight 23:00 UTC',
    slaRemainingId: 'Jadwal CAB: Malam ini 23:00 UTC',
  },
  {
    id: 'jsm-3',
    key: 'INC-509',
    kind: 'incident',
    severity: 'SEV-2',
    summaryEn: 'Intermittent Playwright trace upload timeout on large WebKit artifacts',
    summaryId: 'Timeout unggah trace Playwright intermiten pada artefak WebKit berukuran besar',
    service: 'QA Playwright Mesh',
    requester: 'Nadia · Lead SDET',
    cabStatus: 'mitigated',
    slaRemainingEn: 'Mitigated · Postmortem ready',
    slaRemainingId: 'Termitigasi · Siap postmortem',
  },
]

export const INITIAL_CONFLUENCE_DOCS: ConfluenceSpecDoc[] = [
  {
    id: 'doc-1',
    code: 'PRD-204',
    category: 'PRD',
    titleEn: 'PRD: Idempotent T+0 Cross-Border Settlement & Outbox Guarantee',
    titleId: 'PRD: Jaminan Outbox & Settlement Lintas Negara T+0 Idempoten',
    author: 'Dimas (Principal BA)',
    updatedAt: '2026-11-17',
    linkedKeys: ['DX-102', 'DX-104'],
    bodyEn: [
      '## Objective',
      'Guarantee exactly-once financial ledger mutation across retry storms with P95 latency <= 25ms.',
      '',
      '## Acceptance Invariants',
      '- Every POST mutation requires a 24h SHA-256 `Idempotency-Key` lock.',
      '- Transactional Outbox publishes settlement events atomically within the same DB commit.',
      '- Action Item: Benchmark 1,000 RPS duplicate key replay resilience in staging.',
    ].join('\n'),
    bodyId: [
      '## Tujuan Produk',
      'Menjamin mutasi ledger finansial tepat satu kali (exactly-once) saat terjadi badai retry dengan latensi P95 <= 25ms.',
      '',
      '## Invarian Kriteria Penerimaan',
      '- Setiap mutasi POST wajib disertai kunci `Idempotency-Key` SHA-256 berdurasi 24 jam.',
      '- Transactional Outbox menerbitkan event secara atomik dalam transaksi database yang sama.',
      '- Tindak Lanjut: Uji ketahanan replay 1.000 RPS kunci duplikat di lingkungan staging.',
    ].join('\n'),
  },
  {
    id: 'doc-2',
    code: 'ADR-019',
    category: 'ADR',
    titleEn: 'ADR-019: Ed25519 Device-Bound Refresh Token Rotation',
    titleId: 'ADR-019: Rotasi Refresh Token Ed25519 Terikat Perangkat',
    author: 'Alya (SecOps Lead)',
    updatedAt: '2026-11-16',
    linkedKeys: ['DX-101', 'DX-106'],
    bodyEn: [
      '## Context & Decision',
      'Bearer refresh tokens without replay detection expose session hijack risk. We adopt Ed25519 asymmetric signing with atomic token-family revocation.',
      '',
      '## Consequences',
      '- Reuse of any rotated refresh token immediately invalidates the entire session family within 15ms.',
      '- Action Item: Add automated SIEM webhook alert on family revocation.',
    ].join('\n'),
    bodyId: [
      '## Konteks & Keputusan Arsitektur',
      'Refresh token tanpa deteksi replay berisiko dibajak. Kami mengadopsi tanda tangan asimetris Ed25519 dengan pencabutan keluarga token secara atomik.',
      '',
      '## Konsekuensi Teknis',
      '- Penggunaan ulang token lama otomatis mencabut seluruh sesi terkait dalam < 15ms.',
      '- Tindak Lanjut: Tambahkan integrasi alert webhook SIEM otomatis saat pencabutan sesi.',
    ].join('\n'),
  },
  {
    id: 'doc-3',
    code: 'RUN-008',
    category: 'RUNBOOK',
    titleEn: 'Runbook: Zero-Downtime Canary Rollback & Circuit Breaker Failover',
    titleId: 'Runbook: Rollback Canary Tanpa Downtime & Failover Circuit Breaker',
    author: 'Bima (Delivery PM)',
    updatedAt: '2026-11-15',
    linkedKeys: ['DX-107'],
    bodyEn: [
      '## Trigger Thresholds',
      'Initiate instant rollback if 5xx error budget burn exceeds 2.0% over 5 minutes or P99 exceeds 350ms.',
      '',
      '## Automated Recovery Steps',
      '1. Shift Vercel / Edge alias weight to previous green immutable deployment.',
      '2. Drain active worker queues and preserve forensic OpenTelemetry traces.',
    ].join('\n'),
    bodyId: [
      '## Ambang Pemicu Insiden',
      'Jalankan rollback instan apabila tingkat error 5xx melampaui 2,0% selama 5 menit atau latensi P99 melewati 350ms.',
      '',
      '## Langkah Pemulihan Otomatis',
      '1. Alihkan bobot trafik alias produksi ke deployment stabil sebelumnya.',
      '2. Kuras antrean worker aktif dan simpan jejak forensik OpenTelemetry.',
    ].join('\n'),
  },
]

export function computeRiceScore(idea: ProductDiscoveryIdea): number {
  return Math.round((idea.reach * idea.impact * (idea.confidence / 100)) / Math.max(1, idea.effort))
}

export function estimatePokerStoryPoints(
  complexity: 1 | 2 | 3 | 5,
  uncertainty: 1 | 2 | 3,
  qaScope: 1 | 2 | 3,
): number {
  const raw = complexity * 1.8 + uncertainty * 1.5 + qaScope * 1.2
  const fib = [1, 2, 3, 5, 8, 13, 21]
  return fib.reduce((prev, curr) => (Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev))
}

export function buildAutonomousStandupDigest(
  sprintName: string,
  issues: readonly JiraIssue[],
  confidenceScore: number,
  en: boolean,
): string {
  const active = issues.filter(i => i.sprintId === 'sprint-24')
  const done = active.filter(i => i.status === 'done')
  const inFlight = active.filter(i => i.status === 'in_progress' || i.status === 'review')
  const blocked = active.filter(i => i.status === 'blocked')

  if (en) {
    return [
      `📣 *DreamEx Jira OS — Autonomous Daily Standup (${sprintName})*`,
      `• *AI Delivery Confidence:* ${confidenceScore}%`,
      `• *Completed (${done.length}):* ${done.map(i => `${i.key} (${i.points}SP)`).join(', ') || 'None yet'}`,
      `• *In Flight & QA (${inFlight.length}):* ${inFlight.map(i => `${i.key} @${i.assignee} [${i.status}]`).join(', ') || 'None'}`,
      `• *Blockers & SLA Watch (${blocked.length}):* ${blocked.map(i => `${i.key} (blocked by ${i.blockedByKey || 'upstream'})`).join(', ') || '0 active blockers ✅'}`,
    ].join('\n')
  }

  return [
    `📣 *DreamEx Jira OS — Ringkasan Daily Standup Otonom (${sprintName})*`,
    `• *Keyakinan Delivery AI:* ${confidenceScore}%`,
    `• *Selesai (${done.length}):* ${done.map(i => `${i.key} (${i.points}SP)`).join(', ') || 'Belum ada'}`,
    `• *Sedang Dikerjakan & QA (${inFlight.length}):* ${inFlight.map(i => `${i.key} @${i.assignee} [${i.status}]`).join(', ') || 'Kosong'}`,
    `• *Blocker & Pengawasan SLA (${blocked.length}):* ${blocked.map(i => `${i.key} (tertahan ${i.blockedByKey || 'hulu'})`).join(', ') || '0 hambatan aktif ✅'}`,
  ].join('\n')
}
