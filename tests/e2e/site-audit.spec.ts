import { expect, test } from '@playwright/test'

test('Page Health Audit runs locally, filters findings, and exports a JSON report', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/site-audit')
  await expect(page.locator('main#main-content h1')).toBeVisible()
  await expect(page.getByRole('button', { name: /Run audit|Jalankan audit/i })).toBeVisible()
  const exportButton = page.getByRole('button', { name: /Export JSON|Ekspor JSON/i })
  await expect(exportButton).toBeDisabled()
  await page.getByRole('button', { name: /Run audit|Jalankan audit/i }).click()
  await expect(page.getByRole('region', { name: /Audit summary|Ringkasan audit/i })).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Findings|Temuan/i })).toBeVisible()
  const warningFilter = page.getByRole('button', { name: /Warnings|Peringatan/i })
  await warningFilter.click()
  await expect(warningFilter).toHaveAttribute('aria-pressed', 'true')
  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^dreamex-page-audit-\d{4}-\d{2}-\d{2}\.json$/)
})

test('Page Health Audit stays within narrow mobile viewports', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/site-audit')
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
    expect(dimensions.document, `Page audit overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
    expect(dimensions.body, `Page audit body overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
  }
})

test('Page Health Audit inspects pasted custom HTML snippets offline with DOMParser', async ({ page }) => {
  await page.goto('/site-audit')
  await page.getByRole('tab', { name: /Inspect Custom HTML|Audit HTML Eksternal/i }).click()
  const editor = page.locator('#site-audit-html-input')
  await expect(editor).toBeVisible()
  await page.getByRole('button', { name: /Run audit|Jalankan audit/i }).click()
  await expect(page.getByRole('heading', { name: /Images missing alt attributes|Gambar tanpa atribut alt/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /New-tab links should use noopener|Tautan tab baru disarankan memakai rel="noopener"/i })).toBeVisible()
})

test('Theme polarity toggle switches cleanly between dark Obsidian and Daylight light modes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const getActiveThemeToggle = async () => {
    const desktopToggle = page.locator('.nav-desktop-language .theme-toggle-btn')
    if (await desktopToggle.isVisible()) return desktopToggle
    const menuToggle = page.locator('.menu-toggle')
    if (await menuToggle.isVisible()) {
      const expanded = await menuToggle.getAttribute('aria-expanded')
      if (expanded !== 'true') await menuToggle.click()
    }
    return page.locator('.nav-drawer-footer .theme-toggle-btn')
  }

  const toggleBtn = await getActiveThemeToggle()
  await expect(toggleBtn).toBeVisible()
  await toggleBtn.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const toggleAfterReload = await getActiveThemeToggle()
  await expect(toggleAfterReload).toBeVisible()
  await toggleAfterReload.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
