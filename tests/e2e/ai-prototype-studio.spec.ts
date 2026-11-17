import { expect, test } from '@playwright/test'

test.describe('Autonomous AI Prototype & Multi-Agent Studio v5.0', () => {
  test('homepage renders 5-agent prototype bento stage, Hero 04 Proto AI tab, and navigates to /prototype', async ({ page }) => {
    await page.goto('/')

    const stage = page.getByTestId('home-prototype-stage')
    await expect(stage).toBeVisible()

    const opsBeforeText = await page.getByTestId('home-proto-ops').innerText()
    const opsBefore = Number.parseInt(opsBeforeText.replace(/[^\d]/g, ''), 10)
    await page.getByTestId('home-proto-simulate').click()
    const opsAfterText = await page.getByTestId('home-proto-ops').innerText()
    const opsAfter = Number.parseInt(opsAfterText.replace(/[^\d]/g, ''), 10)
    expect(opsAfter).toBe(opsBefore + 12)

    const cockpit = page.getByTestId('hero-ai-cockpit')
    await cockpit.getByRole('tab', { name: /04 · Proto AI/i }).click()
    await expect(page.getByTestId('hero-cockpit-output')).toContainText('agent-dag')
    await expect(cockpit.locator('.hero-cockpit-cta')).toHaveAttribute('href', '/prototype')

    await cockpit.locator('.hero-cockpit-cta').click()
    await expect(page).toHaveURL(/\/prototype$/)
    await expect(page.getByTestId('proto-studio-title')).toBeVisible()
  })

  test('prototype studio executes 5-agent DAG, enforces RBAC & chaos failover, switches tabs, and passes light/dark & 320px checks', async ({ page }) => {
    await page.goto('/prototype')
    await expect(page.getByTestId('proto-studio-title')).toBeVisible()

    // Switch blueprint to Enterprise Multi-Model AI Gateway
    await page.getByTestId('blueprint-ai-gateway').click()
    await expect(page.locator('.proto-window-url')).toContainText('sovereign-gateway')

    // Run 5-Agent DAG pipeline
    await page.getByTestId('run-agent-dag').click()
    await expect(page.locator('.proto-agent-node')).toHaveCount(5)

    // RBAC enforcement: Auditor role blocks mutations; Admin role dispatches
    await page.getByRole('button', { name: 'AUDITOR', exact: true }).click()
    await page.getByTestId('proto-dispatch-one').click()
    await expect(page.getByTestId('proto-trace-feed')).toContainText(/Auditor/i)

    await page.getByRole('button', { name: 'ADMIN', exact: true }).click()
    await page.getByTestId('proto-fault-toggle').click()
    await expect(page.locator('.proto-window-bar')).toContainText(/FAILOVER/i)
    await page.getByTestId('proto-dispatch-one').click()
    await expect(page.getByTestId('proto-trace-feed')).toContainText(/FAILOVER_GUARD/i)

    // Viewport switcher (Desktop / Tablet / Mobile)
    await page.getByTestId('proto-device-mobile').click()
    await expect(page.getByTestId('proto-viewport-shell')).toHaveClass(/device-mobile/)
    await page.getByTestId('proto-device-desktop').click()
    await expect(page.getByTestId('proto-viewport-shell')).toHaveClass(/device-desktop/)

    // Inspector tabs: React + Zod Code, Playwright Spec, SVG System Topology
    await page.getByRole('tab', { name: /React \+ Zod/i }).click()
    await expect(page.getByTestId('proto-code-output')).toContainText('z.object')

    await page.getByRole('tab', { name: /Playwright/i }).click()
    await expect(page.getByTestId('proto-playwright-output')).toContainText('@playwright/test')

    await page.getByRole('tab', { name: /System Topology|Topologi Sistem/i }).click()
    await expect(page.getByTestId('proto-topology-output').locator('.proto-topology-svg')).toBeVisible()

    // Daylight Light Mode polarity check
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light'
    })
    const lightSurfaceBg = await page.locator('.proto-section-card').first().evaluate(el => getComputedStyle(el).backgroundColor)
    expect(lightSurfaceBg).not.toBe('rgb(6, 11, 22)')

    // Responsive 320px zero-overflow check
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const dims = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        doc: document.documentElement.scrollWidth,
      }))
      expect(dims.doc, `Horizontal overflow at ${width}px`).toBeLessThanOrEqual(dims.viewport + 1)
    }
  })
})
