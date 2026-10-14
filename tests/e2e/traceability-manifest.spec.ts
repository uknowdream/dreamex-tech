import { expect, test } from '@playwright/test'

test('traceability snapshot exports a portable manifest and content integrity digest', async ({ page }) => {
  await page.goto('/qa-studio')
  const matrix = page.getByRole('region', { name: /QA traceability matrix|Matriks traceability QA/i })
  await expect(matrix).toBeVisible()
  await page.evaluate(() => localStorage.setItem('unrelated-user-setting', 'preserve-me'))
  await matrix.getByRole('button', { name: /Load example rows|Muat contoh/i }).click()

  const downloadPromise = page.waitForEvent('download')
  await matrix.getByRole('button', { name: /Export snapshot|Ekspor snapshot/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-qa-traceability.json')
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream ?? []) content += chunk.toString()
  const snapshot = JSON.parse(content)
  expect(snapshot.schemaVersion).toBe('1.1')
  expect(snapshot.manifest.tool).toBe('DreamEx QA Traceability')
  expect(snapshot.manifest.toolVersion).toBe('1.1')
  expect(snapshot.manifest.recordCount).toBe(snapshot.items.length)
  expect(snapshot.manifest.recordCount).toBe(3)
  expect(snapshot.manifest.statusCounts['not-run']).toBe(3)
  expect(snapshot.manifest.releaseCriteriaCount).toBe(2)
  expect(snapshot.manifest.contentSha256).toMatch(/^[a-f0-9]{64}$/)
  expect(snapshot.note).toContain('does not prove authenticity')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('unrelated-user-setting'))).toBe('preserve-me')
})

test('traceability snapshot continues to import legacy schema 1.0 files', async ({ page }) => {
  await page.goto('/qa-studio')
  const matrix = page.getByRole('region', { name: /QA traceability matrix|Matriks traceability QA/i })
  const legacy = {
    schemaVersion: '1.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    note: 'Legacy portable snapshot',
    items: [{
      id: 'legacy-row-1',
      requirement: 'REQ-LEGACY-001',
      testCase: 'TC-LEGACY-001',
      status: 'passed',
      defect: '',
      evidence: 'Legacy evidence reference',
      releaseCriterion: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  }
  await matrix.getByLabel(/Import traceability snapshot file|Impor file snapshot traceability/i).setInputFiles({
    name: 'legacy-traceability.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  })
  await expect(matrix.getByText('REQ-LEGACY-001', { exact: true })).toBeVisible()
  await expect(matrix.getByText('TC-LEGACY-001', { exact: true })).toBeVisible()
  await expect(matrix.getByText(/Snapshot imported|Snapshot diimpor/i)).toBeVisible()
})
