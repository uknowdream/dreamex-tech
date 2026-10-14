import { expect, test } from '@playwright/test'

test('QA Studio generates an editable Playwright scaffold with safe route validation', async ({ page }) => {
  await page.goto('/qa-studio')
  const generator = page.getByRole('region', { name: /Playwright starter generator|Generator starter Playwright/i })
  await expect(generator).toBeVisible()

  const title = generator.getByLabel(/Test title|Judul tes/i)
  const route = generator.getByLabel(/Relative route|Route relatif/i)
  const spec = generator.getByLabel(/Editable Playwright test|Tes Playwright yang dapat diedit/i)
  await title.fill('Reject "unsafe" input')
  await route.fill('//external.example')
  await expect(generator.getByRole('alert')).toContainText(/same-origin|same-origin/i)
  await expect(spec).toHaveValue('')
  await expect(generator.getByRole('button', { name: /Download spec|Unduh spec/i })).toBeDisabled()

  await route.fill('/api-playground?case=1')
  await expect(spec).toHaveValue(/await page\.goto\("\/api-playground\?case=1"\)/)
  const generated = await spec.inputValue()
  expect(generated).toContain('test(' + JSON.stringify('Reject "unsafe" input'))
  expect(generated).toContain("page.locator('main#main-content')")
  expect(generated).toContain('scrollWidth')

  await generator.getByRole('checkbox', { name: /No horizontal document overflow|Tidak ada overflow horizontal dokumen/i }).uncheck()
  await expect(spec).not.toHaveValue(/scrollWidth/)
  await generator.getByLabel(/Output syntax|Sintaks output/i).selectOption('js')
  const downloadPromise = page.waitForEvent('download')
  await generator.getByRole('button', { name: /Download spec|Unduh spec/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-playwright-starter.spec.js')
})
