export interface QueuedJiraTicketDraft {
  title: string
  description: string
  type: 'story' | 'bug' | 'task' | 'security'
  priority: 'Highest' | 'High' | 'Medium' | 'Low'
  points: number
  labels: string[]
  sourceSuite: 'ba-hub' | 'pm-jira-hub' | 'tools'
}

const INBOX_STORAGE_KEY = 'dreamex_jira_suite_inbox_v1'

export function queueJiraTicketsFromSuite(drafts: QueuedJiraTicketDraft[]): number {
  if (typeof window === 'undefined' || !drafts.length) return 0
  try {
    const existingRaw = window.sessionStorage.getItem(INBOX_STORAGE_KEY)
    const existing = existingRaw ? (JSON.parse(existingRaw) as QueuedJiraTicketDraft[]) : []
    const merged = [...(Array.isArray(existing) ? existing : []), ...drafts].slice(0, 20)
    window.sessionStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(merged))
    return drafts.length
  } catch {
    return 0
  }
}

export function consumeQueuedJiraTickets(): QueuedJiraTicketDraft[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(INBOX_STORAGE_KEY)
    if (!raw) return []
    window.sessionStorage.removeItem(INBOX_STORAGE_KEY)
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as QueuedJiraTicketDraft[]) : []
  } catch {
    return []
  }
}
