import { expect, test } from '@playwright/test'

test('Control Plane exposes clear cloud setup boundaries and read-only GitHub integration scope', async ({ page }) => {
  await page.goto('/control-plane')
  await expect(page.getByRole('heading', { name: /Cloud workspace & integrations|Workspace cloud & integrasi/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /GitHub public repositories & Actions|Repositori publik & Actions GitHub/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Load public GitHub data|Muat data GitHub publik/i })).toBeVisible()
  await expect(page.getByText(/Load the latest public repository and workflow signals|Muat sinyal repositori publik dan workflow terbaru/i)).toBeVisible()
  await expect(page.getByText(/does not request repository write access|tidak meminta akses tulis repositori/i)).toBeVisible()
  await expect(page.getByText(/create a GitHub OAuth App with callback|buat GitHub OAuth App dengan callback/i)).toBeVisible()
})

test('Cloud snapshots require explicit consent before an upload can be submitted', async ({ page }) => {
  await page.goto('/control-plane')
  const signIn = page.getByRole('button', { name: /GitHub sign-in not configured|Login GitHub belum dikonfigurasi/i })
  await expect(signIn).toBeDisabled()
  await expect(page.getByRole('link', { name: /Open setup guide|Buka panduan setup/i })).toBeVisible()
})
