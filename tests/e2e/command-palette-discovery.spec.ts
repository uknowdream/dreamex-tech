import { expect, test } from '@playwright/test'

test('command palette filters by category and keeps a clearable local recent-tools list', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: /Security & Reliability|Keamanan & Keandalan/i }).click()
  await expect(dialog.getByRole('button', { name: /Security & Privacy Center|Pusat Keamanan & Privasi/i })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Software Supply Chain Intelligence|Intelligence Software Supply Chain/i })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /API Playground/i })).toHaveCount(0)

  await dialog.getByRole('button', { name: /All|Semua/i }).click()
  await dialog.getByRole('button', { name: /API Playground/i }).click()
  await expect(page).toHaveURL(/api-playground$/)

  await page.keyboard.press('Control+k')
  const reopened = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  await expect(reopened.getByText(/Recently used tools|Tools terakhir digunakan/i)).toBeVisible()
  await expect(reopened.locator('.command-item').first()).toContainText(/API Playground/i)
  await reopened.getByRole('button', { name: /Clear|Hapus/i }).click()
  await expect(reopened.getByText(/Recently used tools|Tools terakhir digunakan/i)).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('dreamex-command-palette-recent-v1'))).toBeNull()
})
