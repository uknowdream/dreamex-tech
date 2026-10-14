import { expect, test } from '@playwright/test'

test('release evidence register validates inputs and exports manual release metadata', async ({ page }) => {
  await page.goto('/command-center')
  await page.getByRole('tab', { name: /Release gate|Gerbang rilis/i }).click()
  const register = page.locator('.release-evidence-register')
  await expect(register).toBeVisible()

  await register.getByLabel(/Release \/ candidate name|Nama rilis \/ kandidat/i).fill('2026.10.14-rc1')
  await register.getByLabel(/Source commit SHA|SHA commit sumber/i).fill('not-a-sha')
  await register.getByLabel(/Deployment URL \(HTTPS\)|URL deployment \(HTTPS\)/i).fill('http://example.com')
  await register.getByLabel(/Rollback plan and owner|Rencana rollback dan PIC/i).fill('Revert to the prior READY deployment and run smoke checks.')
  await register.getByRole('button', { name: /Save release record|Simpan catatan rilis/i }).click()
  await expect(register.getByRole('alert')).toContainText(/Source SHA|SHA commit/i)

  await register.getByLabel(/Source commit SHA|SHA commit sumber/i).fill('a'.repeat(40))
  await register.getByLabel(/Deployment URL \(HTTPS\)|URL deployment \(HTTPS\)/i).fill('https://www.dreamex.tech')
  await register.getByLabel(/CI run IDs/i).fill('38500000000, 38500000001')
  await register.getByLabel(/Test evidence \/ report references|Referensi bukti tes \/ laporan/i).fill('Desktop and mobile Playwright reports')
  await register.getByLabel(/Known risks \/ exceptions|Risiko \/ pengecualian yang diketahui/i).fill('Production smoke still required.')
  await register.getByRole('button', { name: /Save release record|Simpan catatan rilis/i }).click()

  const record = register.locator('.release-evidence-record')
  await expect(record).toHaveCount(1)
  await expect(record.getByText(/MANUAL · NOT VERIFIED|MANUAL · BELUM DIVERIFIKASI/i)).toBeVisible()
  await expect(record.getByText('2026.10.14-rc1')).toBeVisible()
  await expect(record.getByText('38500000000, 38500000001')).toHaveCount(0)
  await expect(record.getByText(/Desktop and mobile Playwright reports/)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await register.getByRole('button', { name: /Export evidence|Ekspor evidence/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-release-evidence.json')
  const stream = await download.createReadStream()
  let json = ''
  for await (const chunk of stream ?? []) json += chunk.toString()
  const report = JSON.parse(json)
  expect(report.records[0].verificationStatus).toBe('manual-unverified')
  expect(report.records[0].sourceSha).toBe('a'.repeat(40))
  expect(report.records[0].rollbackPlan).toContain('Revert to the prior READY deployment')
  expect(report.limitations.join(' ')).toContain('not been independently verified')

  await record.getByRole('button', { name: /Delete release record|Hapus catatan rilis/i }).click()
  await expect(register.locator('.release-evidence-record')).toHaveCount(0)
})

test('release evidence register rejects deployment URLs with credentials', async ({ page }) => {
  await page.goto('/command-center')
  await page.getByRole('tab', { name: /Release gate|Gerbang rilis/i }).click()
  const register = page.locator('.release-evidence-register')
  await register.getByLabel(/Release \/ candidate name|Nama rilis \/ kandidat/i).fill('bad-url')
  await register.getByLabel(/Source commit SHA|SHA commit sumber/i).fill('abcdef1234567')
  await register.getByLabel(/Deployment URL \(HTTPS\)|URL deployment \(HTTPS\)/i).fill('https://user:pass@example.com')
  await register.getByLabel(/Rollback plan and owner|Rencana rollback dan PIC/i).fill('Rollback steps')
  await register.getByRole('button', { name: /Save release record|Simpan catatan rilis/i }).click()
  await expect(register.getByRole('alert')).toContainText(/must use HTTPS|harus menggunakan HTTPS/i)
  await expect(register.locator('.release-evidence-record')).toHaveCount(0)
})
