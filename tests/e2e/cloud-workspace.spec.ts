import { expect, test } from '@playwright/test'

test('Control Plane exposes clear cloud setup boundaries and read-only GitHub integration scope', async ({ page }) => {
  await page.goto('/control-plane')
  await expect(page.getByRole('heading', { name: /Cloud workspace & integrations|Workspace cloud & integrasi/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /GitHub public repositories & Actions|Repositori publik & Actions GitHub/i })).toBeVisible()
  await expect(page.getByText(/does not request repository write access|tidak meminta akses tulis repositori/i)).toBeVisible()
  await expect(page.getByText(/No data is uploaded until the API reports cloud storage ready|Tidak ada data yang diunggah sebelum API menyatakan penyimpanan cloud siap/i)).toBeVisible()
})

test('Cloud snapshots require explicit consent before an upload can be submitted', async ({ page }) => {
  await page.goto('/control-plane')
  const submit = page.getByRole('button', { name: /Save local snapshot to cloud|Simpan snapshot lokal ke cloud/i })
  await expect(submit).toBeDisabled()
  const consent = page.getByRole('checkbox', { name: /reviewed the selected data|telah meninjau data yang dipilih/i })
  await expect(consent).toBeVisible()
})
