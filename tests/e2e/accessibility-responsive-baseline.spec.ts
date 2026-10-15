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


test('responsive layout stays within the viewport at key widths', async ({ page }) => {
  const widths = [320, 360, 390, 430, 640, 768, 1024, 1280, 1440]
  const route = '/'
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(route)
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }))
    expect(metrics.document, `Document overflow at ${width}px: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.viewport + 1)
    expect(metrics.body, `Body overflow at ${width}px: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.viewport + 1)
  }
})

test('mobile navigation and expanded engineering links remain visible and scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menuButton = page.locator('.menu-toggle')
  await expect(menuButton).toBeVisible()
  await menuButton.click()
  const drawer = page.locator('#primary-navigation.nav-open')
  await expect(drawer).toBeVisible()
  await expect(drawer.locator('.nav-drawer-head')).toBeVisible()
  await expect(drawer.locator('.nav-drawer-search-control')).toBeVisible()

  const platform = drawer.locator('.nav-platform')
  await expect(platform.locator('summary')).toBeVisible()
  await platform.locator('summary').click()
  const panel = platform.locator('.nav-mega-panel')
  await expect(panel).toBeVisible()
  await expect(panel.locator('.nav-mega-group').first()).toBeVisible()
  await expect(panel.locator('.nav-mega-group a').first()).toBeVisible()

  const geometry = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('#primary-navigation')
    const panel = document.querySelector<HTMLElement>('.nav-platform[open] .nav-mega-panel')
    if (!nav || !panel) return null
    const navRect = nav.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    return {
      viewportWidth: document.documentElement.clientWidth,
      navLeft: navRect.left,
      navRight: navRect.right,
      panelWidth: panelRect.width,
      panelHeight: panelRect.height,
      panelScrollHeight: panel.scrollHeight,
    }
  })
  expect(geometry).not.toBeNull()
  expect(geometry!.navLeft).toBeGreaterThanOrEqual(0)
  expect(geometry!.navRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1)
  expect(geometry!.panelWidth).toBeGreaterThan(0)
  expect(geometry!.panelHeight).toBeGreaterThan(0)
  expect(geometry!.panelScrollHeight).toBeGreaterThan(0)
})
