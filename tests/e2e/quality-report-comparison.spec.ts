import { expect, test } from '@playwright/test'

test('Quality Intelligence compares the current JUnit report with the previous local baseline', async ({ page }) => {
  await page.goto('/quality-intelligence')
  const upload = page.getByLabel(/Choose Playwright JSON or JUnit XML report/i)

  await upload.setInputFiles({
    name: 'baseline.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from('<testsuite name="baseline" tests="2"><testcase classname="Auth" name="valid login" time="0.1"/><testcase classname="Catalog" name="renders list" time="0.2"/></testsuite>'),
  })
  await expect(page.locator('.quality-intelligence-summary-heading p')).toContainText('JUnit XML')
  await expect(page.locator('.quality-intelligence-comparison')).toHaveCount(0)

  await upload.setInputFiles({
    name: 'current.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from('<testsuite name="current" tests="2"><testcase classname="Auth" name="valid login" time="0.3"/><testcase classname="Catalog" name="renders list" time="0.5"><failure message="Expected 200">received 500</failure></testcase></testsuite>'),
  })

  const comparison = page.locator('.quality-intelligence-comparison')
  await expect(comparison).toBeVisible()
  await expect(comparison.getByText(/Change since previous import|Perubahan sejak impor sebelumnya/i)).toBeVisible()
  await expect(comparison.getByText('-50 pp', { exact: true })).toBeVisible()
  await expect(comparison.getByText('+1', { exact: true })).toBeVisible()
  await expect(comparison.getByText('+0.50s', { exact: true })).toBeVisible()
  await expect(comparison.getByText(/baseline.xml/)).toBeVisible()
  await expect(comparison.getByText(/sample sizes may differ|ukuran sampel dapat berbeda/i)).toBeVisible()
})

test('Quality Intelligence does not compare a demo report with unrelated saved history', async ({ page }) => {
  await page.goto('/quality-intelligence')
  await page.getByRole('button', { name: /Open demo report|Buka laporan demo/i }).click()
  await expect(page.locator('.quality-intelligence-comparison')).toHaveCount(0)
})
