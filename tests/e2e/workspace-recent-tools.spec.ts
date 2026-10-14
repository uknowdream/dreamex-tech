import { expect, test } from '@playwright/test'

test('workspace remembers recent tools locally and supports clearing the history', async ({ page }) => {
  await page.goto('/workspace')
  await expect(page.getByRole('heading', { name: /Engineering toolkit|Toolkit engineering/i })).toBeVisible()
  await page.locator('.workspace-grid').last().getByRole('link', { name: /API Playground/i }).click()
  await expect(page).toHaveURL(/\/api-playground$/)

  await page.goto('/workspace')
  const recent = page.getByRole('region', { name: /Recently used|Baru digunakan/i })
  await expect(recent).toBeVisible()
  await expect(recent.getByRole('link', { name: /API Playground/i })).toBeVisible()

  await recent.getByRole('button', { name: /Clear history|Hapus riwayat/i }).click()
  await expect(page.getByRole('region', { name: /Recently used|Baru digunakan/i })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('dreamex-workspace-recent-v1'))).toBeNull()
})
