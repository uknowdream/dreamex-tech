import { useState, type FormEvent } from 'react'
import { Flag, ListFilter, Plus, Table2 } from 'lucide-react'
import type { JiraIssue, JiraIssueKind, JiraPriorityLevel, JiraStatusId } from '../JiraEnterpriseBoard'

interface JiraListViewProps {
  en: boolean
  issues: readonly JiraIssue[]
  teamMembers: readonly { readonly id: string }[]
  onOpenIssue: (issueId: string) => void
  onInlineUpdate: (issueId: string, patch: Partial<JiraIssue>) => void
  onQuickCreate: (title: string, type: JiraIssueKind, priority: JiraPriorityLevel) => void
}

const STATUS_OPTIONS: Array<{ id: JiraStatusId; en: string; idLabel: string }> = [
  { id: 'todo', en: 'To Do', idLabel: 'Akan Dikerjakan' },
  { id: 'in_progress', en: 'In Progress', idLabel: 'Sedang Jalan' },
  { id: 'review', en: 'In Review & QA', idLabel: 'Review & QA' },
  { id: 'blocked', en: 'Blocked', idLabel: 'Terhambat' },
  { id: 'done', en: 'Done', idLabel: 'Selesai' },
]

const PRIORITIES: JiraPriorityLevel[] = ['Highest', 'High', 'Medium', 'Low']

export function JiraListView({
  en,
  issues,
  teamMembers,
  onOpenIssue,
  onInlineUpdate,
  onQuickCreate,
}: JiraListViewProps) {
  const [quickFilter, setQuickFilter] = useState('')
  const [inlineTitle, setInlineTitle] = useState('')
  const [inlineType, setInlineType] = useState<JiraIssueKind>('story')
  const [inlinePrio, setInlinePrio] = useState<JiraPriorityLevel>('Medium')

  const filtered = issues.filter(item => {
    const q = quickFilter.trim().toLowerCase()
    if (!q) return true
    return `${item.key} ${item.title} ${item.assignee} ${item.status} ${item.priority} ${item.epicKey}`.toLowerCase().includes(q)
  })

  const handleQuickAdd = (e: FormEvent) => {
    e.preventDefault()
    const clean = inlineTitle.trim()
    if (!clean) return
    onQuickCreate(clean, inlineType, inlinePrio)
    setInlineTitle('')
  }

  return (
    <section className="jira-backlog-stack" data-testid="jira-list-panel" aria-label={en ? 'Jira Inline List View' : 'Tampilan Daftar Inline Jira'}>
      <article className="jira-panel-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <span className="jira-kpi-label">
              <Table2 size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {en ? 'JIRA CLOUD LIST VIEW · INLINE SPREADSHEET EDITOR' : 'TAMPILAN DAFTAR JIRA · EDITOR INLINE'}
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
              {en ? `All Project Work Items (${filtered.length})` : `Semua Item Kerja Proyek (${filtered.length})`}
            </h2>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ListFilter size={14} aria-hidden="true" />
            <input
              type="search"
              className="jira-select"
              style={{ minWidth: 220 }}
              value={quickFilter}
              onChange={e => setQuickFilter(e.target.value)}
              placeholder={en ? 'Filter list by key, title, assignee…' : 'Filter daftar berdasarkan kode, judul, PIC…'}
              aria-label={en ? 'Filter list view' : 'Filter tampilan daftar'}
            />
          </label>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="jira-list-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(148, 163, 184, 0.24)' }}>
                <th style={{ padding: '8px 6px' }}>{en ? 'Key' : 'Kode'}</th>
                <th style={{ padding: '8px 6px', minWidth: 220 }}>{en ? 'Summary' : 'Ringkasan'}</th>
                <th style={{ padding: '8px 6px' }}>{en ? 'Status' : 'Status'}</th>
                <th style={{ padding: '8px 6px' }}>{en ? 'Assignee' : 'PIC'}</th>
                <th style={{ padding: '8px 6px' }}>{en ? 'Priority' : 'Prioritas'}</th>
                <th style={{ padding: '8px 6px' }}>SP</th>
                <th style={{ padding: '8px 6px' }}>{en ? 'Due Date' : 'Tenggat'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr
                  key={item.id}
                  data-testid={`jira-list-row-${item.key}`}
                  style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}
                >
                  <td style={{ padding: '8px 6px', whiteSpace: 'nowrap', fontFamily: 'var(--mono, monospace)', fontWeight: 700 }}>
                    <span className={`jira-type-badge jira-type-${item.type}`} style={{ marginRight: 6 }}>
                      {item.type.toUpperCase()}
                    </span>
                    {item.key}
                    {item.flagged && <Flag size={11} style={{ marginLeft: 5, color: '#f59e0b', verticalAlign: 'middle' }} />}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <button
                      type="button"
                      className="jira-card-title-btn"
                      style={{ textAlign: 'left', padding: 0 }}
                      onClick={() => onOpenIssue(item.id)}
                    >
                      {item.title}
                    </button>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <select
                      className="jira-select"
                      data-testid={`jira-list-status-${item.key}`}
                      value={item.status}
                      aria-label={`Status for ${item.key}`}
                      onChange={e => onInlineUpdate(item.id, { status: e.target.value as JiraStatusId })}
                    >
                      {STATUS_OPTIONS.map(st => (
                        <option key={st.id} value={st.id}>
                          {en ? st.en : st.idLabel}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <select
                      className="jira-select"
                      value={item.assignee}
                      aria-label={`Assignee for ${item.key}`}
                      onChange={e => onInlineUpdate(item.id, { assignee: e.target.value })}
                    >
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <select
                      className="jira-select"
                      value={item.priority}
                      aria-label={`Priority for ${item.key}`}
                      onChange={e => onInlineUpdate(item.id, { priority: e.target.value as JiraPriorityLevel })}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <input
                      type="number"
                      min={1}
                      max={21}
                      className="jira-select"
                      style={{ width: 58 }}
                      value={item.points}
                      aria-label={`Story points for ${item.key}`}
                      onChange={e => onInlineUpdate(item.id, { points: Math.max(1, Math.min(21, Number(e.target.value) || 1)) })}
                    />
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <input
                      type="date"
                      className="jira-select"
                      value={item.dueDate}
                      aria-label={`Due date for ${item.key}`}
                      onChange={e => onInlineUpdate(item.id, { dueDate: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleQuickAdd} className="jira-goal-compiler" style={{ marginTop: 12 }}>
          <select
            className="jira-select"
            value={inlineType}
            onChange={e => setInlineType(e.target.value as JiraIssueKind)}
            aria-label={en ? 'New list item type' : 'Jenis item baru'}
            style={{ maxWidth: 120 }}
          >
            <option value="story">Story</option>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="security">Security</option>
          </select>
          <select
            className="jira-select"
            value={inlinePrio}
            onChange={e => setInlinePrio(e.target.value as JiraPriorityLevel)}
            aria-label={en ? 'New list item priority' : 'Prioritas item baru'}
            style={{ maxWidth: 120 }}
          >
            {PRIORITIES.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            data-testid="jira-list-quick-input"
            value={inlineTitle}
            onChange={e => setInlineTitle(e.target.value)}
            placeholder={en ? '+ Create new work item inline and press Enter…' : '+ Buat item kerja baru langsung di daftar lalu tekan Enter…'}
          />
          <button type="submit" className="button button-primary" data-testid="jira-list-quick-add-btn">
            <Plus size={14} /> {en ? 'Add Item' : 'Tambah'}
          </button>
        </form>
      </article>
    </section>
  )
}
