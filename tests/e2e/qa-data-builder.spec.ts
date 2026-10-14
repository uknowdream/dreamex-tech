import { expect, test } from '@playwright/test'

test('QA Studio generates deterministic synthetic account fixtures without persisting data', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/qa-studio')
  const builder = page.getByRole('region', { name: /Synthetic test data builder|Pembuat data uji sintetis/i })
  await expect(builder).toBeVisible()

  const profile = builder.getByLabel(/Dataset profile|Profil dataset/i)
  const seed = builder.getByLabel(/Deterministic seed|Seed deterministik/i)
  const count = builder.getByLabel(/Record count|Jumlah record/i)
  const preview = builder.getByLabel(/Generated test data preview|Pratinjau data uji hasil generasi/i)

  await profile.selectOption('accounts')
  await seed.fill('stable-seed')
  await count.fill('8')
  const firstPreview = await preview.inputValue()
  const rows = JSON.parse(firstPreview) as Array<{ email: string; userId: string }>
  expect(rows).toHaveLength(5)
  expect(rows.every(row => row.email.endsWith('@example.test'))).toBe(true)
  expect(rows.every(row => row.userId.startsWith('USR-STABLESEED-'))).toBe(true)

  await seed.fill('different-seed')
  await expect(preview).not.toHaveValue(firstPreview)
  await seed.fill('stable-seed')
  await expect(preview).toHaveValue(firstPreview)
  await expect(builder.getByText('8', { exact: true })).toBeVisible()

  const storageKeys = await page.evaluate(() => Object.keys(localStorage))
  expect(storageKeys.some(key => key.includes('test-data-builder'))).toBe(false)
})

test('QA Studio provides commerce and boundary profiles with portable downloads', async ({ page }) => {
  await page.goto('/qa-studio')
  const builder = page.getByRole('region', { name: /Synthetic test data builder|Pembuat data uji sintetis/i })
  const profile = builder.getByLabel(/Dataset profile|Profil dataset/i)
  const preview = builder.getByLabel(/Generated test data preview|Pratinjau data uji hasil generasi/i)

  await profile.selectOption('commerce')
  const orders = JSON.parse(await preview.inputValue()) as Array<{ orderId: string; currency: string; quantity: number }>
  expect(orders[0].orderId).toMatch(/^ORD-/)
  expect(orders.every(order => order.currency === 'USD' && order.quantity >= 1 && order.quantity <= 5)).toBe(true)

  await profile.selectOption('boundaries')
  const cases = JSON.parse(await preview.inputValue()) as Array<{ scenario: string; risk: string }>
  expect(cases.some(item => item.scenario === 'negative amount')).toBe(true)
  expect(cases.some(item => item.scenario === 'unicode and emoji')).toBe(true)

  const downloadPromise = page.waitForEvent('download')
  await builder.getByRole('button', { name: /Download CSV|Unduh CSV/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-test-data.csv')
});
