import { expect, test } from '@playwright/test'

test('Security Center threat model records examples and exports provenance limits', async ({ page }) => {
  await page.goto('/security-center')
  const worksheet = page.getByRole('region', { name: /Threat model worksheet|Worksheet threat model/i })
  await expect(worksheet).toBeVisible()
  await page.evaluate(() => localStorage.setItem('unrelated-user-setting', 'preserve-me'))
  await worksheet.getByRole('button', { name: /Load examples|Muat contoh/i }).click()
  await expect(worksheet.getByText('User session and account', { exact: true })).toBeVisible()
  await expect(worksheet.getByText('Imported JSON / XML files', { exact: true })).toBeVisible()

  await worksheet.getByLabel(/Asset \/ data \/ capability|Aset \/ data \/ kapabilitas/i).fill('Payment API')
  await worksheet.getByLabel(/Trust boundary \/ data flow|Batas kepercayaan \/ alur data/i).fill('Client → payment gateway')
  await worksheet.getByLabel(/Threat hypothesis|Hipotesis ancaman/i).fill('Replay of payment requests')
  await worksheet.getByLabel(/Mitigation \/ detection \/ recovery|Mitigasi \/ deteksi \/ pemulihan/i).fill('Use idempotency keys and audit logs')
  await worksheet.getByRole('button', { name: /Add threat|Tambah ancaman/i }).click()
  await expect(worksheet.getByText('Payment API', { exact: true })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await worksheet.getByRole('button', { name: /Export JSON|Ekspor JSON/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-threat-model.json')
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream ?? []) content += chunk.toString()
  const report = JSON.parse(content)
  expect(report.schemaVersion).toBe('1.0')
  expect(report.manifest.provenance).toContain('not independently verified')
  expect(report.items).toHaveLength(4)
  expect(report.limitations).toContain('This is a lightweight threat-modeling aid, not a penetration test or security certification.')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('unrelated-user-setting'))).toBe('preserve-me')
})

test('Threat model form rejects empty required fields', async ({ page }) => {
  await page.goto('/security-center')
  const worksheet = page.getByRole('region', { name: /Threat model worksheet|Worksheet threat model/i })
  await expect(worksheet.getByLabel(/Asset \/ data \/ capability|Aset \/ data \/ kapabilitas/i)).toHaveAttribute('required', '')
  await expect(worksheet.getByLabel(/Threat hypothesis|Hipotesis ancaman/i)).toHaveAttribute('required', '')
})
