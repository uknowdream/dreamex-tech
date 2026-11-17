import type {
  JiraIssue,
  JiraIssueKind,
  JiraPriorityLevel,
  JiraStatusId,
  VelocityRecord,
} from './JiraEnterpriseBoard'

export type JiraReleaseVersionId = 'v7.0.0' | 'v7.1.0' | 'v7.2.0'

export interface JiraReleaseVersion {
  id: JiraReleaseVersionId
  name: string
  targetDate: string
  status: 'released' | 'in_progress' | 'planned'
  summaryEn: string
  summaryId: string
}

export interface AutonomousRecommendation {
  id: string
  kind: 'critical_blocker' | 'burnout_overload' | 'undecomposed_story' | 'sla_breach_risk' | 'next_sprint_gap'
  severity: 'critical' | 'high' | 'medium'
  horizonLabelEn: string
  horizonLabelId: string
  titleEn: string
  titleId: string
  rationaleEn: string
  rationaleId: string
  impactEn: string
  impactId: string
  targetKey?: string
}

export interface PredictiveHorizonReport {
  confidenceScore: number
  predictedSpilloverSp: number
  optimalNextSprintPullSp: number
  burnoutEngineers: { name: string; sp: number }[]
  slaAtRiskKeys: string[]
  recommendations: AutonomousRecommendation[]
  horizons: {
    id: string
    windowEn: string
    windowId: string
    headlineEn: string
    headlineId: string
    detailEn: string
    detailId: string
    health: 'optimal' | 'watch' | 'risk'
  }[]
}

export const INITIAL_RELEASES: JiraReleaseVersion[] = [
  {
    id: 'v7.0.0',
    name: 'v7.0.0 · Sovereign Agile Core',
    targetDate: '2026-11-17',
    status: 'released',
    summaryEn: 'Baseline Zero-Trust auth rotation, CSP/SSRF edge hardening, and 5-column Kanban core.',
    summaryId: 'Fondasi rotasi autentikasi Zero-Trust, hardening edge CSP/SSRF, dan inti Kanban 5 kolom.',
  },
  {
    id: 'v7.1.0',
    name: 'v7.1.0 · Autonomous Self-Healing Settlement',
    targetDate: '2026-11-30',
    status: 'in_progress',
    summaryEn: 'Idempotent T+0 ledger outbox, self-healing Playwright locators, and Gherkin RTM automation.',
    summaryId: 'Outbox ledger idempoten T+0, locator Playwright self-healing, dan otomasi RTM Gherkin.',
  },
  {
    id: 'v7.2.0',
    name: 'v7.2.0 · Multi-Agent MCP & SBOM Gate',
    targetDate: '2026-12-18',
    status: 'planned',
    summaryEn: 'CycloneDX CI vulnerability gate, streamable MCP IDE tools, and multi-region token failover.',
    summaryId: 'Gerbang kerentanan CI CycloneDX, tool IDE MCP streamable, dan failover token multi-region.',
  },
]

const ENGINEER_SKILLS: Record<string, JiraIssueKind[]> = {
  Rizky: ['story', 'bug', 'task'],
  Nadia: ['task', 'bug', 'story'],
  Dimas: ['story', 'task'],
  Alya: ['security', 'bug', 'task'],
  Bima: ['story', 'task'],
}

export function computeIssueSlaState(
  issue: JiraIssue,
): { slaHours: number; status: 'met' | 'ok' | 'at_risk' | 'breached'; labelEn: string; labelId: string } {
  const slaMap: Record<JiraPriorityLevel, number> = {
    Highest: 4,
    High: 24,
    Medium: 72,
    Low: 168,
  }
  const slaHours = slaMap[issue.priority]
  if (issue.status === 'done') {
    return { slaHours, status: 'met', labelEn: `SLA Met (${slaHours}h)`, labelId: `SLA Terpenuhi (${slaHours}j)` }
  }
  if (issue.status === 'blocked') {
    return {
      slaHours,
      status: issue.priority === 'Highest' ? 'breached' : 'at_risk',
      labelEn: issue.priority === 'Highest' ? `SLA BREACH (${slaHours}h)` : `SLA Paused / Risk`,
      labelId: issue.priority === 'Highest' ? `SLA TERLEWATI (${slaHours}j)` : `SLA Berisiko`,
    }
  }
  if (issue.priority === 'Highest' && issue.status === 'todo') {
    return { slaHours, status: 'at_risk', labelEn: `SLA ${slaHours}h · Urgent`, labelId: `SLA ${slaHours}j · Mendesak` }
  }
  return { slaHours, status: 'ok', labelEn: `SLA ${slaHours}h OK`, labelId: `SLA ${slaHours}j Aman` }
}

export function analyzeForwardHorizon(
  issues: readonly JiraIssue[],
  velocityHistory: readonly VelocityRecord[],
  wipLimits: Record<JiraStatusId, number>,
): PredictiveHorizonReport {
  const activeSprint = issues.filter(i => i.sprintId === 'sprint-24')
  const nextSprint = issues.filter(i => i.sprintId === 'sprint-25')
  const backlog = issues.filter(i => i.sprintId === 'backlog')

  const avgVel =
    velocityHistory.length > 0
      ? Math.round(velocityHistory.reduce((s, v) => s + v.completed, 0) / velocityHistory.length)
      : 38

  const activeTotalSp = activeSprint.reduce((s, i) => s + i.points, 0)
  const activeDoneSp = activeSprint.filter(i => i.status === 'done').reduce((s, i) => s + i.points, 0)
  const activeRemainingSp = activeTotalSp - activeDoneSp

  const recommendations: AutonomousRecommendation[] = []

  // 1. Cascading Blocker Detection
  const blockedActive = activeSprint.filter(i => i.status === 'blocked' || Boolean(i.blockedByKey))
  for (const blk of blockedActive) {
    const upstream = blk.blockedByKey ? issues.find(u => u.key === blk.blockedByKey) : undefined
    if (!upstream || upstream.status !== 'done') {
      recommendations.push({
        id: `rec-blk-${blk.id}`,
        kind: 'critical_blocker',
        severity: 'critical',
        horizonLabelEn: 'T+48h · Critical Path',
        horizonLabelId: 'T+48j · Jalur Kritis',
        titleEn: `Unblock ${blk.key} by fast-tracking ${blk.blockedByKey || 'upstream dependency'}`,
        titleId: `Bebaskan hambatan ${blk.key} dengan memprioritaskan ${blk.blockedByKey || 'dependensi hulu'}`,
        rationaleEn: `${blk.key} (${blk.points} SP, ${blk.priority}) cannot finish until ${blk.blockedByKey || 'its blocker'} reaches Done, creating a 74% sprint spillover probability.`,
        rationaleId: `${blk.key} (${blk.points} SP, ${blk.priority}) tertahan oleh ${blk.blockedByKey || 'blocker'} yang belum selesai, memicu risiko keterlambatan sprint 74%.`,
        impactEn: `+${blk.points} SP sprint velocity protected`,
        impactId: `Melindungi +${blk.points} SP velocity sprint`,
        targetKey: blk.key,
      })
    }
  }

  // 2. Engineer Burnout & Load Imbalance Detection
  const engineers = Object.keys(ENGINEER_SKILLS)
  const loadByEngineer = engineers.map(name => ({
    name,
    sp: issues.filter(i => i.assignee === name && i.status !== 'done' && i.sprintId === 'sprint-24').reduce((s, i) => s + i.points, 0),
  }))
  const burnoutEngineers = loadByEngineer.filter(e => e.sp > 11)
  const lightestEngineer = [...loadByEngineer].sort((a, b) => a.sp - b.sp)[0]

  for (const overloaded of burnoutEngineers) {
    recommendations.push({
      id: `rec-load-${overloaded.name}`,
      kind: 'burnout_overload',
      severity: 'high',
      horizonLabelEn: 'T+5d · Capacity & Burnout',
      horizonLabelId: 'T+5h · Kapasitas & Beban Tim',
      titleEn: `Rebalance ${overloaded.name}'s ${overloaded.sp} SP load -> shift 1 ticket to ${lightestEngineer.name} (${lightestEngineer.sp} SP)`,
      titleId: `Seimbangkan beban ${overloaded.name} (${overloaded.sp} SP) -> alihkan 1 tiket ke ${lightestEngineer.name} (${lightestEngineer.sp} SP)`,
      rationaleEn: `${overloaded.name} exceeds the safe single-sprint cognitive cap (11 SP), increasing cycle time & defect escape risk.`,
      rationaleId: `Beban aktif ${overloaded.name} melampaui batas aman per sprint (11 SP), berpotensi memperlambat cycle time & memicu regresi.`,
      impactEn: '-32% bottleneck cycle time',
      impactId: '-32% waktu tunggu bottleneck',
    })
  }

  // 3. Undecomposed Large Stories (>= 8 SP with < 3 subtasks)
  const largeStories = issues.filter(i => i.status !== 'done' && i.points >= 8 && i.subtasks.length < 3)
  for (const large of largeStories) {
    recommendations.push({
      id: `rec-split-${large.id}`,
      kind: 'undecomposed_story',
      severity: 'medium',
      horizonLabelEn: 'T+7d · Execution Granularity',
      horizonLabelId: 'T+7h · Dekomposisi Eksekusi',
      titleEn: `Auto-decompose ${large.key} (${large.points} SP) into Architecture, API & Playwright subtasks`,
      titleId: `Pecah otomatis ${large.key} (${large.points} SP) menjadi subtask Arsitektur, API & Playwright`,
      rationaleEn: `8+ SP stories with fewer than 3 subtasks historically suffer 2.1x hidden scope creep late in the sprint.`,
      rationaleId: `Tiket >= 8 SP dengan kurang dari 3 subtask secara historis berisiko 2,1x mengalami pembengkakan scope di akhir sprint.`,
      impactEn: '+18% predictability & QA coverage',
      impactId: '+18% kepastian rilis & cakupan QA',
      targetKey: large.key,
    })
  }

  // 4. Next Sprint Proactive Auto-Planning Gap
  const safeTargetSp = Math.round(avgVel * 0.9)
  const nextSprintSp = nextSprint.reduce((s, i) => s + i.points, 0)
  const optimalNextSprintPullSp = Math.max(0, safeTargetSp - nextSprintSp)
  if (optimalNextSprintPullSp >= 5 && backlog.length > 0) {
    recommendations.push({
      id: 'rec-next-sprint-plan',
      kind: 'next_sprint_gap',
      severity: 'medium',
      horizonLabelEn: 'T+14d · Sprint 25 Pre-Planning',
      horizonLabelId: 'T+14h · Pra-Perencanaan Sprint 25',
      titleEn: `Pre-populate Sprint 25 with ${optimalNextSprintPullSp} SP from Product Backlog (${safeTargetSp} SP optimal target)`,
      titleId: `Isi otomatis Sprint 25 sebesar ${optimalNextSprintPullSp} SP dari Product Backlog (target optimal ${safeTargetSp} SP)`,
      rationaleEn: `Sprint 25 currently holds only ${nextSprintSp} SP against a 90% safe historical capacity of ${safeTargetSp} SP.`,
      rationaleId: `Sprint 25 baru terisi ${nextSprintSp} SP dibandingkan kapasitas aman 90% velocity historis sebesar ${safeTargetSp} SP.`,
      impactEn: 'Zero sprint-planning ceremony lag',
      impactId: 'Transisi antar-sprint langsung siap jalan',
    })
  }

  // 5. SLA Breach Risk
  const slaAtRiskKeys = activeSprint
    .filter(i => {
      const s = computeIssueSlaState(i).status
      return s === 'at_risk' || s === 'breached'
    })
    .map(i => i.key)

  if (slaAtRiskKeys.length > 0) {
    recommendations.push({
      id: 'rec-sla-guard',
      kind: 'sla_breach_risk',
      severity: 'high',
      horizonLabelEn: 'T+24h · SLA Governance',
      horizonLabelId: 'T+24j · Tata Kelola SLA',
      titleEn: `SLA escalation watch on ${slaAtRiskKeys.join(', ')}`,
      titleId: `Pengawasan eskalasi SLA pada ${slaAtRiskKeys.join(', ')}`,
      rationaleEn: `High/Highest priority items are either blocked or unstarted approaching SLA response windows.`,
      rationaleId: `Tiket prioritas tinggi masih terhambat atau belum dimulai mendekati batas waktu SLA.`,
      impactEn: '100% enterprise SLA compliance',
      impactId: '100% kepatuhan SLA enterprise',
    })
  }

  const wipBreachPenalty =
    (wipLimits.in_progress > 0 && activeSprint.filter(i => i.status === 'in_progress').length > wipLimits.in_progress ? 10 : 0) +
    (wipLimits.review > 0 && activeSprint.filter(i => i.status === 'review').length > wipLimits.review ? 8 : 0)

  const rawConfidence =
    94 -
    blockedActive.length * 9 -
    burnoutEngineers.length * 7 -
    largeStories.length * 4 -
    wipBreachPenalty
  const confidenceScore = Math.max(42, Math.min(99, rawConfidence))
  const predictedSpilloverSp = Math.max(0, activeRemainingSp - Math.round(avgVel * 0.72))

  return {
    confidenceScore,
    predictedSpilloverSp,
    optimalNextSprintPullSp,
    burnoutEngineers,
    slaAtRiskKeys,
    recommendations,
    horizons: [
      {
        id: 'h1',
        windowEn: 'HORIZON 01 · T+7 DAYS (CURRENT SPRINT)',
        windowId: 'HORIZON 01 · T+7 HARI (SPRINT SAAT INI)',
        headlineEn:
          predictedSpilloverSp === 0
            ? `On track to close 100% of ${activeTotalSp} SP`
            : `${predictedSpilloverSp} SP spillover risk detected`,
        headlineId:
          predictedSpilloverSp === 0
            ? `Diproyeksikan tuntas 100% dari ${activeTotalSp} SP`
            : `Terdeteksi risiko spillover ${predictedSpilloverSp} SP`,
        detailEn: `Confidence ${confidenceScore}% · ${blockedActive.length} blocker(s) · ${burnoutEngineers.length} overloaded engineer(s).`,
        detailId: `Keyakinan ${confidenceScore}% · ${blockedActive.length} blocker · ${burnoutEngineers.length} anggota beban berlebih.`,
        health: confidenceScore >= 85 ? 'optimal' : confidenceScore >= 70 ? 'watch' : 'risk',
      },
      {
        id: 'h2',
        windowEn: 'HORIZON 02 · T+21 DAYS (NEXT SPRINT)',
        windowId: 'HORIZON 02 · T+21 HARI (SPRINT BERIKUTNYA)',
        headlineEn: `Target ${safeTargetSp} SP safe velocity (${nextSprintSp} SP scheduled)`,
        headlineId: `Target kapasitas aman ${safeTargetSp} SP (${nextSprintSp} SP terjadwal)`,
        detailEn:
          optimalNextSprintPullSp > 0
            ? `Autopilot ready to pull ${optimalNextSprintPullSp} SP of dependency-free backlog stories.`
            : `Sprint 25 capacity buffer is optimally balanced at 90% historical velocity.`,
        detailId:
          optimalNextSprintPullSp > 0
            ? `Autopilot siap menarik ${optimalNextSprintPullSp} SP tiket siap-eksekusi dari backlog.`
            : `Kapasitas Sprint 25 sudah seimbang optimal pada 90% velocity historis.`,
        health: optimalNextSprintPullSp > 8 ? 'watch' : 'optimal',
      },
      {
        id: 'h3',
        windowEn: 'HORIZON 03 · T+42 DAYS (RELEASE v7.1 & v7.2)',
        windowId: 'HORIZON 03 · T+42 HARI (RILIS v7.1 & v7.2)',
        headlineEn: `v7.1.0 release gate & preventive chaos/security shield`,
        headlineId: `Gerbang rilis v7.1.0 & mitigasi preventif chaos/keamanan`,
        detailEn: `Autopilot monitors technical debt & synthesizes preventive resilience tasks before production cutover.`,
        detailId: `Autopilot memantau utang teknis & menyusun tiket mitigasi otomatis sebelum rilis produksi.`,
        health: slaAtRiskKeys.length > 0 ? 'watch' : 'optimal',
      },
    ],
  }
}

export function executeAutonomousSelfHeal(
  issues: readonly JiraIssue[],
  velocityHistory: readonly VelocityRecord[],
  nextSequence: number,
  en: boolean,
): { updatedIssues: JiraIssue[]; reasoningLogs: string[]; nextSequence: number } {
  let seq = nextSequence
  const logs: string[] = []
  const cloned: JiraIssue[] = issues.map(i => ({
    ...i,
    subtasks: [...i.subtasks],
    labels: [...i.labels],
    comments: [...i.comments],
  }))

  const engineers = Object.keys(ENGINEER_SKILLS)
  const getLoad = (name: string) =>
    cloned
      .filter(i => i.assignee === name && i.status !== 'done' && i.sprintId === 'sprint-24')
      .reduce((s, i) => s + i.points, 0)

  // Step 1: Unblock blocked tickets where upstream is done, or attach mitigation plan & promote priority
  for (const item of cloned) {
    if (item.status === 'blocked') {
      const upstream = item.blockedByKey ? cloned.find(u => u.key === item.blockedByKey) : undefined
      if (upstream && upstream.status === 'done') {
        item.status = 'in_progress'
        logs.push(
          en
            ? `[AUTOPILOT-UNBLOCK] ${item.key} automatically moved Blocked -> In Progress because ${upstream.key} is Done.`
            : `[AUTOPILOT-UNBLOCK] ${item.key} otomatis dipindahkan ke Dikerjakan karena blocker ${upstream.key} sudah Selesai.`,
        )
      } else {
        const hasMitigation = item.subtasks.some(s => s.title.toLowerCase().includes('contract stub'))
        if (!hasMitigation) {
          item.subtasks.push({
            id: `st-auto-${seq}`,
            title: `Create parallel contract stub / feature flag to decouple from ${item.blockedByKey || 'upstream'}`,
            done: true,
          })
          item.status = 'in_progress'
          logs.push(
            en
              ? `[AUTOPILOT-DECOUPLE] Injected contract-stub mitigation on ${item.key} & resumed In Progress flow.`
              : `[AUTOPILOT-DECOUPLE] Menyuntikkan stub kontrak paralel pada ${item.key} & melanjutkan progres kerja.`,
          )
        }
      }
    }
  }

  // Step 2: Rebalance overloaded engineers (> 11 SP in Sprint 24)
  for (const eng of engineers) {
    while (getLoad(eng) > 11) {
      const candidates = cloned.filter(
        i => i.assignee === eng && i.sprintId === 'sprint-24' && (i.status === 'todo' || i.status === 'in_progress'),
      )
      const movable = candidates.sort((a, b) => a.points - b.points)[0]
      if (!movable) break
      const targetEng = [...engineers]
        .filter(other => other !== eng && ENGINEER_SKILLS[other].includes(movable.type))
        .sort((a, b) => getLoad(a) - getLoad(b))[0]
      if (!targetEng || getLoad(targetEng) + movable.points > 12) break
      const prevOwner = movable.assignee
      movable.assignee = targetEng
      logs.push(
        en
          ? `[AUTOPILOT-REBALANCE] Shifted ${movable.key} (${movable.points} SP) from ${prevOwner} -> ${targetEng} to prevent sprint bottleneck.`
          : `[AUTOPILOT-REBALANCE] Mengalihkan ${movable.key} (${movable.points} SP) dari ${prevOwner} -> ${targetEng} agar beban tim seimbang.`,
      )
    }
  }

  // Step 3: Auto-decompose >= 8 SP stories lacking subtasks
  for (const item of cloned) {
    if (item.status !== 'done' && item.points >= 8 && item.subtasks.length < 3) {
      item.subtasks = [
        ...item.subtasks,
        { id: `st-arch-${item.key}`, title: `[Auto] Verify domain schema & idempotency contract (${item.key})`, done: true },
        { id: `st-impl-${item.key}`, title: `[Auto] Implement telemetry spans & circuit-breaker guard`, done: false },
        { id: `st-qa-${item.key}`, title: `[Auto] Run Playwright E2E + boundary regression suite`, done: false },
      ].slice(0, 4)
      logs.push(
        en
          ? `[AUTOPILOT-DECOMPOSE] Auto-decomposed 8+ SP ticket ${item.key} into structured architecture & QA subtasks.`
          : `[AUTOPILOT-DECOMPOSE] Memecah otomatis tiket besar ${item.key} menjadi subtask arsitektur & regresi QA.`,
      )
    }
  }

  // Step 4: Auto-plan Sprint 25 from Backlog up to 90% historical velocity
  const avgVel =
    velocityHistory.length > 0
      ? Math.round(velocityHistory.reduce((s, v) => s + v.completed, 0) / velocityHistory.length)
      : 38
  const safeCap = Math.round(avgVel * 0.9)
  let sprint25Sp = cloned.filter(i => i.sprintId === 'sprint-25').reduce((s, i) => s + i.points, 0)
  for (const bItem of cloned) {
    if (bItem.sprintId === 'backlog' && sprint25Sp + bItem.points <= safeCap) {
      bItem.sprintId = 'sprint-25'
      sprint25Sp += bItem.points
      logs.push(
        en
          ? `[AUTOPILOT-SPRINT25] Promoted ${bItem.key} (${bItem.points} SP) from Backlog -> Sprint 25 (${sprint25Sp}/${safeCap} SP optimal buffer).`
          : `[AUTOPILOT-SPRINT25] Menjadwalkan ${bItem.key} (${bItem.points} SP) dari Backlog -> Sprint 25 (${sprint25Sp}/${safeCap} SP kapasitas optimal).`,
      )
    }
  }

  // Step 5: Proactive Future Horizon Prevention Ticket (if not already generated)
  const hasProactive = cloned.some(i => i.labels.includes('autopilot-foresight'))
  if (!hasProactive) {
    const newKey = `DX-${seq}`
    seq += 1
    cloned.unshift({
      id: `auto-prev-${seq}`,
      key: newKey,
      title: en
        ? '[AI Foresight] Automated pre-release chaos failover & latency drift sentinel'
        : '[AI Foresight] Uji otomatis chaos failover & penjaga regresi latensi pra-rilis',
      description:
        'Proactively synthesized by Jira Autonomous Brain to prevent P99 tail-latency regression and verify graceful rollback before v7.1.0 cutover.',
      type: 'task',
      status: 'todo',
      priority: 'High',
      points: 3,
      assignee: 'Nadia',
      epicKey: 'DX-EPIC-3',
      sprintId: 'sprint-25',
      labels: ['autopilot-foresight', 'chaos-guard', 'v7.1.0'],
      dueDate: '2026-12-02',
      subtasks: [
        { id: `st-f1-${seq}`, title: 'Inject 250ms upstream synthetic jitter in CI smoke gate', done: false },
        { id: `st-f2-${seq}`, title: 'Verify automated canary rollback trigger < 30s', done: false },
      ],
      comments: [],
      updatedAt: new Date().toISOString(),
    })
    logs.push(
      en
        ? `[AUTOPILOT-FORESIGHT] Proactively created ${newKey} in Sprint 25 to guard v7.1.0 against tail-latency regressions.`
        : `[AUTOPILOT-FORESIGHT] Membuat tiket preventif masa depan ${newKey} di Sprint 25 untuk mencegah regresi rilis v7.1.0.`,
    )
  }

  if (logs.length === 0) {
    logs.push(
      en
        ? '[AUTOPILOT-OK] Sprint graph is already balanced at peak efficiency (zero blockers, zero overload).'
        : '[AUTOPILOT-OK] Seluruh grafik sprint sudah berada pada kondisi seimbang optimal.',
    )
  }

  return { updatedIssues: cloned, reasoningLogs: logs, nextSequence: seq }
}

export function compileGoalIntoAutonomousSprintPlan(
  rawGoal: string,
  nextSequence: number,
  en: boolean,
): { generatedIssues: JiraIssue[]; reasoningTrace: string[]; nextSequence: number } {
  const goal = rawGoal.trim() || (en ? 'Autonomous Real-Time Fraud & Payment Engine' : 'Mesin Pembayaran & Deteksi Fraud AI Real-Time')
  const lower = goal.toLowerCase()
  const isFintech = /pay|qris|ledger|bank|fintech|bayar|transaksi|fraud|wallet/.test(lower)
  const isSecurity = /auth|sso|zero-trust|sec|compliance|keamanan|enkripsi|rbac/.test(lower)
  const epicKey = isSecurity ? 'DX-EPIC-1' : isFintech ? 'DX-EPIC-2' : 'DX-EPIC-4'

  let seq = nextSequence
  const k1 = `DX-${seq++}`
  const k2 = `DX-${seq++}`
  const k3 = `DX-${seq++}`
  const k4 = `DX-${seq++}`

  const nowIso = new Date().toISOString()

  const generatedIssues: JiraIssue[] = [
    {
      id: `goal-${k1}`,
      key: k1,
      title: en
        ? `[Architecture] Domain contract, idempotency schema & USL capacity model: ${goal.slice(0, 56)}`
        : `[Arsitektur] Kontrak domain, skema idempoten & model kapasitas USL: ${goal.slice(0, 56)}`,
      description: `Feature: Architectural blueprint for ${goal}\n  Given strict P95 <= 25ms SLA\n  When concurrent requests hit the edge gateway\n  Then enforce schema validation & idempotent state transitions`,
      type: 'story',
      status: 'todo',
      priority: 'Highest',
      points: 5,
      assignee: 'Rizky',
      epicKey,
      sprintId: 'sprint-24',
      labels: ['ai-planned', 'architecture', 'v7.1.0'],
      dueDate: '2026-11-26',
      subtasks: [
        { id: `st-${k1}-1`, title: 'Author OpenAPI 3.1 contract & error taxonomy', done: false },
        { id: `st-${k1}-2`, title: 'Validate database indexing & outbox isolation', done: false },
      ],
      comments: [],
      updatedAt: nowIso,
    },
    {
      id: `goal-${k2}`,
      key: k2,
      title: en
        ? `[Security Foresight] Threat model STRIDE, rate-limit & abuse guard: ${goal.slice(0, 52)}`
        : `[Antisipasi Keamanan] Threat model STRIDE, rate-limit & proteksi penyalahgunaan: ${goal.slice(0, 52)}`,
      description: `Proactively planned ahead by Autonomous Jira Brain so security controls ship alongside ${k1}.`,
      type: 'security',
      status: 'todo',
      priority: 'High',
      points: 3,
      assignee: 'Alya',
      epicKey: 'DX-EPIC-1',
      sprintId: 'sprint-24',
      labels: ['ai-planned', 'security', 'zero-trust'],
      blockedByKey: k1,
      dueDate: '2026-11-28',
      subtasks: [
        { id: `st-${k2}-1`, title: 'Enforce strict RBAC scope & payload sanitization', done: false },
        { id: `st-${k2}-2`, title: 'Verify audit trail immutability & PII redaction', done: false },
      ],
      comments: [],
      updatedAt: nowIso,
    },
    {
      id: `goal-${k3}`,
      key: k3,
      title: en
        ? `[QA Self-Heal] End-to-end Gherkin BDD & Playwright chaos suite: ${goal.slice(0, 52)}`
        : `[QA Otomatis] Skenario BDD Gherkin & regresi chaos Playwright: ${goal.slice(0, 52)}`,
      description: `Automated verification matrix covering happy-path, duplicate submission, and network timeout recovery for ${goal}.`,
      type: 'task',
      status: 'todo',
      priority: 'High',
      points: 5,
      assignee: 'Nadia',
      epicKey: 'DX-EPIC-3',
      sprintId: 'sprint-25',
      labels: ['ai-planned', 'playwright', 'gherkin'],
      blockedByKey: k1,
      dueDate: '2026-12-03',
      subtasks: [
        { id: `st-${k3}-1`, title: 'Generate ARIA-resilient Playwright E2E spec', done: false },
        { id: `st-${k3}-2`, title: 'Assert HTTP 429/503 graceful fallback UI', done: false },
      ],
      comments: [],
      updatedAt: nowIso,
    },
    {
      id: `goal-${k4}`,
      key: k4,
      title: en
        ? `[Future Scale] OpenTelemetry SLO burn-rate alert & canary rollout: ${goal.slice(0, 50)}`
        : `[Skala Masa Depan] Alert burn-rate SLO OpenTelemetry & rilis canary: ${goal.slice(0, 50)}`,
      description: `Forward-looking Day-2 operational readiness ticket ensuring ${goal} scales safely post-launch.`,
      type: 'story',
      status: 'todo',
      priority: 'Medium',
      points: 3,
      assignee: 'Bima',
      epicKey,
      sprintId: 'sprint-25',
      labels: ['ai-planned', 'observability', 'v7.2.0'],
      blockedByKey: k3,
      dueDate: '2026-12-08',
      subtasks: [
        { id: `st-${k4}-1`, title: 'Configure 1% -> 25% -> 100% progressive rollout gate', done: false },
      ],
      comments: [],
      updatedAt: nowIso,
    },
  ]

  const reasoningTrace = en
    ? [
        `01 · Deconstructed goal "${goal}" -> mapped primary Epic ${epicKey}.`,
        `02 · Sequenced ${k1} (Architecture, 5 SP, Rizky) in Active Sprint 24.`,
        `03 · Thought ahead on Risk: created ${k2} (Zero-Trust Security, 3 SP, Alya) linked to ${k1}.`,
        `04 · Scheduled Horizon-2 verification & Day-2 scale: ${k3} (Nadia, Sprint 25) & ${k4} (Bima, Canary Rollout).`,
      ]
    : [
        `01 · Menganalisis tujuan "${goal}" -> memetakan ke Epic utama ${epicKey}.`,
        `02 · Menjadwalkan fondasi ${k1} (Arsitektur, 5 SP, Rizky) di Sprint Aktif 24.`,
        `03 · Mengantisipasi risiko ke depan: membuat ${k2} (Keamanan Zero-Trust, 3 SP, Alya) terhubung ke ${k1}.`,
        `04 · Menyiapkan Horizon-2 otomatis: ${k3} (QA Playwright, Nadia) & ${k4} (Canary Observability, Bima) di Sprint 25.`,
      ]

  return { generatedIssues, reasoningTrace, nextSequence: seq }
}

export function buildReleaseNotesMarkdown(version: JiraReleaseVersion, issues: readonly JiraIssue[], en: boolean): string {
  const matching = issues.filter(item => {
    if (version.id === 'v7.0.0') return item.status === 'done'
    if (version.id === 'v7.1.0') return item.sprintId === 'sprint-24'
    return item.sprintId === 'sprint-25' || item.sprintId === 'backlog'
  })
  const lines = [
    `# ${version.name} (${version.targetDate})`,
    '',
    `> ${en ? version.summaryEn : version.summaryId}`,
    '',
    `## ${en ? 'Included Engineering Issues' : 'Daftar Tiket dalam Rilis'} (${matching.length})`,
    ...matching.map(
      i => `- **${i.key}** [${i.type.toUpperCase()} · ${i.points} SP · ${i.status.toUpperCase()}] ${i.title} (@${i.assignee})`,
    ),
  ]
  return lines.join('\n')
}
