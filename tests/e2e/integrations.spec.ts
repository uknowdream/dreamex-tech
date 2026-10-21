import { expect, test } from '@playwright/test'

test('GitHub CI dashboard renders real workflow-run data from its public API response', async ({ page }) => {
  await page.route(/^https:\/\/api\.github\.com\/repos\/uknowdream\/dreamex-tech\/actions\/runs\?per_page=15$/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ workflow_runs: [
      { id: 101, name: 'CI', run_number: 620, event: 'push', status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: 'abcdef0123456789', updated_at: '2026-10-22T00:00:00Z' },
      { id: 102, name: 'Browser regression tests', run_number: 523, event: 'push', status: 'completed', conclusion: 'failure', head_branch: 'main', head_sha: '0123456789abcdef', updated_at: '2026-10-22T00:01:00Z' },
    ] }),
  }))
  await page.goto('/github-ci')
  await expect(page.getByRole('heading', { name: /Follow the evidence|Gunakan bukti nyata/i })).toBeVisible()
  await expect(page.getByText('Browser regression tests')).toBeVisible()
  await expect(page.getByText('abcdef0')).toBeVisible()
  await page.getByRole('combobox', { name: /Filter workflow status|Filter status workflow/i }).selectOption('failure')
  await expect(page.getByText('Browser regression tests')).toBeVisible()
  await expect(page.getByText('CI', { exact: true })).toHaveCount(0)
})

test('GitHub CI dashboard reports API rate limiting without inventing workflow state', async ({ page }) => {
  await page.route(/^https:\/\/api\.github\.com\/repos\/uknowdream\/dreamex-tech\/actions\/runs\?per_page=15$/, route => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'rate limit exceeded' }),
  }))
  await page.goto('/github-ci')
  await expect(page.getByRole('alert')).toContainText(/rate limit|batas permintaan/i)
})

test('team workspace clearly reports when shared persistence has not been configured', async ({ page }) => {
  await page.route('**/api/team-workspace', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'workspace_not_configured', requiredConfiguration: ['DREAMEX_WORKSPACE_TOKEN'] }),
  }))
  await page.goto('/team-workspace')
  await page.getByLabel(/Shared workspace access token|Token akses workspace bersama/i).fill('placeholder-token-for-e2e')
  await page.getByRole('button', { name: /Connect & load|Hubungkan & muat/i }).click()
  await expect(page.getByRole('status')).toContainText(/not configured|belum dikonfigurasi/i)
  await expect(page.getByLabel(/Editable JSON object|Objek JSON yang dapat diedit/i)).toHaveValue(/DreamEx Tech/)
})
