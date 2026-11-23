import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Cloud,
  Copy,
  Database,
  Download,
  Eye,
  Filter,
  Flag,
  FolderKanban,
  GitBranch,
  GitMerge,
  HelpCircle,
  Kanban,
  Layers3,
  Lightbulb,
  Link2,
  ListChecks,
  PackageCheck,
  PanelLeft,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Table2,
  ThumbsUp,
  Trash2,
  Undo2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { useLanguage } from './i18n'
import { generateWithByokAi, loadSessionAiConfig } from './aiClient'
import { useProjectContextBus } from './projectContextBus'
import { consumeQueuedJiraTickets } from './jiraInboxBridge'
import {
  analyzeForwardHorizon,
  buildReleaseNotesMarkdown,
  compileGoalIntoAutonomousSprintPlan,
  computeIssueSlaState,
  executeAutonomousSelfHeal,
  INITIAL_RELEASES,
  type JiraReleaseVersion,
} from './jiraAutonomousBrain'
import {
  buildAutonomousStandupDigest,
  computeRiceScore,
  estimatePokerStoryPoints,
  INITIAL_CONFLUENCE_DOCS,
  INITIAL_DISCOVERY_IDEAS,
  INITIAL_JSM_TICKETS,
  INITIAL_PROJECTS,
  INITIAL_SAVED_FILTERS,
  JIRA_COMPONENTS,
  type ConfluenceSpecDoc,
  type JiraProjectMeta,
  type JsmServiceTicket,
  type ProductDiscoveryIdea,
  type SavedJqlFilter,
} from './jiraEnterpriseModules'
import './JiraEnterpriseBoard.css'

const JiraCalendarView = lazy(() =>
  import('./jira/JiraProViews').then(m => ({ default: m.JiraCalendarView })),
)
const JiraFormsPortalView = lazy(() =>
  import('./jira/JiraProViews').then(m => ({ default: m.JiraFormsPortalView })),
)
const JiraWorkflowSettingsView = lazy(() =>
  import('./jira/JiraProViews').then(m => ({ default: m.JiraWorkflowSettingsView })),
)
const JiraCloudSyncPanel = lazy(() =>
  import('./jira/JiraCloudSyncPanel').then(m => ({ default: m.JiraCloudSyncPanel })),
)
const JiraDoraPanel = lazy(() =>
  import('./jira/JiraDoraPanel').then(m => ({ default: m.JiraDoraPanel })),
)
const JiraListView = lazy(() =>
  import('./jira/JiraListView').then(m => ({ default: m.JiraListView })),
)

export type JiraStatusId = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'
export type JiraIssueKind = 'story' | 'bug' | 'task' | 'security'
export type JiraPriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low'
export type JiraSprintId = 'sprint-24' | 'sprint-25' | 'backlog'
export type JiraViewTab =
  | 'board'
  | 'list'
  | 'autopilot'
  | 'backlog'
  | 'roadmap'
  | 'calendar'
  | 'discovery'
  | 'jsm'
  | 'forms'
  | 'wiki'
  | 'releases'
  | 'navigator'
  | 'reports'
  | 'automation'
  | 'workflow'
export type JiraSwimlaneMode = 'none' | 'epic' | 'assignee' | 'priority' | 'component'

export interface JiraSubtask {
  id: string
  title: string
  done: boolean
}

export interface JiraComment {
  id: string
  author: string
  body: string
  createdAt: string
  kind: 'comment' | 'activity'
}

export interface JiraEpic {
  id: string
  key: string
  nameEn: string
  nameId: string
  color: string
  startSlot: number // 0..7 (Oct W1 .. Jan W2)
  spanSlots: number // 1..8
  owner: string
}

export interface JiraIssue {
  id: string
  key: string
  title: string
  description: string
  type: JiraIssueKind
  status: JiraStatusId
  priority: JiraPriorityLevel
  points: number
  assignee: string
  epicKey: string
  sprintId: JiraSprintId
  labels: string[]
  blockedByKey?: string
  prRef?: string
  playwrightSpec?: string
  dueDate: string
  estHours?: number
  loggedHours?: number
  component?: string
  fixVersion?: string
  watching?: boolean
  flagged?: boolean
  votes?: number
  linkedIssues?: Array<{ kind: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates'; key: string }>
  subtasks: JiraSubtask[]
  comments: JiraComment[]
  updatedAt: string
}

export interface JiraAutomationRule {
  id: string
  code: string
  nameEn: string
  nameId: string
  triggerEn: string
  triggerId: string
  actionEn: string
  actionId: string
  enabled: boolean
  runs: number
}

export interface VelocityRecord {
  sprintName: string
  committed: number
  completed: number
}

interface JiraWorkspaceState {
  activeSprintName: string
  activeSprintGoal: string
  wipLimits: Record<JiraStatusId, number>
  issues: JiraIssue[]
  rules: JiraAutomationRule[]
  automationLogs: string[]
  velocityHistory: VelocityRecord[]
  nextSequence: number
}

const STORAGE_KEY = 'dreamex-jira-enterprise-os-v1'

const TEAM_MEMBERS = [
  { id: 'Rizky', role: 'Staff SE', initials: 'RZ' },
  { id: 'Nadia', role: 'Lead SDET', initials: 'ND' },
  { id: 'Dimas', role: 'Principal BA', initials: 'DM' },
  { id: 'Alya', role: 'SecOps Lead', initials: 'AL' },
  { id: 'Bima', role: 'Delivery PM', initials: 'BM' },
] as const

const EPICS: readonly JiraEpic[] = [
  {
    id: 'epic-1',
    key: 'DX-EPIC-1',
    nameEn: 'Zero-Trust Identity & RBAC Vault',
    nameId: 'Identitas Zero-Trust & Brankas RBAC',
    color: 'linear-gradient(90deg, #c5ff70, #34d399)',
    startSlot: 0,
    spanSlots: 3,
    owner: 'Alya',
  },
  {
    id: 'epic-2',
    key: 'DX-EPIC-2',
    nameEn: 'Idempotent Settlement & Ledger Core',
    nameId: 'Inti Ledger & Settlement Idempoten',
    color: 'linear-gradient(90deg, #38bdf8, #818cf8)',
    startSlot: 1,
    spanSlots: 4,
    owner: 'Rizky',
  },
  {
    id: 'epic-3',
    key: 'DX-EPIC-3',
    nameEn: 'Self-Healing Playwright QA Mesh',
    nameId: 'Mesh QA Playwright Self-Healing',
    color: 'linear-gradient(90deg, #5eead4, #38bdf8)',
    startSlot: 2,
    spanSlots: 4,
    owner: 'Nadia',
  },
  {
    id: 'epic-4',
    key: 'DX-EPIC-4',
    nameEn: '5-Agent Autonomous Orchestrator',
    nameId: 'Orkestrator Otonom 5-Agen AI',
    color: 'linear-gradient(90deg, #f472b6, #c084fc)',
    startSlot: 4,
    spanSlots: 4,
    owner: 'Dimas',
  },
]

const COLUMNS: readonly { id: JiraStatusId; en: string; idLabel: string; dot: string }[] = [
  { id: 'todo', en: 'To Do', idLabel: 'Akan Dikerjakan', dot: '#94a3b8' },
  { id: 'in_progress', en: 'In Progress', idLabel: 'Dikerjakan', dot: '#38bdf8' },
  { id: 'review', en: 'In Review & QA', idLabel: 'Review & QA', dot: '#a78bfa' },
  { id: 'blocked', en: 'Blocked', idLabel: 'Terhambat', dot: '#f87171' },
  { id: 'done', en: 'Done', idLabel: 'Selesai', dot: '#4ade80' },
]

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21] as const

function createDefaultState(): JiraWorkspaceState {
  const nowIso = '2026-11-17T09:00:00.000Z'
  return {
    activeSprintName: 'Sprint 24 · Q4 Autonomous Core',
    activeSprintGoal: 'Deliver idempotent settlement APIs, strict CSP/RBAC enforcement, and zero-flake Playwright gates.',
    wipLimits: { todo: 0, in_progress: 4, review: 3, blocked: 2, done: 0 },
    nextSequence: 110,
    velocityHistory: [
      { sprintName: 'Sprint 20', committed: 34, completed: 31 },
      { sprintName: 'Sprint 21', committed: 38, completed: 36 },
      { sprintName: 'Sprint 22', committed: 40, completed: 39 },
      { sprintName: 'Sprint 23', committed: 42, completed: 41 },
    ],
    rules: [
      {
        id: 'rule-sec-escalate',
        code: 'AUTO-01',
        nameEn: 'Auto-Escalate Security & Critical Bugs',
        nameId: 'Eskalasi Otomatis Bug & Tiket Keamanan',
        triggerEn: 'WHEN Issue Created (type = Security OR label = security)',
        triggerId: 'SAAT Tiket Dibuat (tipe = Security ATAU label = security)',
        actionEn: 'THEN Set Priority = Highest & Assign Alya (SecOps)',
        actionId: 'MAKA Set Prioritas = Highest & Tugaskan ke Alya (SecOps)',
        enabled: true,
        runs: 4,
      },
      {
        id: 'rule-qa-subtask',
        code: 'AUTO-02',
        nameEn: 'Inject Playwright Verification Subtask on QA Transition',
        nameId: 'Suntikkan Subtask Verifikasi Playwright saat Masuk QA',
        triggerEn: 'WHEN Status transitions to In Review & QA',
        triggerId: 'SAAT Status berpindah ke Review & QA',
        actionEn: 'THEN Append automated Playwright E2E regression subtask',
        actionId: 'MAKA Tambahkan subtask regresi E2E Playwright otomatis',
        enabled: true,
        runs: 7,
      },
      {
        id: 'rule-done-close-subtasks',
        code: 'AUTO-03',
        nameEn: 'Auto-Complete Subtasks & Audit Stamp on Done',
        nameId: 'Selesaikan Subtask & Catat Jejak Audit saat Selesai',
        triggerEn: 'WHEN Status transitions to Done',
        triggerId: 'SAAT Status berpindah ke Selesai',
        actionEn: 'THEN Mark all subtasks Done & record audit log',
        actionId: 'MAKA Tandai seluruh subtask selesai & rekam log audit',
        enabled: true,
        runs: 11,
      },
    ],
    automationLogs: [
      '[AUTO-03] DX-101 transitioned to Done -> 3/3 subtasks verified & closed.',
      '[AUTO-02] DX-103 moved to In Review & QA -> Playwright regression gate attached.',
      '[AUTO-01] DX-105 tagged #security -> Priority escalated to Highest (Alya).',
    ],
    issues: [
      {
        id: 'iss-101',
        key: 'DX-101',
        title: 'Enforce rotating Ed25519 JWT session binding & replay lock',
        description:
          'Scenario: Prevent stolen refresh token replay\n  Given an active session bound to device fingerprint\n  When a rotated refresh token is re-submitted\n  Then revoke token family within 15ms and emit SIEM alert',
        type: 'security',
        status: 'done',
        priority: 'Highest',
        points: 8,
        assignee: 'Alya',
        epicKey: 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: ['security', 'zero-trust', 'auth'],
        prRef: 'PR #408 · Merged',
        playwrightSpec: 'tests/e2e/auth-rotation.spec.ts',
        dueDate: '2026-11-18',
        subtasks: [
          { id: 'st-101-1', title: 'Implement Ed25519 JWK rotation endpoint', done: true },
          { id: 'st-101-2', title: 'Add Redis atomic token-family revocation', done: true },
          { id: 'st-101-3', title: 'Verify OWASP ASVS V3 session controls', done: true },
        ],
        comments: [
          {
            id: 'cm-101-1',
            author: 'Alya',
            body: 'Replay lock verified at P99 4.2ms in staging load test.',
            createdAt: '2026-11-16 14:20',
            kind: 'comment',
          },
        ],
        updatedAt: nowIso,
      },
      {
        id: 'iss-102',
        key: 'DX-102',
        title: 'Build idempotent T+0 ledger settlement engine with Outbox pattern',
        description:
          'Scenario: Duplicate settlement key rejection\n  Given an existing Idempotency-Key in ledger store\n  When POST /v2/settlements/execute is retried\n  Then return cached 200 receipt with zero double-debit',
        type: 'story',
        status: 'in_progress',
        priority: 'Highest',
        points: 8,
        assignee: 'Rizky',
        epicKey: 'DX-EPIC-2',
        sprintId: 'sprint-24',
        labels: ['ledger', 'idempotency', 'fintech'],
        prRef: 'PR #414 · Open',
        playwrightSpec: 'tests/e2e/settlement-idempotency.spec.ts',
        dueDate: '2026-11-21',
        subtasks: [
          { id: 'st-102-1', title: 'Author PostgreSQL serializable outbox migration', done: true },
          { id: 'st-102-2', title: 'Implement 24h idempotency-key hash lock', done: true },
          { id: 'st-102-3', title: 'Run k6 concurrency stress test (500 RPS)', done: false },
        ],
        comments: [
          {
            id: 'cm-102-1',
            author: 'Rizky',
            body: 'Outbox worker draining cleanly; running 500 RPS soak test next.',
            createdAt: '2026-11-17 10:05',
            kind: 'comment',
          },
        ],
        updatedAt: nowIso,
      },
      {
        id: 'iss-103',
        key: 'DX-103',
        title: 'Synthesize self-healing ARIA locator fallback for checkout & RBAC flows',
        description:
          'Scenario: Resilient Playwright locator recovery\n  Given primary CSS class mutates during UI refactor\n  When semantic getByRole + data-testid fallback runs\n  Then suite passes with zero flake and logs selector diff',
        type: 'task',
        status: 'review',
        priority: 'High',
        points: 5,
        assignee: 'Nadia',
        epicKey: 'DX-EPIC-3',
        sprintId: 'sprint-24',
        labels: ['playwright', 'qa-mesh', 'auto-heal'],
        prRef: 'PR #419 · Review',
        playwrightSpec: 'tests/e2e/self-healing-locators.spec.ts',
        dueDate: '2026-11-20',
        subtasks: [
          { id: 'st-103-1', title: 'Score selector resilience >= 92/100', done: true },
          { id: 'st-103-2', title: 'Validate Chromium + Mobile Safari parity', done: false },
        ],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-104',
        key: 'DX-104',
        title: 'Fix race condition in multi-currency FX rate cache invalidation',
        description:
          'Observed stale 30s FX quote during high-volatility window when regional edge cache purges asynchronously.',
        type: 'bug',
        status: 'blocked',
        priority: 'Highest',
        points: 5,
        assignee: 'Rizky',
        epicKey: 'DX-EPIC-2',
        sprintId: 'sprint-24',
        labels: ['bug', 'cache', 'fx-engine'],
        blockedByKey: 'DX-102',
        prRef: 'PR #421 · Draft',
        dueDate: '2026-11-22',
        subtasks: [
          { id: 'st-104-1', title: 'Reproduce stale read with deterministic clock mock', done: true },
          { id: 'st-104-2', title: 'Wire versioned pub/sub cache tag invalidation', done: false },
        ],
        comments: [
          {
            id: 'cm-104-1',
            author: 'Bima',
            body: 'Blocked awaiting Outbox event schema freeze in DX-102.',
            createdAt: '2026-11-17 11:30',
            kind: 'comment',
          },
        ],
        updatedAt: nowIso,
      },
      {
        id: 'iss-105',
        key: 'DX-105',
        title: 'Compile BRD acceptance rules into bi-directional Gherkin RTM matrix',
        description:
          'Ensure every business requirement maps 1:1 to an OpenAPI endpoint, Playwright spec, and Jira issue key.',
        type: 'story',
        status: 'in_progress',
        priority: 'High',
        points: 5,
        assignee: 'Dimas',
        epicKey: 'DX-EPIC-4',
        sprintId: 'sprint-24',
        labels: ['gherkin', 'rtm', 'ba-studio'],
        dueDate: '2026-11-23',
        subtasks: [
          { id: 'st-105-1', title: 'Map orphan test cases to BRD clauses', done: true },
          { id: 'st-105-2', title: 'Export signed UAT sign-off bundle', done: false },
        ],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-106',
        key: 'DX-106',
        title: 'Harden Content-Security-Policy & SSRF guard on URL Grader edge endpoint',
        description: 'Block private IPv4/IPv6 ranges and validate strict script-src directives.',
        type: 'security',
        status: 'done',
        priority: 'High',
        points: 3,
        assignee: 'Alya',
        epicKey: 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: ['security', 'csp', 'ssrf'],
        prRef: 'PR #410 · Merged',
        dueDate: '2026-11-17',
        subtasks: [{ id: 'st-106-1', title: 'Verify private CIDR blocklist unit tests', done: true }],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-107',
        key: 'DX-107',
        title: 'Add 5-agent DAG token budget telemetry & failover circuit breaker',
        description: 'Stream per-agent token consumption and auto-failover to backup provider on HTTP 429/503.',
        type: 'story',
        status: 'todo',
        priority: 'Medium',
        points: 8,
        assignee: 'Bima',
        epicKey: 'DX-EPIC-4',
        sprintId: 'sprint-24',
        labels: ['ai-agents', 'finops', 'resilience'],
        dueDate: '2026-11-25',
        subtasks: [
          { id: 'st-107-1', title: 'Define monthly token ceiling alert threshold', done: false },
          { id: 'st-107-2', title: 'Simulate primary LLM region outage failover', done: false },
        ],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-108',
        key: 'DX-108',
        title: 'Implement CycloneDX SBOM transitive vulnerability diff gate in CI',
        description: 'Fail pull requests introducing high/critical CVEs in production runtime dependencies.',
        type: 'security',
        status: 'todo',
        priority: 'High',
        points: 5,
        assignee: 'Alya',
        epicKey: 'DX-EPIC-1',
        sprintId: 'sprint-25',
        labels: ['security', 'sbom', 'ci-cd'],
        dueDate: '2026-12-03',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-109',
        key: 'DX-109',
        title: 'Streamable MCP JSON-RPC tool discovery for autonomous IDE coding agents',
        description: 'Expose USL scalability, selector scorer, and sprint Monte Carlo tools over /api/mcp.',
        type: 'story',
        status: 'todo',
        priority: 'Medium',
        points: 8,
        assignee: 'Rizky',
        epicKey: 'DX-EPIC-4',
        sprintId: 'backlog',
        labels: ['mcp', 'ai-agents', 'api'],
        dueDate: '2026-12-12',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-fin-201',
        key: 'FIN-201',
        title: 'Cross-border QRIS ISO-20022 settlement webhook idempotency ledger',
        description: 'Guarantee zero double-settlement across multi-currency QRIS rails with SHA-256 locks.',
        type: 'story',
        status: 'in_progress',
        priority: 'Highest',
        points: 8,
        assignee: 'Rizky',
        epicKey: 'DX-EPIC-2',
        sprintId: 'sprint-24',
        labels: ['qris', 'fintech', 'iso-20022'],
        component: 'Ledger Core',
        fixVersion: 'v7.1.0',
        dueDate: '2026-11-24',
        subtasks: [{ id: 'st-fin-1', title: 'Validate ISO-20022 pacs.008 schema', done: true }],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-fin-202',
        key: 'FIN-202',
        title: 'Real-time anomaly velocity check on high-value merchant payouts',
        description: 'Score merchant settlement bursts in < 8ms and hold flagged payouts for step-up review.',
        type: 'security',
        status: 'review',
        priority: 'High',
        points: 5,
        assignee: 'Alya',
        epicKey: 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: ['fraud-shield', 'security', 'fintech'],
        component: 'Zero-Trust Auth',
        fixVersion: 'v7.1.0',
        dueDate: '2026-11-27',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-ops-301',
        key: 'OPS-301',
        title: 'Automate regional Vercel edge canary rollback on 5xx SLO burn > 2%',
        description: 'Bind synthetic probe alerts directly to instant alias rollback runbook.',
        type: 'task',
        status: 'in_progress',
        priority: 'Highest',
        points: 5,
        assignee: 'Alya',
        epicKey: 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: ['sre', 'canary', 'slo'],
        component: 'Edge API Gateway',
        fixVersion: 'v7.1.0',
        dueDate: '2026-11-25',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-ops-302',
        key: 'OPS-302',
        title: 'PostgreSQL 17 zero-downtime read-replica failover drill',
        description: 'Execute scheduled CAB chaos drill verifying < 4s connection pool recovery.',
        type: 'task',
        status: 'todo',
        priority: 'High',
        points: 3,
        assignee: 'Bima',
        epicKey: 'DX-EPIC-2',
        sprintId: 'sprint-24',
        labels: ['postgres', 'cab', 'resilience'],
        component: 'Ledger Core',
        fixVersion: 'v7.1.0',
        dueDate: '2026-11-29',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-ai-401',
        key: 'AI-401',
        title: 'Multi-agent DAG token budget ceiling & backup provider circuit breaker',
        description: 'Auto-switch from primary to fallback LLM provider on HTTP 429/503 with zero dropped turns.',
        type: 'story',
        status: 'in_progress',
        priority: 'High',
        points: 8,
        assignee: 'Nadia',
        epicKey: 'DX-EPIC-4',
        sprintId: 'sprint-24',
        labels: ['ai-agents', 'finops', 'mcp'],
        component: 'AI Orchestrator',
        fixVersion: 'v7.2.0',
        dueDate: '2026-12-04',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
      {
        id: 'iss-ai-402',
        key: 'AI-402',
        title: 'Deterministic Gherkin-to-Playwright self-healing locator benchmark',
        description: 'Achieve >= 98% selector stability across Chromium and WebKit DOM refactors.',
        type: 'task',
        status: 'done',
        priority: 'Medium',
        points: 5,
        assignee: 'Nadia',
        epicKey: 'DX-EPIC-3',
        sprintId: 'sprint-24',
        labels: ['playwright', 'auto-heal', 'qa-mesh'],
        component: 'QA Playwright Mesh',
        fixVersion: 'v7.1.0',
        dueDate: '2026-11-20',
        subtasks: [],
        comments: [],
        updatedAt: nowIso,
      },
    ],
  }
}

function decodeShareableSyncParam(rawParam: string): Partial<JiraWorkspaceState> | null {
  try {
    const normalized = rawParam.replaceAll('-', '+').replaceAll('_', '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const bin = atob(normalized + pad)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as {
      activeSprintName?: string
      issues?: Array<Partial<JiraIssue>>
    }
    if (!decoded || !Array.isArray(decoded.issues) || !decoded.issues.length) return null
    const nowIso = new Date().toISOString()
    const hydratedIssues: JiraIssue[] = decoded.issues.slice(0, 24).map((i, idx) => ({
      id: typeof i.id === 'string' && i.id ? i.id : `sync-${idx + 1}`,
      key: typeof i.key === 'string' && i.key ? i.key : `DX-${900 + idx}`,
      title: typeof i.title === 'string' && i.title ? i.title : 'Synced Issue',
      description: typeof i.description === 'string' ? i.description : 'Hydrated from DreamEx Shareable Multi-Device Sync URL.',
      type: i.type === 'bug' || i.type === 'task' || i.type === 'security' ? i.type : 'story',
      status:
        i.status === 'in_progress' || i.status === 'review' || i.status === 'blocked' || i.status === 'done'
          ? i.status
          : 'todo',
      priority:
        i.priority === 'Highest' || i.priority === 'High' || i.priority === 'Low' ? i.priority : 'Medium',
      points: typeof i.points === 'number' && i.points > 0 ? i.points : 3,
      assignee: typeof i.assignee === 'string' && i.assignee ? i.assignee : 'Rizky',
      epicKey: typeof i.epicKey === 'string' && i.epicKey ? i.epicKey : 'DX-EPIC-1',
      sprintId: i.sprintId === 'sprint-25' || i.sprintId === 'backlog' ? i.sprintId : 'sprint-24',
      labels: Array.isArray(i.labels) ? i.labels.map(String) : ['url-synced'],
      dueDate: typeof i.dueDate === 'string' && i.dueDate ? i.dueDate : '2026-11-28',
      subtasks: Array.isArray(i.subtasks) ? i.subtasks : [],
      comments: Array.isArray(i.comments) ? i.comments : [],
      updatedAt: nowIso,
    }))
    return {
      activeSprintName: typeof decoded.activeSprintName === 'string' ? decoded.activeSprintName : undefined,
      issues: hydratedIssues,
    }
  } catch {
    return null
  }
}

function loadState(): JiraWorkspaceState {
  if (typeof window === 'undefined') return createDefaultState()
  try {
    const syncParam = new URLSearchParams(window.location.search).get('sync')
    if (syncParam) {
      const fromUrl = decodeShareableSyncParam(syncParam)
      if (fromUrl?.issues?.length) {
        const fallback = createDefaultState()
        return {
          ...fallback,
          activeSprintName: fromUrl.activeSprintName ?? fallback.activeSprintName,
          issues: fromUrl.issues,
          automationLogs: [
            `[SYNC-URL] Hydrated ${fromUrl.issues.length} issue(s) from cross-device shareable board link.`,
            ...fallback.automationLogs,
          ],
        }
      }
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    const parsed = JSON.parse(raw) as Partial<JiraWorkspaceState>
    if (!parsed || !Array.isArray(parsed.issues) || !parsed.issues.length) return createDefaultState()
    const fallback = createDefaultState()
    return {
      activeSprintName: typeof parsed.activeSprintName === 'string' ? parsed.activeSprintName : fallback.activeSprintName,
      activeSprintGoal: typeof parsed.activeSprintGoal === 'string' ? parsed.activeSprintGoal : fallback.activeSprintGoal,
      wipLimits: parsed.wipLimits && typeof parsed.wipLimits === 'object' ? { ...fallback.wipLimits, ...parsed.wipLimits } : fallback.wipLimits,
      issues: parsed.issues,
      rules: Array.isArray(parsed.rules) ? parsed.rules : fallback.rules,
      automationLogs: Array.isArray(parsed.automationLogs) ? parsed.automationLogs : fallback.automationLogs,
      velocityHistory: Array.isArray(parsed.velocityHistory) ? parsed.velocityHistory : fallback.velocityHistory,
      nextSequence: typeof parsed.nextSequence === 'number' ? parsed.nextSequence : 115,
    }
  } catch {
    return createDefaultState()
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function nowStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function evaluateJqlMatch(issue: JiraIssue, rawQuery: string): boolean {
  const q = rawQuery.trim()
  if (!q) return true
  const lower = q.toLowerCase()

  // Structured JQL clauses detection
  const hasClauseSyntax = /\b(type|priority|status|assignee|labels|epic|sprint)\b\s*(=|!=|\bin\b|~)/i.test(q)
  if (!hasClauseSyntax) {
    const hay = `${issue.key} ${issue.title} ${issue.description} ${issue.assignee} ${issue.type} ${issue.priority} ${issue.epicKey} ${issue.labels.join(' ')}`.toLowerCase()
    return hay.includes(lower)
  }

  const clauses = q
    .replace(/\s+order\s+by\s+.+$/i, '')
    .split(/\s+AND\s+/i)
    .map(part => part.trim())
    .filter(Boolean)

  return clauses.every(clause => {
    const inMatch = clause.match(/^(\w+)\s+in\s*\(([^)]+)\)$/i)
    if (inMatch) {
      const field = inMatch[1].toLowerCase()
      const values = inMatch[2].split(',').map(v => v.trim().replace(/^["']|["']$/g, '').toLowerCase())
      if (field === 'priority') return values.includes(issue.priority.toLowerCase())
      if (field === 'type') return values.includes(issue.type.toLowerCase())
      if (field === 'status') return values.includes(issue.status.toLowerCase())
      if (field === 'assignee') return values.includes(issue.assignee.toLowerCase())
    }
    const neqMatch = clause.match(/^(\w+)\s*!=\s*["']?([^"']+)["']?$/i)
    if (neqMatch) {
      const field = neqMatch[1].toLowerCase()
      const val = neqMatch[2].trim().toLowerCase()
      if (field === 'status') return issue.status.toLowerCase() !== val
      if (field === 'priority') return issue.priority.toLowerCase() !== val
      if (field === 'type') return issue.type.toLowerCase() !== val
      if (field === 'assignee') return issue.assignee.toLowerCase() !== val
    }
    const eqMatch = clause.match(/^(\w+)\s*(=|~)\s*["']?([^"']+)["']?$/i)
    if (eqMatch) {
      const field = eqMatch[1].toLowerCase()
      const val = eqMatch[3].trim().toLowerCase()
      if (field === 'type') return issue.type.toLowerCase() === val
      if (field === 'priority') return issue.priority.toLowerCase() === val
      if (field === 'status') return issue.status.toLowerCase() === val
      if (field === 'assignee') return issue.assignee.toLowerCase().includes(val)
      if (field === 'labels' || field === 'label') return issue.labels.some(l => l.toLowerCase().includes(val))
      if (field === 'epic') return issue.epicKey.toLowerCase() === val
      if (field === 'sprint') return issue.sprintId.toLowerCase().includes(val)
    }
    const fallbackHay = `${issue.key} ${issue.title} ${issue.labels.join(' ')} ${issue.assignee}`.toLowerCase()
    return fallbackHay.includes(clause.toLowerCase())
  })
}

function buildBulkJiraAdfPayload(issues: readonly JiraIssue[]) {
  return {
    issueUpdates: issues.slice(0, 12).map(issue => ({
      fields: {
        project: { key: 'DX' },
        issuetype: {
          name: issue.type === 'security' ? 'Bug' : issue.type.charAt(0).toUpperCase() + issue.type.slice(1),
        },
        summary: `[${issue.key}] ${issue.title}`,
        priority: { name: issue.priority },
        labels: issue.labels,
        customfield_10016: issue.points,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: issue.description || issue.title }],
            },
          ],
        },
      },
    })),
  }
}

function buildJiraCsv(issues: readonly JiraIssue[]): string {
  const escapeCsv = (val: string | number) => `"${String(val).replaceAll('"', '""')}"`
  const header = [
    'Issue Key',
    'Issue Type',
    'Summary',
    'Status',
    'Priority',
    'Story Points',
    'Assignee',
    'Epic Link',
    'Sprint',
    'Labels',
    'Due Date',
  ].join(',')
  const rows = issues.map(i =>
    [
      escapeCsv(i.key),
      escapeCsv(i.type.toUpperCase()),
      escapeCsv(i.title),
      escapeCsv(i.status),
      escapeCsv(i.priority),
      escapeCsv(i.points),
      escapeCsv(i.assignee),
      escapeCsv(i.epicKey),
      escapeCsv(i.sprintId),
      escapeCsv(i.labels.join(';')),
      escapeCsv(i.dueDate),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

export default function JiraEnterpriseBoardPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const { context: syncedBlueprint } = useProjectContextBus()

  const [state, setState] = useState<JiraWorkspaceState>(loadState)
  const [activeTab, setActiveTab] = useState<JiraViewTab>('board')
  const [jqlQuery, setJqlQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL')
  const [quickFilter, setQuickFilter] = useState<'none' | 'bugs' | 'blocked' | 'subtasks'>('none')
  const [swimlane, setSwimlane] = useState<JiraSwimlaneMode>('none')
  const [mobileCol, setMobileCol] = useState<'all' | JiraStatusId>('all')

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<JiraStatusId | null>(null)

  // Modals & Drawers
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [completeSprintOpen, setCompleteSprintOpen] = useState(false)
  const [notice, setNotice] = useState('')

  // Create Issue Form
  const [newType, setNewType] = useState<JiraIssueKind>('story')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<JiraPriorityLevel>('High')
  const [newPoints, setNewPoints] = useState<number>(5)
  const [newAssignee, setNewAssignee] = useState<string>('Rizky')
  const [newEpic, setNewEpic] = useState<string>('DX-EPIC-2')
  const [newSprint, setNewSprint] = useState<JiraSprintId>('sprint-24')
  const [newLabels, setNewLabels] = useState('architecture, sprint-24')

  // Backlog inline quick-create
  const [quickBacklogTitle, setQuickBacklogTitle] = useState('')
  const [quickBacklogType, setQuickBacklogType] = useState<JiraIssueKind>('story')
  const [quickBacklogPoints, setQuickBacklogPoints] = useState<number>(3)

  // Issue Drawer Subtask & Comment inputs
  const [subtaskDraft, setSubtaskDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [labelDraft, setLabelDraft] = useState('')

  // Bulk Navigator state
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<JiraStatusId>('in_progress')
  const [bulkPriority, setBulkPriority] = useState<JiraPriorityLevel>('High')
  const [bulkAssignee, setBulkAssignee] = useState<string>('Rizky')

  // v7.1 Autonomous Brain, Releases & Custom Rule state
  const [autopilotEnabled, setAutopilotEnabled] = useState(true)
  const [showQuickFilters, setShowQuickFilters] = useState(false)
  const [showMoreTools, setShowMoreTools] = useState(false)
  const [goalPrompt, setGoalPrompt] = useState('')
  const [aiReasoningTrace, setAiReasoningTrace] = useState<string[]>([
    '[BRAIN-INIT] Multi-horizon graph analyzer online (T+7d Sprint, T+21d Next Sprint, T+42d Release).',
  ])
  const [byokForecast, setByokForecast] = useState('')
  const [byokBusy, setByokBusy] = useState(false)
  const [releases, setReleases] = useState<JiraReleaseVersion[]>(INITIAL_RELEASES)
  const [selectedReleaseId, setSelectedReleaseId] = useState<JiraReleaseVersion['id']>('v7.1.0')
  const [customRuleName, setCustomRuleName] = useState('')
  const [customRuleTrigger, setCustomRuleTrigger] = useState('WHEN Issue Priority = Highest')
  const [customRuleAction, setCustomRuleAction] = useState('THEN Notify On-Call Channel & Attach Rollback Checklist')

  // v8.0 Full Atlassian Cloud Parity state (Projects, Density, Discovery, JSM, Wiki, Saved Filters, Poker, Shortcuts)
  const jqlInputRef = useRef<HTMLInputElement>(null)
  const [projects, setProjects] = useState<JiraProjectMeta[]>(INITIAL_PROJECTS)
  const [activeProjectKey, setActiveProjectKey] = useState<string>('DX')
  const [newProjectKeyInput, setNewProjectKeyInput] = useState('')
  const [newProjectNameInput, setNewProjectNameInput] = useState('')
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [cardDensity, setCardDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [colQuickDrafts, setColQuickDrafts] = useState<Record<JiraStatusId, string>>({
    todo: '',
    in_progress: '',
    review: '',
    blocked: '',
    done: '',
  })
  const [epicsList, setEpicsList] = useState<JiraEpic[]>(() => [...EPICS])
  const [newEpicTitle, setNewEpicTitle] = useState('')
  const [savedFilters, setSavedFilters] = useState<SavedJqlFilter[]>(INITIAL_SAVED_FILTERS)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [ideas, setIdeas] = useState<ProductDiscoveryIdea[]>(INITIAL_DISCOVERY_IDEAS)
  const [newIdeaTitle, setNewIdeaTitle] = useState('')
  const [newIdeaReach, setNewIdeaReach] = useState(500)
  const [newIdeaImpact, setNewIdeaImpact] = useState<1 | 2 | 3>(3)
  const [newIdeaEffort, setNewIdeaEffort] = useState(3)
  const [jsmTickets, setJsmTickets] = useState<JsmServiceTicket[]>(INITIAL_JSM_TICKETS)
  const [wikiDocs, setWikiDocs] = useState<ConfluenceSpecDoc[]>(INITIAL_CONFLUENCE_DOCS)
  const [activeWikiId, setActiveWikiId] = useState<string>(INITIAL_CONFLUENCE_DOCS[0].id)
  const [pokerComplexity, setPokerComplexity] = useState<1 | 2 | 3 | 5>(3)
  const [pokerUncertainty, setPokerUncertainty] = useState<1 | 2 | 3>(2)
  const [pokerQa, setPokerQa] = useState<1 | 2 | 3>(2)

  // v9.0 App Shell Sidebar, Undo/Redo History, Workflow Validator & Issue Linking
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDesktopWide, setIsDesktopWide] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 1121px)').matches
      : true,
  )
  const [broadcastPeers, setBroadcastPeers] = useState(0)
  const skipBroadcastRef = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [requireSubtaskForDone, setRequireSubtaskForDone] = useState(false)
  const [undoStack, setUndoStack] = useState<JiraWorkspaceState[]>([])
  const [redoStack, setRedoStack] = useState<JiraWorkspaceState[]>([])
  const [linkKind, setLinkKind] = useState<'blocks' | 'blocked_by' | 'relates_to' | 'duplicates'>('relates_to')
  const [linkTargetKey, setLinkTargetKey] = useState<string>('DX-102')

  // v12.0 Live Neon Postgres / Vercel Cloud Auto-Sync + Compact Atlassian Shell toggle
  const [showFullTelemetry, setShowFullTelemetry] = useState(false)
  const [cloudDriver, setCloudDriver] = useState<string>('stateless-sovereign')
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [cloudRoom, setCloudRoom] = useState('dreamex-squad-24')
  const [cloudRev, setCloudRev] = useState(0)
  const [cloudAutoSync, setCloudAutoSync] = useState(false)
  const [cloudSyncing, setCloudSyncing] = useState(false)
  const [cloudLastSavedAt, setCloudLastSavedAt] = useState<string>('')

  useEffect(() => {
    let active = true
    fetch('/api/jira-sync', { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { cloudConfigured?: boolean; activeDriver?: string } | null) => {
        if (!active || !d) return
        const isCloud = Boolean(d.cloudConfigured)
        setCloudConfigured(isCloud)
        if (isCloud) setCloudAutoSync(true)
        if (d.activeDriver) setCloudDriver(d.activeDriver)
      })
      .catch(() => {
        /* Local-first fallback */
      })
    return () => {
      active = false
    }
  }, [])

  // v10.0 Track desktop breakpoint so ONLY Left Sidebar OR Horizontal Tabs Bar renders at any viewport
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 1121px)')
    const syncMatch = () => setIsDesktopWide(mq.matches)
    syncMatch()
    mq.addEventListener('change', syncMatch)
    return () => mq.removeEventListener('change', syncMatch)
  }, [])

  // v10.0 Real-Time Multi-Tab BroadcastChannel sync + v11.0 live presence heartbeat (<5ms)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') return
    const ch = new window.BroadcastChannel('dreamex-jira-live-bus')
    channelRef.current = ch
    ch.onmessage = ev => {
      const payload = ev.data as { type?: string; state?: JiraWorkspaceState } | null
      if (payload?.type === 'jira-state-sync' && payload.state && Array.isArray(payload.state.issues)) {
        skipBroadcastRef.current = true
        setState(payload.state)
        setBroadcastPeers(n => n + 1)
      } else if (payload?.type === 'jira-presence-ping') {
        ch.postMessage({ type: 'jira-presence-pong' })
        setBroadcastPeers(n => Math.max(1, n))
      } else if (payload?.type === 'jira-presence-pong') {
        setBroadcastPeers(n => Math.max(1, n))
      }
    }
    ch.postMessage({ type: 'jira-presence-ping' })
    return () => {
      ch.close()
      channelRef.current = null
    }
  }, [])

  // v11.0 Consume any tickets queued from /ba-hub or /pm-jira-hub cross-suite bridge
  useEffect(() => {
    const queued = consumeQueuedJiraTickets()
    if (!queued.length) return
    const nowIso = new Date().toISOString()
    setState(prev => {
      let seq = prev.nextSequence
      const created: JiraIssue[] = queued.map(d => {
        const key = `DX-${seq}`
        seq += 1
        return {
          id: uid('suite'),
          key,
          title: d.title,
          description: d.description,
          type: d.type,
          status: 'todo',
          priority: d.priority,
          points: d.points,
          assignee: d.type === 'bug' ? 'Nadia' : 'Rizky',
          epicKey: 'DX-EPIC-1',
          sprintId: 'sprint-24',
          labels: d.labels,
          dueDate: '2026-11-30',
          component: 'Ledger Core',
          fixVersion: 'v7.1.0',
          subtasks: [],
          comments: [],
          updatedAt: nowIso,
        }
      })
      return {
        ...prev,
        nextSequence: seq,
        issues: [...created, ...prev.issues],
        automationLogs: [
          `[SUITE-BRIDGE] Imported ${created.length} ticket(s) directly from ${queued[0].sourceSuite}.`,
          ...prev.automationLogs,
        ],
      }
    })
  }, [])

  const mutateWithUndo = useCallback((updater: (prev: JiraWorkspaceState) => JiraWorkspaceState) => {
    setState(prev => {
      const next = updater(prev)
      if (next === prev) return prev
      setUndoStack(stack => [prev, ...stack].slice(0, 18))
      setRedoStack([])
      return next
    })
  }, [])

  const handleUndo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack
      const [previous, ...rest] = stack
      setState(current => {
        setRedoStack(r => [current, ...r].slice(0, 18))
        return previous
      })
      return rest
    })
  }, [])

  const handleRedo = useCallback(() => {
    setRedoStack(stack => {
      if (!stack.length) return stack
      const [nextSnap, ...rest] = stack
      setState(current => {
        setUndoStack(u => [current, ...u].slice(0, 18))
        return nextSnap
      })
      return rest
    })
  }, [])

  // Persist to localStorage + broadcast live updates to other open tabs
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* Safe fallback if private browsing quota is restricted */
    }
    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false
      return
    }
    try {
      channelRef.current?.postMessage({ type: 'jira-state-sync', state })
    } catch {
      /* Ignore closed channel */
    }
  }, [state])

  // Keyboard shortcuts: 'c' Create, '[' Toggle Sidebar, '?' Shortcuts, 'Ctrl+Z/Y' Undo/Redo, 'Escape' close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shortcutsOpen) setShortcutsOpen(false)
        else if (createOpen) setCreateOpen(false)
        else if (completeSprintOpen) setCompleteSprintOpen(false)
        else if (selectedIssueId) setSelectedIssueId(null)
        return
      }
      const target = e.target
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      if (isInput) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        handleRedo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setCreateOpen(true)
      } else if (e.key === '[') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      } else if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(prev => !prev)
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAssigneeFilter(prev => (prev === 'Rizky' ? 'ALL' : 'Rizky'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [createOpen, completeSprintOpen, selectedIssueId, shortcutsOpen, handleUndo, handleRedo])

  const flashNotice = useCallback((msg: string) => {
    setNotice(msg)
  }, [])

  // Transition an issue + execute active Jira Automation Rules + Undo History!
  const transitionIssue = useCallback(
    (issueId: string, nextStatus: JiraStatusId) => {
      mutateWithUndo(prev => {
        const target = prev.issues.find(i => i.id === issueId)
        if (!target || target.status === nextStatus) return prev
        if (nextStatus === 'done' && requireSubtaskForDone && target.subtasks.some(s => !s.done)) {
          flashNotice(
            en
              ? `Workflow Validator: ${target.key} still has open subtasks! Complete subtasks or disable Done Validator in Workflow Settings.`
              : `Validator Workflow: ${target.key} masih memiliki subtask belum selesai!`,
          )
          return prev
        }

        const ruleQa = prev.rules.find(r => r.id === 'rule-qa-subtask')?.enabled
        const ruleDone = prev.rules.find(r => r.id === 'rule-done-close-subtasks')?.enabled
        const extraLogs: string[] = []
        let updatedRules = prev.rules

        const updatedIssues = prev.issues.map(item => {
          // Reactive dependency unblocker: if upstream blocker just moved to Done, auto-unblock downstream!
          if (item.id !== issueId && nextStatus === 'done' && item.blockedByKey === target.key && item.status === 'blocked') {
            extraLogs.push(`[AUTOPILOT-CASCADE] ${target.key} completed -> downstream ${item.key} auto-unblocked to In Progress.`)
            return {
              ...item,
              status: 'in_progress' as JiraStatusId,
              updatedAt: new Date().toISOString(),
            }
          }
          if (item.id !== issueId) return item
          let nextSubtasks = [...item.subtasks]
          const nextComments: JiraComment[] = [
            ...item.comments,
            {
              id: uid('act'),
              author: 'Jira OS Engine',
              body: `Status changed: ${item.status.toUpperCase()} -> ${nextStatus.toUpperCase()}`,
              createdAt: nowStamp(),
              kind: 'activity',
            },
          ]

          if (nextStatus === 'review' && ruleQa) {
            const hasPw = nextSubtasks.some(st => st.title.toLowerCase().includes('playwright'))
            if (!hasPw) {
              nextSubtasks.push({
                id: uid('st'),
                title: `Execute Playwright E2E regression gate (${item.key.toLowerCase()}.spec.ts)`,
                done: false,
              })
              extraLogs.push(`[AUTO-02] ${item.key} entered Review & QA -> Playwright subtask auto-created.`)
              updatedRules = updatedRules.map(r => (r.id === 'rule-qa-subtask' ? { ...r, runs: r.runs + 1 } : r))
            }
          }

          let nextFixVersion = item.fixVersion
          if (nextStatus === 'done' && ruleDone) {
            const openCount = nextSubtasks.filter(st => !st.done).length
            nextSubtasks = nextSubtasks.map(st => ({ ...st, done: true }))
            if (!nextFixVersion) nextFixVersion = 'v7.1.0'
            extraLogs.push(`[AUTO-03] ${item.key} transitioned to Done -> ${openCount} open subtask(s) auto-closed & tagged ${nextFixVersion}.`)
            updatedRules = updatedRules.map(r => (r.id === 'rule-done-close-subtasks' ? { ...r, runs: r.runs + 1 } : r))
          }

          // v13.0 Live Runtime Evaluator for all enabled custom user-created rules
          const sigText = `${item.type} ${item.priority} ${nextStatus} ${item.labels.join(' ')}`.toLowerCase()
          updatedRules = updatedRules.map(r => {
            if (!r.enabled || r.id.startsWith('rule-')) return r
            const trig = r.triggerEn.toLowerCase()
            const matched =
              (trig.includes('highest') && item.priority === 'Highest') ||
              (trig.includes('bug') && item.type === 'bug') ||
              (trig.includes('security') && item.type === 'security') ||
              (trig.includes('done') && nextStatus === 'done') ||
              (trig.includes('blocked') && nextStatus === 'blocked') ||
              (trig.includes('review') && nextStatus === 'review') ||
              sigText.includes(trig.split('=').pop()?.trim() || '__none__')
            if (!matched) return r
            extraLogs.push(`[${r.code}] Custom rule "${r.nameEn}" auto-fired on ${item.key} -> ${r.actionEn}`)
            return { ...r, runs: r.runs + 1 }
          })

          return {
            ...item,
            status: nextStatus,
            fixVersion: nextFixVersion,
            subtasks: nextSubtasks,
            comments: nextComments,
            updatedAt: new Date().toISOString(),
          }
        })

        return {
          ...prev,
          issues: updatedIssues,
          rules: updatedRules,
          automationLogs: [...extraLogs, ...prev.automationLogs].slice(0, 20),
        }
      })
    },
    [mutateWithUndo, requireSubtaskForDone, flashNotice, en],
  )

  const updateIssue = useCallback((issueId: string, patch: Partial<JiraIssue>) => {
    setState(prev => ({
      ...prev,
      issues: prev.issues.map(item => (item.id === issueId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)),
    }))
  }, [])

  const handleCreateIssue = (e: FormEvent) => {
    e.preventDefault()
    const cleanTitle = newTitle.trim()
    if (!cleanTitle) return

    const parsedLabels = newLabels
      .split(',')
      .map(s => s.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)

    setState(prev => {
      const key = `${activeProjectKey}-${prev.nextSequence}`
      const secRuleEnabled = prev.rules.find(r => r.id === 'rule-sec-escalate')?.enabled
      const isSecTrigger = newType === 'security' || parsedLabels.includes('security')

      const finalPriority: JiraPriorityLevel = secRuleEnabled && isSecTrigger ? 'Highest' : newPriority
      const finalAssignee = secRuleEnabled && isSecTrigger ? 'Alya' : newAssignee

      const newLogs =
        secRuleEnabled && isSecTrigger
          ? [`[AUTO-01] ${key} created with security signal -> Escalated to Highest & assigned Alya.`, ...prev.automationLogs]
          : prev.automationLogs

      const created: JiraIssue = {
        id: uid('iss'),
        key,
        title: cleanTitle,
        description:
          newDesc.trim() ||
          `Scenario: Verify ${cleanTitle}\n  Given system state is initialized\n  When ${cleanTitle.toLowerCase()} executes\n  Then telemetry & acceptance gates pass`,
        type: newType,
        status: 'todo',
        priority: finalPriority,
        points: newPoints,
        assignee: finalAssignee,
        epicKey: newEpic,
        sprintId: newSprint,
        labels: parsedLabels.length ? parsedLabels : ['sprint-work'],
        dueDate: '2026-11-28',
        subtasks:
          autopilotEnabled && newPoints >= 8
            ? [
                { id: uid('st'), title: `[Autopilot] Domain contract & schema validation (${key})`, done: false },
                { id: uid('st'), title: `[Autopilot] Core implementation & telemetry spans`, done: false },
                { id: uid('st'), title: `[Autopilot] Playwright E2E regression gate`, done: false },
              ]
            : [],
        comments: [
          {
            id: uid('act'),
            author: 'Jira OS',
            body: `Issue ${key} created in ${newSprint}.`,
            createdAt: nowStamp(),
            kind: 'activity',
          },
        ],
        updatedAt: new Date().toISOString(),
      }

      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [created, ...prev.issues],
        automationLogs: newLogs.slice(0, 20),
        rules:
          secRuleEnabled && isSecTrigger
            ? prev.rules.map(r => (r.id === 'rule-sec-escalate' ? { ...r, runs: r.runs + 1 } : r))
            : prev.rules,
      }
    })

    setNewTitle('')
    setNewDesc('')
    setCreateOpen(false)
    flashNotice(en ? 'Created new Jira issue on the board.' : 'Tiket Jira baru berhasil dibuat.')
  }

  const handleQuickBacklogCreate = (e: FormEvent) => {
    e.preventDefault()
    const clean = quickBacklogTitle.trim()
    if (!clean) return
    setState(prev => {
      const key = `DX-${prev.nextSequence}`
      const created: JiraIssue = {
        id: uid('iss'),
        key,
        title: clean,
        description: `Backlog specification for ${clean}`,
        type: quickBacklogType,
        status: 'todo',
        priority: 'Medium',
        points: quickBacklogPoints,
        assignee: 'Dimas',
        epicKey: 'DX-EPIC-4',
        sprintId: 'backlog',
        labels: ['backlog'],
        dueDate: '2026-12-10',
        subtasks: [],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [...prev.issues, created],
      }
    })
    setQuickBacklogTitle('')
    flashNotice(en ? 'Added issue to Product Backlog.' : 'Tiket ditambahkan ke Product Backlog.')
  }

  const syncFromPrototypeBlueprint = () => {
    if (!syncedBlueprint) return
    setState(prev => {
      const baseSeq = prev.nextSequence
      const generated: JiraIssue[] = [
        {
          id: uid('bp'),
          key: `DX-${baseSeq}`,
          title: `[${syncedBlueprint.projectName}] Provision USL ${syncedBlueprint.uslCeilingNodes}-node cluster & P95 <= ${syncedBlueprint.p95TargetMs}ms`,
          description: syncedBlueprint.intentPrompt,
          type: 'story',
          status: 'in_progress',
          priority: 'Highest',
          points: 8,
          assignee: 'Rizky',
          epicKey: 'DX-EPIC-2',
          sprintId: 'sprint-24',
          labels: ['os-blueprint', syncedBlueprint.blueprintId],
          dueDate: '2026-11-26',
          subtasks: [
            { id: uid('st'), title: `Configure ${syncedBlueprint.rbacRole.toUpperCase()} RBAC policy matrix`, done: true },
            { id: uid('st'), title: `Benchmark P95 latency <= ${syncedBlueprint.p95TargetMs}ms`, done: false },
          ],
          comments: [],
          updatedAt: new Date().toISOString(),
        },
        {
          id: uid('bp'),
          key: `DX-${baseSeq + 1}`,
          title: `[${syncedBlueprint.projectName}] Automate Gherkin BDD & Playwright self-healing suite`,
          description: syncedBlueprint.gherkinScenario || syncedBlueprint.intentPrompt,
          type: 'task',
          status: 'todo',
          priority: 'High',
          points: 5,
          assignee: 'Nadia',
          epicKey: 'DX-EPIC-3',
          sprintId: 'sprint-24',
          labels: ['playwright', 'gherkin', syncedBlueprint.blueprintId],
          dueDate: '2026-11-27',
          subtasks: [],
          comments: [],
          updatedAt: new Date().toISOString(),
        },
      ]
      return {
        ...prev,
        nextSequence: baseSeq + 2,
        issues: [...generated, ...prev.issues],
        automationLogs: [
          `[OS-BUS] Imported 2 sprint issues from blueprint "${syncedBlueprint.projectName}".`,
          ...prev.automationLogs,
        ].slice(0, 20),
      }
    })
    flashNotice(
      en
        ? `Synced 2 sprint issues from "${syncedBlueprint.projectName}" blueprint.`
        : `Berhasil menyinkronkan 2 tiket dari blueprint "${syncedBlueprint.projectName}".`,
    )
  }

  const handleCompleteSprint = () => {
    setState(prev => {
      const activeIssues = prev.issues.filter(i => i.sprintId === 'sprint-24')
      const committed = activeIssues.reduce((sum, i) => sum + i.points, 0)
      const completed = activeIssues.filter(i => i.status === 'done').reduce((sum, i) => sum + i.points, 0)

      const updatedIssues = prev.issues
        .filter(i => !(i.sprintId === 'sprint-24' && i.status === 'done'))
        .map(i => (i.sprintId === 'sprint-24' ? { ...i, sprintId: 'sprint-25' as JiraSprintId } : i))
        .map(i => (i.sprintId === 'sprint-25' ? { ...i, sprintId: 'sprint-24' as JiraSprintId } : i))

      return {
        ...prev,
        activeSprintName: 'Sprint 25 · Edge Mesh & Zero-Trust',
        issues: updatedIssues,
        velocityHistory: [
          ...prev.velocityHistory.slice(-4),
          { sprintName: prev.activeSprintName.split('·')[0].trim(), committed, completed },
        ],
        automationLogs: [
          `[SPRINT] Closed ${prev.activeSprintName} (${completed}/${committed} SP done). Rolled incomplete items forward.`,
          ...prev.automationLogs,
        ].slice(0, 20),
      }
    })
    setCompleteSprintOpen(false)
    flashNotice(
      en
        ? 'Sprint completed! Velocity recorded & unfinished issues rolled into active sprint.'
        : 'Sprint diselesaikan! Velocity tercatat & tiket belum selesai dipindahkan ke sprint aktif.',
    )
  }

  // Project-scoped issues (Multi-Project Spaces + ALL Portfolio)
  const projectScopedIssues = useMemo(() => {
    if (activeProjectKey === 'ALL') return state.issues
    const prefix = `${activeProjectKey}-`
    const matches = state.issues.filter(i => i.key.startsWith(prefix))
    return matches.length > 0 ? matches : state.issues
  }, [state.issues, activeProjectKey])

  // Filtered issues for Board & Navigator
  const filteredIssues = useMemo(() => {
    return projectScopedIssues.filter(issue => {
      if (assigneeFilter !== 'ALL' && issue.assignee !== assigneeFilter) return false
      if (quickFilter === 'bugs' && issue.type !== 'bug' && issue.type !== 'security') return false
      if (quickFilter === 'blocked' && issue.status !== 'blocked' && !issue.blockedByKey && !issue.flagged) return false
      if (quickFilter === 'subtasks' && issue.subtasks.length === 0) return false
      return evaluateJqlMatch(issue, jqlQuery)
    })
  }, [projectScopedIssues, assigneeFilter, quickFilter, jqlQuery])

  const activeSprintIssues = useMemo(
    () => filteredIssues.filter(i => i.sprintId === 'sprint-24'),
    [filteredIssues],
  )

  // KPI & Monte Carlo calculations (scoped to active project or ALL portfolio)
  const metrics = useMemo(() => {
    const sprintAll = projectScopedIssues.filter(i => i.sprintId === 'sprint-24')
    const totalSp = sprintAll.reduce((acc, i) => acc + i.points, 0)
    const doneSp = sprintAll.filter(i => i.status === 'done').reduce((acc, i) => acc + i.points, 0)
    const pct = totalSp > 0 ? Math.round((doneSp / totalSp) * 100) : 0

    const inProgressCount = sprintAll.filter(i => i.status === 'in_progress').length
    const reviewCount = sprintAll.filter(i => i.status === 'review').length
    const blockedCount = sprintAll.filter(i => i.status === 'blocked').length
    const wipBreached =
      (state.wipLimits.in_progress > 0 && inProgressCount > state.wipLimits.in_progress) ||
      (state.wipLimits.review > 0 && reviewCount > state.wipLimits.review)

    const avgVelocity =
      state.velocityHistory.length > 0
        ? Math.round(state.velocityHistory.reduce((acc, v) => acc + v.completed, 0) / state.velocityHistory.length)
        : 36

    const remainingTotalSp = projectScopedIssues.filter(i => i.status !== 'done').reduce((acc, i) => acc + i.points, 0)
    // Deterministic 10,000-trial style percentile estimation from historical velocity distribution
    const velocities = state.velocityHistory.map(v => v.completed)
    const minV = Math.max(12, Math.min(...velocities, avgVelocity - 5))
    const maxV = Math.max(...velocities, avgVelocity + 5)
    const p50Sprints = Math.max(1, Number((remainingTotalSp / Math.max(1, avgVelocity)).toFixed(1)))
    const p85Vel = minV + (maxV - minV) * 0.28
    const p95Vel = minV + (maxV - minV) * 0.14
    const p85Sprints = Math.max(1, Number((remainingTotalSp / Math.max(1, p85Vel)).toFixed(1)))
    const p95Sprints = Math.max(1, Number((remainingTotalSp / Math.max(1, p95Vel)).toFixed(1)))

    const allSubtasks = projectScopedIssues.flatMap(i => i.subtasks)
    const doneSubtasks = allSubtasks.filter(st => st.done).length

    return {
      totalSp,
      doneSp,
      pct,
      inProgressCount,
      reviewCount,
      blockedCount,
      wipBreached,
      avgVelocity,
      remainingTotalSp,
      p50Sprints,
      p85Sprints,
      p95Sprints,
      totalSubtasks: allSubtasks.length,
      doneSubtasks,
      enabledRules: state.rules.filter(r => r.enabled).length,
    }
  }, [state, projectScopedIssues])

  // Swimlane groups for Active Sprint Board
  const swimlaneGroups = useMemo(() => {
    if (swimlane === 'none') {
      return [{ id: 'all', title: '', issues: activeSprintIssues }]
    }
    if (swimlane === 'epic') {
      return epicsList
        .map(ep => ({
          id: ep.key,
          title: `${ep.key} · ${en ? ep.nameEn : ep.nameId}`,
          issues: activeSprintIssues.filter(i => i.epicKey === ep.key),
        }))
        .filter(g => g.issues.length > 0)
    }
    if (swimlane === 'component') {
      return JIRA_COMPONENTS.map(comp => ({
        id: comp,
        title: `${en ? 'Component' : 'Komponen'}: ${comp}`,
        issues: activeSprintIssues.filter(i => (i.component || 'Ledger Core') === comp),
      })).filter(g => g.issues.length > 0)
    }
    if (swimlane === 'assignee') {
      return TEAM_MEMBERS.map(m => ({
        id: m.id,
        title: `${m.id} (${m.role})`,
        issues: activeSprintIssues.filter(i => i.assignee === m.id),
      })).filter(g => g.issues.length > 0)
    }
    const prios: JiraPriorityLevel[] = ['Highest', 'High', 'Medium', 'Low']
    return prios
      .map(p => ({
        id: p,
        title: `${en ? 'Priority' : 'Prioritas'}: ${p}`,
        issues: activeSprintIssues.filter(i => i.priority === p),
      }))
      .filter(g => g.issues.length > 0)
  }, [swimlane, activeSprintIssues, en, epicsList])

  const selectedIssue = useMemo(
    () => state.issues.find(i => i.id === selectedIssueId) ?? null,
    [state.issues, selectedIssueId],
  )

  const horizonReport = useMemo(
    () => analyzeForwardHorizon(state.issues, state.velocityHistory, state.wipLimits),
    [state.issues, state.velocityHistory, state.wipLimits],
  )

  const runAutonomousOptimization = useCallback(() => {
    setState(prev => {
      const result = executeAutonomousSelfHeal(prev.issues, prev.velocityHistory, prev.nextSequence, en)
      setAiReasoningTrace(old => [...result.reasoningLogs, ...old].slice(0, 18))
      return {
        ...prev,
        issues: result.updatedIssues,
        nextSequence: result.nextSequence,
        automationLogs: [...result.reasoningLogs, ...prev.automationLogs].slice(0, 24),
      }
    })
    flashNotice(
      en
        ? 'Autonomous AI Brain rebalanced workload, unblocked critical path, decomposed 8+ SP stories & pre-planned Sprint 25!'
        : 'AI Autopilot berhasil menyeimbangkan beban tim, membuka blocker kritis, memecah subtask & menjadwalkan Sprint 25 otomatis!',
    )
  }, [en, flashNotice])

  const handleCompileGoalToSprint = (e: FormEvent) => {
    e.preventDefault()
    setState(prev => {
      const compiled = compileGoalIntoAutonomousSprintPlan(goalPrompt, prev.nextSequence, en)
      setAiReasoningTrace(old => [...compiled.reasoningTrace, ...old].slice(0, 18))
      return {
        ...prev,
        issues: [...compiled.generatedIssues, ...prev.issues],
        nextSequence: compiled.nextSequence,
        automationLogs: [
          `[AI-PLANNER] Synthesized 4 multi-horizon sprint tickets for goal "${(goalPrompt || 'Autonomous Engine').slice(0, 40)}".`,
          ...prev.automationLogs,
        ].slice(0, 24),
      }
    })
    setGoalPrompt('')
    flashNotice(
      en
        ? 'AI Planner thought ahead and generated 4 sequenced Architecture, Security, QA & Canary tickets across Sprint 24 & 25!'
        : 'AI Planner merancang 4 tiket berurutan (Arsitektur, Keamanan, QA & Canary) lintas Sprint 24 & 25 secara otomatis!',
    )
  }

  const runLiveByokForesight = async () => {
    const cfg = loadSessionAiConfig()
    if (!cfg.apiKey && !cfg.customEndpoint) {
      setByokForecast(
        en
          ? [
              'Deterministic Strategic Foresight (No BYOK API key required):',
              `• Delivery Confidence: ${horizonReport.confidenceScore}% (Predicted Spillover: ${horizonReport.predictedSpilloverSp} SP).`,
              `• Next-Sprint Recommendation: Pre-allocate ${horizonReport.optimalNextSprintPullSp} SP from Backlog and reserve 15% buffer for security/chaos hardening.`,
              '• Tip: Configure an optional Gemini or OpenAI session key in Sovereign Workbench / AI Studio to stream live LLM reasoning.',
            ].join('\n')
          : [
              'Analisis Prediktif Deterministik (Aktif otomatis tanpa API key):',
              `• Keyakinan Delivery: ${horizonReport.confidenceScore}% (Prediksi Spillover: ${horizonReport.predictedSpilloverSp} SP).`,
              `• Strategi Sprint Depan: Tarik ${horizonReport.optimalNextSprintPullSp} SP dari Backlog & siapkan cadangan kapasitas 15% untuk mitigasi keamanan/chaos.`,
              '• Info: Anda juga dapat memasukkan API key Gemini/OpenAI opsional untuk inferensi LLM langsung.',
            ].join('\n'),
      )
      return
    }
    setByokBusy(true)
    try {
      const summary = state.issues
        .slice(0, 10)
        .map(i => `${i.key} [${i.status}, ${i.priority}, ${i.points}SP, @${i.assignee}] ${i.title}`)
        .join('\n')
      const res = await generateWithByokAi(cfg, {
        systemPrompt:
          'You are a Principal Agile & Distributed Systems Architect. Analyze the sprint board, predict bottlenecks 2 sprints ahead, and give 4 concrete autonomous actions.',
        userPrompt: `Active Sprint: ${state.activeSprintName}\nIssues:\n${summary}`,
        temperature: 0.3,
        maxTokens: 550,
      })
      setByokForecast(res.text)
    } catch (err) {
      setByokForecast(err instanceof Error ? err.message : 'Unable to reach BYOK endpoint.')
    } finally {
      setByokBusy(false)
    }
  }

  const synthesizeAiGherkinAndSubtasks = (issue: JiraIssue) => {
    const synthesizedDesc = [
      `Feature: ${issue.title}`,
      `  Scenario: Primary deterministic execution for ${issue.key}`,
      `    Given authenticated role context and strict schema contract`,
      `    When ${issue.title.toLowerCase()} is triggered`,
      `    Then response P95 completes under 25ms with zero state drift`,
      `  Scenario: Fault injection & idempotent retry guard`,
      `    Given duplicate request key or upstream timeout`,
      `    When client retries mutation`,
      `    Then system enforces idempotency and emits structured OpenTelemetry trace`,
    ].join('\n')

    const extraSubtasks: JiraSubtask[] = [
      { id: uid('st'), title: `Contract & schema validation for ${issue.key}`, done: false },
      { id: uid('st'), title: `Playwright E2E + negative boundary spec`, done: false },
      { id: uid('st'), title: `Telemetry dashboard & release rollback check`, done: false },
    ]
    updateIssue(issue.id, {
      description: synthesizedDesc,
      subtasks: [...issue.subtasks, ...extraSubtasks],
    })
    flashNotice(
      en
        ? `AI Copilot synthesized Gherkin BDD scenarios & 3 subtasks for ${issue.key}.`
        : `AI Copilot berhasil menyusun skenario Gherkin BDD & 3 subtask untuk ${issue.key}.`,
    )
  }

  const applyBulkAction = (kind: 'status' | 'priority' | 'assignee') => {
    if (!selectedBulkIds.length) return
    setState(prev => ({
      ...prev,
      issues: prev.issues.map(item => {
        if (!selectedBulkIds.includes(item.id)) return item
        if (kind === 'status') return { ...item, status: bulkStatus }
        if (kind === 'priority') return { ...item, priority: bulkPriority }
        return { ...item, assignee: bulkAssignee }
      }),
    }))
    flashNotice(
      en
        ? `Updated ${selectedBulkIds.length} selected issue(s).`
        : `Berhasil memperbarui ${selectedBulkIds.length} tiket terpilih.`,
    )
  }

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const epicLookup = useCallback(
    (epicKey: string) => {
      const ep = epicsList.find(e => e.key === epicKey)
      if (!ep) return epicKey
      return en ? ep.nameEn : ep.nameId
    },
    [en, epicsList],
  )

  const handleQuickColumnAdd = (colId: JiraStatusId) => {
    const clean = colQuickDrafts[colId].trim()
    if (!clean) return
    setState(prev => {
      const key = `${activeProjectKey}-${prev.nextSequence}`
      const created: JiraIssue = {
        id: uid('q'),
        key,
        title: clean,
        description: `Inline board issue created in ${colId}.`,
        type: 'task',
        status: colId,
        priority: 'Medium',
        points: 3,
        assignee: 'Rizky',
        epicKey: epicsList[0]?.key ?? 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: [activeProjectKey.toLowerCase()],
        dueDate: '2026-11-29',
        estHours: 6,
        loggedHours: 0,
        component: 'Ledger Core',
        fixVersion: 'v7.1.0',
        subtasks: [],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [...prev.issues, created],
      }
    })
    setColQuickDrafts(prev => ({ ...prev, [colId]: '' }))
    flashNotice(en ? `Added issue into ${colId.toUpperCase()} column.` : `Tiket ditambahkan ke kolom ${colId.toUpperCase()}.`)
  }

  const promoteDiscoveryIdea = (idea: ProductDiscoveryIdea) => {
    const score = computeRiceScore(idea)
    setState(prev => {
      const key = `${activeProjectKey}-${prev.nextSequence}`
      const story: JiraIssue = {
        id: uid('idea'),
        key,
        title: en ? idea.titleEn : idea.titleId,
        description: `Promoted from Jira Product Discovery (${idea.code} · RICE Score ${score}).`,
        type: 'story',
        status: 'todo',
        priority: score >= 150 ? 'Highest' : 'High',
        points: Math.min(13, Math.max(3, idea.effort * 2)),
        assignee: 'Dimas',
        epicKey: idea.epicKey,
        sprintId: 'sprint-24',
        labels: ['product-discovery', `rice-${score}`],
        dueDate: '2026-11-30',
        estHours: idea.effort * 8,
        loggedHours: 0,
        component: 'AI Orchestrator',
        fixVersion: 'v7.1.0',
        subtasks: [],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      setIdeas(old => old.map(item => (item.id === idea.id ? { ...item, promotedKey: key } : item)))
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [story, ...prev.issues],
      }
    })
    flashNotice(
      en
        ? `Promoted ${idea.code} (RICE ${score}) into Active Sprint Board!`
        : `Ide ${idea.code} (RICE ${score}) berhasil dipromosikan ke Sprint Aktif!`,
    )
  }

  const escalateJsmIncident = (ticket: JsmServiceTicket) => {
    setState(prev => {
      const key = `${activeProjectKey}-${prev.nextSequence}`
      const bug: JiraIssue = {
        id: uid('inc'),
        key,
        title: `[${ticket.key}] ${en ? ticket.summaryEn : ticket.summaryId}`,
        description: `Escalated from JSM Service Desk (${ticket.key} · ${ticket.severity} · Service: ${ticket.service}).`,
        type: 'bug',
        status: 'in_progress',
        priority: ticket.severity === 'SEV-1' ? 'Highest' : 'High',
        points: 5,
        assignee: 'Alya',
        epicKey: 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: ['jsm-escalation', ticket.severity.toLowerCase()],
        dueDate: '2026-11-19',
        estHours: 8,
        loggedHours: 2,
        component: ticket.service,
        fixVersion: 'v7.1.0',
        subtasks: [
          { id: uid('st'), title: `Mitigate ${ticket.key} & attach root-cause postmortem`, done: false },
        ],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      setJsmTickets(old => old.map(t => (t.id === ticket.id ? { ...t, linkedBoardKey: key, cabStatus: 'mitigated' } : t)))
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [bug, ...prev.issues],
      }
    })
    flashNotice(
      en
        ? `Escalated ${ticket.key} onto Active Sprint Board for immediate engineering resolution!`
        : `Insiden ${ticket.key} berhasil dieskalasi ke Sprint Board untuk penanganan cepat!`,
    )
  }

  const extractWikiActionToTicket = (doc: ConfluenceSpecDoc) => {
    setState(prev => {
      const key = `${activeProjectKey}-${prev.nextSequence}`
      const task: JiraIssue = {
        id: uid('doc'),
        key,
        title: `[${doc.code}] ${en ? doc.titleEn : doc.titleId}`,
        description: en ? doc.bodyEn : doc.bodyId,
        type: 'task',
        status: 'todo',
        priority: 'High',
        points: 5,
        assignee: 'Rizky',
        epicKey: 'DX-EPIC-2',
        sprintId: 'sprint-24',
        labels: ['confluence-spec', doc.category.toLowerCase()],
        dueDate: '2026-11-28',
        estHours: 10,
        loggedHours: 0,
        component: 'Ledger Core',
        fixVersion: 'v7.1.0',
        subtasks: [],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      setWikiDocs(old =>
        old.map(d => (d.id === doc.id ? { ...d, linkedKeys: [...new Set([...d.linkedKeys, key])] } : d)),
      )
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [task, ...prev.issues],
      }
    })
    flashNotice(
      en
        ? `Extracted action item from ${doc.code} into Sprint Ticket!`
        : `Action item dokumen ${doc.code} berhasil diekstrak menjadi Tiket Sprint!`,
    )
  }

  const handleCalendarQuickCreate = (
    title: string,
    dueDate: string,
    type: JiraIssueKind,
    priority: JiraPriorityLevel,
  ) => {
    const prefix = activeProjectKey === 'ALL' ? 'DX' : activeProjectKey
    mutateWithUndo(prev => {
      const key = `${prefix}-${prev.nextSequence}`
      const created: JiraIssue = {
        id: uid('cal'),
        key,
        title,
        description: `Scheduled via Jira Work Management Delivery Calendar for ${dueDate}.`,
        type,
        status: 'todo',
        priority,
        points: 3,
        assignee: 'Bima',
        epicKey: epicsList[0]?.key ?? 'DX-EPIC-1',
        sprintId: dueDate.startsWith('2026-12') ? 'sprint-25' : 'sprint-24',
        labels: ['calendar-scheduled'],
        dueDate,
        component: 'Ledger Core',
        fixVersion: dueDate.startsWith('2026-12') ? 'v7.2.0' : 'v7.1.0',
        subtasks: [],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [created, ...prev.issues],
      }
    })
    flashNotice(en ? `Scheduled new issue on ${dueDate}!` : `Tiket baru dijadwalkan pada ${dueDate}!`)
  }

  const handleApplyRemoteSnapshot = useCallback((rawSnap: unknown) => {
    const parsed = rawSnap as Partial<JiraWorkspaceState> | null
    if (!parsed || !Array.isArray(parsed.issues) || !parsed.issues.length) {
      flashNotice(en ? 'Remote snapshot did not contain valid issues.' : 'Snapshot cloud tidak memiliki tiket valid.')
      return
    }
    mutateWithUndo(prev => ({
      ...prev,
      activeSprintName: typeof parsed.activeSprintName === 'string' ? parsed.activeSprintName : prev.activeSprintName,
      activeSprintGoal: typeof parsed.activeSprintGoal === 'string' ? parsed.activeSprintGoal : prev.activeSprintGoal,
      issues: parsed.issues as JiraIssue[],
      automationLogs: [`[CLOUD-SYNC] Pulled ${parsed.issues?.length ?? 0} issue(s) from team Cloud Room.`, ...prev.automationLogs],
    }))
    flashNotice(en ? 'Synced latest board snapshot from Cloud Room!' : 'Berhasil menyinkronkan snapshot terbaru dari Ruang Cloud!')
  }, [en, flashNotice, mutateWithUndo])

  const handleImportGithubIssues = (
    imported: Array<{ title: string; body: string; labels: string[]; htmlUrl: string; number: number }>,
  ) => {
    const prefix = activeProjectKey === 'ALL' ? 'DX' : activeProjectKey
    mutateWithUndo(prev => {
      let seq = prev.nextSequence
      const nowIso = new Date().toISOString()
      const created: JiraIssue[] = imported.map(item => {
        const key = `${prefix}-${seq}`
        seq += 1
        const isBug = item.labels.some(l => /bug|error|fix|incident/i.test(l))
        const isSec = item.labels.some(l => /sec|cve|vuln/i.test(l))
        return {
          id: uid('gh'),
          key,
          title: item.title,
          description: `${item.body}\n\nSource: ${item.htmlUrl}`,
          type: isSec ? 'security' : isBug ? 'bug' : 'story',
          status: 'todo',
          priority: isSec ? 'Highest' : isBug ? 'High' : 'Medium',
          points: 3,
          assignee: isSec ? 'Alya' : 'Rizky',
          epicKey: epicsList[0]?.key ?? 'DX-EPIC-1',
          sprintId: 'sprint-24',
          labels: [...new Set(['github-import', ...item.labels.slice(0, 3)])],
          prRef: `GH#${item.number}`,
          dueDate: '2026-11-30',
          component: 'CI/CD Pipeline',
          fixVersion: 'v7.1.0',
          subtasks: [],
          comments: [],
          updatedAt: nowIso,
        }
      })
      return {
        ...prev,
        nextSequence: seq,
        issues: [...created, ...prev.issues],
        automationLogs: [
          `[GITHUB-BRIDGE] Imported ${created.length} live GitHub issue(s) into ${prefix} Sprint 24.`,
          ...prev.automationLogs,
        ],
      }
    })
    flashNotice(
      en
        ? `Imported ${imported.length} live GitHub issue(s) onto ${prefix} board!`
        : `Berhasil mengimpor ${imported.length} issue GitHub langsung ke board ${prefix}!`,
    )
  }

  const pushTopbarCloudRoom = useCallback(async (silent = false) => {
    const cleanRoom = cloudRoom.trim()
    if (cleanRoom.length < 6) return
    setCloudSyncing(true)
    try {
      const res = await fetch(`/api/jira-sync?room=${encodeURIComponent(cleanRoom)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ expectedRev: cloudRev, snapshot: state }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; rev?: number; currentRev?: number; driver?: string }
      if (res.ok && data.ok) {
        setCloudRev(Number(data.rev) || cloudRev + 1)
        setCloudLastSavedAt(nowStamp())
        if (!silent) {
          flashNotice(
            en
              ? `Saved revision #${data.rev} to ${data.driver || cloudDriver} ("${cleanRoom}").`
              : `Tersimpan revisi #${data.rev} ke ${data.driver || cloudDriver} ("${cleanRoom}").`,
          )
        }
      } else if (res.status === 409) {
        setCloudRev(Number(data.currentRev) || cloudRev)
        if (!silent) {
          flashNotice(
            en
              ? `Remote room is at revision #${data.currentRev}. Click Pull Cloud first.`
              : `Ruang cloud ada di revisi #${data.currentRev}. Klik Tarik Cloud dahulu.`,
          )
        }
      }
    } catch {
      /* Ignore transient offline errors */
    } finally {
      setCloudSyncing(false)
    }
  }, [cloudDriver, cloudRev, cloudRoom, en, flashNotice, state])

  const pullTopbarCloudRoom = useCallback(async () => {
    const cleanRoom = cloudRoom.trim()
    if (cleanRoom.length < 6) return
    setCloudSyncing(true)
    try {
      const res = await fetch(`/api/jira-sync?room=${encodeURIComponent(cleanRoom)}`, {
        headers: { Accept: 'application/json' },
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; found?: boolean; rev?: number; snapshot?: unknown }
      if (res.ok && data.ok && data.found && data.snapshot) {
        handleApplyRemoteSnapshot(data.snapshot)
        setCloudRev(Number(data.rev) || 1)
        setCloudLastSavedAt(nowStamp())
      } else if (res.ok && data.ok && !data.found) {
        flashNotice(
          en
            ? `Cloud room "${cleanRoom}" is empty. Click Save Cloud to initialize it in ${cloudDriver}.`
            : `Ruang cloud "${cleanRoom}" masih kosong. Klik Simpan Cloud untuk menyimpannya di ${cloudDriver}.`,
        )
      }
    } catch {
      flashNotice(en ? 'Cloud room unreachable.' : 'Ruang cloud tidak terjangkau.')
    } finally {
      setCloudSyncing(false)
    }
  }, [cloudDriver, cloudRoom, en, flashNotice, handleApplyRemoteSnapshot])

  // Debounced Cloud Auto-Sync when user enables Auto-Sync with Neon/Upstash/Blob active
  useEffect(() => {
    if (!cloudAutoSync || !cloudConfigured) return
    const timer = window.setTimeout(() => {
      void pushTopbarCloudRoom(true)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [cloudAutoSync, cloudConfigured, state, pushTopbarCloudRoom])

  const handleListQuickCreate = (title: string, type: JiraIssueKind, priority: JiraPriorityLevel) => {
    const prefix = activeProjectKey === 'ALL' ? 'DX' : activeProjectKey
    mutateWithUndo(prev => {
      const key = `${prefix}-${prev.nextSequence}`
      const created: JiraIssue = {
        id: uid('list'),
        key,
        title,
        description: `Created inline via Jira Cloud List View (${prefix}).`,
        type,
        status: 'todo',
        priority,
        points: 3,
        assignee: type === 'security' ? 'Alya' : type === 'bug' ? 'Nadia' : 'Rizky',
        epicKey: epicsList[0]?.key ?? 'DX-EPIC-1',
        sprintId: 'sprint-24',
        labels: ['list-view'],
        dueDate: '2026-11-29',
        estHours: 6,
        loggedHours: 0,
        component: 'Ledger Core',
        fixVersion: 'v7.1.0',
        subtasks: [],
        comments: [],
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [created, ...prev.issues],
      }
    })
    flashNotice(en ? 'Added work item inline in List View!' : 'Item kerja ditambahkan langsung di List View!')
  }

  const handleFormsPortalSubmit = (payload: {
    template: string
    type: JiraIssueKind
    title: string
    description: string
    priority: JiraPriorityLevel
    environment: string
    requester: string
  }) => {
    const prefix = activeProjectKey === 'ALL' ? 'DX' : activeProjectKey
    mutateWithUndo(prev => {
      const key = `${prefix}-${prev.nextSequence}`
      const secTrigger = payload.type === 'security'
      // Real-time Autonomous Watchdog: assign to lowest-load engineer when Autopilot is active
      let optimalAssignee = secTrigger ? 'Alya' : payload.type === 'bug' ? 'Nadia' : 'Rizky'
      if (autopilotEnabled && !secTrigger) {
        const loads = TEAM_MEMBERS.map(m => ({
          id: m.id,
          sp: prev.issues
            .filter(i => i.assignee === m.id && i.status !== 'done' && i.sprintId === 'sprint-24')
            .reduce((s, i) => s + i.points, 0),
        }))
        optimalAssignee = [...loads].sort((a, b) => a.sp - b.sp)[0]?.id ?? optimalAssignee
      }
      const created: JiraIssue = {
        id: uid('form'),
        key,
        title: `[Form:${payload.template.toUpperCase()}] ${payload.title}`,
        description: payload.description,
        type: payload.type,
        status: 'todo',
        priority: secTrigger ? 'Highest' : payload.priority,
        points: secTrigger ? 5 : 3,
        assignee: optimalAssignee,
        epicKey: secTrigger ? 'DX-EPIC-1' : 'DX-EPIC-2',
        sprintId: 'sprint-24',
        labels: ['jira-form-intake', payload.template],
        dueDate: '2026-11-26',
        component: 'Edge API Gateway',
        fixVersion: 'v7.1.0',
        subtasks: autopilotEnabled
          ? [{ id: uid('st'), title: `[Autopilot] Triage & verify ${payload.environment} intake`, done: false }]
          : [],
        comments: [
          {
            id: uid('cm'),
            author: payload.requester,
            body: `Submitted via Jira Forms Intake Portal (${payload.environment}).`,
            createdAt: nowStamp(),
            kind: 'activity',
          },
        ],
        updatedAt: new Date().toISOString(),
      }
      const logLine = `[FORMS-INTAKE] ${key} created via ${payload.template} portal -> auto-assigned @${optimalAssignee}.`
      setAiReasoningTrace(old => [logLine, ...old].slice(0, 18))
      return {
        ...prev,
        nextSequence: prev.nextSequence + 1,
        issues: [created, ...prev.issues],
        automationLogs: [logLine, ...prev.automationLogs].slice(0, 24),
      }
    })
    flashNotice(
      en
        ? `Intake Form submitted -> triaged ticket added to Active Sprint Board!`
        : `Formulir diterima -> tiket otomatis ditambahkan & ditriase ke Sprint Board!`,
    )
  }

  const activeProjectMeta = useMemo(
    () =>
      projects.find(p => p.key === activeProjectKey) ?? {
        key: 'ALL',
        nameEn: 'All Enterprise Spaces',
        nameId: 'Semua Ruang Proyek',
        methodology: 'Scrum' as const,
        lead: 'Bima',
        categoryEn: 'Portfolio View',
        categoryId: 'Tampilan Portofolio',
      },
    [projects, activeProjectKey],
  )

  const visibleColumns = useMemo(
    () => (mobileCol === 'all' ? COLUMNS : COLUMNS.filter(c => c.id === mobileCol)),
    [mobileCol],
  )

  return (
    <main id="main-content" className="container jira-os-page" data-testid="jira-enterprise-page">
      {/* Ultra-Compact Atlassian Jira Cloud v13.0 Workspace Header */}
      <header className="jira-hero jira-hero-compact">
        <div className="jira-hero-top">
          <div className="jira-hero-copy">
            <div className="jira-kicker-row">
              <span className="jira-kicker">
                <Kanban size={12} /> JIRA CLOUD · v13.0
              </span>
              <span className="jira-sprint-pill" data-testid="jira-active-sprint-name">
                {state.activeSprintName}
              </span>
              <span
                className={cloudConfigured ? 'jira-kpi-badge' : 'jira-kpi-badge is-warn'}
                data-testid="jira-topbar-db-status"
                title={en ? 'Active Vercel Storage Driver' : 'Driver Penyimpanan Vercel Aktif'}
              >
                <Database size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {cloudConfigured
                  ? `${cloudDriver.toUpperCase()} LIVE${cloudRev > 0 ? ` · #${cloudRev}` : ''}`
                  : en
                    ? 'LOCAL-FIRST'
                    : 'LOKAL'}
              </span>
              <span className="jira-kpi-badge">
                {metrics.doneSp}/{metrics.totalSp} SP ({metrics.pct}%) · WIP {metrics.inProgressCount}/{state.wipLimits.in_progress || '∞'}
              </span>
            </div>
            <h1 className="jira-compact-title">
              {en ? (
                <>
                  {activeProjectMeta.key} / <span>{activeProjectMeta.nameEn}</span>
                </>
              ) : (
                <>
                  {activeProjectMeta.key} / <span>{activeProjectMeta.nameId}</span>
                </>
              )}
            </h1>
          </div>
          <div className="jira-hero-actions jira-hero-actions-compact">
            <button
              type="button"
              className="button button-primary jira-btn-sm"
              data-testid="jira-open-create-btn"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} /> {en ? 'Create' : 'Buat'}{' '}
              <span className="jira-shortcut-kbd" aria-hidden="true">C</span>
            </button>
            <button
              type="button"
              className="button button-ghost jira-btn-sm"
              data-testid="jira-complete-sprint-btn"
              onClick={() => setCompleteSprintOpen(true)}
            >
              <CheckCircle2 size={14} /> {en ? 'Complete Sprint' : 'Selesai Sprint'}
            </button>
            <button
              type="button"
              className="button button-ghost jira-btn-sm"
              disabled={undoStack.length === 0}
              data-testid="jira-undo-btn"
              onClick={handleUndo}
              title={en ? 'Undo last board action (Ctrl+Z)' : 'Urungkan aksi terakhir (Ctrl+Z)'}
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              className="button button-ghost jira-btn-sm"
              disabled={redoStack.length === 0}
              data-testid="jira-redo-btn"
              onClick={handleRedo}
              title={en ? 'Redo action (Ctrl+Y)' : 'Ulangi aksi (Ctrl+Y)'}
            >
              <Redo2 size={14} />
            </button>
            <button
              type="button"
              className="button button-ghost jira-btn-sm"
              data-testid="jira-shortcuts-btn"
              onClick={() => setShortcutsOpen(true)}
              title={en ? 'Keyboard shortcuts (?)' : 'Pintasan keyboard (?)'}
            >
              <HelpCircle size={14} />
            </button>
            <button
              type="button"
              className={showFullTelemetry ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
              data-testid="jira-toggle-telemetry-btn"
              onClick={() => setShowFullTelemetry(v => !v)}
            >
              {showFullTelemetry ? (en ? 'KPIs ▴' : 'KPI ▴') : en ? 'KPIs ▾' : 'KPI ▾'}
            </button>
            <button
              type="button"
              className={showMoreTools ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
              data-testid="jira-more-tools-btn"
              aria-expanded={showMoreTools}
              onClick={() => setShowMoreTools(v => !v)}
            >
              ⋯ {en ? 'Tools' : 'Alat'}
            </button>
          </div>
        </div>

        {showMoreTools && (
          <div className="jira-more-tools-row">
            <button
              type="button"
              className="jira-chip-btn"
              onClick={() => downloadFile('dreamex-jira-export.csv', buildJiraCsv(state.issues), 'text/csv;charset=utf-8')}
            >
              <Download size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Jira CSV
            </button>
            <button
              type="button"
              className="jira-chip-btn"
              onClick={() => setCardDensity(d => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            >
              {cardDensity === 'comfortable'
                ? en ? 'Density: Comfortable' : 'Tampilan: Nyaman'
                : en ? 'Density: Compact' : 'Tampilan: Ringkas'}
            </button>
            <button
              type="button"
              className="jira-chip-btn"
              onClick={() => {
                setState(createDefaultState())
                setSelectedBulkIds([])
                flashNotice(en ? 'Workspace reset to clean enterprise baseline.' : 'Workspace dikembalikan ke data awal.')
              }}
            >
              <RotateCcw size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {en ? 'Reset Demo' : 'Reset Data'}
            </button>
          </div>
        )}

        {/* Single-Line Scrollable Project Spaces & Neon Auto-Sync Ribbon */}
        <div className="jira-project-bar jira-project-bar-slim" data-testid="jira-project-switcher">
          <div className="jira-project-pills jira-project-pills-nowrap" role="group" aria-label={en ? 'Switch Jira Project' : 'Pilih Proyek Jira'}>
            <button
              type="button"
              className="jira-chip-btn"
              data-testid="jira-sidebar-toggle"
              onClick={() => setSidebarOpen(prev => !prev)}
              title={en ? 'Toggle Jira Left Sidebar ([)' : 'Buka/Tutup Sidebar Kiri Jira ([)'}
            >
              <PanelLeft size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {sidebarOpen ? (en ? 'Sidebar' : 'Sidebar') : en ? 'Nav' : 'Nav'}
            </button>
            <span className="jira-kpi-label" style={{ flexShrink: 0 }}>
              <FolderKanban size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              {en ? 'SPACES' : 'PROYEK'}
            </span>
            <button
              type="button"
              data-testid="jira-project-pill-ALL"
              className={activeProjectKey === 'ALL' ? 'jira-project-pill is-active' : 'jira-project-pill'}
              onClick={() => {
                setActiveProjectKey('ALL')
                flashNotice(en ? 'Showing cross-project Enterprise Portfolio (ALL spaces).' : 'Menampilkan Portofolio Lintas Proyek (SEMUA).')
              }}
            >
              <span className="jira-project-key-tag">ALL</span>
            </button>
            {projects.map(proj => (
              <button
                key={proj.key}
                type="button"
                data-testid={`jira-project-pill-${proj.key}`}
                className={activeProjectKey === proj.key ? 'jira-project-pill is-active' : 'jira-project-pill'}
                title={en ? proj.nameEn : proj.nameId}
                onClick={() => {
                  setActiveProjectKey(proj.key)
                  flashNotice(
                    en
                      ? `Switched active project context to ${proj.key} · ${proj.nameEn} (${proj.methodology})`
                      : `Konteks proyek aktif diubah ke ${proj.key} · ${proj.nameId} (${proj.methodology})`,
                  )
                }}
              >
                <span className="jira-project-key-tag">{proj.key}</span>
                <span>{(en ? proj.nameEn : proj.nameId).split(' ').slice(0, 2).join(' ')}</span>
              </button>
            ))}
            <button
              type="button"
              className="jira-chip-btn"
              onClick={() => setShowNewProjectForm(v => !v)}
            >
              + {en ? 'Space' : 'Ruang'}
            </button>
          </div>

          {cloudConfigured && (
            <div className="jira-cloud-topbar-controls">
              <input
                value={cloudRoom}
                onChange={e => setCloudRoom(e.target.value)}
                className="jira-select"
                style={{ width: 132, fontSize: 11.5, padding: '3px 7px' }}
                aria-label={en ? 'Cloud room code' : 'Kode ruang cloud'}
              />
              <button
                type="button"
                className="jira-chip-btn"
                data-testid="jira-topbar-cloud-save-btn"
                disabled={cloudSyncing}
                onClick={() => void pushTopbarCloudRoom(false)}
              >
                <Cloud size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                {cloudSyncing ? '…' : en ? 'Save' : 'Simpan'}
              </button>
              <button
                type="button"
                className="jira-chip-btn"
                data-testid="jira-topbar-cloud-pull-btn"
                disabled={cloudSyncing}
                onClick={() => void pullTopbarCloudRoom()}
              >
                <RefreshCw size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                {en ? 'Pull' : 'Tarik'}
              </button>
              <button
                type="button"
                className={cloudAutoSync ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
                data-testid="jira-topbar-autosync-btn"
                onClick={() => setCloudAutoSync(v => !v)}
                title={cloudLastSavedAt ? `Last synced: ${cloudLastSavedAt}` : undefined}
              >
                {cloudAutoSync ? 'Auto: ON' : 'Auto: OFF'}
              </button>
            </div>
          )}
        </div>

        {showNewProjectForm && (
          <form
            className="jira-goal-compiler"
            onSubmit={e => {
              e.preventDefault()
              const k = newProjectKeyInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
              const n = newProjectNameInput.trim()
              if (!k || !n) return
              if (!projects.some(p => p.key === k)) {
                setProjects(prev => [
                  ...prev,
                  {
                    key: k,
                    nameEn: n,
                    nameId: n,
                    methodology: 'Scrum',
                    lead: 'Bima',
                    categoryEn: 'Custom Space',
                    categoryId: 'Ruang Kustom',
                  },
                ])
              }
              setActiveProjectKey(k)
              setNewProjectKeyInput('')
              setNewProjectNameInput('')
              setShowNewProjectForm(false)
            }}
          >
            <input
              value={newProjectKeyInput}
              onChange={e => setNewProjectKeyInput(e.target.value)}
              placeholder="KEY (e.g. PAY)"
              style={{ maxWidth: 140 }}
              required
            />
            <input
              value={newProjectNameInput}
              onChange={e => setNewProjectNameInput(e.target.value)}
              placeholder={en ? 'Project name (e.g. Core Mobile SuperApp)…' : 'Nama proyek baru…'}
              required
            />
            <button type="submit" className="button button-primary">
              <Plus size={14} /> {en ? 'Create Space' : 'Buat Ruang'}
            </button>
          </form>
        )}

        {syncedBlueprint && (
          <div className="jira-blueprint-banner" data-testid="jira-blueprint-sync-banner">
            <span>
              <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              <b>{en ? 'OS Blueprint Connected:' : 'Blueprint OS Terhubung:'}</b> {syncedBlueprint.projectName} (USL{' '}
              {syncedBlueprint.uslCeilingNodes} Nodes · P95 {syncedBlueprint.p95TargetMs}ms)
            </span>
            <button type="button" className="button button-primary" onClick={syncFromPrototypeBlueprint}>
              <Zap size={14} /> {en ? 'Generate Sprint Issues from Blueprint' : 'Buat Tiket Sprint dari Blueprint'}
            </button>
          </div>
        )}

        {notice && (
          <div className="jira-notice-toast" role="status">
            <span>{notice}</span>
            <button
              type="button"
              className="button button-ghost"
              style={{ minHeight: 28, padding: '2px 8px' }}
              onClick={() => setNotice('')}
              aria-label={en ? 'Dismiss notification' : 'Tutup notifikasi'}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Collapsible Agile KPI Strip (Hidden by default so Sprint Board starts immediately above the fold) */}
      {showFullTelemetry && (
      <section className="jira-kpi-grid" aria-label={en ? 'Sprint telemetry metrics' : 'Metrik telemetri sprint'}>
        <article className="jira-kpi-card">
          <span className="jira-kpi-label">{en ? 'ACTIVE SPRINT PROGRESS' : 'PROGRES SPRINT AKTIF'}</span>
          <div className="jira-kpi-val-row">
            <strong data-testid="jira-kpi-sprint-sp">
              {metrics.doneSp} / {metrics.totalSp} SP
            </strong>
            <span className="jira-kpi-badge">{metrics.pct}% DONE</span>
          </div>
          <div className="jira-progress-track" aria-hidden="true">
            <span style={{ width: `${metrics.pct}%` }} />
          </div>
          <span className="jira-kpi-sub">{state.activeSprintGoal.slice(0, 68)}…</span>
        </article>

        <article className="jira-kpi-card">
          <span className="jira-kpi-label">{en ? 'FLOW & WIP GUARDRAILS' : 'ALUR & BATAS WIP'}</span>
          <div className="jira-kpi-val-row">
            <strong>
              {metrics.inProgressCount}/{state.wipLimits.in_progress || '∞'} WIP
            </strong>
            <span className={metrics.wipBreached || metrics.blockedCount > 0 ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
              {metrics.wipBreached
                ? en
                  ? 'WIP BREACH'
                  : 'MELEBIHI WIP'
                : `${metrics.blockedCount} ${en ? 'BLOCKED' : 'TERHAMBAT'}`}
            </span>
          </div>
          <span className="jira-kpi-sub">
            {en
              ? `In Review/QA: ${metrics.reviewCount}/${state.wipLimits.review} · Drag cards or adjust column limits`
              : `Di Review/QA: ${metrics.reviewCount}/${state.wipLimits.review} · Geser kartu atau atur batas WIP`}
          </span>
        </article>

        <article className="jira-kpi-card">
          <span className="jira-kpi-label">{en ? 'VELOCITY & MONTE CARLO P85' : 'VELOCITY & MONTE CARLO P85'}</span>
          <div className="jira-kpi-val-row">
            <strong>{metrics.avgVelocity} SP</strong>
            <span className="jira-kpi-badge">P85: {metrics.p85Sprints} Sprints</span>
          </div>
          <span className="jira-kpi-sub">
            {en
              ? `${metrics.remainingTotalSp} SP open across project (P50 ${metrics.p50Sprints} · P95 ${metrics.p95Sprints} sprints)`
              : `${metrics.remainingTotalSp} SP tersisa di proyek (P50 ${metrics.p50Sprints} · P95 ${metrics.p95Sprints} sprint)`}
          </span>
        </article>

        <article className="jira-kpi-card">
          <span className="jira-kpi-label">{en ? 'SUBTASKS & AUTOMATION' : 'SUBTASK & OTOMASI'}</span>
          <div className="jira-kpi-val-row">
            <strong>
              {metrics.doneSubtasks}/{metrics.totalSubtasks}
            </strong>
            <span className="jira-kpi-badge">{metrics.enabledRules}/3 RULES ON</span>
          </div>
          <span className="jira-kpi-sub">
            {en
              ? `${EPICS.length} Active Epics · Atlassian ADF v3 & CSV ready`
              : `${EPICS.length} Epic Aktif · Siap ekspor Atlassian ADF v3 & CSV`}
          </span>
        </article>
      </section>
      )}

      {/* Slim Autonomous AI Command Ribbon */}
      <section
        className="jira-autopilot-strip jira-autopilot-slim"
        data-testid="jira-autopilot-strip"
        aria-label={en ? 'Autonomous AI Sprint Autopilot' : 'AI Autopilot Sprint Otonom'}
      >
        <div className="jira-autopilot-main">
          <span className={autopilotEnabled ? 'jira-autopilot-pulse is-live' : 'jira-autopilot-pulse'} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', minWidth: 0 }}>
            <strong style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
              <BrainCircuit size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {en ? `AI Autopilot · ${horizonReport.confidenceScore}%` : `AI Autopilot · ${horizonReport.confidenceScore}%`}
            </strong>
            <span className={horizonReport.recommendations.length > 0 ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
              {horizonReport.recommendations.length === 0
                ? en ? 'OPTIMAL' : 'OPTIMAL'
                : en ? `${horizonReport.recommendations.length} INSIGHTS` : `${horizonReport.recommendations.length} SARAN`}
            </span>
            <span className="jira-kpi-sub jira-autopilot-next-text">
              {horizonReport.recommendations[0]
                ? en
                  ? horizonReport.recommendations[0].titleEn
                  : horizonReport.recommendations[0].titleId
                : en
                  ? 'Sprint capacity & SLA balanced.'
                  : 'Kapasitas sprint & SLA seimbang.'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button
            type="button"
            className="button button-primary jira-btn-sm"
            data-testid="jira-auto-optimize-btn"
            onClick={runAutonomousOptimization}
          >
            <Zap size={13} /> {en ? 'Auto-Optimize' : 'Optimasi Otomatis'}
          </button>
          <button
            type="button"
            className={autopilotEnabled ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
            data-testid="jira-autopilot-toggle"
            aria-pressed={autopilotEnabled}
            onClick={() => {
              const next = !autopilotEnabled
              setAutopilotEnabled(next)
              if (next) runAutonomousOptimization()
            }}
          >
            <Bot size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {autopilotEnabled ? (en ? 'Self-Driving: ON' : 'Otonom: AKTIF') : en ? 'Self-Driving: OFF' : 'Otonom: OFF'}
          </button>
          <button
            type="button"
            className="jira-chip-btn"
            onClick={() => setActiveTab('autopilot')}
          >
            <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {en ? 'AI Brain' : 'Ruang AI'}
          </button>
        </div>
      </section>

      {/* Atlassian Jira Cloud Enterprise App Shell — Single Active Nav (Sidebar on >=1121px Desktop when open, Compact Tabs Bar on Mobile/Collapsed) */}
      {(() => {
        const showLeftSidebar = isDesktopWide && sidebarOpen
        return (
          <div className={showLeftSidebar ? 'jira-cloud-shell' : 'jira-cloud-shell is-sidebar-collapsed'}>
            {showLeftSidebar && (
              <aside className="jira-cloud-sidebar" data-testid="jira-cloud-sidebar" aria-label={en ? 'Jira Project Sidebar' : 'Sidebar Proyek Jira'}>
                <div className="jira-sidebar-project-head">
                  <span className="jira-sidebar-avatar">{activeProjectMeta.key}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {en ? activeProjectMeta.nameEn : activeProjectMeta.nameId}
                    </strong>
                    <span className="jira-kpi-sub" style={{ fontSize: 10.5 }}>
                      {activeProjectMeta.methodology} · {en ? activeProjectMeta.categoryEn : activeProjectMeta.categoryId}
                    </span>
                  </div>
                </div>

                <div role="tablist" aria-orientation="vertical" aria-label={en ? 'Jira workspace views' : 'Tampilan workspace Jira'} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="jira-sidebar-group">
                    <span className="jira-sidebar-group-title">{en ? 'PLANNING' : 'PERENCANAAN'}</span>
                    {(
                      [
                        { id: 'board', icon: Kanban, en: 'Sprint Board', idLabel: 'Board Sprint', count: activeSprintIssues.length },
                        { id: 'list', icon: Table2, en: 'List View', idLabel: 'Daftar Inline', count: projectScopedIssues.length },
                        { id: 'backlog', icon: Layers3, en: 'Backlog & Poker', idLabel: 'Backlog & Poker', count: projectScopedIssues.length },
                        { id: 'roadmap', icon: CalendarRange, en: 'Epic Gantt', idLabel: 'Roadmap Gantt', count: epicsList.length },
                        { id: 'calendar', icon: CalendarDays, en: 'Calendar', idLabel: 'Kalender', count: projectScopedIssues.length },
                        { id: 'discovery', icon: Lightbulb, en: 'Discovery RICE', idLabel: 'Ide & RICE', count: ideas.length },
                      ] as const
                    ).map(item => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === item.id}
                          data-testid={`jira-tab-${item.id}`}
                          className={activeTab === item.id ? 'jira-sidebar-btn is-active' : 'jira-sidebar-btn'}
                          onClick={() => setActiveTab(item.id)}
                        >
                          <span className="jira-sidebar-btn-left">
                            <Icon size={14} />
                            <span>{en ? item.en : item.idLabel}</span>
                          </span>
                          <span className="jira-tab-count">{item.count}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="jira-sidebar-group">
                    <span className="jira-sidebar-group-title">{en ? 'DELIVERY & OPS' : 'DELIVERY & OPERASI'}</span>
                    {(
                      [
                        { id: 'releases', icon: PackageCheck, en: 'Releases', idLabel: 'Versi Rilis', count: releases.length },
                        { id: 'jsm', icon: ShieldAlert, en: 'Service Desk', idLabel: 'Insiden & CAB', count: jsmTickets.length },
                        { id: 'forms', icon: ClipboardList, en: 'Forms Portal', idLabel: 'Portal Form', count: 4 },
                        { id: 'wiki', icon: BookOpen, en: 'Confluence Wiki', idLabel: 'Dokumen PRD/ADR', count: wikiDocs.length },
                        { id: 'navigator', icon: ListChecks, en: 'JQL & Bulk', idLabel: 'JQL & Massal', count: filteredIssues.length },
                      ] as const
                    ).map(item => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === item.id}
                          data-testid={`jira-tab-${item.id}`}
                          className={activeTab === item.id ? 'jira-sidebar-btn is-active' : 'jira-sidebar-btn'}
                          onClick={() => setActiveTab(item.id)}
                        >
                          <span className="jira-sidebar-btn-left">
                            <Icon size={14} />
                            <span>{en ? item.en : item.idLabel}</span>
                          </span>
                          <span className="jira-tab-count">{item.count}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="jira-sidebar-group">
                    <span className="jira-sidebar-group-title">{en ? 'INTELLIGENCE' : 'KECERDASAN & ATURAN'}</span>
                    {(
                      [
                        { id: 'autopilot', icon: BrainCircuit, en: 'AI Autopilot', idLabel: 'AI Autopilot', count: horizonReport.recommendations.length },
                        { id: 'reports', icon: BarChart3, en: 'CFD & Reports', idLabel: 'CFD & Laporan', count: 6 },
                        { id: 'automation', icon: Bot, en: 'Automation & Cloud', idLabel: 'Otomasi & Cloud', count: state.rules.length },
                        { id: 'workflow', icon: GitMerge, en: 'Workflow & RBAC', idLabel: 'Workflow & Izin', count: 5 },
                      ] as const
                    ).map(item => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === item.id}
                          data-testid={`jira-tab-${item.id}`}
                          className={activeTab === item.id ? 'jira-sidebar-btn is-active' : 'jira-sidebar-btn'}
                          onClick={() => setActiveTab(item.id)}
                        >
                          <span className="jira-sidebar-btn-left">
                            <Icon size={14} />
                            <span>{en ? item.en : item.idLabel}</span>
                          </span>
                          <span className="jira-tab-count">{item.count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </aside>
            )}

            <div className="jira-cloud-main">
          {!showLeftSidebar && (
            <div className="jira-tabs-bar" role="tablist" aria-label={en ? 'Jira workspace views' : 'Tampilan workspace Jira'}>
              {(
                [
                  { id: 'board', icon: Kanban, en: 'Sprint Board', idLabel: 'Board Sprint', count: activeSprintIssues.length },
                  { id: 'list', icon: Table2, en: 'List View', idLabel: 'Daftar Inline', count: projectScopedIssues.length },
                  { id: 'autopilot', icon: BrainCircuit, en: 'AI Autopilot', idLabel: 'AI Autopilot', count: horizonReport.recommendations.length },
                  { id: 'backlog', icon: Layers3, en: 'Backlog & Poker', idLabel: 'Backlog & Poker', count: projectScopedIssues.length },
                  { id: 'roadmap', icon: CalendarRange, en: 'Epic Gantt', idLabel: 'Roadmap Gantt', count: epicsList.length },
                  { id: 'calendar', icon: CalendarDays, en: 'Calendar', idLabel: 'Kalender', count: projectScopedIssues.length },
                  { id: 'discovery', icon: Lightbulb, en: 'Discovery RICE', idLabel: 'Ide & RICE', count: ideas.length },
                  { id: 'jsm', icon: ShieldAlert, en: 'Service Desk & CAB', idLabel: 'Insiden & CAB', count: jsmTickets.length },
                  { id: 'forms', icon: ClipboardList, en: 'Forms Portal', idLabel: 'Portal Form', count: 4 },
                  { id: 'wiki', icon: BookOpen, en: 'Confluence Specs', idLabel: 'Dokumen PRD/ADR', count: wikiDocs.length },
                  { id: 'releases', icon: PackageCheck, en: 'Releases', idLabel: 'Versi Rilis', count: releases.length },
                  { id: 'navigator', icon: ListChecks, en: 'JQL & Bulk', idLabel: 'JQL & Massal', count: filteredIssues.length },
                  { id: 'reports', icon: BarChart3, en: 'CFD & Reports', idLabel: 'CFD & Laporan', count: 6 },
                  { id: 'automation', icon: Bot, en: 'Automation & Cloud', idLabel: 'Otomasi & Cloud', count: state.rules.length },
                  { id: 'workflow', icon: GitMerge, en: 'Workflow & RBAC', idLabel: 'Workflow & Izin', count: 5 },
                ] as const
              ).map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-testid={`jira-tab-${tab.id}`}
                    className={active ? 'jira-tab-btn is-active' : 'jira-tab-btn'}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} />
                    <span>{en ? tab.en : tab.idLabel}</span>
                    <span className="jira-tab-count">{tab.count}</span>
                  </button>
                )
              })}
            </div>
          )}

      {/* Shared JQL, Assignee Avatar & Quick Filter Bar (Board & Navigator) */}
      {(activeTab === 'board' || activeTab === 'navigator' || activeTab === 'backlog') && (
        <section className="jira-toolbar" aria-label={en ? 'JQL and board filters' : 'Filter JQL dan board'}>
          <div className="jira-toolbar-row">
            <label className="jira-jql-box">
              <span className="jira-jql-prefix">JQL</span>
              <input
                ref={jqlInputRef}
                type="text"
                data-testid="jira-jql-input"
                value={jqlQuery}
                onChange={e => setJqlQuery(e.target.value)}
                placeholder={
                  en
                    ? 'Search or run JQL: type = Bug AND priority in (Highest, High) AND status != Done'
                    : 'Cari atau ketik JQL: type = Bug AND priority in (Highest, High) AND status != Done'
                }
                aria-label={en ? 'JQL query filter' : 'Filter kueri JQL'}
              />
              {jqlQuery && (
                <button
                  type="button"
                  className="jira-chip-btn"
                  onClick={() => setJqlQuery('')}
                  aria-label={en ? 'Clear JQL query' : 'Hapus kueri JQL'}
                >
                  <X size={13} />
                </button>
              )}
            </label>

            {activeTab === 'board' && (
              <label className="jira-swimlane-select">
                <Filter size={14} />
                <span>{en ? 'Swimlanes:' : 'Swimlane:'}</span>
                <select
                  data-testid="jira-swimlane-select"
                  value={swimlane}
                  onChange={e => setSwimlane(e.target.value as JiraSwimlaneMode)}
                >
                  <option value="none">{en ? 'None (Standard)' : 'Tanpa Grup'}</option>
                  <option value="epic">{en ? 'Group by Epic' : 'Per Epic'}</option>
                  <option value="assignee">{en ? 'Group by Assignee' : 'Per PIC / Assignee'}</option>
                  <option value="priority">{en ? 'Group by Priority' : 'Per Prioritas'}</option>
                  <option value="component">{en ? 'Group by Component' : 'Per Komponen'}</option>
                </select>
              </label>
            )}

            <button
              type="button"
              className={showQuickFilters || assigneeFilter !== 'ALL' || quickFilter !== 'none' ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
              data-testid="jira-toggle-filters-btn"
              aria-expanded={showQuickFilters}
              onClick={() => setShowQuickFilters(v => !v)}
            >
              <Filter size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {showQuickFilters ? (en ? 'Hide Filters ▴' : 'Tutup Filter ▴') : en ? 'Quick Filters & PIC ▾' : 'Filter Cepat & PIC ▾'}
            </button>
          </div>

          {showQuickFilters && (<>
          {/* Saved Starred JQL Filters Bar */}
          <div className="jira-toolbar-row">
            <div className="jira-quick-chips" role="group" aria-label={en ? 'Saved JQL filters' : 'Filter JQL tersimpan'}>
              <span className="jira-kpi-label">
                <Star size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {en ? 'STARRED JQL:' : 'FILTER BINTANG:'}
              </span>
              {savedFilters.map(sf => (
                <button
                  key={sf.id}
                  type="button"
                  className={jqlQuery === sf.jql ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
                  onClick={() => setJqlQuery(prev => (prev === sf.jql ? '' : sf.jql))}
                >
                  ★ {sf.name}
                </button>
              ))}
              {jqlQuery.trim() && (
                <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                  <input
                    value={saveFilterName}
                    onChange={e => setSaveFilterName(e.target.value)}
                    placeholder={en ? 'Filter name…' : 'Nama filter…'}
                    style={{
                      height: 28,
                      padding: '2px 8px',
                      borderRadius: 7,
                      border: '1px solid rgba(148,163,184,0.3)',
                      background: 'transparent',
                      color: 'inherit',
                      fontSize: 11,
                    }}
                  />
                  <button
                    type="button"
                    className="jira-chip-btn"
                    onClick={() => {
                      const clean = saveFilterName.trim() || `Filter #${savedFilters.length + 1}`
                      setSavedFilters(prev => [...prev, { id: uid('sf'), name: clean, jql: jqlQuery.trim() }])
                      setSaveFilterName('')
                      flashNotice(en ? `Saved starred JQL filter "${clean}"!` : `Filter JQL "${clean}" disimpan!`)
                    }}
                  >
                    + {en ? 'Save JQL' : 'Simpan'}
                  </button>
                </span>
              )}
            </div>
          </div>

          <div className="jira-toolbar-row">
            <div className="jira-avatars-group" role="group" aria-label={en ? 'Filter by assignee' : 'Filter berdasarkan PIC'}>
              <button
                type="button"
                className={assigneeFilter === 'ALL' ? 'jira-avatar-pill is-active' : 'jira-avatar-pill'}
                onClick={() => setAssigneeFilter('ALL')}
              >
                <span className="jira-avatar-circle">ALL</span>
                <span>{en ? 'All Members' : 'Semua Tim'}</span>
              </button>
              {TEAM_MEMBERS.map(member => (
                <button
                  key={member.id}
                  type="button"
                  className={assigneeFilter === member.id ? 'jira-avatar-pill is-active' : 'jira-avatar-pill'}
                  onClick={() => setAssigneeFilter(prev => (prev === member.id ? 'ALL' : member.id))}
                >
                  <span className="jira-avatar-circle">{member.initials}</span>
                  <span>{member.id}</span>
                </button>
              ))}
            </div>

            <div className="jira-quick-chips">
              <button
                type="button"
                className={quickFilter === 'bugs' ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
                onClick={() => setQuickFilter(p => (p === 'bugs' ? 'none' : 'bugs'))}
              >
                {en ? 'Bugs & Security' : 'Bug & Keamanan'}
              </button>
              <button
                type="button"
                className={quickFilter === 'blocked' ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
                onClick={() => setQuickFilter(p => (p === 'blocked' ? 'none' : 'blocked'))}
              >
                {en ? 'Blocked Only' : 'Hanya Terhambat'}
              </button>
              <button
                type="button"
                className={quickFilter === 'subtasks' ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
                onClick={() => setQuickFilter(p => (p === 'subtasks' ? 'none' : 'subtasks'))}
              >
                {en ? 'Has Subtasks' : 'Punya Subtask'}
              </button>
              <button
                type="button"
                className="jira-chip-btn"
                onClick={() => setJqlQuery('priority in (Highest, High) AND status != Done')}
              >
                JQL: P0/P1 Open
              </button>
              {(jqlQuery || assigneeFilter !== 'ALL' || quickFilter !== 'none') && (
                <button
                  type="button"
                  className="jira-chip-btn"
                  onClick={() => {
                    setJqlQuery('')
                    setAssigneeFilter('ALL')
                    setQuickFilter('none')
                  }}
                >
                  {en ? 'Reset Filters' : 'Reset Filter'}
                </button>
              )}
            </div>
          </div>
          </>)}
        </section>
      )}

      {/* ====================================================================
          VIEW 1: ACTIVE SPRINT KANBAN / SCRUM BOARD
         ==================================================================== */}
      {activeTab === 'board' && (
        <section aria-label={en ? 'Active Sprint Kanban Board' : 'Board Kanban Sprint Aktif'}>
          <div className="jira-mobile-col-bar" role="group" aria-label={en ? 'Mobile column filter' : 'Filter kolom layar kecil'}>
            <button
              type="button"
              className={mobileCol === 'all' ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
              onClick={() => setMobileCol('all')}
            >
              {en ? 'All Columns' : 'Semua Kolom'}
            </button>
            {COLUMNS.map(col => (
              <button
                key={col.id}
                type="button"
                className={mobileCol === col.id ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
                onClick={() => setMobileCol(col.id)}
              >
                {en ? col.en : col.idLabel}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {swimlaneGroups.map(group => (
              <div className="jira-swimlane-section" key={group.id}>
                {group.title && (
                  <div className="jira-swimlane-header">
                    <span>{group.title}</span>
                    <span>
                      {group.issues.length} {en ? 'issues' : 'tiket'} ·{' '}
                      {group.issues.reduce((s, i) => s + i.points, 0)} SP
                    </span>
                  </div>
                )}

                <div className="jira-board-scroll">
                  <div className={mobileCol !== 'all' ? 'jira-board-grid is-single-mobile-col' : 'jira-board-grid'}>
                    {visibleColumns.map(col => {
                      const colIssues = group.issues.filter(i => i.status === col.id)
                      const colSp = colIssues.reduce((s, i) => s + i.points, 0)
                      const wipMax = state.wipLimits[col.id]
                      const isBreach = wipMax > 0 && colIssues.length > wipMax

                      return (
                        <div
                          key={col.id}
                          data-testid={`jira-col-${col.id}`}
                          className={`jira-column${dragOverCol === col.id ? ' is-drag-over' : ''}${isBreach ? ' is-wip-breach' : ''}`}
                          onDragOver={e => {
                            e.preventDefault()
                            if (dragOverCol !== col.id) setDragOverCol(col.id)
                          }}
                          onDragLeave={() => setDragOverCol(null)}
                          onDrop={e => {
                            e.preventDefault()
                            setDragOverCol(null)
                            const droppedId = e.dataTransfer.getData('text/plain') || draggingId
                            if (droppedId) {
                              transitionIssue(droppedId, col.id)
                              setDraggingId(null)
                            }
                          }}
                        >
                          <div className="jira-col-head">
                            <span className="jira-col-title">
                              <span className="jira-col-dot" style={{ background: col.dot }} />
                              {en ? col.en : col.idLabel} ({colIssues.length})
                            </span>
                            <span className="jira-col-meta">
                              <span>{colSp} SP</span>
                              {(col.id === 'in_progress' || col.id === 'review' || col.id === 'blocked') && (
                                <span className="jira-wip-ctrl" title={en ? 'Adjust column WIP limit' : 'Atur batas WIP kolom'}>
                                  WIP:{wipMax || '∞'}
                                  <button
                                    type="button"
                                    aria-label={`Decrease WIP limit for ${col.en}`}
                                    onClick={() =>
                                      setState(p => ({
                                        ...p,
                                        wipLimits: { ...p.wipLimits, [col.id]: Math.max(0, p.wipLimits[col.id] - 1) },
                                      }))
                                    }
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Increase WIP limit for ${col.en}`}
                                    onClick={() =>
                                      setState(p => ({
                                        ...p,
                                        wipLimits: { ...p.wipLimits, [col.id]: p.wipLimits[col.id] + 1 },
                                      }))
                                    }
                                  >
                                    +
                                  </button>
                                </span>
                              )}
                            </span>
                          </div>

                          {isBreach && (
                            <div className="jira-wip-alert" role="status">
                              <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                              {en
                                ? `WIP limit exceeded (${colIssues.length}/${wipMax})`
                                : `Melebihi batas WIP (${colIssues.length}/${wipMax})`}
                            </div>
                          )}

                          <div className="jira-card-list">
                            {colIssues.map(issue => {
                              const doneSub = issue.subtasks.filter(s => s.done).length
                              const member = TEAM_MEMBERS.find(m => m.id === issue.assignee)
                              const sla = computeIssueSlaState(issue)
                              return (
                                <article
                                  key={issue.id}
                                  draggable
                                  data-testid={`jira-card-${issue.key}`}
                                  className={`jira-card${cardDensity === 'compact' ? ' is-compact' : ''}${issue.flagged ? ' is-flagged' : ''}`}
                                  onDragStart={e => {
                                    setDraggingId(issue.id)
                                    e.dataTransfer.setData('text/plain', issue.id)
                                  }}
                                  onDragEnd={() => {
                                    setDraggingId(null)
                                    setDragOverCol(null)
                                  }}
                                >
                                  <div className="jira-card-top">
                                    <span className="jira-key-group">
                                      <span className={`jira-type-badge jira-type-${issue.type}`}>{issue.type}</span>
                                      <span className="jira-issue-key">{issue.key}</span>
                                      <span className={`jira-sla-pill jira-sla-${sla.status}`}>
                                        {en ? sla.labelEn : sla.labelId}
                                      </span>
                                    </span>
                                    <span className={`jira-priority-pill jira-prio-${issue.priority}`}>{issue.priority}</span>
                                  </div>

                                  <button
                                    type="button"
                                    className="jira-card-title-btn"
                                    onClick={() => setSelectedIssueId(issue.id)}
                                  >
                                    {issue.title}
                                  </button>

                                  {issue.epicKey && <span className="jira-epic-lozenge">{epicLookup(issue.epicKey)}</span>}

                                  {issue.flagged && (
                                    <span className="jira-flag-chip">
                                      <Flag size={10} /> {en ? 'FLAGGED IMPEDIMENT' : 'HAMBATAN DITANDAI'}
                                    </span>
                                  )}

                                  {issue.blockedByKey && (
                                    <span className="jira-wip-alert">
                                      {en ? `Blocked by ${issue.blockedByKey}` : `Terhambat oleh ${issue.blockedByKey}`}
                                    </span>
                                  )}

                                  {issue.labels.length > 0 && (
                                    <div className="jira-card-tags">
                                      {issue.labels.slice(0, 3).map(lbl => (
                                        <span className="jira-card-tag" key={lbl}>
                                          #{lbl}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="jira-card-foot">
                                    <span className="jira-card-signals">
                                      {issue.subtasks.length > 0 && (
                                        <span title="Subtasks">
                                          ☑ {doneSub}/{issue.subtasks.length}
                                        </span>
                                      )}
                                      {issue.prRef && (
                                        <span title={issue.prRef}>
                                          <GitBranch size={11} /> PR
                                        </span>
                                      )}
                                      {issue.comments.length > 0 && <span>💬 {issue.comments.length}</span>}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <span className="jira-sp-badge">{issue.points} SP</span>
                                      <span className="jira-avatar-circle" title={issue.assignee}>
                                        {member?.initials ?? issue.assignee.slice(0, 2).toUpperCase()}
                                      </span>
                                    </span>
                                  </div>

                                  <div className="jira-card-quick-move">
                                    <select
                                      aria-label={`${en ? 'Move status for' : 'Ubah status'} ${issue.key}`}
                                      data-testid={`jira-status-select-${issue.key}`}
                                      value={issue.status}
                                      onChange={e => transitionIssue(issue.id, e.target.value as JiraStatusId)}
                                    >
                                      {COLUMNS.map(c => (
                                        <option key={c.id} value={c.id}>
                                          {en ? `Status: ${c.en}` : `Status: ${c.idLabel}`}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </article>
                              )
                            })}
                          </div>

                          {/* Inline Jira Column Quick-Create */}
                          <form
                            className="jira-col-quick-add"
                            onSubmit={e => {
                              e.preventDefault()
                              handleQuickColumnAdd(col.id)
                            }}
                          >
                            <input
                              value={colQuickDrafts[col.id]}
                              onChange={e => setColQuickDrafts(prev => ({ ...prev, [col.id]: e.target.value }))}
                              placeholder={en ? `+ Create in ${col.en}…` : `+ Buat di ${col.idLabel}…`}
                              aria-label={`Quick create in ${col.en}`}
                            />
                            <button type="submit" aria-label={`Submit quick issue in ${col.en}`}>
                              +
                            </button>
                          </form>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================================
          VIEW 1B: AI AUTOPILOT & MULTI-HORIZON PREDICTIVE BRAIN
         ==================================================================== */}
      {activeTab === 'autopilot' && (
        <section
          className="jira-backlog-stack"
          data-testid="jira-autopilot-panel"
          aria-label={en ? 'AI Autopilot and Predictive Brain' : 'AI Autopilot dan Otak Prediktif'}
        >
          {/* 3-Horizon Trajectory */}
          <div className="jira-horizon-grid">
            {horizonReport.horizons.map(h => (
              <article
                key={h.id}
                className={`jira-horizon-card${h.health === 'watch' ? ' is-watch' : h.health === 'risk' ? ' is-risk' : ''}`}
              >
                <span className="jira-kpi-label">{en ? h.windowEn : h.windowId}</span>
                <strong style={{ fontSize: 15.5 }}>{en ? h.headlineEn : h.headlineId}</strong>
                <span className="jira-kpi-sub">{en ? h.detailEn : h.detailId}</span>
              </article>
            ))}
          </div>

          {/* Autonomous Natural-Language Goal -> Multi-Sprint Plan Compiler */}
          <article className="jira-panel-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <span className="jira-kpi-label">
                  {en ? 'AUTONOMOUS GOAL -> MULTI-SPRINT & EPIC COMPILER' : 'KOMPILATOR TUJUAN -> SPRINT & EPIC OTONOM'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {en
                    ? 'Give Any Product Goal — AI Thinks Ahead & Builds Your Sprint Plan Automatically'
                    : 'Masukkan Tujuan Produk — AI Berpikir ke Depan & Menyusun Sprint Secara Otomatis'}
                </h2>
              </div>
              <button
                type="button"
                className="button button-ghost"
                disabled={byokBusy}
                onClick={() => void runLiveByokForesight()}
              >
                <Sparkles size={14} />{' '}
                {byokBusy
                  ? en
                    ? 'Reasoning…'
                    : 'Menganalisis…'
                  : en
                    ? 'Deep Strategic Foresight'
                    : 'Analisis Strategis Mendalam'}
              </button>
            </div>

            <form className="jira-goal-compiler" onSubmit={handleCompileGoalToSprint}>
              <input
                type="text"
                data-testid="jira-goal-input"
                value={goalPrompt}
                onChange={e => setGoalPrompt(e.target.value)}
                placeholder={
                  en
                    ? 'e.g. Build cross-border QRIS instant settlement with AI fraud shield & canary rollout…'
                    : 'mis. Bangun sistem pembayaran QRIS real-time lintas negara dengan anti-fraud AI & canary rollout…'
                }
                aria-label={en ? 'Product goal for autonomous sprint synthesis' : 'Tujuan produk untuk sintesis sprint otonom'}
              />
              <button type="submit" className="button button-primary" data-testid="jira-compile-goal-btn">
                <BrainCircuit size={15} />{' '}
                {en ? 'Auto-Plan Epics & Sprints' : 'Susun Tiket & Sprint Otomatis'}
              </button>
            </form>

            {byokForecast && <pre className="jira-code-pre">{byokForecast}</pre>}
          </article>

          {/* Proactive Forward-Thinking Recommendations Queue */}
          <article className="jira-panel-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <span className="jira-kpi-label">
                  {en ? 'PROACTIVE RISK & BOTTLENECK FORESIGHT' : 'DETEKSI DINI RISIKO & BOTTLENECK MASA DEPAN'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {en
                    ? `Autonomous Recommendations (${horizonReport.recommendations.length})`
                    : `Rekomendasi Tindakan Otonom (${horizonReport.recommendations.length})`}
                </h2>
              </div>
              <button type="button" className="button button-primary" onClick={runAutonomousOptimization}>
                <Zap size={15} /> {en ? 'Execute All Autonomous Fixes' : 'Jalankan Semua Perbaikan Otomatis'}
              </button>
            </div>

            <div className="jira-rule-list">
              {horizonReport.recommendations.length === 0 ? (
                <div className="jira-rule-item">
                  <strong>
                    {en
                      ? 'All sprint horizons, workloads, subtasks, and SLA windows are operating at peak health!'
                      : 'Seluruh horizon sprint, beban tim, subtask, dan target SLA sudah berjalan pada kondisi optimal!'}
                  </strong>
                  <span className="jira-kpi-badge">100% HEALTHY</span>
                </div>
              ) : (
                horizonReport.recommendations.map(rec => (
                  <div className="jira-rule-item" key={rec.id}>
                    <div style={{ maxWidth: 700 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <span className={rec.severity === 'critical' ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
                          {en ? rec.horizonLabelEn : rec.horizonLabelId}
                        </span>
                        <strong>{en ? rec.titleEn : rec.titleId}</strong>
                      </div>
                      <div className="jira-kpi-sub" style={{ marginTop: 4 }}>
                        {en ? rec.rationaleEn : rec.rationaleId}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="jira-kpi-badge">{en ? rec.impactEn : rec.impactId}</span>
                      <button type="button" className="button button-primary" onClick={runAutonomousOptimization}>
                        {en ? 'Auto-Fix' : 'Perbaiki Otomatis'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <span className="jira-kpi-label">
                {en ? 'CHAIN-OF-THOUGHT AUTONOMOUS DECISION LEDGER' : ' CATATAN KEPUTUSAN OTONOM (CHAIN-OF-THOUGHT)'}
              </span>
              <pre className="jira-code-pre" style={{ marginTop: 8 }} data-testid="jira-ai-reasoning-log">
                {aiReasoningTrace.join('\n')}
              </pre>
            </div>
          </article>

          {/* Autonomous Daily Standup Digest (Slack / Teams Ready) */}
          <article className="jira-panel-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <span className="jira-kpi-label">
                  {en ? 'AUTONOMOUS DAILY STANDUP DIGEST (SLACK / TEAMS)' : 'RINGKASAN DAILY STANDUP OTONOM (SLACK / TEAMS)'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {en ? 'Zero-Meeting Async Standup Report' : 'Laporan Standup Harian Otomatis Siap Kirim'}
                </h2>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  const text = buildAutonomousStandupDigest(
                    state.activeSprintName,
                    state.issues,
                    horizonReport.confidenceScore,
                    en,
                  )
                  void navigator.clipboard?.writeText(text)
                  flashNotice(en ? 'Copied Autonomous Daily Standup digest!' : 'Ringkasan Daily Standup disalin!')
                }}
              >
                <Copy size={14} /> {en ? 'Copy Standup Digest' : 'Salin Standup'}
              </button>
            </div>
            <pre className="jira-code-pre">
              {buildAutonomousStandupDigest(state.activeSprintName, state.issues, horizonReport.confidenceScore, en)}
            </pre>
          </article>
        </section>
      )}

      {/* ====================================================================
          VIEW 2: BACKLOG & SPRINT CAPACITY PLANNING + PLANNING POKER
         ==================================================================== */}
      {activeTab === 'backlog' && (
        <section className="jira-backlog-stack" aria-label={en ? 'Backlog and Sprint Planning' : 'Backlog dan Perencanaan Sprint'}>
          {/* Interactive Planning Poker Estimator */}
          <article className="jira-panel-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <span className="jira-kpi-label">
                  {en ? 'SCRUM PLANNING POKER · AI STORY POINT CALIBRATOR' : 'PLANNING POKER SCRUM · KALIBRATOR STORY POINTS'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 17 }}>
                  {en
                    ? 'Calibrate Fibonacci Story Points Before Sprint Commitment'
                    : 'Hitung Objektif Estimasi Fibonacci Sebelum Komitmen Sprint'}
                </h2>
              </div>
              <span className="jira-kpi-badge" style={{ fontSize: 13, padding: '6px 12px' }}>
                {en ? 'Recommended:' : 'Rekomendasi:'}{' '}
                {estimatePokerStoryPoints(pokerComplexity, pokerUncertainty, pokerQa)} SP
              </span>
            </div>
            <div className="jira-field-grid">
              <div className="jira-field">
                <label>{en ? 'Technical Complexity' : 'Kompleksitas Teknis'}</label>
                <select
                  value={pokerComplexity}
                  onChange={e => setPokerComplexity(Number(e.target.value) as 1 | 2 | 3 | 5)}
                >
                  <option value={1}>1 · Trivial / Config</option>
                  <option value={2}>2 · Standard CRUD / UI</option>
                  <option value={3}>3 · Multi-Service / DB Migration</option>
                  <option value={5}>5 · Distributed Consensus / Crypto</option>
                </select>
              </div>
              <div className="jira-field">
                <label>{en ? 'Domain Uncertainty & QA Scope' : 'Ketidakpastian & Cakupan QA'}</label>
                <select
                  value={pokerUncertainty}
                  onChange={e => {
                    const v = Number(e.target.value) as 1 | 2 | 3
                    setPokerUncertainty(v)
                    setPokerQa(v)
                  }}
                >
                  <option value={1}>1 · Well-known contract</option>
                  <option value={2}>2 · Moderate edge-cases + E2E</option>
                  <option value={3}>3 · High external risk + Chaos test</option>
                </select>
              </div>
            </div>
          </article>
          {(
            [
              {
                id: 'sprint-24' as JiraSprintId,
                title: state.activeSprintName,
                badge: en ? 'ACTIVE SPRINT' : 'SPRINT AKTIF',
                capacity: 42,
              },
              {
                id: 'sprint-25' as JiraSprintId,
                title: 'Sprint 25 · Edge Mesh & Zero-Trust',
                badge: en ? 'PLANNED SPRINT' : 'SPRINT BERIKUTNYA',
                capacity: 40,
              },
              {
                id: 'backlog' as JiraSprintId,
                title: en ? 'Product Backlog (Unscheduled)' : 'Product Backlog (Belum Dijadwalkan)',
                badge: 'BACKLOG',
                capacity: 0,
              },
            ] as const
          ).map(bucket => {
            const bucketIssues = filteredIssues.filter(i => i.sprintId === bucket.id)
            const bucketSp = bucketIssues.reduce((s, i) => s + i.points, 0)
            const doneSp = bucketIssues.filter(i => i.status === 'done').reduce((s, i) => s + i.points, 0)
            const overloaded = bucket.capacity > 0 && bucketSp > bucket.capacity

            return (
              <div className="jira-sprint-bucket" key={bucket.id} data-testid={`jira-bucket-${bucket.id}`}>
                <div className="jira-sprint-head">
                  <div className="jira-sprint-head-title">
                    <span className={overloaded ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>{bucket.badge}</span>
                    <h2>{bucket.title}</h2>
                  </div>
                  <div className="jira-sprint-metrics">
                    <span>
                      {bucketIssues.length} {en ? 'issues' : 'tiket'}
                    </span>
                    <span>·</span>
                    <span>
                      {doneSp}/{bucketSp} SP {en ? 'done' : 'selesai'}
                    </span>
                    {bucket.capacity > 0 && (
                      <span className={overloaded ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
                        {en ? 'Capacity' : 'Kapasitas'}: {bucketSp}/{bucket.capacity} SP
                      </span>
                    )}
                  </div>
                </div>

                <div className="jira-backlog-rows">
                  {bucketIssues.map(issue => (
                    <div className="jira-backlog-row" key={issue.id}>
                      <div className="jira-backlog-row-main">
                        <span className={`jira-type-badge jira-type-${issue.type}`}>{issue.type}</span>
                        <span className="jira-issue-key">{issue.key}</span>
                        <button
                          type="button"
                          className="jira-card-title-btn"
                          onClick={() => setSelectedIssueId(issue.id)}
                        >
                          {issue.title}
                        </button>
                        <span className="jira-epic-lozenge">{issue.epicKey}</span>
                      </div>

                      <span className={`jira-priority-pill jira-prio-${issue.priority}`}>{issue.priority}</span>

                      <select
                        className="jira-select"
                        aria-label={`Story points for ${issue.key}`}
                        value={issue.points}
                        onChange={e => updateIssue(issue.id, { points: Number(e.target.value) })}
                      >
                        {FIBONACCI_POINTS.map(pt => (
                          <option key={pt} value={pt}>
                            {pt} SP
                          </option>
                        ))}
                      </select>

                      <select
                        className="jira-select"
                        aria-label={`Sprint assignment for ${issue.key}`}
                        value={issue.sprintId}
                        onChange={e => updateIssue(issue.id, { sprintId: e.target.value as JiraSprintId })}
                      >
                        <option value="sprint-24">Sprint 24 (Active)</option>
                        <option value="sprint-25">Sprint 25 (Next)</option>
                        <option value="backlog">Backlog</option>
                      </select>

                      <select
                        className="jira-select"
                        aria-label={`Status for ${issue.key}`}
                        value={issue.status}
                        onChange={e => transitionIssue(issue.id, e.target.value as JiraStatusId)}
                      >
                        {COLUMNS.map(c => (
                          <option key={c.id} value={c.id}>
                            {en ? c.en : c.idLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {bucket.id === 'backlog' && (
                  <form className="jira-quick-create-bar" onSubmit={handleQuickBacklogCreate}>
                    <select
                      className="jira-select"
                      aria-label={en ? 'Quick issue type' : 'Tipe tiket cepat'}
                      value={quickBacklogType}
                      onChange={e => setQuickBacklogType(e.target.value as JiraIssueKind)}
                    >
                      <option value="story">Story</option>
                      <option value="bug">Bug</option>
                      <option value="task">Task</option>
                      <option value="security">Security</option>
                    </select>
                    <input
                      type="text"
                      data-testid="jira-backlog-quick-input"
                      value={quickBacklogTitle}
                      onChange={e => setQuickBacklogTitle(e.target.value)}
                      placeholder={
                        en
                          ? '+ Create issue directly in Product Backlog…'
                          : '+ Buat tiket cepat langsung di Product Backlog…'
                      }
                      aria-label={en ? 'Quick create backlog issue' : 'Buat tiket cepat di backlog'}
                    />
                    <select
                      className="jira-select"
                      aria-label={en ? 'Quick story points' : 'Story points cepat'}
                      value={quickBacklogPoints}
                      onChange={e => setQuickBacklogPoints(Number(e.target.value))}
                    >
                      {FIBONACCI_POINTS.map(pt => (
                        <option key={pt} value={pt}>
                          {pt} SP
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="button button-primary">
                      <Plus size={15} /> {en ? 'Add to Backlog' : 'Tambah'}
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ====================================================================
          VIEW 3: EPIC GANTT TIMELINE & DEPENDENCY GRAPH
         ==================================================================== */}
      {activeTab === 'roadmap' && (
        <section className="jira-roadmap-card" aria-label={en ? 'Epic Gantt Roadmap' : 'Roadmap Gantt Epic'}>
          <div>
            <span className="jira-kpi-label">{en ? 'JIRA PLANS · QUARTERLY GANTT TIMELINE' : 'JIRA PLANS · TIMELINE GANTT KUARTAL'}</span>
            <h2 style={{ margin: '4px 0 0' }}>
              {en ? 'Epic Delivery Schedule & Blocker Dependencies' : 'Jadwal Delivery Epic & Ketergantungan Blocker'}
            </h2>
          </div>

          <div className="jira-gantt-scroll">
            <div className="jira-gantt-table">
              <div className="jira-gantt-months">
                <span>{en ? 'EPIC / OWNER / PROGRESS' : 'EPIC / OWNER / PROGRES'}</span>
                <span>Oct W1</span>
                <span>Oct W3</span>
                <span>Nov W1</span>
                <span>Nov W3</span>
                <span>Dec W1</span>
                <span>Dec W3</span>
                <span>Jan W1</span>
                <span>Jan W3</span>
              </div>

              {epicsList.map(epic => {
                const children = state.issues.filter(i => i.epicKey === epic.key)
                const totalSp = children.reduce((s, i) => s + i.points, 0)
                const doneSp = children.filter(i => i.status === 'done').reduce((s, i) => s + i.points, 0)
                const pct = totalSp > 0 ? Math.round((doneSp / totalSp) * 100) : 0
                const hasBlocked = children.some(i => i.status === 'blocked')
                const leftPct = (epic.startSlot / 8) * 100
                const widthPct = (epic.spanSlots / 8) * 100

                return (
                  <div className="jira-gantt-row" key={epic.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="jira-type-badge jira-type-epic">{epic.key}</span>
                        <span className={hasBlocked ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
                          {hasBlocked ? (en ? 'AT RISK' : 'BERISIKO') : `${pct}%`}
                        </span>
                      </div>
                      <strong style={{ fontSize: 13 }}>{en ? epic.nameEn : epic.nameId}</strong>
                      <span className="jira-kpi-sub">
                        Owner: {epic.owner} · {children.length} {en ? 'issues' : 'tiket'} ({doneSp}/{totalSp} SP)
                      </span>
                    </div>

                    <div className="jira-gantt-track">
                      <div
                        className="jira-gantt-bar"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: epic.color,
                        }}
                      >
                        {epic.key} · {pct}% ({doneSp}/{totalSp} SP)
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(148,163,184,0.16)', paddingTop: 14 }}>
            <span className="jira-kpi-label">{en ? 'CROSS-ISSUE DEPENDENCY LEDGER' : 'DAFTAR KETERGANTUNGAN ANTAR-TIKET'}</span>
            <div className="jira-rule-list" style={{ marginTop: 10 }}>
              {state.issues
                .filter(i => Boolean(i.blockedByKey))
                .map(issue => {
                  const upstream = state.issues.find(u => u.key === issue.blockedByKey)
                  const resolved = upstream?.status === 'done'
                  return (
                    <div className="jira-rule-item" key={issue.id}>
                      <div>
                        <strong>
                          {issue.key} ({issue.title})
                        </strong>
                        <div className="jira-kpi-sub">
                          {en ? 'is blocked by' : 'dihambat oleh'} <b>{issue.blockedByKey}</b> (
                          {upstream ? `${upstream.title} — ${upstream.status.toUpperCase()}` : 'External'})
                        </div>
                      </div>
                      <span className={resolved ? 'jira-kpi-badge' : 'jira-kpi-badge is-warn'}>
                        {resolved ? (en ? 'BLOCKER RESOLVED' : 'BLOCKER SELESAI') : en ? 'ACTIVE BLOCKER' : 'MASIH MENGHAMBAT'}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>

          <form
            className="jira-goal-compiler"
            onSubmit={e => {
              e.preventDefault()
              const clean = newEpicTitle.trim()
              if (!clean) return
              const nextKey = `${activeProjectKey}-EPIC-${epicsList.length + 1}`
              setEpicsList(prev => [
                ...prev,
                {
                  id: uid('epic'),
                  key: nextKey,
                  nameEn: clean,
                  nameId: clean,
                  color: 'linear-gradient(90deg, #34d399, #38bdf8)',
                  startSlot: 2,
                  spanSlots: 4,
                  owner: 'Bima',
                },
              ])
              setNewEpicTitle('')
              flashNotice(en ? `Created new Roadmap Epic ${nextKey}!` : `Epic baru ${nextKey} ditambahkan ke Roadmap!`)
            }}
          >
            <input
              value={newEpicTitle}
              onChange={e => setNewEpicTitle(e.target.value)}
              placeholder={en ? '+ Create new strategic Epic on Gantt timeline…' : '+ Buat Epic strategis baru di timeline Gantt…'}
              aria-label={en ? 'New Epic title' : 'Judul Epic baru'}
            />
            <button type="submit" className="button button-primary">
              <Plus size={14} /> {en ? 'Add Epic' : 'Tambah Epic'}
            </button>
          </form>
        </section>
      )}

      {/* ====================================================================
          VIEW 3C: JIRA PRODUCT DISCOVERY & RICE PRIORITIZATION MATRIX
         ==================================================================== */}
      {activeTab === 'discovery' && (
        <section
          className="jira-backlog-stack"
          data-testid="jira-discovery-panel"
          aria-label={en ? 'Jira Product Discovery RICE Matrix' : 'Matriks Prioritas Ide RICE'}
        >
          <article className="jira-panel-card">
            <div>
              <span className="jira-kpi-label">
                {en ? 'JIRA PRODUCT DISCOVERY · RICE SCORING MATRIX' : 'JIRA PRODUCT DISCOVERY · MATRIKS SKOR RICE'}
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                {en
                  ? 'Prioritize Product Ideas by Reach × Impact × Confidence ÷ Effort'
                  : 'Prioritaskan Ide Fitur Berdasarkan Reach × Impact × Confidence ÷ Effort'}
              </h2>
            </div>

            <form
              className="jira-goal-compiler"
              onSubmit={e => {
                e.preventDefault()
                const clean = newIdeaTitle.trim()
                if (!clean) return
                const code = `IDEA-0${ideas.length + 1}`
                setIdeas(prev => [
                  {
                    id: uid('idea'),
                    code,
                    titleEn: clean,
                    titleId: clean,
                    reach: newIdeaReach,
                    impact: newIdeaImpact,
                    confidence: 85,
                    effort: newIdeaEffort,
                    epicKey: epicsList[0]?.key ?? 'DX-EPIC-1',
                  },
                  ...prev,
                ])
                setNewIdeaTitle('')
                flashNotice(en ? `Added ${code} to Product Discovery!` : `Ide ${code} berhasil ditambahkan!`)
              }}
            >
              <input
                value={newIdeaTitle}
                onChange={e => setNewIdeaTitle(e.target.value)}
                placeholder={en ? 'Capture new product idea or customer request…' : 'Tulis ide fitur atau kebutuhan pelanggan baru…'}
                aria-label={en ? 'Product discovery idea title' : 'Judul ide produk baru'}
              />
              <select
                className="jira-select"
                value={newIdeaReach}
                onChange={e => setNewIdeaReach(Number(e.target.value))}
                aria-label="Reach"
              >
                <option value={250}>Reach: 250/mo</option>
                <option value={500}>Reach: 500/mo</option>
                <option value={900}>Reach: 900/mo</option>
              </select>
              <select
                className="jira-select"
                value={newIdeaImpact}
                onChange={e => setNewIdeaImpact(Number(e.target.value) as 1 | 2 | 3)}
                aria-label="Impact"
              >
                <option value={1}>Impact: 1x</option>
                <option value={2}>Impact: 2x (High)</option>
                <option value={3}>Impact: 3x (Massive)</option>
              </select>
              <select
                className="jira-select"
                value={newIdeaEffort}
                onChange={e => setNewIdeaEffort(Number(e.target.value))}
                aria-label="Effort"
              >
                <option value={2}>Effort: 2w</option>
                <option value={3}>Effort: 3w</option>
                <option value={5}>Effort: 5w</option>
              </select>
              <button type="submit" className="button button-primary">
                <Plus size={14} /> {en ? 'Add Idea' : 'Tambah Ide'}
              </button>
            </form>

            <div className="jira-rule-list">
              {[...ideas]
                .sort((a, b) => computeRiceScore(b) - computeRiceScore(a))
                .map(idea => {
                  const score = computeRiceScore(idea)
                  return (
                    <div className="jira-rule-item" key={idea.id}>
                      <div style={{ maxWidth: 680 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span className="jira-type-badge jira-type-epic">{idea.code}</span>
                          <span className="jira-kpi-badge">RICE: {score}</span>
                          <strong>{en ? idea.titleEn : idea.titleId}</strong>
                        </div>
                        <div className="jira-kpi-sub" style={{ marginTop: 4 }}>
                          Reach {idea.reach} · Impact {idea.impact}x · Confidence {idea.confidence}% · Effort {idea.effort}w ·{' '}
                          {idea.epicKey}
                        </div>
                      </div>
                      {idea.promotedKey ? (
                        <span className="jira-kpi-badge">
                          {en ? `Promoted -> ${idea.promotedKey}` : `Masuk Sprint -> ${idea.promotedKey}`}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="button button-primary"
                          data-testid={`jira-promote-${idea.code}`}
                          onClick={() => promoteDiscoveryIdea(idea)}
                        >
                          <Zap size={14} /> {en ? 'Promote to Sprint' : 'Jadikan Tiket Sprint'}
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          </article>
        </section>
      )}

      {/* ====================================================================
          VIEW 3D: JIRA SERVICE MANAGEMENT (JSM) INCIDENTS & CAB DESK
         ==================================================================== */}
      {activeTab === 'jsm' && (
        <section
          className="jira-backlog-stack"
          data-testid="jira-jsm-panel"
          aria-label={en ? 'Jira Service Management Desk' : 'Meja Layanan Insiden dan CAB JSM'}
        >
          <article className="jira-panel-card">
            <div>
              <span className="jira-kpi-label">
                {en ? 'JIRA SERVICE MANAGEMENT (ITSM) · INCIDENTS & CAB' : 'JIRA SERVICE MANAGEMENT (ITSM) · INSIDEN & CAB'}
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                {en
                  ? 'Live Production Incidents, On-Call SLA & Change Advisory Board'
                  : 'Insiden Produksi Aktif, SLA On-Call & Persetujuan Perubahan CAB'}
              </h2>
            </div>

            <div className="jira-rule-list">
              {jsmTickets.map(ticket => (
                <div className="jira-rule-item" key={ticket.id}>
                  <div style={{ maxWidth: 680 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span className={`jira-type-badge ${ticket.kind === 'incident' ? 'jira-type-bug' : 'jira-type-task'}`}>
                        {ticket.key}
                      </span>
                      <span className={ticket.severity === 'SEV-1' ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
                        {ticket.severity}
                      </span>
                      <strong>{en ? ticket.summaryEn : ticket.summaryId}</strong>
                    </div>
                    <div className="jira-kpi-sub" style={{ marginTop: 4 }}>
                      Service: <b>{ticket.service}</b> · Reporter: {ticket.requester} ·{' '}
                      {en ? ticket.slaRemainingEn : ticket.slaRemainingId}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {ticket.kind === 'change' && ticket.cabStatus !== 'approved' && (
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() =>
                          setJsmTickets(old =>
                            old.map(t => (t.id === ticket.id ? { ...t, cabStatus: 'approved' } : t)),
                          )
                        }
                      >
                        {en ? 'Approve CAB' : 'Setujui CAB'}
                      </button>
                    )}
                    {ticket.linkedBoardKey ? (
                      <span className="jira-kpi-badge">Linked: {ticket.linkedBoardKey}</span>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary"
                        data-testid={`jira-escalate-${ticket.key}`}
                        onClick={() => escalateJsmIncident(ticket)}
                      >
                        <ShieldAlert size={14} /> {en ? 'Escalate to Sprint Board' : 'Eskalasi ke Sprint Board'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {/* ====================================================================
          VIEW 3E: CONFLUENCE LINKED SPECS, PRD & ADR WIKI
         ==================================================================== */}
      {activeTab === 'wiki' && (
        <section
          className="jira-panel-card"
          data-testid="jira-wiki-panel"
          aria-label={en ? 'Confluence Engineering Wiki' : 'Wiki Spesifikasi Confluence'}
        >
          <div>
            <span className="jira-kpi-label">
              {en ? 'ATLASSIAN CONFLUENCE BRIDGE · LINKED PRDs, ADRs & RUNBOOKS' : 'INTEGRASI CONFLUENCE · DOKUMEN PRD, ADR & RUNBOOK'}
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
              {en
                ? 'Bi-Directional Knowledge Base Connected Directly to Sprint Tickets'
                : 'Basis Dokumen Arsitektur yang Terhubung Dua Arah ke Tiket Sprint'}
            </h2>
          </div>

          <div className="jira-wiki-layout">
            <div className="jira-wiki-nav">
              {wikiDocs.map(doc => (
                <button
                  key={doc.id}
                  type="button"
                  className={activeWikiId === doc.id ? 'jira-wiki-nav-btn is-active' : 'jira-wiki-nav-btn'}
                  onClick={() => setActiveWikiId(doc.id)}
                >
                  <span className="jira-kpi-label">
                    {doc.code} · {doc.category}
                  </span>
                  <strong style={{ fontSize: 12.5 }}>{en ? doc.titleEn : doc.titleId}</strong>
                </button>
              ))}
            </div>

            {(() => {
              const doc = wikiDocs.find(d => d.id === activeWikiId) ?? wikiDocs[0]
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{en ? doc.titleEn : doc.titleId}</strong>
                      <div className="jira-kpi-sub">
                        {doc.author} · Updated {doc.updatedAt} · Linked: {doc.linkedKeys.join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      data-testid="jira-wiki-extract-btn"
                      onClick={() => extractWikiActionToTicket(doc)}
                    >
                      <Plus size={14} /> {en ? 'Extract Action to Jira Ticket' : 'Jadikan Tiket Jira'}
                    </button>
                  </div>

                  <div className="jira-field">
                    <textarea
                      aria-label="Confluence specification markdown editor"
                      style={{ minHeight: 190 }}
                      value={en ? doc.bodyEn : doc.bodyId}
                      onChange={e => {
                        const val = e.target.value
                        setWikiDocs(old =>
                          old.map(d => (d.id === doc.id ? (en ? { ...d, bodyEn: val } : { ...d, bodyId: val }) : d)),
                        )
                      }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* ====================================================================
          VIEW 3B: RELEASES, FIX VERSIONS & CHANGELOG HUB
         ==================================================================== */}
      {activeTab === 'releases' && (
        <section
          className="jira-backlog-stack"
          data-testid="jira-releases-panel"
          aria-label={en ? 'Releases and Fix Versions Hub' : 'Hub Rilis dan Versi'}
        >
          <div className="jira-release-grid">
            {releases.map(rel => {
              const scopeIssues = state.issues.filter(i =>
                rel.id === 'v7.0.0'
                  ? i.status === 'done'
                  : rel.id === 'v7.1.0'
                    ? i.sprintId === 'sprint-24'
                    : i.sprintId !== 'sprint-24',
              )
              const doneCount = scopeIssues.filter(i => i.status === 'done').length
              const pct = scopeIssues.length > 0 ? Math.round((doneCount / scopeIssues.length) * 100) : 100
              return (
                <article className="jira-panel-card" key={rel.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span className={rel.status === 'released' ? 'jira-kpi-badge' : 'jira-kpi-badge is-warn'}>
                      {rel.status.toUpperCase()}
                    </span>
                    <span className="jira-kpi-sub">{rel.targetDate}</span>
                  </div>
                  <strong style={{ fontSize: 16 }}>{rel.name}</strong>
                  <span className="jira-kpi-sub">{en ? rel.summaryEn : rel.summaryId}</span>
                  <div className="jira-progress-track">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span className="jira-kpi-sub">
                      {doneCount}/{scopeIssues.length} {en ? 'issues done' : 'tiket selesai'} ({pct}%)
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => setSelectedReleaseId(rel.id)}
                      >
                        {en ? 'Notes' : 'Catatan'}
                      </button>
                      {rel.status !== 'released' && (
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => {
                            setReleases(prev =>
                              prev.map(r => (r.id === rel.id ? { ...r, status: 'released' } : r)),
                            )
                            flashNotice(
                              en
                                ? `Shipped ${rel.name} and generated signed release notes!`
                                : `${rel.name} resmi dirilis beserta catatan changelog otomatis!`,
                            )
                          }}
                        >
                          {en ? 'Ship' : 'Rilis'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {(() => {
            const activeRel = releases.find(r => r.id === selectedReleaseId) ?? releases[0]
            const notesMd = buildReleaseNotesMarkdown(activeRel, state.issues, en)
            return (
              <article className="jira-panel-card">
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div>
                    <span className="jira-kpi-label">
                      {en ? 'AUTO-GENERATED RELEASE NOTES (MARKDOWN)' : 'CATATAN RILIS OTOMATIS (MARKDOWN)'}
                    </span>
                    <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>{activeRel.name}</h2>
                  </div>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      void navigator.clipboard?.writeText(notesMd)
                      flashNotice(en ? 'Copied Markdown release notes!' : 'Catatan rilis Markdown disalin!')
                    }}
                  >
                    <Copy size={14} /> {en ? 'Copy Release Notes' : 'Salin Catatan Rilis'}
                  </button>
                </div>
                <pre className="jira-code-pre">{notesMd}</pre>
              </article>
            )
          })()}
        </section>
      )}

      {/* ====================================================================
          VIEW 4: ISSUE NAVIGATOR & BULK OPERATIONS
         ==================================================================== */}
      {activeTab === 'navigator' && (
        <section className="jira-panel-card" aria-label={en ? 'Issue Navigator and Bulk Edit' : 'Navigator Tiket dan Edit Massal'}>
          {selectedBulkIds.length > 0 && (
            <div className="jira-bulk-bar" data-testid="jira-bulk-bar">
              <strong>
                {selectedBulkIds.length} {en ? 'issue(s) selected for bulk operation' : 'tiket dipilih untuk aksi massal'}
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <select
                  className="jira-select"
                  aria-label="Bulk status target"
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as JiraStatusId)}
                >
                  {COLUMNS.map(c => (
                    <option key={c.id} value={c.id}>
                      {en ? c.en : c.idLabel}
                    </option>
                  ))}
                </select>
                <button type="button" className="button button-primary" onClick={() => applyBulkAction('status')}>
                  {en ? 'Apply Status' : 'Ubah Status'}
                </button>

                <select
                  className="jira-select"
                  aria-label="Bulk priority target"
                  value={bulkPriority}
                  onChange={e => setBulkPriority(e.target.value as JiraPriorityLevel)}
                >
                  {(['Highest', 'High', 'Medium', 'Low'] as const).map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button type="button" className="button button-ghost" onClick={() => applyBulkAction('priority')}>
                  {en ? 'Apply Priority' : 'Ubah Prioritas'}
                </button>

                <select
                  className="jira-select"
                  aria-label="Bulk assignee target"
                  value={bulkAssignee}
                  onChange={e => setBulkAssignee(e.target.value)}
                >
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
                <button type="button" className="button button-ghost" onClick={() => applyBulkAction('assignee')}>
                  {en ? 'Assign' : 'Tugaskan'}
                </button>
              </div>
            </div>
          )}

          <div className="jira-table-wrap">
            <table className="jira-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label={en ? 'Select all filtered issues' : 'Pilih semua tiket'}
                      checked={filteredIssues.length > 0 && selectedBulkIds.length === filteredIssues.length}
                      onChange={e =>
                        setSelectedBulkIds(e.target.checked ? filteredIssues.map(i => i.id) : [])
                      }
                    />
                  </th>
                  <th>Key</th>
                  <th>{en ? 'Type' : 'Tipe'}</th>
                  <th>{en ? 'Summary' : 'Ringkasan'}</th>
                  <th>{en ? 'Priority' : 'Prioritas'}</th>
                  <th>{en ? 'Status' : 'Status'}</th>
                  <th>SP</th>
                  <th>Assignee</th>
                  <th>Epic</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map(issue => (
                  <tr key={issue.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${issue.key}`}
                        checked={selectedBulkIds.includes(issue.id)}
                        onChange={e =>
                          setSelectedBulkIds(prev =>
                            e.target.checked ? [...prev, issue.id] : prev.filter(id => id !== issue.id),
                          )
                        }
                      />
                    </td>
                    <td className="jira-issue-key">{issue.key}</td>
                    <td>
                      <span className={`jira-type-badge jira-type-${issue.type}`}>{issue.type}</span>
                    </td>
                    <td>
                      <button type="button" className="jira-card-title-btn" onClick={() => setSelectedIssueId(issue.id)}>
                        {issue.title}
                      </button>
                    </td>
                    <td>
                      <span className={`jira-priority-pill jira-prio-${issue.priority}`}>{issue.priority}</span>
                    </td>
                    <td>{COLUMNS.find(c => c.id === issue.status)?.[en ? 'en' : 'idLabel']}</td>
                    <td>
                      <span className="jira-sp-badge">{issue.points}</span>
                    </td>
                    <td>{issue.assignee}</td>
                    <td>
                      <span className="jira-epic-lozenge">{issue.epicKey}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ====================================================================
          VIEW 5: AGILE REPORTS — BURNDOWN, VELOCITY & WORKLOAD
         ==================================================================== */}
      {activeTab === 'reports' && (
        <section className="jira-reports-grid" aria-label={en ? 'Agile Burndown and Velocity Reports' : 'Laporan Burndown dan Velocity Agile'}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Suspense fallback={<div className="jira-panel-card">{en ? 'Loading DORA Executive Metrics…' : 'Memuat Metrik Eksekutif DORA…'}</div>}>
              <JiraDoraPanel
                en={en}
                issues={projectScopedIssues}
                releases={releases}
                incidents={jsmTickets}
              />
            </Suspense>
          </div>
          {/* Sprint Burndown Chart */}
          <article className="jira-panel-card">
            <div>
              <span className="jira-kpi-label">{en ? 'SPRINT BURNDOWN CHART' : 'GRAFIK SPRINT BURNDOWN'}</span>
              <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                {state.activeSprintName} ({metrics.totalSp - metrics.doneSp} SP {en ? 'remaining' : 'tersisa'})
              </h2>
            </div>
            {(() => {
              const total = Math.max(10, metrics.totalSp)
              const rem = Math.max(0, metrics.totalSp - metrics.doneSp)
              const actualPts = [
                total,
                Math.round(total * 0.92),
                Math.round(total * 0.84),
                Math.round(total * 0.72),
                Math.round(total * 0.64),
                rem,
              ]
              const mapX = (idx: number) => 44 + idx * 46
              const mapY = (val: number) => 170 - (val / total) * 136
              const actualPath = actualPts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(v)}`).join(' ')
              return (
                <svg className="jira-chart-svg" viewBox="0 0 480 200" role="img" aria-label="Sprint burndown chart">
                  <line x1="44" y1="34" x2="458" y2="170" stroke="#64748b" strokeDasharray="5 5" strokeWidth="2" />
                  <path d={actualPath} fill="none" stroke="#38bdf8" strokeWidth="3" />
                  {actualPts.map((v, i) => (
                    <circle key={i} cx={mapX(i)} cy={mapY(v)} r="4.5" fill="#c5ff70" />
                  ))}
                  {[0, 2, 4, 6, 8, 9].map((d, idx) => (
                    <text key={d} x={44 + idx * 82} y="192" fill="#94a3b8" fontSize="10">
                      Day {d + 1}
                    </text>
                  ))}
                  <text x="8" y="40" fill="#94a3b8" fontSize="10">{total}SP</text>
                  <text x="14" y="172" fill="#94a3b8" fontSize="10">0</text>
                </svg>
              )
            })()}
            <span className="jira-kpi-sub">
              {en
                ? 'Dashed line = Ideal linear burndown · Cyan curve = Live sprint remaining Story Points.'
                : 'Garis putus = Burndown ideal · Kurva sian = Sisa Story Points aktual di sprint aktif.'}
            </span>
          </article>

          {/* Velocity History Chart */}
          <article className="jira-panel-card">
            <div>
              <span className="jira-kpi-label">{en ? 'TEAM VELOCITY & MONTE CARLO' : 'VELOCITY TIM & MONTE CARLO'}</span>
              <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                {en ? `Avg ${metrics.avgVelocity} SP / Sprint` : `Rata-rata ${metrics.avgVelocity} SP / Sprint`}
              </h2>
            </div>
            <svg className="jira-chart-svg" viewBox="0 0 480 200" role="img" aria-label="Team velocity chart">
              {[...state.velocityHistory, { sprintName: 'Current', committed: metrics.totalSp, completed: metrics.doneSp }].map(
                (v, idx) => {
                  const maxBar = 52
                  const xBase = 42 + idx * 86
                  const hCommit = Math.min(140, (v.committed / maxBar) * 140)
                  const hDone = Math.min(140, (v.completed / maxBar) * 140)
                  return (
                    <g key={v.sprintName}>
                      <rect x={xBase} y={168 - hCommit} width="22" height={hCommit} rx="4" fill="#334155" />
                      <rect x={xBase + 25} y={168 - hDone} width="22" height={hDone} rx="4" fill="#4ade80" />
                      <text x={xBase} y="188" fill="#94a3b8" fontSize="10">
                        {v.sprintName.replace('Sprint ', 'S')}
                      </text>
                    </g>
                  )
                },
              )}
            </svg>
            <span className="jira-kpi-sub">
              {en
                ? `Monte Carlo Release Forecast (${metrics.remainingTotalSp} SP open): P50 = ${metrics.p50Sprints} sprints · P85 = ${metrics.p85Sprints} sprints · P95 = ${metrics.p95Sprints} sprints.`
                : `Proyeksi Rilis Monte Carlo (${metrics.remainingTotalSp} SP tersisa): P50 = ${metrics.p50Sprints} sprint · P85 = ${metrics.p85Sprints} sprint · P95 = ${metrics.p95Sprints} sprint.`}
            </span>
          </article>

          {/* Cumulative Flow Diagram (CFD) */}
          <article className="jira-panel-card" style={{ gridColumn: '1 / -1' }}>
            <div>
              <span className="jira-kpi-label">
                {en ? 'CUMULATIVE FLOW DIAGRAM (CFD) · CYCLE STABILITY' : 'CUMULATIVE FLOW DIAGRAM (CFD) · STABILITAS ALUR'}
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                {en ? 'Stage Throughput Across Done, QA Review, In Progress & To Do' : 'Akumulasi Alur Tiket Lintas Tahap Kerja'}
              </h2>
            </div>
            <svg className="jira-chart-svg" viewBox="0 0 640 160" role="img" aria-label="Cumulative flow diagram">
              <polygon points="30,140 180,128 330,115 480,96 610,76 610,140" fill="rgba(74, 222, 128, 0.35)" />
              <polygon points="30,118 180,104 330,88 480,70 610,54 610,76 480,96 330,115 180,128 30,140" fill="rgba(167, 139, 250, 0.35)" />
              <polygon points="30,90 180,76 330,62 480,46 610,32 610,54 480,70 330,88 180,104 30,118" fill="rgba(56, 189, 248, 0.35)" />
              <line x1="30" y1="76" x2="610" y2="32" stroke="#38bdf8" strokeWidth="2" />
              <line x1="30" y1="140" x2="610" y2="76" stroke="#4ade80" strokeWidth="2" />
              <text x="36" y="24" fill="#94a3b8" fontSize="10">Green = Done · Purple = QA Review · Cyan = In Progress</text>
            </svg>
          </article>

          {/* Workload Distribution by Assignee */}
          <article className="jira-panel-card" style={{ gridColumn: '1 / -1' }}>
            <span className="jira-kpi-label">{en ? 'WORKLOAD BY ENGINEER' : 'DISTRIBUSI BEBAN KERJA TIM'}</span>
            <div className="jira-rule-list">
              {TEAM_MEMBERS.map(m => {
                const assigned = state.issues.filter(i => i.assignee === m.id && i.status !== 'done')
                const sp = assigned.reduce((s, i) => s + i.points, 0)
                const pct = Math.min(100, Math.round((sp / 16) * 100))
                return (
                  <div className="jira-rule-item" key={m.id}>
                    <div style={{ minWidth: 190 }}>
                      <strong>
                        {m.id} · {m.role}
                      </strong>
                      <div className="jira-kpi-sub">
                        {assigned.length} {en ? 'active issues' : 'tiket aktif'} · {sp} SP
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div className="jira-progress-track">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className={sp > 13 ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
                      {sp > 13 ? (en ? 'HIGH LOAD' : 'BEBAN TINGGI') : en ? 'BALANCED' : 'SEIMBANG'}
                    </span>
                  </div>
                )
              })}
            </div>
          </article>

          {/* Autonomous Sprint Retrospective & Continuous Improvement Synthesizer */}
          <article className="jira-panel-card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <span className="jira-kpi-label">
                  {en ? 'AUTONOMOUS SPRINT RETROSPECTIVE -> ACTION TICKETS' : 'RETROSPEKTIF SPRINT OTONOM -> TIKET TINDAK LANJUT'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {en
                    ? 'Self-Learning Sprint Retro Insights'
                    : 'Pembelajaran Otomatis Sprint & Aksi Perbaikan Sprint Depan'}
                </h2>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setState(prev => {
                    const key = `DX-${prev.nextSequence}`
                    const retroIssue: JiraIssue = {
                      id: uid('retro'),
                      key,
                      title: en
                        ? '[Retro Action] Automate contract stubbing for cross-service dependencies'
                        : '[Aksi Retro] Otomasi contract stubbing untuk mencegah blocker lintas layanan',
                      description: 'Auto-created from Sprint 24 Retrospective to eliminate upstream blocker wait time.',
                      type: 'task',
                      status: 'todo',
                      priority: 'High',
                      points: 3,
                      assignee: 'Nadia',
                      epicKey: 'DX-EPIC-3',
                      sprintId: 'sprint-25',
                      labels: ['retro-action', 'continuous-improvement'],
                      dueDate: '2026-12-04',
                      subtasks: [],
                      comments: [],
                      updatedAt: new Date().toISOString(),
                    }
                    return {
                      ...prev,
                      nextSequence: prev.nextSequence + 1,
                      issues: [retroIssue, ...prev.issues],
                    }
                  })
                  flashNotice(
                    en
                      ? 'Converted Sprint Retro insight into actionable Sprint 25 ticket!'
                      : 'Temuan Retrospektif berhasil dijadikan tiket tindak lanjut di Sprint 25!',
                  )
                }}
              >
                <Plus size={15} /> {en ? 'Convert Retro Insight to Ticket' : 'Jadikan Tiket Sprint 25'}
              </button>
            </div>
            <div className="jira-horizon-grid">
              <div className="jira-horizon-card">
                <span className="jira-kpi-label">{en ? 'WHAT WENT WELL' : 'YANG BERJALAN SANGAT BAIK'}</span>
                <strong>{en ? 'Zero escaped security regressions' : 'Nol kebocoran regresi keamanan'}</strong>
                <span className="jira-kpi-sub">
                  {en
                    ? 'AUTO-01 & AUTO-02 rules automatically enforced security triage and Playwright subtasks.'
                    : 'Aturan AUTO-01 & AUTO-02 otomatis menjaga triase keamanan dan cakupan tes Playwright.'}
                </span>
              </div>
              <div className="jira-horizon-card is-watch">
                <span className="jira-kpi-label">{en ? 'FRICTION DETECTED' : 'HAMBATAN TERDETEKSI'}</span>
                <strong>{en ? 'Upstream schema dependency wait' : 'Waktu tunggu skema dependensi hulu'}</strong>
                <span className="jira-kpi-sub">
                  {en
                    ? 'Coupled FX cache & Outbox migrations caused temporary blocker state on DX-104.'
                    : 'Ketergantungan skema antara migrasi Outbox & FX cache sempat menahan DX-104.'}
                </span>
              </div>
              <div className="jira-horizon-card">
                <span className="jira-kpi-label">{en ? 'NEXT SPRINT COMMITMENT' : 'KOMITMEN OTOMATIS BERIKUTNYA'}</span>
                <strong>{en ? 'Contract-first mock stubs in CI' : 'Contract-first mock stub di CI'}</strong>
                <span className="jira-kpi-sub">
                  {en
                    ? 'Decouple consumer stories via OpenAPI mock servers on Day 1 of every sprint.'
                    : 'Pisahkan ketergantungan antar-tim lewat mock server OpenAPI sejak hari pertama sprint.'}
                </span>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* ====================================================================
          VIEW 6: JIRA AUTOMATION ENGINE & ATLASSIAN REST API v3 BRIDGE
         ==================================================================== */}
      {activeTab === 'automation' && (
        <section className="jira-backlog-stack" aria-label={en ? 'Jira Automation and REST v3 Sync' : 'Otomasi Jira dan Sinkronisasi REST v3'}>
          <article className="jira-panel-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <span className="jira-kpi-label">{en ? 'NO-CODE JIRA AUTOMATION RULES' : 'ATURAN OTOMASI JIRA TANPA KODE'}</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {en ? 'Live Event-Driven Workflow Rules & Custom Builder' : 'Aturan Workflow Otomatis & Pembuat Aturan Baru'}
                </h2>
              </div>
              <button
                type="button"
                className="button button-primary jira-btn-sm"
                data-testid="jira-run-full-sweep-btn"
                onClick={() => {
                  runAutonomousOptimization()
                  if (cloudConfigured) void pushTopbarCloudRoom(true)
                  flashNotice(
                    en
                      ? 'Executed full autonomous sweep across all enabled rules, workloads & cloud sync!'
                      : 'Seluruh aturan otomasi, penyeimbangan beban kerja & sinkronisasi cloud berhasil dijalankan!',
                  )
                }}
              >
                <Zap size={14} /> {en ? 'Run Full Autonomous Sweep' : 'Jalankan Semua Otomasi'}
              </button>
            </div>

            <form
              className="jira-goal-compiler"
              onSubmit={e => {
                e.preventDefault()
                const cleanName = customRuleName.trim()
                if (!cleanName) return
                const code = `AUTO-0${state.rules.length + 1}`
                setState(prev => ({
                  ...prev,
                  rules: [
                    ...prev.rules,
                    {
                      id: uid('rule'),
                      code,
                      nameEn: cleanName,
                      nameId: cleanName,
                      triggerEn: customRuleTrigger,
                      triggerId: customRuleTrigger,
                      actionEn: customRuleAction,
                      actionId: customRuleAction,
                      enabled: true,
                      runs: 1,
                    },
                  ],
                  automationLogs: [`[${code}] Custom rule "${cleanName}" registered & armed.`, ...prev.automationLogs],
                }))
                setCustomRuleName('')
                flashNotice(en ? `Added custom automation rule ${code}!` : `Aturan otomasi baru ${code} diaktifkan!`)
              }}
            >
              <input
                value={customRuleName}
                onChange={e => setCustomRuleName(e.target.value)}
                placeholder={en ? 'New rule name (e.g. Auto-assign P0 incidents)…' : 'Nama aturan baru (mis. Eskalasi otomatis P0)…'}
                aria-label={en ? 'Custom automation rule name' : 'Nama aturan otomasi baru'}
              />
              <input
                value={customRuleTrigger}
                onChange={e => setCustomRuleTrigger(e.target.value)}
                aria-label="Rule WHEN trigger"
              />
              <input
                value={customRuleAction}
                onChange={e => setCustomRuleAction(e.target.value)}
                aria-label="Rule THEN action"
              />
              <button type="submit" className="button button-primary">
                <Plus size={15} /> {en ? 'Add Rule' : 'Tambah Aturan'}
              </button>
            </form>

            <div className="jira-rule-list">
              {state.rules.map(rule => (
                <div className="jira-rule-item" key={rule.id}>
                  <div style={{ maxWidth: 680 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="jira-type-badge jira-type-task">{rule.code}</span>
                      <strong>{en ? rule.nameEn : rule.nameId}</strong>
                      <span className="jira-kpi-badge">{rule.runs} runs</span>
                    </div>
                    <div className="jira-kpi-sub" style={{ marginTop: 4 }}>
                      {en ? rule.triggerEn : rule.triggerId} → <b>{en ? rule.actionEn : rule.actionId}</b>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={rule.enabled ? 'button button-primary' : 'button button-ghost'}
                    onClick={() =>
                      setState(prev => ({
                        ...prev,
                        rules: prev.rules.map(r => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)),
                      }))
                    }
                  >
                    {rule.enabled ? (en ? 'Enabled' : 'Aktif') : en ? 'Disabled' : 'Nonaktif'}
                  </button>
                </div>
              ))}
            </div>

            <div>
              <span className="jira-kpi-label">{en ? 'AUTOMATION EXECUTION AUDIT LOG' : 'LOG EKSEKUSI OTOMASI'}</span>
              <pre className="jira-code-pre" style={{ marginTop: 8 }}>
                {state.automationLogs.join('\n')}
              </pre>
            </div>
          </article>

          <Suspense fallback={<div className="jira-panel-card">{en ? 'Loading Cloud Sync & GitHub Bridge…' : 'Memuat Sinkronisasi Cloud & GitHub…'}</div>}>
            <JiraCloudSyncPanel
              en={en}
              activeProjectKey={activeProjectKey === 'ALL' ? 'DX' : activeProjectKey}
              issuesCount={state.issues.length}
              broadcastPeers={broadcastPeers}
              onGetSnapshot={() => state}
              onApplyRemoteSnapshot={handleApplyRemoteSnapshot}
              onImportGithubIssues={handleImportGithubIssues}
              onFlashNotice={flashNotice}
            />
          </Suspense>

          <article className="jira-panel-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <span className="jira-kpi-label">ATLASSIAN CLOUD REST API V3 · BULK ADF BRIDGE</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                  {en
                    ? 'Export Board to Real Atlassian Jira Cloud (/rest/api/3/issue/bulk)'
                    : 'Ekspor Board ke Atlassian Jira Cloud (/rest/api/3/issue/bulk)'}
                </h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    const json = JSON.stringify(buildBulkJiraAdfPayload(state.issues), null, 2)
                    void navigator.clipboard?.writeText(json)
                    flashNotice(en ? 'Copied Bulk Jira REST v3 ADF payload!' : 'Payload Bulk Jira REST v3 ADF disalin!')
                  }}
                >
                  <Copy size={15} /> {en ? 'Copy Bulk ADF JSON' : 'Salin JSON ADF'}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() =>
                    downloadFile(
                      'dreamex-jira-workspace.json',
                      JSON.stringify(state, null, 2),
                      'application/json;charset=utf-8',
                    )
                  }
                >
                  <Download size={15} /> {en ? 'Backup JSON' : 'Cadangkan JSON'}
                </button>
                <label className="button button-ghost" style={{ cursor: 'pointer' }}>
                  <Upload size={15} /> {en ? 'Import JSON' : 'Impor JSON'}
                  <input
                    type="file"
                    accept="application/json"
                    hidden
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(String(reader.result)) as JiraWorkspaceState
                          if (parsed && Array.isArray(parsed.issues)) {
                            setState(parsed)
                            flashNotice(en ? 'Workspace JSON imported cleanly!' : 'JSON Workspace berhasil diimpor!')
                          }
                        } catch {
                          flashNotice(en ? 'Invalid JSON backup file.' : 'Berkas JSON tidak valid.')
                        }
                      }
                      reader.readAsText(file)
                    }}
                  />
                </label>
              </div>
            </div>
            <pre className="jira-code-pre">{JSON.stringify(buildBulkJiraAdfPayload(state.issues), null, 2)}</pre>
          </article>
        </section>
      )}

      {/* ====================================================================
          VIEW 6B: ATLASSIAN JIRA CLOUD INLINE LIST VIEW (LAZY-LOADED)
         ==================================================================== */}
      {activeTab === 'list' && (
        <Suspense fallback={<div className="jira-panel-card">{en ? 'Loading Inline List View…' : 'Memuat Tampilan Daftar Inline…'}</div>}>
          <JiraListView
            en={en}
            issues={projectScopedIssues}
            teamMembers={TEAM_MEMBERS}
            onOpenIssue={issueId => setSelectedIssueId(issueId)}
            onInlineUpdate={(issueId, patch) => updateIssue(issueId, patch)}
            onQuickCreate={handleListQuickCreate}
          />
        </Suspense>
      )}

      {/* ====================================================================
          VIEW 7: JIRA WORK MANAGEMENT DELIVERY CALENDAR (LAZY-LOADED)
         ==================================================================== */}
      {activeTab === 'calendar' && (
        <Suspense fallback={<div className="jira-panel-card">{en ? 'Loading Delivery Calendar…' : 'Memuat Kalender Delivery…'}</div>}>
          <JiraCalendarView
            en={en}
            issues={projectScopedIssues}
            onOpenIssue={issueId => setSelectedIssueId(issueId)}
            onQuickCreateOnDate={handleCalendarQuickCreate}
          />
        </Suspense>
      )}

      {/* ====================================================================
          VIEW 8: JIRA FORMS BUILDER & PUBLIC INTAKE PORTAL (LAZY-LOADED)
         ==================================================================== */}
      {activeTab === 'forms' && (
        <Suspense fallback={<div className="jira-panel-card">{en ? 'Loading Forms Intake Portal…' : 'Memuat Portal Form…'}</div>}>
          <JiraFormsPortalView
            en={en}
            activeProjectKey={activeProjectKey === 'ALL' ? 'DX' : activeProjectKey}
            onSubmitIntake={handleFormsPortalSubmit}
          />
        </Suspense>
      )}

      {/* ====================================================================
          VIEW 9: VISUAL WORKFLOW DESIGNER & RBAC PROJECT SETTINGS (LAZY-LOADED)
         ==================================================================== */}
      {activeTab === 'workflow' && (
        <Suspense fallback={<div className="jira-panel-card">{en ? 'Loading Workflow & RBAC Studio…' : 'Memuat Studio Workflow & Izin…'}</div>}>
          <JiraWorkflowSettingsView
            en={en}
            issues={projectScopedIssues}
            wipLimits={state.wipLimits}
            requireSubtaskForDone={requireSubtaskForDone}
            onToggleRequireSubtask={() => setRequireSubtaskForDone(v => !v)}
            onUpdateWipLimit={(col, next) =>
              setState(prev => ({ ...prev, wipLimits: { ...prev.wipLimits, [col]: next } }))
            }
            onFilterByStatus={col => {
              setJqlQuery(`status = ${col}`)
              setActiveTab('board')
            }}
          />
        </Suspense>
      )}

            </div>
          </div>
        )
      })()}

      {/* ====================================================================
          JIRA ISSUE INSPECTOR DRAWER (CLICK ANY ISSUE)
         ==================================================================== */}
      {selectedIssue && (
        <div
          className="jira-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedIssue.key} details`}
          data-testid="jira-issue-drawer"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedIssueId(null)
          }}
        >
          <div className="jira-drawer">
            <div className="jira-drawer-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`jira-type-badge jira-type-${selectedIssue.type}`}>{selectedIssue.type}</span>
                <strong className="jira-issue-key" style={{ fontSize: 14 }}>
                  {selectedIssue.key}
                </strong>
                <span className="jira-epic-lozenge">{selectedIssue.epicKey}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  data-testid="jira-drawer-flag-btn"
                  className={selectedIssue.flagged ? 'button button-primary' : 'button button-ghost'}
                  onClick={() => updateIssue(selectedIssue.id, { flagged: !selectedIssue.flagged })}
                >
                  <Flag size={14} /> {selectedIssue.flagged ? (en ? 'Flagged' : 'Ditandai') : en ? 'Flag' : 'Tandai'}
                </button>
                <button
                  type="button"
                  data-testid="jira-drawer-vote-btn"
                  className="button button-ghost"
                  onClick={() => updateIssue(selectedIssue.id, { votes: (selectedIssue.votes ?? 0) + 1 })}
                >
                  <ThumbsUp size={14} /> {selectedIssue.votes ?? 0}
                </button>
                <button
                  type="button"
                  className={selectedIssue.watching ? 'button button-primary' : 'button button-ghost'}
                  onClick={() => updateIssue(selectedIssue.id, { watching: !selectedIssue.watching })}
                >
                  <Eye size={14} /> {selectedIssue.watching ? (en ? 'Watching' : 'Dipantau') : en ? 'Watch' : 'Pantau'}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setState(prev => {
                      const cloneKey = `${activeProjectKey}-${prev.nextSequence}`
                      const cloned: JiraIssue = {
                        ...selectedIssue,
                        id: uid('clone'),
                        key: cloneKey,
                        title: `[Clone] ${selectedIssue.title}`,
                        updatedAt: new Date().toISOString(),
                      }
                      return {
                        ...prev,
                        nextSequence: prev.nextSequence + 1,
                        issues: [cloned, ...prev.issues],
                      }
                    })
                    flashNotice(en ? `Cloned ${selectedIssue.key}!` : `Tiket ${selectedIssue.key} berhasil diduplikasi!`)
                  }}
                >
                  <Copy size={14} /> Clone
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    const adf = JSON.stringify(buildBulkJiraAdfPayload([selectedIssue]), null, 2)
                    void navigator.clipboard?.writeText(adf)
                    flashNotice(`${selectedIssue.key} ADF JSON copied!`)
                  }}
                >
                  <ClipboardCheck size={14} /> ADF
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setState(prev => ({
                      ...prev,
                      issues: prev.issues.filter(i => i.id !== selectedIssue.id),
                    }))
                    setSelectedIssueId(null)
                    flashNotice(`${selectedIssue.key} deleted.`)
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setSelectedIssueId(null)}
                  aria-label={en ? 'Close issue drawer' : 'Tutup detail tiket'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="jira-field">
              <label htmlFor="drawer-issue-title">{en ? 'Summary' : 'Judul Tiket'}</label>
              <input
                id="drawer-issue-title"
                value={selectedIssue.title}
                onChange={e => updateIssue(selectedIssue.id, { title: e.target.value })}
              />
            </div>

            <div className="jira-field-grid">
              <div className="jira-field">
                <label htmlFor="drawer-issue-status">{en ? 'Workflow Status' : 'Status Workflow'}</label>
                <select
                  id="drawer-issue-status"
                  value={selectedIssue.status}
                  onChange={e => transitionIssue(selectedIssue.id, e.target.value as JiraStatusId)}
                >
                  {COLUMNS.map(c => (
                    <option key={c.id} value={c.id}>
                      {en ? c.en : c.idLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-priority">{en ? 'Priority' : 'Prioritas'}</label>
                <select
                  id="drawer-issue-priority"
                  value={selectedIssue.priority}
                  onChange={e => updateIssue(selectedIssue.id, { priority: e.target.value as JiraPriorityLevel })}
                >
                  {(['Highest', 'High', 'Medium', 'Low'] as const).map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-assignee">Assignee</label>
                <select
                  id="drawer-issue-assignee"
                  value={selectedIssue.assignee}
                  onChange={e => updateIssue(selectedIssue.id, { assignee: e.target.value })}
                >
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-points">Story Points</label>
                <select
                  id="drawer-issue-points"
                  value={selectedIssue.points}
                  onChange={e => updateIssue(selectedIssue.id, { points: Number(e.target.value) })}
                >
                  {FIBONACCI_POINTS.map(pt => (
                    <option key={pt} value={pt}>
                      {pt} SP
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-epic">Epic Link</label>
                <select
                  id="drawer-issue-epic"
                  value={selectedIssue.epicKey}
                  onChange={e => updateIssue(selectedIssue.id, { epicKey: e.target.value })}
                >
                  {epicsList.map(ep => (
                    <option key={ep.key} value={ep.key}>
                      {ep.key} · {en ? ep.nameEn : ep.nameId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-sprint">Sprint</label>
                <select
                  id="drawer-issue-sprint"
                  value={selectedIssue.sprintId}
                  onChange={e => updateIssue(selectedIssue.id, { sprintId: e.target.value as JiraSprintId })}
                >
                  <option value="sprint-24">Sprint 24 (Active)</option>
                  <option value="sprint-25">Sprint 25 (Planned)</option>
                  <option value="backlog">Product Backlog</option>
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-component">{en ? 'Component' : 'Komponen'}</label>
                <select
                  id="drawer-issue-component"
                  value={selectedIssue.component ?? 'Ledger Core'}
                  onChange={e => updateIssue(selectedIssue.id, { component: e.target.value })}
                >
                  {JIRA_COMPONENTS.map(comp => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="drawer-issue-version">Fix Version</label>
                <select
                  id="drawer-issue-version"
                  value={selectedIssue.fixVersion ?? 'v7.1.0'}
                  onChange={e => updateIssue(selectedIssue.id, { fixVersion: e.target.value })}
                >
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jira Time Tracking & Worklog Bar */}
            {(() => {
              const est = selectedIssue.estHours ?? selectedIssue.points * 3
              const logged = selectedIssue.loggedHours ?? (selectedIssue.status === 'done' ? est : Math.round(est * 0.4))
              const pct = Math.min(100, Math.round((logged / Math.max(1, est)) * 100))
              return (
                <div className="jira-rule-item">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span>
                        <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                        <b>{en ? 'Time Tracking (Worklog):' : 'Pelacakan Waktu Kerja:'}</b> {logged}h logged / {est}h est
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="jira-worklog-bar">
                      <span className="jira-worklog-logged" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => updateIssue(selectedIssue.id, { estHours: est, loggedHours: logged + 2 })}
                  >
                    + Log 2h
                  </button>
                </div>
              )
            })()}

            {/* Issue Links (Blocks / Is Blocked By / Relates To / Duplicates) */}
            <div className="jira-field">
              <label>
                <Link2 size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                {en ? 'Linked Issues' : 'Tautan Antar-Tiket'} ({selectedIssue.linkedIssues?.length ?? 0})
              </label>
              {(selectedIssue.linkedIssues?.length ?? 0) > 0 && (
                <div className="jira-subtask-list">
                  {selectedIssue.linkedIssues?.map((lnk, idx) => {
                    const targetObj = state.issues.find(i => i.key === lnk.key)
                    return (
                      <div className="jira-subtask-row" key={`${lnk.kind}-${lnk.key}-${idx}`}>
                        <span>
                          <span className="jira-kpi-badge" style={{ marginRight: 6 }}>
                            {lnk.kind.replace('_', ' ').toUpperCase()}
                          </span>
                          <button
                            type="button"
                            className="jira-card-title-btn"
                            onClick={() => {
                              if (targetObj) setSelectedIssueId(targetObj.id)
                            }}
                          >
                            {lnk.key} {targetObj ? `· ${targetObj.title.slice(0, 38)}` : ''}
                          </button>
                        </span>
                        <button
                          type="button"
                          className="jira-chip-btn"
                          onClick={() =>
                            updateIssue(selectedIssue.id, {
                              linkedIssues: (selectedIssue.linkedIssues ?? []).filter((_, i) => i !== idx),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <select
                  className="jira-select"
                  value={linkKind}
                  onChange={e => setLinkKind(e.target.value as typeof linkKind)}
                  aria-label="Issue link type"
                >
                  <option value="blocks">blocks</option>
                  <option value="blocked_by">is blocked by</option>
                  <option value="relates_to">relates to</option>
                  <option value="duplicates">duplicates</option>
                </select>
                <select
                  className="jira-select"
                  value={linkTargetKey}
                  onChange={e => setLinkTargetKey(e.target.value)}
                  aria-label="Target issue key"
                >
                  {state.issues
                    .filter(i => i.id !== selectedIssue.id)
                    .map(i => (
                      <option key={i.id} value={i.key}>
                        {i.key} · {i.title.slice(0, 32)}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    const current = selectedIssue.linkedIssues ?? []
                    if (current.some(l => l.kind === linkKind && l.key === linkTargetKey)) return
                    updateIssue(selectedIssue.id, {
                      linkedIssues: [...current, { kind: linkKind, key: linkTargetKey }],
                      ...(linkKind === 'blocked_by' ? { blockedByKey: linkTargetKey } : {}),
                    })
                    flashNotice(`Linked ${selectedIssue.key} (${linkKind.replace('_', ' ')}) ${linkTargetKey}`)
                  }}
                >
                  + {en ? 'Link Issue' : 'Tautkan'}
                </button>
              </div>
            </div>

            {/* Time Tracking & Quick Worklog (+1h / +2h / +4h) */}
            <div className="jira-field" data-testid="jira-time-tracking-box">
              <label>
                <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                {en
                  ? `Time Tracking (${selectedIssue.loggedHours ?? 0}h logged / ${selectedIssue.estHours ?? selectedIssue.points * 2}h estimated)`
                  : `Pelacakan Waktu (${selectedIssue.loggedHours ?? 0}j tercatat / ${selectedIssue.estHours ?? selectedIssue.points * 2}j estimasi)`}
              </label>
              <div className="jira-progress-track" aria-hidden="true" style={{ marginBottom: 8 }}>
                <span
                  style={{
                    width: `${Math.min(100, Math.round(((selectedIssue.loggedHours ?? 0) / Math.max(1, selectedIssue.estHours ?? selectedIssue.points * 2)) * 100))}%`,
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[1, 2, 4].map(hrs => (
                  <button
                    key={hrs}
                    type="button"
                    className="jira-chip-btn"
                    data-testid={`jira-log-work-${hrs}h`}
                    onClick={() => {
                      const nextLogged = (selectedIssue.loggedHours ?? 0) + hrs
                      updateIssue(selectedIssue.id, {
                        loggedHours: nextLogged,
                        estHours: selectedIssue.estHours ?? selectedIssue.points * 2,
                        comments: [
                          {
                            id: uid('wl'),
                            author: selectedIssue.assignee,
                            body: `[Worklog] Logged +${hrs}h (total ${nextLogged}h).`,
                            createdAt: nowStamp(),
                            kind: 'activity',
                          },
                          ...selectedIssue.comments,
                        ],
                      })
                      flashNotice(en ? `Logged +${hrs}h on ${selectedIssue.key}!` : `Mencatat +${hrs} jam kerja pada ${selectedIssue.key}!`)
                    }}
                  >
                    + {en ? `Log ${hrs}h` : `Catat ${hrs}j`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cross-Suite OS Integration Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link className="jira-chip-btn" to="/qa-studio">
                {en ? 'Open in QA Playwright Studio →' : 'Buka di Studio QA Playwright →'}
              </Link>
              <Link className="jira-chip-btn" to="/ba-hub">
                {en ? 'Open in BA Gherkin & RTM →' : 'Buka di Studio BA Gherkin →'}
              </Link>
              <Link className="jira-chip-btn" to="/api-playground">
                {en ? 'Inspect API Contract →' : 'Inspeksi Kontrak API →'}
              </Link>
            </div>

            {/* DevOps Git Branch Helper */}
            <div className="jira-rule-item">
              <div style={{ fontSize: 12 }}>
                <GitBranch size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                <code>
                  git checkout -b feat/{selectedIssue.key.toLowerCase()}-
                  {selectedIssue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}
                </code>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  const cmd = `git checkout -b feat/${selectedIssue.key.toLowerCase()}-${selectedIssue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}`
                  void navigator.clipboard?.writeText(cmd)
                  flashNotice(en ? 'Copied Git branch command!' : 'Perintah Git branch disalin!')
                }}
              >
                <Copy size={13} /> Copy Git
              </button>
            </div>

            {/* Description & AI Copilot */}
            <div className="jira-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <label htmlFor="drawer-issue-desc">
                  {en ? 'Description & Gherkin Acceptance Criteria' : 'Deskripsi & Kriteria Gherkin BDD'}
                </label>
                <button
                  type="button"
                  className="button button-primary"
                  data-testid="jira-ai-synthesize-btn"
                  style={{ minHeight: 30, padding: '4px 10px', fontSize: 11.5 }}
                  onClick={() => synthesizeAiGherkinAndSubtasks(selectedIssue)}
                >
                  <Sparkles size={13} /> {en ? 'AI Generate Gherkin & Subtasks' : 'AI Buat Gherkin & Subtask'}
                </button>
              </div>
              <textarea
                id="drawer-issue-desc"
                value={selectedIssue.description}
                onChange={e => updateIssue(selectedIssue.id, { description: e.target.value })}
              />
            </div>

            {/* Labels */}
            <div className="jira-field">
              <label>{en ? 'Labels' : 'Label'}</label>
              <div className="jira-card-tags">
                {selectedIssue.labels.map(lbl => (
                  <button
                    key={lbl}
                    type="button"
                    className="jira-chip-btn"
                    onClick={() =>
                      updateIssue(selectedIssue.id, { labels: selectedIssue.labels.filter(x => x !== lbl) })
                    }
                  >
                    #{lbl} ×
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  value={labelDraft}
                  onChange={e => setLabelDraft(e.target.value)}
                  placeholder={en ? 'Add label (e.g. security, api)…' : 'Tambah label…'}
                />
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    const clean = labelDraft.trim().toLowerCase().replace(/\s+/g, '-')
                    if (!clean) return
                    if (!selectedIssue.labels.includes(clean)) {
                      updateIssue(selectedIssue.id, { labels: [...selectedIssue.labels, clean] })
                    }
                    setLabelDraft('')
                  }}
                >
                  + Label
                </button>
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="jira-field">
              <label>
                {en ? 'Subtasks' : 'Subtask'} ({selectedIssue.subtasks.filter(s => s.done).length}/
                {selectedIssue.subtasks.length})
              </label>
              <div className="jira-subtask-list">
                {selectedIssue.subtasks.map(st => (
                  <div className="jira-subtask-row" key={st.id}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', font: 'inherit' }}>
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() =>
                          updateIssue(selectedIssue.id, {
                            subtasks: selectedIssue.subtasks.map(x => (x.id === st.id ? { ...x, done: !x.done } : x)),
                          })
                        }
                      />
                      <span style={{ textDecoration: st.done ? 'line-through' : 'none', opacity: st.done ? 0.65 : 1 }}>
                        {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="jira-chip-btn"
                      onClick={() =>
                        updateIssue(selectedIssue.id, {
                          subtasks: selectedIssue.subtasks.filter(x => x.id !== st.id),
                        })
                      }
                      aria-label={`Delete subtask ${st.title}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  value={subtaskDraft}
                  onChange={e => setSubtaskDraft(e.target.value)}
                  placeholder={en ? 'Add child subtask…' : 'Tambah subtask…'}
                />
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    const clean = subtaskDraft.trim()
                    if (!clean) return
                    updateIssue(selectedIssue.id, {
                      subtasks: [...selectedIssue.subtasks, { id: uid('st'), title: clean, done: false }],
                    })
                    setSubtaskDraft('')
                  }}
                >
                  + Subtask
                </button>
              </div>
            </div>

            {/* Comments & Activity Stream with @mention & QA Evidence Chips */}
            <div className="jira-field">
              <label>{en ? 'Comments, @mentions & QA Evidence' : 'Komentar, @mention & Bukti QA'}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                {TEAM_MEMBERS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="jira-chip-btn"
                    onClick={() => setCommentDraft(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${m.id} `)}
                  >
                    @{m.id}
                  </button>
                ))}
                <button
                  type="button"
                  className="jira-chip-btn"
                  data-testid="jira-attach-qa-evidence-btn"
                  onClick={() =>
                    setCommentDraft(prev =>
                      `${prev}${prev ? ' ' : ''}[QA-Evidence: playwright-trace-${selectedIssue.key.toLowerCase()}.zip · 0ms CLS · PASS]`,
                    )
                  }
                >
                  + {en ? 'Attach QA Trace' : 'Lampirkan Trace QA'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  data-testid="jira-comment-input"
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder={en ? 'Write an engineering update or QA note…' : 'Tulis komentar atau catatan QA…'}
                />
                <button
                  type="button"
                  className="button button-primary"
                  data-testid="jira-post-comment-btn"
                  onClick={() => {
                    const clean = commentDraft.trim()
                    if (!clean) return
                    const nextComment: JiraComment = {
                      id: uid('cm'),
                      author: selectedIssue.assignee,
                      body: clean,
                      createdAt: nowStamp(),
                      kind: 'comment',
                    }
                    updateIssue(selectedIssue.id, {
                      comments: [nextComment, ...selectedIssue.comments],
                    })
                    setCommentDraft('')
                  }}
                >
                  {en ? 'Post' : 'Kirim'}
                </button>
              </div>
              <div className="jira-comment-list" style={{ marginTop: 8 }}>
                {selectedIssue.comments.map(cm => (
                  <div className="jira-comment-item" key={cm.id}>
                    <div className="jira-comment-meta">
                      <span>
                        {cm.author} · {cm.kind.toUpperCase()}
                      </span>
                      <span>{cm.createdAt}</span>
                    </div>
                    <div>{cm.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          CREATE ISSUE MODAL
         ==================================================================== */}
      {createOpen && (
        <div
          className="jira-modal-backdrop is-centered"
          role="dialog"
          aria-modal="true"
          aria-label={en ? 'Create Jira Issue' : 'Buat Tiket Jira'}
          data-testid="jira-create-modal"
          onClick={e => {
            if (e.target === e.currentTarget) setCreateOpen(false)
          }}
        >
          <form className="jira-create-dialog" onSubmit={handleCreateIssue}>
            <div className="jira-drawer-head">
              <strong>{en ? 'Create Issue · DreamEx (DX)' : 'Buat Tiket Baru · DreamEx (DX)'}</strong>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setCreateOpen(false)}
                aria-label={en ? 'Close create dialog' : 'Tutup dialog'}
              >
                <X size={16} />
              </button>
            </div>

            <div className="jira-field-grid">
              <div className="jira-field">
                <label htmlFor="create-type">{en ? 'Issue Type' : 'Tipe Tiket'}</label>
                <select
                  id="create-type"
                  value={newType}
                  onChange={e => setNewType(e.target.value as JiraIssueKind)}
                >
                  <option value="story">Story</option>
                  <option value="bug">Bug</option>
                  <option value="task">Task</option>
                  <option value="security">Security</option>
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="create-priority">{en ? 'Priority' : 'Prioritas'}</label>
                <select
                  id="create-priority"
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as JiraPriorityLevel)}
                >
                  {(['Highest', 'High', 'Medium', 'Low'] as const).map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="jira-field">
              <label htmlFor="create-summary">{en ? 'Summary *' : 'Ringkasan / Judul *'}</label>
              <input
                id="create-summary"
                data-testid="jira-create-summary-input"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={
                  en
                    ? 'e.g. Enforce rate-limiting & idempotency on settlement webhook'
                    : 'mis. Terapkan rate-limit & idempotency pada webhook settlement'
                }
              />
            </div>

            <div className="jira-field">
              <label htmlFor="create-desc">{en ? 'Description / Acceptance Criteria' : 'Deskripsi / Kriteria Penerimaan'}</label>
              <textarea
                id="create-desc"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Given / When / Then…"
              />
            </div>

            <div className="jira-field-grid">
              <div className="jira-field">
                <label htmlFor="create-assignee">Assignee</label>
                <select id="create-assignee" value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="create-points">Story Points</label>
                <select id="create-points" value={newPoints} onChange={e => setNewPoints(Number(e.target.value))}>
                  {FIBONACCI_POINTS.map(pt => (
                    <option key={pt} value={pt}>
                      {pt} SP
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="create-epic">Epic Link</label>
                <select id="create-epic" value={newEpic} onChange={e => setNewEpic(e.target.value)}>
                  {EPICS.map(ep => (
                    <option key={ep.key} value={ep.key}>
                      {ep.key} · {en ? ep.nameEn : ep.nameId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-field">
                <label htmlFor="create-sprint">Sprint</label>
                <select
                  id="create-sprint"
                  value={newSprint}
                  onChange={e => setNewSprint(e.target.value as JiraSprintId)}
                >
                  <option value="sprint-24">Sprint 24 (Active)</option>
                  <option value="sprint-25">Sprint 25 (Planned)</option>
                  <option value="backlog">Product Backlog</option>
                </select>
              </div>
            </div>

            <div className="jira-field">
              <label htmlFor="create-labels">{en ? 'Labels (comma-separated)' : 'Label (pisahkan dengan koma)'}</label>
              <input id="create-labels" value={newLabels} onChange={e => setNewLabels(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button type="button" className="button button-ghost" onClick={() => setCreateOpen(false)}>
                {en ? 'Cancel' : 'Batal'}
              </button>
              <button type="submit" className="button button-primary" data-testid="jira-submit-create-btn">
                <Plus size={15} /> {en ? 'Create Issue' : 'Simpan Tiket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================================
          COMPLETE SPRINT MODAL
         ==================================================================== */}
      {completeSprintOpen && (
        <div
          className="jira-modal-backdrop is-centered"
          role="dialog"
          aria-modal="true"
          aria-label={en ? 'Complete Active Sprint' : 'Selesaikan Sprint Aktif'}
          data-testid="jira-complete-sprint-modal"
          onClick={e => {
            if (e.target === e.currentTarget) setCompleteSprintOpen(false)
          }}
        >
          <div className="jira-create-dialog">
            <div className="jira-drawer-head">
              <strong>
                {en ? `Complete ${state.activeSprintName}` : `Selesaikan ${state.activeSprintName}`}
              </strong>
              <button type="button" className="button button-ghost" onClick={() => setCompleteSprintOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
              {en
                ? `Completed Story Points (${metrics.doneSp} SP) will be recorded into Team Velocity History, and any incomplete issues (${metrics.totalSp - metrics.doneSp} SP) will automatically roll forward into the next active sprint.`
                : `Story Points selesai (${metrics.doneSp} SP) akan dicatat ke grafik Velocity Tim, dan tiket yang belum selesai (${metrics.totalSp - metrics.doneSp} SP) otomatis dipindahkan ke sprint aktif berikutnya.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="button button-ghost" onClick={() => setCompleteSprintOpen(false)}>
                {en ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                className="button button-primary"
                data-testid="jira-confirm-complete-sprint-btn"
                onClick={handleCompleteSprint}
              >
                <CheckCircle2 size={15} /> {en ? 'Complete & Roll Forward' : 'Selesaikan Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          JIRA KEYBOARD SHORTCUTS MODAL (?)
         ==================================================================== */}
      {shortcutsOpen && (
        <div
          className="jira-modal-backdrop is-centered"
          role="dialog"
          aria-modal="true"
          aria-label={en ? 'Jira Keyboard Shortcuts' : 'Pintasan Keyboard Jira'}
          data-testid="jira-shortcuts-modal"
          onClick={e => {
            if (e.target === e.currentTarget) setShortcutsOpen(false)
          }}
        >
          <div className="jira-create-dialog">
            <div className="jira-drawer-head">
              <strong>{en ? 'Jira Cloud Keyboard Shortcuts' : 'Pintasan Keyboard Jira Cloud'}</strong>
              <button type="button" className="button button-ghost" onClick={() => setShortcutsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="jira-shortcut-grid">
              <div className="jira-shortcut-item">
                <span>{en ? 'Create new issue' : 'Buat tiket baru'}</span>
                <kbd className="jira-shortcut-kbd">C</kbd>
              </div>
              <div className="jira-shortcut-item">
                <span>{en ? 'Toggle My Issues filter' : 'Filter tiket saya'}</span>
                <kbd className="jira-shortcut-kbd">A</kbd>
              </div>
              <div className="jira-shortcut-item">
                <span>{en ? 'Open Keyboard Shortcuts' : 'Buka daftar pintasan'}</span>
                <kbd className="jira-shortcut-kbd">?</kbd>
              </div>
              <div className="jira-shortcut-item">
                <span>{en ? 'Close Drawer / Modal' : 'Tutup panel / modal'}</span>
                <kbd className="jira-shortcut-kbd">Esc</kbd>
              </div>
              <div className="jira-shortcut-item">
                <span>{en ? 'Global OS Command Palette' : 'Command Palette OS Global'}</span>
                <kbd className="jira-shortcut-kbd">Ctrl+K</kbd>
              </div>
              <div className="jira-shortcut-item">
                <span>{en ? 'Focus JQL Search' : 'Fokus ke kueri JQL'}</span>
                <button
                  type="button"
                  className="jira-chip-btn"
                  onClick={() => {
                    setShortcutsOpen(false)
                    setActiveTab('board')
                    setTimeout(() => jqlInputRef.current?.focus(), 40)
                  }}
                >
                  Focus JQL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
