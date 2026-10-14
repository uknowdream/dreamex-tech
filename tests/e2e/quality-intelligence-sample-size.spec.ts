import { expect, test } from '@playwright/test'

test('Quality Intelligence reports flaky sample size and includes it in Markdown export', async ({ page }) => {
  await page.goto('/quality-intelligence')
  await page.getByRole('button', { name: /Explore demo report|Lihat laporan demo/i }).click()
  await expect(page.getByText(/1 of 5 executed \(20%\)|1 dari 5 tes dijalankan \(20%\)/i)).toBeVisible()
  await expect(page.getByText(/not a statistical confidence estimate|bukan estimasi confidence statistik/i)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Markdown/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-quality-report.md')
  const stream = await download.createReadStream()
  let markdown = ''
  for await (const chunk of stream ?? []) markdown += chunk.toString()
  expect(markdown).toContain('Flaky signal sample: 1 of 5 executed tests (20%)')
})

test('Quality Intelligence does not infer flaky retries from JUnit XML', async ({ page }) => {
  await page.goto('/quality-intelligence')
  const xml = '<?xml version="1.0"?><testsuite tests="1"><testcase classname="sample" name="stable test" time="0.25"/></testsuite>'
  await page.getByLabel(/Choose Playwright JSON or JUnit XML report|Pilih laporan Playwright JSON atau JUnit XML/i).setInputFiles({
    name: 'sample-junit.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(xml),
  })
  await expect(page.getByText(/JUnit XML does not preserve retry history|Parser ini tidak menyimpulkan status flaky dari JUnit XML/i)).toBeVisible()
  await expect(page.locator('.quality-intelligence-metrics article').nth(3).locator('strong')).toHaveText('0')
  await expect(page.getByText(/0 of 1 executed \(0%\)|0 dari 1 tes dijalankan \(0%\)/i)).toBeVisible()
})
