import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, GitCompareArrows, ShieldCheck } from 'lucide-react'
import { useLanguage } from './i18n'
import './ReleaseEvidencePanel.css'

type Candidate = { commit: string; previewUrl: string; productionUrl: string; testRun: string; observedAt: string }
type EvidenceState = { baseline: Candidate; candidate: Candidate; rollbackPlan: string; knownRisks: string; releaseNotes: string }
const KEY = 'dreamex-release-evidence-v1'
const emptyCandidate = (): Candidate => ({ commit: '', previewUrl: '', productionUrl: '', testRun: '', observedAt: '' })
const initial: EvidenceState = { baseline: emptyCandidate(), candidate: emptyCandidate(), rollbackPlan: '', knownRisks: '', releaseNotes: '' }
function readState(): EvidenceState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return initial
    const value = raw as Partial<EvidenceState>
    const candidate = (entry: unknown): Candidate => {
      if (!entry || typeof entry !== 'object') return emptyCandidate()
      const item = entry as Partial<Candidate>
      return { commit: typeof item.commit === 'string' ? item.commit.slice(0, 160) : '', previewUrl: typeof item.previewUrl === 'string' ? item.previewUrl.slice(0, 500) : '', productionUrl: typeof item.productionUrl === 'string' ? item.productionUrl.slice(0, 500) : '', testRun: typeof item.testRun === 'string' ? item.testRun.slice(0, 500) : '', observedAt: typeof item.observedAt === 'string' ? item.observedAt.slice(0, 80) : '' }
    }
    return { baseline: candidate(value.baseline), candidate: candidate(value.candidate), rollbackPlan: typeof value.rollbackPlan === 'string' ? value.rollbackPlan.slice(0, 4000) : '', knownRisks: typeof value.knownRisks === 'string' ? value.knownRisks.slice(0, 4000) : '', releaseNotes: typeof value.releaseNotes === 'string' ? value.releaseNotes.slice(0, 4000) : '' }
  } catch { return initial }
}
function validUrl(value: string) {
  if (!value.trim()) return true
  try { const url = new URL(value); return url.protocol === 'https:' } catch { return false }
}
function safeCandidate(value: Candidate): Candidate {
  return { ...value, commit: value.commit.trim().slice(0, 160), previewUrl: value.previewUrl.trim(), productionUrl: value.productionUrl.trim(), testRun: value.testRun.trim(), observedAt: value.observedAt.trim() }
}

export function ReleaseEvidencePanel() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [state, setState] = useState<EvidenceState>(readState)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) }
    catch { setNotice(en ? 'Browser storage is unavailable. Export a backup before leaving.' : 'Penyimpanan browser tidak tersedia. Ekspor cadangan sebelum keluar.') }
  }, [state, en])
  const issues = useMemo(() => {
    const out: string[] = []
    for (const [name, value] of [['baseline preview', state.baseline.previewUrl], ['baseline production', state.baseline.productionUrl], ['baseline test evidence', state.baseline.testRun], ['candidate preview', state.candidate.previewUrl], ['candidate production', state.candidate.productionUrl], ['candidate test evidence', state.candidate.testRun]] as const) {
      if (value.trim() && !validUrl(value)) out.push(name)
    }
    return out
  }, [state])
  const filled = (value: Candidate) => [value.commit, value.previewUrl, value.productionUrl, value.testRun, value.observedAt].filter(x => x.trim()).length
  const compare = [
    { key: 'commit', label: en ? 'Source commit' : 'Commit sumber' },
    { key: 'previewUrl', label: en ? 'Preview URL' : 'URL preview' },
    { key: 'productionUrl', label: en ? 'Production URL' : 'URL produksi' },
    { key: 'testRun', label: en ? 'Test evidence URL' : 'URL bukti pengujian' },
  ] as const
  const update = (which: 'baseline' | 'candidate', field: keyof Candidate, value: string) => setState(old => ({ ...old, [which]: { ...old[which], [field]: value.slice(0, field === 'commit' ? 160 : 500) } }))
  const exportEvidence = () => {
    if (issues.length) { setNotice(en ? 'Fix invalid URLs before exporting. Only HTTPS URLs are accepted.' : 'Perbaiki URL yang tidak valid sebelum ekspor. Hanya URL HTTPS yang diterima.'); return }
    const evidence = {
      schemaVersion: '1.0',
      manifest: { tool: 'DreamEx Release Evidence', toolVersion: '1.0', exportedAt: new Date().toISOString(), provenance: 'User-entered deployment and test references; not independently verified.' },
      baseline: safeCandidate(state.baseline),
      candidate: safeCandidate(state.candidate),
      comparison: compare.map(item => ({ field: item.key, changed: state.baseline[item.key].trim() !== state.candidate[item.key].trim(), baseline: state.baseline[item.key].trim() || null, candidate: state.candidate[item.key].trim() || null })),
      releaseNotes: state.releaseNotes.trim(),
      knownRisks: state.knownRisks.trim(),
      rollbackPlan: state.rollbackPlan.trim(),
      limitations: ['Deployment and test references are manually supplied and are not verified by this browser-only tool.', 'An empty field means evidence was not provided, not that the check passed.', 'This package does not execute deployment checks, query CI providers, or certify release readiness.'],
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-release-evidence.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(en ? 'Release evidence package exported. References remain unverified.' : 'Paket bukti rilis diekspor. Referensi belum diverifikasi.')
  }
  const candidate = state.candidate
  const complete = filled(candidate)
  return <section className="release-evidence-panel" aria-labelledby="release-evidence-title">
    <header className="release-evidence-heading">
      <div><span className="section-kicker"><GitCompareArrows size={14}/> RELEASE ENGINEERING / EVIDENCE</span><h3 id="release-evidence-title">{en ? 'Deployment comparison & evidence' : 'Perbandingan deployment & bukti'}</h3><p>{en ? 'Record a baseline and release candidate with commit, deployment, test, and rollback references.' : 'Catat baseline dan kandidat rilis beserta commit, deployment, pengujian, dan referensi rollback.'}</p></div>
      <span className="release-evidence-count">{complete}/5 {en ? 'candidate fields' : 'field kandidat'}</span>
    </header>
    <div className="release-evidence-candidates">
      {(['baseline', 'candidate'] as const).map(which => <div className="release-evidence-card" key={which}>
        <span className="release-evidence-overline">{which === 'baseline' ? (en ? '01 / BASELINE' : '01 / BASELINE') : (en ? '02 / RELEASE CANDIDATE' : '02 / KANDIDAT RILIS')}</span>
        <label>{en ? 'Source commit / SHA' : 'Commit sumber / SHA'}<input value={state[which].commit} onChange={event => update(which, 'commit', event.target.value)} maxLength={160} placeholder="e.g. a1b2c3d"/></label>
        <label>{en ? 'Preview deployment URL (HTTPS)' : 'URL deployment preview (HTTPS)'}<input type="url" value={state[which].previewUrl} onChange={event => update(which, 'previewUrl', event.target.value)} maxLength={500} placeholder="https://preview.example.com"/></label>
        <label>{en ? 'Production URL (HTTPS)' : 'URL produksi (HTTPS)'}<input type="url" value={state[which].productionUrl} onChange={event => update(which, 'productionUrl', event.target.value)} maxLength={500} placeholder="https://www.example.com"/></label>
        <label>{en ? 'Test run / evidence URL (HTTPS)' : 'URL test run / bukti (HTTPS)'}<input type="url" value={state[which].testRun} onChange={event => update(which, 'testRun', event.target.value)} maxLength={500} placeholder="https://github.com/.../actions/runs/..."/></label>
        <label>{en ? 'Observed timestamp (ISO 8601)' : 'Waktu observasi (ISO 8601)'}<input value={state[which].observedAt} onChange={event => update(which, 'observedAt', event.target.value)} maxLength={80} placeholder="2026-10-14T12:00:00Z"/></label>
      </div>)}
    </div>
    <div className="release-evidence-diff">
      <h4>{en ? 'Comparison' : 'Perbandingan'}</h4>
      <div className="release-evidence-diff-table">
        {compare.map(item => <div key={item.key}><span>{item.label}</span><strong>{!state.baseline[item.key].trim() && !state.candidate[item.key].trim() ? (en ? 'Not supplied' : 'Belum diisi') : state.baseline[item.key].trim() === state.candidate[item.key].trim() ? (en ? 'Same / not changed' : 'Sama / tidak berubah') : (en ? 'Different / needs review' : 'Berbeda / perlu ditinjau')}</strong></div>)}
      </div>
    </div>
    <div className="release-evidence-notes">
      <label>{en ? 'Rollback and recovery plan' : 'Rencana rollback dan pemulihan'}<textarea value={state.rollbackPlan} onChange={event => setState(old => ({ ...old, rollbackPlan: event.target.value.slice(0, 4000) }))} maxLength={4000} rows={3} placeholder={en ? 'Previous known-good commit, rollback owner, recovery steps…' : 'Commit stabil sebelumnya, penanggung jawab rollback, langkah pemulihan…'}/></label>
      <label>{en ? 'Known risks and exceptions' : 'Risiko dan pengecualian yang diketahui'}<textarea value={state.knownRisks} onChange={event => setState(old => ({ ...old, knownRisks: event.target.value.slice(0, 4000) }))} maxLength={4000} rows={3} placeholder={en ? 'Open defects, accepted risks, outstanding reviews…' : 'Defect terbuka, risiko yang diterima, review tertunda…'}/></label>
      <label>{en ? 'Release notes / change summary' : 'Catatan rilis / ringkasan perubahan'}<textarea value={state.releaseNotes} onChange={event => setState(old => ({ ...old, releaseNotes: event.target.value.slice(0, 4000) }))} maxLength={4000} rows={3} placeholder={en ? 'Scope, migrations, compatibility notes…' : 'Cakupan, migrasi, catatan kompatibilitas…'}/></label>
    </div>
    {issues.length > 0 && <p className="release-evidence-error" role="alert">{en ? 'Invalid HTTPS URL fields (only HTTPS URLs are accepted): ' : 'Field URL HTTPS tidak valid (hanya URL HTTPS yang diterima): '}{issues.join(', ')}</p>}
    {notice && <p className="release-evidence-notice" role="status">{notice}</p>}
    <div className="release-evidence-footer"><p><ShieldCheck size={14}/>{en ? 'Manual evidence only. URLs, commits, timestamps, and test runs are not fetched or verified; this package is not a release certification.' : 'Bukti manual saja. URL, commit, waktu, dan test run tidak diambil atau diverifikasi; paket ini bukan sertifikasi rilis.'}</p><button type="button" className="button button-secondary" onClick={exportEvidence} disabled={issues.length > 0}><ArrowDownToLine size={15}/>{en ? 'Export evidence package' : 'Ekspor paket bukti'}</button></div>
  </section>
}
