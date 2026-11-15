import { expect, test } from '@playwright/test'

test.describe('DreamEx Tech v3.1 Platform Upgrades', () => {
  test('homepage Radar newsletter posts to /api/radar and Neural Studio BYOK drawer toggles cleanly', async ({ page }) => {
    let postedEmail = ''
    await page.route('**/api/radar', async route => {
      const data = route.request().postDataJSON() as { email?: string }
      postedEmail = data.email ?? ''
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, mode: 'validated-stateless', subscribedAt: '2026-11-15T00:00:00Z' }),
      })
    })

    await page.goto('/')
    await page.getByLabel(/Email for engineering radar|Email untuk pembaruan radar/i).fill('staff.sdet@dreamex.tech')
    await page.getByRole('button', { name: /Save Radar|Simpan Radar/i }).click()
    await expect.poll(() => postedEmail).toBe('staff.sdet@dreamex.tech')
    await expect(page.getByRole('status')).toContainText(/staff\.sdet@dreamex\.tech/i)

    const byokToggle = page.getByRole('button', { name: /Live AI \(BYOK\)|AI Langsung \(BYOK\)/i })
    await byokToggle.scrollIntoViewIfNeeded()
    await byokToggle.click()
    await expect(page.getByRole('region', { name: /BYOK Live AI Engine|Mesin AI Langsung BYOK/i })).toBeVisible()
    await expect(page.getByLabel(/BYOK Session API Key|API Key Sesi BYOK/i)).toBeVisible()
  })

  test('/workspace supports role onboarding filters and full ID/EN tool translation', async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: /Business Analyst/i }).click()
    const filteredCards = await page.locator('.workspace-grid .workspace-card').count()
    expect(filteredCards).toBeGreaterThanOrEqual(4)
    expect(filteredCards).toBeLessThan(22)

    await page.getByRole('button', { name: /All Roles|Semua Peran/i }).click()
    await expect(page.locator('.workspace-grid .workspace-card')).toHaveCount(22)

    await page.locator('button.menu-toggle').click()
    await page.locator('.nav-drawer-footer .language-option', { hasText: 'ID' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('link', { name: /Studio Kebutuhan BA & Gherkin/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Hub PM & Otomasi Jira/i })).toBeVisible()
  })

  test('/knowledge-graph renders interactive SVG topology nodes and supports Postman export on /api-playground', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await page.goto('/knowledge-graph')
    const svg = page.locator('svg.kg-svg')
    await expect(svg).toBeVisible()

    const tsNode = svg.getByRole('option', { name: /Maintainable TypeScript/i })
    await tsNode.click()
    await expect(page.locator('.knowledge-detail h2')).toHaveText('Maintainable TypeScript')

    await page.getByRole('button', { name: /Copy Mermaid|Salin Mermaid/i }).click()
    await expect(page.getByRole('status')).toContainText(/Mermaid/i)

    await page.goto('/api-playground')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export Postman v2\.1|Ekspor Postman v2\.1/i }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('dreamex-api.postman_collection.json')
  })

  test('/tools supports Print PDF action, BYOK AI mock inference, and Jira push validation', async ({ page }) => {
    await page.route('https://generativelanguage.googleapis.com/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'VERIFIED BYOK FINDING: Add idempotency lock TTL.' }] } }],
        }),
      })
    })

    await page.goto('/tools')
    await expect(page.getByRole('button', { name: /Print \/ Export PDF|Cetak \/ Ekspor PDF/i })).toBeVisible()

    await page.getByRole('button', { name: /Configure BYOK Live AI|Aktifkan AI Langsung/i }).click()
    await page.getByLabel(/Session API Key|API Key Sesi/i).fill('AIzaTestMockKey12345')
    await page.getByRole('button', { name: /Review Active Pillar|Audit Pilar Aktif/i }).click()
    await expect(page.getByText(/VERIFIED BYOK FINDING/i)).toBeVisible()

    await page.getByTestId('pillar-tab-jira').click()
    await page.getByRole('button', { name: /Push to Jira Cloud|Kirim ke Jira Cloud/i }).click()
    await page.getByLabel('Atlassian Site URL (HTTPS)').fill('http://insecure.atlassian.net')
    await page.getByRole('button', { name: /Send Issue to Jira|Kirim Tiket ke Jira/i }).click()
    await expect(page.getByRole('status')).toContainText(/HTTPS/i)
  })

  test('/github-ci supports Pull Requests tab inspection cleanly', async ({ page }) => {
    await page.route('https://api.github.com/repos/uknowdream/dreamex-tech/actions/runs*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflow_runs: [] }) }),
    )
    await page.route('https://api.github.com/repos/uknowdream/dreamex-tech/pulls*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 901,
            number: 42,
            title: 'feat: hybrid BYOK Gemini & interactive topology graph',
            state: 'open',
            draft: false,
            user: { login: 'uknowdream' },
            head: { ref: 'feat/ai-v3' },
            base: { ref: 'main' },
            updated_at: '2026-11-15T10:00:00Z',
          },
        ]),
      }),
    )

    await page.goto('/github-ci')
    await page.getByRole('tab', { name: /Pull Requests|Pull Request/i }).click()
    await expect(page.getByText(/feat: hybrid BYOK Gemini/i)).toBeVisible()
  })
})
