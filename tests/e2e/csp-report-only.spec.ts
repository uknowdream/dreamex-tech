import { expect, test } from '@playwright/test'

test('Security Center distinguishes enforcing CSP from non-blocking Report-Only monitoring', async ({ page }) => {
  await page.goto('/security-center')
  await page.getByRole('button', { name: /Run security baseline|Jalankan baseline keamanan/i }).click()

  await expect(page.getByRole('heading', { name: 'Content-Security-Policy', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Content-Security-Policy-Report-Only', exact: true })).toBeVisible()
  await expect(page.getByText(/Report-Only is monitored separately and does not block content/i)).toBeVisible()
})
