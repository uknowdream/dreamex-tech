import { expect, test } from '@playwright/test'

test('Release evidence panel compares deployment candidates and exports provenance', async ({ page }) => {
  await page.goto('/command-center')
  await page.getByRole('tab', { name: /Release gate|Gerbang rilis/i }).click()
  const panel = page.locator('.release-evidence-panel')
  await expect(panel).toBeVisible()

  await panel.getByLabel(/Source commit \/ SHA/i).nth(0).fill('abc123')
  await panel.getByLabel(/Source commit \/ SHA/i).nth(1).fill('def456')
  await panel.getByLabel(/Preview deployment URL/i).nth(1).fill('https://preview.example.com')
  await panel.getByLabel(/Production URL/i).nth(1).fill('https://www.example.com')
  await panel.getByLabel(/Test run \/ evidence URL/i).nth(1).fill('https://github.com/example/repo/actions/runs/123')
  await panel.getByLabel(/Rollback and recovery plan/i).fill('Redeploy the last known-good commit abc123 and verify smoke checks.')
  await panel.getByLabel(/Known risks and exceptions/i).fill('Manual evidence references; review before release.')
  await expect(panel.getByText(/Different \/ needs review/i).first()).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: /Export evidence package/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-release-evidence.json')
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream ?? []) content += chunk.toString()
  const report = JSON.parse(content)
  expect(report.schemaVersion).toBe('1.0')
  expect(report.manifest.tool).toBe('DreamEx Release Evidence')
  expect(report.baseline.commit).toBe('abc123')
  expect(report.candidate.commit).toBe('def456')
  expect(report.comparison.find((item: { field: string }) => item.field === 'commit').changed).toBe(true)
  expect(report.limitations.join(' ')).toContain('not verified')
})

test('Release evidence panel rejects non-HTTPS deployment references', async ({ page }) => {
  await page.goto('/command-center')
  await page.getByRole('tab', { name: /Release gate|Gerbang rilis/i }).click()
  const panel = page.locator('.release-evidence-panel')
  await panel.getByLabel(/Preview deployment URL/i).nth(1).fill('http://preview.example.com')
  await expect(panel.getByRole('alert')).toContainText(/Only HTTPS URLs are accepted/i)
  await expect(panel.getByRole('button', { name: /Export evidence package/i })).toBeDisabled()
})
