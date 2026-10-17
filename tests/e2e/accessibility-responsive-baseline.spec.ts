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
      viewportHeight: document.documentElement.clientHeight,
      navLeft: navRect.left,
      navRight: navRect.right,
      navTop: navRect.top,
      navBottom: navRect.bottom,
      navWidth: navRect.width,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      panelWidth: panelRect.width,
      panelHeight: panelRect.height,
      panelScrollHeight: panel.scrollHeight,
    }
  })
  expect(geometry).not.toBeNull()
  expect(geometry!.navLeft).toBeGreaterThanOrEqual(0)
  expect(geometry!.navRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1)
  expect(geometry!.navWidth).toBeLessThanOrEqual(geometry!.viewportWidth)
  expect(geometry!.navBottom).toBeLessThanOrEqual(geometry!.viewportHeight + 1)
  expect(geometry!.panelLeft).toBeGreaterThanOrEqual(geometry!.navLeft - 1)
  expect(geometry!.panelRight).toBeLessThanOrEqual(geometry!.navRight + 1)
  expect(geometry!.panelWidth).toBeGreaterThan(0)
  expect(geometry!.panelHeight).toBeGreaterThan(0)
  expect(geometry!.panelScrollHeight).toBeGreaterThan(0)
})

test('navigation drawer keeps filtered links hidden and uses a bounded content-led sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.menu-toggle').click()
  const drawer = page.locator('#primary-navigation.nav-open[role="dialog"]')
  await expect(drawer).toBeVisible()

  const search = drawer.locator('#nav-drawer-search-input')
  await search.fill('no-such-dreamex-destination')
  const emptyState = drawer.locator('.nav-search-empty')
  await expect(emptyState).toBeVisible()
  const hiddenLinks = drawer.locator('a[hidden]')
  await expect(hiddenLinks.first()).toHaveCSS('display', 'none')

  await search.fill('')
  await expect(drawer.getByRole('link', { name: /Journal|Jurnal/ })).toBeVisible()
  const geometry = await drawer.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
    }
  })
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight + 2)
})

test('navigation drawer and submenu remain bounded at tablet and desktop widths', async ({ page }) => {
  for (const width of [768, 820, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const menuButton = page.locator('.menu-toggle')
    if (await menuButton.isVisible()) {
      await menuButton.click()
    } else {
      await page.locator('.nav-platform > summary').first().click()
    }

    const nav = page.locator('#primary-navigation')
    if (await nav.getAttribute('role') === 'dialog') {
      await expect(nav).toBeVisible()
    }

    const platform = nav.locator('.nav-platform').first()
    // On desktop, the menu trigger above already opens the details element.
    // Only click the summary when it is currently closed; clicking an open
    // summary again closes the panel and makes the geometry check misleading.
    if (await platform.getAttribute('open') === null) {
      await platform.locator('summary').click()
    }
    const panel = platform.locator('.nav-mega-panel')
    await expect(panel).toBeVisible()

    const bounds = await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>('#primary-navigation')
      const panel = document.querySelector<HTMLElement>('.nav-platform[open] > .nav-mega-panel')
      if (!nav || !panel) return null
      const nr = nav.getBoundingClientRect()
      const pr = panel.getBoundingClientRect()
      return {
        viewport: document.documentElement.clientWidth,
        navLeft: nr.left,
        navRight: nr.right,
        navWidth: nr.width,
        panelLeft: pr.left,
        panelRight: pr.right,
        panelWidth: pr.width,
        panelScrollHeight: panel.scrollHeight,
        panelClientHeight: panel.clientHeight,
        isDrawer: nav.getAttribute('role') === 'dialog',
      }
    })
    expect(bounds, `Navigation geometry unavailable at ${width}px`).not.toBeNull()
    expect(bounds!.navLeft, `Navigation left edge at ${width}px`).toBeGreaterThanOrEqual(-1)
    expect(bounds!.navRight, `Navigation right edge at ${width}px`).toBeLessThanOrEqual(bounds!.viewport + 1)
    expect(bounds!.panelLeft, `Submenu left edge at ${width}px`).toBeGreaterThanOrEqual(-1)
    expect(bounds!.panelRight, `Submenu right edge at ${width}px`).toBeLessThanOrEqual(bounds!.viewport + 1)
    if (bounds!.isDrawer) {
      expect(bounds!.panelLeft, `Submenu left edge escapes drawer at ${width}px`).toBeGreaterThanOrEqual(bounds!.navLeft - 1)
      expect(bounds!.panelRight, `Submenu right edge escapes drawer at ${width}px`).toBeLessThanOrEqual(bounds!.navRight + 1)
    }
    expect(bounds!.panelWidth, `Submenu width at ${width}px`).toBeGreaterThan(0)
    expect(bounds!.panelScrollHeight).toBeGreaterThan(0)
    expect(bounds!.panelClientHeight).toBeGreaterThan(0)
  }
})

test('navigation drawer close returns keyboard focus to the menu toggle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const toggle = page.locator('.menu-toggle')
  await toggle.click()
  const drawer = page.locator('#primary-navigation.nav-open[role="dialog"]')
  await expect(drawer).toBeVisible()
  const closeButton = drawer.locator('.nav-drawer-close, button[aria-label*="Close"], button[aria-label*="Tutup"]')
  await expect(closeButton.first()).toBeVisible()
  await closeButton.first().click()
  await expect(page.locator('#primary-navigation.nav-open')).toHaveCount(0)
  await expect(toggle).toBeFocused()
})
