import { expect, test } from '@playwright/test'

test('Security Center threat model records trust boundaries and exports reviewed planning data', async ({ page }) => {
  await page.goto('/security-center')
  const worksheet = page.locator('.threat-model-worksheet')
  await expect(worksheet).toBeVisible()

  await worksheet.getByLabel(/Asset \/ component|Aset \/ komponen/i).fill('Session cookie')
  await worksheet.getByLabel(/Trust boundary/i).fill('Browser to application origin')
  await worksheet.getByLabel(/STRIDE category|Kategori STRIDE/i).selectOption('Information disclosure')
  await worksheet.getByLabel(/Threat scenario|Skenario ancaman/i).fill('A compromised script reads an unprotected session token.')
  await worksheet.getByLabel(/Potential impact|Dampak potensial/i).fill('Account takeover and exposure of user data.')
  await worksheet.getByLabel(/Mitigation \/ verification|Mitigasi \/ verifikasi/i).fill('Use HttpOnly, Secure, and SameSite cookie flags; verify in browser tests.')
  await worksheet.getByLabel(/Owner \/ reviewer|PIC \/ reviewer/i).fill('Security Engineering')
  await worksheet.getByRole('button', { name: /Add threat record|Tambah catatan ancaman/i }).click()

  const record = worksheet.locator('.threat-model-record')
  await expect(record).toHaveCount(1)
  await expect(record.getByText('Session cookie')).toBeVisible()
  await expect(record.getByText(/Browser to application origin/)).toBeVisible()
  await expect(record.getByText(/compromised script reads/)).toBeVisible()
  await expect(record.getByText(/MANUAL|PLANNED|DIRencanakan/i)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await worksheet.getByRole('button', { name: /Export threat model|Ekspor threat model/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-threat-model.json')
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream ?? []) content += chunk.toString()
  const model = JSON.parse(content)
  expect(model.method).toBe('STRIDE-inspired threat register')
  expect(model.records[0].asset).toBe('Session cookie')
  expect(model.records[0].mitigation).toContain('HttpOnly')
  expect(model.limitations.join(' ')).toContain('not automatically discovered')

  await record.getByRole('button', { name: /Delete|Hapus/i }).click()
  await expect(worksheet.locator('.threat-model-record')).toHaveCount(0)
})
