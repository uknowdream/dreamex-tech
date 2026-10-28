import { expect, test } from '@playwright/test'

const laptopWidths = [1024, 1280, 1366, 1440]

test('laptop header keeps Quick Find inside a responsive navigation drawer', async ({ page }) => {
  for (const width of laptopWidths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const header = page.locator('.site-header')
    const menuButton = page.getByRole('button', { name: /Open menu|Buka menu/i })
    const drawer = page.getByRole('dialog', { name: /Navigation|Navigasi/i })
    const quickFind = page.getByRole('searchbox', { name: /QUICK FIND|CARI CEPAT/i })

    await expect(header).toBeVisible()
    await expect(menuButton).toBeVisible()
    await expect(header).toHaveJSProperty('scrollWidth', await header.evaluate(el => el.clientWidth))
    await expect(drawer).toBeHidden()
    await expect(quickFind).toBeHidden()

    await menuButton.click()
    await expect(drawer).toBeVisible()
    await expect(quickFind).toBeVisible()
    await quickFind.fill('Engineering Lab')
    await expect(drawer.getByRole('link', { name: /Engineering Lab/i })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /Journal|Jurnal/i })).toBeHidden()

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  }
})

test('mobile header Quick Find stays usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const header = page.locator('.site-header')
  await expect(header).toHaveJSProperty('scrollWidth', await header.evaluate(el => el.clientWidth))

  await page.getByRole('button', { name: /Open menu|Buka menu/i }).click()
  const drawer = page.getByRole('dialog', { name: /Navigation|Navigasi/i })
  const quickFind = page.getByRole('searchbox', { name: /QUICK FIND|CARI CEPAT/i })
  await expect(quickFind).toBeVisible()
  await quickFind.fill('Page Health Audit')
  await expect(drawer.getByText(/Page Health Audit|Audit Kesehatan Halaman/i)).toBeVisible()
})
