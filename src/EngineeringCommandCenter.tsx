import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, AlertTriangle, ArrowDownToLine, Check, ClipboardCheck, FileText, Plus, Search, ShieldCheck, Trash2, Workflow } from 'lucide-react'
import { useLanguage } from './i18n'
import { QATraceability } from './QATraceability'
import { SloErrorBudgetWorksheet } from './SloErrorBudgetWorksheet'
import { ReleaseEvidencePanel } from './ReleaseEvidencePanel'
import { AiCopilotPanel, SvgRingGauge, SvgStackedBar, SvgTrendArea } from './DashboardKit'
import './EngineeringCommandCenter.css'

type Task = { id: string; title: string; owner: string; priority: 'P0' | 'P1' | 'P2'; status: 'backlog' | 'active' | 'done' }
type Incident = { id: string; title: string; severity: 'SEV-1' | 'SEV-2' | 'SEV-3'; status: 'open' | 'investigating' | 'resolved'; impact: string }
type Decision = { id: string; title: string; context: string; decision: string; status: 'proposed' | 'accepted' | 'superseded' }
type Data = { tasks: Task[]; incidents: Incident[]; decisions: Decision[]; release: Record<string, boolean> }
type TaskFilter = 'all' | 'p0' | 'active' | 'backlog' | 'done'
type IncidentFilter = 'all' | 'open' | 'sev1' | 'resolved'

const KEY = 'dreamex-command-center-v1'
const checks = [
  { id: 'tests', en: 'Automated and critical-path tests pass', idText: 'Tes otomatis dan jalur kritis lulus' },
  { id: 'security', en: 'No unresolved critical/high security findings', idText: 'Tidak ada temuan keamanan kritis/tinggi yang belum selesai' },
  { id: 'rollback', en: 'Rollback and recovery plan documented', idText: 'Rencana rollback dan pemulihan terdokumentasi' },
  { id: 'monitoring', en: 'Monitoring, alerts, and owner are confirmed', idText: 'Monitoring, alert, dan penanggung jawab terkonfirmasi' },
  { id: 'accessibility', en: 'Accessibility and responsive checks reviewed', idText: 'Pemeriksaan aksesibilitas dan responsivitas ditinjau' },
  { id: 'comms', en: 'Release notes and user communication are ready', idText: 'Catatan rilis dan komunikasi pengguna siap' },
]
const initial: Data = {
  tasks: [
    { id: 'task-1', title: 'Validate production build and routes', owner: 'Engineering', priority: 'P0', status: 'active' },
    { id: 'task-2', title: 'Review mobile navigation and keyboard access', owner: 'Quality', priority: 'P1', status: 'backlog' },
    { id: 'task-3', title: 'Verify RSS, sitemap, and canonical URLs', owner: 'Platform', priority: 'P1', status: 'backlog' },
  ],
  incidents: [],
  decisions: [],
  release: {},
}

function readData(): Data {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!x || typeof x !== 'object') return initial
    return {
      tasks: Array.isArray(x.tasks) ? x.tasks.filter((v: Task) => v && typeof v.id === 'string' && typeof v.title === 'string' && ['backlog', 'active', 'done'].includes(v.status)) : initial.tasks,
      incidents: Array.isArray(x.incidents) ? x.incidents.filter((v: Incident) => v && typeof v.id === 'string' && typeof v.title === 'string' && ['open', 'investigating', 'resolved'].includes(v.status)) : [],
      decisions: Array.isArray(x.decisions) ? x.decisions.filter((v: Decision) => v && typeof v.id === 'string' && typeof v.title === 'string' && ['proposed', 'accepted', 'superseded'].includes(v.status)) : [],
      release: x.release && typeof x.release === 'object' ? x.release : {},
    }
  } catch {
    return initial
  }
}

const id = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 7))

export function EngineeringCommandCenterPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [data, setData] = useState<Data>(readData)
  const [tab, setTab] = useState<'overview' | 'tasks' | 'incidents' | 'decisions' | 'release' | 'traceability'>('overview')
  const [task, setTask] = useState('')
  const [owner, setOwner] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('P1')
  const [taskQuery, setTaskQuery] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [incident, setIncident] = useState('')
  const [impact, setImpact] = useState('')
  const [severity, setSeverity] = useState<Incident['severity']>('SEV-2')
  const [incidentQuery, setIncidentQuery] = useState('')
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all')
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [decision, setDecision] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      setNotice(en ? 'Browser storage is unavailable; changes may not persist.' : 'Penyimpanan browser tidak tersedia; perubahan mungkin tidak tersimpan.')
    }
  }, [data, en])

  const stats = useMemo(() => ({
    open: data.tasks.filter(x => x.status !== 'done').length,
    active: data.tasks.filter(x => x.status === 'active').length,
    done: data.tasks.filter(x => x.status === 'done').length,
    backlog: data.tasks.filter(x => x.status === 'backlog').length,
    p0: data.tasks.filter(x => x.priority === 'P0').length,
    p1: data.tasks.filter(x => x.priority === 'P1').length,
    p2: data.tasks.filter(x => x.priority === 'P2').length,
    incidents: data.incidents.filter(x => x.status !== 'resolved').length,
    ready: checks.filter(x => data.release[x.id]).length,
  }), [data])

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLocaleLowerCase()
    return data.tasks.filter(item => {
      if (taskFilter === 'p0' && item.priority !== 'P0') return false
      if (taskFilter === 'active' && item.status !== 'active') return false
      if (taskFilter === 'backlog' && item.status !== 'backlog') return false
      if (taskFilter === 'done' && item.status !== 'done') return false
      if (!q) return true
      return `${item.title} ${item.owner} ${item.priority}`.toLocaleLowerCase().includes(q)
    })
  }, [data.tasks, taskFilter, taskQuery])

  const filteredIncidents = useMemo(() => {
    const q = incidentQuery.trim().toLocaleLowerCase()
    return data.incidents.filter(item => {
      if (incidentFilter === 'open' && item.status === 'resolved') return false
      if (incidentFilter === 'sev1' && item.severity !== 'SEV-1') return false
      if (incidentFilter === 'resolved' && item.status !== 'resolved') return false
      if (!q) return true
      return `${item.title} ${item.impact} ${item.severity}`.toLocaleLowerCase().includes(q)
    })
  }, [data.incidents, incidentFilter, incidentQuery])

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, ...data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dreamex-command-center-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    setNotice(en ? 'Workspace backup exported.' : 'Cadangan workspace diekspor.')
  }

  const exportMarkdown = () => {
    const md = [
      '# DreamEx Engineering Command Center Brief',
      `Exported: ${new Date().toISOString()}`,
      '',
      `## Delivery Queue (${stats.open} open / ${data.tasks.length} total)`,
      ...data.tasks.map(t => `- [${t.status}] (${t.priority}) ${t.title} — ${t.owner}`),
      '',
      `## Incident Register (${stats.incidents} active)`,
      ...(data.incidents.length ? data.incidents.map(i => `- [${i.status}] (${i.severity}) ${i.title}${i.impact ? `: ${i.impact}` : ''}`) : ['- None recorded']),
      '',
      `## Release Gate (${stats.ready}/${checks.length})`,
      ...checks.map(c => `- [${data.release[c.id] ? 'x' : ' '}] ${en ? c.en : c.idText}`),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'dreamex-command-center-brief.md'
    a.click()
    URL.revokeObjectURL(url)
    setNotice(en ? 'Markdown operational brief exported.' : 'Ringkasan operasional Markdown diekspor.')
  }

  const tabs = [
    { id: 'overview', label: en ? 'Overview' : 'Ringkasan', icon: Activity },
    { id: 'tasks', label: en ? 'Work items' : 'Daftar tugas', icon: Workflow },
    { id: 'incidents', label: en ? 'Incidents' : 'Insiden', icon: AlertTriangle },
    { id: 'decisions', label: 'ADRs', icon: FileText },
    { id: 'release', label: en ? 'Release gate' : 'Gerbang rilis', icon: ClipboardCheck },
    { id: 'traceability', label: en ? 'QA traceability' : 'Traceability QA', icon: ClipboardCheck },
  ] as const

  const addTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!task.trim()) return
    setData(s => ({ ...s, tasks: [{ id: id(), title: task.trim().slice(0, 160), owner: owner.trim().slice(0, 80) || (en ? 'Unassigned' : 'Belum ditugaskan'), priority, status: 'backlog' as const }, ...s.tasks].slice(0, 200) }))
    setTask('')
    setOwner('')
  }

  const addIncident = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!incident.trim()) return
    setData(s => ({ ...s, incidents: [{ id: id(), title: incident.trim().slice(0, 160), severity, status: 'open' as const, impact: impact.trim().slice(0, 300) }, ...s.incidents].slice(0, 100) }))
    setIncident('')
    setImpact('')
  }

  const addDecision = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || !decision.trim()) return
    setData(s => ({ ...s, decisions: [{ id: id(), title: title.trim().slice(0, 160), context: context.trim().slice(0, 500), decision: decision.trim().slice(0, 1000), status: 'proposed' as const }, ...s.decisions].slice(0, 100) }))
    setTitle('')
    setContext('')
    setDecision('')
  }

  const cycleTaskStatus = (current: Task['status']): Task['status'] => (current === 'backlog' ? 'active' : current === 'active' ? 'done' : 'backlog')
  const taskCompletionPct = data.tasks.length ? Math.round((stats.done / data.tasks.length) * 100) : 0
  const releasePct = Math.round((stats.ready / checks.length) * 100)

  return (
    <main id="main-content" className="container command-center-page">
      <header className="workspace-hero command-center-hero">
        <span className="section-kicker"><Workflow size={14} /> DREAMEX ENGINEERING / CONTROL PLANE</span>
        <h1>{en ? <>Operate with clarity.<br /><span>Ship with confidence.</span></> : <>Kelola dengan jelas.<br /><span>Rilis dengan percaya diri.</span></>}</h1>
        <p>{en ? 'A lightweight engineering control plane for work tracking, incident records, architecture decisions, and release readiness. Local-first and exportable.' : 'Pusat kendali engineering untuk tugas, insiden, keputusan arsitektur, dan kesiapan rilis. Mengutamakan penyimpanan lokal dan dapat diekspor.'}</p>
        <div className="command-center-actions">
          <span className="command-center-local"><ShieldCheck size={15} />{en ? 'Stored in this browser only' : 'Tersimpan hanya di browser ini'}</span>
          <div className="command-center-action-btns">
            <button type="button" className="button button-secondary" onClick={exportMarkdown}><FileText size={15} />{en ? 'Export brief' : 'Ekspor brief'}</button>
            <button type="button" className="button button-secondary" onClick={exportData}><ArrowDownToLine size={15} />{en ? 'Export backup' : 'Ekspor cadangan'}</button>
          </div>
        </div>
      </header>

      <section className="command-center-stats">
        <div className="command-center-stat-card">
          <div className="command-center-stat-copy">
            <span>{en ? 'Open work items' : 'Tugas terbuka'}</span>
            <strong>{stats.open}</strong>
            <small>{stats.active} {en ? 'in progress' : 'sedang dikerjakan'}</small>
          </div>
          <SvgRingGauge
            value={taskCompletionPct}
            label={en ? 'Task completion ratio' : 'Rasio penyelesaian tugas'}
            tone="cyan"
            size={60}
          />
        </div>
        <div className="command-center-stat-card">
          <div className="command-center-stat-copy">
            <span>{en ? 'Active incidents' : 'Insiden aktif'}</span>
            <strong>{stats.incidents}</strong>
            <small>{en ? 'Triage or resolution required' : 'Perlu triase atau penyelesaian'}</small>
          </div>
          <SvgRingGauge
            value={Math.max(0, 100 - stats.incidents * 25)}
            label={en ? 'Service calm index' : 'Indeks kestabilan insiden'}
            tone={stats.incidents > 0 ? 'rose' : 'emerald'}
            size={60}
          />
        </div>
        <div className="command-center-stat-card">
          <div className="command-center-stat-copy">
            <span>{en ? 'Release checks' : 'Pemeriksaan rilis'}</span>
            <strong>{stats.ready}/{checks.length}</strong>
            <small>{en ? 'Evidence checklist' : 'Checklist bukti rilis'}</small>
          </div>
          <SvgRingGauge
            value={releasePct}
            label={en ? 'Release readiness ratio' : 'Rasio kesiapan rilis'}
            tone={releasePct >= 100 ? 'emerald' : releasePct >= 50 ? 'cyan' : 'amber'}
            size={60}
          />
        </div>
      </section>

      <nav className="command-center-tabs" role="tablist" aria-label={en ? 'Command center sections' : 'Bagian command center'}>
        {tabs.map(x => {
          const Icon = x.icon
          return (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)}>
              <Icon size={15} />{x.label}
            </button>
          )
        })}
      </nav>

      {notice && <p className="command-center-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={en ? 'Dismiss notice' : 'Tutup pemberitahuan'}>×</button></p>}

      {tab === 'overview' && (
        <section className="command-center-content">
          <div className="command-center-section-head">
            <div><span className="section-kicker">01 / OPERATIONS</span><h2>{en ? 'Engineering pulse' : 'Kondisi engineering'}</h2></div>
            <p>{en ? 'A concise snapshot of the work tracked in this browser.' : 'Ringkasan pekerjaan yang dilacak di browser ini.'}</p>
          </div>
          <div className="dx-split-grid">
            <SvgStackedBar
              title={en ? 'Priority Distribution' : 'Distribusi Prioritas'}
              totalLabel={`${data.tasks.length} ${en ? 'tasks' : 'tugas'}`}
              segments={[
                { label: 'P0 Critical', value: stats.p0, color: '#fb7185' },
                { label: 'P1 High', value: stats.p1, color: '#fbbf24' },
                { label: 'P2 Normal', value: stats.p2, color: '#38bdf8' },
              ]}
            />
            <SvgTrendArea
              title={en ? 'Delivery Readiness Trajectory' : 'Trajektori Kesiapan Rilis'}
              meta={`${releasePct}% · ${stats.done}/${data.tasks.length}`}
              tone={releasePct >= 80 ? 'emerald' : 'cyan'}
              points={[
                { label: en ? 'Queue' : 'Antre', value: stats.backlog },
                { label: en ? 'Active' : 'Aktif', value: stats.active },
                { label: en ? 'Done' : 'Selesai', value: stats.done },
                { label: en ? 'Checks' : 'Cek', value: stats.ready },
                { label: 'Gate %', value: releasePct },
              ]}
            />
          </div>
          <div className="command-center-overview-grid">
            {[
              { id: 'tasks', icon: Workflow, title: en ? 'Work queue' : 'Antrean pekerjaan', desc: en ? 'Track priorities, ownership, and progress.' : 'Lacak prioritas, PIC, dan progres.' },
              { id: 'incidents', icon: AlertTriangle, title: en ? 'Incident desk' : 'Meja insiden', desc: en ? 'Record impact and follow incidents to resolution.' : 'Catat dampak dan tindak lanjuti insiden.' },
              { id: 'decisions', icon: FileText, title: en ? 'Architecture decisions' : 'Keputusan arsitektur', desc: en ? 'Capture context and rationale for technical choices.' : 'Catat konteks dan alasan keputusan teknis.' },
              { id: 'release', icon: ShieldCheck, title: en ? 'Release readiness' : 'Kesiapan rilis', desc: en ? 'Review release evidence with an explicit checklist.' : 'Tinjau bukti rilis dengan checklist eksplisit.' },
            ].map(x => {
              const Icon = x.icon
              return (
                <article className="command-center-panel" key={x.id}>
                  <span className="command-center-panel-icon"><Icon size={18} /></span>
                  <h3>{x.title}</h3>
                  <p>{x.desc}</p>
                  <button type="button" className="read-link" onClick={() => setTab(x.id as typeof tab)}>{en ? 'Open section' : 'Buka bagian'} →</button>
                </article>
              )
            })}
          </div>
          <AiCopilotPanel
            kicker={en ? 'COMMAND CENTER CO-PILOT' : 'KO-PILOT COMMAND CENTER'}
            title={en ? 'Sprint & Incident Triage Brief' : 'Brief Triase Sprint & Insiden'}
            summaryLines={[
              en ? `Work items: ${stats.open} open (${stats.p0} P0, ${stats.active} actively running).` : `Daftar tugas: ${stats.open} terbuka (${stats.p0} P0, ${stats.active} aktif).`,
              en ? `Incidents: ${stats.incidents} unresolved out of ${data.incidents.length} logged.` : `Insiden: ${stats.incidents} belum selesai dari ${data.incidents.length} tercatat.`,
              en ? `ADRs recorded: ${data.decisions.length} · Release readiness: ${stats.ready}/${checks.length}.` : `ADR tercatat: ${data.decisions.length} · Kesiapan rilis: ${stats.ready}/${checks.length}.`,
            ]}
            recommendations={[
              ...(stats.incidents > 0 ? [en ? `Triage ${stats.incidents} open incident(s) before expanding active feature scope.` : `Triase ${stats.incidents} insiden terbuka sebelum menambah ruang lingkup fitur.`] : [en ? 'Zero open incidents logged in this browser session.' : 'Tidak ada insiden terbuka pada sesi browser ini.']),
              ...(stats.p0 > 0 ? [en ? `Prioritize P0 work items first (${stats.p0} tracked).` : `Prioritaskan item kerja P0 terlebih dahulu (${stats.p0} tercatat).`] : [en ? 'No critical P0 blockers currently in queue.' : 'Saat ini tidak ada pemblokir kritis P0.']),
              en ? `${checks.length - stats.ready} release checks remain before shipping sign-off.` : `${checks.length - stats.ready} pemeriksaan rilis tersisa sebelum sign-off rilis.`,
            ]}
            systemPrompt="You are a concise engineering operations lead. Summarize actionable sprint triage & release focus based strictly on user-tracked tasks, incidents, and ADRs."
            userPrompt={`Tasks total=${data.tasks.length}, open=${stats.open}, active=${stats.active}, P0=${stats.p0}. Open incidents=${stats.incidents}. ADRs=${data.decisions.length}. Release=${stats.ready}/${checks.length}. Recommend 3 focused actions.`}
            en={en}
          />
          <SloErrorBudgetWorksheet />
        </section>
      )}

      {tab === 'tasks' && (
        <section className="command-center-content">
          <div className="command-center-section-head">
            <div><span className="section-kicker">02 / DELIVERY</span><h2>{en ? 'Work items' : 'Daftar tugas'}</h2></div>
            <p>{en ? 'Local task queue; no external tracker connection.' : 'Antrean lokal; tidak terhubung ke layanan eksternal.'}</p>
          </div>
          <form className="command-center-form" onSubmit={addTask}>
            <label>{en ? 'Task title' : 'Judul tugas'}<input value={task} onChange={e => setTask(e.target.value)} maxLength={160} required placeholder={en ? 'e.g. Verify mobile navigation' : 'mis. Verifikasi navigasi mobile'} /></label>
            <label>{en ? 'Owner / team' : 'PIC / tim'}<input value={owner} onChange={e => setOwner(e.target.value)} maxLength={80} placeholder="Engineering, QA…" /></label>
            <label>{en ? 'Priority' : 'Prioritas'}<select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}><option value="P0">P0 — {en ? 'Critical' : 'Kritis'}</option><option value="P1">P1 — {en ? 'High' : 'Tinggi'}</option><option value="P2">P2 — {en ? 'Normal' : 'Normal'}</option></select></label>
            <button type="submit" className="button button-primary"><Plus size={15} />{en ? 'Add work item' : 'Tambah tugas'}</button>
          </form>
          <div className="command-center-toolbar">
            <label className="command-center-search-mini">
              <Search size={14} />
              <input type="search" value={taskQuery} onChange={e => setTaskQuery(e.target.value)} placeholder={en ? 'Filter tasks or owners…' : 'Filter tugas atau PIC…'} aria-label={en ? 'Filter work items' : 'Filter daftar tugas'} />
            </label>
            <div className="dx-filter-pills" role="group" aria-label={en ? 'Task status filter' : 'Filter status tugas'}>
              {([
                { id: 'all', label: en ? 'All' : 'Semua' },
                { id: 'p0', label: 'P0' },
                { id: 'active', label: en ? 'Active' : 'Dikerjakan' },
                { id: 'backlog', label: en ? 'Backlog' : 'Antrean' },
                { id: 'done', label: en ? 'Done' : 'Selesai' },
              ] as const).map(f => (
                <button key={f.id} type="button" className={taskFilter === f.id ? 'dx-filter-pill active' : 'dx-filter-pill'} aria-pressed={taskFilter === f.id} onClick={() => setTaskFilter(f.id)}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="command-center-records">
            {filteredTasks.map(x => (
              <article className="command-center-record" key={x.id}>
                <div className="command-center-record-main">
                  <span className={'command-center-priority ' + x.priority.toLowerCase()}>{x.priority}</span>
                  <strong>{x.title}</strong>
                  <small>{en ? 'Owner' : 'PIC'}: {x.owner}</small>
                </div>
                <button
                  type="button"
                  className="command-center-advance"
                  onClick={() => setData(s => ({ ...s, tasks: s.tasks.map(v => v.id === x.id ? { ...v, status: cycleTaskStatus(v.status) } : v) }))}
                >
                  {x.status === 'backlog' ? (en ? 'Start' : 'Mulai') : x.status === 'active' ? (en ? 'Complete' : 'Selesaikan') : (en ? 'Reopen' : 'Buka lagi')}
                </button>
                <label className="command-center-status">
                  Status
                  <select aria-label={'Status: ' + x.title} value={x.status} onChange={e => setData(s => ({ ...s, tasks: s.tasks.map(v => v.id === x.id ? { ...v, status: e.target.value as Task['status'] } : v) }))}>
                    <option value="backlog">{en ? 'Backlog' : 'Antrean'}</option>
                    <option value="active">{en ? 'In progress' : 'Dikerjakan'}</option>
                    <option value="done">{en ? 'Done' : 'Selesai'}</option>
                  </select>
                </label>
                <button type="button" className="command-center-delete" aria-label={(en ? 'Delete ' : 'Hapus ') + x.title} onClick={() => setData(s => ({ ...s, tasks: s.tasks.filter(v => v.id !== x.id) }))}><Trash2 size={15} /></button>
              </article>
            ))}
            {!filteredTasks.length && <p className="command-center-empty">{en ? 'No tasks match this view.' : 'Tidak ada tugas yang sesuai filter ini.'}</p>}
          </div>
        </section>
      )}

      {tab === 'incidents' && (
        <section className="command-center-content">
          <div className="command-center-section-head">
            <div><span className="section-kicker">03 / RELIABILITY</span><h2>{en ? 'Incident desk' : 'Meja insiden'}</h2></div>
            <p>{en ? 'A local incident register, not a paging or monitoring service.' : 'Register insiden lokal, bukan layanan paging atau monitoring.'}</p>
          </div>
          <form className="command-center-form command-center-form-wide" onSubmit={addIncident}>
            <label>{en ? 'Incident summary' : 'Ringkasan insiden'}<input value={incident} onChange={e => setIncident(e.target.value)} maxLength={160} required /></label>
            <label>{en ? 'Severity' : 'Keparahan'}<select value={severity} onChange={e => setSeverity(e.target.value as Incident['severity'])}><option>SEV-1</option><option>SEV-2</option><option>SEV-3</option></select></label>
            <label className="field-wide">{en ? 'Impact / notes' : 'Dampak / catatan'}<textarea value={impact} onChange={e => setImpact(e.target.value)} maxLength={300} rows={2} /></label>
            <button type="submit" className="button button-primary"><Plus size={15} />{en ? 'Record incident' : 'Catat insiden'}</button>
          </form>
          {data.incidents.length > 0 && (
            <div className="command-center-toolbar">
              <label className="command-center-search-mini">
                <Search size={14} />
                <input type="search" value={incidentQuery} onChange={e => setIncidentQuery(e.target.value)} placeholder={en ? 'Filter incidents…' : 'Filter insiden…'} aria-label={en ? 'Filter incidents' : 'Filter insiden'} />
              </label>
              <div className="dx-filter-pills" role="group" aria-label={en ? 'Incident filter' : 'Filter insiden'}>
                {([
                  { id: 'all', label: en ? 'All' : 'Semua' },
                  { id: 'open', label: en ? 'Open' : 'Terbuka' },
                  { id: 'sev1', label: 'SEV-1' },
                  { id: 'resolved', label: en ? 'Resolved' : 'Selesai' },
                ] as const).map(f => (
                  <button key={f.id} type="button" className={incidentFilter === f.id ? 'dx-filter-pill active' : 'dx-filter-pill'} aria-pressed={incidentFilter === f.id} onClick={() => setIncidentFilter(f.id)}>{f.label}</button>
                ))}
              </div>
            </div>
          )}
          <div className="command-center-records">
            {filteredIncidents.map(x => (
              <article className="command-center-record" key={x.id}>
                <div className="command-center-record-main">
                  <span className={'command-center-priority ' + (x.severity === 'SEV-1' ? 'p0' : x.severity === 'SEV-2' ? 'p1' : 'p2')}>{x.severity}</span>
                  <strong>{x.title}</strong>
                  <small>{x.impact || (en ? 'No impact notes.' : 'Belum ada catatan dampak.')}</small>
                </div>
                <label className="command-center-status">
                  {en ? 'Status' : 'Status'}
                  <select aria-label={'Incident status: ' + x.title} value={x.status} onChange={e => setData(s => ({ ...s, incidents: s.incidents.map(v => v.id === x.id ? { ...v, status: e.target.value as Incident['status'] } : v) }))}>
                    <option value="open">{en ? 'Open' : 'Terbuka'}</option>
                    <option value="investigating">{en ? 'Investigating' : 'Diinvestigasi'}</option>
                    <option value="resolved">{en ? 'Resolved' : 'Selesai'}</option>
                  </select>
                </label>
                <button type="button" className="command-center-delete" aria-label={(en ? 'Delete ' : 'Hapus ') + x.title} onClick={() => setData(s => ({ ...s, incidents: s.incidents.filter(v => v.id !== x.id) }))}><Trash2 size={15} /></button>
              </article>
            ))}
            {!filteredIncidents.length && <p className="command-center-empty">{en ? 'No incidents recorded yet.' : 'Belum ada insiden yang dicatat.'}</p>}
          </div>
        </section>
      )}

      {tab === 'decisions' && (
        <section className="command-center-content">
          <div className="command-center-section-head">
            <div><span className="section-kicker">04 / ARCHITECTURE</span><h2>{en ? 'Architecture decision records' : 'Catatan keputusan arsitektur'}</h2></div>
            <p>{en ? 'Document the why behind important technical choices.' : 'Dokumentasikan alasan di balik keputusan teknis.'}</p>
          </div>
          <form className="command-center-form command-center-form-wide" onSubmit={addDecision}>
            <label>{en ? 'Decision title' : 'Judul keputusan'}<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required /></label>
            <label>{en ? 'Context / constraints' : 'Konteks / batasan'}<textarea value={context} onChange={e => setContext(e.target.value)} maxLength={500} rows={2} /></label>
            <label className="field-wide">{en ? 'Decision and rationale' : 'Keputusan dan alasan'}<textarea value={decision} onChange={e => setDecision(e.target.value)} maxLength={1000} rows={3} required /></label>
            <button type="submit" className="button button-primary"><Plus size={15} />{en ? 'Create ADR' : 'Buat ADR'}</button>
          </form>
          <div className="command-center-records">
            {data.decisions.map(x => (
              <article className="command-center-record" key={x.id}>
                <div className="command-center-record-main">
                  <span className={'command-center-priority ' + x.status}>{x.status.toUpperCase()}</span>
                  <strong>{x.title}</strong>
                  <small>{x.context || (en ? 'No context supplied.' : 'Konteks belum diisi.')}</small>
                  <p>{x.decision}</p>
                </div>
                <label className="command-center-status">
                  {en ? 'Status' : 'Status'}
                  <select aria-label={'Decision status: ' + x.title} value={x.status} onChange={e => setData(s => ({ ...s, decisions: s.decisions.map(v => v.id === x.id ? { ...v, status: e.target.value as Decision['status'] } : v) }))}>
                    <option value="proposed">{en ? 'Proposed' : 'Diusulkan'}</option>
                    <option value="accepted">{en ? 'Accepted' : 'Diterima'}</option>
                    <option value="superseded">{en ? 'Superseded' : 'Digantikan'}</option>
                  </select>
                </label>
                <button type="button" className="command-center-delete" aria-label={(en ? 'Delete ' : 'Hapus ') + x.title} onClick={() => setData(s => ({ ...s, decisions: s.decisions.filter(v => v.id !== x.id) }))}><Trash2 size={15} /></button>
              </article>
            ))}
            {!data.decisions.length && <p className="command-center-empty">{en ? 'No decisions documented yet.' : 'Belum ada keputusan yang terdokumentasi.'}</p>}
          </div>
        </section>
      )}

      {tab === 'release' && (
        <section className="command-center-content">
          <div className="command-center-section-head">
            <div><span className="section-kicker">05 / RELEASE GOVERNANCE</span><h2>{en ? 'Release readiness gate' : 'Gerbang kesiapan rilis'}</h2></div>
            <p>{en ? 'Checklist evidence is not an automatic safety certification.' : 'Checklist bukan sertifikasi keamanan otomatis.'}</p>
          </div>
          <div className="command-center-release-progress"><span style={{ width: (stats.ready / checks.length * 100) + '%' }} /></div>
          <div className="command-center-release-list">
            {checks.map(x => (
              <label key={x.id} className={data.release[x.id] ? 'is-checked' : ''}>
                <input type="checkbox" checked={Boolean(data.release[x.id])} onChange={e => setData(s => ({ ...s, release: { ...s.release, [x.id]: e.target.checked } }))} />
                <span className="command-center-check-icon"><Check size={14} /></span>
                <span>{en ? x.en : x.idText}</span>
              </label>
            ))}
          </div>
          <p className="command-center-release-foot">
            {stats.ready === checks.length
              ? (en ? 'All checks marked complete. Verify supporting evidence before release.' : 'Semua pemeriksaan ditandai selesai. Verifikasi bukti sebelum rilis.')
              : (en ? String(checks.length - stats.ready) + ' checks remain.' : String(checks.length - stats.ready) + ' pemeriksaan tersisa.')}
          </p>
          <ReleaseEvidencePanel />
        </section>
      )}

      {tab === 'traceability' && <QATraceability />}

      <footer className="command-center-footer">
        <ShieldCheck size={15} />
        <span>{en ? 'Data lives in this browser profile. Export backups regularly. No alerting, paging, or cross-device sync is provided.' : 'Data berada di profil browser ini. Ekspor cadangan secara berkala. Tidak tersedia alert, paging, atau sinkronisasi lintas perangkat.'}</span>
      </footer>
    </main>
  )
}
