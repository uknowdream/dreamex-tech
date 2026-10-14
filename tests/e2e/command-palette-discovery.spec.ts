import { expect, test } from '@playwright/test'

test('command palette filters tools by category and persists only local recent choices', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')

  const dialog = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  await expect(dialog).toBeVisible()
  const categories = dialog.getByRole('group', { name: /Tool categories|Kategori tools/i })
  await categories.getByRole('button', { name: 'QA', exact: true }).click()

  await expect(dialog.getByRole('button', { name: /QA Automation Studio|Studio Otomasi QA/i })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'API Playground', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: /QA Automation Studio|Studio Otomasi QA/i }).click()
  await expect(page).toHaveURL(/qa-studio$/)

  await page.keyboard.press('Control+k')
  const recent = dialog.locator('.command-recent')
  await expect(recent).toBeVisible()
  await expect(recent.getByText(/Stored only in this browser profile|Disimpan hanya di profil browser ini/i)).toBeVisible()
  await expect(recent.getByRole('button', { name: /QA Automation Studio|Studio Otomasi QA/i })).toBeVisible()
  await recent.getByRole('button', { name: /Clear recent|Hapus riwayat/i }).click()
  await expect(recent).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dreamex-recent-tools-v1'))).toBeNull()
})

test('command palette keeps category filters keyboard accessible on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  const categories = dialog.getByRole('group', { name: /Tool categories|Kategori tools/i })
  await expect(categories.getByRole('button', { name: /Security|Keamanan/i })).toBeVisible()
  await categories.getByRole('button', { name: /Security|Keamanan/i }).focus()
  await expect(categories.getByRole('button', { name: /Security|Keamanan/i })).toBeFocused()
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
})
