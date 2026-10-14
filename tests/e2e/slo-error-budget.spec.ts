import { expect, test } from '@playwright/test'

test('Command Center SLO worksheet calculates budget and exports manual evidence', async ({ page }) => {
  await page.goto('/command-center')
  const worksheet = page.getByRole('region', { name: /SLO and error-budget calculator/i })
  await expect(worksheet).toBeVisible()
  await expect(worksheet.getByText('43.2 min')).toBeVisible()
  await expect(worksheet.getByText('99.955%')).toBeVisible()

  await worksheet.getByLabel(/Observed downtime minutes/i).fill('60')
  await expect(worksheet.getByText(/exceed the target budget/i)).toBeVisible()
  await expect(worksheet.getByText('43.2 min')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await worksheet.getByRole('button', { name: /Export calculation/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-slo-error-budget.json')
  const stream = await download.createReadStream()
  let report = ''
  for await (const chunk of stream ?? []) report += chunk.toString()
  expect(report).toContain('manual user input')
  expect(report).toContain('budgetRemainingMinutes')
})

test('SLO worksheet blocks inconsistent request counts', async ({ page }) => {
  await page.goto('/command-center')
  const worksheet = page.getByRole('region', { name: /SLO and error-budget calculator/i })
  await worksheet.getByLabel(/Failed requests/i).fill('100001')
  await expect(worksheet.getByRole('alert')).toBeVisible()
  await expect(worksheet.getByRole('button', { name: /Export calculation/i })).toBeDisabled()
})
