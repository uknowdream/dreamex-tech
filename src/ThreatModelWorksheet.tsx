import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownToLine, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { useLanguage } from './i18n'

type ThreatCategory = 'Spoofing' | 'Tampering' | 'Repudiation' | 'Information disclosure' | 'Denial of service' | 'Elevation of privilege'
type ThreatStatus = 'planned' | 'mitigating' | 'accepted'
type Threat = { id: string; asset: string; boundary: string; category: ThreatCategory; scenario: string; impact: string; mitigation: string; owner: string; status: ThreatStatus; createdAt: string }
const KEY = 'dreamex-threat-model-v1'
const MAX_THREATS = 100
const categories: ThreatCategory[] = ['Spoofing', 'Tampering', 'Repudiation', 'Information disclosure', 'Denial of service', 'Elevation of privilege']
function readThreats(): Threat[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((item): item is Threat => Boolean(item && typeof item === 'object' &&
      typeof item.id === 'string' && typeof item.asset === 'string' &&
      typeof item.boundary === 'string' && categories.includes(item.category) &&
      typeof item.scenario === 'string' && typeof item.mitigation === 'string' &&
      ['planned', 'mitigating', 'accepted'].includes(item.status))).slice(0, MAX_THREATS)
  } catch { return [] }
}
export function ThreatModelWorksheet() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [threats, setThreats] = useState<Threat[]>(readThreats)
  const [asset, setAsset] = useState('')
  const [boundary, setBoundary] = useState('')
  const [category, setCategory] = useState<ThreatCategory>('Information disclosure')
  const [scenario, setScenario] = useState('')
  const [impact, setImpact] = useState('')
  const [mitigation, setMitigation] = useState('')
  const [owner, setOwner] = useState('')
  const [status, setStatus] = useState<ThreatStatus>('planned')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(threats)) }
    catch { setNotice(en ? 'Browser storage is unavailable; export a backup before leaving.' : 'Penyimpanan browser tidak tersedia; ekspor cadangan sebelum keluar.') }
  }, [threats, en])
  const addThreat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!asset.trim() || !boundary.trim() || !scenario.trim() || !mitigation.trim()) {
      setError(en ? 'Asset, trust boundary, threat scenario, and mitigation are required.' : 'Aset, trust boundary, skenario ancaman, dan mitigasi wajib diisi.')
      return
    }
    if (threats.length >= MAX_THREATS) {
      setError(en ? 'The worksheet is limited to 100 threat records. Export a backup first.' : 'Worksheet dibatasi 100 catatan ancaman. Ekspor cadangan terlebih dahulu.')
      return
    }
    const threat: Threat = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'threat-' + Date.now().toString(36),
      asset: asset.trim().slice(0, 160),
      boundary: boundary.trim().slice(0, 240),
      category,
      scenario: scenario.trim().slice(0, 1200),
      impact: impact.trim().slice(0, 800),
      mitigation: mitigation.trim().slice(0, 1200),
      owner: owner.trim().slice(0, 120),
      status,
      createdAt: new Date().toISOString(),
    }
    setThreats(old => [threat, ...old])
    setAsset(''); setBoundary(''); setScenario(''); setImpact(''); setMitigation(''); setOwner(''); setStatus('planned')
    setNotice(en ? 'Threat record saved locally. Review the model with the system owner; this is not an automated security assessment.' : 'Catatan ancaman disimpan lokal. Tinjau model dengan pemilik sistem; ini bukan penilaian keamanan otomatis.')
  }
  const exportModel = () => {
    const payload = {
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      provenance: 'User-authored threat-model worksheet; not independently validated.',
      method: 'STRIDE-inspired threat register',
      records: threats,
      limitations: [
        'Threats and mitigations are user-entered, not automatically discovered.',
        'This worksheet does not perform penetration testing, architecture discovery, or compliance certification.',
        'Risk ratings and mitigation effectiveness require review by responsible engineers and security owners.',
      ],
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-threat-model.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const removeThreat = (id: string) => setThreats(old => old.filter(item => item.id !== id))
  return <section className="threat-model-worksheet" aria-labelledby="threat-model-title">
    <header className="threat-model-heading"><div><span className="section-kicker"><ShieldAlert size={14}/> SECURITY ENGINEERING / THREAT MODEL</span><h2 id="threat-model-title">{en ? 'Threat model worksheet' : 'Worksheet threat model'}</h2><p>{en ? 'Record assets, trust boundaries, STRIDE-inspired scenarios, and mitigations before a release.' : 'Catat aset, trust boundary, skenario berbasis STRIDE, dan mitigasi sebelum rilis.'}</p></div><span className="threat-model-local"><ShieldCheck size={14}/>{en ? 'Local-only' : 'Lokal saja'}</span></header>
    <div className="threat-model-toolbar"><span>{threats.length}/{MAX_THREATS} {en ? 'threat records' : 'catatan ancaman'}</span><button type="button" className="button button-secondary" onClick={exportModel} disabled={!threats.length}><ArrowDownToLine size={15}/>{en ? 'Export threat model' : 'Ekspor threat model'}</button></div>
    <form className="threat-model-form" onSubmit={addThreat}>
      <label>{en ? 'Asset / component' : 'Aset / komponen'}<input value={asset} onChange={event => setAsset(event.target.value)} maxLength={160} required placeholder={en ? 'e.g. session cookie, API gateway' : 'mis. cookie sesi, API gateway'}/></label>
      <label>{en ? 'Trust boundary' : 'Trust boundary'}<input value={boundary} onChange={event => setBoundary(event.target.value)} maxLength={240} required placeholder={en ? 'e.g. browser to API gateway' : 'mis. browser ke API gateway'}/></label>
      <label>{en ? 'STRIDE category' : 'Kategori STRIDE'}<select value={category} onChange={event => setCategory(event.target.value as ThreatCategory)}>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>{en ? 'Status' : 'Status'}<select value={status} onChange={event => setStatus(event.target.value as ThreatStatus)}><option value="planned">{en ? 'Planned' : 'Direncanakan'}</option><option value="mitigating">{en ? 'Mitigating' : 'Dimitigasi'}</option><option value="accepted">{en ? 'Risk accepted' : 'Risiko diterima'}</option></select></label>
      <label className="threat-model-wide">{en ? 'Threat scenario' : 'Skenario ancaman'}<textarea value={scenario} onChange={event => setScenario(event.target.value)} rows={3} maxLength={1200} required placeholder={en ? 'Describe actor, precondition, action, and likely outcome.' : 'Jelaskan aktor, prasyarat, tindakan, dan dampak yang mungkin.'}/></label>
      <label>{en ? 'Potential impact' : 'Dampak potensial'}<textarea value={impact} onChange={event => setImpact(event.target.value)} rows={2} maxLength={800}/></label>
      <label>{en ? 'Mitigation / verification' : 'Mitigasi / verifikasi'}<textarea value={mitigation} onChange={event => setMitigation(event.target.value)} rows={3} maxLength={1200} required placeholder={en ? 'Control, test evidence, owner, and acceptance condition.' : 'Kontrol, bukti tes, PIC, dan kondisi penerimaan.'}/></label>
      <label className="threat-model-wide">{en ? 'Owner / reviewer (optional)' : 'PIC / reviewer (opsional)'}<input value={owner} onChange={event => setOwner(event.target.value)} maxLength={120}/></label>
      {error && <p className="threat-model-error" role="alert">{error}</p>}
      <button type="submit" className="button button-primary">{en ? 'Add threat record' : 'Tambah catatan ancaman'}</button>
    </form>
    {notice && <p className="threat-model-notice" role="status">{notice}</p>}
    {threats.length ? <div className="threat-model-records">{threats.map(threat => <article className="threat-model-record" key={threat.id}>
      <div className="threat-model-record-heading"><div><span>{threat.category}</span><h3>{threat.asset}</h3><small>{threat.boundary}</small></div><span className={'threat-model-status ' + threat.status}>{threat.status.toUpperCase()}</span></div>
      <p><strong>{en ? 'Threat:' : 'Ancaman:'}</strong> {threat.scenario}</p>
      {threat.impact && <p><strong>{en ? 'Impact:' : 'Dampak:'}</strong> {threat.impact}</p>}
      <p><strong>{en ? 'Mitigation:' : 'Mitigasi:'}</strong> {threat.mitigation}</p>
      {threat.owner && <small>{en ? 'Owner:' : 'PIC:'} {threat.owner}</small>}
      <button type="button" className="threat-model-delete" onClick={() => removeThreat(threat.id)} aria-label={(en ? 'Delete threat record ' : 'Hapus catatan ancaman ') + threat.asset}><Trash2 size={14}/>{en ? 'Delete' : 'Hapus'}</button>
    </article>)}</div> : <p className="threat-model-empty">{en ? 'No threats documented yet. Add the first scenario above.' : 'Belum ada ancaman yang didokumentasikan. Tambahkan skenario pertama di atas.'}</p>}
    <p className="threat-model-guardrail"><ShieldAlert size={14}/>{en ? 'This is a user-maintained planning aid, not an automated threat detector, penetration test, or certification. Validate assumptions, risk severity, and mitigations with the system owner and security reviewer.' : 'Ini alat perencanaan yang diisi pengguna, bukan pendeteksi ancaman otomatis, penetration test, atau sertifikasi. Validasi asumsi, tingkat risiko, dan mitigasi dengan pemilik sistem dan reviewer keamanan.'}</p>
  </section>
}
