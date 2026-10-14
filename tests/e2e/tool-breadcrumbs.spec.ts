import { expect, test } from '@playwright/test'

test('engineering tool routes expose accessible breadcrumbs without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/api-playground')

  const breadcrumb = page.getByRole('navigation', { name: /Breadcrumb|Navigasi lokasi/i })
  await expect(breadcrumb).toBeVisible()
  const home = breadcrumb.getByRole('link', { name: /Home|Beranda/i })
  await expect(home).toHaveAttribute('href', '/')
  await expect(breadcrumb.getByRole('listitem').last()).toHaveAttribute('aria-current', 'page')
  await expect(breadcrumb.getByText(/API Playground/i)).toBeVisible()
  await home.focus()
  await expect(home).toBeFocused()

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(breadcrumb).toBeVisible()
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
})

test('breadcrumb labels follow the active language on engineering routes', async ({ page }) => {
  await page.goto('/security-center')
  const breadcrumb = page.getByRole('navigation', { name: /Breadcrumb|Navigasi lokasi/i })
  await expect(breadcrumb).toBeVisible()
  await expect(breadcrumb.getByRole('link').first()).toHaveAttribute('href', '/')
  await expect(breadcrumb.getByRole('listitem').last()).toHaveAttribute('aria-current', 'page')
  await expect(breadcrumb.getByText(/Security Center|Pusat Keamanan/i)).toBeVisible()
})
