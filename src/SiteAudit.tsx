import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Download, RefreshCw, ShieldCheck, SearchCheck } from 'lucide-react'
import { useLanguage } from './i18n'
import './SiteAudit.css'

type Severity = 'error' | 'warning' | 'info'
type Finding = { id: string; severity: Severity; category: string; title: string; detail: string; selector?: string }
type AuditResult = { scannedAt: string; page: string; title: string; findings: Finding[]; checks: number }

function inspectCurrentPage(): AuditResult {
  const findings: Finding[] = []
  let checks = 0
  const add = (finding: Omit<Finding, 'id'>) => findings.push({ ...finding, id: `${finding.category}-${findings.length + 1}` })
  const check = () => { checks += 1 }
  const title = document.title.trim()
  check()
  if (!title) add({ severity: 'error', category: 'SEO', title: 'Page title is missing', detail: 'Add a descriptive document title.' })
  else if (title.length < 20 || title.length > 65) add({ severity: 'warning', category: 'SEO', title: 'Page title length may need review', detail: `Current title is ${title.length} characters; a concise, unique title is usually easier to scan.` })
  check()
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content?.trim() ?? ''
  if (!description) add({ severity: 'error', category: 'SEO', title: 'Meta description is missing', detail: 'Add a useful page-specific description.' })
  else if (description.length < 50 || description.length > 180) add({ severity: 'warning', category: 'SEO', title: 'Meta description length may need review', detail: `Current description is ${description.length} characters.` })
  check()
  if (!document.documentElement.lang) add({ severity: 'error', category: 'Accessibility', title: 'Document language is missing', detail: 'Set a valid lang attribute on the html element.' })
  check()
  const h1s = document.querySelectorAll('main h1, main#main-content h1')
  if (h1s.length === 0) add({ severity: 'error', category: 'Structure', title: 'No primary heading found in main content', detail: 'Provide a clear page-level heading.' })
  else if (h1s.length > 1) add({ severity: 'warning', category: 'Structure', title: 'Multiple primary headings found', detail: `Found ${h1s.length} h1 elements in main content; confirm the hierarchy is intentional.` })
  check()
  if (!document.querySelector('main')) add({ severity: 'error', category: 'Accessibility', title: 'Main landmark is missing', detail: 'Use one main landmark for the page’s primary content.' })
  const images = Array.from(document.images)
  check()
  const missingAlt = images.filter(image => !image.hasAttribute('alt'))
  if (missingAlt.length) add({ severity: 'error', category: 'Accessibility', title: 'Images missing alt attributes', detail: `${missingAlt.length} of ${images.length} images do not have an alt attribute. Decorative images should use alt="".`, selector: missingAlt.slice(0, 5).map(image => image.currentSrc || image.src).join('\n') })
  const unnamedLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(link => !((link.innerText || '').trim() || link.getAttribute('aria-label') || link.querySelector('img[alt]')))
  check()
  if (unnamedLinks.length) add({ severity: 'warning', category: 'Accessibility', title: 'Links without an accessible name', detail: `Found ${unnamedLinks.length} links without visible text, aria-label, or a labelled image.`, selector: unnamedLinks.slice(0, 5).map(link => link.href).join('\n') })
  const unnamedButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(button => !((button.innerText || '').trim() || button.getAttribute('aria-label') || button.getAttribute('title')))
  check()
  if (unnamedButtons.length) add({ severity: 'warning', category: 'Accessibility', title: 'Buttons without an accessible name', detail: `Found ${unnamedButtons.length} buttons without text, aria-label, or title.`, selector: unnamedButtons.slice(0, 5).map(button => button.outerHTML.slice(0, 180)).join('\n') })
  const allIds = new Set(Array.from(document.querySelectorAll('[id]')).map(element => element.id))
  const brokenAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).filter(link => {
    const target = link.getAttribute('href')?.slice(1)
    if (!target) return false
    try { return !allIds.has(decodeURIComponent(target)) } catch { return true }
  })
  check()
  if (brokenAnchors.length) add({ severity: 'warning', category: 'Navigation', title: 'In-page links have missing targets', detail: `Found ${brokenAnchors.length} same-page links pointing to IDs that do not exist.`, selector: brokenAnchors.slice(0, 5).map(link => link.getAttribute('href') || '').join('\n') })
  const width = document.documentElement.clientWidth
  const scrollWidth = document.documentElement.scrollWidth
  check()
  if (scrollWidth > width + 1) add({ severity: 'error', category: 'Responsive', title: 'Horizontal overflow detected', detail: `Document width is ${scrollWidth}px while the viewport is ${width}px. Try narrower viewport widths to isolate the element.` })
  const duplicateIds = Array.from(document.querySelectorAll<HTMLElement>('[id]')).map(element => element.id).filter((id, index, ids) => ids.indexOf(id) !== index)
  check()
  if (duplicateIds.length) add({ severity: 'warning', category: 'Structure', title: 'Duplicate element IDs detected', detail: `Found duplicate IDs: ${[...new Set(duplicateIds)].slice(0, 8).join(', ')}.` })
  const externalLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')).filter(link => !link.rel.split(/\s+/).includes('noopener'))
  check()
  if (externalLinks.length) add({ severity: 'warning', category: 'Security', title: 'New-tab links should use noopener', detail: `Found ${externalLinks.length} links opening a new tab without rel="noopener".` })
  return { scannedAt: new Date().toISOString(), page: window.location.href, title, findings, checks }
}

export function SiteAuditPage() {
  const { language } = useLanguage()
  const isEn = language === 'en'
  const [result, setResult] = useState<AuditResult | null>(null)
  const [filter, setFilter] = useState<'all' | Severity>('all')
  const runAudit = () => setResult(inspectCurrentPage())
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
  return <main id="main-content" className="container site-audit-page">
    <header className="site-audit-hero">
      <span className="site-audit-eyebrow"><SearchCheck size={15} /> {isEn ? 'ENGINEERING QUALITY TOOL' : 'TOOLS KUALITAS ENGINEERING'}</span>
      <h1>{isEn ? 'Page Health Audit' : 'Audit Kesehatan Halaman'}</h1>
      <p>{isEn ? 'Run a local, privacy-friendly audit of the page currently rendered in this browser. Nothing is uploaded; results are heuristic and should be verified.' : 'Jalankan audit lokal yang menjaga privasi untuk halaman yang sedang tampil di browser. Tidak ada data yang diunggah; hasil bersifat heuristik dan perlu diverifikasi.'}</p>
      <div className="site-audit-actions">
        <button type="button" className="site-audit-primary" onClick={runAudit}><Activity size={16} /> {isEn ? 'Run audit' : 'Jalankan audit'}</button>
        <button type="button" className="site-audit-secondary" onClick={exportReport} disabled={!result}><Download size={16} /> {isEn ? 'Export JSON' : 'Ekspor JSON'}</button>
        <button type="button" className="site-audit-secondary" onClick={runAudit}><RefreshCw size={16} /> {isEn ? 'Refresh results' : 'Perbarui hasil'}</button>
      </div>
      <p className="site-audit-privacy"><ShieldCheck size={15} /> {isEn ? 'Local-only inspection · no network requests · no credentials collected' : 'Pemeriksaan lokal · tanpa permintaan jaringan · tidak mengumpulkan kredensial'}</p>
    </header>
    {!result ? <section className="site-audit-empty" aria-live="polite"><SearchCheck size={28} /><h2>{isEn ? 'Ready to inspect this page' : 'Siap memeriksa halaman ini'}</h2><p>{isEn ? 'The audit checks metadata, landmarks, headings, accessible names, anchor targets, duplicate IDs, new-tab links, and horizontal overflow.' : 'Audit memeriksa metadata, landmark, heading, nama aksesibel, target tautan, ID duplikat, tautan tab baru, dan horizontal overflow.'}</p></section> : <>
      <section className="site-audit-summary" aria-label={isEn ? 'Audit summary' : 'Ringkasan audit'}>
        <article className="site-audit-metric site-audit-score"><span>{isEn ? 'Heuristic score' : 'Skor heuristik'}</span><strong>{score}<small>/100</small></strong><p>{isEn ? 'Not a compliance certification' : 'Bukan sertifikasi kepatuhan'}</p></article>
        <article className="site-audit-metric"><span>{isEn ? 'Checks performed' : 'Pemeriksaan'}</span><strong>{result.checks}</strong><p>{isEn ? 'Local DOM checks' : 'Pemeriksaan DOM lokal'}</p></article>
        <article className="site-audit-metric site-audit-errors"><span>{isEn ? 'Errors' : 'Error'}</span><strong>{errors}</strong><p>{isEn ? 'High-priority findings' : 'Temuan prioritas tinggi'}</p></article>
        <article className="site-audit-metric site-audit-warnings"><span>{isEn ? 'Warnings' : 'Peringatan'}</span><strong>{warnings}</strong><p>{isEn ? 'Review recommended' : 'Disarankan untuk ditinjau'}</p></article>
      </section>
      <section className="site-audit-results">
        <div className="site-audit-results-head"><div><h2>{isEn ? 'Findings' : 'Temuan'}</h2><p>{result.title || (isEn ? 'Untitled page' : 'Halaman tanpa judul')} · {new Date(result.scannedAt).toLocaleString(isEn ? 'en-US' : 'id-ID')}</p></div>
          <div className="site-audit-filters" role="group" aria-label={isEn ? 'Filter findings' : 'Filter temuan'}>
            {(['all', 'error', 'warning', 'info'] as const).map(value => <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? (isEn ? 'All' : 'Semua') : value === 'error' ? (isEn ? 'Errors' : 'Error') : value === 'warning' ? (isEn ? 'Warnings' : 'Peringatan') : 'Info'}</button>)}
          </div>
        </div>
        {visibleFindings.length ? <ul className="site-audit-finding-list">{visibleFindings.map(item => <li key={item.id} className={`site-audit-finding severity-${item.severity}`}><span className="site-audit-severity-icon">{item.severity === 'error' ? <AlertTriangle size={18} /> : item.severity === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span><div><div className="site-audit-finding-meta"><span>{item.category}</span><span>{item.severity}</span></div><h3>{item.title}</h3><p>{item.detail}</p>{item.selector && <pre>{item.selector}</pre>}</div></li>)}</ul> : <div className="site-audit-no-findings"><CheckCircle2 size={22} /><p>{isEn ? 'No findings in this filter. This does not guarantee the page is defect-free.' : 'Tidak ada temuan pada filter ini. Ini tidak menjamin halaman bebas dari cacat.'}</p></div>}
      </section>
      <p className="site-audit-footnote">{isEn ? `Scanned ${result.page}. External resources, real user performance, contrast, keyboard flows, and server behavior are not fully assessed by this lightweight audit.` : `Halaman yang diperiksa: ${result.page}. Resource eksternal, performa pengguna nyata, kontras, alur keyboard, dan perilaku server tidak sepenuhnya dinilai oleh audit ringan ini.`}</p>
    </>}
  </main>
}
