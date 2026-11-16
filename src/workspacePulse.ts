import { loadSessionAiConfig } from './aiClient'

export interface WorkspacePulseSummary {
  commandTasksOpen: number
  commandTasksActive: number
  commandIncidentsOpen: number
  controlPlaneDone: number
  controlPlaneTotal: number
  reliabilityIncidents: number
  qualityReportsCount: number
  sbomSnapshotsCount: number
  catalogServicesCount: number
  roadmapDoneCount: number
  hasSessionByok: boolean
}

function safeParseJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function readWorkspacePulse(): WorkspacePulseSummary {
  const command = safeParseJson<{ tasks?: Array<{ status?: string }>; incidents?: Array<{ status?: string }> }>('dreamex-command-center-v1', {})
  const tasks = Array.isArray(command.tasks) ? command.tasks : []
  const cmdIncidents = Array.isArray(command.incidents) ? command.incidents : []
  const checklist = safeParseJson<Record<string, unknown>>('dreamex-control-plane-checklist-v1', {})
  const relIncidents = safeParseJson<unknown[]>('dreamex-reliability-incidents-v1', [])
  const qiHistory = safeParseJson<unknown[]>('dreamex-quality-intelligence-history-v1', [])
  const scHistory = safeParseJson<unknown[]>('dreamex-supply-chain-history-v1', [])
  const catalog = safeParseJson<unknown[]>('dreamex-engineering-catalog-v1', [])
  const roadmap = safeParseJson<Record<string, unknown>>('dreamex-roadmap-v1', {})
  const byok = typeof window !== 'undefined' ? loadSessionAiConfig() : null

  return {
    commandTasksOpen: tasks.filter(t => t?.status !== 'done').length,
    commandTasksActive: tasks.filter(t => t?.status === 'active').length,
    commandIncidentsOpen: cmdIncidents.filter(i => i?.status !== 'resolved').length,
    controlPlaneDone: Object.values(checklist).filter(v => v === true).length,
    controlPlaneTotal: 6,
    reliabilityIncidents: Array.isArray(relIncidents) ? relIncidents.length : 0,
    qualityReportsCount: Array.isArray(qiHistory) ? qiHistory.length : 0,
    sbomSnapshotsCount: Array.isArray(scHistory) ? scHistory.length : 0,
    catalogServicesCount: Array.isArray(catalog) ? catalog.length : 3,
    roadmapDoneCount: Object.values(roadmap).filter(v => v === true).length,
    hasSessionByok: Boolean(byok?.apiKey?.trim()),
  }
}
