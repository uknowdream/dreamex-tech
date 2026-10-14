import { expect, test } from '@playwright/test'

const coreRoutes = [
  '/',
  '/qa-studio',
  '/command-center',
  '/security-center',
  '/supply-chain-intelligence',
  '/api-playground',
]

test('core engineering routes expose a main landmark, primary heading, language, and image alternatives', async ({ page }) => {
  for (const route of coreRoutes) {
    await page.goto(route)
    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(page.locator('main#main-content h1')).toHaveCount(1)
    const lang = await page.locator('html').getAttribute('lang')
    expect(['en', 'id']).toContain(lang)

    const imagesWithoutAlt = await page.locator('img').evaluateAll(images =>
      images.filter(image => !image.hasAttribute('alt')).map(image => image.getAttribute('src') ?? '(inline image)')
    )
    expect(imagesWithoutAlt, `Images without an alt attribute on ${route}`).toEqual([])
  }
})

test('skip navigation is keyboard reachable and reduced-motion preference is supported', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skipLink = page.locator('a.skip-link')
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const signals = await page.evaluate(() => ({
    preferenceHonored: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    stylesheetRulePresent: Array.from(document.styleSheets).some(sheet => {
      try {
        return Array.from(sheet.cssRules).some(rule => rule.cssText.includes('prefers-reduced-motion'))
      } catch {
        return false
      }
    }),
  }))
  expect(signals.preferenceHonored).toBe(true)
  expect(signals.stylesheetRulePresent).toBe(true)
})

test('critical routes do not introduce document-level horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of coreRoutes) {
    await page.goto(route)
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }))
    expect(dimensions.document, `Horizontal overflow on ${route}: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1)
  }
})
