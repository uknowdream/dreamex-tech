import { useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, Cloud, Download, FileJson, Link2, RefreshCw, Save, ShieldCheck, Upload } from 'lucide-react'
import { useLanguage } from './i18n'
import './github-integration.css'

type JsonObject = Record<string, unknown>
type RemoteSnapshot = { revision: number; updatedAt: string | null; state: JsonObject }
type NoticeKind = 'success' | 'warning' | 'error' | 'info'

const TOKEN_KEY = 'dreamex-team-workspace-token-v1'
const DRAFT_KEY = 'dreamex-team-workspace-draft-v1'
const STARTER = { project: 'DreamEx Tech', release: '', tasks: [], decisions: [], notes: '' }

function initialDraft(): string {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      const value: unknown = JSON.parse(saved)
      if (value && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value, null, 2)
    }
  } catch { /* A local draft is optional enhancement. */ }
  return JSON.stringify(STARTER, null, 2)
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json()
    return isJsonObject(value) ? value : {}
  } catch {
    return {}
  }
}

export function TeamWorkspacePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' }
  })
  const [jsonText, setJsonText] = useState(initialDraft)
  const [revision, setRevision] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null)

  const loadRemote = async (accessToken = token) => {
    if (!accessToken.trim()) {
      setNotice({ kind: 'warning', text: en ? 'Enter the workspace access token first.' : 'Masukkan token akses workspace terlebih dahulu.' })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch('/api/team-workspace', {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + accessToken.trim(), Accept: 'application/json' },
      })
      const payload = await readPayload(response)
      if (response.status === 503) {
        setConnected(false)
        setNotice({ kind: 'warning', text: en ? 'The shared backend is not configured yet. The site owner must set the Upstash Redis REST and workspace-token environment variables in Vercel. Your local draft is still available.' : 'Backend bersama belum dikonfigurasi. Pemilik situs harus mengatur environment variable Upstash Redis REST dan token workspace di Vercel. Draft lokal Anda tetap tersedia.' })
        return
      }
      if (response.status === 401) {
        setConnected(false)
        setNotice({ kind: 'error', text: en ? 'The access token is invalid. Check the token with the workspace owner.' : 'Token akses tidak valid. Periksa token dengan pemilik workspace.' })
        return
      }
      if (!response.ok || !isJsonObject(payload.state) || typeof payload.revision !== 'number') {
        setConnected(false)
        setNotice({ kind: 'error', text: typeof payload.error === 'string' ? payload.error : (en ? 'The shared workspace could not be loaded.' : 'Workspace bersama tidak dapat dimuat.') })
        return
      }
      const remote: RemoteSnapshot = { state: payload.state, revision: payload.revision, updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null }
      setJsonText(JSON.stringify(remote.state, null, 2))
      setRevision(remote.revision)
      setUpdatedAt(remote.updatedAt)
      setConnected(true)
      setNotice({ kind: 'success', text: en ? 'Connected. Shared snapshot revision ' + remote.revision + ' is loaded.' : 'Terhubung. Snapshot bersama revisi ' + remote.revision + ' berhasil dimuat.' })
    } catch {
      setConnected(false)
      setNotice({ kind: 'error', text: en ? 'Could not reach the workspace API. Check network access and Vercel function logs.' : 'API workspace tidak dapat dijangkau. Periksa jaringan dan log function Vercel.' })
    } finally {
      setBusy(false)
    }
  }

  const connect = async () => {
    try { sessionStorage.setItem(TOKEN_KEY, token.trim()) } catch { /* Token can still be used in the current component state. */ }
    await loadRemote(token)
  }

  const saveRemote = async () => {
    if (!connected || !token.trim()) {
      setNotice({ kind: 'warning', text: en ? 'Connect to the shared workspace before publishing this snapshot.' : 'Hubungkan workspace bersama sebelum mengirim snapshot ini.' })
      return
    }
    let state: unknown
    try { state = JSON.parse(jsonText) } catch {
      setNotice({ kind: 'error', text: en ? 'The snapshot is not valid JSON.' : 'Snapshot bukan JSON yang valid.' })
      return
    }
    if (!isJsonObject(state)) {
      setNotice({ kind: 'error', text: en ? 'The top-level snapshot must be a JSON object, not an array or primitive.' : 'Snapshot tingkat atas harus berupa objek JSON, bukan array atau nilai primitif.' })
      return
    }
    if (new TextEncoder().encode(JSON.stringify(state)).byteLength > 100_000) {
      setNotice({ kind: 'error', text: en ? 'The shared snapshot is larger than the 100 KB limit.' : 'Ukuran snapshot bersama melebihi batas 100 KB.' })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch('/api/team-workspace', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token.trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ revision, state }),
      })
      const payload = await readPayload(response)
      if (response.status === 409) {
        setNotice({ kind: 'warning', text: en ? 'A teammate saved a newer revision. Your editor was preserved; load the latest version before merging changes.' : 'Anggota tim menyimpan revisi yang lebih baru. Editor Anda dipertahankan; muat versi terbaru sebelum menggabungkan perubahan.' })
        return
      }
      if (response.status === 503) {
        setConnected(false)
        setNotice({ kind: 'warning', text: en ? 'Shared persistence is not configured on the server. This draft was not published.' : 'Persistensi bersama belum dikonfigurasi di server. Draft ini belum dipublikasikan.' })
        return
      }
      if (response.status === 401) {
        setConnected(false)
        setNotice({ kind: 'error', text: en ? 'The workspace token was rejected. No remote changes were made.' : 'Token workspace ditolak. Tidak ada perubahan remote yang disimpan.' })
        return
      }
      if (!response.ok || typeof payload.revision !== 'number') {
        setNotice({ kind: 'error', text: typeof payload.error === 'string' ? payload.error : (en ? 'The snapshot could not be saved.' : 'Snapshot tidak dapat disimpan.') })
        return
      }
      setRevision(payload.revision)
      setUpdatedAt(typeof payload.updatedAt === 'string' ? payload.updatedAt : null)
      setConnected(true)
      setNotice({ kind: 'success', text: en ? 'Shared snapshot saved as revision ' + payload.revision + '.' : 'Snapshot bersama disimpan sebagai revisi ' + payload.revision + '.' })
    } catch {
      setNotice({ kind: 'error', text: en ? 'Network error while saving. Your editor content was preserved.' : 'Kesalahan jaringan saat menyimpan. Isi editor Anda tetap dipertahankan.' })
    } finally {
      setBusy(false)
    }
  }

  const saveLocal = () => {
    try {
      const value: unknown = JSON.parse(jsonText)
      if (!isJsonObject(value)) throw new Error('object')
      localStorage.setItem(DRAFT_KEY, JSON.stringify(value))
      setNotice({ kind: 'success', text: en ? 'Local draft saved in this browser profile.' : 'Draft lokal disimpan pada profil browser ini.' })
    } catch {
      setNotice({ kind: 'error', text: en ? 'Fix the JSON before saving a local draft.' : 'Perbaiki JSON sebelum menyimpan draft lokal.' })
    }
  }

  const exportSnapshot = () => {
    try {
      const value: unknown = JSON.parse(jsonText)
      if (!isJsonObject(value)) throw new Error('object')
      const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), state: value }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'dreamex-team-workspace-snapshot.json'
      anchor.click()
      URL.revokeObjectURL(url)
      setNotice({ kind: 'success', text: en ? 'Snapshot export started.' : 'Ekspor snapshot dimulai.' })
    } catch {
      setNotice({ kind: 'error', text: en ? 'Fix the JSON before exporting.' : 'Perbaiki JSON sebelum mengekspor.' })
    }
  }

  const importSnapshot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (file.size > 100_000) {
      setNotice({ kind: 'error', text: en ? 'The imported file is larger than the 100 KB limit.' : 'File impor melebihi batas 100 KB.' })
      return
    }
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const state = isJsonObject(parsed) && isJsonObject(parsed.state) ? parsed.state : parsed
      if (!isJsonObject(state)) throw new Error('object')
      setJsonText(JSON.stringify(state, null, 2))
      setNotice({ kind: 'success', text: en ? 'Snapshot imported into the editor. Save locally or publish after reviewing it.' : 'Snapshot diimpor ke editor. Simpan lokal atau publikasikan setelah meninjaunya.' })
    } catch {
      setNotice({ kind: 'error', text: en ? 'The selected file is not a valid workspace JSON snapshot.' : 'File yang dipilih bukan snapshot JSON workspace yang valid.' })
    }
  }

  const clearToken = () => {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* The control remains usable without storage. */ }
    setToken('')
    setConnected(false)
    setNotice({ kind: 'info', text: en ? 'Token cleared from this browser tab session.' : 'Token dihapus dari sesi tab browser ini.' })
  }

  return <main id="main-content" className="container team-workspace-page">
    <header className="workspace-hero team-workspace-hero">
      <span className="section-kicker"><Cloud size={14} /> DREAMEX ENGINEERING / SHARED WORKSPACE</span>
      <h1>{en ? <>One shared snapshot.<br /><span>Clear revision history.</span></> : <>Satu snapshot bersama.<br /><span>Revisi yang terjaga.</span></>}</h1>
      <p>{en ? 'Publish a JSON release plan, task list, decision log, or incident follow-up to the shared server-side snapshot. Optimistic revision checks prevent blind overwrites.' : 'Publikasikan rencana rilis, daftar tugas, keputusan, atau tindak lanjut insiden berformat JSON ke snapshot server bersama. Pemeriksaan revisi mencegah penimpaan tanpa pemeriksaan.'}</p>
    </header>

    <div className="team-workspace-panels">
      <section className="team-workspace-panel" aria-labelledby="team-workspace-connection-title">
        <div className="team-workspace-panel-head"><div><span className="section-kicker">{en ? '01 / ACCESS' : '01 / AKSES'}</span><h2 id="team-workspace-connection-title">{en ? 'Connect to shared storage' : 'Hubungkan penyimpanan bersama'}</h2></div><Link2 size={20} /></div>
        <p className="team-workspace-connection-state">{en ? 'The access token is held in sessionStorage for this tab only. Never put server credentials or production secrets in the snapshot.' : 'Token akses disimpan di sessionStorage untuk tab ini saja. Jangan masukkan kredensial server atau secret produksi ke snapshot.'}</p>
        <div className="team-workspace-connection">
          <label className="team-workspace-field" htmlFor="team-workspace-token">{en ? 'Shared workspace access token' : 'Token akses workspace bersama'}
            <input id="team-workspace-token" type={showToken ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={token} onChange={event => setToken(event.target.value)} placeholder={en ? 'Paste the token from the workspace owner' : 'Tempel token dari pemilik workspace'} />
          </label>
          <button className="button button-primary" type="button" onClick={() => void connect()} disabled={busy || !token.trim()}><Link2 size={15} /> {en ? 'Connect & load' : 'Hubungkan & muat'}</button>
        </div>
        <div className="team-workspace-actions">
          <button type="button" className="button button-ghost" onClick={() => setShowToken(value => !value)}>{showToken ? (en ? 'Hide token' : 'Sembunyikan token') : (en ? 'Show token' : 'Tampilkan token')}</button>
          <button type="button" className="button button-ghost" onClick={clearToken}>{en ? 'Clear token' : 'Hapus token'}</button>
          <button type="button" className="button button-ghost" onClick={() => void loadRemote()} disabled={busy || !token.trim()}><RefreshCw size={14} /> {en ? 'Load latest' : 'Muat terbaru'}</button>
        </div>
        {notice && <div className="team-workspace-status" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.kind === 'success' ? <CheckCircle2 size={17} /> : notice.kind === 'error' || notice.kind === 'warning' ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />}<span>{notice.text}</span></div>}
        <div className="team-workspace-warning">{en ? 'Shared access model: every holder of this single workspace token can read and overwrite the shared snapshot. Use a long random token, distribute it only to trusted collaborators, and do not store personal, confidential, or credential data.' : 'Model akses bersama: setiap pemegang token workspace ini dapat membaca dan menimpa snapshot bersama. Gunakan token acak yang panjang, bagikan hanya kepada kolaborator tepercaya, dan jangan menyimpan data pribadi, rahasia, atau kredensial.'}</div>
      </section>

      <section className="team-workspace-panel" aria-labelledby="team-workspace-editor-title">
        <div className="team-workspace-panel-head"><div><span className="section-kicker">{en ? '02 / SNAPSHOT' : '02 / SNAPSHOT'}</span><h2 id="team-workspace-editor-title">{en ? 'Workspace JSON' : 'JSON workspace'}</h2></div><FileJson size={20} /></div>
        <p className="team-workspace-connection-state">{en ? 'Revision ' + revision + (updatedAt ? ' · Updated ' + new Date(updatedAt).toLocaleString('en-GB') : ' · No remote save recorded in this session') + (connected ? ' · Connected' : ' · Local editing mode') : 'Revisi ' + revision + (updatedAt ? ' · Diperbarui ' + new Date(updatedAt).toLocaleString('id-ID') : ' · Belum ada penyimpanan remote yang tercatat di sesi ini') + (connected ? ' · Terhubung' : ' · Mode edit lokal')}</p>
        <label className="team-workspace-field team-workspace-editor" htmlFor="team-workspace-json">{en ? 'Editable JSON object (maximum 100 KB)' : 'Objek JSON yang dapat diedit (maksimum 100 KB)'}
          <textarea id="team-workspace-json" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={jsonText} onChange={event => setJsonText(event.target.value)} />
        </label>
        <div className="team-workspace-actions">
          <button className="button button-primary" type="button" onClick={() => void saveRemote()} disabled={busy || !connected}><Save size={15} /> {busy ? (en ? 'Working…' : 'Memproses…') : (en ? 'Publish shared snapshot' : 'Publikasikan snapshot')}</button>
          <button className="button button-ghost" type="button" onClick={saveLocal}><Save size={14} /> {en ? 'Save local draft' : 'Simpan draft lokal'}</button>
          <button className="button button-ghost" type="button" onClick={exportSnapshot}><Download size={14} /> {en ? 'Export JSON' : 'Ekspor JSON'}</button>
          <label className="button button-ghost" htmlFor="team-workspace-import"><Upload size={14} /> {en ? 'Import JSON' : 'Impor JSON'}<input id="team-workspace-import" className="team-workspace-hidden-file" type="file" accept="application/json,.json" onChange={event => void importSnapshot(event)} /></label>
        </div>
        <p className="team-workspace-footnote">{en ? 'Local edits are kept in this browser as a draft. Remote publishing requires the site owner to configure Upstash Redis REST credentials and DREAMEX_WORKSPACE_TOKEN in Vercel. A revision conflict preserves your editor content.' : 'Edit lokal tersimpan sebagai draft di browser ini. Publikasi remote memerlukan konfigurasi kredensial Upstash Redis REST dan DREAMEX_WORKSPACE_TOKEN oleh pemilik situs di Vercel. Konflik revisi tidak menghapus isi editor Anda.'}</p>
      </section>
    </div>
  </main>
}
