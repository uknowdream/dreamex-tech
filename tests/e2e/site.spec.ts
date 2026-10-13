import { expect, test, type Page } from '@playwright/test'

async function openMobileNavigation(page: Page) {
  // Navigation collapses at tablet and compact desktop widths, not only on phones.
  const toggle = page.getByRole('button', { name: /open menu|buka menu/i })
  if (await toggle.isVisible()) await toggle.click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('homepage renders primary content and skip navigation', async ({ page }) => {
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main-content')
  await expect(page.locator('#latest')).toBeVisible()
  await openMobileNavigation(page)
  await expect(page.getByRole('navigation').first()).toBeVisible()
})

test('homepage and article expose valid JSON-LD and page-specific canonical metadata', async ({ page }) => {
  const homepageSchemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes =>
    nodes.map(node => JSON.parse(node.textContent ?? '{}'))
  )
  expect(homepageSchemas.some(schema => schema['@graph']?.some((entry: { '@type'?: string }) => entry['@type'] === 'Organization'))).toBeTruthy()
  expect(homepageSchemas.some(schema => schema['@graph']?.some((entry: { '@type'?: string }) => entry['@type'] === 'WebSite'))).toBeTruthy()
  await page.locator('.article-card h3 a').first().click()
  await expect(page).toHaveURL(/\/blog\//)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/dreamex\.tech\/blog\//)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /^https:\/\/dreamex\.tech\/blog\//)
  const articleSchema = await page.locator('script[data-article-schema="true"]').evaluate(node => JSON.parse(node.textContent ?? '{}'))
  expect(articleSchema['@type']).toBe('Article')
  expect(articleSchema.headline).toBeTruthy()
  expect(articleSchema.mainEntityOfPage).toMatch(/^https:\/\/dreamex\.tech\/blog\//)
})

test('language switch updates interface language and document lang', async ({ page }) => {
  await openMobileNavigation(page)
  await page.getByRole('button', { name: 'ID', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.getByRole('heading', { name: /Berpikir lebih dalam/i })).toBeVisible()
  await openMobileNavigation(page)
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: /Think deeper/i })).toBeVisible()
})

test('search filters articles and clear-search restores results', async ({ page }) => {
  const search = page.getByRole('textbox', { name: /search articles/i })
  const initialCount = await page.locator('.article-card').count()
  expect(initialCount).toBeGreaterThan(0)
  await search.fill('zz-no-matching-dreamex-query-zz')
  await expect(page.locator('.empty-state')).toBeVisible()
  await search.fill('QA')
  await expect(page.locator('.article-card').first()).toBeVisible()
  await page.getByRole('button', { name: /clear search/i }).click()
  await expect(search).toHaveValue('')
  await expect(page.locator('.article-card')).toHaveCount(initialCount)
})

test('articles can be saved to and removed from the personal reading list', async ({ page }) => {
  const firstArticle = page.locator('.article-card').first()
  const articleTitle = (await firstArticle.locator('h3 a').innerText()).trim()
  await firstArticle.getByRole('button', { name: /save article|simpan artikel/i }).click()
  await expect(firstArticle.getByRole('button', { name: /remove saved article|hapus artikel tersimpan/i })).toHaveAttribute('aria-pressed', 'true')
  await openMobileNavigation(page)
  await page.getByRole('navigation').getByRole('link', { name: /reading list|daftar bacaan/i }).click()
  await expect(page).toHaveURL(/\/reading-list$/)
  await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible()
  await page.getByRole('button', { name: /remove saved article|hapus artikel tersimpan/i }).click()
  await expect(page.getByText(/your reading list is ready|daftar bacaan anda siap/i)).toBeVisible()
})

test('category filters expose selected state and can be reset', async ({ page }) => {
  const qaFilter = page.getByRole('button', { name: 'QA Automation', exact: true })
  await qaFilter.click()
  await expect(qaFilter).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.article-card').first()).toBeVisible()
  const allFilter = page.getByRole('button', { name: 'All', exact: true })
  await allFilter.click()
  await expect(allFilter).toHaveAttribute('aria-pressed', 'true')
})

test('Engineering Lab generates QA cases, bug reports, and formatted JSON', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: /generate test cases|buat test case/i }).click()
  await expect(page.getByRole('heading', { name: /generated test cases|test case yang dihasilkan/i })).toBeVisible()
  await expect(page.locator('.lab-case')).toHaveCount(8)

  await page.getByRole('tab', { name: /JSON formatter|JSON Formatter/i }).click()
  await page.getByRole('textbox', { name: /JSON input|input JSON/i }).fill('{"ok":true,"count":2}')
  await page.getByRole('button', { name: /format JSON|rapikan JSON/i }).click()
  await expect(page.getByLabel(/formatted JSON output|hasil JSON terformat/i)).toContainText('"ok": true')

  await page.getByRole('tab', { name: /bug report|laporan bug/i }).click()
  await page.getByRole('textbox', { name: /bug title|judul bug/i }).fill('Button does not respond')
  await page.getByRole('button', { name: /generate bug report|buat laporan bug/i }).click()
  await expect(page.getByRole('heading', { name: /ready-to-copy report|laporan siap disalin/i })).toBeVisible()
  await expect(page.locator('.lab-output')).toContainText('Button does not respond')
})

test('Learning Hub exposes curated paths and searchable glossary', async ({ page }) => {
  await page.goto('/learn')
  await expect(page.getByRole('heading', { name: /learn with|belajar lebih/i })).toBeVisible()
  await expect(page.locator('.learning-path-card')).toHaveCount(4)
  await page.getByRole('tab', { name: /engineering glossary|glosarium engineering/i }).click()
  await expect(page.locator('.glossary-card')).toHaveCount(12)
  await page.getByRole('textbox', { name: /search glossary|cari glosarium/i }).fill('idempotency')
  await expect(page.locator('.glossary-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Idempotency' })).toBeVisible()
})

test('about page loads through client navigation', async ({ page }) => {
  await openMobileNavigation(page)
  await page.getByRole('link', { name: 'About', exact: true }).click()
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { name: /Turn curiosity into/i })).toBeVisible()
})

test('article routes load and invalid article slugs show a useful not-found state', async ({ page }) => {
  const articleLink = page.locator('.article-card h3 a').first()
  await articleLink.click()
  await expect(page).toHaveURL(/\/blog\//)
  await expect(page.locator('main h1').first()).toBeVisible()
  await page.goto('/blog/this-article-does-not-exist')
  await expect(page.getByRole('heading', { name: /Article not found/i })).toBeVisible()
})

test('installable PWA exposes an install action when the browser supports it', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const installEvent = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(installEvent, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })
    window.dispatchEvent(installEvent)
  })
  await openMobileNavigation(page)
  const installButton = page.getByRole('button', { name: /install app|pasang aplikasi/i })
  await expect(installButton).toBeVisible()
  await installButton.click()
  await expect(page.getByRole('status').filter({ hasText: /installation accepted|pemasangan disetujui/i })).toBeVisible()
})

test('article citation can be copied as a Markdown reference', async ({ page }) => {
  await page.goto('/blog/qa-automation-foundations')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          ;(window as Window & { __copiedCitation?: string }).__copiedCitation = text
        },
      },
    })
  })
  const citationButton = page.getByRole('button', { name: /copy markdown citation/i })
  await expect(citationButton).toBeVisible()
  await citationButton.click()
  await expect(page.getByRole('button', { name: /citation copied/i })).toBeVisible()
  const citation = await page.evaluate(() => (window as Window & { __copiedCitation?: string }).__copiedCitation ?? '')
  expect(citation).toMatch(/^\[.+\]\(https:\/\/dreamex\.tech\/blog\/qa-automation-foundations\) — DreamEx Tech \(\d{4}-\d{2}-\d{2}\)$/)
})

test('reading list can be exported as portable Markdown', async ({ page }) => {
  const firstArticle = page.locator('.article-card').first()
  const title = (await firstArticle.locator('h3 a').innerText()).trim()
  await firstArticle.getByRole('button', { name: /save article|simpan artikel/i }).click()
  await openMobileNavigation(page)
  await page.getByRole('navigation').getByRole('link', { name: /reading list|daftar bacaan/i }).click()
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { (window as Window & { __readingListExport?: string }).__readingListExport = text } },
    })
  })
  await page.getByRole('button', { name: /copy as markdown/i }).click()
  await expect(page.getByRole('status')).toContainText(/reading list copied as markdown/i)
  const markdown = await page.evaluate(() => (window as Window & { __readingListExport?: string }).__readingListExport ?? '')
  expect(markdown).toContain('# My DreamEx Tech Reading List')
  expect(markdown).toContain(title)
  expect(markdown).toContain('https://dreamex.tech/blog/')
})

test('reading list backup can be imported, validated, and merged', async ({ page }) => {
  const firstArticle = page.locator('.article-card').first()
  await firstArticle.getByRole('button', { name: /save article|simpan artikel/i }).click()
  await openMobileNavigation(page)
  await page.getByRole('navigation').getByRole('link', { name: /reading list|daftar bacaan/i }).click()
  await page.getByLabel(/import reading list json backup/i).setInputFiles({
    name: 'reading-list.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'dreamex-reading-list',
      version: 1,
      slugs: ['qa-automation-foundations', 'typescript-for-maintainable-projects', 'unknown-article', 'qa-automation-foundations'],
    })),
  })
  await expect(page.getByRole('status')).toContainText(/imported 2 valid article|2 artikel valid berhasil diimpor/i)
  await expect(page.locator('.reading-list-count')).toContainText(/2/)
  await expect(page.getByRole('heading', { name: /building a reliable qa automation foundation|membangun fondasi qa automation yang andal/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /typescript for maintainable projects|typescript untuk proyek yang mudah dipelihara/i })).toBeVisible()
  await page.getByLabel(/import reading list json backup/i).setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"not-dreamex","version":1,"slugs":["qa-automation-foundations"]}'),
  })
  await expect(page.getByRole('status')).toContainText(/invalid backup file|file cadangan tidak valid/i)
  await expect(page.locator('.reading-list-count')).toContainText(/2/)
})

test('reading list backup downloads a versioned JSON file', async ({ page }) => {
  await page.locator('.article-card').first().getByRole('button', { name: /save article|simpan artikel/i }).click()
  await openMobileNavigation(page)
  await page.getByRole('navigation').getByRole('link', { name: /reading list|daftar bacaan/i }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /download json backup|unduh cadangan json/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-reading-list.json')
})

test('reading list can search and sort saved articles without losing saved items', async ({ page }) => {
  await page.locator('.article-card').nth(0).getByRole('button', { name: /save article|simpan artikel/i }).click()
  await page.locator('.article-card').nth(1).getByRole('button', { name: /save article|simpan artikel/i }).click()
  await openMobileNavigation(page)
  await page.getByRole('navigation').getByRole('link', { name: /reading list|daftar bacaan/i }).click()
  const search = page.getByRole('searchbox', { name: /search saved articles|cari artikel tersimpan/i })
  await expect(page.locator('.article-card')).toHaveCount(2)
  await search.fill('typescript')
  await expect(page.locator('.article-card')).toHaveCount(1)
  await expect(page.locator('.article-card h3')).toContainText(/typescript for maintainable projects|typescript untuk proyek yang mudah dipelihara/i)
  await search.fill('no-such-reading-item')
  await expect(page.locator('.reading-list-no-results')).toBeVisible()
  await page.getByRole('button', { name: /clear search|hapus pencarian/i }).click()
  await expect(page.locator('.article-card')).toHaveCount(2)
  await page.getByRole('combobox', { name: /sort saved articles|urutkan artikel tersimpan/i }).selectOption('title')
  await expect(page.locator('.reading-list-count')).toContainText(/2/)
})

test('article reading progress exposes accessible percentage semantics', async ({ page }) => {
  await page.goto('/blog/qa-automation-foundations')
  const progress = page.getByRole('progressbar', { name: /article reading progress/i })
  await expect(progress).toBeVisible()
  await expect(progress).toHaveAttribute('aria-valuemin', '0')
  await expect(progress).toHaveAttribute('aria-valuemax', '100')
  await expect(progress).toHaveAttribute('aria-valuenow', /^\d+$/)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, document.documentElement.scrollHeight)
    window.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(async () => Number(await progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
})

test('reading progress is saved and surfaced as a resume-reading card', async ({ page }) => {
  await page.goto('/blog/qa-automation-foundations')
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, document.documentElement.scrollHeight * 0.3)
    window.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dreamex-reading-progress-v1') ?? 'null'))).toMatchObject({ slug: 'qa-automation-foundations' })
  await page.goto('/')
  await expect(page.getByRole('region', { name: /resume reading|lanjutkan membaca/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /continue reading|lanjut membaca/i })).toHaveAttribute('href', '/blog/qa-automation-foundations')
})

test('sitemap includes the public knowledge and engineering routes', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBeTruthy()
  const xml = await response.text()
  for (const route of ['/', '/about', '/lab', '/learn', '/rss']) {
    expect(xml).toContain(`https://dreamex.tech${route}`)
  }
  expect(xml).toContain('<lastmod>')
  expect(xml).not.toContain('/reading-list')
})

test('PWA manifest, icons, and service worker are available', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBeTruthy()
  const manifest = await manifestResponse.json()
  expect(manifest.name).toBe('DreamEx Tech')
  expect(manifest.icons.some((icon: { src: string }) => icon.src === '/icon-192.png')).toBeTruthy()
  expect((await request.get('/icon-192.png')).ok()).toBeTruthy()
  const serviceWorker = await request.get('/sw.js')
  expect(serviceWorker.ok()).toBeTruthy()
  expect(await serviceWorker.text()).toContain("addEventListener('fetch'")
})

test('RSS reading page and machine-readable feed are available', async ({ page, request }) => {
  await page.goto('/rss')
  await expect(page.getByRole('heading', { name: /Ideas worth your time/i })).toBeVisible()
  const subscribeButton = page.getByRole('button', { name: /Copy RSS subscription URL/i })
  await expect(subscribeButton).toBeVisible()
  await expect(page.getByRole('link', { name: /Subscribe to RSS/i })).toHaveCount(0)
  await subscribeButton.click()
  await expect(page.locator('.rss-subscribe-status')).toContainText(/copied|berhasil disalin|https:\/\/www\.dreamex\.tech\/rss\.xml/i)
  await expect(page).toHaveURL(/\/rss$/)
  const response = await request.get('/rss.xml')
  expect(response.ok()).toBeTruthy()
  expect(await response.text()).toContain('<rss version="2.0"')
})

test('unknown routes render a not-found page', async ({ page }) => {
  await page.goto('/this-route-should-not-exist')
  await expect(page.getByRole('heading', { name: /Page not found/i })).toBeVisible()
})

test('desktop navigation adapts to constrained widths without clipping', async ({ page, isMobile }) => {
  test.skip(isMobile, 'This check targets desktop and tablet navigation')
  await page.setViewportSize({ width: 1024, height: 900 })
  const toggle = page.getByRole('button', { name: /open menu|buka menu/i })
  await expect(toggle).toBeVisible()
  await expect(page.locator('.nav-links')).toBeHidden()
  await toggle.click()
  await expect(page.locator('.nav-links')).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: /reading list|daftar bacaan/i })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: /engineering lab|lab engineering/i })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    nav: document.querySelector('.nav-links')?.getBoundingClientRect(),
  }))
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
  expect(dimensions.nav?.right).toBeLessThanOrEqual(dimensions.viewportWidth)
})

test('Engineering Lab generates an API test matrix for the selected endpoint', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /API Test Matrix|Matriks Tes API/i }).click()
  await expect(page.getByLabel(/Endpoint path|Path endpoint/i)).toBeVisible()
  await page.getByRole('button', { name: /Generate API test matrix|Buat matriks tes API/i }).click()
  await expect(page.getByRole('heading', { name: /Generated API scenarios|Skenario API yang dihasilkan/i })).toBeVisible()
  await expect(page.locator('.api-matrix-case')).toHaveCount(10)
  await expect(page.locator('.api-matrix-case').first()).toContainText('POST /api/v1/users')
})

test('Engineering Lab analyzes OpenAPI 3 JSON and lists endpoint operations', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /OpenAPI Analyzer|Analyzer OpenAPI/i }).click()
  await expect(page.getByLabel(/OpenAPI JSON document|Dokumen JSON OpenAPI/i)).toBeVisible()
  await page.getByRole('button', { name: /Analyze contract|Analisis kontrak/i }).click()
  await expect(page.getByRole('heading', { name: /Endpoint inventory|Inventaris endpoint/i })).toBeVisible()
  await expect(page.locator('.openapi-endpoint')).toHaveCount(3)
  await expect(page.locator('.openapi-endpoint').first()).toContainText('/api/v1/users')
  await expect(page.locator('.openapi-endpoint').filter({ hasText: 'POST' })).toContainText('Create a user')
})

test('OpenAPI analyzer shows a clear error for invalid JSON', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /OpenAPI Analyzer|Analyzer OpenAPI/i }).click()
  await page.getByLabel(/OpenAPI JSON document|Dokumen JSON OpenAPI/i).fill('{ invalid json')
  await page.getByRole('button', { name: /Analyze contract|Analisis kontrak/i }).click()
  await expect(page.getByRole('alert')).toContainText(/JSON|json/i)
  await expect(page.locator('.openapi-endpoint')).toHaveCount(0)
})


test('OpenAPI analyzer reports missing responses and invalid path parameter contracts', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /OpenAPI Analyzer|Analyzer OpenAPI/i }).click()
  await page.getByLabel(/OpenAPI JSON document|Dokumen JSON OpenAPI/i).fill(JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Contract issues', version: '1.0.0' },
    paths: {
      '/api/items/{itemId}': {
        get: {
          parameters: [{ name: 'itemId', in: 'path', required: false, schema: { type: 'string' } }],
          responses: { 200: {} },
        },
      },
      '/api/items': { post: { requestBody: { required: true, content: { 'application/json': {} } } } },
    },
  }))
  await page.getByRole('button', { name: /Analyze contract|Analisis kontrak/i }).click()
  await expect(page.getByRole('heading', { name: /Contract quality checks|Pemeriksaan kualitas kontrak/i })).toBeVisible()
  for (const code of ['RESPONSES_MISSING', 'PATH_PARAM_NOT_REQUIRED', 'RESPONSE_DESCRIPTION_MISSING', 'REQUEST_SCHEMA_MISSING']) {
    await expect(page.locator('.openapi-issue').filter({ hasText: code })).toHaveCount(1)
  }
})

test('OpenAPI CSV export safely quotes commas, quotes, and newlines', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /OpenAPI Analyzer|Analyzer OpenAPI/i }).click()
  await page.getByLabel(/OpenAPI JSON document|Dokumen JSON OpenAPI/i).fill(JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'CSV export', version: '1.0.0' },
    paths: { '/api/items': { get: {
      summary: 'List, "all" items\nwith details',
      responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } } },
    } } },
  }))
  await page.getByRole('button', { name: /Analyze contract|Analisis kontrak/i }).click()
  await page.evaluate(() => {
    const original = URL.createObjectURL.bind(URL)
    URL.createObjectURL = ((blob: Blob) => {
      ;(window as Window & { __openApiCsvBlob?: Blob }).__openApiCsvBlob = blob
      return original(blob)
    }) as typeof URL.createObjectURL
  })
  await page.getByRole('button', { name: /Export CSV|Ekspor CSV/i }).click()
  const csv = await page.evaluate(async () => await (window as Window & { __openApiCsvBlob?: Blob }).__openApiCsvBlob?.text() ?? '')
  expect(csv).toContain('"List, ""all"" items\nwith details"')
  await expect(page.getByRole('status')).toContainText(/CSV downloaded|CSV matriks kontrak OpenAPI berhasil diunduh/i)
})


test('release readiness scorecard updates risk and weighted score as critical checks pass', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /Release Readiness|Kesiapan Rilis/i }).click()
  await expect(page.getByRole('heading', { name: /Release readiness scorecard|Scorecard kesiapan rilis/i })).toBeVisible()
  await expect(page.getByRole('img', { name: /Readiness score 0 percent|Skor kesiapan 0 percent/i })).toBeVisible()
  await expect(page.getByText(/Release blocked|Rilis tertahan/i).first()).toBeVisible()
  const firstCritical = page.getByRole('checkbox', { name: /Acceptance criteria are reviewed|Acceptance criteria telah ditinjau/i })
  await firstCritical.check()
  await expect(page.getByRole('img', { name: /Readiness score 11 percent|Skor kesiapan 11 percent/i })).toBeVisible()
  await expect(page.getByText(/Release blocked|Rilis tertahan/i).first()).toBeVisible()
  await expect(page.getByRole('progressbar', { name: /Release checklist completion|Penyelesaian checklist rilis/i })).toHaveAttribute('aria-valuenow', '8')
})

test('release readiness scorecard marks release ready only after every check is complete', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /Release Readiness|Kesiapan Rilis/i }).click()
  const checks = page.locator('.release-check-item input[type="checkbox"]')
  await expect(checks).toHaveCount(12)
  for (const checkbox of await checks.all()) await checkbox.check()
  await expect(page.getByRole('img', { name: /Readiness score 100 percent|Skor kesiapan 100 percent/i })).toBeVisible()
  await expect(page.getByText(/Ready for release|Siap dirilis/i).first()).toBeVisible()
  await expect(page.getByRole('progressbar', { name: /Release checklist completion|Penyelesaian checklist rilis/i })).toHaveAttribute('aria-valuenow', '100')
})

test('incident postmortem builder creates a blameless Markdown report and supports export', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /Incident Postmortem|Postmortem Insiden/i }).click()
  await expect(page.getByRole('heading', { name: /Build a blameless incident postmortem|Susun postmortem insiden tanpa menyalahkan/i })).toBeVisible()
  await page.getByLabel(/Incident title|Judul insiden/i).fill('Checkout latency spike')
  await page.getByLabel(/Customer and business impact|Dampak terhadap pelanggan dan bisnis/i).fill('Checkout requests timed out for 12% of users.')
  await page.getByLabel(/Root cause|Akar penyebab/i).fill('A connection pool limit was too low after traffic increased.')
  await page.getByLabel(/Follow-up actions|Tindak lanjut/i).fill('Raise connection pool capacity — Platform — 2026-10-20')
  await page.getByRole('button', { name: /Generate postmortem|Buat postmortem/i }).click()
  const output = page.getByLabel(/Postmortem Markdown output|Output Markdown postmortem/i)
  await expect(output).toContainText('# Checkout latency spike')
  await expect(output).toContainText('Blameless review')
  await expect(output).toContainText('connection pool limit')
  await expect(output).toContainText('- [ ] Raise connection pool capacity')
  await page.evaluate(() => {
    const original = URL.createObjectURL.bind(URL)
    URL.createObjectURL = ((blob: Blob) => {
      ;(window as Window & { __postmortemBlob?: Blob }).__postmortemBlob = blob
      return original(blob)
    }) as typeof URL.createObjectURL
  })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download \.md|Unduh \.md/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('checkout-latency-spike-postmortem.md')
  const markdown = await page.evaluate(async () => await (window as Window & { __postmortemBlob?: Blob }).__postmortemBlob?.text() ?? '')
  expect(markdown).toContain('Checkout requests timed out for 12% of users.')
})


test('Web Quality Observatory audits the current page and exports a report', async ({ page }) => {
  await page.goto('/observatory')
  await expect(page.getByRole('heading', { name: /Web Quality Observatory|Observatory Kualitas Web/i })).toBeVisible()
  await expect(page.getByRole('img', { name: /Quality score 0 percent|Skor kualitas 0 percent/i })).toBeVisible()
  await page.getByRole('button', { name: /Run page audit|Jalankan audit/i }).click()
  await expect(page.getByText(/12\/12/).first()).toBeVisible()
  await expect(page.getByRole('img', { name: /Quality score \d+ percent|Skor kualitas \d+ percent/i })).toBeVisible()
  await expect(page.getByText('CURRENT PAGE', { exact: true }).or(page.getByText('HALAMAN SAAT INI', { exact: true })).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Copy report|Salin laporan/i })).toBeEnabled()
  await expect(page.getByRole('button', { name: /Export \.md|Ekspor \.md/i })).toBeEnabled()
  await expect(page.getByText(/does not crawl internal links|tidak merayapi tautan internal/i)).toBeVisible()
})


test('Developer Utilities generates JSON Schema and safely reports regex matches', async ({ page }) => {
  await page.goto('/devtools')
  await expect(page.getByRole('heading', { name: /Developer Utilities|Utilitas Developer/i })).toBeVisible()
  await page.getByRole('button', { name: /Generate schema|Buat schema/i }).click()
  const schemaOutput = page.getByLabel(/Generated JSON Schema output|Output JSON Schema/i)
  await expect(schemaOutput).toContainText('"$schema": "https://json-schema.org/draft/2020-12/schema"')
  await expect(schemaOutput).toContainText('"type": "object"')
  await page.getByRole('button', { name: /Regex Tester|Penguji Regex/i }).click()
  await page.getByRole('button', { name: /Test pattern|Uji pola/i }).click()
  await expect(page.getByText('support@example.com', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /JWT Inspector|Pemeriksa JWT/i }).click()
  await expect(page.getByText(/Decoding is not verification|Dekode bukan verifikasi/i)).toBeVisible()
})


test('Engineering Workspace searches the unified tool catalog', async ({ page }) => {
 await page.goto('/workspace')
 await expect(page.getByRole('heading',{name:/Better engineering|Engineering lebih baik/i})).toBeVisible()
 await page.getByRole('textbox',{name:/Search workspace tools|Cari tools workspace/i}).fill('jwt')
 await expect(page.getByRole('link',{name:/Developer Utilities/i})).toBeVisible()
 await expect(page.locator('.workspace-grid .workspace-card')).toHaveCount(1)
 await expect(page.locator('.workspace-grid .workspace-card')).toHaveCount(1)
 await expect(page.locator('.workspace-grid').getByRole('link',{name:/Engineering Lab/i})).toHaveCount(0)
})
test('API Playground validates URL schemes and sanitizes local collections', async ({page})=>{
 await page.goto('/api-playground')
 await expect(page.getByRole('heading',{name:/Understand responses|Pahami response/i})).toBeVisible()
 await page.getByRole('textbox',{name:/Request URL|URL request/i}).fill('file:///etc/passwd')
 await page.getByRole('button',{name:/Send request|Kirim request/i}).click()
 await expect(page.getByRole('alert')).toContainText(/HTTP/i)
 await page.getByRole('textbox',{name:/Request URL|URL request/i}).fill('https://example.com/api')
 await page.getByRole('textbox',{name:/Request headers JSON|JSON header request/i}).fill('{"X-API-Key":"secret-test","Accept":"application/json"}')
 await page.getByRole('button',{name:/Save to collection|Simpan ke koleksi/i}).click()
 await expect(page.getByText(/Sensitive headers were omitted|Header sensitif dihilangkan/i)).toBeVisible()
 await expect(page.locator('.api-collection')).not.toContainText('secret-test')
})
test('Performance Observatory displays browser timing and limitations',async({page})=>{
 await page.goto('/performance')
 await expect(page.getByRole('heading',{name:/Measure what|Ukur yang/i})).toBeVisible()
 await expect(page.getByText(/Measurement scope|Cakupan pengukuran/i)).toBeVisible()
 await expect(page.getByRole('heading',{name:/Page lifecycle|Siklus halaman/i})).toBeVisible()
})
test('Learning progress persists and knowledge graph search finds tools',async({page})=>{
 await page.goto('/learn')
 await page.getByRole('checkbox').first().check()
 await page.reload()
 await expect(page.getByRole('checkbox').first()).toBeChecked()
 await page.goto('/knowledge-graph')
 await expect(page.getByRole('heading',{name:/Follow the|Ikuti/i})).toBeVisible()
 await page.getByRole('textbox',{name:/Search knowledge graph|Cari knowledge graph/i}).fill('jwt')
 await expect(page.getByRole('button',{name:/JWT Inspector/i})).toBeVisible()
})

test('mobile viewport has no horizontal document overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This check targets the mobile browser project')
  await page.setViewportSize({ width: 390, height: 844 })
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
})

test('command palette supports keyboard search, navigation, and dismissal', async ({ page }) => {
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const search = page.getByRole('textbox', { name: /search commands|cari perintah/i })
  await expect(search).toBeFocused()
  await search.fill('qa automation foundations')
  const result = dialog.getByRole('button', { name: /qa automation foundation/i })
  await expect(result).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/blog\/qa-automation-foundations$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})


test('engineering roadmap offers persistent progress and readiness scorecard', async ({ page }) => {
  await page.goto('/roadmap')
  await expect(page.getByRole('heading', { name: /Build with intent/i })).toBeVisible()
  const task = page.getByRole('checkbox').nth(1)
  await task.check()
  await expect(page.getByRole('progressbar', { name: /Roadmap completion/i })).toHaveAttribute('aria-valuenow', '6')
  await page.getByRole('tab', { name: /Release scorecard/i }).click()
  await expect(page.getByRole('heading', { name: /Project readiness scorecard/i })).toBeVisible()
  await page.getByRole('checkbox', { name: /Acceptance criteria are explicit/i }).check()
  await expect(page.locator('.readiness-score strong')).toHaveText('10')
  await page.reload()
  await page.getByRole('tab', { name: /Release scorecard/i }).click()
  await expect(page.locator('.readiness-score strong')).toHaveText('10')
})

test('roadmap ADR builder generates a preview and threat modeling exposes STRIDE categories', async ({ page }) => {
  await page.goto('/roadmap')
  await page.getByRole('tab', { name: /ADR builder/i }).click()
  await page.getByLabel(/Decision title/i).fill('Use explicit release gates')
  await expect(page.locator('.roadmap-preview')).toContainText('ADR: Use explicit release gates')
  await page.getByRole('tab', { name: /Threat modeling/i }).click()
  await expect(page.getByRole('heading', { name: /Threat-model workspace/i })).toBeVisible()
  await expect(page.locator('.stride-card')).toHaveCount(6)
  await page.getByRole('checkbox', { name: /Spoofing/i }).check()
  await expect(page.locator('.roadmap-summary')).toContainText('1/6')
})


test('Engineering Command Center tracks tasks, incidents, architecture decisions, and release gates', async ({ page }) => {
  await page.goto('/command-center')
  await expect(page.getByRole('heading', { name: /Operate with clarity/i })).toBeVisible()
  await page.getByRole('tab', { name: /Work items|Daftar tugas/i }).click()
  await expect(page.getByText('Validate production build and routes')).toBeVisible()
  await page.getByLabel(/Task title|Judul tugas/i).fill('Review keyboard navigation')
  await page.getByLabel(/Owner \/ team|PIC \/ tim/i).fill('Quality Engineering')
  await page.getByRole('button', { name: /Add work item|Tambah tugas/i }).click()
  await expect(page.getByText('Review keyboard navigation')).toBeVisible()
  await page.getByLabel('Status: Review keyboard navigation').selectOption('done')
  await page.reload()
  await page.getByRole('tab', { name: /Work items|Daftar tugas/i }).click()
  await expect(page.getByLabel('Status: Review keyboard navigation')).toHaveValue('done')

  await page.getByRole('tab', { name: /Incidents|Insiden/i }).click()
  await page.getByLabel(/Incident summary|Ringkasan insiden/i).fill('API latency elevated')
  await page.getByLabel(/Impact \/ notes|Dampak \/ catatan/i).fill('Elevated response time on public endpoints')
  await page.getByRole('button', { name: /Record incident|Catat insiden/i }).click()
  await expect(page.getByText('API latency elevated')).toBeVisible()
  await page.getByLabel('Incident status: API latency elevated').selectOption('resolved')

  await page.getByRole('tab', { name: 'ADRs' }).click()
  await page.getByLabel(/Decision title|Judul keputusan/i).fill('Keep API calls client-side')
  await page.getByLabel(/Decision and rationale|Keputusan dan alasan/i).fill('Avoid operating an unneeded proxy and disclose browser CORS constraints.')
  await page.getByRole('button', { name: /Create ADR|Buat ADR/i }).click()
  await expect(page.getByText('Keep API calls client-side')).toBeVisible()
  await page.getByLabel('Decision status: Keep API calls client-side').selectOption('accepted')

  await page.getByRole('tab', { name: /Release gate|Gerbang rilis/i }).click()
  const firstCheck = page.getByLabel(/Automated and critical-path tests pass|Tes otomatis dan jalur kritis lulus/i)
  await firstCheck.check()
  await expect(firstCheck).toBeChecked()
  await expect(page.getByText(/5 checks remain|5 pemeriksaan tersisa/i)).toBeVisible()
})

test('Engineering Command Center exports a local JSON backup', async ({ page }) => {
  await page.goto('/command-center')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export backup|Ekspor cadangan/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-command-center-backup.json')
})


test('QA Automation Studio generates and exports editable QA artifacts', async ({ page }) => {
  await page.goto('/qa-studio')
  await expect(page.getByRole('heading', { name: /Turn requirements into/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Generated QA artifact/i })).toHaveValue(/TC-001/)
  await page.getByRole('tab', { name: /BDD \/ Gherkin/i }).click()
  await expect(page.getByRole('textbox', { name: /Generated QA artifact/i })).toHaveValue(/Feature: User authentication/)
  await page.getByRole('tab', { name: /Bug report/i }).click()
  await expect(page.getByRole('textbox', { name: /Generated QA artifact/i })).toHaveValue(/# Bug Report/)
  await page.getByLabel(/Feature \/ component/i).fill('Payment refund')
  await page.getByRole('button', { name: /Save draft/i }).click()
  await expect(page.getByRole('status')).toContainText('Draft saved locally')
  await page.getByLabel(/Feature \/ component/i).fill('Changed after save')
  await page.getByRole('button', { name: /Payment refund.*Restore/i }).click()
  await expect(page.getByLabel(/Feature \/ component/i)).toHaveValue('Payment refund')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download/i }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('dreamex-bug.md')
})

test('Security Center runs a browser-side baseline and exports a report', async ({ page }) => {
  await page.goto('/security-center')
  await page.getByRole('button', { name: /Run security baseline/i }).click()
  await expect(page.getByRole('heading', { name: /Security baseline findings/i })).toBeVisible()
  await expect(page.getByText('HTTPS transport')).toBeVisible()
  await expect(page.getByText(/Browser-visible checks can miss/i)).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export JSON/i }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('dreamex-security-audit.json')
  await expect(page.getByText('dreamex-security-audit-v1')).toBeVisible()
  const privacyBackup = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export local data/i }).click()
  expect((await privacyBackup).suggestedFilename()).toBe('dreamex-local-data-backup.json')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: /Clear DreamEx data/i }).click()
  await expect(page.getByText(/No DreamEx-prefixed local storage entries/i)).toBeVisible()
})


test('workspace search and command palette discover the new QA and security tools', async ({ page }) => {
  await page.goto('/workspace')
  const search = page.getByRole('textbox', { name: /Search workspace tools/i })
  await search.fill('gherkin')
  await expect(page.locator('.workspace-grid .workspace-card').filter({ hasText: 'QA Automation Studio' })).toBeVisible()
  await search.fill('security headers')
  await expect(page.locator('.workspace-grid .workspace-card').filter({ hasText: 'Security & Privacy Center' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: /Search commands/i }).fill('QA Automation Studio')
  await expect(dialog.getByRole('button', { name: /QA Automation Studio/i })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/qa-studio$/)
})


test('Engineering Intelligence catalog supports search, local registration, and persistence', async ({ page }) => {
  await page.goto('/engineering-intelligence')
  await expect(page.getByRole('heading', { name: /Engineering Intelligence/i })).toBeVisible()
  await expect(page.locator('.intelligence-service-card')).toHaveCount(3)
  await expect(page.getByText(/example record\(s\)|data contoh/i)).toBeVisible()
  const search = page.getByRole('textbox', { name: /Search catalog/i })
  await search.fill('Commerce API')
  await expect(page.locator('.intelligence-service-card')).toHaveCount(1)
  await search.fill('')
  await page.getByLabel(/Service name/i).fill('Payments API')
  await page.getByLabel(/Owner \/ team/i).fill('Platform Engineering')
  await page.getByLabel(/Repository URL or slug/i).fill('uknowdream/payments-api')
  await page.getByRole('button', { name: /Add service/i }).click()
  await expect(page.getByRole('heading', { name: 'Payments API' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Payments API' })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export JSON/i }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('dreamex-service-catalog.json')
})

test('API Contract Studio analyzes OpenAPI and flags removed operations against a baseline', async ({ page }) => {
  await page.goto('/engineering-intelligence')
  await page.getByRole('tab', { name: /API contract studio/i }).click()
  await page.getByRole('button', { name: /Load example/i }).click()
  const currentEditor = page.getByRole('textbox', { name: /Current OpenAPI JSON/i })
  const baselineEditor = page.getByRole('textbox', { name: /Baseline contract/i })
  const baseline = JSON.parse(await currentEditor.inputValue()) as { paths: Record<string, unknown> }
  await baselineEditor.fill(JSON.stringify(baseline, null, 2))
  delete baseline.paths['/orders/{orderId}']
  await currentEditor.fill(JSON.stringify(baseline, null, 2))
  await expect(page.getByRole('heading', { name: /Operations/i })).toBeVisible()
  await expect(page.getByText(/Potential breaking change: removed operation GET \/orders\/\{orderId\}/i)).toBeVisible()
  await expect(page.getByText(/Static local analysis only/i)).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export review/i }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('dreamex-api-contract-review.md')
})
