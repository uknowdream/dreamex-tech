import { useState, type FormEvent } from 'react'
import { ArrowDownToLine, ExternalLink, FileCheck2, GitCommitHorizontal, ShieldAlert, Trash2 } from 'lucide-react'
import { useLanguage } from './i18n'

type Environment = 'preview' | 'production'
type EvidenceRecord = {
  id: string
  createdAt: string
  releaseName: string
  sourceSha: string
  environment: Environment
  deploymentUrl: string
  ciRunIds: string[]
  testEvidence: string
  risks: string
  rollbackPlan: string
  verificationStatus: 'manual-unverified'
}
const STORAGE_KEY = 'dreamex-release-evidence-v1'
const MAX_RECORDS = 50
function readRecords(): EvidenceRecord[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((item): item is EvidenceRecord => Boolean(item && typeof item === 'object' &&
      typeof item.id === 'string' && typeof item.releaseName === 'string' &&
      typeof item.sourceSha === 'string' && typeof item.deploymentUrl === 'string' &&
      Array.isArray(item.ciRunIds) && typeof item.rollbackPlan === 'string' &&
      item.verificationStatus === 'manual-unverified')).slice(0, MAX_RECORDS)
  } catch { return [] }
}
function downloadEvidence(records: EvidenceRecord[]) {
  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    source: 'user-entered local release evidence',
    records,
    limitations: [
      'Records and links are user-entered and have not been independently verified.',
      'The source SHA format is checked only; this tool does not confirm repository membership.',
      'Deployment URLs are checked for HTTPS syntax only; no HTTP request is made.',
      'CI run IDs and test evidence references are not fetched or authenticated.',
      'Use a separate controlled release process to verify approvals, test results, production state, and rollback readiness.',
    ],
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'dreamex-release-evidence.json'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function ReleaseEvidenceRegister() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [records, setRecords] = useState<EvidenceRecord[]>(readRecords)
  const [releaseName, setReleaseName] = useState('')
  const [sourceSha, setSourceSha] = useState('')
  const [environment, setEnvironment] = useState<Environment>('preview')
  const [deploymentUrl, setDeploymentUrl] = useState('')
  const [ciRunIds, setCiRunIds] = useState('')
  const [testEvidence, setTestEvidence] = useState('')
  const [risks, setRisks] = useState('')
  const [rollbackPlan, setRollbackPlan] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const persist = (next: EvidenceRecord[]) => {
    setRecords(next)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }
    catch { setNotice(en ? 'Updated in memory, but browser storage is unavailable. Export a backup.' : 'Diperbarui di memori, tetapi penyimpanan browser tidak tersedia. Ekspor cadangan.') }
  }
  const addRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!/^[a-f0-9]{7,40}$/i.test(sourceSha.trim())) {
      setError(en ? 'Source SHA must be 7–40 hexadecimal characters.' : 'Source SHA harus terdiri dari 7–40 karakter heksadesimal.')
      return
    }
    let parsedUrl: URL
    try { parsedUrl = new URL(deploymentUrl.trim()) } catch {
      setError(en ? 'Enter a valid HTTPS deployment URL.' : 'Masukkan URL deployment HTTPS yang valid.')
      return
    }
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      setError(en ? 'Deployment URL must use HTTPS and must not contain credentials.' : 'URL deployment harus menggunakan HTTPS dan tidak boleh memuat kredensial.')
      return
    }
    const runIds = ciRunIds.split(/[\n,;]/).map(value => value.trim()).filter(Boolean)
    if (runIds.length > 12 || runIds.some(value => value.length > 120 || !/^[a-zA-Z0-9._:-]+$/.test(value))) {
      setError(en ? 'Use up to 12 CI run identifiers; each may contain letters, numbers, dots, underscores, colons, or hyphens.' : 'Gunakan maksimal 12 ID CI; setiap ID hanya boleh berisi huruf, angka, titik, garis bawah, titik dua, atau tanda hubung.')
      return
    }
    if (records.length >= MAX_RECORDS) {
      setError(en ? 'The register is limited to 50 records. Export a backup and remove an older record.' : 'Register dibatasi 50 catatan. Ekspor cadangan dan hapus catatan lama.')
      return
    }
    const record: EvidenceRecord = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'release-' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      releaseName: releaseName.trim().slice(0, 120),
      sourceSha: sourceSha.trim().toLowerCase(),
      environment,
      deploymentUrl: parsedUrl.toString(),
      ciRunIds: runIds,
      testEvidence: testEvidence.trim().slice(0, 2000),
      risks: risks.trim().slice(0, 2000),
      rollbackPlan: rollbackPlan.trim().slice(0, 2000),
      verificationStatus: 'manual-unverified',
    }
    persist([record, ...records])
    setReleaseName(''); setSourceSha(''); setDeploymentUrl(''); setCiRunIds(''); setTestEvidence(''); setRisks(''); setRollbackPlan('')
    setNotice(en ? 'Evidence record saved locally. It remains unverified until checked independently.' : 'Catatan evidence tersimpan lokal. Status tetap belum diverifikasi sampai diperiksa secara independen.')
  }
  const removeRecord = (id: string) => persist(records.filter(record => record.id !== id))
  return <section className="release-evidence-register" aria-labelledby="release-evidence-title">
    <header className="release-evidence-heading"><div><span className="section-kicker"><GitCommitHorizontal size={14}/> RELEASE GOVERNANCE / EVIDENCE</span><h2 id="release-evidence-title">{en ? 'Release evidence register' : 'Register evidence rilis'}</h2><p>{en ? 'Capture the commit, deployment target, CI runs, test evidence, risks, and rollback plan in a portable release record.' : 'Catat commit, target deployment, CI run, bukti tes, risiko, dan rencana rollback dalam satu catatan rilis portabel.'}</p></div><span className="release-evidence-local"><ShieldAlert size={14}/>{en ? 'Local-only' : 'Lokal saja'}</span></header>
    <div className="release-evidence-toolbar"><span>{records.length}/{MAX_RECORDS} {en ? 'records' : 'catatan'} · {en ? 'manually entered' : 'diisi manual'}</span><button type="button" className="button button-secondary" onClick={() => downloadEvidence(records)} disabled={!records.length}><ArrowDownToLine size={15}/>{en ? 'Export evidence' : 'Ekspor evidence'}</button></div>
    <form className="release-evidence-form" onSubmit={addRecord}>
      <label>{en ? 'Release / candidate name' : 'Nama rilis / kandidat'}<input value={releaseName} onChange={event => setReleaseName(event.target.value)} maxLength={120} required placeholder={en ? 'e.g. 2026.10.14-rc1' : 'mis. 2026.10.14-rc1'}/></label>
      <label>{en ? 'Source commit SHA' : 'SHA commit sumber'}<input value={sourceSha} onChange={event => setSourceSha(event.target.value)} maxLength={40} required aria-label={en ? 'Source commit SHA' : 'SHA commit sumber'} placeholder="40-character Git SHA"/></label>
      <label>{en ? 'Environment' : 'Lingkungan'}<select value={environment} onChange={event => setEnvironment(event.target.value as Environment)}><option value="preview">Preview</option><option value="production">Production</option></select></label>
      <label>{en ? 'Deployment URL (HTTPS)' : 'URL deployment (HTTPS)'}<input type="url" value={deploymentUrl} onChange={event => setDeploymentUrl(event.target.value)} required placeholder="https://deployment.example.com"/></label>
      <label>{en ? 'CI run IDs (comma or newline separated)' : 'ID CI run (pisahkan koma atau baris baru)'}<textarea value={ciRunIds} onChange={event => setCiRunIds(event.target.value)} rows={2} maxLength={1600} placeholder="38500000000, 38500000001"/></label>
      <label>{en ? 'Test evidence / report references' : 'Referensi bukti tes / laporan'}<textarea value={testEvidence} onChange={event => setTestEvidence(event.target.value)} rows={2} maxLength={2000} placeholder={en ? 'Playwright report URL, accessibility notes…' : 'URL laporan Playwright, catatan aksesibilitas…'}/></label>
      <label>{en ? 'Known risks / exceptions' : 'Risiko / pengecualian yang diketahui'}<textarea value={risks} onChange={event => setRisks(event.target.value)} rows={2} maxLength={2000}/></label>
      <label className="release-evidence-wide">{en ? 'Rollback plan and owner' : 'Rencana rollback dan PIC'}<textarea value={rollbackPlan} onChange={event => setRollbackPlan(event.target.value)} rows={3} maxLength={2000} required placeholder={en ? 'Rollback trigger, prior deployment, owner, and verification steps…' : 'Pemicu rollback, deployment sebelumnya, PIC, dan langkah verifikasi…'}/></label>
      {error && <p className="release-evidence-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit"><FileCheck2 size={15}/>{en ? 'Save release record' : 'Simpan catatan rilis'}</button>
    </form>
    {notice && <p className="release-evidence-notice" role="status">{notice}</p>}
    {records.length > 0 ? <div className="release-evidence-records">{records.map(record => <article className="release-evidence-record" key={record.id}>
      <div className="release-evidence-record-heading"><div><span className="release-evidence-sha">{record.sourceSha.slice(0, 12)}</span><h3>{record.releaseName}</h3><p>{record.environment.toUpperCase()} · {new Date(record.createdAt).toLocaleString(en ? 'en-US' : 'id-ID')}</p></div><span className="release-evidence-unverified">{en ? 'MANUAL · NOT VERIFIED' : 'MANUAL · BELUM DIVERIFIKASI'}</span></div>
      <a className="release-evidence-url" href={record.deploymentUrl} target="_blank" rel="noreferrer">{record.deploymentUrl}<ExternalLink size={13}/></a>
      <div className="release-evidence-facts"><span>{record.ciRunIds.length} {en ? 'CI run IDs' : 'ID CI run'}</span><span>{en ? 'Rollback plan' : 'Rencana rollback'}: {record.rollbackPlan}</span></div>
      {record.testEvidence && <p><strong>{en ? 'Test evidence:' : 'Bukti tes:'}</strong> {record.testEvidence}</p>}
      {record.risks && <p><strong>{en ? 'Known risks:' : 'Risiko:'}</strong> {record.risks}</p>}
      <button type="button" className="release-evidence-delete" onClick={() => removeRecord(record.id)} aria-label={(en ? 'Delete release record ' : 'Hapus catatan rilis ') + record.releaseName}><Trash2 size={14}/>{en ? 'Delete record' : 'Hapus catatan'}</button>
    </article>)}</div> : <p className="release-evidence-empty">{en ? 'No release records yet. Add a candidate above; nothing is verified automatically.' : 'Belum ada catatan rilis. Tambahkan kandidat di atas; tidak ada yang diverifikasi otomatis.'}</p>}
    <p className="release-evidence-guardrail"><ShieldAlert size={14}/>{en ? 'Local register only. URLs are syntax-checked but never fetched; SHA format is checked but not resolved against Git; CI IDs and test evidence are not authenticated. Export is a record, not a release approval.' : 'Register lokal saja. URL diperiksa formatnya tetapi tidak diakses; format SHA diperiksa tetapi tidak dicocokkan ke Git; ID CI dan bukti tes tidak diautentikasi. Ekspor adalah catatan, bukan persetujuan rilis.'}</p>
  </section>
}
