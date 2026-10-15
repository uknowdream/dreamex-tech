import { expect, test } from '@playwright/test'

test('engineering route HTML includes route-specific metadata before client JavaScript runs', async ({ page }) => {
  const response = await page.request.get('/api-playground')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<html lang="id">')
  expect(html).toContain('<title>API Playground &amp; Contract Studio — DreamEx Tech</title>')
  expect(html).toContain('<meta name="description" content="Periksa alur API dan bandingkan kontrak OpenAPI untuk menemukan potensi perubahan kompatibilitas melalui analisis statis lokal." />')
  expect(html).toContain('<meta property="og:url" content="https://dreamex.tech/api-playground" />')
  expect(html).toContain('<link rel="canonical" href="https://dreamex.tech/api-playground" />')
  expect(html).toContain('<meta property="og:type" content="website" />')
  expect(html).toMatch(/<script[^>]+src="\/assets\/[^"]+\.js"/)
})

test('article HTML includes article metadata and publication date before JavaScript runs', async ({ page }) => {
  const response = await page.request.get('/blog/playwright-test-architecture')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<title>Merancang Playwright Test Suite yang Stabil — DreamEx Tech</title>')
  expect(html).toContain('href="https://dreamex.tech/blog/playwright-test-architecture"')
  expect(html).toContain('<meta property="og:type" content="article" />')
  expect(html).toContain('<meta property="article:published_time" content="2026-10-10" />')
  expect(html).toContain('content="Pola page object yang proporsional, locator yang tangguh, isolasi data, dan strategi mengurangi flaky test."')
})
