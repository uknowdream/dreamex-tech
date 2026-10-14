import { useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Download, FileJson2, FileText, Filter, RotateCcw, ShieldCheck, Sparkles, Upload, XCircle } from 'lucide-react'
import { useLanguage } from './i18n'

type TestStatus = 'passed' | 'failed' | 'flaky' | 'skipped'
type TestRecord = { id: string; title: string; file: string; status: TestStatus; durationMs: number; error: string }
type ReportSummary = { id: string; importedAt: string; source: string; total: number; passed: number; failed: number; flaky: number; skipped: number; passRate: number; avgDurationMs: number | null }
type Report = { source: string; format: 'JUnit XML' | 'Playwright JSON' | 'Demo sample'; tests: TestRecord[]; importedAt: string }
const HISTORY_KEY = 'dreamex-quality-intelligence-history-v1'
const MAX_REPORT_BYTES = 10 * 1024 * 1024

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function asString(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback }
function asNumber(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function collectPlaywrightSuites(value: unknown, prefix: string, output: TestRecord[]) {
  const node = asRecord(value)
  if (!node) return
  const title = asString(node.title)
  const file = asString(node.file)
  const fullPrefix = [prefix, title].filter(Boolean).join(' › ')
  const specs = Array.isArray(node.specs) ? node.specs : []
  for (const rawSpec of specs) {
    const spec = asRecord(rawSpec)
    if (!spec) continue
    const specTitle = asString(spec.title, 'Untitled test')
    const specFile = asString(spec.file, file)
    const tests = Array.isArray(spec.tests) ? spec.tests : []
    for (const rawTest of tests) {
      const test = asRecord(rawTest)
      if (!test) continue
      const results = Array.isArray(test.results) ? test.results.map(asRecord).filter((item): item is Record<string, unknown> => item !== null) : []
      if (!results.length) {
        const status = asString(test.status)
        if (status === 'skipped' || status === 'expected') output.push({ id: specTitle + ':' + output.length, title: [fullPrefix, specTitle].filter(Boolean).join(' › '), file: specFile, status: 'skipped', durationMs: 0, error: '' })
        continue
      }
      const last = results[results.length - 1]
      const priorFailure = results.slice(0, -1).some(result => ['failed', 'timedOut', 'interrupted'].includes(asString(result.status)))
      const rawStatus = asString(last.status)
      const status: TestStatus = rawStatus === 'skipped' || rawStatus === 'interrupted' && results.length === 1
        ? 'skipped'
        : ['failed', 'timedOut', 'interrupted'].includes(rawStatus) ? 'failed'
          : rawStatus === 'passed' && priorFailure ? 'flaky'
            : 'passed'
      const errors = Array.isArray(last.errors) ? last.errors.map(asRecord).filter((item): item is Record<string, unknown> => item !== null) : []
      const error = errors.map(item => asString(item.message)).filter(Boolean).join('\n').slice(0, 3000)
      output.push({ id: [specFile, specTitle, output.length].join(':'), title: [fullPrefix, specTitle].filter(Boolean).join(' › '), file: specFile, status, durationMs: Math.max(0, asNumber(last.duration)), error })
    }
  }
  const suites = Array.isArray(node.suites) ? node.suites : []
  for (const suite of suites) collectPlaywrightSuites(suite, fullPrefix, output)
}
function parsePlaywrightJson(raw: string): TestRecord[] {
  const parsed: unknown = JSON.parse(raw)
  const root = asRecord(parsed)
  if (!root || !Array.isArray(root.suites)) throw new Error('The JSON file does not look like a Playwright JSON report with a suites array.')
  const tests: TestRecord[] = []
  for (const suite of root.suites) collectPlaywrightSuites(suite, '', tests)
  if (!tests.length) throw new Error('No tests were found. Ensure this is a full Playwright JSON report, not a summary-only report.')
  return tests
}
function parseJUnitXml(raw: string): TestRecord[] {
  const doc = new DOMParser().parseFromString(raw, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('The XML document is malformed.')
  const cases = Array.from(doc.getElementsByTagName('testcase'))
  if (!cases.length) throw new Error('No <testcase> elements were found in the JUnit XML report.')
  return cases.map((testCase, index) => {
    const failure = testCase.querySelector('failure, error')
    const skipped = testCase.querySelector('skipped')
    const status: TestStatus = failure ? 'failed' : skipped ? 'skipped' : 'passed'
    const seconds = Number(testCase.getAttribute('time') ?? 0)
    const title = [testCase.getAttribute('classname'), testCase.getAttribute('name')].filter(Boolean).join(' › ') || 'Untitled test'
    const error = failure ? [failure.getAttribute('message'), failure.textContent].filter(Boolean).join('\n').slice(0, 3000) : ''
    return { id: title + ':' + index, title, file: testCase.getAttribute('file') ?? '', status, durationMs: Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 0, error }
  })
}
function summarize(report: Report): ReportSummary {
  const total = report.tests.length
  const passed = report.tests.filter(test => test.status === 'passed').length
  const failed = report.tests.filter(test => test.status === 'failed').length
  const flaky = report.tests.filter(test => test.status === 'flaky').length
  const skipped = report.tests.filter(test => test.status === 'skipped').length
  const executed = total - skipped
  const avgDurationMs = executed ? Math.round(report.tests.filter(test => test.status !== 'skipped').reduce((sum, test) => sum + test.durationMs, 0) / executed) : 0
  return { id: report.importedAt + ':' + report.source, importedAt: report.importedAt, source: report.source, total, passed, failed, flaky, skipped, passRate: executed ? Math.round((passed + flaky) / executed * 1000) / 10 : 0, avgDurationMs }
}
function readHistory(): ReportSummary[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is ReportSummary => {
      const record = asRecord(item)
      return Boolean(record && typeof record.id === 'string' && typeof record.source === 'string' && typeof record.total === 'number' && typeof record.passRate === 'number')
    }).map(item => ({ ...item, avgDurationMs: typeof item.avgDurationMs === 'number' && Number.isFinite(item.avgDurationMs) ? item.avgDurationMs : null })).slice(0, 8)
  } catch { return [] }
}
function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
const demoTests: TestRecord[] = [
  { id: 'demo-1', title: 'auth › login with valid credentials', file: 'tests/auth.spec.ts', status: 'passed', durationMs: 428, error: '' },
  { id: 'demo-2', title: 'auth › rejects invalid password', file: 'tests/auth.spec.ts', status: 'passed', durationMs: 301, error: '' },
  { id: 'demo-3', title: 'checkout › submits order with valid address', file: 'tests/checkout.spec.ts', status: 'failed', durationMs: 2114, error: 'Expected status 201 but received 500\nUpstream service returned an unexpected error.' },
  { id: 'demo-4', title: 'catalog › renders product filters', file: 'tests/catalog.spec.ts', status: 'flaky', durationMs: 1640, error: 'Passed after a retry. Investigate timing and shared test state.' },
  { id: 'demo-5', title: 'payments › handles declined card', file: 'tests/payments.spec.ts', status: 'skipped', durationMs: 0, error: '' },
  { id: 'demo-6', title: 'checkout › preserves cart after refresh', file: 'tests/checkout.spec.ts', status: 'passed', durationMs: 740, error: '' },
]

export function QualityIntelligencePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [report, setReport] = useState<Report | null>(null)
  const [history, setHistory] = useState<ReportSummary[]>(readHistory)
  const [statusFilter, setStatusFilter] = useState<'all' | TestStatus>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [comparisonId, setComparisonId] = useState('')
  const summary = report ? summarize(report) : null
  const comparisonHistory = useMemo(() => history.filter(item => item.id !== summary?.id), [history, summary?.id])
  const comparison = comparisonHistory.find(item => item.id === comparisonId) ?? comparisonHistory[0] ?? null
  const passRateDelta = comparison && summary ? Math.round((summary.passRate - comparison.passRate) * 10) / 10 : null
  const durationDelta = comparison && summary && comparison.avgDurationMs !== null ? summary.avgDurationMs - comparison.avgDurationMs : null
  const visibleTests = useMemo(() => (report?.tests ?? []).filter(test => (statusFilter === 'all' || test.status === statusFilter) && [test.title, test.file, test.error].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [report, statusFilter, query])
  const failures = useMemo(() => {
    const groups = new Map<string, { fingerprint: string; count: number; examples: string[] }>()
    for (const test of report?.tests ?? []) {
      if (test.status !== 'failed' || !test.error) continue
      const fingerprint = test.error.split('\n').map(line => line.trim()).find(Boolean)?.slice(0, 140) ?? 'Unknown failure'
      const group = groups.get(fingerprint) ?? { fingerprint, count: 0, examples: [] }
      group.count += 1
      if (group.examples.length < 3) group.examples.push(test.title)
      groups.set(fingerprint, group)
    }
    return [...groups.values()].sort((a, b) => b.count - a.count)
  }, [report])

  const applyReport = (nextReport: Report, persist = true) => {
    setReport(nextReport)
    setComparisonId('')
    setStatusFilter('all')
    setQuery('')
    setError('')
    setNotice('')
    if (!persist) return
    const nextSummary = summarize(nextReport)
    const nextHistory = [nextSummary, ...readHistory()].filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index).slice(0, 8)
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory)); setHistory(nextHistory) } catch { setHistory(readHistory()); setNotice(en ? 'Report analyzed, but browser storage is unavailable; history was not saved.' : 'Laporan dianalisis, tetapi penyimpanan browser tidak tersedia; riwayat tidak disimpan.') }
  }

  const importReport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setNotice('')
    if (file.size > MAX_REPORT_BYTES) { setError(en ? 'Report is larger than 10 MB. Split it into smaller reports and retry.' : 'Laporan lebih besar dari 10 MB. Pisahkan menjadi laporan yang lebih kecil lalu coba lagi.'); return }
    setLoading(true)
    try {
      const raw = await file.text()
      const trimmed = raw.trim()
      if (!trimmed) throw new Error(en ? 'The selected file is empty.' : 'File yang dipilih kosong.')
      const isXml = trimmed.startsWith('<') || /\.xml$/i.test(file.name)
      const tests = isXml ? parseJUnitXml(raw) : parsePlaywrightJson(raw)
      applyReport({ source: file.name, format: isXml ? 'JUnit XML' : 'Playwright JSON', tests, importedAt: new Date().toISOString() })
      setNotice(en ? 'Report analyzed locally. No report content was uploaded.' : 'Laporan dianalisis secara lokal. Isi laporan tidak diunggah.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Unable to analyze this report.' : 'Tidak dapat menganalisis laporan ini.'))
    } finally { setLoading(false) }
  }

  const loadDemo = () => applyReport({ source: 'Demo sample — not production data', format: 'Demo sample', tests: demoTests, importedAt: new Date().toISOString() }, false)
  const exportJson = () => { if (report) downloadFile('dreamex-quality-report.json', JSON.stringify({ format: 'dreamex-quality-report', version: 1, summary, tests: report.tests }, null, 2), 'application/json;charset=utf-8') }
  const exportCsv = () => {
    if (!report) return
    const rows = [['Test', 'File', 'Status', 'Duration (ms)', 'Error'], ...report.tests.map(test => [test.title, test.file, test.status, String(test.durationMs), test.error])]
    const csv = rows.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\r\n')
    downloadFile('dreamex-quality-report.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8')
  }
  const exportMarkdown = () => {
    if (!report || !summary) return
    const md = ['# Quality Intelligence Report', '', '- Source: ' + report.source, '- Format: ' + report.format, '- Imported: ' + report.importedAt, '- Pass rate: ' + summary.passRate + '%', '- Passed: ' + summary.passed, '- Failed: ' + summary.failed, '- Flaky: ' + summary.flaky, '- Skipped: ' + summary.skipped, '', '## Failed tests', ...report.tests.filter(test => test.status === 'failed').map(test => '- **' + test.title + '** — ' + test.error.replaceAll('\n', ' ')), '', '## Flaky tests', ...report.tests.filter(test => test.status === 'flaky').map(test => '- ' + test.title), '', '_Report data was analyzed in the browser; this report is not a live CI integration._'].join('\n')
    downloadFile('dreamex-quality-report.md', md, 'text/markdown;charset=utf-8')
  }

  return <main id="main-content" className="container quality-intelligence-page">
    <header className="quality-intelligence-hero">
      <div><span className="section-kicker"><BarChart3 size={14} /> QUALITY ENGINEERING / REPORT INTELLIGENCE</span><h1>{en ? <>Turn test results into <span>clear signals.</span></> : <>Ubah hasil pengujian menjadi <span>sinyal yang jelas.</span></>}</h1><p>{en ? 'Import Playwright JSON or JUnit XML reports to inspect pass rates, retries, slow tests, repeated failures, and actionable evidence — entirely in your browser.' : 'Impor laporan Playwright JSON atau JUnit XML untuk meninjau pass rate, retry, test lambat, kegagalan berulang, dan bukti yang dapat ditindaklanjuti — seluruhnya di browser.'}</p><div className="quality-intelligence-trust"><ShieldCheck size={15} />{en ? 'Local-only analysis · report content is not uploaded · maximum 10 MB per file' : 'Analisis lokal · isi laporan tidak diunggah · maksimal 10 MB per file'}</div></div>
      <div className="quality-intelligence-import"><span className="quality-intelligence-import-icon"><Upload size={20} /></span><strong>{en ? 'Import a test report' : 'Impor laporan pengujian'}</strong><p>{en ? 'Playwright JSON or JUnit XML' : 'Playwright JSON atau JUnit XML'}</p><label className="button button-primary quality-intelligence-file-button"><Upload size={15} />{loading ? (en ? 'Analyzing…' : 'Menganalisis…') : (en ? 'Choose report file' : 'Pilih file laporan')}<input type="file" accept=".json,.xml,application/json,application/xml,text/xml" aria-label={en ? 'Choose Playwright JSON or JUnit XML report' : 'Pilih laporan Playwright JSON atau JUnit XML'} disabled={loading} onChange={event => void importReport(event)} /></label><button type="button" className="button button-secondary" onClick={loadDemo}><Sparkles size={15} />{en ? 'Explore demo report' : 'Lihat laporan demo'}</button></div>
    </header>
    {error && <p className="quality-intelligence-error" role="alert"><AlertTriangle size={16} />{error}</p>}
    {notice && <p className="quality-intelligence-notice" role="status">{notice}</p>}
    {report && summary ? <>
      <section className="quality-intelligence-summary" aria-label={en ? 'Report summary' : 'Ringkasan laporan'}>
        <div className="quality-intelligence-summary-heading"><div><span className="section-kicker">{en ? 'CURRENT REPORT' : 'LAPORAN SAAT INI'}</span><h2>{report.source}</h2><p>{report.format} · {summary.total} {en ? 'tests' : 'tes'} · {new Date(report.importedAt).toLocaleString(en ? 'en-US' : 'id-ID')}</p></div><div className="quality-intelligence-export"><button className="button button-secondary" onClick={exportJson}><FileJson2 size={15} /> JSON</button><button className="button button-secondary" onClick={exportCsv}><Download size={15} /> CSV</button><button className="button button-secondary" onClick={exportMarkdown}><FileText size={15} /> Markdown</button></div></div>
        <div className="quality-intelligence-metrics">
          <article><span><BarChart3 size={16} />{en ? 'Pass rate' : 'Pass rate'}</span><strong>{summary.passRate}%</strong><small>{en ? 'Passed + flaky / executed' : 'Passed + flaky / dijalankan'}</small></article>
          <article><span><CheckCircle2 size={16} />{en ? 'Passed' : 'Lulus'}</span><strong>{summary.passed}</strong><small>{en ? 'Clean first/final pass' : 'Lulus tanpa status flaky'}</small></article>
          <article><span><XCircle size={16} />{en ? 'Failed' : 'Gagal'}</span><strong>{summary.failed}</strong><small>{en ? 'Need investigation' : 'Perlu investigasi'}</small></article>
          <article><span><RotateCcw size={16} />{en ? 'Flaky' : 'Flaky'}</span><strong>{summary.flaky}</strong><small>{en ? 'Passed after a failed retry' : 'Lulus setelah retry gagal'}</small></article>
          <article><span><Clock3 size={16} />{en ? 'Slowest test' : 'Tes terlama'}</span><strong>{(Math.max(0, ...report.tests.map(test => test.durationMs)) / 1000).toFixed(2)}s</strong><small>{en ? 'Longest recorded test' : 'Durasi tes terpanjang'}</small></article>
        </div>
      </section>
      {comparisonHistory.length > 0 && comparison && <section className="quality-intelligence-comparison" aria-labelledby="quality-comparison-title">
        <div className="quality-intelligence-section-heading"><div><span className="section-kicker">{en ? 'SNAPSHOT COMPARISON' : 'PERBANDINGAN SNAPSHOT'}</span><h2 id="quality-comparison-title">{en ? 'Compare with a previous report' : 'Bandingkan dengan laporan sebelumnya'}</h2><p>{en ? 'Summary-only comparison; historical test-level records are not stored in this browser.' : 'Perbandingan ringkasan saja; detail test historis tidak disimpan di browser ini.'}</p></div>
          <label className="quality-comparison-select">{en ? 'Baseline snapshot' : 'Snapshot baseline'}<select aria-label={en ? 'Baseline snapshot' : 'Snapshot baseline'} value={comparisonId || comparison.id} onChange={event => setComparisonId(event.target.value)}>{comparisonHistory.map(item => <option key={item.id} value={item.id}>{item.source} — {new Date(item.importedAt).toLocaleString(en ? 'en-US' : 'id-ID')}</option>)}</select></label>
        </div>
        <div className="quality-comparison-metrics">
          <article><span>{en ? 'Pass-rate change' : 'Perubahan pass rate'}</span><strong className={passRateDelta !== null && passRateDelta < 0 ? 'is-negative' : 'is-positive'}>{passRateDelta === null ? '—' : (passRateDelta > 0 ? '+' : '') + passRateDelta + ' pp'}</strong><small>{en ? 'Current ' + summary.passRate + '% · baseline ' + comparison.passRate + '%' : 'Saat ini ' + summary.passRate + '% · baseline ' + comparison.passRate + '%'}</small></article>
          <article><span>{en ? 'Average duration change' : 'Perubahan durasi rata-rata'}</span><strong className={durationDelta !== null && durationDelta > 0 ? 'is-negative' : 'is-positive'}>{durationDelta === null ? (en ? 'Unavailable' : 'Tidak tersedia') : (durationDelta > 0 ? '+' : '') + (durationDelta / 1000).toFixed(2) + 's'}</strong><small>{en ? 'Current average ' + ((summary.avgDurationMs ?? 0) / 1000).toFixed(2) + 's · baseline ' + (comparison.avgDurationMs === null ? 'unavailable' : (comparison.avgDurationMs / 1000).toFixed(2) + 's') : 'Rata-rata saat ini ' + (summary.avgDurationMs / 1000).toFixed(2) + 's · baseline ' + (comparison.avgDurationMs === null ? 'tidak tersedia' : (comparison.avgDurationMs / 1000).toFixed(2) + 's')}</small></article>
          <article><span>{en ? 'Test-count change' : 'Perubahan jumlah tes'}</span><strong>{summary.total - comparison.total > 0 ? '+' : ''}{summary.total - comparison.total}</strong><small>{en ? 'Current ' + summary.total + ' · baseline ' + comparison.total : 'Saat ini ' + summary.total + ' · baseline ' + comparison.total}</small></article>
          <article><span>{en ? 'Failure change' : 'Perubahan kegagalan'}</span><strong className={summary.failed > comparison.failed ? 'is-negative' : 'is-positive'}>{summary.failed - comparison.failed > 0 ? '+' : ''}{summary.failed - comparison.failed}</strong><small>{en ? 'Current ' + summary.failed + ' · baseline ' + comparison.failed : 'Saat ini ' + summary.failed + ' · baseline ' + comparison.failed}</small></article>
        </div>
        <p className="quality-comparison-note"><ShieldCheck size={14}/>{en ? 'A lower pass rate or higher duration can be a signal, not a root-cause diagnosis. Reports may differ in suite composition, retries, environment, and sample size.' : 'Pass rate yang turun atau durasi yang naik merupakan sinyal, bukan diagnosis akar masalah. Laporan dapat berbeda dalam komposisi suite, retry, lingkungan, dan ukuran sampel.'}</p>
      </section>}
      <section className="quality-intelligence-tests">
        <div className="quality-intelligence-section-heading"><div><span className="section-kicker">{en ? 'TEST INVENTORY' : 'INVENTARIS TES'}</span><h2>{en ? 'Test-level evidence' : 'Bukti per test'}</h2><p>{en ? 'Filter the imported results and inspect individual failure messages.' : 'Filter hasil impor dan periksa pesan kegagalan setiap test.'}</p></div><span className="quality-intelligence-count">{visibleTests.length} / {report.tests.length}</span></div>
        <div className="quality-intelligence-filters"><label><Filter size={15} /><select aria-label={en ? 'Filter tests by status' : 'Filter test berdasarkan status'} value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">{en ? 'All statuses' : 'Semua status'}</option><option value="failed">{en ? 'Failed' : 'Gagal'}</option><option value="flaky">Flaky</option><option value="passed">{en ? 'Passed' : 'Lulus'}</option><option value="skipped">{en ? 'Skipped' : 'Dilewati'}</option></select></label><input type="search" aria-label={en ? 'Search test results' : 'Cari hasil tes'} placeholder={en ? 'Search title, file, or error…' : 'Cari judul, file, atau error…'} value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="quality-intelligence-table-wrap"><table className="quality-intelligence-table"><thead><tr><th>{en ? 'Test' : 'Test'}</th><th>{en ? 'Status' : 'Status'}</th><th>{en ? 'Duration' : 'Durasi'}</th></tr></thead><tbody>{visibleTests.map(test => <tr key={test.id}><td><strong>{test.title}</strong><small>{test.file || (en ? 'File path not provided' : 'Path file tidak tersedia')}</small>{test.error && <details><summary>{en ? 'View failure details' : 'Lihat detail kegagalan'}</summary><pre>{test.error}</pre></details>}</td><td><span className={'quality-intelligence-status status-' + test.status}>{test.status}</span></td><td>{test.durationMs >= 1000 ? (test.durationMs / 1000).toFixed(2) + 's' : Math.round(test.durationMs) + 'ms'}</td></tr>)}</tbody></table>{visibleTests.length === 0 && <p className="quality-intelligence-empty">{en ? 'No tests match these filters.' : 'Tidak ada tes yang cocok dengan filter.'}</p>}</div>
      </section>
      {failures.length > 0 && <section className="quality-intelligence-failures"><div className="quality-intelligence-section-heading"><div><span className="section-kicker">{en ? 'FAILURE CLUSTERS' : 'KELOMPOK KEGAGALAN'}</span><h2>{en ? 'Repeated failure signals' : 'Sinyal kegagalan berulang'}</h2><p>{en ? 'Grouped by the first non-empty error line. Treat these as triage hints, not root-cause proof.' : 'Dikelompokkan berdasarkan baris error pertama yang tidak kosong. Ini petunjuk triage, bukan bukti akar masalah.'}</p></div></div><div className="quality-intelligence-failure-grid">{failures.map(group => <article key={group.fingerprint}><span>{group.count} {en ? 'tests' : 'tes'}</span><h3>{group.fingerprint}</h3><ul>{group.examples.map(example => <li key={example}>{example}</li>)}</ul></article>)}</div></section>}
    </> : <section className="quality-intelligence-empty-state"><div><BarChart3 size={25} /><h2>{en ? 'Your test report, made actionable' : 'Laporan pengujian yang bisa ditindaklanjuti'}</h2><p>{en ? 'Import a real report or open the demo to explore the analysis. No report is sent to a server.' : 'Impor laporan nyata atau buka demo untuk melihat analisis. Tidak ada laporan yang dikirim ke server.'}</p></div><div className="quality-intelligence-empty-points"><span><CheckCircle2 size={15} />{en ? 'Pass rate and test duration' : 'Pass rate dan durasi tes'}</span><span><RotateCcw size={15} />{en ? 'Retry-based flaky test signals' : 'Sinyal flaky test berdasarkan retry'}</span><span><AlertTriangle size={15} />{en ? 'Failure clusters and evidence' : 'Kelompok kegagalan dan bukti'}</span><span><Download size={15} />{en ? 'JSON, CSV, and Markdown exports' : 'Ekspor JSON, CSV, dan Markdown'}</span></div></section>}
    {history.length > 0 && <section className="quality-intelligence-history"><div className="quality-intelligence-section-heading"><div><span className="section-kicker">{en ? 'LOCAL HISTORY' : 'RIWAYAT LOKAL'}</span><h2>{en ? 'Recent report snapshots' : 'Snapshot laporan terbaru'}</h2><p>{en ? 'Only summary metrics are stored in this browser; raw test cases are not saved.' : 'Hanya metrik ringkasan yang disimpan di browser ini; detail test mentah tidak disimpan.'}</p></div><button className="button button-secondary" onClick={() => { try { window.localStorage.removeItem(HISTORY_KEY); setHistory([]); setNotice(en ? 'Local report history cleared.' : 'Riwayat laporan lokal dihapus.') } catch { setNotice(en ? 'Unable to clear browser history.' : 'Tidak dapat menghapus riwayat browser.') } }}><XCircle size={15} />{en ? 'Clear history' : 'Hapus riwayat'}</button></div><div className="quality-intelligence-history-list">{history.map(item => <article key={item.id}><div><strong>{item.source}</strong><small>{new Date(item.importedAt).toLocaleString(en ? 'en-US' : 'id-ID')}</small></div><strong>{item.passRate}%</strong><span>{item.failed} {en ? 'failed' : 'gagal'} · {item.flaky} flaky · {item.total} {en ? 'tests' : 'tes'}</span></article>)}</div></section>}
    <p className="quality-intelligence-disclaimer"><ShieldCheck size={15} />{en ? 'This is a local report analyzer, not a live CI integration. Results depend on the imported report format and completeness; flaky detection is based on retries explicitly present in Playwright JSON.' : 'Ini analyzer laporan lokal, bukan integrasi CI live. Hasil bergantung pada format dan kelengkapan laporan impor; deteksi flaky berdasarkan retry yang tercatat eksplisit di Playwright JSON.'}</p>
  </main>
}
