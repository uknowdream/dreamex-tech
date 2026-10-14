import { expect, test } from '@playwright/test'

const baselineXml = `<?xml version="1.0"?><testsuite name="baseline" tests="2" failures="1" time="4"><testcase classname="suite" name="passed" time="1"/><testcase classname="suite" name="failed" time="3"><failure message="expected 200">received 500</failure></testcase></testsuite>`
const currentXml = `<?xml version="1.0"?><testsuite name="candidate" tests="3" failures="1" time="7"><testcase classname="suite" name="passed A" time="1.5"/><testcase classname="suite" name="passed B" time="2.5"/><testcase classname="suite" name="failed" time="3"><failure message="expected 200">received 500</failure></testcase></testsuite>`

test('Quality Intelligence compares imported report snapshots and labels summary-only history', async ({ page }) => {
  await page.goto('/quality-intelligence')
  const input = page.getByLabel(/Choose Playwright JSON or JUnit XML report/i)

  await input.setInputFiles({ name: 'baseline.xml', mimeType: 'application/xml', buffer: Buffer.from(baselineXml) })
  await expect(page.getByRole('heading', { name: /baseline.xml/i })).toBeVisible()

  await input.setInputFiles({ name: 'candidate.xml', mimeType: 'application/xml', buffer: Buffer.from(currentXml) })
  const comparison = page.getByRole('region', { name: /SNAPSHOT COMPARISON|PERBANDINGAN SNAPSHOT/i })
  await expect(comparison).toBeVisible()
  await expect(comparison.getByText(/Current 66.7% · baseline 50%|Saat ini 66,7% · baseline 50%/i)).toBeVisible()
  await expect(comparison.getByText(/Test-count change|Perubahan jumlah tes/i)).toBeVisible()
  await expect(comparison.getByText(/Summary-only comparison|Perbandingan ringkasan saja/i)).toBeVisible()
  await expect(page.getByText(/historical test-level records are not stored|detail test historis tidak disimpan/i)).toBeVisible()
})

test('Quality Intelligence accepts legacy local history without average-duration metadata', async ({ page }) => {
  await page.goto('/quality-intelligence')
  await page.evaluate(() => localStorage.setItem('dreamex-quality-intelligence-history-v1', JSON.stringify([{
    id: 'legacy-snapshot',
    importedAt: '2026-01-01T00:00:00.000Z',
    source: 'legacy.xml',
    total: 2,
    passed: 1,
    failed: 1,
    flaky: 0,
    skipped: 0,
    passRate: 50,
  }])))
  await page.reload()
  await expect(page.getByText('legacy.xml')).toBeVisible()
  await expect(page.getByText(/2 tests|2 tes/i)).toBeVisible()
})
