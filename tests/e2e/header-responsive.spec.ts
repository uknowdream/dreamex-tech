import { expect, test } from '@playwright/test'

test('Quick Find stays inside the closed navigation drawer, not the desktop header row', async ({ page }) => {
  for (const width of [1280, 1366, 1440, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    await expect(page.locator('.site-header')).toBeVisible()
    await expect(page.locator('.nav-drawer-search')).toBeHidden()

    const layout = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.site-header')!
      const wrap = header.querySelector<HTMLElement>('.nav-wrap')!
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        header: header.clientWidth,
        wrap: wrap.clientWidth,
        wrapContent: wrap.scrollWidth,
      }
    })

    expect(layout.document, `document overflow at ${width}px: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.viewport + 1)
    expect(layout.wrapContent, `header content overflow at ${width}px: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.wrap + 1)

    if (width <= 1440) {
      await expect(page.locator('.menu-toggle')).toBeVisible()
      await page.locator('.menu-toggle').click()
      await expect(page.locator('#primary-navigation[role="dialog"]')).toBeVisible()
      await expect(page.locator('#nav-drawer-search-input')).toBeVisible()
      await page.locator('#nav-drawer-search-input').fill('API Playground')
      await expect(page.locator('#primary-navigation a[href="/api-playground"]')).toBeVisible()
      await page.locator('#primary-navigation .nav-drawer-close').click()
      await expect(page.locator('.nav-drawer-search')).toBeHidden()
    } else {
      await expect(page.locator('.menu-toggle')).toBeHidden()
      await expect(page.locator('#primary-navigation.nav-links')).toBeVisible()
    }
  }
})

test('laptop header collapses into a usable drawer and keeps Quick Find searchable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')

  await expect(page.locator('.menu-toggle')).toBeVisible()
  await expect(page.locator('.nav-drawer-search')).toBeHidden()

  await page.locator('.menu-toggle').click()
  const drawer = page.locator('#primary-navigation[role="dialog"]')
  await expect(drawer).toBeVisible()
  const search = page.getByRole('searchbox', { name: /quick find/i })
  await expect(search).toBeVisible()
  await search.fill('API Playground')
  await expect(drawer.locator('a[href="/api-playground"]')).toBeVisible()
})
