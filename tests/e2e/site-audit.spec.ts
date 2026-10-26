import { expect, test } from '@playwright/test'

test('Page Health Audit runs locally, filters findings, and exports a JSON report', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/site-audit')
  await expect(page.locator('main#main-content h1')).toBeVisible()
  await expect(page.getByRole('button', { name: /Run audit|Jalankan audit/i })).toBeVisible()
  const exportButton = page.getByRole('button', { name: /Export JSON|Ekspor JSON/i })
  await expect(exportButton).toBeDisabled()
  await page.getByRole('button', { name: /Run audit|Jalankan audit/i }).click()
  await expect(page.getByRole('region', { name: /Audit summary|Ringkasan audit/i })).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Findings|Temuan/i })).toBeVisible()
  const warningFilter = page.getByRole('button', { name: /Warnings|Peringatan/i })
  await warningFilter.click()
  await expect(warningFilter).toHaveAttribute('aria-pressed', 'true')
  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^dreamex-page-audit-\d{4}-\d{2}-\d{2}\.json$/)
})

test('Page Health Audit stays within narrow mobile viewports', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/site-audit')
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
    expect(dimensions.document, `Page audit overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
    expect(dimensions.body, `Page audit body overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
  }
})
