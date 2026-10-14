import { expect, test } from '@playwright/test'

test('core tool routes expose an accessible breadcrumb and avoid mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/security-center')

  const breadcrumb = page.getByRole('navigation', { name: /Breadcrumb|Navigasi lokasi/i })
  await expect(breadcrumb).toBeVisible()
  const home = breadcrumb.getByRole('link').first()
  await expect(home).toHaveAttribute('href', '/')
  await expect(home).toContainText(/Home|Beranda/i)
  await expect(breadcrumb.getByRole('listitem').last()).toHaveAttribute('aria-current', 'page')
  await expect(breadcrumb.getByText(/API Playground/i)).toBeVisible()

  await home.focus()
  await expect(home).toBeFocused()

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
})

test('tool breadcrumbs localize their landmark and home label', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/security-center')
  const breadcrumb = page.getByRole('navigation', { name: /Breadcrumb|Navigasi lokasi/i })
  await expect(breadcrumb).toBeVisible()
  await expect(breadcrumb.getByRole('link').first()).toHaveAttribute('href', '/')
  await expect(breadcrumb.getByRole('link').first()).toContainText(/Home|Beranda/i)
  await expect(breadcrumb.getByRole('listitem').last()).toHaveAttribute('aria-current', 'page')
  await expect(breadcrumb.getByText(/Security Center|Pusat Keamanan/i)).toBeVisible()
})
