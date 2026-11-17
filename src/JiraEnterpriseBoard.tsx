import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Eye,
  Filter,
  FolderKanban,
  GitBranch,
  HelpCircle,
  Kanban,
  Layers3,
  Lightbulb,
  ListChecks,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { useLanguage } from './i18n'
import { generateWithByokAi, loadSessionAiConfig } from './aiClient'
import { useProjectContextBus } from './projectContextBus'
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

export type JiraStatusId = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'
export type JiraIssueKind = 'story' | 'bug' | 'task' | 'security'
export type JiraPriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low'
export type JiraSprintId = 'sprint-24' | 'sprint-25' | 'backlog'
export type JiraViewTab =
  | 'board'
  | 'autopilot'
  | 'backlog'
  | 'roadmap'
  | 'discovery'
  | 'jsm'
  | 'wiki'
  | 'releases'
  | 'navigator'
  | 'reports'
  | 'automation'
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
    ],
  }
}

function loadState(): JiraWorkspaceState {
  if (typeof window === 'undefined') return createDefaultState()
  try {
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
  const [autopilotEnabled, setAutopilotEnabled] = useState(false)
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

  // Persist to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* Safe fallback if private browsing quota is restricted */
    }
  }, [state])

  // Keyboard shortcuts: 'c' Create, '/' Focus JQL, '?' Shortcuts modal, 'Escape' closes modals/drawer
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
      if (isInput || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setCreateOpen(true)
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
  }, [createOpen, completeSprintOpen, selectedIssueId, shortcutsOpen])

  const flashNotice = useCallback((msg: string) => {
    setNotice(msg)
  }, [])

  // Transition an issue + execute active Jira Automation Rules!
  const transitionIssue = useCallback(
    (issueId: string, nextStatus: JiraStatusId) => {
      setState(prev => {
        const target = prev.issues.find(i => i.id === issueId)
        if (!target || target.status === nextStatus) return prev

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

          if (nextStatus === 'done' && ruleDone) {
            const openCount = nextSubtasks.filter(st => !st.done).length
            nextSubtasks = nextSubtasks.map(st => ({ ...st, done: true }))
            extraLogs.push(`[AUTO-03] ${item.key} transitioned to Done -> ${openCount} open subtask(s) auto-closed.`)
            updatedRules = updatedRules.map(r => (r.id === 'rule-done-close-subtasks' ? { ...r, runs: r.runs + 1 } : r))
          }

          return {
            ...item,
            status: nextStatus,
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
    [],
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

  // Filtered issues for Board & Navigator
  const filteredIssues = useMemo(() => {
    return state.issues.filter(issue => {
      if (assigneeFilter !== 'ALL' && issue.assignee !== assigneeFilter) return false
      if (quickFilter === 'bugs' && issue.type !== 'bug' && issue.type !== 'security') return false
      if (quickFilter === 'blocked' && issue.status !== 'blocked' && !issue.blockedByKey) return false
      if (quickFilter === 'subtasks' && issue.subtasks.length === 0) return false
      return evaluateJqlMatch(issue, jqlQuery)
    })
  }, [state.issues, assigneeFilter, quickFilter, jqlQuery])

  const activeSprintIssues = useMemo(
    () => filteredIssues.filter(i => i.sprintId === 'sprint-24'),
    [filteredIssues],
  )

  // KPI & Monte Carlo calculations
  const metrics = useMemo(() => {
    const sprintAll = state.issues.filter(i => i.sprintId === 'sprint-24')
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

    const remainingTotalSp = state.issues.filter(i => i.status !== 'done').reduce((acc, i) => acc + i.points, 0)
    // Deterministic 10,000-trial style percentile estimation from historical velocity distribution
    const velocities = state.velocityHistory.map(v => v.completed)
    const minV = Math.max(12, Math.min(...velocities, avgVelocity - 5))
    const maxV = Math.max(...velocities, avgVelocity + 5)
    const p50Sprints = Math.max(1, Number((remainingTotalSp / Math.max(1, avgVelocity)).toFixed(1)))
    const p85Vel = minV + (maxV - minV) * 0.28
    const p95Vel = minV + (maxV - minV) * 0.14
    const p85Sprints = Math.max(1, Number((remainingTotalSp / Math.max(1, p85Vel)).toFixed(1)))
    const p95Sprints = Math.max(1, Number((remainingTotalSp / Math.max(1, p95Vel)).toFixed(1)))

    const allSubtasks = state.issues.flatMap(i => i.subtasks)
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
  }, [state])

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

  const visibleColumns = useMemo(
    () => (mobileCol === 'all' ? COLUMNS : COLUMNS.filter(c => c.id === mobileCol)),
    [mobileCol],
  )

  return (
    <main id="main-content" className="container jira-os-page" data-testid="jira-enterprise-page">
      {/* Hero Header */}
      <header className="jira-hero">
        <div className="jira-hero-top">
          <div className="jira-hero-copy">
            <div className="jira-kicker-row">
              <span className="jira-kicker">
                <Kanban size={13} /> DREAMEX JIRA CLOUD ENTERPRISE · v8.0
              </span>
              <span className="jira-sprint-pill" data-testid="jira-active-sprint-name">
                {state.activeSprintName}
              </span>
            </div>
            <h1>
              {en ? (
                <>
                  Enterprise Jira Board,{' '}
                  <span>Backlog, Gantt Roadmap & JQL Cloud.</span>
                </>
              ) : (
                <>
                  Board Jira Enterprise,{' '}
                  <span>Backlog, Roadmap Gantt & Cloud JQL.</span>
                </>
              )}
            </h1>
            <p>
              {en
                ? 'Plan sprints, drag issues across WIP-guarded Kanban swimlanes, run executable JQL queries, track Epic dependencies & Burndown velocity, automate QA subtasks, and export Atlassian Jira REST v3 ADF or CSV.'
                : 'Rencanakan sprint, geser tiket di Kanban swimlane berbatas WIP, jalankan kueri JQL langsung, pantau dependensi Epic & grafik Burndown, otomasi subtask QA, dan ekspor ke Atlassian Jira REST v3 ADF atau CSV.'}
            </p>
          </div>
          <div className="jira-hero-actions">
            <button
              type="button"
              className="button button-primary"
              data-testid="jira-open-create-btn"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} /> {en ? 'Create Issue' : 'Buat Tiket'}{' '}
              <span className="jira-shortcut-kbd" aria-hidden="true">C</span>
            </button>
            <button
              type="button"
              className="button button-ghost"
              data-testid="jira-complete-sprint-btn"
              onClick={() => setCompleteSprintOpen(true)}
            >
              <CheckCircle2 size={15} /> {en ? 'Complete Sprint' : 'Selesaikan Sprint'}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => downloadFile('dreamex-jira-export.csv', buildJiraCsv(state.issues), 'text/csv;charset=utf-8')}
            >
              <Download size={15} /> Jira CSV
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                setState(createDefaultState())
                setSelectedBulkIds([])
                flashNotice(en ? 'Workspace reset to clean enterprise baseline.' : 'Workspace dikembalikan ke data awal.')
              }}
            >
              <RotateCcw size={15} /> {en ? 'Reset Demo' : 'Reset Data'}
            </button>
            <button
              type="button"
              className="button button-ghost"
              data-testid="jira-shortcuts-btn"
              onClick={() => setShortcutsOpen(true)}
            >
              <HelpCircle size={15} /> {en ? 'Shortcuts (?)' : 'Pintasan (?)'}
            </button>
          </div>
        </div>

        {/* Multi-Project Switcher Bar (Atlassian Cloud Projects) */}
        <div className="jira-project-bar" data-testid="jira-project-switcher">
          <div className="jira-project-pills" role="group" aria-label={en ? 'Switch Jira Project' : 'Pilih Proyek Jira'}>
            <span className="jira-kpi-label" style={{ marginRight: 4 }}>
              <FolderKanban size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {en ? 'PROJECTS:' : 'PROYEK:'}
            </span>
            {projects.map(proj => (
              <button
                key={proj.key}
                type="button"
                data-testid={`jira-project-pill-${proj.key}`}
                className={activeProjectKey === proj.key ? 'jira-project-pill is-active' : 'jira-project-pill'}
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
                <span>{en ? proj.nameEn : proj.nameId}</span>
              </button>
            ))}
            <button
              type="button"
              className="jira-chip-btn"
              onClick={() => setShowNewProjectForm(v => !v)}
            >
              + {en ? 'New Project' : 'Proyek Baru'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="jira-chip-btn"
              onClick={() => setCardDensity(d => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            >
              {cardDensity === 'comfortable'
                ? en
                  ? 'Density: Comfortable'
                  : 'Tampilan: Nyaman'
                : en
                  ? 'Density: Compact'
                  : 'Tampilan: Ringkas'}
            </button>
          </div>
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

      {/* Real-Time Agile KPI Strip */}
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

      {/* Autonomous AI Forward-Thinking Command Strip */}
      <section
        className="jira-autopilot-strip"
        data-testid="jira-autopilot-strip"
        aria-label={en ? 'Autonomous AI Sprint Autopilot' : 'AI Autopilot Sprint Otonom'}
      >
        <div className="jira-autopilot-main">
          <span className={autopilotEnabled ? 'jira-autopilot-pulse is-live' : 'jira-autopilot-pulse'} />
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 13.5 }}>
                <BrainCircuit size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                {en
                  ? `AI Forward-Thinking Brain · Confidence ${horizonReport.confidenceScore}%`
                  : `Otak Prediktif AI Otonom · Keyakinan ${horizonReport.confidenceScore}%`}
              </strong>
              <span className={horizonReport.recommendations.length > 0 ? 'jira-kpi-badge is-warn' : 'jira-kpi-badge'}>
                {horizonReport.recommendations.length === 0
                  ? en
                    ? 'OPTIMAL HORIZON'
                    : 'HORIZON OPTIMAL'
                  : en
                    ? `${horizonReport.recommendations.length} PROACTIVE INSIGHTS`
                    : `${horizonReport.recommendations.length} PREDIKSI PROAKTIF`}
              </span>
            </div>
            <div className="jira-kpi-sub" style={{ marginTop: 3 }}>
              {horizonReport.recommendations[0]
                ? en
                  ? `Next Action: ${horizonReport.recommendations[0].titleEn}`
                  : `Saran Otomatis Berikutnya: ${horizonReport.recommendations[0].titleId}`
                : en
                  ? 'Sprint 24 & Sprint 25 capacity, SLA windows, and engineer workloads are balanced.'
                  : 'Kapasitas Sprint 24 & 25, target SLA, dan beban kerja engineer sudah seimbang otomatis.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="button button-primary"
            data-testid="jira-auto-optimize-btn"
            onClick={runAutonomousOptimization}
          >
            <Zap size={15} /> {en ? 'Auto-Optimize & Plan Ahead' : 'Optimasi & Rencanakan Otomatis'}
          </button>
          <button
            type="button"
            className={autopilotEnabled ? 'button button-primary' : 'button button-ghost'}
            data-testid="jira-autopilot-toggle"
            aria-pressed={autopilotEnabled}
            onClick={() => {
              const next = !autopilotEnabled
              setAutopilotEnabled(next)
              if (next) runAutonomousOptimization()
            }}
          >
            <Bot size={15} />{' '}
            {autopilotEnabled
              ? en
                ? 'Autopilot: ON (Self-Driving)'
                : 'Autopilot: AKTIF'
              : en
                ? 'Enable Self-Driving Mode'
                : 'Aktifkan Mode Otonom'}
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setActiveTab('autopilot')}
          >
            <Sparkles size={14} /> {en ? 'Open AI Brain' : 'Buka Ruang AI'}
          </button>
        </div>
      </section>

      {/* 11-View Full Atlassian Cloud Workspace Switcher */}
      <div className="jira-tabs-bar" role="tablist" aria-label={en ? 'Jira workspace views' : 'Tampilan workspace Jira'}>
        {(
          [
            { id: 'board', icon: Kanban, en: 'Sprint Board', idLabel: 'Board Sprint', count: activeSprintIssues.length },
            { id: 'autopilot', icon: BrainCircuit, en: 'AI Autopilot', idLabel: 'AI Autopilot', count: horizonReport.recommendations.length },
            { id: 'backlog', icon: Layers3, en: 'Backlog & Poker', idLabel: 'Backlog & Poker', count: state.issues.length },
            { id: 'roadmap', icon: CalendarRange, en: 'Epic Gantt', idLabel: 'Roadmap Gantt', count: epicsList.length },
            { id: 'discovery', icon: Lightbulb, en: 'Discovery RICE', idLabel: 'Ide & RICE', count: ideas.length },
            { id: 'jsm', icon: ShieldAlert, en: 'Service Desk & CAB', idLabel: 'Insiden & CAB', count: jsmTickets.length },
            { id: 'wiki', icon: BookOpen, en: 'Confluence Specs', idLabel: 'Dokumen PRD/ADR', count: wikiDocs.length },
            { id: 'releases', icon: PackageCheck, en: 'Releases', idLabel: 'Versi Rilis', count: releases.length },
            { id: 'navigator', icon: ListChecks, en: 'JQL & Bulk', idLabel: 'JQL & Massal', count: filteredIssues.length },
            { id: 'reports', icon: BarChart3, en: 'CFD & Reports', idLabel: 'CFD & Laporan', count: 6 },
            { id: 'automation', icon: Bot, en: 'Automation & API', idLabel: 'Otomasi & API', count: state.rules.length },
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
          </div>

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
                                  className={cardDensity === 'compact' ? 'jira-card is-compact' : 'jira-card'}
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
            <div>
              <span className="jira-kpi-label">{en ? 'NO-CODE JIRA AUTOMATION RULES' : 'ATURAN OTOMASI JIRA TANPA KODE'}</span>
              <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
                {en ? 'Live Event-Driven Workflow Rules & Custom Builder' : 'Aturan Workflow Otomatis & Pembuat Aturan Baru'}
              </h2>
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

            {/* Comments & Activity Stream */}
            <div className="jira-field">
              <label>{en ? 'Comments & Audit Activity' : 'Komentar & Riwayat Aktivitas'}</label>
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
