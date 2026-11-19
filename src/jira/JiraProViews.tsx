import { useMemo, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GitMerge,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { JiraIssue, JiraIssueKind, JiraPriorityLevel, JiraStatusId } from '../JiraEnterpriseBoard'

interface JiraCalendarViewProps {
  en: boolean
  issues: readonly JiraIssue[]
  onOpenIssue: (issueId: string) => void
  onQuickCreateOnDate: (title: string, dueDate: string, type: JiraIssueKind, priority: JiraPriorityLevel) => void
}

export function JiraCalendarView({ en, issues, onOpenIssue, onQuickCreateOnDate }: JiraCalendarViewProps) {
  const [monthKey, setMonthKey] = useState<'2026-11' | '2026-12'>('2026-11')
  const [selectedDay, setSelectedDay] = useState<string>('2026-11-24')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftType, setDraftType] = useState<JiraIssueKind>('task')
  const [draftPrio, setDraftPrio] = useState<JiraPriorityLevel>('High')

  const calendarCells = useMemo(() => {
    const year = 2026
    const monthIndex = monthKey === '2026-11' ? 10 : 11 // 0-based: Nov=10, Dec=11
    const firstWeekday = new Date(year, monthIndex, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const cells: Array<{ iso: string | null; day: number | null }> = []
    for (let i = 0; i < firstWeekday; i++) cells.push({ iso: null, day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${monthKey}-${String(d).padStart(2, '0')}`
      cells.push({ iso, day: d })
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, day: null })
    return cells
  }, [monthKey])

  const issuesByDate = useMemo(() => {
    const map = new Map<string, JiraIssue[]>()
    for (const item of issues) {
      const key = item.dueDate || '2026-11-24'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [issues])

  const handleSchedule = (e: FormEvent) => {
    e.preventDefault()
    const clean = draftTitle.trim()
    if (!clean) return
    onQuickCreateOnDate(clean, selectedDay, draftType, draftPrio)
    setDraftTitle('')
  }

  return (
    <section
      className="jira-backlog-stack"
      data-testid="jira-calendar-panel"
      aria-label={en ? 'Jira Work Management Delivery Calendar' : 'Kalender Delivery Jira'}
    >
      <article className="jira-panel-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <span className="jira-kpi-label">
              <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {en ? 'JIRA WORK MANAGEMENT · DELIVERY CALENDAR' : 'JIRA WORK MANAGEMENT · KALENDER DELIVERY'}
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
              {monthKey === '2026-11'
                ? en
                  ? 'November 2026 — Sprint 24 & v7.1.0 Release Schedule'
                  : 'November 2026 — Jadwal Sprint 24 & Rilis v7.1.0'
                : en
                  ? 'December 2026 — Sprint 25 & v7.2.0 Horizon'
                  : 'Desember 2026 — Jadwal Sprint 25 & Horizon v7.2.0'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={monthKey === '2026-11' ? 'button button-primary' : 'button button-ghost'}
              onClick={() => {
                setMonthKey('2026-11')
                setSelectedDay('2026-11-24')
              }}
            >
              Nov 2026
            </button>
            <button
              type="button"
              className={monthKey === '2026-12' ? 'button button-primary' : 'button button-ghost'}
              onClick={() => {
                setMonthKey('2026-12')
                setSelectedDay('2026-12-05')
              }}
            >
              Dec 2026
            </button>
          </div>
        </div>

        <form className="jira-goal-compiler" onSubmit={handleSchedule}>
          <input
            type="date"
            value={selectedDay}
            onChange={e => setSelectedDay(e.target.value)}
            style={{ maxWidth: 165 }}
            aria-label={en ? 'Due date' : 'Tanggal target'}
          />
          <input
            data-testid="jira-calendar-quick-input"
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            placeholder={
              en
                ? `Schedule new issue on ${selectedDay}…`
                : `Jadwalkan tiket baru pada ${selectedDay}…`
            }
            aria-label={en ? 'Schedule issue title' : 'Judul tiket terjadwal'}
          />
          <select
            className="jira-select"
            value={draftType}
            onChange={e => setDraftType(e.target.value as JiraIssueKind)}
            aria-label="Issue type"
          >
            <option value="story">Story</option>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="security">Security</option>
          </select>
          <select
            className="jira-select"
            value={draftPrio}
            onChange={e => setDraftPrio(e.target.value as JiraPriorityLevel)}
            aria-label="Priority"
          >
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button type="submit" className="button button-primary" data-testid="jira-calendar-add-btn">
            <Plus size={14} /> {en ? 'Schedule' : 'Jadwalkan'}
          </button>
        </form>

        <div className="jira-cal-scroll">
          <div className="jira-cal-grid">
            {(en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']).map(
              dayName => (
                <div className="jira-cal-dow" key={dayName}>
                  {dayName}
                </div>
              ),
            )}
            {calendarCells.map((cell, idx) => {
              if (!cell.iso) {
                return <div className="jira-cal-cell is-empty" key={`empty-${idx}`} />
              }
              const dayIssues = issuesByDate.get(cell.iso) ?? []
              const isSelected = cell.iso === selectedDay
              const isMilestone = cell.iso === '2026-11-30' || cell.iso === '2026-12-18'
              return (
                <div
                  key={cell.iso}
                  className={`jira-cal-cell${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedDay(cell.iso!)}
                >
                  <div className="jira-cal-day-head">
                    <span>{cell.day}</span>
                    {isMilestone && (
                      <span className="jira-cal-milestone">
                        {cell.iso === '2026-11-30' ? 'v7.1 Ship' : 'v7.2 Ship'}
                      </span>
                    )}
                  </div>
                  <div className="jira-cal-events">
                    {dayIssues.map(issue => (
                      <button
                        key={issue.id}
                        type="button"
                        className={`jira-cal-event jira-prio-${issue.priority}`}
                        onClick={e => {
                          e.stopPropagation()
                          onOpenIssue(issue.id)
                        }}
                      >
                        <b>{issue.key}</b> {issue.title.slice(0, 26)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </article>
    </section>
  )
}

interface JiraFormsPortalViewProps {
  en: boolean
  activeProjectKey: string
  onSubmitIntake: (payload: {
    template: string
    type: JiraIssueKind
    title: string
    description: string
    priority: JiraPriorityLevel
    environment: string
    requester: string
  }) => void
}

export function JiraFormsPortalView({ en, activeProjectKey, onSubmitIntake }: JiraFormsPortalViewProps) {
  const [template, setTemplate] = useState<'bug' | 'feature' | 'security' | 'access'>('bug')
  const [includeEnv, setIncludeEnv] = useState(true)
  const [includeImpact, setIncludeImpact] = useState(true)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [environment, setEnvironment] = useState('Production (APAC Edge)')
  const [requester, setRequester] = useState('engineering-lead@dreamex.tech')
  const [priority, setPriority] = useState<JiraPriorityLevel>('High')
  const [submittedCount, setSubmittedCount] = useState(0)

  const handlePortalSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    const typeMap: Record<typeof template, JiraIssueKind> = {
      bug: 'bug',
      feature: 'story',
      security: 'security',
      access: 'task',
    }
    const fullDesc = [
      `Intake Form Template: ${template.toUpperCase()}`,
      `Requester: ${requester}`,
      includeEnv ? `Environment: ${environment}` : '',
      '',
      details.trim() || 'Submitted via DreamEx Jira Forms Intake Portal.',
    ]
      .filter(Boolean)
      .join('\n')

    onSubmitIntake({
      template,
      type: typeMap[template],
      title: cleanTitle,
      description: fullDesc,
      priority: template === 'security' ? 'Highest' : priority,
      environment,
      requester,
    })
    setTitle('')
    setDetails('')
    setSubmittedCount(c => c + 1)
  }

  return (
    <section
      className="jira-reports-grid"
      data-testid="jira-forms-panel"
      aria-label={en ? 'Jira Forms Builder and Intake Portal' : 'Pembuat Formulir dan Portal Intake Jira'}
    >
      {/* Left: Form Builder Configurator */}
      <article className="jira-panel-card">
        <div>
          <span className="jira-kpi-label">
            <ClipboardList size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {en ? 'JIRA FORMS BUILDER · INTAKE CONFIGURATION' : 'PEMBUAT FORMULIR JIRA · KONFIGURASI INTAKE'}
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
            {en ? 'Configure Request Portal Templates & Auto-Triage' : 'Atur Template Portal Permintaan & Triase Otomatis'}
          </h2>
        </div>

        <div className="jira-quick-chips" role="group" aria-label="Form templates">
          {(
            [
              { id: 'bug', en: 'Bug Report', idLabel: 'Laporan Bug' },
              { id: 'feature', en: 'Feature Request', idLabel: 'Permintaan Fitur' },
              { id: 'security', en: 'Security Incident', idLabel: 'Insiden Keamanan' },
              { id: 'access', en: 'IT / Access Change', idLabel: 'Perubahan Akses IT' },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              type="button"
              className={template === item.id ? 'jira-chip-btn is-active' : 'jira-chip-btn'}
              onClick={() => setTemplate(item.id)}
            >
              {en ? item.en : item.idLabel}
            </button>
          ))}
        </div>

        <div className="jira-rule-list">
          <label className="jira-subtask-row" style={{ cursor: 'pointer' }}>
            <span>{en ? 'Include Target Environment selector' : 'Sertakan pilihan Lingkungan (Environment)'}</span>
            <input type="checkbox" checked={includeEnv} onChange={e => setIncludeEnv(e.target.checked)} />
          </label>
          <label className="jira-subtask-row" style={{ cursor: 'pointer' }}>
            <span>{en ? 'Include Urgency / Priority SLA field' : 'Sertakan pilihan Prioritas / SLA'}</span>
            <input type="checkbox" checked={includeImpact} onChange={e => setIncludeImpact(e.target.checked)} />
          </label>
        </div>

        <div className="jira-rule-item">
          <div>
            <strong>
              <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {en ? `Target Space: ${activeProjectKey} Active Sprint` : `Ruang Tujuan: Sprint Aktif ${activeProjectKey}`}
            </strong>
            <div className="jira-kpi-sub">
              {en
                ? 'Submissions automatically trigger AUTO-01 Security Escalation & Self-Driving AI triage.'
                : 'Setiap formulir masuk otomatis memicu eskalasi keamanan AUTO-01 & triase AI.'}
            </div>
          </div>
          <span className="jira-kpi-badge">{submittedCount} submitted</span>
        </div>
      </article>

      {/* Right: Live Submittable Intake Form */}
      <article className="jira-panel-card">
        <div>
          <span className="jira-kpi-label">{en ? 'LIVE PUBLIC INTAKE FORM PREVIEW' : 'PRATINJAU FORMULIR INTAKE AKTIF'}</span>
          <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
            {template === 'bug'
              ? en
                ? 'Report a Production or QA Defect'
                : 'Laporkan Cacat Produksi atau QA'
              : template === 'feature'
                ? en
                  ? 'Submit New Product Feature Proposal'
                  : 'Ajukan Usulan Fitur Produk Baru'
                : template === 'security'
                  ? en
                    ? 'Escalate Security / Zero-Trust Finding'
                    : 'Eskalasi Temuan Keamanan Zero-Trust'
                  : en
                    ? 'Request Infrastructure / Role Access'
                    : 'Permintaan Akses Infrastruktur / Peran'}
          </h2>
        </div>

        <form onSubmit={handlePortalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="jira-field">
            <label htmlFor="portal-summary">{en ? 'Summary *' : 'Ringkasan *'}</label>
            <input
              id="portal-summary"
              data-testid="jira-form-summary-input"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                en
                  ? 'e.g. Checkout webhook returns 502 on duplicate idempotency header'
                  : 'mis. Webhook checkout mengembalikan 502 pada header idempoten ganda'
              }
            />
          </div>

          <div className="jira-field-grid">
            <div className="jira-field">
              <label htmlFor="portal-requester">{en ? 'Reporter Email' : 'Email Pelapor'}</label>
              <input id="portal-requester" value={requester} onChange={e => setRequester(e.target.value)} />
            </div>
            {includeEnv && (
              <div className="jira-field">
                <label htmlFor="portal-env">{en ? 'Environment' : 'Lingkungan'}</label>
                <select id="portal-env" value={environment} onChange={e => setEnvironment(e.target.value)}>
                  <option value="Production (APAC Edge)">Production (APAC Edge)</option>
                  <option value="Staging / UAT">Staging / UAT</option>
                  <option value="CI / Playwright Sandbox">CI / Playwright Sandbox</option>
                </select>
              </div>
            )}
          </div>

          {includeImpact && (
            <div className="jira-field">
              <label htmlFor="portal-prio">{en ? 'Business Urgency / Priority' : 'Tingkat Urgensi / Prioritas'}</label>
              <select
                id="portal-prio"
                value={priority}
                onChange={e => setPriority(e.target.value as JiraPriorityLevel)}
              >
                <option value="Highest">Highest (P0 · 4h SLA)</option>
                <option value="High">High (P1 · 24h SLA)</option>
                <option value="Medium">Medium (P2 · 72h SLA)</option>
                <option value="Low">Low (P3 · Standard)</option>
              </select>
            </div>
          )}

          <div className="jira-field">
            <label htmlFor="portal-details">{en ? 'Steps / Business Context' : 'Langkah Reproduksi / Konteks Bisnis'}</label>
            <textarea
              id="portal-details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={en ? 'Describe expected vs actual behavior…' : 'Jelaskan perilaku yang diharapkan vs aktual…'}
            />
          </div>

          <button type="submit" className="button button-primary" data-testid="jira-form-submit-btn">
            <Send size={15} /> {en ? 'Submit to Active Sprint Board' : 'Kirim ke Board Sprint Aktif'}
          </button>
        </form>
      </article>
    </section>
  )
}

interface JiraWorkflowSettingsViewProps {
  en: boolean
  issues: readonly JiraIssue[]
  wipLimits: Record<JiraStatusId, number>
  requireSubtaskForDone: boolean
  onToggleRequireSubtask: () => void
  onUpdateWipLimit: (col: JiraStatusId, next: number) => void
  onFilterByStatus: (col: JiraStatusId) => void
}

const ROLE_PERMISSIONS = [
  { role: 'Project Admin', create: true, transition: true, completeSprint: true, deleteIssue: true, editWorkflow: true },
  { role: 'Scrum Master / PM', create: true, transition: true, completeSprint: true, deleteIssue: false, editWorkflow: true },
  { role: 'Staff Engineer', create: true, transition: true, completeSprint: false, deleteIssue: false, editWorkflow: false },
  { role: 'QA / SDET Lead', create: true, transition: true, completeSprint: false, deleteIssue: false, editWorkflow: false },
  { role: 'Executive Viewer', create: false, transition: false, completeSprint: false, deleteIssue: false, editWorkflow: false },
]

export function JiraWorkflowSettingsView({
  en,
  issues,
  wipLimits,
  requireSubtaskForDone,
  onToggleRequireSubtask,
  onUpdateWipLimit,
  onFilterByStatus,
}: JiraWorkflowSettingsViewProps) {
  const [perms, setPerms] = useState(ROLE_PERMISSIONS)

  const counts = useMemo(
    () => ({
      todo: issues.filter(i => i.status === 'todo').length,
      in_progress: issues.filter(i => i.status === 'in_progress').length,
      review: issues.filter(i => i.status === 'review').length,
      blocked: issues.filter(i => i.status === 'blocked').length,
      done: issues.filter(i => i.status === 'done').length,
    }),
    [issues],
  )

  return (
    <section
      className="jira-backlog-stack"
      data-testid="jira-workflow-panel"
      aria-label={en ? 'Visual Workflow Designer and Project Settings' : 'Desainer Workflow Visual dan Pengaturan Proyek'}
    >
      {/* Visual SVG State Machine Diagram */}
      <article className="jira-panel-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <span className="jira-kpi-label">
              <GitMerge size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {en ? 'JIRA VISUAL WORKFLOW DESIGNER · STATE MACHINE' : 'DESAINER WORKFLOW VISUAL JIRA · MESIN STATUS'}
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
              {en
                ? 'Interactive Status Graph & Transition Guardrails (Click Any Node to Filter)'
                : 'Graf Status Interaktif & Aturan Transisi (Klik Node untuk Memfilter)'}
            </h2>
          </div>
          <label className="jira-avatar-pill" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={requireSubtaskForDone} onChange={onToggleRequireSubtask} />
            <span>
              <ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {en ? 'Validator: Warn if open subtasks on Done' : 'Validator: Cek subtask terbuka saat Done'}
            </span>
          </label>
        </div>

        <div className="jira-gantt-scroll">
          <svg
            className="jira-chart-svg"
            viewBox="0 0 820 215"
            role="img"
            aria-label={en ? 'Jira workflow state transition diagram' : 'Diagram transisi workflow Jira'}
          >
            <defs>
              <marker id="wf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#7dd3fc" />
              </marker>
              <marker id="wf-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f87171" />
              </marker>
            </defs>

            {/* Primary transitions */}
            <line x1="165" y1="68" x2="232" y2="68" stroke="#7dd3fc" strokeWidth="2.2" markerEnd="url(#wf-arrow)" />
            <line x1="382" y1="68" x2="449" y2="68" stroke="#7dd3fc" strokeWidth="2.2" markerEnd="url(#wf-arrow)" />
            <line x1="599" y1="68" x2="666" y2="68" stroke="#4ade80" strokeWidth="2.2" markerEnd="url(#wf-arrow)" />

            {/* Blocked escalation loops */}
            <path d="M 310 98 L 310 155 L 365 155" fill="none" stroke="#f87171" strokeWidth="1.8" strokeDasharray="4 4" markerEnd="url(#wf-arrow-red)" />
            <path d="M 520 98 L 520 155 L 495 155" fill="none" stroke="#f87171" strokeWidth="1.8" strokeDasharray="4 4" markerEnd="url(#wf-arrow-red)" />

            {/* Nodes */}
            {(
              [
                { id: 'todo' as JiraStatusId, x: 20, y: 38, w: 145, color: '#94a3b8', title: 'TO DO', sub: `${counts.todo} issues` },
                { id: 'in_progress' as JiraStatusId, x: 237, y: 38, w: 145, color: '#38bdf8', title: 'IN PROGRESS', sub: `${counts.in_progress} · WIP ${wipLimits.in_progress || '∞'}` },
                { id: 'review' as JiraStatusId, x: 454, y: 38, w: 145, color: '#a78bfa', title: 'REVIEW & QA', sub: `${counts.review} · AUTO-02` },
                { id: 'done' as JiraStatusId, x: 671, y: 38, w: 132, color: '#4ade80', title: 'DONE', sub: `${counts.done} · AUTO-03` },
                { id: 'blocked' as JiraStatusId, x: 370, y: 128, w: 125, color: '#f87171', title: 'BLOCKED', sub: `${counts.blocked} · SLA WATCH` },
              ] as const
            ).map(node => (
              <g
                key={node.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onFilterByStatus(node.id)}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height="60"
                  rx="12"
                  fill="rgba(15, 27, 48, 0.92)"
                  stroke={node.color}
                  strokeWidth="2"
                />
                <text x={node.x + node.w / 2} y={node.y + 26} textAnchor="middle" fill="#f1f6ff" fontSize="11" fontWeight="700">
                  {node.title}
                </text>
                <text x={node.x + node.w / 2} y={node.y + 44} textAnchor="middle" fill={node.color} fontSize="10">
                  {node.sub}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* WIP Limit Configurator */}
        <div className="jira-horizon-grid">
          {(['in_progress', 'review', 'blocked'] as const).map(col => (
            <div className="jira-rule-item" key={col}>
              <div>
                <strong style={{ textTransform: 'uppercase', fontSize: 12 }}>{col.replace('_', ' ')}</strong>
                <div className="jira-kpi-sub">{en ? 'Max concurrent tickets' : 'Maksimal tiket bersamaan'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="jira-chip-btn"
                  onClick={() => onUpdateWipLimit(col, Math.max(0, wipLimits[col] - 1))}
                >
                  −
                </button>
                <strong>{wipLimits[col] || '∞'}</strong>
                <button
                  type="button"
                  className="jira-chip-btn"
                  onClick={() => onUpdateWipLimit(col, wipLimits[col] + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* Role-Based Project Permissions Matrix */}
      <article className="jira-panel-card">
        <div>
          <span className="jira-kpi-label">
            <Settings2 size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {en ? 'PROJECT ACCESS CONTROL & PERMISSIONS SCHEME' : 'SKEMA KONTROL AKSES & IZIN PERAN PROYEK'}
          </span>
          <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>
            {en ? 'Zero-Trust RBAC Governance Matrix' : 'Matriks Tata Kelola RBAC Zero-Trust'}
          </h2>
        </div>

        <div className="jira-table-wrap">
          <table className="jira-table">
            <thead>
              <tr>
                <th>{en ? 'Project Role' : 'Peran Proyek'}</th>
                <th>{en ? 'Create Issues' : 'Buat Tiket'}</th>
                <th>{en ? 'Transition Board' : 'Geser Status'}</th>
                <th>{en ? 'Complete Sprint' : 'Tutup Sprint'}</th>
                <th>{en ? 'Delete Issues' : 'Hapus Tiket'}</th>
                <th>{en ? 'Edit Workflow' : 'Ubah Workflow'}</th>
              </tr>
            </thead>
            <tbody>
              {perms.map((row, rowIdx) => (
                <tr key={row.role}>
                  <td>
                    <strong>{row.role}</strong>
                  </td>
                  {(['create', 'transition', 'completeSprint', 'deleteIssue', 'editWorkflow'] as const).map(key => (
                    <td key={key}>
                      <button
                        type="button"
                        className={row[key] ? 'jira-kpi-badge' : 'jira-chip-btn'}
                        onClick={() =>
                          setPerms(prev =>
                            prev.map((r, idx) => (idx === rowIdx ? { ...r, [key]: !r[key] } : r)),
                          )
                        }
                      >
                        {row[key] ? <CheckCircle2 size={12} style={{ verticalAlign: 'middle' }} /> : '—'}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
