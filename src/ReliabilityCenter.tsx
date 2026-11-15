import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, AlertTriangle, Archive, CheckCircle2, Clock3, Download, FileText, Gauge, Plus, RotateCcw, ShieldCheck, Siren, Trash2 } from 'lucide-react'
import { useLanguage } from './i18n'
import { AiCopilotPanel, SvgRingGauge } from './DashboardKit'
import './ReliabilityCenter.css'

type IncidentEvent = { id: string; time: string; kind: string; note: string }
type Incident = { id: string; title: string; severity: string; status: string; service: string; impact: string; commander: string; startedAt: string; cause: string; mitigation: string; resolution: string; lessons: string; nextActions: string; timeline: IncidentEvent[]; updatedAt: string }
type Metrics = { deploymentsPerWeek: number; leadTimeHours: number; changeFailureRate: number; restoreHours: number; observationWindow: string }
const INCIDENT_KEY = 'dreamex-reliability-incidents-v1'
const METRICS_KEY = 'dreamex-reliability-metrics-v1'
const eventKinds = ['Detection', 'Triage', 'Mitigation', 'Recovery', 'Follow-up']
const defaultMetrics: Metrics = { deploymentsPerWeek: 0, leadTimeHours: 0, changeFailureRate: 0, restoreHours: 0, observationWindow: 'Last 30 days' }
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const emptyIncident = (): Incident => ({ id: '', title: '', severity: 'SEV-3', status: 'Investigating', service: '', impact: '', commander: '', startedAt: nowLocal(), cause: '', mitigation: '', resolution: '', lessons: '', nextActions: '', timeline: [], updatedAt: new Date().toISOString() })
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null }
function readIncidents(): Incident[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(INCIDENT_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.map(item => {
      const value = record(item)
      if (!value || typeof value.id !== 'string' || typeof value.title !== 'string') return null
      const timeline = Array.isArray(value.timeline) ? value.timeline.filter(item => { const event = record(item); return Boolean(event && typeof event.id === 'string' && typeof event.note === 'string') }) as IncidentEvent[] : []
      return { ...emptyIncident(), ...value, id: value.id, title: value.title, timeline } as Incident
    }).filter((item): item is Incident => item !== null).slice(0, 20)
  } catch { return [] }
}
function readMetrics(): Metrics {
  try {
    const value = record(JSON.parse(window.localStorage.getItem(METRICS_KEY) ?? 'null'))
    if (!value) return { ...defaultMetrics }
    const number = (key: keyof Omit<Metrics, 'observationWindow'>, max = 1000000) => typeof value[key] === 'number' && Number.isFinite(value[key]) ? Math.max(0, Math.min(max, value[key] as number)) : 0
    return { deploymentsPerWeek: number('deploymentsPerWeek'), leadTimeHours: number('leadTimeHours'), changeFailureRate: number('changeFailureRate', 100), restoreHours: number('restoreHours'), observationWindow: typeof value.observationWindow === 'string' ? value.observationWindow.slice(0, 80) : defaultMetrics.observationWindow }
  } catch { return { ...defaultMetrics } }
}
function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
function incidentMarkdown(item: Incident, metrics: Metrics) {
  return [
    '# Reliability & Incident Review', '',
    '## Incident: ' + (item.title || 'Untitled incident'), '',
    '- Severity: ' + item.severity, '- Status: ' + item.status, '- Service: ' + (item.service || 'Not specified'),
    '- Incident commander: ' + (item.commander || 'Not specified'), '- Started: ' + (item.startedAt || 'Not specified'),
    '', '## Impact', item.impact || 'Not documented', '', '## Timeline',
    ...(item.timeline.length ? item.timeline.map(event => '- **' + event.time + ' · ' + event.kind + ':** ' + event.note) : ['- No timeline events recorded']),
    '', '## Cause / contributing factors', item.cause || 'Not documented', '', '## Mitigation', item.mitigation || 'Not documented',
    '', '## Resolution', item.resolution || 'Not documented', '', '## Lessons learned', item.lessons || 'Not documented',
    '', '## Follow-up actions', item.nextActions || 'Not documented', '', '## Manually reported delivery metrics',
    '- Observation window: ' + metrics.observationWindow, '- Deployments per week: ' + metrics.deploymentsPerWeek,
    '- Change lead time (hours): ' + metrics.leadTimeHours, '- Change failure rate (%): ' + metrics.changeFailureRate,
    '- Restore time (hours): ' + metrics.restoreHours, '', '_Metrics are manually entered; no CI/CD or observability integration is connected._',
  ].join('\n')
}

export function ReliabilityCenterPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [metrics, setMetrics] = useState<Metrics>(readMetrics)
  const [incidents, setIncidents] = useState<Incident[]>(readIncidents)
  const [draft, setDraft] = useState<Incident>(emptyIncident)
  const [activeId, setActiveId] = useState('')
  const [eventKind, setEventKind] = useState(eventKinds[0])
  const [eventTime, setEventTime] = useState(nowLocal)
  const [eventNote, setEventNote] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4'>('all')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { try { window.localStorage.setItem(METRICS_KEY, JSON.stringify(metrics)) } catch { setNotice(en ? 'Browser storage is unavailable; metrics may not persist.' : 'Penyimpanan browser tidak tersedia; metrik mungkin tidak tersimpan.') } }, [metrics, en])
  const updateDraft = (patch: Partial<Incident>) => setDraft(current => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
  const updateMetric = (key: keyof Metrics, value: string) => setMetrics(current => ({ ...current, [key]: key === 'observationWindow' ? value.slice(0, 80) : Math.max(0, Math.min(key === 'changeFailureRate' ? 100 : 1000000, Number(value) || 0)) } as Metrics))
  const doraTier = (key: keyof Omit<Metrics, 'observationWindow'>, val: number) => {
    if (key === 'deploymentsPerWeek') return val >= 7 ? (en ? 'Self-assessed: Elite (daily+)' : 'Mandiri: Elite (harian+)') : val >= 1 ? (en ? 'Self-assessed: High (weekly)' : 'Mandiri: Tinggi (mingguan)') : val > 0 ? (en ? 'Self-assessed: Medium' : 'Mandiri: Sedang') : (en ? 'Manual input' : 'Input manual')
    if (key === 'leadTimeHours') return val <= 0 ? (en ? 'Manual input' : 'Input manual') : val <= 24 ? (en ? 'Self-assessed: Elite (<24h)' : 'Mandiri: Elite (<24j)') : val <= 168 ? (en ? 'Self-assessed: High (<1w)' : 'Mandiri: Tinggi (<1mg)') : (en ? 'Self-assessed: Medium' : 'Mandiri: Sedang')
    if (key === 'changeFailureRate') return val === 0 ? (en ? 'Manual baseline (0%)' : 'Baseline manual (0%)') : val <= 5 ? (en ? 'Self-assessed: Elite (<=5%)' : 'Mandiri: Elite (<=5%)') : val <= 15 ? (en ? 'Self-assessed: High (<=15%)' : 'Mandiri: Tinggi (<=15%)') : (en ? 'Needs stabilization (>15%)' : 'Perlu stabilisasi (>15%)')
    return val <= 0 ? (en ? 'Manual input' : 'Input manual') : val <= 1 ? (en ? 'Self-assessed: Elite (<1h)' : 'Mandiri: Elite (<1j)') : val <= 24 ? (en ? 'Self-assessed: High (<24h)' : 'Mandiri: Tinggi (<24j)') : (en ? 'Self-assessed: Medium' : 'Mandiri: Sedang')
  }
  const metricCards = useMemo(() => [
    { key: 'deploymentsPerWeek' as const, label: en ? 'Deployments / week' : 'Deployment / minggu', unit: en ? 'deployments' : 'deployment', icon: Activity },
    { key: 'leadTimeHours' as const, label: en ? 'Change lead time' : 'Lead time perubahan', unit: en ? 'hours' : 'jam', icon: Clock3 },
    { key: 'changeFailureRate' as const, label: en ? 'Change failure rate' : 'Change failure rate', unit: '%', icon: AlertTriangle },
    { key: 'restoreHours' as const, label: en ? 'Restore time' : 'Waktu pemulihan', unit: en ? 'hours' : 'jam', icon: RotateCcw },
  ], [en])
  const resolvedCount = useMemo(() => incidents.filter(item => item.status === 'Resolved' || item.status === 'Closed').length, [incidents])
  const filteredIncidents = useMemo(() => severityFilter === 'all' ? incidents : incidents.filter(item => item.severity === severityFilter), [incidents, severityFilter])
  const saveIncident = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) { setError(en ? 'Add an incident title before saving.' : 'Isi judul insiden sebelum menyimpan.'); return }
    const saved: Incident = { ...draft, id: activeId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())), title: draft.title.trim().slice(0, 160), service: draft.service.trim().slice(0, 160), updatedAt: new Date().toISOString() }
    const next = [saved, ...incidents.filter(item => item.id !== saved.id)].slice(0, 20)
    try { window.localStorage.setItem(INCIDENT_KEY, JSON.stringify(next)); setIncidents(next); setDraft(saved); setActiveId(saved.id); setError(''); setNotice(en ? 'Incident saved in this browser.' : 'Insiden tersimpan di browser ini.') } catch { setError(en ? 'Unable to save incident. Check browser storage.' : 'Tidak dapat menyimpan insiden. Periksa penyimpanan browser.') }
  }
  const addEvent = () => {
    if (!eventNote.trim()) { setError(en ? 'Add a short timeline note first.' : 'Isi catatan timeline terlebih dahulu.'); return }
    const item = { id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()), time: eventTime, kind: eventKind, note: eventNote.trim().slice(0, 1000) }
    updateDraft({ timeline: [...draft.timeline, item] })
    setEventNote(''); setError('')
  }
  const openIncident = (item: Incident) => { setDraft(item); setActiveId(item.id); setNotice(''); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const newIncident = () => { setDraft(emptyIncident()); setActiveId(''); setNotice(''); setError('') }
  const deleteIncident = (id: string) => {
    const next = incidents.filter(item => item.id !== id)
    try { window.localStorage.setItem(INCIDENT_KEY, JSON.stringify(next)); setIncidents(next); if (activeId === id) newIncident(); setNotice(en ? 'Incident removed from this browser.' : 'Insiden dihapus dari browser ini.') } catch { setError(en ? 'Unable to update local incident history.' : 'Tidak dapat memperbarui riwayat insiden lokal.') }
  }
  const exportIncident = () => download('dreamex-incident-review.md', incidentMarkdown(draft, metrics), 'text/markdown;charset=utf-8')
  const exportSnapshot = () => download('dreamex-reliability-snapshot.json', JSON.stringify({ format: 'dreamex-reliability-snapshot', version: 1, exportedAt: new Date().toISOString(), metrics, incidents }, null, 2), 'application/json;charset=utf-8')

  return <main id="main-content" className="container reliability-center-page">
    <header className="reliability-center-hero"><div><span className="section-kicker"><Gauge size={14} /> RELIABILITY ENGINEERING / INCIDENT OPERATIONS</span><h1>{en ? <>Operate with <span>clarity.</span></> : <>Operasikan sistem dengan <span>jelas.</span></>}</h1><p>{en ? 'A practical workspace for incident timelines, post-incident learning, and manually reported delivery metrics. Capture what happened, what changed, and what to improve next.' : 'Workspace praktis untuk timeline insiden, pembelajaran pascainsiden, dan metrik delivery yang diisi manual. Catat kejadian, perubahan, dan perbaikan berikutnya.'}</p><div className="reliability-center-actions"><button className="button button-primary" type="button" onClick={newIncident}><Plus size={15} />{en ? 'New incident' : 'Insiden baru'}</button><button className="button button-secondary" type="button" onClick={exportSnapshot}><Download size={15} />{en ? 'Export snapshot' : 'Ekspor snapshot'}</button></div></div><aside className="reliability-center-summary"><span className="section-kicker">{en ? 'LOCAL INCIDENT LOG' : 'LOG INSIDEN LOKAL'}</span><div className="dx-kpi-card" style={{ padding: '12px 14px', margin: '8px 0 6px' }}><div className="dx-kpi-copy"><strong>{incidents.length.toString().padStart(2, '0')}</strong><span className="dx-kpi-sub">{en ? `${resolvedCount} resolved` : `${resolvedCount} selesai`}</span></div><SvgRingGauge value={incidents.length ? Math.round((resolvedCount / incidents.length) * 100) : 100} label={en ? 'Incident resolution rate' : 'Rasio resolusi insiden'} tone={incidents.length && resolvedCount < incidents.length ? 'amber' : 'emerald'} size={58} /></div><p>{en ? 'saved incident records' : 'catatan insiden tersimpan'}</p><small>{en ? 'Stored in this browser only. No incident data is uploaded.' : 'Hanya tersimpan di browser ini. Data insiden tidak diunggah.'}</small></aside></header>

    <section className="reliability-metrics-section"><div className="reliability-section-heading"><div><span className="section-kicker">{en ? 'DELIVERY PERFORMANCE' : 'PERFORMA DELIVERY'}</span><h2>{en ? 'DORA-style operating metrics' : 'Metrik operasional bergaya DORA'}</h2><p>{en ? 'Enter measurements from your own reporting window. These values are not connected to your repository, deployment pipeline, or monitoring provider.' : 'Masukkan pengukuran dari periode pelaporan Anda. Nilai ini tidak terhubung ke repositori, pipeline deployment, atau penyedia monitoring.'}</p></div><label className="reliability-window"><span>{en ? 'Observation window' : 'Periode observasi'}</span><input aria-label={en ? 'Observation window' : 'Periode observasi'} value={metrics.observationWindow} onChange={event => updateMetric('observationWindow', event.target.value)} maxLength={80} /></label></div><div className="reliability-metric-grid">{metricCards.map(card => { const Icon = card.icon; return <article key={card.key} className="reliability-metric-card"><span><Icon size={16} />{card.label}</span><div><input type="number" min="0" max={card.key === 'changeFailureRate' ? 100 : 1000000} step="any" aria-label={card.label} value={metrics[card.key]} onChange={event => updateMetric(card.key, event.target.value)} /><small>{card.unit}</small></div><p><span className="dx-pipeline-step">{doraTier(card.key, metrics[card.key])}</span></p></article> })}</div></section>

    <section className="reliability-incident-editor"><div className="reliability-section-heading"><div><span className="section-kicker">{en ? 'INCIDENT COMMAND' : 'KENDALI INSIDEN'}</span><h2>{activeId ? (en ? 'Update incident record' : 'Perbarui catatan insiden') : (en ? 'Capture an incident' : 'Catat insiden')}</h2><p>{en ? 'Build an evidence-based record that can become a post-incident review.' : 'Bangun catatan berbasis bukti yang dapat menjadi laporan pascainsiden.'}</p></div>{activeId && <button type="button" className="button button-secondary" onClick={newIncident}><Plus size={14} />{en ? 'Start new' : 'Buat baru'}</button>}</div>
      <form onSubmit={saveIncident} className="reliability-incident-form">
        <div className="reliability-form-grid"><label><span>{en ? 'Incident title *' : 'Judul insiden *'}</span><input required maxLength={160} value={draft.title} onChange={event => updateDraft({ title: event.target.value })} placeholder={en ? 'e.g. Checkout error rate increased' : 'mis. Error checkout meningkat'} /></label><label><span>{en ? 'Affected service' : 'Layanan terdampak'}</span><input maxLength={160} value={draft.service} onChange={event => updateDraft({ service: event.target.value })} placeholder={en ? 'Service or component name' : 'Nama layanan atau komponen'} /></label><label><span>{en ? 'Severity' : 'Tingkat keparahan'}</span><select value={draft.severity} onChange={event => updateDraft({ severity: event.target.value })}><option>SEV-1</option><option>SEV-2</option><option>SEV-3</option><option>SEV-4</option></select></label><label><span>{en ? 'Status' : 'Status'}</span><select value={draft.status} onChange={event => updateDraft({ status: event.target.value })}><option>Investigating</option><option>Identified</option><option>Monitoring</option><option>Resolved</option><option>Closed</option></select></label><label><span>{en ? 'Incident commander' : 'Penanggung jawab insiden'}</span><input maxLength={120} value={draft.commander} onChange={event => updateDraft({ commander: event.target.value })} placeholder={en ? 'Owner / incident lead' : 'Owner / incident lead'} /></label><label><span>{en ? 'Start time' : 'Waktu mulai'}</span><input type="datetime-local" value={draft.startedAt} onChange={event => updateDraft({ startedAt: event.target.value })} /></label></div>
        <label className="reliability-wide-field"><span>{en ? 'Customer / system impact' : 'Dampak pelanggan / sistem'}</span><textarea rows={2} maxLength={2000} value={draft.impact} onChange={event => updateDraft({ impact: event.target.value })} placeholder={en ? 'Scope, affected users, duration, and observed symptoms…' : 'Cakupan, pengguna terdampak, durasi, dan gejala…'} /></label>
        <div className="reliability-timeline"><div className="reliability-section-heading"><div><h3>{en ? 'Incident timeline' : 'Timeline insiden'}</h3><p>{en ? 'Add time-stamped evidence as the response progresses.' : 'Tambahkan bukti bertimestamp seiring proses penanganan.'}</p></div><span>{draft.timeline.length} {en ? 'events' : 'kejadian'}</span></div><div className="reliability-timeline-add"><label><span>{en ? 'Time' : 'Waktu'}</span><input type="datetime-local" aria-label={en ? 'Timeline event time' : 'Waktu kejadian timeline'} value={eventTime} onChange={event => setEventTime(event.target.value)} /></label><label><span>{en ? 'Event type' : 'Jenis kejadian'}</span><select value={eventKind} onChange={event => setEventKind(event.target.value)}>{eventKinds.map(kind => <option key={kind}>{kind}</option>)}</select></label><label className="reliability-timeline-note"><span>{en ? 'Event note' : 'Catatan kejadian'}</span><input maxLength={1000} value={eventNote} onChange={event => setEventNote(event.target.value)} placeholder={en ? 'What happened? What evidence confirms it?' : 'Apa yang terjadi? Bukti apa yang mendukung?'} /></label><button className="button button-secondary" type="button" onClick={addEvent}><Plus size={14} />{en ? 'Add event' : 'Tambah kejadian'}</button></div>{draft.timeline.length ? <ol className="reliability-timeline-list">{draft.timeline.map(item => <li key={item.id}><span className="reliability-timeline-marker" /><div><div><strong>{item.kind}</strong><time>{item.time.replace('T', ' ')}</time></div><p>{item.note}</p><button type="button" onClick={() => updateDraft({ timeline: draft.timeline.filter(event => event.id !== item.id) })} aria-label={(en ? 'Remove timeline event: ' : 'Hapus kejadian timeline: ') + item.note}><Trash2 size={13} /></button></div></li>)}</ol> : <p className="reliability-empty-timeline">{en ? 'No timeline events yet. Record detection, triage, mitigation, recovery, and follow-up as they occur.' : 'Belum ada kejadian. Catat deteksi, triage, mitigasi, pemulihan, dan tindak lanjut.'}</p>}</div>
        <div className="reliability-form-grid reliability-textareas"><label><span>{en ? 'Cause / contributing factors' : 'Penyebab / faktor kontribusi'}</span><textarea rows={3} maxLength={3000} value={draft.cause} onChange={event => updateDraft({ cause: event.target.value })} /></label><label><span>{en ? 'Mitigation performed' : 'Mitigasi yang dilakukan'}</span><textarea rows={3} maxLength={3000} value={draft.mitigation} onChange={event => updateDraft({ mitigation: event.target.value })} /></label><label><span>{en ? 'Resolution / recovery evidence' : 'Resolusi / bukti pemulihan'}</span><textarea rows={3} maxLength={3000} value={draft.resolution} onChange={event => updateDraft({ resolution: event.target.value })} /></label><label><span>{en ? 'Lessons learned' : 'Pelajaran yang didapat'}</span><textarea rows={3} maxLength={3000} value={draft.lessons} onChange={event => updateDraft({ lessons: event.target.value })} /></label></div>
        <label className="reliability-wide-field"><span>{en ? 'Follow-up actions / owners' : 'Tindak lanjut / penanggung jawab'}</span><textarea rows={2} maxLength={3000} value={draft.nextActions} onChange={event => updateDraft({ nextActions: event.target.value })} placeholder={en ? 'Action — owner — due date — success criteria' : 'Tindakan — owner — tenggat — kriteria keberhasilan'} /></label>
        {error && <p className="reliability-error" role="alert">{error}</p>}{notice && <p className="reliability-notice" role="status">{notice}</p>}
        <div className="reliability-form-actions"><button type="submit" className="button button-primary"><CheckCircle2 size={15} />{en ? 'Save incident' : 'Simpan insiden'}</button><button type="button" className="button button-secondary" onClick={exportIncident}><FileText size={15} />{en ? 'Export postmortem' : 'Ekspor postmortem'}</button></div>
      </form>
    </section>

    <section className="reliability-history">
      <div className="reliability-section-heading">
        <div>
          <span className="section-kicker">{en ? 'INCIDENT HISTORY' : 'RIWAYAT INSIDEN'}</span>
          <h2>{en ? 'Saved incident records' : 'Catatan insiden tersimpan'}</h2>
          <p>{en ? 'Up to 20 local records. Save changes to update a record; export creates a file on your device.' : 'Maksimal 20 catatan lokal. Simpan perubahan untuk memperbarui catatan; ekspor membuat file di perangkat Anda.'}</p>
        </div>
        <span className="reliability-history-count"><Archive size={15} />{incidents.length}/20</span>
      </div>
      {incidents.length > 0 && (
        <div className="dx-filter-pills" role="group" aria-label={en ? 'Filter incident history by severity' : 'Filter riwayat insiden berdasarkan keparahan'}>
          {(['all', 'SEV-1', 'SEV-2', 'SEV-3', 'SEV-4'] as const).map(sev => (
            <button key={sev} type="button" className={severityFilter === sev ? 'dx-filter-pill active' : 'dx-filter-pill'} aria-pressed={severityFilter === sev} onClick={() => setSeverityFilter(sev)}>
              {sev === 'all' ? (en ? 'All severities' : 'Semua level') : sev}
            </button>
          ))}
        </div>
      )}
      {filteredIncidents.length ? <div className="reliability-history-list">{filteredIncidents.map(item => <article key={item.id}><button type="button" className="reliability-history-open" onClick={() => openIncident(item)}><span className={'reliability-severity severity-' + item.severity.toLowerCase()}>{item.severity}</span><strong>{item.title}</strong><small>{item.service || (en ? 'Service not specified' : 'Layanan belum ditentukan')} · {item.status} · {new Date(item.updatedAt).toLocaleString(en ? 'en-US' : 'id-ID')}</small></button><button type="button" className="reliability-delete" aria-label={(en ? 'Delete incident ' : 'Hapus insiden ') + item.title} onClick={() => deleteIncident(item.id)}><Trash2 size={15} /></button></article>)}</div> : <div className="reliability-history-empty"><Siren size={22} /><p>{incidents.length ? (en ? 'No saved incidents match that severity filter.' : 'Tidak ada insiden yang sesuai filter keparahan ini.') : (en ? 'No incident records saved yet. Create one above when you need a structured response log.' : 'Belum ada catatan insiden. Buat catatan di atas saat membutuhkan log respons terstruktur.')}</p></div>}
    </section>

    <AiCopilotPanel
      kicker={en ? 'RELIABILITY CO-PILOT' : 'KO-PILOT RELIABILITAS'}
      title={en ? 'Executive Postmortem & Delivery Brief' : 'Ringkasan Eksekutif Postmortem & Delivery'}
      summaryLines={[
        en ? `Active incident draft: ${draft.title || 'Untitled'} (${draft.severity} · ${draft.status}, ${draft.timeline.length} timeline events).` : `Draf insiden aktif: ${draft.title || 'Tanpa judul'} (${draft.severity} · ${draft.status}, ${draft.timeline.length} kejadian timeline).`,
        en ? `Browser history: ${incidents.length} incident record(s) saved (${resolvedCount} resolved/closed).` : `Riwayat browser: ${incidents.length} catatan insiden tersimpan (${resolvedCount} selesai).`,
        en ? `Manual delivery input (${metrics.observationWindow}): ${metrics.deploymentsPerWeek}/wk deploys, ${metrics.leadTimeHours}h lead time, ${metrics.changeFailureRate}% CFR, ${metrics.restoreHours}h MTTR.` : `Input delivery manual (${metrics.observationWindow}): ${metrics.deploymentsPerWeek}/mg deploy, ${metrics.leadTimeHours}j lead time, ${metrics.changeFailureRate}% CFR, ${metrics.restoreHours}j MTTR.`,
      ]}
      recommendations={[
        ...(!draft.cause.trim() || !draft.nextActions.trim() ? [en ? 'Populate root contributing factors and concrete owners/due dates before closing postmortem.' : 'Lengkapi faktor kontribusi utama serta PIC & tenggat sebelum menutup postmortem.'] : [en ? 'Cause and follow-up actions documented — ready for Markdown postmortem export.' : 'Penyebab dan tindak lanjut terdokumentasi — siap diekspor ke Markdown.']),
        ...(metrics.changeFailureRate > 15 ? [en ? 'Self-entered CFR exceeds 15%: tighten pre-merge verification or canary rollouts.' : 'CFR di atas 15%: perketat verifikasi pra-merge atau rilis bertahap.'] : [en ? 'Use manual DORA bands as internal trend cues, not automated telemetry.' : 'Gunakan indikator DORA manual sebagai refleksi tren tim, bukan telemetri otomatis.']),
        en ? 'Export incident review Markdown to attach timeline proof alongside release notes.' : 'Ekspor tinjauan insiden Markdown untuk dokumentasi rilis.',
      ]}
      systemPrompt="You are a site reliability incident commander. Synthesize a crisp executive postmortem summary from manually entered incident & DORA fields without claiming external telemetry."
      userPrompt={`Incident="${draft.title || 'Draft'}", Severity=${draft.severity}, Status=${draft.status}, Service=${draft.service || 'unspecified'}, Events=${draft.timeline.length}, Impact="${draft.impact.slice(0, 120)}". Manual DORA: deploys/wk=${metrics.deploymentsPerWeek}, leadTime=${metrics.leadTimeHours}h, CFR=${metrics.changeFailureRate}%, MTTR=${metrics.restoreHours}h. Summarize key next actions.`}
      en={en}
    />

    <p className="reliability-disclaimer"><ShieldCheck size={15} />{en ? 'Privacy-first, local-only workspace. No incident details or metric values are sent to a server. Metrics are manually entered and are not an official DORA assessment.' : 'Workspace lokal dengan prioritas privasi. Detail insiden dan metrik tidak dikirim ke server. Metrik diisi manual dan bukan penilaian DORA resmi.'}</p>
  </main>
}
