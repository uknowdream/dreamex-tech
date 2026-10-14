import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, Clipboard, Code2, ShieldCheck, Sparkles } from 'lucide-react'
import { useLanguage } from './i18n'
import './PlaywrightStarterGenerator.css'

type Assertion = 'heading' | 'main' | 'overflow'

function containsControlCharacters(value: string): boolean {
  return [...value].some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
}

function normalizeRoute(value: string): string | null {
  const route = value.trim()
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\\\') || containsControlCharacters(route)) return null
  const rawPath = route.split(/[?#]/, 1)[0]
  if (rawPath.split('/').some(segment => segment === '.' || segment === '..')) return null
  try {
    const url = new URL(route, 'https://example.test')
    if (url.origin !== 'https://example.test') return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}

function downloadSpec(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PlaywrightStarterGenerator() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [testTitle, setTestTitle] = useState('API Playground exposes a clear request workflow')
  const [routeInput, setRouteInput] = useState('/api-playground')
  const [expectedHeading, setExpectedHeading] = useState('Explore APIs. Understand responses.')
  const [assertions, setAssertions] = useState<Assertion[]>(['heading', 'main', 'overflow'])
  const [syntax, setSyntax] = useState<'ts' | 'js'>('ts')
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const route = useMemo(() => normalizeRoute(routeInput), [routeInput])
  const validation = useMemo(() => {
    if (!testTitle.trim()) return en ? 'Enter a descriptive test title.' : 'Masukkan judul pengujian yang jelas.'
    if (testTitle.trim().length > 120) return en ? 'Test titles must be 120 characters or fewer.' : 'Judul tes maksimal 120 karakter.'
    if (!route) return en ? 'Use a same-origin relative route such as /api-playground. Protocol-relative, backslash, control, and dot-segment paths are rejected.' : 'Gunakan route relatif same-origin seperti /api-playground. Path protocol-relative, backslash, karakter kontrol, dan segmen titik ditolak.'
    if (!assertions.length) return en ? 'Select at least one assertion.' : 'Pilih minimal satu assertion.'
    if (assertions.includes('heading') && !expectedHeading.trim()) return en ? 'Enter the expected heading or disable the heading assertion.' : 'Masukkan heading yang diharapkan atau nonaktifkan assertion heading.'
    if (expectedHeading.length > 180) return en ? 'Expected heading must be 180 characters or fewer.' : 'Heading yang diharapkan maksimal 180 karakter.'
    return ''
  }, [en, testTitle, route, assertions, expectedHeading])
  const generated = useMemo(() => {
    if (validation || !route) return ''
    const lines = [
      '// Generated starter — review selectors and assertions before use.',
      "import { test, expect } from '@playwright/test'",
      '',
      'test(' + JSON.stringify(testTitle.trim()) + ', async ({ page }) => {',
      '  await page.goto(' + JSON.stringify(route) + ')',
    ]
    if (assertions.includes('main')) lines.push("  await expect(page.locator('main#main-content')).toBeVisible()")
    if (assertions.includes('heading')) lines.push('  await expect(page.getByRole(\'heading\', { level: 1, name: ' + JSON.stringify(expectedHeading.trim()) + ' })).toBeVisible()')
    if (assertions.includes('overflow')) lines.push(
      '  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }))',
      '  expect(widths.document).toBeLessThanOrEqual(widths.viewport)',
    )
    lines.push('})', '')
    return lines.join('\n')
  }, [validation, route, testTitle, assertions, expectedHeading])
  useEffect(() => setDraft(generated), [generated])
  const toggleAssertion = (value: Assertion) => setAssertions(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  const filename = syntax === 'ts' ? 'dreamex-playwright-starter.spec.ts' : 'dreamex-playwright-starter.spec.js'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setNotice(en ? 'Spec copied to clipboard.' : 'Spec disalin ke clipboard.')
    } catch {
      setNotice(en ? 'Clipboard access was blocked; download the spec instead.' : 'Akses clipboard diblokir; unduh spec sebagai gantinya.')
    }
  }
  return <section className="playwright-starter" aria-labelledby="playwright-starter-title">
    <header className="playwright-starter-heading">
      <div><span className="section-kicker"><Code2 size={14}/> E2E ENGINEERING / PLAYWRIGHT</span><h2 id="playwright-starter-title">{en ? 'Playwright starter generator' : 'Generator starter Playwright'}</h2><p>{en ? 'Create a safe, editable test scaffold from a route and explicit assertions.' : 'Buat kerangka tes yang aman dan dapat diedit dari route dan assertion eksplisit.'}</p></div>
      <span className="playwright-starter-local"><ShieldCheck size={14}/>{en ? 'Generated locally' : 'Dibuat lokal'}</span>
    </header>
    <div className="playwright-starter-grid">
      <div className="playwright-starter-inputs">
        <label>{en ? 'Test title' : 'Judul tes'}<input aria-label={en ? 'Test title' : 'Judul tes'} value={testTitle} onChange={event => setTestTitle(event.target.value.slice(0, 160))} maxLength={160}/></label>
        <label>{en ? 'Relative route' : 'Route relatif'}<input aria-label={en ? 'Relative route' : 'Route relatif'} value={routeInput} onChange={event => setRouteInput(event.target.value.slice(0, 500))} maxLength={500} spellCheck={false} placeholder="/feature-route"/></label>
        <label>{en ? 'Expected H1 text' : 'Teks H1 yang diharapkan'}<input aria-label={en ? 'Expected H1 text' : 'Teks H1 yang diharapkan'} value={expectedHeading} onChange={event => setExpectedHeading(event.target.value.slice(0, 220))} maxLength={220}/></label>
        <label>{en ? 'Output syntax' : 'Sintaks output'}<select aria-label={en ? 'Output syntax' : 'Sintaks output'} value={syntax} onChange={event => setSyntax(event.target.value as 'ts' | 'js')}><option value="ts">TypeScript · .spec.ts</option><option value="js">JavaScript · .spec.js</option></select></label>
        <fieldset><legend>{en ? 'Assertions to include' : 'Assertion yang disertakan'}</legend>
          <label><input type="checkbox" checked={assertions.includes('heading')} onChange={() => toggleAssertion('heading')}/><span>{en ? 'Expected H1 is visible' : 'H1 yang diharapkan terlihat'}</span></label>
          <label><input type="checkbox" checked={assertions.includes('main')} onChange={() => toggleAssertion('main')}/><span>{en ? 'Main content landmark is visible' : 'Landmark konten utama terlihat'}</span></label>
          <label><input type="checkbox" checked={assertions.includes('overflow')} onChange={() => toggleAssertion('overflow')}/><span>{en ? 'No horizontal document overflow' : 'Tidak ada overflow horizontal dokumen'}</span></label>
        </fieldset>
        {validation && <p className="playwright-starter-error" role="alert">{validation}</p>}
        <div className="playwright-starter-guardrail"><ShieldCheck size={15}/><p>{en ? 'The route must stay same-origin. Values are safely escaped as JavaScript string literals. The generated test is a scaffold, not an executed test or a guarantee that the target page matches.' : 'Route harus tetap same-origin. Nilai di-escape dengan aman sebagai literal string JavaScript. Tes yang dibuat adalah kerangka, bukan tes yang sudah dijalankan atau jaminan bahwa halaman target sesuai.'}</p></div>
      </div>
      <div className="playwright-starter-output">
        <div className="playwright-starter-output-head"><div><span className="section-kicker">01 / EDITABLE SPEC</span><h3>{en ? 'Review and adapt the test' : 'Tinjau dan sesuaikan tes'}</h3></div><span>{filename}</span></div>
        <textarea aria-label={en ? 'Editable Playwright test' : 'Tes Playwright yang dapat diedit'} value={draft} onChange={event => setDraft(event.target.value)} readOnly={Boolean(validation)} spellCheck={false} rows={17}/>
        <div className="playwright-starter-actions"><button type="button" className="button button-secondary" onClick={() => void copy()} disabled={!draft}><Clipboard size={15}/>{en ? 'Copy spec' : 'Salin spec'}</button><button type="button" className="button button-primary" onClick={() => downloadSpec(draft, filename)} disabled={!draft}><ArrowDownToLine size={15}/>{en ? 'Download spec' : 'Unduh spec'}</button></div>
        <p className="playwright-starter-note"><Sparkles size={14}/>{en ? 'Generated from your current inputs. Editing the inputs refreshes the scaffold; edit the code after you finish configuring it.' : 'Dibuat dari input saat ini. Mengubah input akan memperbarui kerangka; edit kode setelah konfigurasi selesai.'}</p>
        {notice && <p className="command-center-notice" role="status">{notice}</p>}
      </div>
    </div>
  </section>
}
