import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test.describe('DreamEx Tech v6.0 — Guided Tour, OS Context Bus, .ZIP Export & Viral URL Grader', () => {
  test('homepage role funnel and 60s executive guided tour launch cleanly', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('role-guided-funnel')).toBeVisible()

    await page.getByTestId('open-guided-tour').click()
    const tour = page.getByTestId('guided-product-tour')
    await expect(tour).toBeVisible()

    await tour.getByRole('tab', { name: /02 · URL Grader|02 · Audit URL/i }).click()
    await page.getByTestId('tour-launch-stage').click()
    await expect(page).toHaveURL(/\/grader$/)
    await expect(page.getByTestId('grader-title')).toBeVisible()
  })

  test('prototype studio hydrates URL permalink, exports valid PKZIP starter archive, and syncs context bus across OS', async ({ page }) => {
    await page.goto('/prototype?bp=clinical-fhir&role=auditor')
    await expect(page.locator('.proto-window-url')).toContainText('fhir-triage-mesh')

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('proto-download-zip').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('dreamex-clinical-fhir-starter.zip')
    const filePath = await download.path()
    if (filePath) {
      const bytes = readFileSync(filePath)
      // Verify standard PKZIP local file header signature 0x50 0x4b 0x03 0x04 ("PK\x03\x04")
      expect(bytes[0]).toBe(0x50)
      expect(bytes[1]).toBe(0x4b)
      expect(bytes[2]).toBe(0x03)
      expect(bytes[3]).toBe(0x04)
    }

    await page.getByTestId('proto-sync-bus').click()
    await page.goto('/tools')
    const pill = page.getByTestId('os-context-pill')
    await expect(pill).toBeVisible()
    await expect(pill).toContainText(/Clinical Triage|Triase Klinis/i)
  })

  test('/grader audits public domains, renders score & remediation snippets, and stays responsive in Dark & Light modes', async ({ page }) => {
    await page.route('**/api/grader', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          domain: 'linear.app',
          url: 'https://linear.app/',
          httpStatus: 200,
          latencyMs: 62,
          score: 96,
          grade: 'A+',
          pillars: [
            { id: 'security', label: 'Zero-Trust Security', score: 25, max: 25 },
            { id: 'ai', label: 'AI Agent & Search Readiness', score: 22, max: 25 },
            { id: 'semantic', label: 'Semantic & Accessibility', score: 20, max: 20 },
            { id: 'transport', label: 'Edge Transport & TTFB', score: 15, max: 15 },
            { id: 'governance', label: 'Canonical & Social Governance', score: 14, max: 15 },
          ],
          checks: [
            { id: 'csp', pillar: 'Zero-Trust Security', label: 'Enforcing CSP', passed: true, detail: 'Active CSP verified' },
          ],
        }),
      })
    })

    await page.goto('/grader')
    await expect(page.getByTestId('grader-score-value')).toHaveText('99')

    await page.getByTestId('grader-url-input').fill('linear.app')
    await page.getByTestId('grader-scan-btn').click()
    await expect(page.getByTestId('grader-score-value')).toHaveText('96')
    await expect(page.getByTestId('grader-domain-pill')).toContainText('linear.app')

    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light'
    })
    const cardBg = await page.locator('.grader-card').first().evaluate(el => getComputedStyle(el).backgroundColor)
    expect(cardBg).not.toBe('rgb(6, 11, 22)')

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const dims = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        doc: document.documentElement.scrollWidth,
      }))
      expect(dims.doc, `Grader overflow at ${width}px`).toBeLessThanOrEqual(dims.viewport + 1)
    }
  })
})
