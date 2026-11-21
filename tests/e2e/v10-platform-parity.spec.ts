import { expect, test } from '@playwright/test'

test.describe('DreamEx v10.0 platform parity', () => {
  test('/jira renders exactly one workspace navigation and imports GitHub issues via the Cloud Sync panel', async ({ page }) => {
    await page.route('https://api.github.com/repos/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { number: 42, title: 'Flaky checkout test on WebKit', body: 'Repro steps', html_url: 'https://github.com/acme/app/issues/42', labels: [{ name: 'bug' }] },
        ]),
      }),
    )
    await page.goto('/jira')
    await expect(page.getByTestId('jira-enterprise-page')).toBeVisible()
    await expect(page.locator('[role="tablist"][aria-label*="Jira"]')).toHaveCount(1)
    await expect(page.getByTestId('jira-tab-board')).toHaveCount(1)

    await page.getByTestId('jira-tab-automation').click()
    await expect(page.getByTestId('jira-cloud-sync-panel')).toBeVisible()
    await page.getByTestId('jira-gh-repo-input').fill('acme/app')
    await page.getByTestId('jira-gh-import-btn').click()
    await expect(page.getByTestId('jira-cloud-sync-panel')).toContainText(/Imported 1|mengimpor 1/i)

    await page.getByTestId('jira-tab-board').click()
    await expect(page.locator('.jira-card', { hasText: 'Flaky checkout test on WebKit' })).toBeVisible()
  })

  test('/jira hydrates a shareable ?sync= board link', async ({ page }) => {
    const payload = { activeSprintName: 'Sprint 99', issues: [{ id: 's1', key: 'DX-777', title: 'Hydrated from shared link', status: 'todo', sprintId: 'sprint-24' }] }
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    await page.goto(`/jira?sync=${encoded}`)
    await expect(page.getByTestId('jira-card-DX-777')).toBeVisible()
  })

  test('/contact submits a demo request and shows case studies, changelog and no overflow', async ({ page }) => {
    await page.route('**/api/contact', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, mode: 'validated-stateless', referenceId: 'DX-REQ-TEST1234' }) })
      }
      return route.continue()
    })
    await page.goto('/contact')
    await expect(page.getByTestId('contact-page')).toBeVisible()
    await expect(page.getByTestId('contact-case-studies').locator('.contact-case')).toHaveCount(3)
    await expect(page.getByTestId('contact-changelog')).toContainText('v10.0')

    await page.getByTestId('contact-name').fill('Rina Engineer')
    await page.getByTestId('contact-email').fill('rina@example.com')
    await page.getByTestId('contact-message').fill('We want to evaluate the Jira Sprint OS for three squads.')
    await page.getByTestId('contact-submit').click()
    await expect(page.getByTestId('contact-success')).toContainText('DX-REQ-TEST1234')

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `No horizontal overflow at ${width}px`).toBeLessThanOrEqual(1)
    }
  })

  test('v11.0 /ba-hub pushes Gherkin story directly into /jira board, DORA panel loads in Reports, and 12th article shows interactive code snippet', async ({ page }) => {
    await page.goto('/ba-hub')
    await page.getByTestId('ba-push-to-jira-btn').click()
    await expect(page).toHaveURL(/\/jira$/)
    await expect(page.locator('.jira-card', { hasText: '[BA-Gherkin]' }).first()).toBeVisible()

    // Reports tab -> lazy Executive DORA Metrics panel
    await page.getByTestId('jira-tab-reports').click()
    await expect(page.getByTestId('jira-dora-panel')).toBeVisible()

    // Automation tab -> Vercel Storage driver badge & 2-Way GitHub Webhook URL
    await page.getByTestId('jira-tab-automation').click()
    await expect(page.getByTestId('jira-storage-driver-badge')).toBeVisible()
    await expect(page.getByTestId('jira-cloud-sync-panel')).toContainText('/api/github-webhook')

    // Article #10 (v10/v11) -> interactive code snippet rendered via articleEnhancements.ts
    await page.goto('/blog/realtime-collaboration-local-first')
    await expect(page.locator('pre code', { hasText: 'pushBoardSnapshot' })).toBeVisible()
  })
})
