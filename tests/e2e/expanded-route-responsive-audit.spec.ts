import { expect, test } from '@playwright/test'

// Routes surfaced by the product README. Keep this list aligned with the
// public engineering tools so responsive regressions are caught beyond the homepage.
const auditedRoutes = [
  '/',
  '/workspace',
  '/control-plane',
  '/engineering-intelligence',
  '/lab',
  '/api-playground',
  '/observatory',
  '/performance',
  '/learn',
  '/knowledge-graph',
  '/roadmap',
  '/command-center',
  '/qa-studio',
  '/quality-intelligence',
  '/supply-chain-intelligence',
  '/security-center',
  '/github-ci',
  '/team-workspace',
]

const viewportWidths = [320, 390, 768, 1024, 1440]
const homepageViewportWidths = [320, 360, 390, 430, 640, 768, 1024, 1280, 1440]

test('engineering routes do not overflow horizontally across mobile, tablet, and desktop widths', async ({ page }) => {
  for (const route of auditedRoutes) {
    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 })
      const response = await page.goto(route)
      expect(response?.status(), `Unexpected HTTP status for ${route} at ${width}px`).toBeLessThan(500)
      await expect(page.locator('body')).toBeVisible()

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      expect(
        dimensions.document,
        `Document horizontal overflow on ${route} at ${width}px: ${JSON.stringify(dimensions)}`,
      ).toBeLessThanOrEqual(dimensions.viewport + 1)
      expect(
        dimensions.body,
        `Body horizontal overflow on ${route} at ${width}px: ${JSON.stringify(dimensions)}`,
      ).toBeLessThanOrEqual(dimensions.viewport + 1)
    }
  }
})

test('homepage stays within the viewport at common mobile, tablet, and desktop widths', async ({ page }) => {
  for (const width of homepageViewportWidths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }))
    expect(dimensions.document, `Homepage document overflow at ${width}px: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1)
    expect(dimensions.body, `Homepage body overflow at ${width}px: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1)
  }
})

test('engineering routes expose a primary heading and main content landmark', async ({ page }) => {
  for (const route of auditedRoutes) {
    await page.goto(route)
    await expect(page.locator('main#main-content'), `Missing main landmark on ${route}`).toBeVisible()
    await expect(page.locator('main#main-content h1'), `Expected one primary heading on ${route}`).toHaveCount(1)
  }
})
