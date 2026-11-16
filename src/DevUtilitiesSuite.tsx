import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Braces, CheckCircle2, Copy, Download, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useLanguage } from './i18n'

type ObservatoryCheck = { id: string; category: string; title: string; description: string; severity: 'high' | 'medium' | 'info'; run: () => Promise<{ status: 'pass' | 'warn' | 'fail'; detail: string }> }

export function WebQualityObservatoryView() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [results, setResults] = useState<Record<string, { status: 'pass' | 'warn' | 'fail'; detail: string }>>({})
  const [running, setRunning] = useState(false)
  const [ranAt, setRanAt] = useState('')
  const [copied, setCopied] = useState(false)
  const checks = useMemo<ObservatoryCheck[]>(() => [
    { id: 'https', category: en ? 'Security & transport' : 'Keamanan & transport', title: en ? 'HTTPS page context' : 'Konteks halaman HTTPS', description: en ? 'Confirms the current page uses a secure transport context.' : 'Memastikan halaman saat ini menggunakan konteks transport yang aman.', severity: 'high', run: async () => ({ status: window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'pass' : 'fail', detail: window.location.protocol + '//' + window.location.host }) },
    { id: 'viewport', category: en ? 'Responsive experience' : 'Pengalaman responsif', title: en ? 'Viewport configuration' : 'Konfigurasi viewport', description: en ? 'Checks whether a viewport meta tag is present.' : 'Memeriksa keberadaan meta tag viewport.', severity: 'high', run: async () => { const tag = document.querySelector<HTMLMetaElement>('meta[name="viewport"]'); return { status: tag?.content.includes('width=device-width') ? 'pass' : 'fail', detail: tag?.content || (en ? 'Viewport meta tag is missing.' : 'Meta tag viewport tidak ditemukan.') } } },
    { id: 'title', category: en ? 'Search & metadata' : 'Pencarian & metadata', title: en ? 'Unique page title' : 'Judul halaman', description: en ? 'Checks for a non-empty document title.' : 'Memeriksa judul dokumen yang tidak kosong.', severity: 'high', run: async () => ({ status: document.title.trim() ? 'pass' : 'fail', detail: document.title.trim() || (en ? 'Document title is empty.' : 'Judul dokumen kosong.') }) },
    { id: 'description', category: en ? 'Search & metadata' : 'Pencarian & metadata', title: en ? 'Meta description' : 'Meta description', description: en ? 'Checks for a non-empty description meta tag.' : 'Memeriksa meta description yang tidak kosong.', severity: 'medium', run: async () => { const value = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content.trim() || ''; return { status: value.length >= 50 && value.length <= 180 ? 'pass' : value ? 'warn' : 'fail', detail: value ? (en ? value.length + ' characters' : value.length + ' karakter') : (en ? 'Description is missing.' : 'Description tidak ditemukan.') } } },
    { id: 'canonical', category: en ? 'Search & metadata' : 'Pencarian & metadata', title: en ? 'Canonical URL' : 'URL canonical', description: en ? 'Checks that a canonical link points to an absolute HTTPS URL.' : 'Memeriksa link canonical dengan URL HTTPS absolut.', severity: 'medium', run: async () => { const value = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || ''; return { status: /^https:\/\//.test(value) ? 'pass' : 'warn', detail: value || (en ? 'Canonical URL is missing.' : 'URL canonical tidak ditemukan.') } } },
    { id: 'h1', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Single primary heading' : 'Satu heading utama', description: en ? 'Checks the current document for exactly one H1.' : 'Memeriksa apakah dokumen memiliki tepat satu H1.', severity: 'medium', run: async () => { const count = document.querySelectorAll('h1').length; return { status: count === 1 ? 'pass' : 'warn', detail: en ? count + ' H1 elements found' : count + ' elemen H1 ditemukan' } } },
    { id: 'landmarks', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Main landmark' : 'Landmark utama', description: en ? 'Checks for a main landmark or main-content target.' : 'Memeriksa landmark main atau target main-content.', severity: 'medium', run: async () => { const found = Boolean(document.querySelector('main, [role="main"], #main-content')); return { status: found ? 'pass' : 'fail', detail: found ? (en ? 'Main content landmark found.' : 'Landmark konten utama ditemukan.') : (en ? 'No main landmark found.' : 'Landmark utama tidak ditemukan.') } } },
    { id: 'skip-link', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Skip navigation link' : 'Tautan lewati navigasi', description: en ? 'Checks for a keyboard-friendly skip link.' : 'Memeriksa tautan untuk melewati navigasi dengan keyboard.', severity: 'medium', run: async () => { const found = Boolean(document.querySelector('a.skip-link[href^="#"]')); return { status: found ? 'pass' : 'warn', detail: found ? (en ? 'Skip link found.' : 'Tautan skip ditemukan.') : (en ? 'No skip link detected.' : 'Tautan skip tidak ditemukan.') } } },
    { id: 'images', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Image alternative text' : 'Teks alternatif gambar', description: en ? 'Flags images that have no alt attribute.' : 'Menandai gambar yang tidak memiliki atribut alt.', severity: 'medium', run: async () => { const images = [...document.images]; const missing = images.filter(image => !image.hasAttribute('alt')).length; return { status: missing === 0 ? 'pass' : 'warn', detail: en ? missing + ' of ' + images.length + ' images missing alt attributes' : missing + ' dari ' + images.length + ' gambar tidak memiliki atribut alt' } } },
    { id: 'links', category: en ? 'Navigation integrity' : 'Integritas navigasi', title: en ? 'Empty link labels' : 'Label tautan kosong', description: en ? 'Finds links without readable text or an accessible name.' : 'Mencari tautan tanpa teks terbaca atau nama aksesibel.', severity: 'medium', run: async () => { const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]; const missing = links.filter(link => !(link.innerText || link.getAttribute('aria-label') || link.querySelector('img[alt]')?.getAttribute('alt') || '').trim()).length; return { status: missing === 0 ? 'pass' : 'warn', detail: en ? missing + ' of ' + links.length + ' links have no detectable label' : missing + ' dari ' + links.length + ' tautan tidak memiliki label terdeteksi' } } },
    { id: 'motion', category: en ? 'Accessibility & structure' : 'Aksesibilitas & struktur', title: en ? 'Reduced-motion support' : 'Dukungan reduced-motion', description: en ? 'Checks whether the site defines a reduced-motion CSS preference.' : 'Memeriksa apakah situs mendefinisikan preferensi CSS reduced-motion.', severity: 'info', run: async () => { const rules = [...document.styleSheets].flatMap(sheet => { try { return [...(sheet.cssRules || [])] } catch { return [] } }); const found = rules.some(rule => rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion')); return { status: found ? 'pass' : 'warn', detail: found ? (en ? 'Reduced-motion media rule found in accessible stylesheets.' : 'Aturan media reduced-motion ditemukan pada stylesheet yang dapat dibaca.') : (en ? 'No accessible reduced-motion media rule detected; cross-origin stylesheets may be unreadable.' : 'Aturan reduced-motion tidak terdeteksi; stylesheet lintas origin mungkin tidak dapat dibaca.') } } },
    { id: 'storage', category: en ? 'Privacy & resilience' : 'Privasi & ketahanan', title: en ? 'Browser storage availability' : 'Ketersediaan penyimpanan browser', description: en ? 'Tests whether local storage can be accessed without writing user data.' : 'Menguji akses local storage tanpa menulis data pengguna.', severity: 'info', run: async () => { try { void window.localStorage.length; return { status: 'pass', detail: en ? 'Local storage is readable.' : 'Local storage dapat dibaca.' } } catch { return { status: 'warn', detail: en ? 'Storage is restricted in this context.' : 'Penyimpanan dibatasi pada konteks ini.' } } } },
  ], [en])
  const score = useMemo(() => {
    const values = checks.map(check => results[check.id]).filter(Boolean)
    const weights = checks.reduce((sum, check) => sum + (check.severity === 'high' ? 2 : 1), 0)
    const earned = checks.reduce((sum, check) => sum + (results[check.id]?.status === 'pass' ? (check.severity === 'high' ? 2 : 1) : 0), 0)
    return { value: Math.round(earned / weights * 100), complete: values.length, pass: values.filter(value => value.status === 'pass').length, warn: values.filter(value => value.status === 'warn').length, fail: values.filter(value => value.status === 'fail').length }
  }, [results, checks])
  const runChecks = async () => {
    setRunning(true)
    setResults({})
    const next: Record<string, { status: 'pass' | 'warn' | 'fail'; detail: string }> = {}
    for (const check of checks) {
      try { next[check.id] = await check.run() } catch { next[check.id] = { status: 'warn', detail: en ? 'The browser could not complete this check.' : 'Browser tidak dapat menyelesaikan pemeriksaan ini.' } }
      setResults({ ...next })
    }
    setRanAt(new Date().toLocaleString(en ? 'en-US' : 'id-ID'))
    setCopied(false)
    setRunning(false)
  }
  const report = useMemo(() => [
    '# DreamEx Tech — Web Quality Observatory',
    '',
    '- Page: ' + window.location.href,
    '- Audited at: ' + (ranAt || (en ? 'Not run yet' : 'Belum dijalankan')),
    '- Score: ' + score.value + '/100 (weighted heuristic, not a compliance certification)',
    '- Checks: ' + score.complete + '/' + checks.length,
    '',
    ...checks.map(check => '- [' + (results[check.id]?.status === 'pass' ? 'x' : ' ') + '] ' + check.title + ' — ' + (results[check.id]?.status || 'not run').toUpperCase() + ': ' + (results[check.id]?.detail || (en ? 'Not run' : 'Belum dijalankan'))),
    '',
    'Note: This is a browser-side heuristic scan. It does not crawl the site, test server headers, run Lighthouse, or certify WCAG conformance.',
  ].join('\n'), [checks, en, ranAt, results, score])
  const exportReport = () => {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-web-quality-report.md'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
  const copyReport = async () => {
    try { await navigator.clipboard.writeText(report); setCopied(true) }
    catch { setCopied(false) }
  }
  return <main id="main-content" className="container observatory-page">
    <header className="observatory-header">
      <span className="section-kicker"><Activity size={14} /> {en ? 'ENGINEERING QUALITY / BROWSER AUDIT' : 'KUALITAS ENGINEERING / AUDIT BROWSER'}</span>
      <h1>{en ? <>Web Quality <span>Observatory.</span></> : <>Observatory <span>Kualitas Web.</span></>}</h1>
      <p>{en ? 'A practical, transparent health check for the page you are viewing. Inspect metadata, accessibility signals, navigation, privacy basics, and responsive foundations — without uploading page data.' : 'Pemeriksaan praktis dan transparan untuk halaman yang sedang Anda buka. Periksa metadata, sinyal aksesibilitas, navigasi, privasi dasar, dan fondasi responsif — tanpa mengunggah data halaman.'}</p>
      <div className="observatory-disclaimer"><ShieldCheck size={16} /><span>{en ? 'Local-only audit · no analytics upload · heuristic results, not a replacement for Lighthouse or a WCAG audit.' : 'Audit lokal · tidak mengunggah analitik · hasil heuristik, bukan pengganti Lighthouse atau audit WCAG.'}</span></div>
    </header>
    <section className="observatory-dashboard" aria-label={en ? 'Audit summary' : 'Ringkasan audit'}>
      <div className="observatory-score" role="img" aria-label={(en ? 'Quality score ' : 'Skor kualitas ') + score.value + ' percent'} style={{ '--observatory-score': score.value } as React.CSSProperties}><div><strong>{score.value}</strong><span>/100</span></div></div>
      <div className="observatory-summary"><span className="section-kicker">{en ? 'CURRENT PAGE' : 'HALAMAN SAAT INI'}</span><h2>{score.complete === 0 ? (en ? 'Ready for inspection' : 'Siap diperiksa') : score.fail > 0 ? (en ? 'Critical signals need attention' : 'Sinyal kritis perlu ditinjau') : score.warn > 0 ? (en ? 'Review recommended' : 'Disarankan untuk ditinjau') : (en ? 'Healthy signals detected' : 'Sinyal baik terdeteksi')}</h2><p>{en ? 'The score rewards passed checks and weights foundational security and viewport checks more heavily. A completed scan is required before interpreting the score.' : 'Skor menghargai pemeriksaan yang lulus dan memberi bobot lebih besar pada keamanan dasar dan viewport. Jalankan pemindaian sebelum menafsirkan skor.'}</p><div className="observatory-stats"><div><strong>{score.complete}/{checks.length}</strong><span>{en ? 'Checked' : 'Diperiksa'}</span></div><div><strong>{score.pass}</strong><span>{en ? 'Passed' : 'Lulus'}</span></div><div><strong>{score.warn}</strong><span>{en ? 'Warnings' : 'Peringatan'}</span></div><div><strong>{score.fail}</strong><span>{en ? 'Failed' : 'Gagal'}</span></div></div></div>
    </section>
    <div className="observatory-toolbar"><div><span className="section-kicker">{en ? 'QUALITY SIGNALS' : 'SINYAL KUALITAS'}</span><h2>{en ? 'Audit checklist' : 'Checklist audit'}</h2><p>{ranAt ? (en ? 'Last run: ' : 'Terakhir dijalankan: ') + ranAt : (en ? 'Run the audit to inspect this page.' : 'Jalankan audit untuk memeriksa halaman ini.')}</p></div><div className="observatory-actions"><button className="button button-primary" type="button" onClick={runChecks} disabled={running}><Activity size={16} /> {running ? (en ? 'Scanning…' : 'Memindai…') : (en ? 'Run page audit' : 'Jalankan audit')}</button><button className="copy-link-button" type="button" onClick={copyReport} disabled={score.complete === 0}><Copy size={14} /> {copied ? (en ? 'Copied' : 'Disalin') : (en ? 'Copy report' : 'Salin laporan')}</button><button className="copy-link-button" type="button" onClick={exportReport} disabled={score.complete === 0}><Download size={14} /> {en ? 'Export .md' : 'Ekspor .md'}</button></div></div>
    <div className="observatory-groups">{[...new Set(checks.map(check => check.category))].map(category => <section className="observatory-group" key={category}><h3>{category}<span>{checks.filter(check => check.category === category && results[check.id]).length}/{checks.filter(check => check.category === category).length}</span></h3>{checks.filter(check => check.category === category).map(check => { const result = results[check.id]; return <article className="observatory-check" key={check.id}><div className="observatory-check-icon"><span className={'observatory-status status-' + (result?.status || 'idle')}>{result?.status === 'pass' ? <CheckCircle2 size={17} /> : result?.status === 'fail' ? <AlertTriangle size={17} /> : result?.status === 'warn' ? <AlertTriangle size={17} /> : <Activity size={17} />}</span></div><div className="observatory-check-copy"><div><h4>{check.title}</h4><span className={'observatory-severity severity-' + check.severity}>{check.severity.toUpperCase()}</span></div><p>{check.description}</p><small>{result?.detail || (en ? 'Not run yet.' : 'Belum dijalankan.')}</small></div><span className={'observatory-result-badge result-' + (result?.status || 'idle')}>{result?.status ? (en ? result.status.toUpperCase() : result.status === 'pass' ? 'LULUS' : result.status === 'warn' ? 'PERINGATAN' : 'GAGAL') : (en ? 'PENDING' : 'MENUNGGU')}</span></article> })}</section>)}</div>
    <aside className="observatory-note"><AlertTriangle size={17} /><p>{en ? 'Scope limits: this checks the current rendered page only. It does not crawl internal links, measure Core Web Vitals, validate HTTP security headers, test contrast ratios, or guarantee WCAG conformance. Use Lighthouse and a manual keyboard/screen-reader review for deeper validation.' : 'Batasan: pemeriksaan hanya mencakup halaman yang sedang dirender. Tool ini tidak merayapi tautan internal, mengukur Core Web Vitals, memvalidasi security headers HTTP, menguji rasio kontras, atau menjamin kepatuhan WCAG. Gunakan Lighthouse dan tinjauan keyboard/screen reader manual untuk validasi lanjutan.'}</p></aside>
  </main>
}

function inferJsonSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: 'null' }
  if (Array.isArray(value)) {
    const variants = [...new Map(value.map(item => {
      const schema = inferJsonSchema(item)
      return [JSON.stringify(schema), schema] as const
    })).values()]
    return { type: 'array', items: variants.length === 0 ? {} : variants.length === 1 ? variants[0] : { anyOf: variants } }
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return {
      type: 'object',
      properties: Object.fromEntries(entries.map(([key, item]) => [key, inferJsonSchema(item)])),
      ...(entries.length ? { required: entries.map(([key]) => key) } : {}),
      additionalProperties: false,
    }
  }
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' }
  return { type: typeof value }
}

function decodeJwtPart(part: string): unknown {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function DeveloperUtilitiesView() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [activeTool, setActiveTool] = useState<'schema' | 'regex' | 'jwt'>('schema')
  const [sampleJson, setSampleJson] = useState('{\n  "id": 42,\n  "name": "Ada Lovelace",\n  "active": true,\n  "roles": ["admin", "editor"],\n  "profile": { "city": "London", "verified": null }\n}')
  const [schemaOutput, setSchemaOutput] = useState('')
  const [schemaError, setSchemaError] = useState('')
  const [regexPattern, setRegexPattern] = useState('(?<email>[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,})')
  const [regexFlags, setRegexFlags] = useState('g')
  const [regexSample, setRegexSample] = useState('Contact support@example.com or hello@dreamex.tech for help.')
  const [regexError, setRegexError] = useState('')
  const [regexMatches, setRegexMatches] = useState<Array<{ match: string; index: number; groups: Record<string, string> }>>([])
  const [jwtInput, setJwtInput] = useState('')
  const [jwtOutput, setJwtOutput] = useState('')
  const [jwtError, setJwtError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    const title = en ? 'Developer Utilities — DreamEx Tech' : 'Utilitas Developer — DreamEx Tech'
    const description = en
      ? 'Privacy-first browser tools for JSON Schema generation, regular-expression testing, and JWT inspection.'
      : 'Tool browser yang mengutamakan privasi untuk membuat JSON Schema, menguji regular expression, dan memeriksa JWT.'
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dreamex.tech/devtools')
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://dreamex.tech/devtools')
    return () => {
      document.title = 'DreamEx Tech — Engineering, AI & QA'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'DreamEx Tech — Think deeper. Build smarter.')
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'DreamEx Tech — practical notes on software engineering, quality engineering, AI, and modern technology.')
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dreamex.tech/')
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://dreamex.tech/')
    }
  }, [en])

  const generateSchema = () => {
    setSchemaError('')
    setSchemaOutput('')
    try {
      const parsed: unknown = JSON.parse(sampleJson)
      setSchemaOutput(JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Generated schema',
        ...inferJsonSchema(parsed),
      }, null, 2))
    } catch (error) {
      setSchemaError((en ? 'Invalid JSON: ' : 'JSON tidak valid: ') + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const testRegex = () => {
    setRegexError('')
    setRegexMatches([])
    if (regexPattern.length > 160 || regexSample.length > 4000) {
      setRegexError(en ? 'Keep patterns under 160 characters and sample text under 4,000 characters.' : 'Batasi pola hingga 160 karakter dan teks sampel hingga 4.000 karakter.')
      return
    }
    if (/\([^)]*[+*][^)]*\)\s*(?:[+*]|\{\d*,?\d*\})/.test(regexPattern) || /\([^)]*\|[^)]*\)\s*(?:[+*]|\{\d*,?\d*\})/.test(regexPattern)) {
      setRegexError(en ? 'This pattern uses a potentially expensive nested or ambiguous quantifier. Simplify it before testing.' : 'Pola ini memakai quantifier bertingkat atau ambigu yang berpotensi mahal. Sederhanakan sebelum diuji.')
      return
    }
    try {
      const flags = [...new Set(regexFlags.split('').filter(flag => 'dgimsuvy'.includes(flag)))].join('')
      const expression = new RegExp(regexPattern, flags)
      const matches: Array<{ match: string; index: number; groups: Record<string, string> }> = []
      if (expression.global || expression.sticky) {
        let match: RegExpExecArray | null
        while ((match = expression.exec(regexSample)) !== null && matches.length < 100) {
          matches.push({ match: match[0], index: match.index, groups: match.groups ? Object.fromEntries(Object.entries(match.groups).map(([key, value]) => [key, value ?? ''])) : {} })
          if (match[0] === '') expression.lastIndex += 1
        }
      } else {
        const match = expression.exec(regexSample)
        if (match) matches.push({ match: match[0], index: match.index, groups: match.groups ? Object.fromEntries(Object.entries(match.groups).map(([key, value]) => [key, value ?? ''])) : {} })
      }
      setRegexMatches(matches)
    } catch (error) {
      setRegexError((en ? 'Regex error: ' : 'Kesalahan regex: ') + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const decodeJwt = () => {
    setJwtError('')
    setJwtOutput('')
    const parts = jwtInput.trim().split('.')
    if (parts.length !== 3 || parts.some(part => !part)) {
      setJwtError(en ? 'A JWT must contain three non-empty dot-separated segments.' : 'JWT harus memiliki tiga segmen tidak kosong yang dipisahkan titik.')
      return
    }
    try {
      const header = decodeJwtPart(parts[0])
      const payload = decodeJwtPart(parts[1])
      setJwtOutput(JSON.stringify({ header, payload, signature: en ? 'Not verified — signature bytes are not validated.' : 'Belum diverifikasi — byte tanda tangan tidak divalidasi.' }, null, 2))
    } catch {
      setJwtError(en ? 'The header or payload is not valid base64url-encoded JSON.' : 'Header atau payload bukan JSON base64url yang valid.')
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus(en ? 'Copied to clipboard.' : 'Berhasil disalin.')
    } catch {
      setCopyStatus(en ? 'Clipboard access was blocked by the browser.' : 'Akses clipboard diblokir oleh browser.')
    }
  }

  const downloadSchema = () => {
    if (!schemaOutput) return
    const url = URL.createObjectURL(new Blob([schemaOutput], { type: 'application/schema+json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'schema.generated.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return <main id="main-content" className="container devtools-page">
    <header className="devtools-header">
      <span className="section-kicker"><Braces size={14} /> {en ? 'ENGINEERING TOOLKIT / PRIVACY-FIRST' : 'TOOLKIT ENGINEERING / UTAMAKAN PRIVASI'}</span>
      <h1>{en ? <>Developer <span>Utilities.</span></> : <>Utilitas <span>Developer.</span></>}</h1>
      <p>{en ? 'Small, focused tools for everyday engineering workflows. Validate, inspect, and generate locally in your browser — no account or upload required.' : 'Tool ringkas dan fokus untuk alur kerja engineering sehari-hari. Validasi, periksa, dan buat output langsung di browser — tanpa akun atau unggahan.'}</p>
      <div className="devtools-trust"><ShieldCheck size={16} /><span>{en ? 'Local processing · no telemetry added · never paste production secrets into shared devices.' : 'Pemrosesan lokal · tanpa telemetri tambahan · jangan tempelkan secret produksi pada perangkat bersama.'}</span></div>
    </header>
    <nav className="devtools-tabs" aria-label={en ? 'Developer utilities' : 'Utilitas developer'}>
      <button type="button" className={activeTool === 'schema' ? 'active' : ''} aria-pressed={activeTool === 'schema'} onClick={() => { setActiveTool('schema'); setCopyStatus('') }}><Braces size={16} /><span>JSON Schema</span></button>
      <button type="button" className={activeTool === 'regex' ? 'active' : ''} aria-pressed={activeTool === 'regex'} onClick={() => { setActiveTool('regex'); setCopyStatus('') }}><Search size={16} /><span>{en ? 'Regex Tester' : 'Penguji Regex'}</span></button>
      <button type="button" className={activeTool === 'jwt' ? 'active' : ''} aria-pressed={activeTool === 'jwt'} onClick={() => { setActiveTool('jwt'); setCopyStatus('') }}><ShieldCheck size={16} /><span>{en ? 'JWT Inspector' : 'Pemeriksa JWT'}</span></button>
    </nav>

    {activeTool === 'schema' && <section className="devtools-panel" aria-labelledby="schema-title">
      <div className="devtools-panel-heading"><span className="devtools-index">01 / GENERATE</span><h2 id="schema-title">{en ? 'JSON Schema Generator' : 'Generator JSON Schema'}</h2><p>{en ? 'Infer a JSON Schema Draft 2020-12 from a sample payload, including nested objects, arrays, nulls, and mixed array types.' : 'Buat inferensi JSON Schema Draft 2020-12 dari payload sampel, termasuk objek bertingkat, array, null, dan tipe array campuran.'}</p></div>
      <div className="devtools-workspace"><label className="lab-field">{en ? 'Sample JSON' : 'JSON sampel'}<textarea aria-label={en ? 'Sample JSON' : 'JSON sampel'} rows={10} spellCheck={false} value={sampleJson} onChange={event => setSampleJson(event.target.value)} /></label><div className="devtools-output-column"><div className="devtools-output-heading"><strong>{en ? 'Generated schema' : 'Schema hasil'}</strong><span className="devtools-format">DRAFT 2020-12</span></div>{schemaOutput ? <pre className="lab-output" aria-label={en ? 'Generated JSON Schema output' : 'Output JSON Schema'}>{schemaOutput}</pre> : <div className="devtools-empty"><Braces size={22} /><p>{en ? 'Your schema will appear here.' : 'Schema akan muncul di sini.'}</p></div>}{schemaError && <p className="lab-error" role="alert">{schemaError}</p>}</div></div>
      <div className="devtools-actions"><button type="button" className="button button-primary" onClick={generateSchema}><Sparkles size={15} /> {en ? 'Generate schema' : 'Buat schema'}</button>{schemaOutput && <><button type="button" className="button button-secondary" onClick={() => void copyText(schemaOutput)}><Copy size={15} /> {en ? 'Copy schema' : 'Salin schema'}</button><button type="button" className="button button-secondary" onClick={downloadSchema}><Download size={15} /> {en ? 'Download JSON' : 'Unduh JSON'}</button></>}</div>
    </section>}

    {activeTool === 'regex' && <section className="devtools-panel" aria-labelledby="regex-title">
      <div className="devtools-panel-heading"><span className="devtools-index">02 / INSPECT</span><h2 id="regex-title">{en ? 'Regular Expression Tester' : 'Penguji Regular Expression'}</h2><p>{en ? 'Test a pattern against sample text and inspect match offsets and named capture groups.' : 'Uji pola pada teks sampel dan periksa posisi kecocokan serta named capture group.'}</p></div>
      <div className="devtools-regex-line"><label className="lab-field">{en ? 'Pattern' : 'Pola'}<input aria-label={en ? 'Regex pattern' : 'Pola regex'} value={regexPattern} onChange={event => setRegexPattern(event.target.value)} maxLength={160} /></label><label className="lab-field devtools-flags">{en ? 'Flags' : 'Flags'}<input aria-label={en ? 'Regex flags' : 'Flag regex'} value={regexFlags} onChange={event => setRegexFlags(event.target.value)} maxLength={8} /><small>g i m s u y</small></label></div>
      <label className="lab-field devtools-sample">{en ? 'Sample text' : 'Teks sampel'}<textarea aria-label={en ? 'Regex sample text' : 'Teks sampel regex'} rows={5} value={regexSample} onChange={event => setRegexSample(event.target.value)} maxLength={4000} /></label>
      <div className="devtools-actions"><button type="button" className="button button-primary" onClick={testRegex}><Search size={15} /> {en ? 'Test pattern' : 'Uji pola'}</button><span className="devtools-count">{regexMatches.length} {en ? 'matches' : 'kecocokan'} · {en ? 'maximum 100 shown' : 'maksimal 100 ditampilkan'}</span></div>
      {regexError && <p className="lab-error" role="alert">{regexError}</p>}
      <div className="devtools-match-list" aria-live="polite">{regexMatches.length ? regexMatches.map((item, index) => <article className="devtools-match" key={item.index + ':' + index}><span className="devtools-match-index">#{index + 1} · {en ? 'offset' : 'posisi'} {item.index}</span><code>{item.match || (en ? '(empty match)' : '(kecocokan kosong)')}</code>{Object.keys(item.groups).length > 0 && <pre className="lab-output">{JSON.stringify(item.groups, null, 2)}</pre>}</article>) : <div className="devtools-empty"><Search size={22} /><p>{en ? 'Run the test to see matches.' : 'Jalankan pengujian untuk melihat kecocokan.'}</p></div>}</div>
      <p className="devtools-footnote">{en ? 'Safety guard: pattern and input length are capped, and common nested/ambiguous quantifiers are rejected. This is a convenience tool, not a complete ReDoS defense.' : 'Pengaman: panjang pola dan input dibatasi serta quantifier bertingkat/ambigu yang umum ditolak. Ini alat bantu, bukan pertahanan ReDoS lengkap.'}</p>
    </section>}

    {activeTool === 'jwt' && <section className="devtools-panel" aria-labelledby="jwt-title">
      <div className="devtools-panel-heading"><span className="devtools-index">03 / DECODE</span><h2 id="jwt-title">{en ? 'JWT Inspector' : 'Pemeriksa JWT'}</h2><p>{en ? 'Decode the header and payload of a JSON Web Token for debugging. The token stays in this browser session.' : 'Dekode header dan payload JSON Web Token untuk debugging. Token tetap diproses di sesi browser ini.'}</p></div>
      <label className="lab-field">{en ? 'JWT token' : 'Token JWT'}<textarea aria-label={en ? 'JWT token' : 'Token JWT'} rows={4} spellCheck={false} value={jwtInput} onChange={event => setJwtInput(event.target.value)} placeholder="eyJhbGciOi...eyJzdWIiOi..." /></label>
      <div className="devtools-actions"><button type="button" className="button button-primary" onClick={decodeJwt}><ShieldCheck size={15} /> {en ? 'Decode token' : 'Dekode token'}</button>{jwtOutput && <button type="button" className="button button-secondary" onClick={() => void copyText(jwtOutput)}><Copy size={15} /> {en ? 'Copy decoded JSON' : 'Salin JSON hasil'}</button>}</div>
      {jwtError && <p className="lab-error" role="alert">{jwtError}</p>}
      {jwtOutput ? <pre className="lab-output devtools-jwt-output" aria-label={en ? 'Decoded JWT output' : 'Output JWT hasil dekode'}>{jwtOutput}</pre> : <div className="devtools-empty"><ShieldCheck size={22} /><p>{en ? 'Decoded header and payload will appear here.' : 'Header dan payload hasil dekode akan muncul di sini.'}</p></div>}
      <aside className="devtools-warning"><AlertTriangle size={16} /><p>{en ? 'Decoding is not verification. This tool does not validate signatures, issuer, audience, expiry, or trust. Never use decoded claims alone to authorize a request.' : 'Dekode bukan verifikasi. Tool ini tidak memvalidasi tanda tangan, issuer, audience, kedaluwarsa, atau kepercayaan. Jangan gunakan klaim hasil dekode saja untuk mengotorisasi permintaan.'}</p></aside>
    </section>}
    {copyStatus && <p className="lab-copy-status" role="status">{copyStatus}</p>}
    <p className="devtools-disclaimer">{en ? 'Everything runs client-side in this page. Outputs are generated from the input you provide and should be reviewed before production use.' : 'Semua proses berjalan di sisi klien pada halaman ini. Output dibuat dari input Anda dan harus ditinjau sebelum digunakan di produksi.'}</p>
  </main>
}
