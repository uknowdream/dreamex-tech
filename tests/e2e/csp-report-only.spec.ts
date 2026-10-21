import { expect, test } from '@playwright/test'

test('Security Center distinguishes enforcing CSP from optional Report-Only monitoring', async ({ page }) => {
  await page.route('**/*', async route => {
    const request = route.request()
    if (request.method() === 'HEAD' && new URL(request.url()).pathname === '/') {
      return route.fulfill({
        status: 200,
        headers: {
          'content-security-policy': "default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'",
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'strict-origin-when-cross-origin',
        },
      })
    }
    return route.continue()
  })
  await page.goto('/security-center')
  await page.getByRole('button', { name: /Run security baseline|Jalankan baseline keamanan/i }).click()

  await expect(page.getByRole('heading', { name: 'Content-Security-Policy', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Content-Security-Policy-Report-Only', exact: true })).toBeVisible()
  await expect(page.getByText(/An enforcing CSP with default-src, object-src and frame-ancestors restrictions is present/i)).toBeVisible()
  await expect(page.getByText(/An additional Report-Only policy is optional; the enforced CSP is the security boundary/i)).toBeVisible()
})
