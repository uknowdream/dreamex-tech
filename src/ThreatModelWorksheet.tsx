import { useEffect, useState } from 'react'
import { ArrowDownToLine, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useLanguage } from './i18n'
import './ThreatModelWorksheet.css'

type Threat = { id: string; asset: string; boundary: string; threat: string; mitigation: string; severity: 'critical' | 'high' | 'medium' | 'low'; status: 'open' | 'planned' | 'mitigated' | 'accepted' }
const KEY = 'dreamex-threat-model-v1'
const MAX_ROWS = 100
const examples: Threat[] = [
  { id: 'example-1', asset: 'User session and account', boundary: 'Browser → application API', threat: 'Session token theft through XSS or unsafe token storage', mitigation: 'Use HttpOnly Secure SameSite cookies where applicable, encode output, apply CSP, and test session rotation.', severity: 'high', status: 'planned' },
  { id: 'example-2', asset: 'Imported JSON / XML files', boundary: 'Untrusted file → browser parser', threat: 'Oversized or malformed input causes resource exhaustion', mitigation: 'Enforce size and depth limits, validate shape, avoid executing content, and test malformed inputs.', severity: 'medium', status: 'planned' },
  { id: 'example-3', asset: 'Release evidence and CI references', boundary: 'User input → exported report', threat: 'Untrusted references are mistaken for verified release evidence', mitigation: 'Label provenance, escape rendered content, and require independent verification before release.', severity: 'medium', status: 'open' },
]
function readRows(): Threat[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is Threat => Boolean(x && typeof x === 'object' && typeof x.id === 'string' && typeof x.asset === 'string' && typeof x.boundary === 'string' && typeof x.threat === 'string' && typeof x.mitigation === 'string' && ['critical','high','medium','low'].includes(x.severity) && ['open','planned','mitigated','accepted'].includes(x.status))).slice(0, MAX_ROWS)
  } catch { return [] }
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function ThreatModelWorksheet() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [rows, setRows] = useState<Threat[]>(readRows)
  const [asset, setAsset] = useState('')
  const [boundary, setBoundary] = useState('')
  const [threat, setThreat] = useState('')
  const [mitigation, setMitigation] = useState('')
  const [severity, setSeverity] = useState<Threat['severity']>('medium')
  const [status, setStatus] = useState<Threat['status']>('open')
  const [notice, setNotice] = useState('')
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { setNotice(en ? 'Browser storage is unavailable. Export a backup before leaving.' : 'Penyimpanan browser tidak tersedia. Ekspor cadangan sebelum keluar.') } }, [rows, en])
  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (rows.length >= MAX_ROWS) { setNotice(en ? 'The worksheet is limited to 100 threats. Export a backup before removing rows.' : 'Worksheet dibatasi 100 ancaman. Ekspor cadangan sebelum menghapus baris.'); return }
    const row: Threat = { id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'threat-' + Date.now(), asset: asset.trim().slice(0, 160), boundary: boundary.trim().slice(0, 240), threat: threat.trim().slice(0, 800), mitigation: mitigation.trim().slice(0, 1200), severity, status }
    setRows(current => [row, ...current]); setAsset(''); setBoundary(''); setThreat(''); setMitigation(''); setSeverity('medium'); setStatus('open'); setNotice(en ? 'Threat added. Risk and mitigation status are user-assessed, not independently verified.' : 'Ancaman ditambahkan. Risiko dan status mitigasi dinilai pengguna, bukan diverifikasi independen.')
  }
  const loadExamples = () => { setRows(current => [...examples.map(x => ({ ...x, id: (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now())) + x.id })), ...current].slice(0, MAX_ROWS)); setNotice(en ? 'Example threats added; review and tailor them to your architecture.' : 'Contoh ancaman ditambahkan; tinjau dan sesuaikan dengan arsitektur Anda.') }
  const exportReport = () => download('dreamex-threat-model.json', { schemaVersion: '1.0', manifest: { tool: 'DreamEx Threat Model Worksheet', toolVersion: '1.0', exportedAt: new Date().toISOString(), provenance: 'User-authored threat hypotheses and mitigations; not independently verified.' }, items: rows, summary: { total: rows.length, open: rows.filter(x => x.status === 'open').length, highOrCritical: rows.filter(x => x.severity === 'high' || x.severity === 'critical').length, mitigated: rows.filter(x => x.status === 'mitigated').length }, limitations: ['This is a lightweight threat-modeling aid, not a penetration test or security certification.', 'Threat completeness depends on user-supplied architecture context.', 'Validate mitigations and residual risk with a qualified reviewer.'] })
  const remove = (id: string) => setRows(current => current.filter(row => row.id !== id))
  const statusLabel = (value: Threat['status']) => ({ open: en ? 'Open' : 'Terbuka', planned: en ? 'Planned' : 'Direncanakan', mitigated: en ? 'Mitigated' : 'Dimitigasi', accepted: en ? 'Accepted risk' : 'Risiko diterima' })[value]
  return <section className="threat-model" aria-labelledby="threat-model-title">
    <header className="threat-model-heading"><div><span className="section-kicker"><ShieldCheck size={14}/> SECURITY ENGINEERING / THREAT MODEL</span><h2 id="threat-model-title">{en ? 'Threat model worksheet' : 'Worksheet threat model'}</h2><p>{en ? 'Map assets, trust boundaries, threats, and mitigations. Use STRIDE as a prompt, not a guarantee of completeness.' : 'Petakan aset, batas kepercayaan, ancaman, dan mitigasi. Gunakan STRIDE sebagai panduan, bukan jaminan kelengkapan.'}</p></div><span className="threat-model-local">{en ? 'Local-only' : 'Lokal saja'}</span></header>
    <div className="threat-model-toolbar"><div><strong>{rows.length}</strong><span>{en ? ' threat records' : ' catatan ancaman'}</span><small>{rows.filter(x => x.severity === 'high' || x.severity === 'critical').length} {en ? 'high / critical' : 'tinggi / kritis'} · {rows.filter(x => x.status === 'mitigated').length} {en ? 'mitigated' : 'dimitigasi'}</small></div><div><button type="button" className="button button-secondary" onClick={loadExamples}><Plus size={14}/>{en ? 'Load examples' : 'Muat contoh'}</button><button type="button" className="button button-secondary" onClick={exportReport}><ArrowDownToLine size={14}/>{en ? 'Export JSON' : 'Ekspor JSON'}</button></div></div>
    <form className="threat-model-form" onSubmit={add}>
      <label>{en ? 'Asset / data / capability' : 'Aset / data / kapabilitas'}<input value={asset} onChange={e=>setAsset(e.target.value)} maxLength={160} required placeholder={en ? 'e.g. Customer profile data' : 'mis. Data profil pelanggan'}/></label>
      <label>{en ? 'Trust boundary / data flow' : 'Batas kepercayaan / alur data'}<input value={boundary} onChange={e=>setBoundary(e.target.value)} maxLength={240} required placeholder={en ? 'e.g. Browser → API → database' : 'mis. Browser → API → database'}/></label>
      <label className="threat-model-wide">{en ? 'Threat hypothesis (what could go wrong?)' : 'Hipotesis ancaman (apa yang bisa salah?)'}<textarea value={threat} onChange={e=>setThreat(e.target.value)} maxLength={800} required rows={2}/></label>
      <label className="threat-model-wide">{en ? 'Mitigation / detection / recovery' : 'Mitigasi / deteksi / pemulihan'}<textarea value={mitigation} onChange={e=>setMitigation(e.target.value)} maxLength={1200} required rows={2}/></label>
      <label>{en ? 'Severity (initial assessment)' : 'Keparahan (penilaian awal)'}<select value={severity} onChange={e=>setSeverity(e.target.value as Threat['severity'])}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label>{en ? 'Mitigation status' : 'Status mitigasi'}<select value={status} onChange={e=>setStatus(e.target.value as Threat['status'])}><option value="open">{en ? 'Open' : 'Terbuka'}</option><option value="planned">{en ? 'Planned' : 'Direncanakan'}</option><option value="mitigated">{en ? 'Mitigated' : 'Dimitigasi'}</option><option value="accepted">{en ? 'Accepted risk' : 'Risiko diterima'}</option></select></label>
      <button className="button button-primary" type="submit"><Plus size={15}/>{en ? 'Add threat' : 'Tambah ancaman'}</button>
    </form>
    {notice && <p className="threat-model-notice" role="status">{notice}</p>}
    <div className="threat-model-list">{rows.map(row=><article key={row.id} className="threat-model-row"><div className="threat-model-row-head"><div><span className={'threat-model-severity '+row.severity}>{row.severity.toUpperCase()}</span><strong>{row.asset}</strong></div><button type="button" className="command-center-delete" aria-label={(en ? 'Delete threat ' : 'Hapus ancaman ') + row.asset} onClick={()=>remove(row.id)}><Trash2 size={15}/></button></div><p className="threat-model-boundary"><b>{en ? 'Boundary' : 'Batas'}:</b> {row.boundary}</p><p><b>{en ? 'Threat' : 'Ancaman'}:</b> {row.threat}</p><p><b>{en ? 'Mitigation' : 'Mitigasi'}:</b> {row.mitigation}</p><span className={'threat-model-status '+row.status}>{statusLabel(row.status)}</span><label className="threat-model-inline-status">{en ? 'Update status' : 'Perbarui status'}<select value={row.status} onChange={e=>setRows(current=>current.map(item=>item.id===row.id?{...item,status:e.target.value as Threat['status']}:item))}><option value="open">{en ? 'Open' : 'Terbuka'}</option><option value="planned">{en ? 'Planned' : 'Direncanakan'}</option><option value="mitigated">{en ? 'Mitigated' : 'Dimitigasi'}</option><option value="accepted">{en ? 'Accepted risk' : 'Risiko diterima'}</option></select></label></article>)}{!rows.length&&<p className="threat-model-empty">{en ? 'No threats recorded. Load examples or add your first threat.' : 'Belum ada ancaman. Muat contoh atau tambahkan ancaman pertama.'}</p>}</div>
    <p className="threat-model-guardrail"><ShieldCheck size={14}/>{en ? 'Browser-local worksheet only. No architecture data is uploaded. This does not run a scan, test a control, or certify security; independently review assumptions, mitigations, and residual risk.' : 'Worksheet lokal di browser. Data arsitektur tidak diunggah. Ini tidak menjalankan scan, menguji kontrol, atau menyertifikasi keamanan; tinjau asumsi, mitigasi, dan risiko residual secara independen.'}</p>
  </section>
}
