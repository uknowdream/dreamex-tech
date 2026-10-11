import { expect, test, type Page } from '@playwright/test'

async function openMobileNavigation(page: Page, isMobile: boolean) {
  if (!isMobile) return
  const toggle = page.getByRole('button', { name: /open menu|buka menu/i })
  if (await toggle.isVisible()) await toggle.click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('homepage renders primary content and skip navigation', async ({ page, isMobile }) => {
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main-content')
  await expect(page.locator('#latest')).toBeVisible()
  await openMobileNavigation(page, isMobile)
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

test('language switch updates interface language and document lang', async ({ page, isMobile }) => {
  await openMobileNavigation(page, isMobile)
  await page.getByRole('button', { name: 'ID', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.getByRole('heading', { name: /Berpikir lebih dalam/i })).toBeVisible()
  await openMobileNavigation(page, isMobile)
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

test('articles can be saved to and removed from the personal reading list', async ({ page, isMobile }) => {
  const firstArticle = page.locator('.article-card').first()
  const articleTitle = (await firstArticle.locator('h3 a').innerText()).trim()
  await firstArticle.getByRole('button', { name: /save article|simpan artikel/i }).click()
  await expect(firstArticle.getByRole('button', { name: /remove saved article|hapus artikel tersimpan/i })).toHaveAttribute('aria-pressed', 'true')
  await openMobileNavigation(page, isMobile)
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
  await expect(page.locator('.learning-path-card')).toHaveCount(3)
  await page.getByRole('tab', { name: /engineering glossary|glosarium engineering/i }).click()
  await expect(page.locator('.glossary-card')).toHaveCount(12)
  await page.getByRole('textbox', { name: /search glossary|cari glosarium/i }).fill('idempotency')
  await expect(page.locator('.glossary-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Idempotency' })).toBeVisible()
})

test('about page loads through client navigation', async ({ page, isMobile }) => {
  await openMobileNavigation(page, isMobile)
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

test('installable PWA exposes an install action when the browser supports it', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const installEvent = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(installEvent, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })
    window.dispatchEvent(installEvent)
  })
  await openMobileNavigation(page, isMobile)
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

test('reading list can be exported as portable Markdown', async ({ page, isMobile }) => {
  const firstArticle = page.locator('.article-card').first()
  const title = (await firstArticle.locator('h3 a').innerText()).trim()
  await firstArticle.getByRole('button', { name: /save article|simpan artikel/i }).click()
  await openMobileNavigation(page, isMobile)
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

test('mobile viewport has no horizontal document overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This check targets the mobile browser project')
  await page.setViewportSize({ width: 390, height: 844 })
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
})
