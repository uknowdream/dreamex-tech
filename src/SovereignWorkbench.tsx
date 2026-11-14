import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  FileCode2,
  Gauge,
  Layers3,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react'
import { useLanguage } from './i18n'
import { articles } from './articles'
import { articleTranslations } from './articleTranslations'
import {
  buildJiraCurlCommand,
  buildJiraMarkdownTicket,
  buildJiraRestApiV3Payload,
  buildJqlQuery,
  computePriorityFromRisk,
  type JiraEnvironment,
  type JiraIssueType,
  type JqlStudioConfig,
} from './core/jira/jira-engine'
import './SovereignWorkbench.css'

export type SovereignPillarId = 'eng' | 'qa' | 'ba' | 'jira' | 'pm' | 'sec'

interface RtmRow {
  readonly brdId: string
  readonly requirement: string
  readonly fsdEndpoint: string
  readonly testCaseId: string
  readonly jiraKey: string
  readonly status: 'Covered' | 'Gap' | 'Orphan'
}

const INITIAL_RTM_ROWS: ReadonlyArray<RtmRow> = [
  {
    brdId: 'BRD-AUTH-01',
    requirement: 'Multi-factor token rotation with device binding & replay lock',
    fsdEndpoint: 'POST /v2/auth/token/rotate',
    testCaseId: 'TC-QA-101, TC-SEC-104',
    jiraKey: 'ENT-401',
    status: 'Covered',
  },
  {
    brdId: 'BRD-PAY-02',
    requirement: 'Idempotent settlement ledger with duplicate key rejection',
    fsdEndpoint: 'POST /v2/settlements/execute',
    testCaseId: 'TC-QA-205, TC-UAT-09',
    jiraKey: 'ENT-418',
    status: 'Covered',
  },
  {
    brdId: 'BRD-RECON-03',
    requirement: 'Automated T+0 GL vs Sub-ledger reconciliation variance alert',
    fsdEndpoint: 'GET /v2/recon/variance-report',
    testCaseId: '',
    jiraKey: 'ENT-452',
    status: 'Gap',
  },
  {
    brdId: '',
    requirement: 'Legacy V1 webhook retry fallback test',
    fsdEndpoint: 'POST /v1/webhooks/retry',
    testCaseId: 'TC-QA-088',
    jiraKey: 'ENT-199',
    status: 'Orphan',
  },
]

export function SovereignWorkbenchPage({ initialPillar = 'eng' }: { initialPillar?: SovereignPillarId }) {
  const { language } = useLanguage()
  const en = language === 'en'
  const [activePillar, setActivePillar] = useState<SovereignPillarId>(initialPillar)
  const [copiedKey, setCopiedKey] = useState<string>('')

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(current => (current === key ? '' : current)), 2200)
    } catch {
      setCopiedKey('')
    }
  }

  // =========================================================================
  // PILLAR 01: SOFTWARE ENGINEERING & SYSTEM SCALABILITY PHYSICS
  // =========================================================================
  const [apiEndpoint, setApiEndpoint] = useState('/api/v2/orders/settle')
  const [apiMethod, setApiMethod] = useState<'POST' | 'PUT' | 'PATCH'>('POST')
  const [apiPayload, setApiPayload] = useState(
    '{\n  "orderId": "ORD-2026-9941",\n  "idempotencyKey": "idem_9f82a10c7b",\n  "amountMinor": 1500000,\n  "currency": "IDR",\n  "customerTier": "ENTERPRISE"\n}',
  )
  const [uslNodes, setUslNodes] = useState(16)
  const [uslAlpha, setUslAlpha] = useState(0.03)
  const [uslBeta, setUslBeta] = useState(0.0012)
  const [littleLambda, setLittleLambda] = useState(850) // req/sec
  const [littleLatencyMs, setLittleLatencyMs] = useState(42) // ms

  const apiInspection = useMemo(() => {
    try {
      const parsed = JSON.parse(apiPayload) as Record<string, unknown>
      const keys = Object.keys(parsed)
      const zodFields = keys.map(k => {
        const val = parsed[k]
        if (typeof val === 'number') return `  ${k}: z.number().int().nonnegative(),`
        if (typeof val === 'boolean') return `  ${k}: z.boolean(),`
        return `  ${k}: z.string().min(1),`
      })
      const zodSchema = `import { z } from 'zod'\n\nexport const ContractSchema = z.object({\n${zodFields.join('\n')}\n}).strict()`
      const fuzzVectors = [
        { name: 'Boundary Overflow (MAX_SAFE_INTEGER)', field: keys[0] ?? 'id', mutation: '9007199254740991', expectedStatus: '400 / 422' },
        { name: 'Negative Numeric Injection', field: 'amountMinor', mutation: '-1', expectedStatus: '422 Unprocessable Entity' },
        { name: 'Null Reference Injection', field: keys[1] ?? 'idempotencyKey', mutation: 'null', expectedStatus: '400 Bad Request' },
        { name: 'Empty String / Whitespace Bypass', field: keys[0] ?? 'orderId', mutation: '"   "', expectedStatus: '400 Bad Request' },
        { name: 'Idempotency Replay Race (10x Parallel)', field: 'idempotencyKey', mutation: 'Duplicate concurrent key', expectedStatus: '200 / 409 Conflict (1 ledger entry)' },
      ]
      const curlCmd = `curl -X ${apiMethod} "https://dreamex.tech${apiEndpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Idempotency-Key: idem-test-001" \\\n  -d '${JSON.stringify(parsed)}'`
      const pwTest = `import { test, expect } from '@playwright/test'\n\ntest('${apiMethod} ${apiEndpoint} enforces contract & rejects negative boundary', async ({ request }) => {\n  const validRes = await request.${apiMethod.toLowerCase()}('${apiEndpoint}', {\n    data: ${JSON.stringify(parsed, null, 2).replace(/\n/g, '\n    ')}\n  })\n  expect([200, 201]).toContain(validRes.status())\n\n  const fuzzRes = await request.${apiMethod.toLowerCase()}('${apiEndpoint}', {\n    data: { ...${JSON.stringify(parsed)}, amountMinor: -999 }\n  })\n  expect([400, 422]).toContain(fuzzRes.status())\n})`
      return { valid: true, keysCount: keys.length, zodSchema, fuzzVectors, curlCmd, pwTest }
    } catch (err) {
      return {
        valid: false,
        keysCount: 0,
        zodSchema: `// Invalid JSON payload: ${(err as Error).message}`,
        fuzzVectors: [],
        curlCmd: '',
        pwTest: '',
      }
    }
  }, [apiEndpoint, apiMethod, apiPayload])

  const uslMetrics = useMemo(() => {
    const N = Math.max(1, uslNodes)
    const a = Math.max(0.0001, uslAlpha)
    const b = Math.max(0.00001, uslBeta)
    const capacity = N / (1 + a * (N - 1) + b * N * (N - 1))
    const nMax = Math.max(1, Math.floor(Math.sqrt(Math.max(0.0001, 1 - a) / b)))
    const cMax = nMax / (1 + a * (nMax - 1) + b * nMax * (nMax - 1))
    const efficiency = (capacity / N) * 100
    const littleConcurrency = (littleLambda * littleLatencyMs) / 1000
    const recommendedPool = Math.ceil(littleConcurrency * 1.35)
    return {
      capacity: capacity.toFixed(2),
      nMax,
      cMax: cMax.toFixed(2),
      efficiency: efficiency.toFixed(1),
      retrograde: N > nMax,
      littleConcurrency: littleConcurrency.toFixed(1),
      recommendedPool,
    }
  }, [uslNodes, uslAlpha, uslBeta, littleLambda, littleLatencyMs])

  // =========================================================================
  // PILLAR 02: QA & UAT STUDIO (TEST MATRIX, SELECTOR SCORER & SQL RECON)
  // =========================================================================
  const [qaFlowPreset, setQaFlowPreset] = useState<'payment' | 'auth' | 'migration' | 'approval'>('payment')
  const [rawSelector, setRawSelector] = useState('div.checkout-card > ul > li:nth-child(2) > button.bg-emerald-500')
  const [targetRoleName, setTargetRoleName] = useState('Approve Settlement')
  const [sqlSourceTable, setSqlSourceTable] = useState('legacy_core.dbo.transactions')
  const [sqlTargetTable, setSqlTargetTable] = useState('modern_ledger.public.settlements')
  const [sqlKeyCol, setSqlKeyCol] = useState('transaction_id')
  const [sqlAmountCol, setSqlAmountCol] = useState('amount_minor')
  const [uatPassed, setUatPassed] = useState(48)
  const [uatFailed, setUatFailed] = useState(0)
  const [uatBlocked, setUatBlocked] = useState(1)

  const qaMatrixRows = useMemo(() => {
    const flows = {
      payment: {
        module: 'Idempotent Payment Settlement',
        cases: [
          { id: 'TC-PAY-001', type: 'Positive Path', scenario: 'Valid settlement request with unique idempotencyKey settles exactly once', expected: 'HTTP 200 OK; ledger balance updated; audit event emitted' },
          { id: 'TC-PAY-002', type: 'Boundary Value (BVA)', scenario: 'Settlement at minimum (1 minor unit) and maximum tier ceiling (99,999,999,999)', expected: 'Min/Max boundaries accepted; ceiling + 1 rejected with 422' },
          { id: 'TC-PAY-003', type: 'Negative Path', scenario: 'Settlement with negative amount (-100) or unsupported currency code', expected: 'HTTP 422 Unprocessable Entity; zero database mutation' },
          { id: 'TC-PAY-004', type: 'Idempotency / Race', scenario: '10 concurrent requests with identical idempotencyKey within 50ms window', expected: 'Exactly 1 ledger debit; 9 responses return cached result or 409 lock' },
          { id: 'TC-PAY-005', type: 'Security / AuthZ', scenario: 'Horizontal privilege escalation: Tenant A attempts to settle Tenant B orderId', expected: 'HTTP 403 Forbidden; security alert logged with correlation ID' },
        ],
      },
      auth: {
        module: 'Authentication & Token Rotation',
        cases: [
          { id: 'TC-AUTH-001', type: 'Positive Path', scenario: 'Valid credentials + MFA TOTP issue short-lived JWT (15m) + refresh token', expected: 'HTTP 200 OK; HttpOnly Secure SameSite=Strict cookie set' },
          { id: 'TC-AUTH-002', type: 'Boundary Value (BVA)', scenario: 'Token expiration at exact TTL boundary (t = 899s vs t = 901s)', expected: 't=899s succeeds; t=901s returns 401 token_expired' },
          { id: 'TC-AUTH-003', type: 'Negative Path', scenario: 'Replay of already-rotated refresh token from previous session', expected: 'HTTP 401; entire token family revoked immediately (reuse detection)' },
          { id: 'TC-AUTH-004', type: 'Idempotency / Race', scenario: 'Brute-force 20 parallel login attempts across distributed IPs', expected: 'Rate limiter triggers 429 Too Many Requests + account lock threshold' },
          { id: 'TC-AUTH-005', type: 'Security / AuthZ', scenario: 'JWT alg:none and tampered role claim injection in Authorization header', expected: 'Signature verification fails with 401 Unauthorized' },
        ],
      },
      migration: {
        module: 'Enterprise SQL Data Migration & Recon',
        cases: [
          { id: 'TC-MIG-001', type: 'Positive Path', scenario: 'Full batch ETL migrates 100% of active records preserving primary keys & timestamps', expected: 'Source COUNT(*) == Target COUNT(*) and SUM(amount) delta == 0.00' },
          { id: 'TC-MIG-002', type: 'Boundary Value (BVA)', scenario: 'Records with 255-char UTF-8 names, leap-year dates (2024-02-29), and 0.00 balances', expected: 'Zero truncation, exact timezone UTC normalization, precision preserved' },
          { id: 'TC-MIG-003', type: 'Negative Path', scenario: 'Orphan child records without parent foreign key in legacy source table', expected: 'Quarantined into dead-letter audit table without halting batch transaction' },
          { id: 'TC-MIG-004', type: 'Idempotency / Race', scenario: 'Re-running migration job on already-migrated batch window', expected: 'UPSERT / MERGE idempotency ensures zero duplicate target rows' },
          { id: 'TC-MIG-005', type: 'Security / PII', scenario: 'Verify sensitive national ID & card columns after migration', expected: 'Encrypted at rest (AES-256-GCM) and masked in non-prod views' },
        ],
      },
      approval: {
        module: 'Multi-Level Maker-Checker Approval Workflow',
        cases: [
          { id: 'TC-WF-001', type: 'Positive Path', scenario: 'Maker submits request -> Checker L1 approves -> Approver L2 finalizes', expected: 'State transitions DRAFT -> PENDING_L1 -> PENDING_L2 -> APPROVED' },
          { id: 'TC-WF-002', type: 'Boundary Value (BVA)', scenario: 'Transaction at exact L1 threshold ($50,000.00) vs L2 threshold ($50,000.01)', expected: '$50,000.00 completes at L1; $50,000.01 requires L2 sign-off' },
          { id: 'TC-WF-003', type: 'Negative Path', scenario: 'Maker attempts to approve their own submitted transaction (Segregation of Duties)', expected: 'HTTP 403 SoD Violation: Maker cannot act as Checker' },
          { id: 'TC-WF-004', type: 'Idempotency / Race', scenario: 'Two Checkers click Approve & Reject at the exact same millisecond', expected: 'Optimistic locking (version column) allows 1 transition; second gets 409' },
          { id: 'TC-WF-005', type: 'Security / Audit', scenario: 'Attempt to mutate approved payload fields after L1 sign-off', expected: 'Immutable payload hash check fails; state resets or rejects mutation' },
        ],
      },
    }
    return flows[qaFlowPreset]
  }, [qaFlowPreset])

  const selectorAnalysis = useMemo(() => {
    const sel = rawSelector.trim()
    const depth = (sel.match(/>|\s+/g) || []).length
    const nthCount = (sel.match(/nth-child|nth-of-type|:eq\(/g) || []).length
    const utilityClasses = (sel.match(/\.(bg-|text-|p-|m-|flex|grid|w-|h-|border-)/g) || []).length
    const hasAriaOrTestId = /data-testid|aria-|role=|getByRole|getByTestId|getByLabel/.test(sel)
    const rawScore = 100 - (depth * 7 + nthCount * 22 + utilityClasses * 14) + (hasAriaOrTestId ? 25 : 0)
    const score = Math.max(5, Math.min(100, rawScore))
    const safeName = targetRoleName.trim() || 'Submit'
    const healedPlaywright = `await page.getByRole('button', { name: /${safeName}/i }).click()`
    const healedTestId = `await page.getByTestId('${safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-btn').click()`
    return { score, depth, nthCount, utilityClasses, hasAriaOrTestId, healedPlaywright, healedTestId }
  }, [rawSelector, targetRoleName])

  const sqlReconScript = useMemo(() => {
    return [
      `-- ============================================================================`,
      `-- DREAMEX UAT & DATA MIGRATION RECONCILIATION SUITE`,
      `-- Source: ${sqlSourceTable}  -->  Target: ${sqlTargetTable}`,
      `-- ============================================================================`,
      ``,
      `-- 1. COMPLETENESS & FINANCIAL AGGREGATE CHECK (COUNT & SUM VARIANCE)`,
      `SELECT`,
      `  (SELECT COUNT(*) FROM ${sqlSourceTable}) AS source_row_count,`,
      `  (SELECT COUNT(*) FROM ${sqlTargetTable}) AS target_row_count,`,
      `  (SELECT COALESCE(SUM(${sqlAmountCol}), 0) FROM ${sqlSourceTable}) AS source_total_amount,`,
      `  (SELECT COALESCE(SUM(${sqlAmountCol}), 0) FROM ${sqlTargetTable}) AS target_total_amount,`,
      `  (SELECT COALESCE(SUM(${sqlAmountCol}), 0) FROM ${sqlSourceTable}) -`,
      `  (SELECT COALESCE(SUM(${sqlAmountCol}), 0) FROM ${sqlTargetTable}) AS variance_delta;`,
      ``,
      `-- 2. ORPHAN / MISSING RECORD DETECTION (IN SOURCE BUT MISSING IN TARGET)`,
      `SELECT s.${sqlKeyCol}, s.${sqlAmountCol}`,
      `FROM ${sqlSourceTable} s`,
      `LEFT JOIN ${sqlTargetTable} t ON t.${sqlKeyCol} = s.${sqlKeyCol}`,
      `WHERE t.${sqlKeyCol} IS NULL;`,
      ``,
      `-- 3. DUPLICATE PRIMARY/BUSINESS KEY DETECTION IN TARGET`,
      `SELECT ${sqlKeyCol}, COUNT(*) AS duplicate_count`,
      `FROM ${sqlTargetTable}`,
      `GROUP BY ${sqlKeyCol}`,
      `HAVING COUNT(*) > 1;`,
      ``,
      `-- 4. CRITICAL NULL / DATA INTEGRITY CHECK`,
      `SELECT COUNT(*) AS invalid_null_rows`,
      `FROM ${sqlTargetTable}`,
      `WHERE ${sqlKeyCol} IS NULL OR ${sqlAmountCol} IS NULL OR ${sqlAmountCol} < 0;`,
    ].join('\n')
  }, [sqlSourceTable, sqlTargetTable, sqlKeyCol, sqlAmountCol])

  const uatSignOffDoc = useMemo(() => {
    const total = Math.max(1, uatPassed + uatFailed + uatBlocked)
    const passRate = ((uatPassed / total) * 100).toFixed(1)
    const decision = uatFailed === 0 && uatBlocked === 0 ? 'FULL UAT SIGN-OFF (APPROVED FOR PRODUCTION GO-LIVE)' : uatFailed === 0 ? 'CONDITIONAL UAT SIGN-OFF (APPROVED WITH DOCUMENTED WORKAROUND)' : 'UAT HOLD — CRITICAL DEFECTS MUST BE RESOLVED BEFORE CUTOVER'
    return [
      `# OFFICIAL UAT GO-LIVE READINESS & SIGN-OFF CERTIFICATE`,
      `- **Module / Release:** ${qaMatrixRows.module}`,
      `- **Decision Status:** **${decision}**`,
      `- **Execution Summary:** ${uatPassed} Passed | ${uatFailed} Failed | ${uatBlocked} Blocked (Pass Rate: ${passRate}%)`,
      `- **Data Recon Verification:** Source (${sqlSourceTable}) vs Target (${sqlTargetTable}) verified via SQL Recon Suite.`,
      `- **Sign-Off Authority:** QA Lead / Business Process Owner / IT Delivery Lead`,
    ].join('\n')
  }, [qaMatrixRows.module, uatPassed, uatFailed, uatBlocked, sqlSourceTable, sqlTargetTable])

  // =========================================================================
  // PILLAR 03: IT BUSINESS ANALYST (BA) — GHERKIN, BI-DIRECTIONAL RTM & IMPACT
  // =========================================================================
  const [baRole, setBaRole] = useState('Enterprise Treasury Officer')
  const [baCapability, setBaCapability] = useState('approve multi-currency batch settlements with real-time FX lock')
  const [baValue, setBaValue] = useState('eliminate settlement slippage and enforce dual-control compliance')
  const [baRule, setBaRule] = useState('Batch settlements exceeding $50,000 USD equivalent require L2 Director MFA token and idempotent ledger lock.')
  const [baSlaMs, setBaSlaMs] = useState(250)
  const [rtmRows, setRtmRows] = useState<ReadonlyArray<RtmRow>>(INITIAL_RTM_ROWS)
  const [newBrdId, setNewBrdId] = useState('BRD-RISK-04')
  const [newReqText, setNewReqText] = useState('Real-time velocity limit check per merchant account')
  const [newFsd, setNewFsd] = useState('POST /v2/risk/velocity-check')
  const [newTcId, setNewTcId] = useState('TC-QA-310')
  const [newJira, setNewJira] = useState('ENT-512')

  const gherkinSpec = useMemo(() => {
    return [
      `Feature: ${baCapability}`,
      `  As an ${baRole}`,
      `  I want to ${baCapability}`,
      `  So that we ${baValue}`,
      ``,
      `  Background:`,
      `    Given the user is authenticated as "${baRole}" with active MFA session`,
      `    And the downstream service SLA threshold is <= ${baSlaMs}ms at P95`,
      ``,
      `  # Business Rule: ${baRule}`,
      `  Scenario Outline: Validate settlement approval threshold and idempotency`,
      `    Given a settlement batch "<batch_id>" with USD equivalent amount <amount_usd>`,
      `    And idempotency key "<idempotency_key>"`,
      `    When the user submits the approval action with MFA status "<mfa_status>"`,
      `    Then the system responds with HTTP status <http_status>`,
      `    And the resulting workflow state is "<workflow_state>"`,
      `    And an immutable audit trail event is recorded`,
      ``,
      `    Examples:`,
      `      | batch_id   | amount_usd | idempotency_key | mfa_status | http_status | workflow_state |`,
      `      | BATCH-1001 | 25000.00   | idem-ba-001     | VALID      | 200         | APPROVED_L1    |`,
      `      | BATCH-1002 | 50000.01   | idem-ba-002     | VALID      | 202         | PENDING_L2_DIR |`,
      `      | BATCH-1003 | 75000.00   | idem-ba-003     | EXPIRED    | 403         | REJECTED_MFA   |`,
      `      | BATCH-1001 | 25000.00   | idem-ba-001     | VALID      | 409         | DUPLICATE_LOCK |`,
    ].join('\n')
  }, [baRole, baCapability, baValue, baRule, baSlaMs])

  const rtmStats = useMemo(() => {
    const total = rtmRows.length
    const covered = rtmRows.filter(r => r.status === 'Covered').length
    const gaps = rtmRows.filter(r => r.status === 'Gap').length
    const orphans = rtmRows.filter(r => r.status === 'Orphan').length
    const pct = total > 0 ? Math.round((covered / total) * 100) : 100
    const markdown = [
      `| BRD ID | Business Requirement | FSD / API Spec | QA/UAT Test Case | Jira Issue | Status |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- |`,
      ...rtmRows.map(r => `| ${r.brdId || '—'} | ${r.requirement} | \`${r.fsdEndpoint}\` | ${r.testCaseId || 'MISSING'} | \`${r.jiraKey}\` | **${r.status}** |`),
    ].join('\n')
    return { total, covered, gaps, orphans, pct, markdown }
  }, [rtmRows])

  const addRtmRow = () => {
    if (!newReqText.trim()) return
    const status: RtmRow['status'] = !newBrdId.trim() ? 'Orphan' : !newTcId.trim() ? 'Gap' : 'Covered'
    setRtmRows(prev => [
      ...prev,
      {
        brdId: newBrdId.trim(),
        requirement: newReqText.trim(),
        fsdEndpoint: newFsd.trim() || 'TBD',
        testCaseId: newTcId.trim(),
        jiraKey: newJira.trim() || 'ENT-NEW',
        status,
      },
    ])
    setNewReqText('')
  }

  // =========================================================================
  // PILLAR 04: JIRA NEURAL AUTOMATION HUB & VISUAL JQL STUDIO
  // =========================================================================
  const [jiraProject, setJiraProject] = useState('ENT')
  const [jiraType, setJiraType] = useState<JiraIssueType>('Bug')
  const [jiraEnv, setJiraEnv] = useState<JiraEnvironment>('UAT')
  const [jiraModule, setJiraModule] = useState('Payment-Settlement')
  const [jiraSummary, setJiraSummary] = useState('Duplicate ledger debit when retry webhook fires during DB lock timeout')
  const [jiraStepsText, setJiraStepsText] = useState(
    'Submit settlement POST /api/v2/orders/settle with amountMinor=1500000\nTrigger concurrent webhook retry within 80ms window\nInspect modern_ledger.public.settlements for duplicate transaction_id',
  )
  const [jiraExpected, setJiraExpected] = useState('Exactly 1 settlement row committed; retry returns HTTP 200/409 idempotent response')
  const [jiraActual, setJiraActual] = useState('2 settlement rows created with identical transaction_id causing -1,500,000 reconciliation variance')
  const [jiraEvidence, setJiraEvidence] = useState('{"transaction_id": "TX-9941", "duplicate_count": 2, "variance_delta": -1500000}')
  const [jiraImpact, setJiraImpact] = useState<1 | 2 | 3 | 4 | 5>(5)
  const [jiraLikelihood, setJiraLikelihood] = useState<1 | 2 | 3 | 4 | 5>(4)
  const [jqlPreset, setJqlPreset] = useState<JqlStudioConfig['preset']>('uat-blockers')
  const [jqlVersion, setJqlVersion] = useState('v3.0.0')
  const [jqlLabel, setJqlLabel] = useState('UAT-Blocker')
  const [jqlStaleDays, setJqlStaleDays] = useState(3)

  const jiraBlueprintInput = useMemo(
    () => ({
      projectKey: jiraProject,
      issueType: jiraType,
      summary: jiraSummary,
      environment: jiraEnv,
      moduleName: jiraModule,
      stepsToReproduceOrCriteria: jiraStepsText.split('\n').map(s => s.trim()).filter(Boolean),
      expectedResult: jiraExpected,
      actualResultOrBusinessValue: jiraActual,
      sqlOrApiEvidence: jiraEvidence,
      impactScore: jiraImpact,
      likelihoodScore: jiraLikelihood,
    }),
    [jiraProject, jiraType, jiraSummary, jiraEnv, jiraModule, jiraStepsText, jiraExpected, jiraActual, jiraEvidence, jiraImpact, jiraLikelihood],
  )

  const jiraRisk = useMemo(() => computePriorityFromRisk(jiraImpact, jiraLikelihood), [jiraImpact, jiraLikelihood])
  const jiraJsonPayload = useMemo(() => JSON.stringify(buildJiraRestApiV3Payload(jiraBlueprintInput), null, 2), [jiraBlueprintInput])
  const jiraMarkdown = useMemo(() => buildJiraMarkdownTicket(jiraBlueprintInput), [jiraBlueprintInput])
  const jiraCurl = useMemo(() => buildJiraCurlCommand(jiraBlueprintInput), [jiraBlueprintInput])
  const jqlQuery = useMemo(
    () =>
      buildJqlQuery({
        preset: jqlPreset,
        projectKey: jiraProject,
        fixVersion: jqlVersion,
        label: jqlLabel,
        staleDays: jqlStaleDays,
      }),
    [jqlPreset, jiraProject, jqlVersion, jqlLabel, jqlStaleDays],
  )

  // =========================================================================
  // PILLAR 05: IT PROJECT MANAGER (PM) — MONTE CARLO, EVM & DORA OBSERVATORY
  // =========================================================================
  const [velocityHistoryText, setVelocityHistoryText] = useState('26, 31, 24, 34, 29, 28, 32, 27')
  const [remainingBacklogPoints, setRemainingBacklogPoints] = useState(185)
  const [sprintDays, setSprintDays] = useState(14)
  const [evmBac, setEvmBac] = useState(250000) // Budget at Completion ($)
  const [evmPv, setEvmPv] = useState(125000) // Planned Value ($)
  const [evmEv, setEvmEv] = useState(118000) // Earned Value ($)
  const [evmAc, setEvmAc] = useState(112000) // Actual Cost ($)

  const monteCarloResult = useMemo(() => {
    const velocities = velocityHistoryText
      .split(',')
      .map(v => Number.parseFloat(v.trim()))
      .filter(v => Number.isFinite(v) && v > 0)
    const sample = velocities.length ? velocities : [25, 28, 30]
    const backlog = Math.max(1, remainingBacklogPoints)
    const trials = 10000
    const sprintCounts: number[] = []

    // Deterministic high-speed LCG PRNG so 10,000 Monte Carlo trials are reproducible & instantaneous
    let seed = backlog * 1337 + sample.reduce((acc, v, idx) => acc + Math.round(v * (idx + 17)), 0)
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }

    for (let i = 0; i < trials; i++) {
      let remaining = backlog
      let sprints = 0
      while (remaining > 0 && sprints < 100) {
        const idx = Math.floor(nextRand() * sample.length)
        remaining -= sample[idx]
        sprints += 1
      }
      sprintCounts.push(sprints)
    }
    sprintCounts.sort((a, b) => a - b)
    const p50 = sprintCounts[Math.floor(trials * 0.5)] ?? 1
    const p85 = sprintCounts[Math.floor(trials * 0.85)] ?? 1
    const p95 = sprintCounts[Math.floor(trials * 0.95)] ?? 1

    const buckets = new Map<number, number>()
    for (const c of sprintCounts) buckets.set(c, (buckets.get(c) ?? 0) + 1)
    const histogram = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, 8)
      .map(([sprints, count]) => ({
        sprints,
        probabilityPct: Number(((count / trials) * 100).toFixed(1)),
      }))

    const addDays = (days: number) => {
      const d = new Date('2026-11-14T00:00:00Z')
      d.setUTCDate(d.getUTCDate() + days)
      return d.toISOString().slice(0, 10)
    }

    return {
      trials,
      avgVelocity: (sample.reduce((a, b) => a + b, 0) / sample.length).toFixed(1),
      p50Sprints: p50,
      p85Sprints: p85,
      p95Sprints: p95,
      p50Date: addDays(p50 * sprintDays),
      p85Date: addDays(p85 * sprintDays),
      p95Date: addDays(p95 * sprintDays),
      histogram,
    }
  }, [velocityHistoryText, remainingBacklogPoints, sprintDays])

  const evmMetrics = useMemo(() => {
    const pv = Math.max(1, evmPv)
    const ac = Math.max(1, evmAc)
    const spi = evmEv / pv
    const cpi = evmEv / ac
    const eac = evmBac / Math.max(0.1, cpi)
    const vac = evmBac - eac
    return {
      spi: spi.toFixed(2),
      cpi: cpi.toFixed(2),
      eac: Math.round(eac).toLocaleString('en-US'),
      vac: Math.round(vac).toLocaleString('en-US'),
      scheduleStatus: spi >= 1 ? (en ? 'Ahead / On Schedule' : 'Tepat Jadwal') : spi >= 0.9 ? (en ? 'Minor Slippage' : 'Sedikit Tertunda') : (en ? 'Behind Schedule' : 'Terlambat'),
      costStatus: cpi >= 1 ? (en ? 'Under / On Budget' : 'Hemat / Sesuai Budget') : (en ? 'Over Budget' : 'Melebihi Budget'),
    }
  }, [evmBac, evmPv, evmEv, evmAc, en])

  // =========================================================================
  // PILLAR 06: DEVSECOPS ZERO-TRUST AUDITOR & KNOWLEDGE LOG
  // =========================================================================
  const [secGates, setSecGates] = useState<Record<string, boolean>>({
    oidc: true,
    sast: true,
    sbom: true,
    cosign: true,
    secrets: true,
    leastPrivilege: true,
    dast: false,
    branchProtection: true,
  })

  const secScore = useMemo(() => {
    const values = Object.values(secGates)
    const passed = values.filter(Boolean).length
    return Math.round((passed / values.length) * 100)
  }, [secGates])

  const pillars: ReadonlyArray<{
    id: SovereignPillarId
    code: string
    titleEn: string
    titleId: string
    roleEn: string
    roleId: string
    icon: typeof Braces
  }> = [
    { id: 'eng', code: '01 / SE & ARCH', titleEn: 'API & System Physics', titleId: 'API & Fisika Sistem', roleEn: 'Software Engineer & Architect', roleId: 'Software Engineer & Arsitek', icon: Braces },
    { id: 'qa', code: '02 / QA & UAT', titleEn: 'QA Matrix & SQL Recon', titleId: 'Matriks QA & SQL Recon', roleEn: 'QA Manual, Automation & UAT', roleId: 'QA Manual, Otomasi & UAT', icon: CheckCircle2 },
    { id: 'ba', code: '03 / BA & PRODUCT', titleEn: 'Gherkin & RTM Studio', titleId: 'Studio Gherkin & RTM', roleEn: 'IT Business & System Analyst', roleId: 'IT Business & System Analyst', icon: ClipboardList },
    { id: 'jira', code: '04 / JIRA ENGINE', titleEn: 'Jira Neural Automation', titleId: 'Otomasi Neural Jira', roleEn: 'QA, BA, PM & Scrum Master', roleId: 'QA, BA, PM & Scrum Master', icon: Zap },
    { id: 'pm', code: '05 / PM DELIVERY', titleEn: 'Monte Carlo & EVM', titleId: 'Monte Carlo & EVM', roleEn: 'IT Project Manager & Delivery', roleId: 'IT Project Manager & Delivery', icon: Gauge },
    { id: 'sec', code: '06 / DEVSECOPS', titleEn: 'Zero-Trust & Blueprints', titleId: 'Zero-Trust & Blueprint', roleEn: 'DevSecOps & All IT Roles', roleId: 'DevSecOps & Praktisi IT', icon: ShieldCheck },
  ]

  return (
    <main id="main-content" className="sovereign-workbench container">
      <section className="sovereign-hero" aria-labelledby="sovereign-workbench-title">
        <div className="sovereign-hero-top">
          <span className="sovereign-kicker">
            {en ? 'QUANTUM OBSIDIAN v3.0 · CLIENT-SOVEREIGN IT WORKBENCH' : 'QUANTUM OBSIDIAN v3.0 · WORKBENCH IT OTONOM DI BROWSER'}
          </span>
          <div className="sovereign-badge-row">
            <span className="sovereign-role-pill eng">SE / Architect</span>
            <span className="sovereign-role-pill qa">QA / UAT</span>
            <span className="sovereign-role-pill ba">Business Analyst</span>
            <span className="sovereign-role-pill pm">PM / Jira Engine</span>
            <span className="sovereign-role-pill sec">DevSecOps</span>
          </div>
        </div>
        <h1 id="sovereign-workbench-title" data-testid="sovereign-workbench-title">
          {en ? (
            <>
              Sovereign IT, QA, BA, PM & Jira <span>Automation Workbench.</span>
            </>
          ) : (
            <>
              Ruang Kerja Terpadu <span>IT, QA, BA, PM & Otomasi Jira.</span>
            </>
          )}
        </h1>
        <p>
          {en
            ? 'Deterministic, zero-latency engineering calculators, contract fuzzers, SQL data migration reconciliation scripts, Gherkin & RTM compilers, Jira REST API v3 ADF synthesizers, and 10,000-trial Monte Carlo release forecasters running 100% in your browser.'
            : 'Kalkulator rekayasa deterministik tanpa latensi server: fuzzer kontrak API, skrip rekonsiliasi migrasi SQL UAT, kompilator Gherkin & RTM, generator JSON Jira REST API v3 (ADF), serta simulasi rilis Monte Carlo 10.000 iterasi langsung di browser Anda.'}
        </p>
        <div className="sovereign-telemetry-bento">
          <div className="sovereign-telemetry-card">
            <small>{en ? 'USL OPTIMAL CEILING' : 'BATAS OPTIMAL USL'}</small>
            <strong>{uslMetrics.nMax} Nodes</strong>
            <span>{en ? `Max ${uslMetrics.cMax}x throughput` : `Maks ${uslMetrics.cMax}x kapasitas`}</span>
          </div>
          <div className="sovereign-telemetry-card">
            <small>{en ? 'SELECTOR RESILIENCE' : 'KETAHANAN SELEKTOR'}</small>
            <strong>{selectorAnalysis.score}/100</strong>
            <span>{en ? 'Playwright locator score' : 'Skor lokator Playwright'}</span>
          </div>
          <div className="sovereign-telemetry-card">
            <small>{en ? 'BA RTM COVERAGE' : 'CAKUPAN RTM BA'}</small>
            <strong>{rtmStats.pct}%</strong>
            <span>{en ? `${rtmStats.covered}/${rtmStats.total} requirements verified` : `${rtmStats.covered}/${rtmStats.total} kebutuhan teruji`}</span>
          </div>
          <div className="sovereign-telemetry-card">
            <small>{en ? 'JIRA DEFECT RISK SLA' : 'SLA RISIKO DEFEK JIRA'}</small>
            <strong>
              {jiraRisk.priority} ({jiraRisk.riskScore})
            </strong>
            <span>{jiraRisk.slaTarget}</span>
          </div>
          <div className="sovereign-telemetry-card">
            <small>{en ? 'MONTE CARLO P85 RELEASE' : 'RILIS MONTE CARLO P85'}</small>
            <strong>{monteCarloResult.p85Sprints} Sprints</strong>
            <span>{en ? `Target: ${monteCarloResult.p85Date}` : `Target: ${monteCarloResult.p85Date}`}</span>
          </div>
        </div>
      </section>

      <div className="sovereign-pillar-tabs" role="tablist" aria-label={en ? 'Sovereign IT ecosystem pillars' : 'Pilar ekosistem IT terpadu'}>
        {pillars.map(pillar => {
          const Icon = pillar.icon
          const active = activePillar === pillar.id
          return (
            <button
              key={pillar.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-accent={pillar.id}
              data-testid={`pillar-tab-${pillar.id}`}
              className={active ? 'sovereign-pillar-tab active' : 'sovereign-pillar-tab'}
              onClick={() => setActivePillar(pillar.id)}
            >
              <div className="sovereign-pillar-tab-top">
                <span>{pillar.code}</span>
                <Icon size={15} />
              </div>
              <strong>{en ? pillar.titleEn : pillar.titleId}</strong>
              <small>{en ? pillar.roleEn : pillar.roleId}</small>
            </button>
          )
        })}
      </div>

      {/* PILLAR 01: SOFTWARE ENGINEERING & SYSTEM PHYSICS */}
      {activePillar === 'eng' && (
        <section className="sovereign-grid" data-testid="pillar-panel-eng" aria-label="Software Engineering and System Physics">
          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">01A · OPENAPI 3.1 CONTRACT & BOUNDARY FUZZER</span>
                <h2>{en ? 'API Payload Inspector & Fuzz Vector Synthesizer' : 'Inspektur Kontrak API & Generator Vektor Fuzz'}</h2>
                <p>{en ? 'Validate JSON contracts and generate cURL, Playwright API tests, and Zod schemas.' : 'Validasi kontrak JSON serta hasilkan perintah cURL, tes API Playwright, dan skema Zod.'}</p>
              </div>
              <span className={apiInspection.valid ? 'sovereign-status-chip ok' : 'sovereign-status-chip err'}>
                {apiInspection.valid ? `VALID JSON · ${apiInspection.keysCount} FIELDS` : 'INVALID JSON'}
              </span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="api-method-select">{en ? 'HTTP Method' : 'Metode HTTP'}</label>
                <select id="api-method-select" value={apiMethod} onChange={e => setApiMethod(e.target.value as 'POST' | 'PUT' | 'PATCH')}>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="sovereign-field">
                <label htmlFor="api-endpoint-input">{en ? 'Endpoint Path' : 'Path Endpoint'}</label>
                <input id="api-endpoint-input" value={apiEndpoint} onChange={e => setApiEndpoint(e.target.value)} />
              </div>
            </div>
            <div className="sovereign-field">
              <label htmlFor="api-payload-textarea">{en ? 'Contract Sample JSON Payload' : 'Contoh Payload JSON Kontrak'}</label>
              <textarea id="api-payload-textarea" value={apiPayload} onChange={e => setApiPayload(e.target.value)} />
            </div>
            <div className="sovereign-table-wrap">
              <table className="sovereign-table">
                <thead>
                  <tr>
                    <th>{en ? 'Boundary Fuzz Vector' : 'Vektor Fuzzing Batas'}</th>
                    <th>{en ? 'Target Field' : 'Field Target'}</th>
                    <th>{en ? 'Injected Mutation' : 'Mutasi Uji'}</th>
                    <th>{en ? 'Expected HTTP' : 'Ekspektasi HTTP'}</th>
                  </tr>
                </thead>
                <tbody>
                  {apiInspection.fuzzVectors.map(vec => (
                    <tr key={vec.name}>
                      <td><strong>{vec.name}</strong></td>
                      <td><code>{vec.field}</code></td>
                      <td><code>{vec.mutation}</code></td>
                      <td><span className="sovereign-status-chip warn">{vec.expectedStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre className="sovereign-code-box"><code>{apiInspection.pwTest || apiInspection.zodSchema}</code></pre>
            <div className="sovereign-action-bar">
              <button type="button" className="sovereign-btn primary" onClick={() => copyText('curl', apiInspection.curlCmd)}>
                {copiedKey === 'curl' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy cURL' : 'Salin cURL'}
              </button>
              <button type="button" className="sovereign-btn" onClick={() => copyText('pw-api', apiInspection.pwTest)}>
                {copiedKey === 'pw-api' ? <Check size={14} /> : <FileCode2 size={14} />} {en ? 'Copy Playwright API Test' : 'Salin Tes Playwright'}
              </button>
              <button type="button" className="sovereign-btn" onClick={() => copyText('zod', apiInspection.zodSchema)}>
                {copiedKey === 'zod' ? <Check size={14} /> : <Braces size={14} />} {en ? 'Copy Zod Schema' : 'Salin Skema Zod'}
              </button>
            </div>
          </article>

          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">01B · UNIVERSAL SCALABILITY LAW & LITTLE'S LAW</span>
                <h2>{en ? 'Distributed System Scalability Physics Simulator' : 'Simulator Fisika Skalabilitas Sistem Terdistribusi'}</h2>
                <p>{en ? 'Model contention (α), coherency penalty (β), and Little’s Law connection pool sizing.' : 'Modelkan kontensi antrean (α), penalti koherensi (β), dan ukuran pool koneksi Hukum Little.'}</p>
              </div>
              <span className={uslMetrics.retrograde ? 'sovereign-status-chip err' : 'sovereign-status-chip ok'}>
                {uslMetrics.retrograde ? (en ? 'RETROGRADE THRASHING' : 'MELEBIHI PUNCAK') : (en ? 'SCALING HEALTHY' : 'SKALABILITAS SEHAT')}
              </span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="usl-nodes-input">{en ? 'Active Nodes / Concurrency (N)' : 'Jumlah Node / Konkurensi (N)'}</label>
                <input id="usl-nodes-input" type="number" min={1} max={256} value={uslNodes} onChange={e => setUslNodes(Number(e.target.value) || 1)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="usl-alpha-input">{en ? 'Serial Contention (α)' : 'Kontensi Serial (α)'}</label>
                <input id="usl-alpha-input" type="number" step="0.005" min={0.001} max={0.5} value={uslAlpha} onChange={e => setUslAlpha(Number(e.target.value) || 0.01)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="usl-beta-input">{en ? 'Coherency Penalty (β)' : 'Penalti Koherensi (β)'}</label>
                <input id="usl-beta-input" type="number" step="0.0002" min={0.0001} max={0.05} value={uslBeta} onChange={e => setUslBeta(Number(e.target.value) || 0.001)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="little-lambda-input">{en ? 'Arrival Rate λ (req/sec)' : 'Throughput λ (req/detik)'}</label>
                <input id="little-lambda-input" type="number" min={1} max={100000} value={littleLambda} onChange={e => setLittleLambda(Number(e.target.value) || 100)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="little-w-input">{en ? 'Mean Latency W (ms)' : 'Latensi Rata-Rata W (ms)'}</label>
                <input id="little-w-input" type="number" min={1} max={30000} value={littleLatencyMs} onChange={e => setLittleLatencyMs(Number(e.target.value) || 10)} />
              </div>
            </div>
            <div className="sovereign-metrics-row">
              <div className="sovereign-metric-box">
                <span>C(N) CAPACITY</span>
                <strong>{uslMetrics.capacity}x</strong>
                <small>{en ? `Efficiency: ${uslMetrics.efficiency}%` : `Efisiensi: ${uslMetrics.efficiency}%`}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>OPTIMAL N_MAX</span>
                <strong data-testid="usl-nmax">{uslMetrics.nMax} Nodes</strong>
                <small>{en ? `Peak C(N_max) = ${uslMetrics.cMax}x` : `Puncak C(N_max) = ${uslMetrics.cMax}x`}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>LITTLE'S LAW (L = λ·W)</span>
                <strong>{uslMetrics.littleConcurrency}</strong>
                <small>{en ? 'In-flight concurrent requests' : 'Request aktif bersamaan'}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>RECOMMENDED DB POOL</span>
                <strong>{uslMetrics.recommendedPool} conns</strong>
                <small>{en ? 'Includes 35% burst headroom' : 'Termasuk cadangan 35%'}</small>
              </div>
            </div>
            <pre className="sovereign-code-box">
              <code>
                {[
                  `# System Scalability & Capacity Physics Report`,
                  `- USL Formula: C(N) = N / (1 + α(N - 1) + β·N(N - 1))`,
                  `- Active Configuration: N = ${uslNodes}, α = ${uslAlpha}, β = ${uslBeta}`,
                  `- Relative Throughput Capacity C(${uslNodes}): ${uslMetrics.capacity}x (Node Efficiency: ${uslMetrics.efficiency}%)`,
                  `- Optimal Horizontal Scaling Ceiling (N_max): ${uslMetrics.nMax} nodes (Peak ${uslMetrics.cMax}x)`,
                  `- Little's Law Concurrency (λ=${littleLambda} req/s, W=${littleLatencyMs}ms): L = ${uslMetrics.littleConcurrency} in-flight requests`,
                  `- Recommended Database / Worker Pool Size: ${uslMetrics.recommendedPool} connections`,
                ].join('\n')}
              </code>
            </pre>
            <div className="sovereign-action-bar">
              <button
                type="button"
                className="sovereign-btn primary"
                onClick={() =>
                  copyText(
                    'usl-report',
                    `USL Capacity C(${uslNodes})=${uslMetrics.capacity}x | Optimal N_max=${uslMetrics.nMax} | Little's Law L=${uslMetrics.littleConcurrency} | DB Pool=${uslMetrics.recommendedPool}`,
                  )
                }
              >
                {copiedKey === 'usl-report' ? <Check size={14} /> : <Copy size={14} />}{' '}
                {en ? 'Copy Capacity Physics Report' : 'Salin Laporan Kapasitas Sistem'}
              </button>
            </div>
          </article>
        </section>
      )}

      {/* PILLAR 02: QA & UAT STUDIO */}
      {activePillar === 'qa' && (
        <section className="sovereign-grid" data-testid="pillar-panel-qa" aria-label="QA and UAT Studio">
          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">02A · AUTONOMOUS TEST MATRIX & SELECTOR SCORER</span>
                <h2>{en ? 'Test Matrix Generator & Playwright Selector Healer' : 'Generator Matriks Uji & Penyembuh Selektor Playwright'}</h2>
                <p>{en ? 'Generate Positive, Negative, BVA, Idempotency & Security cases and score DOM selector resilience.' : 'Hasilkan skenario Positif, Negatif, BVA, Idempotensi & Keamanan serta skor ketahanan selektor DOM.'}</p>
              </div>
              <span className="sovereign-status-chip ok">{qaMatrixRows.cases.length} SCENARIOS</span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="qa-flow-preset">{en ? 'Enterprise Feature Flow' : 'Alur Fitur Enterprise'}</label>
                <select id="qa-flow-preset" value={qaFlowPreset} onChange={e => setQaFlowPreset(e.target.value as typeof qaFlowPreset)}>
                  <option value="payment">{en ? 'Idempotent Payment Settlement' : 'Penyelesaian Pembayaran Idempoten'}</option>
                  <option value="auth">{en ? 'Authentication & Token Rotation' : 'Autentikasi & Rotasi Token'}</option>
                  <option value="migration">{en ? 'SQL Data Migration & Recon' : 'Migrasi & Rekonsiliasi Data SQL'}</option>
                  <option value="approval">{en ? 'Maker-Checker Approval Workflow' : 'Alur Persetujuan Maker-Checker'}</option>
                </select>
              </div>
              <div className="sovereign-field">
                <label htmlFor="qa-raw-selector">{en ? 'CSS / DOM Selector to Audit' : 'Selektor CSS / DOM untuk Diaudit'}</label>
                <input id="qa-raw-selector" value={rawSelector} onChange={e => setRawSelector(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="qa-role-name">{en ? 'Accessible Button / Action Label' : 'Label Aksesibel Tombol / Aksi'}</label>
                <input id="qa-role-name" value={targetRoleName} onChange={e => setTargetRoleName(e.target.value)} />
              </div>
            </div>
            <div className="sovereign-table-wrap">
              <table className="sovereign-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{en ? 'Test Category' : 'Kategori Uji'}</th>
                    <th>{en ? 'Scenario' : 'Skenario Uji'}</th>
                    <th>{en ? 'Expected Result' : 'Hasil yang Diharapkan'}</th>
                  </tr>
                </thead>
                <tbody>
                  {qaMatrixRows.cases.map(tc => (
                    <tr key={tc.id}>
                      <td><code>{tc.id}</code></td>
                      <td><span className="sovereign-status-chip ok">{tc.type}</span></td>
                      <td>{tc.scenario}</td>
                      <td>{tc.expected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sovereign-metrics-row">
              <div className="sovereign-metric-box">
                <span>SELECTOR SCORE R_sel</span>
                <strong data-testid="qa-resilience-score">{selectorAnalysis.score} / 100</strong>
                <small>{selectorAnalysis.score >= 75 ? 'Resilient' : 'Fragile DOM coupling'}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>DOM DEPTH PENALTY</span>
                <strong>-{selectorAnalysis.depth * 7} pts</strong>
                <small>{selectorAnalysis.depth} combinators</small>
              </div>
              <div className="sovereign-metric-box">
                <span>INDEX / CLASS PENALTY</span>
                <strong>-{selectorAnalysis.nthCount * 22 + selectorAnalysis.utilityClasses * 14} pts</strong>
                <small>nth-child & utility classes</small>
              </div>
            </div>
            <pre className="sovereign-code-box">
              <code>{`// Auto-Healed Playwright Resilient Locators:\n${selectorAnalysis.healedPlaywright}\n${selectorAnalysis.healedTestId}`}</code>
            </pre>
            <div className="sovereign-action-bar">
              <button
                type="button"
                className="sovereign-btn primary"
                onClick={() =>
                  copyText(
                    'qa-matrix',
                    qaMatrixRows.cases.map(c => `| ${c.id} | ${c.type} | ${c.scenario} | ${c.expected} |`).join('\n'),
                  )
                }
              >
                {copiedKey === 'qa-matrix' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy Markdown Matrix' : 'Salin Matriks Markdown'}
              </button>
              <button type="button" className="sovereign-btn" onClick={() => copyText('qa-healed', selectorAnalysis.healedPlaywright)}>
                {copiedKey === 'qa-healed' ? <Check size={14} /> : <Terminal size={14} />} {en ? 'Copy Resilient Locator' : 'Salin Lokator Playwright'}
              </button>
            </div>
          </article>

          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">02B · UAT SIGN-OFF & SQL DATA MIGRATION RECON STUDIO</span>
                <h2>{en ? 'SQL Reconciliation Generator & UAT Sign-Off Builder' : 'Generator SQL Rekonsiliasi & Berita Acara UAT'}</h2>
                <p>{en ? 'Generate completeness, orphan, and duplicate SQL checks plus official Go-Live UAT sign-off reports.' : 'Hasilkan kueri SQL cek kelengkapan, data yatim, dan duplikat beserta laporan kelulusan UAT.'}</p>
              </div>
              <span className={uatFailed === 0 ? 'sovereign-status-chip ok' : 'sovereign-status-chip err'}>
                {uatFailed === 0 ? 'GO-LIVE READY' : 'DEFECT BLOCKED'}
              </span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="sql-source-input">{en ? 'Source Table' : 'Tabel Sumber (Source)'}</label>
                <input id="sql-source-input" value={sqlSourceTable} onChange={e => setSqlSourceTable(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="sql-target-input">{en ? 'Target Table' : 'Tabel Target'}</label>
                <input id="sql-target-input" value={sqlTargetTable} onChange={e => setSqlTargetTable(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="sql-key-input">{en ? 'Primary / Business Key' : 'Kolom Kunci Utama'}</label>
                <input id="sql-key-input" value={sqlKeyCol} onChange={e => setSqlKeyCol(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="sql-amount-input">{en ? 'Numeric / Amount Column' : 'Kolom Nilai / Nominal'}</label>
                <input id="sql-amount-input" value={sqlAmountCol} onChange={e => setSqlAmountCol(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="uat-pass-input">{en ? 'UAT Passed / Failed / Blocked' : 'UAT Lulus / Gagal / Tertahan'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <input id="uat-pass-input" type="number" min={0} value={uatPassed} onChange={e => setUatPassed(Number(e.target.value) || 0)} aria-label="UAT Passed" />
                  <input type="number" min={0} value={uatFailed} onChange={e => setUatFailed(Number(e.target.value) || 0)} aria-label="UAT Failed" />
                  <input type="number" min={0} value={uatBlocked} onChange={e => setUatBlocked(Number(e.target.value) || 0)} aria-label="UAT Blocked" />
                </div>
              </div>
            </div>
            <pre className="sovereign-code-box"><code>{sqlReconScript}</code></pre>
            <pre className="sovereign-code-box"><code>{uatSignOffDoc}</code></pre>
            <div className="sovereign-action-bar">
              <button type="button" className="sovereign-btn primary" onClick={() => copyText('sql-recon', sqlReconScript)}>
                {copiedKey === 'sql-recon' ? <Check size={14} /> : <Database size={14} />} {en ? 'Copy SQL Recon Script' : 'Salin Skrip SQL Recon'}
              </button>
              <button type="button" className="sovereign-btn" onClick={() => copyText('uat-signoff', uatSignOffDoc)}>
                {copiedKey === 'uat-signoff' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy UAT Sign-Off Certificate' : 'Salin Dokumen Sign-Off UAT'}
              </button>
            </div>
          </article>
        </section>
      )}

      {/* PILLAR 03: IT BUSINESS ANALYST (BA) & PRODUCT HUB */}
      {activePillar === 'ba' && (
        <section className="sovereign-grid" data-testid="pillar-panel-ba" aria-label="Business Analyst and Product Hub">
          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">03A · BRD / USER STORY TO GHERKIN BDD COMPILER</span>
                <h2>{en ? 'Agile User Story, Gherkin (.feature) & NFR Compiler' : 'Kompilator User Story, Gherkin (.feature) & NFR'}</h2>
                <p>{en ? 'Transform business requirements into executable Given/When/Then Scenario Outlines.' : 'Ubah kebutuhan bisnis menjadi spesifikasi Gherkin Given/When/Then siap pakai.'}</p>
              </div>
              <span className="sovereign-status-chip ok">BDD READY</span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="ba-role-input">{en ? 'Actor / Persona Role' : 'Peran Aktor / Pengguna'}</label>
                <input id="ba-role-input" value={baRole} onChange={e => setBaRole(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="ba-sla-input">{en ? 'Target P95 SLA (ms)' : 'Target SLA P95 (ms)'}</label>
                <input id="ba-sla-input" type="number" min={10} max={10000} value={baSlaMs} onChange={e => setBaSlaMs(Number(e.target.value) || 200)} />
              </div>
            </div>
            <div className="sovereign-field">
              <label htmlFor="ba-cap-input">{en ? 'Desired Capability (I want to...)' : 'Kapabilitas Fitur (Saya ingin...)'}</label>
              <input id="ba-cap-input" value={baCapability} onChange={e => setBaCapability(e.target.value)} />
            </div>
            <div className="sovereign-field">
              <label htmlFor="ba-val-input">{en ? 'Business Value (So that...)' : 'Nilai Bisnis (Agar...)'}</label>
              <input id="ba-val-input" value={baValue} onChange={e => setBaValue(e.target.value)} />
            </div>
            <div className="sovereign-field">
              <label htmlFor="ba-rule-input">{en ? 'Core Business Rule & Constraint' : 'Aturan Bisnis & Batasan Utama'}</label>
              <input id="ba-rule-input" value={baRule} onChange={e => setBaRule(e.target.value)} />
            </div>
            <pre className="sovereign-code-box" data-testid="ba-gherkin-output"><code>{gherkinSpec}</code></pre>
            <div className="sovereign-action-bar">
              <button type="button" className="sovereign-btn primary" onClick={() => copyText('gherkin', gherkinSpec)}>
                {copiedKey === 'gherkin' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy Gherkin (.feature)' : 'Salin Gherkin (.feature)'}
              </button>
            </div>
          </article>

          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">03B · BI-DIRECTIONAL REQUIREMENT TRACEABILITY MATRIX (RTM)</span>
                <h2>{en ? 'RTM Coverage Mapper & Gap Detector' : 'Pemeta Matriks Ketertelusuran (RTM) & Detektor Celah'}</h2>
                <p>{en ? 'Map BRD ↔ FSD/API ↔ QA Test Cases ↔ Jira Keys and automatically flag uncovered requirements.' : 'Petakan BRD ↔ FSD/API ↔ Test Case QA ↔ Kunci Jira dan deteksi otomatis kebutuhan tanpa pengujian.'}</p>
              </div>
              <span data-testid="ba-rtm-coverage" className={rtmStats.gaps === 0 && rtmStats.orphans === 0 ? 'sovereign-status-chip ok' : 'sovereign-status-chip warn'}>
                {rtmStats.pct}% COVERED · {rtmStats.gaps} GAPS · {rtmStats.orphans} ORPHANS
              </span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="rtm-brd-input">BRD ID</label>
                <input id="rtm-brd-input" value={newBrdId} onChange={e => setNewBrdId(e.target.value)} placeholder="BRD-RISK-04" />
              </div>
              <div className="sovereign-field">
                <label htmlFor="rtm-fsd-input">FSD / API Endpoint</label>
                <input id="rtm-fsd-input" value={newFsd} onChange={e => setNewFsd(e.target.value)} placeholder="POST /v2/..." />
              </div>
              <div className="sovereign-field">
                <label htmlFor="rtm-tc-input">QA / UAT Test ID</label>
                <input id="rtm-tc-input" value={newTcId} onChange={e => setNewTcId(e.target.value)} placeholder="TC-QA-310" />
              </div>
              <div className="sovereign-field">
                <label htmlFor="rtm-jira-input">Jira Issue Key</label>
                <input id="rtm-jira-input" value={newJira} onChange={e => setNewJira(e.target.value)} placeholder="ENT-512" />
              </div>
            </div>
            <div className="sovereign-field">
              <label htmlFor="rtm-req-input">{en ? 'Business Requirement Description' : 'Deskripsi Kebutuhan Bisnis'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input id="rtm-req-input" style={{ flex: 1 }} value={newReqText} onChange={e => setNewReqText(e.target.value)} />
                <button type="button" className="sovereign-btn primary" onClick={addRtmRow}>
                  + {en ? 'Add Trace Row' : 'Tambah Baris RTM'}
                </button>
              </div>
            </div>
            <div className="sovereign-table-wrap">
              <table className="sovereign-table">
                <thead>
                  <tr>
                    <th>BRD ID</th>
                    <th>{en ? 'Requirement' : 'Kebutuhan Bisnis'}</th>
                    <th>FSD / API</th>
                    <th>Test Case</th>
                    <th>Jira</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rtmRows.map((row, idx) => (
                    <tr key={`${row.brdId}-${idx}`}>
                      <td><code>{row.brdId || '—'}</code></td>
                      <td>{row.requirement}</td>
                      <td><code>{row.fsdEndpoint}</code></td>
                      <td><code>{row.testCaseId || 'UNCOVERED'}</code></td>
                      <td><code>{row.jiraKey}</code></td>
                      <td>
                        <span className={row.status === 'Covered' ? 'sovereign-status-chip ok' : row.status === 'Gap' ? 'sovereign-status-chip err' : 'sovereign-status-chip warn'}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sovereign-action-bar">
              <button type="button" className="sovereign-btn primary" onClick={() => copyText('rtm-md', rtmStats.markdown)}>
                {copiedKey === 'rtm-md' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy RTM Table (Markdown)' : 'Salin Tabel RTM (Markdown)'}
              </button>
            </div>
          </article>
        </section>
      )}

      {/* PILLAR 04: JIRA NEURAL AUTOMATION HUB */}
      {activePillar === 'jira' && (
        <section className="sovereign-grid" data-testid="pillar-panel-jira" aria-label="Jira Neural Automation Hub">
          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">04A · JIRA REST API V3 & ADF PAYLOAD SYNTHESIZER</span>
                <h2>{en ? 'Automated Jira Ticket & Risk-Based SLA Matrix' : 'Generator Tiket Jira Otomatis & Matriks SLA Risiko'}</h2>
                <p>{en ? 'Synthesize Atlassian Document Format (ADF) JSON, Jira Markdown, and cURL webhooks with objective priority scoring.' : 'Hasilkan JSON Atlassian Document Format (ADF), Markdown Jira, dan cURL dengan perhitungan prioritas objektif.'}</p>
              </div>
              <span data-testid="jira-computed-priority" className={jiraRisk.riskScore >= 50 ? 'sovereign-status-chip err' : 'sovereign-status-chip warn'}>
                {jiraRisk.priorityCode} · SCORE {jiraRisk.riskScore}/100
              </span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="jira-project-input">Project Key</label>
                <input id="jira-project-input" value={jiraProject} onChange={e => setJiraProject(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="jira-type-select">Issue Type</label>
                <select id="jira-type-select" value={jiraType} onChange={e => setJiraType(e.target.value as JiraIssueType)}>
                  <option value="Bug">Bug</option>
                  <option value="Story">Story</option>
                  <option value="Task">Task</option>
                  <option value="Epic">Epic</option>
                </select>
              </div>
              <div className="sovereign-field">
                <label htmlFor="jira-env-select">Environment</label>
                <select id="jira-env-select" value={jiraEnv} onChange={e => setJiraEnv(e.target.value as JiraEnvironment)}>
                  <option value="DEV">DEV</option>
                  <option value="SIT">SIT</option>
                  <option value="UAT">UAT</option>
                  <option value="STAGING">STAGING</option>
                  <option value="PROD">PROD</option>
                </select>
              </div>
              <div className="sovereign-field">
                <label htmlFor="jira-module-input">Module</label>
                <input id="jira-module-input" value={jiraModule} onChange={e => setJiraModule(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="jira-impact-select">{en ? 'Business Impact (1-5)' : 'Dampak Bisnis (1-5)'}</label>
                <select id="jira-impact-select" value={jiraImpact} onChange={e => setJiraImpact(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
                  <option value={5}>5 — Catastrophic / Financial Loss</option>
                  <option value={4}>4 — Severe / Core Flow Blocked</option>
                  <option value={3}>3 — Moderate / Feature Degraded</option>
                  <option value={2}>2 — Minor / Workaround Available</option>
                  <option value={1}>1 — Cosmetic / UI Alignment</option>
                </select>
              </div>
              <div className="sovereign-field">
                <label htmlFor="jira-likelihood-select">{en ? 'Occurrence Frequency (1-5)' : 'Frekuensi Kejadian (1-5)'}</label>
                <select id="jira-likelihood-select" value={jiraLikelihood} onChange={e => setJiraLikelihood(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
                  <option value={5}>5 — 100% Reproducible</option>
                  <option value={4}>4 — Frequent (&gt;50% of runs)</option>
                  <option value={3}>3 — Intermittent (10-50%)</option>
                  <option value={2}>2 — Rare (&lt;10%)</option>
                  <option value={1}>1 — Edge Case</option>
                </select>
              </div>
            </div>
            <div className="sovereign-field">
              <label htmlFor="jira-summary-input">{en ? 'Issue Summary' : 'Ringkasan Tiket Jira'}</label>
              <input id="jira-summary-input" value={jiraSummary} onChange={e => setJiraSummary(e.target.value)} />
            </div>
            <div className="sovereign-field">
              <label htmlFor="jira-steps-textarea">{en ? 'Steps to Reproduce / Acceptance Criteria (1 per line)' : 'Langkah Reproduksi / Kriteria (1 per baris)'}</label>
              <textarea id="jira-steps-textarea" value={jiraStepsText} onChange={e => setJiraStepsText(e.target.value)} />
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="jira-expected-input">{en ? 'Expected Result' : 'Ekspektasi Hasil'}</label>
                <input id="jira-expected-input" value={jiraExpected} onChange={e => setJiraExpected(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="jira-actual-input">{en ? 'Actual Result / Business Value' : 'Hasil Aktual / Nilai Bisnis'}</label>
                <input id="jira-actual-input" value={jiraActual} onChange={e => setJiraActual(e.target.value)} />
              </div>
            </div>
            <div className="sovereign-field">
              <label htmlFor="jira-evidence-input">{en ? 'SQL / JSON / Log Evidence Snippet' : 'Bukti SQL / JSON / Log'}</label>
              <input id="jira-evidence-input" value={jiraEvidence} onChange={e => setJiraEvidence(e.target.value)} />
            </div>
            <pre className="sovereign-code-box" data-testid="jira-output-box"><code>{jiraJsonPayload}</code></pre>
            <div className="sovereign-action-bar">
              <button type="button" className="sovereign-btn primary" onClick={() => copyText('jira-json', jiraJsonPayload)}>
                {copiedKey === 'jira-json' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy Jira API v3 JSON' : 'Salin JSON Jira API v3'}
              </button>
              <button type="button" className="sovereign-btn" onClick={() => copyText('jira-md', jiraMarkdown)}>
                {copiedKey === 'jira-md' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy Jira Markdown' : 'Salin Markdown Jira'}
              </button>
              <button type="button" className="sovereign-btn" onClick={() => copyText('jira-curl', jiraCurl)}>
                {copiedKey === 'jira-curl' ? <Check size={14} /> : <Terminal size={14} />} {en ? 'Copy cURL Webhook' : 'Salin Perintah cURL'}
              </button>
            </div>
          </article>

          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">04B · VISUAL JQL STUDIO & SPRINT HYGIENE ENGINE</span>
                <h2>{en ? 'Visual JQL Query Builder & Release Gate Filters' : 'Generator Kueri JQL Visual & Filter Gerbang Rilis'}</h2>
                <p>{en ? 'Build advanced Jira Query Language filters for UAT blockers, scope creep, and release readiness.' : 'Bangun filter JQL tingkat lanjut untuk deteksi blocker UAT, scope creep sprint, dan kesiapan rilis.'}</p>
              </div>
              <span className="sovereign-status-chip ok">JQL VERIFIED</span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="jql-preset-select">{en ? 'JQL Hygiene Preset' : 'Preset JQL Sprint'}</label>
                <select id="jql-preset-select" value={jqlPreset} onChange={e => setJqlPreset(e.target.value as JqlStudioConfig['preset'])}>
                  <option value="uat-blockers">{en ? 'UAT Blocker Detection' : 'Deteksi Blocker UAT'}</option>
                  <option value="scope-creep">{en ? 'Active Sprint Scope Creep & Stale Issues' : 'Deteksi Scope Creep Sprint Aktif'}</option>
                  <option value="release-gate">{en ? 'Release Gate: Zero Open Critical Defects' : 'Validasi Rilis: Zero Open Critical Bugs'}</option>
                  <option value="sla-triage">{en ? 'Unassigned High-Priority SLA Triage' : 'Triase Tiket Prioritas Tinggi Tanpa PIC'}</option>
                  <option value="custom">{en ? 'Custom FixVersion + Label Filter' : 'Filter Kustom Versi Rilis + Label'}</option>
                </select>
              </div>
              <div className="sovereign-field">
                <label htmlFor="jql-version-input">Fix Version</label>
                <input id="jql-version-input" value={jqlVersion} onChange={e => setJqlVersion(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="jql-label-input">Target Label</label>
                <input id="jql-label-input" value={jqlLabel} onChange={e => setJqlLabel(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="jql-days-input">{en ? 'Stale Threshold (Days)' : 'Ambang Stagnan (Hari)'}</label>
                <input id="jql-days-input" type="number" min={1} max={30} value={jqlStaleDays} onChange={e => setJqlStaleDays(Number(e.target.value) || 3)} />
              </div>
            </div>
            <pre className="sovereign-code-box" data-testid="jql-output-box"><code>{jqlQuery}</code></pre>
            <pre className="sovereign-code-box"><code>{jiraMarkdown}</code></pre>
            <div className="sovereign-action-bar">
              <button type="button" className="sovereign-btn primary" onClick={() => copyText('jql-query', jqlQuery)}>
                {copiedKey === 'jql-query' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy JQL Query' : 'Salin Kueri JQL'}
              </button>
            </div>
          </article>
        </section>
      )}

      {/* PILLAR 05: PM MONTE CARLO & DELIVERY OBSERVATORY */}
      {activePillar === 'pm' && (
        <section className="sovereign-grid" data-testid="pillar-panel-pm" aria-label="IT Project Manager Monte Carlo and EVM">
          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">05A · MONTE CARLO PROBABILISTIC SPRINT FORECASTER</span>
                <h2>{en ? '10,000-Trial Release Confidence Simulator (P50 / P85 / P95)' : 'Simulator Peramalan Rilis Monte Carlo (10.000 Iterasi)'}</h2>
                <p>{en ? 'Replace single-point date guesses with probabilistic throughput simulations.' : 'Gantikan tebakan tanggal rilis tunggal dengan simulasi probabilistik berbasis histori velocity.'}</p>
              </div>
              <span className="sovereign-status-chip ok">M = {monteCarloResult.trials.toLocaleString('en-US')} TRIALS</span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="mc-velocity-input">{en ? 'Historical Sprint Velocities (CSV)' : 'Histori Velocity Sprint (dipisah koma)'}</label>
                <input id="mc-velocity-input" value={velocityHistoryText} onChange={e => setVelocityHistoryText(e.target.value)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="mc-backlog-input">{en ? 'Remaining Backlog (Story Points)' : 'Sisa Backlog (Story Points)'}</label>
                <input id="mc-backlog-input" type="number" min={1} max={10000} value={remainingBacklogPoints} onChange={e => setRemainingBacklogPoints(Number(e.target.value) || 10)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="mc-days-input">{en ? 'Sprint Length (Days)' : 'Durasi Sprint (Hari)'}</label>
                <input id="mc-days-input" type="number" min={5} max={30} value={sprintDays} onChange={e => setSprintDays(Number(e.target.value) || 14)} />
              </div>
            </div>
            <div className="sovereign-metrics-row">
              <div className="sovereign-metric-box">
                <span>P50 (OPTIMISTIC)</span>
                <strong>{monteCarloResult.p50Sprints} Sprints</strong>
                <small>ETA: {monteCarloResult.p50Date}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>P85 (COMMITMENT)</span>
                <strong data-testid="pm-p85-sprints">{monteCarloResult.p85Sprints} Sprints</strong>
                <small>ETA: {monteCarloResult.p85Date}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>P95 (SAFE BUFFER)</span>
                <strong>{monteCarloResult.p95Sprints} Sprints</strong>
                <small>ETA: {monteCarloResult.p95Date}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>MEAN VELOCITY</span>
                <strong>{monteCarloResult.avgVelocity} pts</strong>
                <small>{en ? 'Per sprint' : 'Per sprint'}</small>
              </div>
            </div>
            <div className="sovereign-bars">
              {monteCarloResult.histogram.map(bucket => (
                <div className="sovereign-bar-row" key={bucket.sprints}>
                  <span>{bucket.sprints} sprints</span>
                  <div className="sovereign-bar-track">
                    <div className="sovereign-bar-fill" style={{ width: `${Math.min(100, bucket.probabilityPct * 2.2)}%` }} />
                  </div>
                  <strong>{bucket.probabilityPct}%</strong>
                </div>
              ))}
            </div>
            <div className="sovereign-action-bar">
              <button
                type="button"
                className="sovereign-btn primary"
                onClick={() =>
                  copyText(
                    'mc-report',
                    `# Executive Monte Carlo Release Forecast (10,000 Trials)\n- Backlog: ${remainingBacklogPoints} pts | Mean Velocity: ${monteCarloResult.avgVelocity} pts/sprint\n- P50 (50% Confidence): ${monteCarloResult.p50Sprints} sprints (${monteCarloResult.p50Date})\n- P85 (85% Enterprise Commitment): ${monteCarloResult.p85Sprints} sprints (${monteCarloResult.p85Date})\n- P95 (95% Executive Buffer): ${monteCarloResult.p95Sprints} sprints (${monteCarloResult.p95Date})`,
                  )
                }
              >
                {copiedKey === 'mc-report' ? <Check size={14} /> : <Copy size={14} />}{' '}
                {en ? 'Copy Executive Forecast Report' : 'Salin Laporan Peramalan Eksekutif'}
              </button>
            </div>
          </article>

          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">05B · EARNED VALUE MANAGEMENT (EVM) CALCULATOR</span>
                <h2>{en ? 'Real-Time Project SPI, CPI & EAC Financial Health' : 'Kalkulator Kesehatan Proyek EVM (SPI, CPI & EAC)'}</h2>
                <p>{en ? 'Compute Schedule Performance Index (SPI), Cost Performance Index (CPI), and Estimate at Completion (EAC).' : 'Hitung indeks performa jadwal (SPI), indeks biaya (CPI), dan estimasi biaya akhir (EAC).'}</p>
              </div>
              <span className={Number(evmMetrics.cpi) >= 1 && Number(evmMetrics.spi) >= 0.95 ? 'sovereign-status-chip ok' : 'sovereign-status-chip warn'}>
                SPI {evmMetrics.spi} · CPI {evmMetrics.cpi}
              </span>
            </div>
            <div className="sovereign-form-grid">
              <div className="sovereign-field">
                <label htmlFor="evm-bac-input">BAC — Budget at Completion ($)</label>
                <input id="evm-bac-input" type="number" min={1000} value={evmBac} onChange={e => setEvmBac(Number(e.target.value) || 1000)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="evm-pv-input">PV — Planned Value ($)</label>
                <input id="evm-pv-input" type="number" min={100} value={evmPv} onChange={e => setEvmPv(Number(e.target.value) || 100)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="evm-ev-input">EV — Earned Value ($)</label>
                <input id="evm-ev-input" type="number" min={100} value={evmEv} onChange={e => setEvmEv(Number(e.target.value) || 100)} />
              </div>
              <div className="sovereign-field">
                <label htmlFor="evm-ac-input">AC — Actual Cost ($)</label>
                <input id="evm-ac-input" type="number" min={100} value={evmAc} onChange={e => setEvmAc(Number(e.target.value) || 100)} />
              </div>
            </div>
            <div className="sovereign-metrics-row">
              <div className="sovereign-metric-box">
                <span>SPI (EV / PV)</span>
                <strong data-testid="pm-spi">{evmMetrics.spi}</strong>
                <small>{evmMetrics.scheduleStatus}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>CPI (EV / AC)</span>
                <strong data-testid="pm-cpi">{evmMetrics.cpi}</strong>
                <small>{evmMetrics.costStatus}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>EAC (BAC / CPI)</span>
                <strong>${evmMetrics.eac}</strong>
                <small>{en ? 'Projected total cost' : 'Proyeksi biaya total'}</small>
              </div>
              <div className="sovereign-metric-box">
                <span>VAC (BAC - EAC)</span>
                <strong>${evmMetrics.vac}</strong>
                <small>{en ? 'Variance at completion' : 'Selisih anggaran akhir'}</small>
              </div>
            </div>
            <pre className="sovereign-code-box">
              <code>
                {[
                  `# Project EVM & Delivery Governance Summary`,
                  `- Budget at Completion (BAC): $${evmBac.toLocaleString('en-US')}`,
                  `- Schedule Performance Index (SPI = EV/PV): ${evmMetrics.spi} (${evmMetrics.scheduleStatus})`,
                  `- Cost Performance Index (CPI = EV/AC): ${evmMetrics.cpi} (${evmMetrics.costStatus})`,
                  `- Estimate at Completion (EAC = BAC/CPI): $${evmMetrics.eac}`,
                  `- Variance at Completion (VAC = BAC - EAC): $${evmMetrics.vac}`,
                ].join('\n')}
              </code>
            </pre>
            <div className="sovereign-action-bar">
              <button
                type="button"
                className="sovereign-btn primary"
                onClick={() =>
                  copyText(
                    'evm-report',
                    `EVM Health | BAC=$${evmBac} | SPI=${evmMetrics.spi} (${evmMetrics.scheduleStatus}) | CPI=${evmMetrics.cpi} (${evmMetrics.costStatus}) | EAC=$${evmMetrics.eac}`,
                  )
                }
              >
                {copiedKey === 'evm-report' ? <Check size={14} /> : <Copy size={14} />} {en ? 'Copy EVM Governance Report' : 'Salin Laporan EVM'}
              </button>
            </div>
          </article>
        </section>
      )}

      {/* PILLAR 06: DEVSECOPS & KNOWLEDGE LOG */}
      {activePillar === 'sec' && (
        <section className="sovereign-grid" data-testid="pillar-panel-sec" aria-label="DevSecOps and Knowledge Log">
          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">06A · ZERO-TRUST CI/CD & CYCLONEDX SBOM AUDITOR</span>
                <h2>{en ? 'Pipeline Security Readiness & Attestation Gate' : 'Auditor Kesiapan Keamanan Pipeline & SBOM'}</h2>
                <p>{en ? 'Audit ephemeral OIDC credentials, Cosign container signing, SAST/DAST gates, and CycloneDX SBOM attestation.' : 'Audit kredensial OIDC sementara, tanda tangan Cosign, gerbang SAST/DAST, dan atestasi CycloneDX SBOM.'}</p>
              </div>
              <span data-testid="sec-compliance-score" className={secScore >= 85 ? 'sovereign-status-chip ok' : 'sovereign-status-chip warn'}>
                SCORE {secScore} / 100
              </span>
            </div>
            <div className="sovereign-form-grid">
              {[
                { key: 'oidc', label: en ? 'OIDC Ephemeral Cloud Credentials (No static long-lived keys)' : 'Kredensial Cloud OIDC Sementara (Tanpa kunci statis)' },
                { key: 'sast', label: en ? 'Automated SAST & Type-Safety Gate on Every PR' : 'Gerbang SAST & Type-Safety Otomatis di Setiap PR' },
                { key: 'sbom', label: en ? 'CycloneDX / SPDX SBOM Provenance Attestation' : 'Atestasi Provenance SBOM CycloneDX / SPDX' },
                { key: 'cosign', label: en ? 'Sigstore Cosign Artifact & Container Signing' : 'Penandatanganan Artefak & Kontainer Sigstore Cosign' },
                { key: 'secrets', label: en ? 'Pre-Commit & CI Secret Scanning Blockers' : 'Pemindaian Rahasia/Token di Pre-Commit & CI' },
                { key: 'leastPrivilege', label: en ? 'Least-Privilege GITHUB_TOKEN (contents: read)' : 'Izin Minimum GITHUB_TOKEN (contents: read)' },
                { key: 'dast', label: en ? 'Automated DAST & Security Header Verification' : 'Verifikasi Otomatis DAST & Header Keamanan' },
                { key: 'branchProtection', label: en ? 'Signed Commits & Required Status Checks on main' : 'Komit Bertanda Tangan & Status Check Wajib di main' },
              ].map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(secGates[item.key])}
                    onChange={() => setSecGates(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <pre className="sovereign-code-box">
              <code>
                {[
                  `# Zero-Trust CI/CD & Supply Chain Compliance Certificate`,
                  `- Readiness Score: ${secScore}/100`,
                  `- Verified Controls: ${Object.entries(secGates).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(', ')}`,
                  `- Pending Controls: ${Object.entries(secGates).filter(([, v]) => !v).map(([k]) => k.toUpperCase()).join(', ') || 'NONE (100% COMPLIANT)'}`,
                ].join('\n')}
              </code>
            </pre>
            <div className="sovereign-action-bar">
              <button
                type="button"
                className="sovereign-btn primary"
                onClick={() => copyText('sec-audit', `Zero-Trust CI/CD Compliance Score: ${secScore}/100`)}
              >
                {copiedKey === 'sec-audit' ? <Check size={14} /> : <ShieldCheck size={14} />}{' '}
                {en ? 'Copy Security Audit Report' : 'Salin Laporan Audit Keamanan'}
              </button>
              <Link className="sovereign-btn" to="/supply-chain-intelligence">
                <Layers3 size={14} /> {en ? 'Open Full SBOM Inspector' : 'Buka Inspektur SBOM Lengkap'}
              </Link>
            </div>
          </article>

          <article className="sovereign-panel">
            <div className="sovereign-panel-head">
              <div>
                <span className="sovereign-kicker">06B · INTERACTIVE ENGINEERING KNOWLEDGE LOG</span>
                <h2>{en ? 'Executable Architecture Blueprints & Guides' : 'Panduan Arsitektur & Blueprint Rekayasa'}</h2>
                <p>{en ? 'Deep-dive bilingual notes with reference code blocks, Table of Contents, and reading progress.' : 'Catatan rekayasa dwibahasa lengkap dengan blok kode referensi dan daftar isi interaktif.'}</p>
              </div>
              <span className="sovereign-status-chip ok">{articles.length} BLUEPRINTS</span>
            </div>
            <div className="sovereign-table-wrap">
              <table className="sovereign-table">
                <thead>
                  <tr>
                    <th>{en ? 'Blueprint Title' : 'Judul Panduan'}</th>
                    <th>{en ? 'Discipline' : 'Disiplin'}</th>
                    <th>{en ? 'Read Time' : 'Durasi'}</th>
                    <th>{en ? 'Action' : 'Aksi'}</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map(art => {
                    const tr = en ? articleTranslations[art.slug] : undefined
                    return (
                      <tr key={art.slug}>
                        <td><strong>{tr?.title ?? art.title}</strong></td>
                        <td>{art.category}</td>
                        <td><code>{en ? art.readTime.replace('menit', 'min read') : `${art.readTime} baca`}</code></td>
                        <td>
                          <Link className="sovereign-btn" to={`/blog/${art.slug}`}>
                            <BookOpen size={13} /> {en ? 'Read' : 'Baca'} <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}
    </main>
  )
}
