import { expect, test } from '@playwright/test'

test('Command Center maps requirements to test cases and reports release gaps', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/command-center')
  await page.getByRole('tab', { name: /QA traceability|Traceability QA/i }).click()
  const matrix = page.getByRole('region', { name: /QA traceability matrix|Matriks traceability QA/i })
  await expect(matrix).toBeVisible()
  await expect(matrix.getByText(/No traceability rows yet|Belum ada baris traceability/i)).toBeVisible()

  await matrix.getByLabel(/Requirement \/ acceptance criterion|Kebutuhan \/ kriteria penerimaan/i).fill('REQ-900 · Export must include a manifest')
  await matrix.getByLabel(/Test case \/ scenario ID|Test case \/ ID skenario/i).fill('TC-900 · Verify manifest metadata')
  await matrix.getByLabel(/Evidence reference or notes|Referensi atau catatan bukti/i).fill('CI run 123; report artifact manifest.json')
  await matrix.getByLabel(/Defect ID \/ reference/i).fill('BUG-900')
  await matrix.getByRole('button', { name: /Add mapping|Tambah pemetaan/i }).click()

  await expect(matrix.getByRole('heading', { name: /REQ-900/i })).toBeVisible()
  await expect(matrix.getByText(/release-required mapping|pemetaan wajib rilis/i)).toBeVisible()
  const rowStatus = matrix.getByLabel(/Execution status for REQ-900|Status eksekusi untuk REQ-900/i)
  await rowStatus.selectOption('passed')
  await expect(matrix.getByText(/release-required mapping|pemetaan wajib rilis/i)).toHaveCount(0)
  await expect(matrix.getByText(/Passed|Lulus/i).first()).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await matrix.getByRole('button', { name: /Export snapshot|Ekspor snapshot/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-qa-traceability.json')
})

test('Traceability import rejects malformed snapshots without replacing existing records', async ({ page }) => {
  await page.goto('/command-center')
  await page.getByRole('tab', { name: /QA traceability|Traceability QA/i }).click()
  const matrix = page.getByRole('region', { name: /QA traceability matrix|Matriks traceability QA/i })
  await matrix.getByRole('button', { name: /Load example rows|Muat contoh/i }).click()
  await expect(matrix.getByRole('heading', { name: /REQ-001/i })).toBeVisible()

  await matrix.getByLabel(/Import traceability snapshot file|Impor file snapshot traceability/i).setInputFiles({
    name: 'malformed.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: '1.0', items: [{ id: 'invalid-row' }] })),
  })
  await expect(matrix.getByRole('status').filter({ hasText: /Import rejected|Impor ditolak/i })).toBeVisible()
  await expect(matrix.getByRole('heading', { name: /REQ-001/i })).toBeVisible()
});
