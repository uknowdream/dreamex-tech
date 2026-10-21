import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/qa-studio',
  '/api-playground',
  '/engineering-intelligence',
  '/team-workspace',
]

for (const route of routes) {
  test(`axe-core critical accessibility baseline: ${route}`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator('#main-content')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const summarize = (violation: typeof results.violations[number]) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 3).map(node => ({
        target: node.target,
        summary: node.failureSummary?.slice(0, 400),
      })),
    })
    const critical = results.violations.filter(violation => violation.impact === 'critical')
    console.info(`Axe audit ${route}: ${results.violations.length} WCAG violation group(s), ${critical.length} critical.`)
    if (results.violations.length) console.info(JSON.stringify(results.violations.map(summarize), null, 2))

    expect(critical.map(summarize), `Critical axe-core accessibility violations on ${route}`).toEqual([])
  })
}
