export type JiraIssueType = 'Bug' | 'Story' | 'Task' | 'Epic'
export type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low'
export type JiraEnvironment = 'DEV' | 'SIT' | 'UAT' | 'STAGING' | 'PROD'

export interface JiraTicketBlueprintInput {
  readonly projectKey: string
  readonly issueType: JiraIssueType
  readonly summary: string
  readonly environment: JiraEnvironment
  readonly moduleName: string
  readonly stepsToReproduceOrCriteria: ReadonlyArray<string>
  readonly expectedResult: string
  readonly actualResultOrBusinessValue: string
  readonly sqlOrApiEvidence?: string
  readonly impactScore: 1 | 2 | 3 | 4 | 5
  readonly likelihoodScore: 1 | 2 | 3 | 4 | 5
}

export interface JiraRiskAssessment {
  readonly priority: JiraPriority
  readonly priorityCode: 'P0 (Blocker)' | 'P1 (Critical)' | 'P2 (Major)' | 'P3 (Minor)'
  readonly riskScore: number
  readonly slaTarget: string
  readonly releaseGateAction: string
}

export function computePriorityFromRisk(impact: number, likelihood: number): JiraRiskAssessment {
  const safeImpact = Math.min(5, Math.max(1, Math.round(impact)))
  const safeLikelihood = Math.min(5, Math.max(1, Math.round(likelihood)))
  const riskScore = safeImpact * safeLikelihood * 4 // Scaled 4..100
  if (riskScore >= 80) {
    return {
      priority: 'Highest',
      priorityCode: 'P0 (Blocker)',
      riskScore,
      slaTarget: '15m Response / 2h Hotfix',
      releaseGateAction: 'BLOCK RELEASE IMMEDIATELY — Mandatory emergency hotfix & incident bridge',
    }
  }
  if (riskScore >= 50) {
    return {
      priority: 'High',
      priorityCode: 'P1 (Critical)',
      riskScore,
      slaTarget: '2h Response / 24h Fix',
      releaseGateAction: 'HOLD RELEASE GATE — Requires verified workaround or fix before production cutover',
    }
  }
  if (riskScore >= 24) {
    return {
      priority: 'Medium',
      priorityCode: 'P2 (Major)',
      riskScore,
      slaTarget: 'Sprint Backlog Resolution',
      releaseGateAction: 'SCHEDULE IN ACTIVE SPRINT — Document in release notes if deferred',
    }
  }
  return {
    priority: 'Low',
    priorityCode: 'P3 (Minor)',
    riskScore,
    slaTarget: 'Next Release Window',
    releaseGateAction: 'TRACK IN PRODUCT BACKLOG — Non-blocking cosmetic or minor enhancement',
  }
}

export function buildJiraRestApiV3Payload(input: JiraTicketBlueprintInput) {
  const { priority, priorityCode, riskScore, slaTarget, releaseGateAction } = computePriorityFromRisk(
    input.impactScore,
    input.likelihoodScore,
  )
  const cleanProjectKey = (input.projectKey.trim() || 'ENT').toUpperCase().replace(/[^A-Z0-9_]/g, '')
  const cleanModule = input.moduleName.trim() || 'Core-Platform'

  return {
    fields: {
      project: { key: cleanProjectKey },
      issuetype: { name: input.issueType },
      summary: `[${input.environment}][${cleanModule}] ${input.summary.trim() || 'Untitled engineering issue'}`,
      priority: { name: priority },
      labels: [
        `env-${input.environment.toLowerCase()}`,
        `module-${cleanModule.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        `priority-${priority.toLowerCase()}`,
        'dreamex-auto-triage',
      ],
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Automated Telemetry Triage | Priority: ${priorityCode} | Risk Score: ${riskScore}/100 | Target SLA: ${slaTarget}`,
                marks: [{ type: 'strong' }],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Release Gate Policy: ${releaseGateAction}`,
              },
            ],
          },
          {
            type: 'bulletList',
            content: input.stepsToReproduceOrCriteria.filter(Boolean).map(step => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: step }] }],
            })),
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Expected: ${input.expectedResult} | Actual/Value: ${input.actualResultOrBusinessValue}`,
              },
            ],
          },
          ...(input.sqlOrApiEvidence?.trim()
            ? [
                {
                  type: 'codeBlock',
                  attrs: { language: 'json' },
                  content: [{ type: 'text', text: input.sqlOrApiEvidence.trim() }],
                },
              ]
            : []),
        ],
      },
    },
  }
}

export function buildJiraMarkdownTicket(input: JiraTicketBlueprintInput): string {
  const { priority, priorityCode, riskScore, slaTarget, releaseGateAction } = computePriorityFromRisk(
    input.impactScore,
    input.likelihoodScore,
  )
  const steps = input.stepsToReproduceOrCriteria
    .filter(Boolean)
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n')

  return [
    `# [${input.environment}][${input.moduleName}] ${input.summary}`,
    '',
    `- **Project Key:** \`${input.projectKey.toUpperCase()}\``,
    `- **Issue Type:** \`${input.issueType}\``,
    `- **Computed Priority:** **${priority} — ${priorityCode}** (Risk Score: \`${riskScore}/100\`)`,
    `- **Target SLA:** \`${slaTarget}\``,
    `- **Release Gate Action:** ${releaseGateAction}`,
    '',
    `## ${input.issueType === 'Bug' ? 'Steps to Reproduce' : 'Acceptance Criteria & Execution Steps'}`,
    steps || '1. Verify scenario in target environment.',
    '',
    '## Verification & Outcome',
    `- **Expected Result:** ${input.expectedResult}`,
    `- **Actual Result / Business Value:** ${input.actualResultOrBusinessValue}`,
    ...(input.sqlOrApiEvidence?.trim()
      ? ['', '## Technical Evidence (SQL / API / Logs)', '```json', input.sqlOrApiEvidence.trim(), '```']
      : []),
  ].join('\n')
}

export function buildJiraCurlCommand(input: JiraTicketBlueprintInput, jiraDomain = 'your-org.atlassian.net'): string {
  const payload = JSON.stringify(buildJiraRestApiV3Payload(input), null, 2)
  const safeDomain = jiraDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '') || 'your-org.atlassian.net'
  return [
    `curl --request POST \\`,
    `  --url 'https://${safeDomain}/rest/api/3/issue' \\`,
    `  --user '$JIRA_USER_EMAIL:$JIRA_API_TOKEN' \\`,
    `  --header 'Accept: application/json' \\`,
    `  --header 'Content-Type: application/json' \\`,
    `  --data '${payload.replace(/'/g, "'\\''")}'`,
  ].join('\n')
}

export interface JqlStudioConfig {
  readonly preset: 'uat-blockers' | 'scope-creep' | 'release-gate' | 'sla-triage' | 'custom'
  readonly projectKey: string
  readonly fixVersion: string
  readonly label: string
  readonly staleDays: number
}

export function buildJqlQuery(config: JqlStudioConfig): string {
  const project = (config.projectKey.trim() || 'ENT').toUpperCase().replace(/[^A-Z0-9_]/g, '')
  const version = config.fixVersion.trim() || 'v3.0.0'
  const label = config.label.trim() || 'UAT-Blocker'
  const days = Math.max(1, Math.min(30, Math.round(config.staleDays || 3)))

  switch (config.preset) {
    case 'uat-blockers':
      return `project = "${project}" AND issuetype = Bug AND status in ("Open", "In Progress", "Reopened") AND priority in (Highest, High) AND labels = "${label}" ORDER BY created DESC`
    case 'scope-creep':
      return `project = "${project}" AND sprint in openSprints() AND statusCategory != Done AND updated <= -${days}d ORDER BY priority DESC`
    case 'release-gate':
      return `project = "${project}" AND fixVersion = "${version}" AND issuetype = Bug AND status != Done AND priority in (Highest, High)`
    case 'sla-triage':
      return `project = "${project}" AND issuetype in (Bug, Story) AND priority in (Highest, High) AND assignee is EMPTY AND created >= -7d ORDER BY priority DESC, created ASC`
    case 'custom':
    default:
      return `project = "${project}" AND fixVersion = "${version}" AND labels = "${label}" AND statusCategory != Done ORDER BY priority DESC, updated DESC`
  }
}
