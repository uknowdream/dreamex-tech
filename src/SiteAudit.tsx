import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Code2, Download, RefreshCw, SearchCheck, ShieldCheck } from 'lucide-react'
import { useLanguage } from './i18n'
import { AiCopilotPanel, SvgRingGauge, SvgStackedBar } from './DashboardKit'
import './SiteAudit.css'

type Severity = 'error' | 'warning' | 'info'
type Finding = { id: string; severity: Severity; category: string; title: string; detail: string; selector?: string }
type AuditResult = { scannedAt: string; page: string; title: string; findings: Finding[]; checks: number; isCustomHtml?: boolean }

function inspectDocument(doc: Document, pageLabel: string, en: boolean, isCustomHtml = false): AuditResult {
  const findings: Finding[] = []
  let checks = 0
  const add = (finding: Omit<Finding, 'id'>) => findings.push({ ...finding, id: `${finding.category}-${findings.length + 1}` })
  const check = () => { checks += 1 }

  const title = doc.title.trim()
  check()
  if (!title) {
    add({
      severity: 'error',
      category: 'SEO',
      title: en ? 'Page title is missing' : 'Judul halaman (<title>) kosong',
      detail: en ? 'Add a descriptive document title.' : 'Tambahkan tag <title> yang deskriptif.',
    })
  } else if (title.length < 20 || title.length > 65) {
    add({
      severity: 'warning',
      category: 'SEO',
      title: en ? 'Page title length may need review' : 'Panjang <title> perlu ditinjau',
      detail: en ? `Current title is ${title.length} characters; 20–65 characters scans best.` : `Panjang judul saat ini ${title.length} karakter; disarankan 20–65 karakter.`,
    })
  }

  check()
  const description = doc.querySelector<HTMLMetaElement>('meta[name="description"]')?.content?.trim() ?? ''
  if (!description) {
    add({
      severity: 'error',
      category: 'SEO',
      title: en ? 'Meta description is missing' : 'Meta description tidak ditemukan',
      detail: en ? 'Add a useful page-specific meta description.' : 'Tambahkan meta description spesifik untuk halaman ini.',
    })
  } else if (description.length < 50 || description.length > 180) {
    add({
      severity: 'warning',
      category: 'SEO',
      title: en ? 'Meta description length may need review' : 'Panjang meta description perlu ditinjau',
      detail: en ? `Current description is ${description.length} characters.` : `Panjang deskripsi saat ini ${description.length} karakter.`,
    })
  }

  check()
  if (!doc.documentElement.lang) {
    add({
      severity: 'error',
      category: en ? 'Accessibility' : 'Aksesibilitas',
      title: en ? 'Document language is missing' : 'Atribut lang pada <html> belum disetel',
      detail: en ? 'Set a valid lang attribute on the html element.' : 'Tambahkan atribut lang yang valid pada elemen <html>.',
    })
  }

  check()
  const h1s = doc.querySelectorAll('main h1, main#main-content h1, h1')
  if (h1s.length === 0) {
    add({
      severity: 'error',
      category: en ? 'Structure' : 'Struktur',
      title: en ? 'No primary heading found in main content' : 'Tidak ada heading utama <h1>',
      detail: en ? 'Provide a clear page-level <h1> heading.' : 'Sediakan satu heading tingkat halaman <h1> yang jelas.',
    })
  } else if (h1s.length > 1) {
    add({
      severity: 'warning',
      category: en ? 'Structure' : 'Struktur',
      title: en ? 'Multiple primary headings found' : 'Lebih dari satu elemen <h1> terdeteksi',
      detail: en ? `Found ${h1s.length} h1 elements; confirm the hierarchy is intentional.` : `Ditemukan ${h1s.length} elemen h1; pastikan hierarkinya disengaja.`,
    })
  }

  if (!doc.querySelector('main')) {
    add({
      severity: 'error',
      category: en ? 'Accessibility' : 'Aksesibilitas',
      title: en ? 'Main landmark is missing' : 'Landmark <main> tidak ditemukan',
      detail: en ? 'Use one <main> landmark for the page primary content.' : 'Gunakan elemen <main> untuk konten utama halaman.',
    })
  }

  const images = Array.from(doc.images)
  check()
  const missingAlt = images.filter(image => !image.hasAttribute('alt'))
  if (missingAlt.length) {
    add({
      severity: 'error',
      category: en ? 'Accessibility' : 'Aksesibilitas',
      title: en ? 'Images missing alt attributes' : 'Gambar tanpa atribut alt',
      detail: en
        ? `${missingAlt.length} of ${images.length} images do not have an alt attribute. Decorative images should use alt="".`
        : `${missingAlt.length} dari ${images.length} gambar tidak memiliki atribut alt. Gambar dekoratif wajib memakai alt="".`,
      selector: missingAlt.slice(0, 5).map(image => image.getAttribute('src') || image.currentSrc || '<img>').join('\n'),
    })
  }

  const unnamedLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(
    link => !((link.textContent || '').trim() || link.getAttribute('aria-label') || link.querySelector('img[alt]')),
  )
  check()
  if (unnamedLinks.length) {
    add({
      severity: 'warning',
      category: en ? 'Accessibility' : 'Aksesibilitas',
      title: en ? 'Links without an accessible name' : 'Tautan tanpa label aksesibel',
      detail: en ? `Found ${unnamedLinks.length} links without visible text or aria-label.` : `Ditemukan ${unnamedLinks.length} tautan tanpa teks terlihat maupun aria-label.`,
      selector: unnamedLinks.slice(0, 5).map(link => link.getAttribute('href') || link.href).join('\n'),
    })
  }

  const unnamedButtons = Array.from(doc.querySelectorAll<HTMLButtonElement>('button')).filter(
    button => !((button.textContent || '').trim() || button.getAttribute('aria-label') || button.getAttribute('title')),
  )
  check()
  if (unnamedButtons.length) {
    add({
      severity: 'warning',
      category: en ? 'Accessibility' : 'Aksesibilitas',
      title: en ? 'Buttons without an accessible name' : 'Tombol tanpa label aksesibel',
      detail: en ? `Found ${unnamedButtons.length} buttons without text, aria-label, or title.` : `Ditemukan ${unnamedButtons.length} tombol tanpa teks, aria-label, atau title.`,
      selector: unnamedButtons.slice(0, 5).map(button => button.outerHTML.slice(0, 180)).join('\n'),
    })
  }

  const allIds = new Set(Array.from(doc.querySelectorAll('[id]')).map(element => element.id))
  const brokenAnchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).filter(link => {
    const target = link.getAttribute('href')?.slice(1)
    if (!target) return false
    try { return !allIds.has(decodeURIComponent(target)) } catch { return true }
  })
  check()
  if (brokenAnchors.length) {
    add({
      severity: 'warning',
      category: en ? 'Navigation' : 'Navigasi',
      title: en ? 'In-page links have missing targets' : 'Tautan anchor internal menuju ID hilang',
      detail: en ? `Found ${brokenAnchors.length} same-page links pointing to missing IDs.` : `Ditemukan ${brokenAnchors.length} tautan halaman yang target ID-nya tidak ditemukan.`,
      selector: brokenAnchors.slice(0, 5).map(link => link.getAttribute('href') || '').join('\n'),
    })
  }

  check()
  if (!isCustomHtml) {
    const width = doc.documentElement.clientWidth
    const scrollWidth = doc.documentElement.scrollWidth
    if (scrollWidth > width + 1) {
      add({
        severity: 'error',
        category: en ? 'Responsive' : 'Responsivitas',
        title: en ? 'Horizontal overflow detected' : 'Terdeteksi overflow horizontal',
        detail: en
          ? `Document width is ${scrollWidth}px while viewport is ${width}px.`
          : `Lebar dokumen ${scrollWidth}px melebihi lebar viewport ${width}px.`,
      })
    }
  }

  const duplicateIds = Array.from(doc.querySelectorAll<HTMLElement>('[id]'))
    .map(element => element.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index)
  check()
  if (duplicateIds.length) {
    add({
      severity: 'warning',
      category: en ? 'Structure' : 'Struktur',
      title: en ? 'Duplicate element IDs detected' : 'ID elemen duplikat terdeteksi',
      detail: en
        ? `Found duplicate IDs: ${[...new Set(duplicateIds)].slice(0, 8).join(', ')}.`
        : `ID duplikat ditemukan: ${[...new Set(duplicateIds)].slice(0, 8).join(', ')}.`,
    })
  }

  const externalLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'))
    .filter(link => !link.rel.split(/\s+/).includes('noopener'))
  check()
  if (externalLinks.length) {
    add({
      severity: 'warning',
      category: en ? 'Security' : 'Keamanan',
      title: en ? 'New-tab links should use noopener' : 'Tautan tab baru disarankan memakai rel="noopener"',
      detail: en ? `Found ${externalLinks.length} links opening a new tab without rel="noopener".` : `Ditemukan ${externalLinks.length} tautan target="_blank" tanpa rel="noopener".`,
    })
  }

  return { scannedAt: new Date().toISOString(), page: pageLabel, title, findings, checks, isCustomHtml }
}

const SAMPLE_HTML_SNIPPET = `<!doctype html>
<html lang="en">
  <head>
    <title>Sample Release Check</title>
    <meta name="description" content="Example HTML document evaluated safely offline using DOMParser without executing scripts." />
  </head>
  <body>
    <main id="main-content">
      <h1>Deployment Summary</h1>
      <img src="/diagram.webp" />
      <a href="https://example.com" target="_blank">External Docs</a>
    </main>
  </body>
</html>`

export function SiteAuditPage() {
  const { language } = useLanguage()
  const isEn = language === 'en'
  const [mode, setMode] = useState<'current' | 'snippet'>('current')
  const [rawHtml, setRawHtml] = useState(SAMPLE_HTML_SNIPPET)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [filter, setFilter] = useState<'all' | Severity>('all')

  const runAudit = () => {
    if (mode === 'current') {
      setResult(inspectDocument(document, window.location.href, isEn, false))
      return
    }
    const parser = new DOMParser()
    const parsedDoc = parser.parseFromString(rawHtml.slice(0, 200_000), 'text/html')
    setResult(inspectDocument(parsedDoc, isEn ? 'Custom HTML Snippet (Offline DOMParser)' : 'Cuplikan HTML Kustom (DOMParser Offline)', isEn, true))
  }

  const visibleFindings = useMemo(() => result?.findings.filter(item => filter === 'all' || item.severity === filter) ?? [], [result, filter])
  const errors = result?.findings.filter(item => item.severity === 'error').length ?? 0
  const warnings = result?.findings.filter(item => item.severity === 'warning').length ?? 0
  const score = result ? Math.max(0, Math.round(100 - errors * 12 - warnings * 5)) : null

  const exportReport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify({ ...result, score }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dreamex-page-audit-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main id="main-content" className="container site-audit-page">
      <header className="site-audit-hero">
        <span className="site-audit-eyebrow"><SearchCheck size={15} /> {isEn ? 'ENGINEERING QUALITY TOOL' : 'TOOLS KUALITAS ENGINEERING'}</span>
        <h1>{isEn ? 'Page Health Audit' : 'Audit Kesehatan Halaman'}</h1>
        <p>{isEn ? 'Inspect the live rendered page or safely parse external HTML snippets offline via sandboxed DOMParser—nothing is uploaded or executed.' : 'Periksa halaman yang sedang tampil atau analisis cuplikan HTML eksternal secara offline lewat DOMParser aman—tanpa unggah maupun eksekusi skrip.'}</p>

        <div className="site-audit-mode-switch" role="tablist" aria-label={isEn ? 'Audit target mode' : 'Mode target audit'}>
          <button type="button" role="tab" aria-selected={mode === 'current'} className={mode === 'current' ? 'is-active' : ''} onClick={() => setMode('current')}>
            <Activity size={14} /> {isEn ? 'Current Live Page' : 'Halaman Aktif Ini'}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'snippet'} className={mode === 'snippet' ? 'is-active' : ''} onClick={() => setMode('snippet')}>
            <Code2 size={14} /> {isEn ? 'Inspect Custom HTML' : 'Audit HTML Eksternal'}
          </button>
        </div>

        {mode === 'snippet' && (
          <div className="site-audit-snippet-box">
            <label htmlFor="site-audit-html-input">{isEn ? 'Paste static HTML document markup (max 200 KB, scripts never execute)' : 'Tempel markup HTML statis (maks 200 KB, skrip tidak pernah dieksekusi)'}</label>
            <textarea
              id="site-audit-html-input"
              value={rawHtml}
              onChange={e => setRawHtml(e.target.value)}
              rows={7}
              spellCheck={false}
            />
          </div>
        )}

        <div className="site-audit-actions">
          <button type="button" className="site-audit-primary" onClick={runAudit}><Activity size={16} /> {isEn ? 'Run audit' : 'Jalankan audit'}</button>
          <button type="button" className="site-audit-secondary" onClick={exportReport} disabled={!result}><Download size={16} /> {isEn ? 'Export JSON' : 'Ekspor JSON'}</button>
          <button type="button" className="site-audit-secondary" onClick={runAudit}><RefreshCw size={16} /> {isEn ? 'Refresh results' : 'Perbarui hasil'}</button>
        </div>
        <p className="site-audit-privacy"><ShieldCheck size={15} /> {isEn ? 'Local-only inspection · no network requests · sandboxed DOMParser' : 'Pemeriksaan lokal · tanpa permintaan jaringan · DOMParser terisolasi'}</p>
      </header>
      {!result ? (
        <section className="site-audit-empty" aria-live="polite">
          <SearchCheck size={28} />
          <h2>{isEn ? 'Ready to inspect markup & DOM health' : 'Siap memeriksa kesehatan markup & DOM'}</h2>
          <p>{isEn ? 'The audit checks metadata, landmarks, headings, accessible names, anchor targets, duplicate IDs, new-tab rel="noopener", and horizontal overflow.' : 'Audit memeriksa metadata, landmark, heading, nama aksesibel, target tautan, ID duplikat, tautan rel="noopener", dan horizontal overflow.'}</p>
        </section>
      ) : (
        <>
          <section className="site-audit-summary" aria-label={isEn ? 'Audit summary' : 'Ringkasan audit'}>
            <article className="site-audit-metric site-audit-score"><span>{isEn ? 'Heuristic score' : 'Skor heuristik'}</span><strong>{score}<small>/100</small></strong><p>{isEn ? 'Not a compliance certification' : 'Bukan sertifikasi kepatuhan'}</p></article>
            <article className="site-audit-metric"><span>{isEn ? 'Checks performed' : 'Pemeriksaan'}</span><strong>{result.checks}</strong><p>{isEn ? 'Local DOM checks' : 'Pemeriksaan DOM lokal'}</p></article>
            <article className="site-audit-metric site-audit-errors"><span>{isEn ? 'Errors' : 'Error'}</span><strong>{errors}</strong><p>{isEn ? 'High-priority findings' : 'Temuan prioritas tinggi'}</p></article>
            <article className="site-audit-metric site-audit-warnings"><span>{isEn ? 'Warnings' : 'Peringatan'}</span><strong>{warnings}</strong><p>{isEn ? 'Review recommended' : 'Disarankan ditinjau'}</p></article>
          </section>
          <div className="dx-split-grid">
            <div className="dx-kpi-card">
              <div className="dx-kpi-copy">
                <span className="dx-kpi-label">{isEn ? 'HEURISTIC DOM SCORE' : 'SKOR HEURISTIK DOM'}</span>
                <strong className="dx-kpi-value">{score}/100</strong>
                <span className="dx-kpi-sub">{isEn ? `${result.checks} DOM assertions evaluated` : `${result.checks} pemeriksaan DOM dievaluasi`}</span>
              </div>
              <SvgRingGauge
                value={score ?? 0}
                label={isEn ? 'Heuristic DOM quality gauge' : 'Indikator skor kualitas DOM'}
                tone={(score ?? 0) >= 90 ? 'emerald' : (score ?? 0) >= 70 ? 'cyan' : 'rose'}
                size={64}
              />
            </div>
            <SvgStackedBar
              title={isEn ? 'Findings by Severity' : 'Temuan Berdasarkan Severitas'}
              totalLabel={`${result.findings.length} ${isEn ? 'findings' : 'temuan'}`}
              segments={[
                { label: isEn ? 'Errors' : 'Error', value: errors, color: '#fb7185' },
                { label: isEn ? 'Warnings' : 'Peringatan', value: warnings, color: '#fbbf24' },
                { label: 'Info', value: result.findings.filter(f => f.severity === 'info').length, color: '#38bdf8' },
              ]}
            />
          </div>
          <section className="site-audit-results">
            <div className="site-audit-results-head">
              <div><h2>{isEn ? 'Findings' : 'Temuan'}</h2><p>{result.title || (isEn ? 'Untitled page' : 'Halaman tanpa judul')} · {new Date(result.scannedAt).toLocaleString(isEn ? 'en-US' : 'id-ID')}</p></div>
              <div className="site-audit-filters" role="group" aria-label={isEn ? 'Filter findings' : 'Filter temuan'}>
                {(['all', 'error', 'warning', 'info'] as const).map(value => (
                  <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                    {value === 'all' ? (isEn ? 'All' : 'Semua') : value === 'error' ? (isEn ? 'Errors' : 'Error') : value === 'warning' ? (isEn ? 'Warnings' : 'Peringatan') : 'Info'}
                  </button>
                ))}
              </div>
            </div>
            {visibleFindings.length ? (
              <ul className="site-audit-finding-list">
                {visibleFindings.map(item => (
                  <li key={item.id} className={`site-audit-finding severity-${item.severity}`}>
                    <span className="site-audit-severity-icon">
                      {item.severity === 'error' ? <AlertTriangle size={18} /> : item.severity === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                    </span>
                    <div>
                      <div className="site-audit-finding-meta"><span>{item.category}</span><span>{item.severity}</span></div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                      {item.selector && <pre>{item.selector}</pre>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="site-audit-no-findings"><CheckCircle2 size={22} /><p>{isEn ? 'No findings in this filter. This does not guarantee the markup is defect-free.' : 'Tidak ada temuan pada filter ini. Ini tidak menjamin markup bebas dari cacat.'}</p></div>
            )}
          </section>
          <AiCopilotPanel
            kicker={isEn ? 'PAGE AUDIT CO-PILOT' : 'KO-PILOT AUDIT HALAMAN'}
            title={isEn ? 'Accessibility & DOM Quality Brief' : 'Ringkasan Aksesibilitas & Kualitas DOM'}
            summaryLines={[
              isEn ? `Heuristic DOM score for ${result.page}: ${score}/100 across ${result.checks} checks.` : `Skor heuristik DOM untuk ${result.page}: ${score}/100 dari ${result.checks} pemeriksaan.`,
              isEn ? `Detected signals: ${errors} errors, ${warnings} warnings.` : `Sinyal terdeteksi: ${errors} error, ${warnings} peringatan.`,
            ]}
            recommendations={[
              ...(errors > 0 || warnings > 0
                ? [isEn ? `Address top flagged items (${result.findings.slice(0, 3).map(f => f.title).join(', ')}).` : `Tangani temuan teratas (${result.findings.slice(0, 3).map(f => f.title).join(', ')}).`]
                : [isEn ? 'Zero DOM errors or warnings found in this local scan.' : 'Tidak ada error atau peringatan DOM dalam pemindaian ini.']),
              isEn ? 'Follow up with Playwright axe-core and manual keyboard tab-order verification.' : 'Lanjutkan dengan pengujian Playwright axe-core dan navigasi keyboard manual.',
            ]}
            systemPrompt="You are an accessibility and web quality specialist. Summarize actionable remediation steps strictly from DOM heuristic findings."
            userPrompt={`Target=${result.page}, Score=${score}/100, Checks=${result.checks}, Errors=${errors}, Warnings=${warnings}. Findings=${result.findings.slice(0, 5).map(f => `[${f.severity}] ${f.title}`).join('; ') || 'none'}. Give 3 fixes.`}
            en={isEn}
          />
          <p className="site-audit-footnote">
            {isEn
              ? `Scanned ${result.page}. External resources, real user performance, contrast, keyboard flows, and server behavior are not fully assessed by this lightweight audit.`
              : `Target pemeriksaan: ${result.page}. Resource eksternal, performa pengguna nyata, kontras warna, alur keyboard, dan perilaku server tidak sepenuhnya dinilai oleh audit ringan ini.`}
          </p>
        </>
      )}
    </main>
  )
}
