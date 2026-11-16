import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, BookOpen, Braces, Check, Copy, ShieldCheck } from 'lucide-react'
import { useLanguage } from './i18n'

export function EngineeringLabView() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [activeTool, setActiveTool] = useState<'test-cases' | 'bug-report' | 'json' | 'api-matrix' | 'openapi' | 'release-scorecard' | 'postmortem'>('test-cases')
  const [releaseChecked, setReleaseChecked] = useState<Record<string, boolean>>({})
  const [feature, setFeature] = useState(en ? 'Login form' : 'Form login')
  const [generated, setGenerated] = useState(false)
  const [bugTitle, setBugTitle] = useState('')
  const [environment, setEnvironment] = useState('Chrome / Windows 11')
  const [steps, setSteps] = useState('')
  const [actual, setActual] = useState('')
  const [expected, setExpected] = useState('')
  const [severity, setSeverity] = useState('High')
  const [bugReport, setBugReport] = useState('')
  const [jsonInput, setJsonInput] = useState('{"status":"ok","data":[1,2,3]}')
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [apiMethod, setApiMethod] = useState('POST')
  const [apiPath, setApiPath] = useState('/api/v1/users')
  const [apiAuth, setApiAuth] = useState('required')
  const [apiPayload, setApiPayload] = useState('json')
  const [apiMatrixGenerated, setApiMatrixGenerated] = useState(false)
  const [openApiSpec, setOpenApiSpec] = useState(`{
  "openapi": "3.0.3",
  "info": { "title": "Sample Users API", "version": "1.0.0" },
  "paths": {
    "/api/v1/users": {
      "get": { "summary": "List users", "operationId": "listUsers", "responses": { "200": { "description": "Users returned" }, "401": { "description": "Unauthorized" } } },
      "post": { "summary": "Create a user", "operationId": "createUser", "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object" } } } }, "responses": { "201": { "description": "Created" }, "400": { "description": "Invalid input" } } }
    },
    "/api/v1/users/{userId}": {
      "get": { "summary": "Get user by ID", "parameters": [{ "name": "userId", "in": "path", "required": true, "schema": { "type": "string" } }], "responses": { "200": { "description": "User returned" }, "404": { "description": "Not found" } } }
    }
  }
}`)
  const [openApiError, setOpenApiError] = useState('')
  const [openApiResults, setOpenApiResults] = useState<Array<{ method: string; path: string; summary: string; operationId: string; responses: string; parameters: string; requestBody: boolean; security: boolean }>>([])
  const [openApiAnalyzed, setOpenApiAnalyzed] = useState(false)
  const [openApiIssues, setOpenApiIssues] = useState<Array<{ method: string; path: string; severity: 'error' | 'warning' | 'info'; code: string; message: string }>>([])
  const [copyStatus, setCopyStatus] = useState('')
  const [incidentTitle, setIncidentTitle] = useState('')
  const [incidentSeverity, setIncidentSeverity] = useState('SEV-2')
  const [incidentStatus, setIncidentStatus] = useState('Resolved')
  const [incidentStart, setIncidentStart] = useState('')
  const [incidentEnd, setIncidentEnd] = useState('')
  const [incidentImpact, setIncidentImpact] = useState('')
  const [incidentDetection, setIncidentDetection] = useState('')
  const [incidentTimeline, setIncidentTimeline] = useState('')
  const [incidentRootCause, setIncidentRootCause] = useState('')
  const [incidentContributors, setIncidentContributors] = useState('')
  const [incidentResolution, setIncidentResolution] = useState('')
  const [incidentFollowUps, setIncidentFollowUps] = useState('')
  const [postmortemReport, setPostmortemReport] = useState('')

  const releaseChecks = [
    { id: 'requirements', category: en ? 'Product & scope' : 'Produk & ruang lingkup', title: en ? 'Acceptance criteria are reviewed and traceable' : 'Acceptance criteria telah ditinjau dan dapat ditelusuri', critical: true },
    { id: 'coverage', category: en ? 'Product & scope' : 'Produk & ruang lingkup', title: en ? 'Critical user journeys and regression coverage are tested' : 'Alur pengguna kritis dan cakupan regresi telah diuji', critical: true },
    { id: 'accessibility', category: en ? 'Product & scope' : 'Produk & ruang lingkup', title: en ? 'Keyboard navigation and accessible names are verified' : 'Navigasi keyboard dan nama aksesibel telah diverifikasi', critical: false },
    { id: 'contract', category: en ? 'API & data contracts' : 'Kontrak API & data', title: en ? 'API contract and response schemas are validated' : 'Kontrak API dan schema respons telah divalidasi', critical: true },
    { id: 'errors', category: en ? 'API & data contracts' : 'Kontrak API & data', title: en ? 'Negative paths, validation, and error responses are covered' : 'Skenario negatif, validasi, dan respons error telah dicakup', critical: true },
    { id: 'migration', category: en ? 'API & data contracts' : 'Kontrak API & data', title: en ? 'Data migration and backward compatibility are checked' : 'Migrasi data dan kompatibilitas ke belakang telah diperiksa', critical: false },
    { id: 'security', category: en ? 'Security & privacy' : 'Keamanan & privasi', title: en ? 'Authentication, authorization, and access boundaries are tested' : 'Autentikasi, otorisasi, dan batas akses telah diuji', critical: true },
    { id: 'privacy', category: en ? 'Security & privacy' : 'Keamanan & privasi', title: en ? 'Sensitive data, secrets, and logs are reviewed for exposure' : 'Data sensitif, secret, dan log telah diperiksa dari risiko kebocoran', critical: true },
    { id: 'performance', category: en ? 'Reliability & operations' : 'Keandalan & operasional', title: en ? 'Performance and timeout behavior meet agreed thresholds' : 'Performa dan perilaku timeout memenuhi ambang yang disepakati', critical: false },
    { id: 'monitoring', category: en ? 'Reliability & operations' : 'Keandalan & operasional', title: en ? 'Health checks, alerts, and actionable logs are verified' : 'Health check, alert, dan log yang dapat ditindaklanjuti telah diverifikasi', critical: false },
    { id: 'rollback', category: en ? 'Release & recovery' : 'Rilis & pemulihan', title: en ? 'Rollback or recovery procedure is documented and viable' : 'Prosedur rollback atau pemulihan terdokumentasi dan layak dijalankan', critical: true },
    { id: 'signoff', category: en ? 'Release & recovery' : 'Rilis & pemulihan', title: en ? 'Known defects, release notes, and stakeholder sign-off are complete' : 'Defect yang diketahui, catatan rilis, dan persetujuan stakeholder telah lengkap', critical: false },
  ]
  const releaseCompleted = releaseChecks.filter(item => releaseChecked[item.id]).length
  const releaseWeightTotal = releaseChecks.reduce((total, item) => total + (item.critical ? 2 : 1), 0)
  const releaseScore = Math.round(releaseChecks.reduce((total, item) => total + (releaseChecked[item.id] ? (item.critical ? 2 : 1) : 0), 0) / releaseWeightTotal * 100)
  const releaseCriticalMissing = releaseChecks.filter(item => item.critical && !releaseChecked[item.id]).length
  const releaseStatus = releaseScore === 100 ? (en ? 'Ready for release' : 'Siap dirilis') : releaseCriticalMissing > 0 ? (en ? 'Release blocked' : 'Rilis tertahan') : releaseScore >= 80 ? (en ? 'Ready with follow-ups' : 'Siap dengan tindak lanjut') : (en ? 'Needs more evidence' : 'Perlu bukti tambahan')

  const generatedCases = useMemo(() => {
    const subject = feature.trim() || (en ? 'the feature' : 'fitur ini')
    return en ? [
      { title: `Verify the happy path for ${subject}`, steps: 'Provide valid input and submit the primary action.', expected: 'The operation succeeds and the expected result is shown.' },
      { title: `Validate required fields in ${subject}`, steps: 'Leave each required field empty and submit.', expected: 'Submission is blocked and clear field-level guidance appears.' },
      { title: `Reject invalid input in ${subject}`, steps: 'Submit malformed or unsupported values.', expected: 'Invalid data is rejected without corrupting application state.' },
      { title: `Check boundary values in ${subject}`, steps: 'Test minimum, maximum, and just-outside-limit values.', expected: 'Documented limits are enforced consistently.' },
      { title: `Prevent duplicate submission in ${subject}`, steps: 'Trigger the primary action repeatedly in quick succession.', expected: 'Duplicate processing is prevented or handled idempotently.' },
      { title: `Verify keyboard accessibility for ${subject}`, steps: 'Navigate controls with Tab, Shift+Tab, Enter, and Space.', expected: 'Focus order is logical and every action is keyboard operable.' },
      { title: `Handle service failure in ${subject}`, steps: 'Simulate a timeout or server error during submission.', expected: 'A helpful error appears and the user can recover safely.' },
      { title: `Recover after an error in ${subject}`, steps: 'Correct invalid input or retry after a failed request.', expected: 'The operation can complete without refreshing the page.' },
    ] : [
      { title: `Verifikasi alur normal ${subject}`, steps: 'Masukkan data valid lalu jalankan aksi utama.', expected: 'Proses berhasil dan hasil yang diharapkan ditampilkan.' },
      { title: `Validasi field wajib pada ${subject}`, steps: 'Kosongkan setiap field wajib lalu kirim.', expected: 'Pengiriman dicegah dan petunjuk yang jelas ditampilkan.' },
      { title: `Tolak input tidak valid pada ${subject}`, steps: 'Kirim nilai dengan format salah atau tidak didukung.', expected: 'Data tidak valid ditolak tanpa merusak state aplikasi.' },
      { title: `Uji batas nilai pada ${subject}`, steps: 'Uji nilai minimum, maksimum, dan di luar batas.', expected: 'Batas yang didokumentasikan diterapkan secara konsisten.' },
      { title: `Cegah pengiriman duplikat pada ${subject}`, steps: 'Jalankan aksi utama berulang kali dalam waktu singkat.', expected: 'Pemrosesan duplikat dicegah atau ditangani secara idempoten.' },
      { title: `Uji aksesibilitas keyboard pada ${subject}`, steps: 'Navigasikan kontrol dengan Tab, Shift+Tab, Enter, dan Space.', expected: 'Urutan fokus logis dan seluruh aksi dapat dijalankan dengan keyboard.' },
      { title: `Tangani kegagalan layanan pada ${subject}`, steps: 'Simulasikan timeout atau error server saat pengiriman.', expected: 'Pesan error yang membantu muncul dan pengguna dapat pulih dengan aman.' },
      { title: `Pulihkan proses setelah error pada ${subject}`, steps: 'Perbaiki input atau ulangi setelah request gagal.', expected: 'Proses dapat selesai tanpa memuat ulang halaman.' },
    ]
  }, [feature, en])

  useEffect(() => {
    document.title = en ? 'Engineering Lab — DreamEx Tech' : 'Lab Engineering — DreamEx Tech'
    return () => { document.title = 'DreamEx Tech — Engineering, AI & QA' }
  }, [en])

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(en ? 'Copied to clipboard.' : 'Berhasil disalin.')
    } catch {
      setCopyStatus(en ? 'Clipboard unavailable. Select and copy the output manually.' : 'Clipboard tidak tersedia. Pilih dan salin hasil secara manual.')
    }
  }

  const generatePostmortem = () => {
    const lines = (value: string) => value.trim() ? value.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean) : []
    const timeline = lines(incidentTimeline)
    const followUps = lines(incidentFollowUps)
    const timelineEvents = timeline.map(line => {
      const prefix = line.match(/^\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?|\d{1,2}:\d{2}(?:\s+(?:UTC|WIB|WITA|WIT))?)/i)?.[1]
      if (!prefix) return { line, value: null as number | null, mode: '' }
      if (/^\d{4}-/.test(prefix)) {
        const value = Date.parse(prefix)
        return { line, value: Number.isFinite(value) ? value : null, mode: 'absolute' }
      }
      const clock = prefix.match(/^(\d{1,2}):(\d{2})(?:\s+(UTC|WIB|WITA|WIT))?$/i)
      if (!clock) return { line, value: null as number | null, mode: '' }
      const offsets: Record<string, number> = { UTC: 0, WIB: 7, WITA: 8, WIT: 9 }
      const zone = (clock[3] || 'LOCAL').toUpperCase()
      const value = Number(clock[1]) * 60 + Number(clock[2]) - (offsets[zone] ?? 0) * 60
      return { line, value, mode: 'clock:' + zone }
    })
    const comparableTimeline = timelineEvents.length > 0 && timelineEvents.every(event => event.value !== null && event.mode === timelineEvents[0].mode)
    const chronological = comparableTimeline && timelineEvents.every((event, index) => index === 0 || (event.value as number) >= (timelineEvents[index - 1].value as number))
    const timelineStatus = !timeline.length ? 'NOT PROVIDED' : !comparableTimeline ? 'NOT VERIFIED' : chronological ? 'PASS' : 'WARNING'
    const followUpEntries = followUps.map(line => {
      const parts = line.split(/\s*(?:\||—|–)\s*/).map(part => part.trim())
      const action = parts[0] || line
      const owner = parts[1] || ''
      const dueDate = parts[2] || ''
      const parsedDue = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? Date.parse(dueDate + 'T00:00:00Z') : NaN
      const validDueDate = Number.isFinite(parsedDue) && new Date(parsedDue).toISOString().slice(0, 10) === dueDate
      return { action, owner, dueDate, validDueDate, complete: Boolean(owner && validDueDate) }
    })
    const accountableFollowUps = followUpEntries.filter(item => item.complete).length
    const startMs = incidentStart ? Date.parse(incidentStart) : NaN
    const endMs = incidentEnd ? Date.parse(incidentEnd) : NaN
    const invalidIncidentWindow = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs
    const warnings = [
      ...(timelineStatus === 'WARNING' ? ['Timeline events are not in chronological order. Review the supplied timestamps.'] : []),
      ...(timelineStatus === 'NOT VERIFIED' ? ['Timeline chronology could not be verified. Use consistent ISO 8601 timestamps or HH:mm values with a consistent timezone.'] : []),
      ...(invalidIncidentWindow ? ['Incident end time is earlier than start time. Correct the incident window before sharing.'] : []),
      ...(followUpEntries.some(item => !item.complete) ? ['Some follow-up actions are missing an owner or a valid YYYY-MM-DD due date.'] : []),
    ]
    const report = [
      '# ' + (incidentTitle.trim() || (en ? 'Incident postmortem' : 'Postmortem insiden')),
      '',
      '> ' + (en ? 'Blameless review: focus on system conditions, learning, and prevention.' : 'Tinjauan tanpa menyalahkan: fokus pada kondisi sistem, pembelajaran, dan pencegahan.'),
      '',
      '## Incident summary',
      '- **Severity:** ' + incidentSeverity,
      '- **Status:** ' + incidentStatus,
      '- **Start:** ' + (incidentStart || (en ? 'Not recorded' : 'Belum dicatat')),
      '- **End:** ' + (incidentEnd || (en ? 'Not recorded' : 'Belum dicatat')),
      '',
      '## Customer and business impact',
      incidentImpact.trim() || (en ? 'Describe affected users, services, duration, and measurable impact.' : 'Jelaskan pengguna/layanan terdampak, durasi, dan dampak terukur.'),
      '',
      '## Detection',
      incidentDetection.trim() || (en ? 'Explain how the incident was detected and why earlier signals did or did not help.' : 'Jelaskan bagaimana insiden terdeteksi dan apakah sinyal sebelumnya membantu.'),
      '',
      '## Timeline',
      ...(timeline.length ? timeline.map(line => '- ' + line) : ['- ' + (en ? 'Add timestamped events in chronological order.' : 'Tambahkan peristiwa bertimestamp secara kronologis.')]),
      '',
      '## Timeline integrity',
      '- Timestamped events: ' + timelineEvents.filter(event => event.value !== null).length + ' / ' + timeline.length,
      '- Chronology check: ' + timelineStatus,
      '- Check scope: compares timestamps only when every event uses a supported, consistent format; it does not verify the truth of the events.',
      '',
      '## Root cause',
      incidentRootCause.trim() || (en ? 'Describe the underlying system conditions, not an individual to blame.' : 'Jelaskan kondisi sistem yang mendasari, bukan menyalahkan individu.'),
      '',
      '## Contributing factors',
      ...(lines(incidentContributors).length ? lines(incidentContributors).map(line => '- ' + line) : ['- ' + (en ? 'No contributing factors documented yet.' : 'Belum ada faktor kontribusi yang didokumentasikan.')]),
      '',
      '## Resolution and recovery',
      incidentResolution.trim() || (en ? 'Document mitigation, recovery steps, and validation performed.' : 'Dokumentasikan mitigasi, langkah pemulihan, dan validasi yang dilakukan.'),
      '',
      '## Follow-up accountability',
      '- Actions with owner and valid due date: ' + accountableFollowUps + ' / ' + followUpEntries.length,
      ...(followUpEntries.length ? followUpEntries.map(item => '- [ ] ' + item.action + ' — Owner: ' + (item.owner || 'UNASSIGNED') + ' — Due: ' + (item.validDueDate ? item.dueDate : 'UNSCHEDULED')) : ['- [ ] ' + (en ? 'Add an action, owner, due date, and measurable completion criteria.' : 'Tambahkan aksi, penanggung jawab, tenggat, dan kriteria penyelesaian terukur.')]),
      '',
      '## Completeness warnings',
      ...(warnings.length ? warnings.map(warning => '- WARNING: ' + warning) : ['- No chronology/window/follow-up completeness warning was detected by these basic checks.']),
      '',
      '## Review notes',
      en ? 'Review this document with relevant stakeholders. Avoid sensitive credentials, personal data, and blame-focused language.' : 'Tinjau dokumen ini bersama stakeholder terkait. Hindari kredensial sensitif, data pribadi, dan bahasa yang menyalahkan individu.',
    ].join('\n')
    setPostmortemReport(report)
    setCopyStatus('')
  }

  const downloadPostmortem = () => {
    if (!postmortemReport) return
    const blob = new Blob([postmortemReport], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const slug = (incidentTitle.trim() || 'incident-postmortem').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'incident-postmortem'
    anchor.href = url
    anchor.download = slug + '-postmortem.md'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'Postmortem Markdown downloaded.' : 'Markdown postmortem berhasil diunduh.')
  }

  const generateBugReport = () => setBugReport([
    `# ${bugTitle.trim() || (en ? 'Bug report title' : 'Judul laporan bug')}`,
    '',
    `- Severity: ${severity}`,
    `- Environment: ${environment.trim() || (en ? 'Not specified' : 'Belum ditentukan')}`,
    '',
    '## Steps to Reproduce',
    steps.trim() || (en ? '1. Add reproduction steps.' : '1. Tambahkan langkah reproduksi.'),
    '',
    '## Actual Result',
    actual.trim() || (en ? 'Describe what happened.' : 'Jelaskan apa yang terjadi.'),
    '',
    '## Expected Result',
    expected.trim() || (en ? 'Describe the expected behavior.' : 'Jelaskan perilaku yang diharapkan.'),
  ].join('\n'))

  const formatJson = () => {
    try {
      setJsonOutput(JSON.stringify(JSON.parse(jsonInput), null, 2))
      setJsonError('')
    } catch (error) {
      setJsonOutput('')
      setJsonError(error instanceof Error ? error.message : (en ? 'Invalid JSON.' : 'JSON tidak valid.'))
    }
  }

  const apiScenarios = useMemo(() => {
    const endpoint = apiPath.trim() || '/api/v1/resource'
    const method = apiMethod.toUpperCase()
    const scenarios: { id: string; title: string; steps: string; expected: string }[] = [
      { id: 'TC-API-01', title: en ? 'Successful request with valid input' : 'Request berhasil dengan input valid', steps: en ? `Send a valid ${method} request to ${endpoint} with valid credentials and a valid payload where applicable.` : `Kirim request ${method} yang valid ke ${endpoint} dengan kredensial dan payload valid jika diperlukan.`, expected: en ? 'The API returns the documented success status and a response matching its schema.' : 'API mengembalikan status sukses yang didokumentasikan dan respons sesuai schema.' },
      ...(apiAuth === 'required' ? [{ id: 'TC-API-02', title: en ? 'Reject missing or invalid credentials' : 'Tolak kredensial yang hilang atau tidak valid', steps: en ? `Send ${method} ${endpoint} without a valid access token.` : `Kirim ${method} ${endpoint} tanpa access token yang valid.`, expected: en ? 'The API returns 401 Unauthorized without exposing protected data.' : 'API mengembalikan 401 Unauthorized tanpa membocorkan data terlindungi.' }] : []),
      { id: 'TC-API-03', title: en ? 'Enforce resource permissions' : 'Terapkan izin akses resource', steps: en ? 'Authenticate as a user without the required permission and request the resource.' : 'Login sebagai pengguna tanpa izin yang diperlukan lalu akses resource.', expected: en ? 'The API returns 403 Forbidden and does not disclose restricted data.' : 'API mengembalikan 403 Forbidden dan tidak mengungkap data terbatas.' },
      { id: 'TC-API-04', title: en ? 'Handle an unknown resource' : 'Tangani resource yang tidak ditemukan', steps: en ? 'Request a non-existent identifier or an unknown route.' : 'Minta identifier yang tidak ada atau route yang tidak dikenal.', expected: en ? 'The API returns 404 Not Found with a consistent error structure.' : 'API mengembalikan 404 Not Found dengan struktur error yang konsisten.' },
      { id: 'TC-API-05', title: en ? 'Reject an unsupported HTTP method' : 'Tolak HTTP method yang tidak didukung', steps: en ? 'Send a method that is not supported by the endpoint contract.' : 'Kirim method yang tidak didukung oleh kontrak endpoint.', expected: en ? 'The API returns 405 Method Not Allowed and documents allowed methods where applicable.' : 'API mengembalikan 405 Method Not Allowed dan mendokumentasikan method yang diizinkan bila relevan.' },
      ...(apiPayload === 'json' && ['POST', 'PUT', 'PATCH'].includes(method) ? [
        { id: 'TC-API-06', title: en ? 'Reject malformed JSON' : 'Tolak JSON dengan format salah', steps: en ? 'Send a request body containing malformed JSON.' : 'Kirim request body dengan JSON yang tidak valid.', expected: en ? 'The API returns 400 Bad Request and does not partially persist the request.' : 'API mengembalikan 400 Bad Request dan tidak menyimpan sebagian data.' },
        { id: 'TC-API-07', title: en ? 'Validate the request content type' : 'Validasi content type request', steps: en ? 'Send a body with a missing or unsupported Content-Type header.' : 'Kirim body tanpa header Content-Type atau dengan nilai yang tidak didukung.', expected: en ? 'The API returns 415 Unsupported Media Type or a clearly documented validation response.' : 'API mengembalikan 415 Unsupported Media Type atau respons validasi yang terdokumentasi.' },
        { id: 'TC-API-08', title: en ? 'Validate required fields and data types' : 'Validasi field wajib dan tipe data', steps: en ? 'Omit a required field and then submit a value with an incorrect data type.' : 'Hilangkan field wajib lalu kirim nilai dengan tipe data yang salah.', expected: en ? 'The API returns a documented validation response, commonly 422, without persisting invalid data.' : 'API mengembalikan respons validasi yang terdokumentasi, umumnya 422, tanpa menyimpan data invalid.' },
      ] : []),
      { id: 'TC-API-09', title: en ? 'Respect rate limits' : 'Patuhi batas rate limit', steps: en ? 'Send requests above the documented rate threshold in a controlled test environment.' : 'Kirim request melebihi ambang rate limit yang didokumentasikan di lingkungan pengujian terkontrol.', expected: en ? 'The API returns 429 Too Many Requests and provides retry guidance where supported.' : 'API mengembalikan 429 Too Many Requests dan memberikan panduan retry bila didukung.' },
      { id: 'TC-API-10', title: en ? 'Fail safely during a server error' : 'Gagal dengan aman saat server error', steps: en ? 'Simulate a controlled upstream failure or timeout.' : 'Simulasikan kegagalan upstream atau timeout secara terkontrol.', expected: en ? 'The API returns a documented 5xx response, avoids leaking internals, and records diagnostic details securely.' : 'API mengembalikan respons 5xx yang terdokumentasi, tidak membocorkan detail internal, dan mencatat diagnostik secara aman.' },
    ]
    return scenarios
  }, [apiMethod, apiPath, apiAuth, apiPayload, en])

  const downloadReleaseScorecard = () => {
    const rows = [
      ['Category', 'Check', 'Critical', 'Status'],
      ...releaseChecks.map(item => [item.category, item.title, item.critical ? 'Yes' : 'No', releaseChecked[item.id] ? 'Complete' : 'Open']),
      ['Summary', 'Weighted readiness score', '', String(releaseScore) + '%'],
      ['Summary', 'Release decision', '', releaseStatus],
    ]
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-release-readiness.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'Release readiness scorecard CSV downloaded.' : 'CSV kesiapan rilis berhasil diunduh.')
  }

  const copyReleaseScorecard = () => {
    const report = [
      '# ' + (en ? 'Release readiness scorecard' : 'Scorecard kesiapan rilis'),
      '',
      '- ' + (en ? 'Weighted readiness score' : 'Skor kesiapan berbobot') + ': ' + releaseScore + '%',
      '- ' + (en ? 'Decision' : 'Keputusan') + ': ' + releaseStatus,
      '- ' + (en ? 'Critical checks still open' : 'Pemeriksaan kritis yang belum selesai') + ': ' + releaseCriticalMissing,
      '',
      ...releaseChecks.map(item => '- [' + (releaseChecked[item.id] ? 'x' : ' ') + '] ' + item.category + ' — ' + item.title + (item.critical ? ' (CRITICAL)' : '')),
    ].join('\n')
    void copyText(report)
  }

  const downloadApiMatrix = () => {
    const rows = [
      ['Case ID', 'HTTP Method', 'Endpoint', 'Scenario', 'Steps', 'Expected Result'],
      ...apiScenarios.map(item => [item.id, apiMethod, apiPath.trim() || '/api/v1/resource', item.title, item.steps, item.expected]),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-api-test-matrix.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'API test matrix CSV downloaded.' : 'CSV matriks pengujian API berhasil diunduh.')
  }

  const analyzeOpenApi = () => {
    try {
      const document = JSON.parse(openApiSpec) as Record<string, unknown>
      const version = typeof document.openapi === 'string' ? document.openapi : ''
      if (!version.startsWith('3.')) throw new Error(en ? 'This analyzer currently supports OpenAPI 3.x JSON documents.' : 'Analyzer ini saat ini mendukung dokumen JSON OpenAPI 3.x.')
      if (!document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) throw new Error(en ? 'The document must contain a valid "paths" object.' : 'Dokumen harus memiliki objek "paths" yang valid.')
      const paths = document.paths as Record<string, unknown>
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']
      const results: Array<{ method: string; path: string; summary: string; operationId: string; responses: string; parameters: string; requestBody: boolean; security: boolean }> = []
      Object.entries(paths).forEach(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) return
        const pathObject = pathItem as Record<string, unknown>
        methods.forEach(method => {
          const operation = pathObject[method]
          if (!operation || typeof operation !== 'object' || Array.isArray(operation)) return
          const op = operation as Record<string, unknown>
          const pathParameters = Array.isArray(pathObject.parameters) ? pathObject.parameters : []
          const operationParameters = Array.isArray(op.parameters) ? op.parameters : []
          const parameterNames = [...pathParameters, ...operationParameters].flatMap(parameter => {
            if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) return []
            const item = parameter as Record<string, unknown>
            return typeof item.name === 'string' ? [item.name + (item.required === true ? ' *' : '')] : []
          })
          const responseObject = op.responses && typeof op.responses === 'object' && !Array.isArray(op.responses) ? op.responses as Record<string, unknown> : {}
          const responseCodes = Object.keys(responseObject).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          const rootSecurity = Array.isArray(document.security) && document.security.length > 0
          const operationSecurity = Array.isArray(op.security) ? op.security.length > 0 : rootSecurity
          results.push({
            method: method.toUpperCase(),
            path,
            summary: typeof op.summary === 'string' ? op.summary : typeof op.description === 'string' ? op.description : (en ? 'No summary provided' : 'Ringkasan belum tersedia'),
            operationId: typeof op.operationId === 'string' ? op.operationId : '',
            responses: responseCodes.join(', ') || (en ? 'Undocumented' : 'Belum didokumentasikan'),
            parameters: parameterNames.join(', '),
            requestBody: Boolean(op.requestBody),
            security: operationSecurity,
          })
        })
      })

      const findings: Array<{ method: string; path: string; severity: 'error' | 'warning' | 'info'; code: string; message: string }> = []
      const addFinding = (method: string, path: string, severity: 'error' | 'warning' | 'info', code: string, english: string, indonesian: string) => {
        findings.push({ method, path, severity, code, message: en ? english : indonesian })
      }
      Object.entries(paths).forEach(([path, rawPathItem]) => {
        if (!rawPathItem || typeof rawPathItem !== 'object' || Array.isArray(rawPathItem)) return
        const pathItem = rawPathItem as Record<string, unknown>
        methods.forEach(method => {
          const rawOperation = pathItem[method]
          if (!rawOperation || typeof rawOperation !== 'object' || Array.isArray(rawOperation)) return
          const operation = rawOperation as Record<string, unknown>
          const responses = operation.responses && typeof operation.responses === 'object' && !Array.isArray(operation.responses) ? operation.responses as Record<string, unknown> : {}
          const responseCodes = Object.keys(responses)
          if (!responseCodes.length) addFinding(method.toUpperCase(), path, 'error', 'RESPONSES_MISSING', 'No responses are documented for this operation.', 'Operasi ini belum mendokumentasikan respons.')
          else {
            if (!responseCodes.some(code => code.length === 3 && code.startsWith('2')) && !responseCodes.includes('default')) addFinding(method.toUpperCase(), path, 'warning', 'SUCCESS_RESPONSE_MISSING', 'No 2xx success response or default response is documented.', 'Belum ada respons sukses 2xx atau respons default yang didokumentasikan.')
            responseCodes.forEach(code => {
              const response = responses[code]
              if (response && typeof response === 'object' && !Array.isArray(response) && (typeof (response as Record<string, unknown>).description !== 'string' || !String((response as Record<string, unknown>).description ?? '').trim())) {
                addFinding(method.toUpperCase(), path, 'warning', 'RESPONSE_DESCRIPTION_MISSING', 'Response "' + code + '" has no description.', 'Respons "' + code + '" belum memiliki deskripsi.')
              }
            })
          }
          const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : []
          const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : []
          const parameters = [...pathParameters, ...operationParameters].filter(parameter => parameter && typeof parameter === 'object' && !Array.isArray(parameter)) as Record<string, unknown>[]
          const byName = new Map<string, Record<string, unknown>>()
          parameters.forEach(parameter => { if (parameter.in === 'path' && typeof parameter.name === 'string') byName.set(parameter.name, parameter) })
          const variables = path.split('{').slice(1).map(part => part.split('}')[0]).filter(Boolean)
          variables.forEach(name => {
            const parameter = byName.get(name)
            if (!parameter) addFinding(method.toUpperCase(), path, 'error', 'PATH_PARAM_MISSING', 'Path variable "' + name + '" has no declared path parameter.', 'Variabel path "' + name + '" belum memiliki deklarasi parameter path.')
            else if (parameter.required !== true) addFinding(method.toUpperCase(), path, 'error', 'PATH_PARAM_NOT_REQUIRED', 'Path parameter "' + name + '" must set required: true.', 'Parameter path "' + name + '" harus menetapkan required: true.')
            else if (!parameter.schema || typeof parameter.schema !== 'object' || Array.isArray(parameter.schema)) addFinding(method.toUpperCase(), path, 'warning', 'PATH_PARAM_SCHEMA_MISSING', 'Path parameter "' + name + '" has no schema.', 'Parameter path "' + name + '" belum memiliki schema.')
          })
          if (['post', 'put', 'patch'].includes(method) && operation.requestBody && typeof operation.requestBody === 'object' && !Array.isArray(operation.requestBody)) {
            const body = operation.requestBody as Record<string, unknown>
            const content = body.content && typeof body.content === 'object' && !Array.isArray(body.content) ? body.content as Record<string, unknown> : {}
            const hasRequestSchema = Object.values(content).some(media => media && typeof media === 'object' && !Array.isArray(media) && (media as Record<string, unknown>).schema && typeof (media as Record<string, unknown>).schema === 'object')
            if (!hasRequestSchema) addFinding(method.toUpperCase(), path, 'warning', 'REQUEST_SCHEMA_MISSING', 'Request body is declared but has no usable schema.', 'Request body dideklarasikan tetapi belum memiliki schema yang dapat digunakan.')
          } else if (['post', 'put', 'patch'].includes(method) && !operation.requestBody) {
            addFinding(method.toUpperCase(), path, 'info', 'REQUEST_BODY_UNDECLARED', 'Write operation has no request body; confirm this is intentional.', 'Operasi penulisan tidak memiliki request body; pastikan ini memang disengaja.')
          }
          if (typeof operation.operationId !== 'string' || !operation.operationId.trim()) addFinding(method.toUpperCase(), path, 'info', 'OPERATION_ID_MISSING', 'No operationId is declared; generated clients may have less stable names.', 'operationId belum dideklarasikan; nama pada client hasil generasi mungkin kurang stabil.')
        })
      })
      setOpenApiIssues(findings)
      if (!results.length) throw new Error(en ? 'No HTTP operations were found under "paths".' : 'Tidak ada operasi HTTP yang ditemukan di dalam "paths".')
      setOpenApiResults(results)
      setOpenApiError('')
      setOpenApiAnalyzed(true)
      setCopyStatus('')
    } catch (error) {
      setOpenApiResults([])
      setOpenApiIssues([])
      setOpenApiAnalyzed(false)
      setOpenApiError(error instanceof Error ? error.message : (en ? 'Unable to analyze this document.' : 'Dokumen tidak dapat dianalisis.'))
    }
  }

  const downloadOpenApiMatrix = () => {
    const rows = [
      ['Method', 'Path', 'Summary', 'Operation ID', 'Documented Responses', 'Parameters', 'Request Body', 'Security'],
      ...openApiResults.map(item => [item.method, item.path, item.summary, item.operationId, item.responses, item.parameters, item.requestBody ? 'Yes' : 'No', item.security ? 'Required' : 'Not declared']),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-openapi-contract-matrix.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setCopyStatus(en ? 'OpenAPI contract matrix CSV downloaded.' : 'CSV matriks kontrak OpenAPI berhasil diunduh.')
  }

  return <main id="main-content" className="engineering-lab container">
    <header className="lab-header"><span className="section-kicker">{en ? 'PRACTICAL ENGINEERING TOOLKIT' : 'TOOLKIT ENGINEERING PRAKTIS'}</span><h1>{en ? 'Engineering' : 'Engineering'} <span>Lab.</span></h1><p>{en ? 'Small, useful tools for QA workflows, clearer bug reports, and safer data handling. Processing runs locally in your browser.' : 'Perangkat praktis untuk alur kerja QA, laporan bug yang jelas, dan pengolahan data yang aman. Pemrosesan berjalan lokal di browser Anda.'}</p><div className="lab-local-note"><ShieldCheck size={16} /> {en ? 'No account or backend required — your inputs stay in this browser session.' : 'Tanpa akun atau backend — input Anda tetap diproses di browser ini.'}</div></header>
    <div className="lab-tool-tabs" role="tablist" aria-label={en ? 'Engineering tools' : 'Tool engineering'}>
      <button role="tab" aria-selected={activeTool === 'test-cases'} className={activeTool === 'test-cases' ? 'active' : ''} onClick={() => { setActiveTool('test-cases'); setCopyStatus('') }}><ShieldCheck size={16} /> {en ? 'Test Case Builder' : 'Pembuat Test Case'}</button>
      <button role="tab" aria-selected={activeTool === 'bug-report'} className={activeTool === 'bug-report' ? 'active' : ''} onClick={() => { setActiveTool('bug-report'); setCopyStatus('') }}><BookOpen size={16} /> {en ? 'Bug Report' : 'Laporan Bug'}</button>
      <button role="tab" aria-selected={activeTool === 'json'} className={activeTool === 'json' ? 'active' : ''} onClick={() => { setActiveTool('json'); setCopyStatus('') }}><Braces size={16} /> JSON {en ? 'Formatter' : 'Formatter'}</button>
      <button role="tab" aria-selected={activeTool === 'api-matrix'} className={activeTool === 'api-matrix' ? 'active' : ''} onClick={() => { setActiveTool('api-matrix'); setCopyStatus(''); setApiMatrixGenerated(false) }}><ShieldCheck size={16} /> {en ? 'API Test Matrix' : 'Matriks Tes API'}</button>
      <button role="tab" aria-selected={activeTool === 'openapi'} className={activeTool === 'openapi' ? 'active' : ''} onClick={() => { setActiveTool('openapi'); setCopyStatus(''); setOpenApiError(''); setOpenApiAnalyzed(false) }}><Braces size={16} /> {en ? 'OpenAPI Analyzer' : 'Analyzer OpenAPI'}</button>
      <button role="tab" aria-selected={activeTool === 'release-scorecard'} className={activeTool === 'release-scorecard' ? 'active' : ''} onClick={() => { setActiveTool('release-scorecard'); setCopyStatus('') }}><ShieldCheck size={16} /> {en ? 'Release Readiness' : 'Kesiapan Rilis'}</button>
      <button role="tab" aria-selected={activeTool === 'postmortem'} className={activeTool === 'postmortem' ? 'active' : ''} onClick={() => { setActiveTool('postmortem'); setCopyStatus('') }}><BookOpen size={16} /> {en ? 'Incident Postmortem' : 'Postmortem Insiden'}</button>
    </div>
    <section className="lab-tool-panel" role="tabpanel">
      {activeTool === 'test-cases' && <div className="lab-form">
        <div className="lab-panel-heading"><span className="section-kicker">01 / QA AUTOMATION</span><h2>{en ? 'Test case starter kit' : 'Starter kit test case'}</h2><p>{en ? 'Create a baseline checklist, then refine each case against the product requirements.' : 'Buat checklist awal, lalu sesuaikan setiap kasus dengan kebutuhan produk.'}</p></div>
        <label className="lab-field"><span>{en ? 'Feature or user journey' : 'Fitur atau alur pengguna'}</span><input value={feature} onChange={event => { setFeature(event.target.value); setGenerated(false) }} placeholder={en ? 'e.g. Password reset' : 'mis. Reset password'} /></label>
        <button className="button button-primary lab-action" onClick={() => setGenerated(true)}>{en ? 'Generate test cases' : 'Buat test case'} <ArrowRight size={16} /></button>
        {generated && <div className="lab-generated"><div className="lab-output-heading"><h3>{en ? 'Generated test cases' : 'Test case yang dihasilkan'}</h3><button className="copy-link-button" onClick={() => copyText(generatedCases.map((item, index) => `TC-${String(index + 1).padStart(2, '0')} — ${item.title}\nSteps: ${item.steps}\nExpected: ${item.expected}`).join('\n\n'))}><Copy size={14} /> {en ? 'Copy all' : 'Salin semua'}</button></div><div className="lab-case-list">{generatedCases.map((item, index) => <article className="lab-case" key={item.title}><span className="lab-case-id">TC-{String(index + 1).padStart(2, '0')}</span><div><h4>{item.title}</h4><p><strong>{en ? 'Steps' : 'Langkah'}:</strong> {item.steps}</p><p><strong>{en ? 'Expected' : 'Hasil yang diharapkan'}:</strong> {item.expected}</p></div></article>)}</div></div>}
      </div>}
      {activeTool === 'bug-report' && <div className="lab-form">
        <div className="lab-panel-heading"><span className="section-kicker">02 / DEFECT MANAGEMENT</span><h2>{en ? 'Build a clear bug report' : 'Susun laporan bug yang jelas'}</h2><p>{en ? 'Capture reproducible steps, impact, and expected behavior in a consistent format.' : 'Catat langkah reproduksi, dampak, dan perilaku yang diharapkan dengan format konsisten.'}</p></div>
        <label className="lab-field"><span>{en ? 'Bug title' : 'Judul bug'}</span><input value={bugTitle} onChange={event => setBugTitle(event.target.value)} placeholder={en ? 'e.g. Login button stays disabled' : 'mis. Tombol login tetap nonaktif'} /></label>
        <div className="lab-field-row"><label className="lab-field"><span>{en ? 'Severity' : 'Severity'}</span><select value={severity} onChange={event => setSeverity(event.target.value)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label className="lab-field"><span>{en ? 'Environment' : 'Lingkungan'}</span><input value={environment} onChange={event => setEnvironment(event.target.value)} /></label></div>
        <label className="lab-field"><span>{en ? 'Steps to reproduce' : 'Langkah reproduksi'}</span><textarea rows={3} value={steps} onChange={event => setSteps(event.target.value)} placeholder={en ? '1. Open the page…' : '1. Buka halaman…'} /></label>
        <div className="lab-field-row"><label className="lab-field"><span>{en ? 'Actual result' : 'Hasil aktual'}</span><textarea rows={3} value={actual} onChange={event => setActual(event.target.value)} /></label><label className="lab-field"><span>{en ? 'Expected result' : 'Hasil yang diharapkan'}</span><textarea rows={3} value={expected} onChange={event => setExpected(event.target.value)} /></label></div>
        <button className="button button-primary lab-action" onClick={generateBugReport}>{en ? 'Generate bug report' : 'Buat laporan bug'} <ArrowRight size={16} /></button>
        {bugReport && <div className="lab-generated"><div className="lab-output-heading"><h3>{en ? 'Ready-to-copy report' : 'Laporan siap disalin'}</h3><button className="copy-link-button" onClick={() => copyText(bugReport)}><Copy size={14} /> {en ? 'Copy report' : 'Salin laporan'}</button></div><pre className="lab-output">{bugReport}</pre></div>}
      </div>}
      {activeTool === 'json' && <div className="lab-form">
        <div className="lab-panel-heading"><span className="section-kicker">03 / DATA UTILITIES</span><h2>{en ? 'Format and validate JSON' : 'Rapikan dan validasi JSON'}</h2><p>{en ? 'Validate syntax and format JSON locally. No payload is sent to a server.' : 'Validasi sintaks dan rapikan JSON secara lokal. Tidak ada payload yang dikirim ke server.'}</p></div>
        <label className="lab-field"><span>{en ? 'JSON input' : 'Input JSON'}</span><textarea rows={9} spellCheck={false} value={jsonInput} onChange={event => { setJsonInput(event.target.value); setJsonOutput(''); setJsonError('') }} /></label>
        <button className="button button-primary lab-action" onClick={formatJson}>{en ? 'Format JSON' : 'Rapikan JSON'} <Braces size={16} /></button>
        {jsonError && <p className="lab-error" role="alert">{en ? 'Invalid JSON:' : 'JSON tidak valid:'} {jsonError}</p>}
        {jsonOutput && <div className="lab-generated"><div className="lab-output-heading"><h3>{en ? 'Formatted output' : 'Hasil format'}</h3><button className="copy-link-button" onClick={() => copyText(jsonOutput)}><Copy size={14} /> {en ? 'Copy JSON' : 'Salin JSON'}</button></div><pre className="lab-output" aria-label={en ? 'Formatted JSON output' : 'Hasil JSON terformat'}>{jsonOutput}</pre></div>}
      </div>}
      {activeTool === 'api-matrix' && <div className="lab-form api-matrix-form">
        <div className="lab-panel-heading"><span className="section-kicker">04 / API QUALITY ENGINEERING</span><h2>{en ? 'Design an API test matrix' : 'Rancang matriks pengujian API'}</h2><p>{en ? 'Generate a practical contract-testing checklist for an endpoint, then refine it against your API specification. This tool creates test ideas only; it does not send requests.' : 'Buat checklist contract testing praktis untuk sebuah endpoint, lalu sesuaikan dengan spesifikasi API Anda. Tool ini hanya membuat ide pengujian dan tidak mengirim request.'}</p></div>
        <div className="api-matrix-fields">
          <label className="lab-field"><span>{en ? 'HTTP method' : 'HTTP method'}</span><select value={apiMethod} onChange={event => { setApiMethod(event.target.value); setApiMatrixGenerated(false) }}><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option><option>OPTIONS</option></select></label>
          <label className="lab-field"><span>{en ? 'Endpoint path' : 'Path endpoint'}</span><input value={apiPath} onChange={event => { setApiPath(event.target.value); setApiMatrixGenerated(false) }} placeholder="/api/v1/users" /></label>
          <label className="lab-field"><span>{en ? 'Authentication' : 'Autentikasi'}</span><select value={apiAuth} onChange={event => { setApiAuth(event.target.value); setApiMatrixGenerated(false) }}><option value="required">{en ? 'Required' : 'Wajib'}</option><option value="optional">{en ? 'Optional / public' : 'Opsional / publik'}</option></select></label>
          <label className="lab-field"><span>{en ? 'Request payload' : 'Payload request'}</span><select value={apiPayload} onChange={event => { setApiPayload(event.target.value); setApiMatrixGenerated(false) }}><option value="json">JSON</option><option value="none">{en ? 'No body' : 'Tanpa body'}</option></select></label>
        </div>
        <div className="api-matrix-note"><ShieldCheck size={15} /><span>{en ? 'Privacy-first: all inputs stay in your browser. No API endpoint is called.' : 'Mengutamakan privasi: semua input tetap di browser. Tidak ada endpoint API yang dipanggil.'}</span></div>
        <button className="button button-primary lab-action" onClick={() => { setApiMatrixGenerated(true); setCopyStatus('') }}>{en ? 'Generate API test matrix' : 'Buat matriks tes API'} <ArrowRight size={16} /></button>
        {apiMatrixGenerated && <div className="lab-generated"><div className="lab-output-heading"><div><h3>{en ? 'Generated API scenarios' : 'Skenario API yang dihasilkan'}</h3><p className="api-matrix-count">{apiScenarios.length} {en ? 'scenarios · review before execution' : 'skenario · tinjau sebelum dijalankan'}</p></div><div className="api-matrix-actions"><button className="copy-link-button" onClick={() => copyText(apiScenarios.map(item => `## ${item.id} — ${item.title}\n\n- Request: ${apiMethod} ${apiPath.trim() || '/api/v1/resource'}\n- Steps: ${item.steps}\n- Expected: ${item.expected}`).join('\n\n'))}><Copy size={14} /> {en ? 'Copy Markdown' : 'Salin Markdown'}</button><button className="copy-link-button" onClick={downloadApiMatrix}><ArrowDownRight size={14} /> {en ? 'Download CSV' : 'Unduh CSV'}</button></div></div><div className="lab-case-list">{apiScenarios.map(item => <article className="lab-case api-matrix-case" key={item.id}><span className="lab-case-id">{item.id}</span><div><h4>{item.title}</h4><p><strong>{en ? 'Request' : 'Request'}:</strong> {apiMethod} {apiPath.trim() || '/api/v1/resource'}</p><p><strong>{en ? 'Steps' : 'Langkah'}:</strong> {item.steps}</p><p><strong>{en ? 'Expected' : 'Hasil yang diharapkan'}:</strong> {item.expected}</p></div></article>)}</div></div>}
      </div>}
      {activeTool === 'release-scorecard' && <div className="lab-form release-scorecard">
        <div className="lab-panel-heading"><span className="section-kicker">06 / RELEASE GOVERNANCE</span><h2>{en ? 'Release readiness scorecard' : 'Scorecard kesiapan rilis'}</h2><p>{en ? 'Turn release confidence into an evidence-based checklist across product quality, API contracts, security, reliability, and recovery. This score is a planning aid, not an automatic production approval.' : 'Ubah keyakinan rilis menjadi checklist berbasis bukti untuk kualitas produk, kontrak API, keamanan, keandalan, dan pemulihan. Skor ini membantu perencanaan, bukan persetujuan produksi otomatis.'}</p></div>
        <div className="release-score-overview">
          <div className="release-score-ring" style={{ '--release-score': releaseScore } as React.CSSProperties} role="img" aria-label={(en ? 'Readiness score ' : 'Skor kesiapan ') + releaseScore + ' percent'}><div><strong>{releaseScore}%</strong><span>{en ? 'Readiness' : 'Kesiapan'}</span></div></div>
          <div className="release-score-summary"><span className={'release-status-pill ' + (releaseScore === 100 ? 'status-ready' : releaseCriticalMissing > 0 ? 'status-blocked' : 'status-follow-up')}>{releaseStatus}</span><h3>{releaseCompleted} / {releaseChecks.length} {en ? 'checks complete' : 'pemeriksaan selesai'}</h3><p>{releaseCriticalMissing ? (en ? releaseCriticalMissing + ' critical checks remain open. Treat this as a release blocker until the evidence is reviewed.' : releaseCriticalMissing + ' pemeriksaan kritis masih terbuka. Perlakukan sebagai penghambat rilis sampai buktinya ditinjau.') : (en ? 'All critical checks are complete. Review remaining evidence and obtain the required sign-off.' : 'Semua pemeriksaan kritis selesai. Tinjau bukti yang tersisa dan dapatkan persetujuan yang diperlukan.')}</p><div className="release-progress-track" role="progressbar" aria-label={en ? 'Release checklist completion' : 'Penyelesaian checklist rilis'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(releaseCompleted / releaseChecks.length * 100)}><span style={{ width: Math.round(releaseCompleted / releaseChecks.length * 100) + '%' }} /></div><small>{Math.round(releaseCompleted / releaseChecks.length * 100)}% {en ? 'checklist completion' : 'checklist selesai'} · {en ? 'weighted score' : 'skor berbobot'}</small></div>
        </div>
        <div className="release-checklist-heading"><div><h3>{en ? 'Evidence checklist' : 'Checklist bukti'}</h3><p>{en ? 'Mark a check complete only when supporting evidence has been reviewed.' : 'Tandai selesai hanya jika bukti pendukung sudah ditinjau.'}</p></div><div className="release-score-actions"><button className="copy-link-button" onClick={copyReleaseScorecard}><Copy size={14} /> {en ? 'Copy report' : 'Salin laporan'}</button><button className="copy-link-button" onClick={downloadReleaseScorecard}><ArrowDownRight size={14} /> {en ? 'Export CSV' : 'Ekspor CSV'}</button></div></div>
        <div className="release-check-groups">{[...new Set(releaseChecks.map(item => item.category))].map(category => <section className="release-check-group" key={category}><h4>{category}<span>{releaseChecks.filter(item => item.category === category && releaseChecked[item.id]).length}/{releaseChecks.filter(item => item.category === category).length}</span></h4>{releaseChecks.filter(item => item.category === category).map(item => <label className={'release-check-item ' + (releaseChecked[item.id] ? 'is-complete' : '')} key={item.id}><input type="checkbox" checked={Boolean(releaseChecked[item.id])} onChange={event => setReleaseChecked(current => ({ ...current, [item.id]: event.target.checked }))} /><span className="release-check-copy"><strong>{item.title}</strong><small>{item.critical ? (en ? 'Critical gate' : 'Gerbang kritis') : (en ? 'Quality check' : 'Pemeriksaan kualitas')}</small></span>{item.critical && <span className="release-critical-tag">{en ? 'CRITICAL' : 'KRITIS'}</span>}</label>)}</section>)}</div>
        <p className="release-score-footnote"><ShieldCheck size={15} /> {en ? 'Local-only checklist: selections stay in this browser session. Export the report before leaving if you need a record.' : 'Checklist lokal: pilihan tersimpan selama sesi browser ini. Ekspor laporan sebelum keluar jika Anda memerlukan catatan.'}</p>
      </div>}
      {activeTool === 'postmortem' && <div className="lab-form postmortem-form">
        <div className="lab-panel-heading"><span className="section-kicker">07 / INCIDENT LEARNING</span><h2>{en ? 'Build a blameless incident postmortem' : 'Susun postmortem insiden tanpa menyalahkan'}</h2><p>{en ? 'Turn an incident into a structured learning record: impact, timeline, root cause, recovery, and accountable follow-ups. Everything is processed locally.' : 'Ubah insiden menjadi catatan pembelajaran terstruktur: dampak, linimasa, akar penyebab, pemulihan, dan tindak lanjut yang jelas. Semua diproses secara lokal.'}</p></div>
        <div className="api-matrix-note"><ShieldCheck size={15} /><span>{en ? 'Blameless by design · local-only processing · no incident data is uploaded. Avoid entering credentials or personal data.' : 'Dirancang tanpa menyalahkan · pemrosesan lokal · data insiden tidak diunggah. Hindari memasukkan kredensial atau data pribadi.'}</span></div>
        <div className="postmortem-section"><h3>{en ? 'Incident overview' : 'Ringkasan insiden'}</h3>
          <label className="lab-field"><span>{en ? 'Incident title' : 'Judul insiden'}</span><input value={incidentTitle} onChange={event => setIncidentTitle(event.target.value)} placeholder={en ? 'e.g. Checkout latency spike' : 'mis. Lonjakan latensi checkout'} /></label>
          <div className="postmortem-grid">
            <label className="lab-field"><span>{en ? 'Severity' : 'Tingkat keparahan'}</span><select value={incidentSeverity} onChange={event => setIncidentSeverity(event.target.value)}><option value="SEV-1">SEV-1 — {en ? 'Critical' : 'Kritis'}</option><option value="SEV-2">SEV-2 — {en ? 'High' : 'Tinggi'}</option><option value="SEV-3">SEV-3 — {en ? 'Moderate' : 'Sedang'}</option><option value="SEV-4">SEV-4 — {en ? 'Low' : 'Rendah'}</option></select></label>
            <label className="lab-field"><span>{en ? 'Current status' : 'Status saat ini'}</span><select value={incidentStatus} onChange={event => setIncidentStatus(event.target.value)}><option value="Investigating">{en ? 'Investigating' : 'Diinvestigasi'}</option><option value="Monitoring">{en ? 'Monitoring' : 'Dipantau'}</option><option value="Resolved">{en ? 'Resolved' : 'Selesai'}</option></select></label>
          </div>
          <div className="postmortem-grid">
            <label className="lab-field"><span>{en ? 'Start time' : 'Waktu mulai'}</span><input type="datetime-local" value={incidentStart} onChange={event => setIncidentStart(event.target.value)} /></label>
            <label className="lab-field"><span>{en ? 'End time' : 'Waktu berakhir'}</span><input type="datetime-local" value={incidentEnd} onChange={event => setIncidentEnd(event.target.value)} /></label>
          </div>
        </div>
        <div className="postmortem-section"><h3>{en ? 'Impact and detection' : 'Dampak dan deteksi'}</h3>
          <label className="lab-field"><span>{en ? 'Customer and business impact' : 'Dampak terhadap pelanggan dan bisnis'}</span><textarea rows={3} value={incidentImpact} onChange={event => setIncidentImpact(event.target.value)} placeholder={en ? 'Affected services, users, duration, and measurable impact…' : 'Layanan/pengguna terdampak, durasi, dan dampak terukur…'} /></label>
          <label className="lab-field"><span>{en ? 'Detection and signals' : 'Deteksi dan sinyal'}</span><textarea rows={2} value={incidentDetection} onChange={event => setIncidentDetection(event.target.value)} placeholder={en ? 'Alert, monitoring signal, or customer report…' : 'Alert, sinyal monitoring, atau laporan pelanggan…'} /></label>
          <label className="lab-field"><span>{en ? 'Timeline (one event per line)' : 'Linimasa (satu peristiwa per baris)'}</span><textarea rows={4} value={incidentTimeline} onChange={event => setIncidentTimeline(event.target.value)} placeholder={en ? '09:02 UTC — Alert triggered\n09:08 UTC — Mitigation started\n09:21 UTC — Service recovered' : '16:02 WIB — Alert terpicu\n16:08 WIB — Mitigasi dimulai\n16:21 WIB — Layanan pulih'} /></label>
        </div>
        <div className="postmortem-section"><h3>{en ? 'Analysis and recovery' : 'Analisis dan pemulihan'}</h3>
          <label className="lab-field"><span>{en ? 'Root cause' : 'Akar penyebab'}</span><textarea rows={3} value={incidentRootCause} onChange={event => setIncidentRootCause(event.target.value)} placeholder={en ? 'Which system conditions made this incident possible?' : 'Kondisi sistem apa yang memungkinkan insiden ini terjadi?'} /></label>
          <label className="lab-field"><span>{en ? 'Contributing factors (one per line)' : 'Faktor kontribusi (satu per baris)'}</span><textarea rows={2} value={incidentContributors} onChange={event => setIncidentContributors(event.target.value)} placeholder={en ? 'Missing alert\nInsufficient load test' : 'Alert belum tersedia\nLoad test belum memadai'} /></label>
          <label className="lab-field"><span>{en ? 'Resolution and recovery' : 'Resolusi dan pemulihan'}</span><textarea rows={3} value={incidentResolution} onChange={event => setIncidentResolution(event.target.value)} placeholder={en ? 'Mitigation, rollback, recovery, and verification…' : 'Mitigasi, rollback, pemulihan, dan verifikasi…'} /></label>
          <label className="lab-field"><span>{en ? 'Follow-up actions (one per line)' : 'Tindak lanjut (satu per baris)'}</span><textarea rows={3} value={incidentFollowUps} onChange={event => setIncidentFollowUps(event.target.value)} placeholder={en ? 'Add latency alert — Platform — 2026-10-20' : 'Tambah alert latensi — Platform — 2026-10-20'} /></label>
        </div>
        <div className="postmortem-actions"><button className="button button-primary lab-action" onClick={generatePostmortem}>{en ? 'Generate postmortem' : 'Buat postmortem'} <ArrowRight size={16} /></button></div>
        {postmortemReport && <div className="lab-generated"><div className="lab-output-heading"><div><h3>{en ? 'Postmortem report' : 'Laporan postmortem'}</h3><p>{en ? 'Review the report and assign follow-up owners before sharing.' : 'Tinjau laporan dan tetapkan penanggung jawab tindak lanjut sebelum dibagikan.'}</p></div><div className="postmortem-actions"><button className="copy-link-button" onClick={() => copyText(postmortemReport)}><Copy size={14} /> {en ? 'Copy Markdown' : 'Salin Markdown'}</button><button className="copy-link-button" onClick={downloadPostmortem}><ArrowDownRight size={14} /> {en ? 'Download .md' : 'Unduh .md'}</button></div></div><pre className="lab-output postmortem-output" aria-label={en ? 'Postmortem Markdown output' : 'Output Markdown postmortem'}>{postmortemReport}</pre></div>}
      </div>}
      {activeTool === 'openapi' && <div className="lab-form openapi-form">
        <div className="lab-panel-heading"><span className="section-kicker">05 / CONTRACT QUALITY</span><h2>{en ? 'Inspect an OpenAPI contract' : 'Periksa kontrak OpenAPI'}</h2><p>{en ? 'Paste an OpenAPI 3.x JSON document to inventory endpoints, methods, response codes, parameters, request bodies, and declared security. Analysis runs locally; it never calls your API.' : 'Tempel dokumen JSON OpenAPI 3.x untuk memetakan endpoint, method, kode respons, parameter, request body, dan keamanan yang dideklarasikan. Analisis berjalan lokal dan tidak memanggil API Anda.'}</p></div>
        <label className="lab-field"><span>{en ? 'OpenAPI JSON document' : 'Dokumen JSON OpenAPI'}</span><textarea className="openapi-input" rows={13} spellCheck={false} value={openApiSpec} onChange={event => { setOpenApiSpec(event.target.value); setOpenApiAnalyzed(false); setOpenApiError('') }} /></label>
        <div className="api-matrix-note"><ShieldCheck size={15} /><span>{en ? 'Local-only parsing · OpenAPI 3.x JSON · no network requests · required path parameters are marked with *' : 'Parsing lokal · JSON OpenAPI 3.x · tanpa request jaringan · parameter path wajib ditandai *'}</span></div>
        <button className="button button-primary lab-action" onClick={analyzeOpenApi}>{en ? 'Analyze contract' : 'Analisis kontrak'} <ArrowRight size={16} /></button>
        {openApiError && <p className="lab-error" role="alert">{openApiError}</p>}
        {openApiAnalyzed && <div className="lab-generated"><div className="lab-output-heading"><div><h3>{en ? 'Endpoint inventory' : 'Inventaris endpoint'}</h3><p className="api-matrix-count">{openApiResults.length} {en ? 'operations discovered' : 'operasi ditemukan'}</p></div><div className="api-matrix-actions"><button className="copy-link-button" onClick={() => copyText(openApiResults.map(item => `## ${item.method} ${item.path}\n\n- Summary: ${item.summary}\n- Operation ID: ${item.operationId || '—'}\n- Responses: ${item.responses}\n- Parameters: ${item.parameters || '—'}\n- Request body: ${item.requestBody ? 'Yes' : 'No'}\n- Security declared: ${item.security ? 'Yes' : 'No'}`).join('\n\n'))}><Copy size={14} /> {en ? 'Copy Markdown' : 'Salin Markdown'}</button><button className="copy-link-button" onClick={downloadOpenApiMatrix}><ArrowDownRight size={14} /> {en ? 'Export CSV' : 'Ekspor CSV'}</button></div></div><div className="openapi-summary-grid"><div><span>{en ? 'Operations' : 'Operasi'}</span><strong>{openApiResults.length}</strong></div><div><span>{en ? 'Errors' : 'Error'}</span><strong>{openApiIssues.filter(issue => issue.severity === 'error').length}</strong></div><div><span>{en ? 'Warnings' : 'Peringatan'}</span><strong>{openApiIssues.filter(issue => issue.severity === 'warning').length}</strong></div><div><span>{en ? 'Info' : 'Info'}</span><strong>{openApiIssues.filter(issue => issue.severity === 'info').length}</strong></div></div><section className="openapi-issues" aria-label={en ? 'Contract validation issues' : 'Temuan validasi kontrak'}><div className="openapi-issues-heading"><div><h3>{en ? 'Contract quality checks' : 'Pemeriksaan kualitas kontrak'}</h3><p>{en ? 'Static checks for response coverage, path parameters, request schemas, and operation metadata.' : 'Pemeriksaan statis untuk cakupan respons, parameter path, schema request, dan metadata operasi.'}</p></div><span className={openApiIssues.some(issue => issue.severity === 'error') ? 'openapi-quality-status has-errors' : openApiIssues.some(issue => issue.severity === 'warning') ? 'openapi-quality-status has-warnings' : 'openapi-quality-status'}>{openApiIssues.length} {en ? 'findings' : 'temuan'}</span></div>{openApiIssues.length ? <div className="openapi-issue-list">{openApiIssues.map((issue, index) => <article className={'openapi-issue issue-' + issue.severity} key={issue.method + issue.path + issue.code + index}><span className="openapi-issue-severity">{issue.severity.toUpperCase()}</span><div><strong>{issue.code}</strong><p>{issue.method} {issue.path} — {issue.message}</p></div></article>)}</div> : <p className="openapi-no-issues"><Check size={16} /> {en ? 'No issues found by the current static checks.' : 'Tidak ada temuan dari pemeriksaan statis saat ini.'}</p>}</section><div className="openapi-endpoint-list">{openApiResults.map((item, index) => <article className="openapi-endpoint" key={item.method + item.path + index}><div className="openapi-endpoint-top"><span className={'openapi-method method-' + item.method.toLowerCase()}>{item.method}</span><code>{item.path}</code></div><h4>{item.summary}</h4>{item.operationId && <p className="openapi-operation">{en ? 'Operation ID' : 'ID Operasi'}: <code>{item.operationId}</code></p>}<div className="openapi-meta"><span>{en ? 'Responses' : 'Respons'}: <strong>{item.responses}</strong></span><span>{en ? 'Body' : 'Body'}: <strong>{item.requestBody ? (en ? 'Yes' : 'Ya') : (en ? 'No' : 'Tidak')}</strong></span><span>{en ? 'Security' : 'Keamanan'}: <strong>{item.security ? (en ? 'Declared' : 'Dideklarasikan') : (en ? 'Not declared' : 'Tidak dideklarasikan')}</strong></span></div>{item.parameters && <p className="openapi-parameters">{en ? 'Parameters' : 'Parameter'}: {item.parameters}</p>}</article>)}</div></div>}
      </div>}
      {copyStatus && <p className="lab-copy-status" role="status">{copyStatus}</p>}
    </section>
    <p className="lab-disclaimer">{en ? 'Generated checklists are starting points, not a substitute for risk analysis, product requirements, or human review.' : 'Checklist yang dihasilkan adalah titik awal, bukan pengganti analisis risiko, kebutuhan produk, atau review manusia.'}</p>
  </main>
}
