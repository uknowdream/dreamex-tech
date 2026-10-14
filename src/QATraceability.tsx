import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowDownToLine, ClipboardCheck, FileUp, Link2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useLanguage } from './i18n'
import './QATraceability.css'

type ExecutionStatus = 'not-run' | 'passed' | 'failed' | 'blocked'
type TraceRow = {
  id: string
  requirement: string
  testCase: string
  status: ExecutionStatus
  defect: string
  evidence: string
  releaseCriterion: boolean
  updatedAt: string
}
type TraceSnapshot = { schemaVersion: '1.0' | '1.1'; exportedAt: string; note: string; items: TraceRow[]; manifest?: { tool: string; toolVersion: string; recordCount: number; statusCounts: Record<ExecutionStatus, number>; releaseCriteriaCount: number; contentSha256?: string } }
const STORAGE_KEY = 'dreamex-qa-traceability-v1'
const statuses: ExecutionStatus[] = ['not-run', 'passed', 'failed', 'blocked']

function isTraceRow(value: unknown): value is TraceRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<TraceRow>
  return typeof row.id === 'string' && row.id.length <= 100 &&
    typeof row.requirement === 'string' && row.requirement.length <= 240 &&
    typeof row.testCase === 'string' && row.testCase.length <= 240 &&
    typeof row.status === 'string' && statuses.includes(row.status as ExecutionStatus) &&
    typeof row.defect === 'string' && row.defect.length <= 240 &&
    typeof row.evidence === 'string' && row.evidence.length <= 1000 &&
    typeof row.releaseCriterion === 'boolean' && typeof row.updatedAt === 'string'
}
function readRows(): TraceRow[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isTraceRow).slice(0, 500) : []
  } catch { return [] }
}
function saveDownload(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function makeId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'trace-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function statusLabel(status: ExecutionStatus, en: boolean) {
  return status === 'passed' ? (en ? 'Passed' : 'Lulus') : status === 'failed' ? (en ? 'Failed' : 'Gagal') : status === 'blocked' ? (en ? 'Blocked' : 'Terhambat') : (en ? 'Not run' : 'Belum diuji')
}

export function QATraceability() {
  const { language } = useLanguage()
  const en = language === 'en'
  const fileInput = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<TraceRow[]>(readRows)
  const [requirement, setRequirement] = useState('')
  const [testCase, setTestCase] = useState('')
  const [status, setStatus] = useState<ExecutionStatus>('not-run')
  const [defect, setDefect] = useState('')
  const [evidence, setEvidence] = useState('')
  const [releaseCriterion, setReleaseCriterion] = useState(true)
  const [filter, setFilter] = useState<'all' | ExecutionStatus>('all')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)) }
    catch { setNotice(en ? 'Browser storage is unavailable; export a backup before leaving.' : 'Penyimpanan browser tidak tersedia; ekspor cadangan sebelum keluar.') }
  }, [rows, en])
  const stats = useMemo(() => ({
    total: rows.length,
    passed: rows.filter(row => row.status === 'passed').length,
    failed: rows.filter(row => row.status === 'failed').length,
    unverified: rows.filter(row => row.status === 'not-run' || row.status === 'blocked').length,
    releaseGaps: rows.filter(row => row.releaseCriterion && row.status !== 'passed').length,
  }), [rows])
  const visibleRows = useMemo(() => filter === 'all' ? rows : rows.filter(row => row.status === filter), [rows, filter])
  const addRow = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requirement.trim() || !testCase.trim()) return
    if (rows.length >= 500) {
      setNotice(en ? 'The matrix is limited to 500 rows. Export a snapshot before removing old rows.' : 'Matriks dibatasi 500 baris. Ekspor snapshot sebelum menghapus baris lama.')
      return
    }
    const row: TraceRow = {
      id: makeId(), requirement: requirement.trim().slice(0, 240), testCase: testCase.trim().slice(0, 240),
      status, defect: defect.trim().slice(0, 240), evidence: evidence.trim().slice(0, 1000),
      releaseCriterion, updatedAt: new Date().toISOString(),
    }
    setRows(current => [row, ...current])
    setRequirement(''); setTestCase(''); setDefect(''); setEvidence(''); setStatus('not-run'); setReleaseCriterion(true)
    setNotice(en ? 'Traceability row added. Execution status is user-reported, not independently verified.' : 'Baris traceability ditambahkan. Status eksekusi berasal dari input pengguna, bukan verifikasi otomatis.')
  }
  const updateRow = (id: string, patch: Partial<TraceRow>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row))
  const exportSnapshot = async () => {
    const exportedAt = new Date().toISOString()
    const statusCounts: Record<ExecutionStatus, number> = { 'not-run': 0, passed: 0, failed: 0, blocked: 0 }
    rows.forEach(row => { statusCounts[row.status] += 1 })
    let contentSha256: string | undefined
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows)))
      contentSha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    } catch {
      // The export remains usable if SubtleCrypto is unavailable in a restricted context.
    }
    const snapshot: TraceSnapshot = {
      schemaVersion: '1.1', exportedAt,
      manifest: { tool: 'DreamEx QA Traceability', toolVersion: '1.1', recordCount: rows.length, statusCounts, releaseCriteriaCount: rows.filter(row => row.releaseCriterion).length, ...(contentSha256 ? { contentSha256 } : {}) },
      note: 'User-maintained traceability records. Execution results and evidence references have not been independently verified by DreamEx Tech. The SHA-256 digest covers the ordered items array only; it proves file consistency, not authenticity or execution validity.',
      items: rows,
    }
    saveDownload('dreamex-qa-traceability.json', JSON.stringify(snapshot, null, 2))
    setNotice(en ? (contentSha256 ? 'Snapshot exported with manifest and SHA-256 integrity digest.' : 'Snapshot exported with manifest; SHA-256 is unavailable in this browser context.') : (contentSha256 ? 'Snapshot diekspor dengan manifest dan digest integritas SHA-256.' : 'Snapshot diekspor dengan manifest; SHA-256 tidak tersedia di konteks browser ini.'))
  }
  const importSnapshot = async (file?: File) => {
    if (!file) return
    if (file.size > 1_000_000) {
      setNotice(en ? 'Import rejected: file exceeds the 1 MB limit.' : 'Impor ditolak: ukuran file melebihi 1 MB.')
      if (fileInput.current) fileInput.current.value = ''
      return
    }
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { items?: unknown }).items)) throw new Error('invalid')
      const items = (parsed as { items: unknown[] }).items
      if (items.length > 500 || !items.every(isTraceRow)) throw new Error('invalid')
      setRows(items)
      setNotice(en ? 'Snapshot imported. Review every row and evidence reference before relying on it.' : 'Snapshot diimpor. Tinjau setiap baris dan referensi bukti sebelum mengandalkannya.')
    } catch {
      setNotice(en ? 'Import rejected: invalid schema or unsupported snapshot. Existing rows were preserved.' : 'Impor ditolak: skema tidak valid atau snapshot tidak didukung. Baris yang ada tetap dipertahankan.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  const loadExample = () => {
    const now = new Date().toISOString()
    setRows([
      { id: makeId(), requirement: 'REQ-001 · Invalid credentials must not create a session', testCase: 'TC-001 · Submit an incorrect password', status: 'not-run', defect: '', evidence: 'Add a test run URL or evidence note after execution.', releaseCriterion: true, updatedAt: now },
      { id: makeId(), requirement: 'REQ-002 · API rejects malformed request payloads', testCase: 'TC-002 · Send a payload with a missing required field', status: 'not-run', defect: '', evidence: '', releaseCriterion: true, updatedAt: now },
      { id: makeId(), requirement: 'REQ-003 · Keyboard users can complete the primary flow', testCase: 'TC-003 · Complete the flow without a pointer', status: 'not-run', defect: '', evidence: '', releaseCriterion: false, updatedAt: now },
    ])
    setNotice(en ? 'Illustrative rows loaded. They are examples, not executed test evidence.' : 'Baris ilustratif dimuat. Ini contoh, bukan bukti tes yang telah dijalankan.')
  }
  return <section className="qa-traceability" aria-labelledby="qa-traceability-title">
    <header className="qa-traceability-heading">
      <div><span className="section-kicker"><Link2 size={14}/> QA GOVERNANCE / TRACEABILITY</span><h2 id="qa-traceability-title">{en ? 'QA traceability matrix' : 'Matriks traceability QA'}</h2><p>{en ? 'Link requirements, test cases, reported execution, defects, evidence references, and release criteria in a portable snapshot.' : 'Hubungkan kebutuhan, test case, status eksekusi yang dilaporkan, defect, referensi bukti, dan kriteria rilis dalam snapshot portabel.'}</p></div>
      <span className="qa-traceability-local"><ShieldCheck size={14}/>{en ? 'Local-only' : 'Lokal saja'}</span>
    </header>
    <div className="qa-traceability-stats">
      <div><span>{en ? 'Mapped rows' : 'Baris terpetakan'}</span><strong>{stats.total}</strong></div>
      <div><span>{en ? 'Reported passed' : 'Dilaporkan lulus'}</span><strong>{stats.passed}</strong></div>
      <div><span>{en ? 'Reported failed' : 'Dilaporkan gagal'}</span><strong>{stats.failed}</strong></div>
      <div className={stats.releaseGaps ? 'has-gaps' : ''}><span>{en ? 'Release gaps' : 'Celah rilis'}</span><strong>{stats.releaseGaps}</strong></div>
    </div>
    <form className="qa-traceability-form" onSubmit={addRow}>
      <div className="qa-traceability-form-heading"><span className="section-kicker">01 / TRACE ITEM</span><h3>{en ? 'Add requirement-to-test mapping' : 'Tambah pemetaan kebutuhan ke test'}</h3></div>
      <div className="qa-traceability-fields">
        <label>{en ? 'Requirement / acceptance criterion' : 'Kebutuhan / kriteria penerimaan'}<input aria-label={en ? 'Requirement / acceptance criterion' : 'Kebutuhan / kriteria penerimaan'} value={requirement} onChange={event => setRequirement(event.target.value)} maxLength={240} required placeholder={en ? 'REQ-001 · User can reset a password' : 'REQ-001 · Pengguna dapat reset password'}/></label>
        <label>{en ? 'Test case / scenario ID' : 'Test case / ID skenario'}<input aria-label={en ? 'Test case / scenario ID' : 'Test case / ID skenario'} value={testCase} onChange={event => setTestCase(event.target.value)} maxLength={240} required placeholder="TC-001 · Validate password reset"/></label>
        <label>{en ? 'Execution status' : 'Status eksekusi'}<select aria-label={en ? 'Execution status' : 'Status eksekusi'} value={status} onChange={event => setStatus(event.target.value as ExecutionStatus)}><option value="not-run">{en ? 'Not run' : 'Belum diuji'}</option><option value="passed">{en ? 'Passed' : 'Lulus'}</option><option value="failed">{en ? 'Failed' : 'Gagal'}</option><option value="blocked">{en ? 'Blocked' : 'Terhambat'}</option></select></label>
        <label>{en ? 'Defect ID / reference (optional)' : 'ID / referensi defect (opsional)'}<input aria-label={en ? 'Defect ID / reference (optional)' : 'ID / referensi defect (opsional)'} value={defect} onChange={event => setDefect(event.target.value)} maxLength={240} placeholder="BUG-123 / issue URL"/></label>
        <label className="qa-traceability-evidence">{en ? 'Evidence reference or notes (optional)' : 'Referensi atau catatan bukti (opsional)'}<textarea aria-label={en ? 'Evidence reference or notes (optional)' : 'Referensi atau catatan bukti (opsional)'} value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={1000} rows={2} placeholder={en ? 'CI run URL, screenshot path, report ID…' : 'URL CI, lokasi screenshot, ID laporan…'}/></label>
      </div>
      <label className="qa-traceability-release"><input type="checkbox" checked={releaseCriterion} onChange={event => setReleaseCriterion(event.target.checked)}/><span>{en ? 'Required for release readiness' : 'Wajib untuk kesiapan rilis'}</span></label>
      <div className="qa-traceability-actions"><button type="submit" className="button button-primary"><Plus size={15}/>{en ? 'Add mapping' : 'Tambah pemetaan'}</button><button type="button" className="button button-secondary" onClick={loadExample}>{en ? 'Load example rows' : 'Muat contoh'}</button><button type="button" className="button button-secondary" onClick={exportSnapshot}><ArrowDownToLine size={15}/>{en ? 'Export snapshot' : 'Ekspor snapshot'}</button><button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()}><FileUp size={15}/>{en ? 'Import snapshot' : 'Impor snapshot'}</button><input ref={fileInput} className="qa-traceability-file" type="file" accept="application/json,.json" aria-label={en ? 'Import traceability snapshot file' : 'Impor file snapshot traceability'} onChange={event => void importSnapshot(event.target.files?.[0])}/></div>
    </form>
    <div className="qa-traceability-list-head"><div><span className="section-kicker">02 / TRACE REGISTER</span><h3>{en ? 'Trace register' : 'Register traceability'}</h3><p>{en ? 'Status is manually reported. This tool does not execute tests or validate external evidence.' : 'Status dilaporkan secara manual. Tool ini tidak menjalankan tes atau memvalidasi bukti eksternal.'}</p></div><label>{en ? 'Filter' : 'Filter'}<select aria-label={en ? 'Filter traceability rows' : 'Filter baris traceability'} value={filter} onChange={event => setFilter(event.target.value as 'all' | ExecutionStatus)}><option value="all">{en ? 'All statuses' : 'Semua status'}</option>{statuses.map(value => <option key={value} value={value}>{statusLabel(value, en)}</option>)}</select></label></div>
    {stats.releaseGaps > 0 && <p className="qa-traceability-warning" role="status"><ClipboardCheck size={15}/>{stats.releaseGaps} {en ? 'release-required mapping(s) are not marked passed. Verify evidence before release.' : 'pemetaan wajib rilis belum ditandai lulus. Verifikasi bukti sebelum rilis.'}</p>}
    <div className="qa-traceability-rows">
      {visibleRows.map(row => <article className="qa-traceability-row" key={row.id}>
        <div className="qa-traceability-row-top"><span className={'qa-traceability-status status-' + row.status}>{statusLabel(row.status, en)}</span><time dateTime={row.updatedAt}>{new Date(row.updatedAt).toLocaleDateString(en ? 'en-US' : 'id-ID')}</time><button type="button" className="qa-traceability-delete" aria-label={(en ? 'Delete mapping ' : 'Hapus pemetaan ') + row.requirement} onClick={() => setRows(current => current.filter(item => item.id !== row.id))}><Trash2 size={14}/></button></div>
        <h4>{row.requirement}</h4><p className="qa-traceability-test"><strong>{en ? 'Test:' : 'Test:'}</strong> {row.testCase}</p>
        <div className="qa-traceability-row-fields"><label>{en ? 'Execution status' : 'Status eksekusi'}<select aria-label={(en ? 'Execution status for ' : 'Status eksekusi untuk ') + row.requirement} value={row.status} onChange={event => updateRow(row.id, { status: event.target.value as ExecutionStatus })}>{statuses.map(value => <option key={value} value={value}>{statusLabel(value, en)}</option>)}</select></label><label>{en ? 'Defect reference' : 'Referensi defect'}<input aria-label={(en ? 'Defect reference for ' : 'Referensi defect untuk ') + row.requirement} value={row.defect} onChange={event => updateRow(row.id, { defect: event.target.value.slice(0, 240) })} maxLength={240}/></label><label className="qa-traceability-row-evidence">{en ? 'Evidence reference / notes' : 'Referensi / catatan bukti'}<textarea aria-label={(en ? 'Evidence for ' : 'Bukti untuk ') + row.requirement} value={row.evidence} onChange={event => updateRow(row.id, { evidence: event.target.value.slice(0, 1000) })} maxLength={1000} rows={2}/></label></div>
        <label className="qa-traceability-release"><input type="checkbox" checked={row.releaseCriterion} onChange={event => updateRow(row.id, { releaseCriterion: event.target.checked })}/><span>{en ? 'Required for release readiness' : 'Wajib untuk kesiapan rilis'}</span></label>
      </article>)}
      {!visibleRows.length && <div className="qa-traceability-empty"><ClipboardCheck size={24}/><strong>{en ? 'No traceability rows yet' : 'Belum ada baris traceability'}</strong><span>{en ? 'Add a mapping or load the example rows to get started.' : 'Tambahkan pemetaan atau muat contoh untuk memulai.'}</span></div>}
    </div>
    <footer className="qa-traceability-foot"><ShieldCheck size={15}/><span>{en ? 'Data remains in this browser profile. Imported files are schema-checked and size-limited. Back up snapshots regularly; no cloud sync or external evidence verification is provided.' : 'Data tetap berada di profil browser ini. File impor diperiksa skemanya dan dibatasi ukurannya. Cadangkan snapshot secara berkala; tidak ada sinkronisasi cloud atau verifikasi bukti eksternal.'}</span></footer>
    {notice && <p className="command-center-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={en ? 'Dismiss notice' : 'Tutup pemberitahuan'}>×</button></p>}
  </section>
}
