import { expect, test } from '@playwright/test'

test('core tool routes expose an accessible breadcrumb and avoid mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/api-playground')
  await page.getByRole('button', { name: 'EN', exact: true }).click()

  const breadcrumb = page.getByRole('navigation', { name: /Breadcrumb/i })
  await expect(breadcrumb).toBeVisible()
  await expect(breadcrumb.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  await expect(breadcrumb.getByRole('listitem').last()).toHaveAttribute('aria-current', 'page')
  await expect(breadcrumb.getByText('API Playground', { exact: true })).toBeVisible()

  await breadcrumb.getByRole('link', { name: 'Home' }).focus()
  await expect(breadcrumb.getByRole('link', { name: 'Home' })).toBeFocused()

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
})

test('tool breadcrumbs localize their landmark and home label', async ({ page }) => {
  await page.goto('/security-center')
  const languageToggle = page.getByRole('button', { name: 'ID', exact: true })
  if (await languageToggle.count()) {
    await languageToggle.first().click()
    const breadcrumb = page.getByRole('navigation', { name: /Navigasi lokasi/i })
    await expect(breadcrumb.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/')
    await expect(breadcrumb.getByText('Pusat Keamanan & Privasi', { exact: true })).toBeVisible()
  }
})
