import { expect, test } from '@playwright/test'

test('engineering route HTML includes route-specific metadata before client JavaScript runs', async ({ page }) => {
  const response = await page.request.get('/api-playground/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<html lang="en">')
  expect(html).toContain('<title>API Playground &amp; Contract Studio — DreamEx Tech</title>')
  expect(html).toContain('<meta name="description" content="Inspect API workflows and compare OpenAPI contracts for potential compatibility changes using static browser-local analysis." />')
  expect(html).toContain('<meta property="og:url" content="https://dreamex.tech/api-playground" />')
  expect(html).toContain('<link rel="canonical" href="https://dreamex.tech/api-playground" />')
  expect(html).toContain('<meta property="og:type" content="website" />')
  expect(html).toMatch(/<script[^>]+src="\/assets\/[^"]+\.js"/)
})

test('article HTML includes article metadata and publication date before JavaScript runs', async ({ page }) => {
  const response = await page.request.get('/blog/playwright-test-architecture/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<title>Designing a Stable Playwright Test Suite — DreamEx Tech</title>')
  expect(html).toContain('href="https://dreamex.tech/blog/playwright-test-architecture"')
  expect(html).toContain('<meta property="og:type" content="article" />')
  expect(html).toContain('<meta property="article:published_time" content="2026-10-10" />')
  expect(html).toContain('content="Practical page-object patterns, resilient locators, data isolation, and strategies to reduce flaky tests."')
})


test('personalized reading list is excluded from indexing and sitemap discovery', async ({ page }) => {
  const response = await page.request.get('/reading-list/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<title>Reading List — DreamEx Tech</title>')
  expect(html).toContain('<meta name="robots" content="noindex, follow" />')
  expect(html).toContain('<link rel="canonical" href="https://dreamex.tech/reading-list" />')

  const sitemapResponse = await page.request.get('/sitemap.xml')
  expect(sitemapResponse.status()).toBe(200)
  const sitemap = await sitemapResponse.text()
  expect(sitemap).toContain('<loc>https://dreamex.tech/command-center</loc>')
  expect(sitemap).not.toContain('<loc>https://dreamex.tech/reading-list</loc>')
})
