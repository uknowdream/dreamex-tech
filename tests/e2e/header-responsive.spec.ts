import { expect, test } from '@playwright/test'

const desktopWidths = [1281, 1366, 1440, 1600, 1920]
const drawerWidths = [1280, 1100, 1024, 768, 761]

test('desktop header hides drawer-only Quick Find and keeps navigation controls separated', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Touch-capable viewports intentionally use the navigation drawer even when emulating a wide screen.')
  for (const width of desktopWidths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('.site-header')).toBeVisible()
    await expect(page.locator('.site-header .nav-drawer-search')).toBeHidden()

    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector)
        if (!element) return null
        const box = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return { left: box.left, right: box.right, width: box.width, display: style.display }
      }
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        brand: rect('.site-header .brand'),
        command: rect('.site-header .command-trigger'),
        navigation: rect('.site-header #primary-navigation'),
        quickFind: rect('.site-header .nav-drawer-search'),
      }
    })

    expect(geometry.document, `Horizontal page overflow at ${width}px`).toBeLessThanOrEqual(geometry.viewport + 1)
    expect(geometry.brand).not.toBeNull()
    expect(geometry.command).not.toBeNull()
    expect(geometry.navigation).not.toBeNull()
    expect(geometry.quickFind?.display).toBe('none')
    expect(geometry.brand!.right, `Brand overlaps command control at ${width}px`).toBeLessThanOrEqual(geometry.command!.left + 1)
    expect(geometry.command!.right, `Command control overlaps main nav at ${width}px`).toBeLessThanOrEqual(geometry.navigation!.left + 1)
    expect(geometry.navigation!.width, `Main nav has no usable width at ${width}px`).toBeGreaterThan(250)
  }
})

test('tablet/laptop header uses a menu drawer and Quick Find works inside it', async ({ page }) => {
  for (const width of drawerWidths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('.site-header .menu-toggle')).toBeVisible()
    await expect(page.locator('.site-header #primary-navigation')).toBeHidden()
    await expect(page.locator('.site-header .nav-drawer-search')).toBeHidden()

    await page.locator('.site-header .menu-toggle').click()
    const nav = page.locator('.site-header #primary-navigation')
    await expect(nav).toBeVisible()
    await expect(nav).toHaveAttribute('role', 'dialog')
    const quickFind = page.locator('.site-header .nav-drawer-search')
    await expect(quickFind).toBeVisible()
    const search = quickFind.locator('input[type="search"]')
    await expect(search).toBeVisible()
    await search.fill('API Playground')
    await expect(nav.locator('a[href="/api-playground"]')).toBeVisible()
    await expect(nav.locator('.nav-platform')).toHaveAttribute('open', '')
    await page.keyboard.press('Escape')
    await expect(nav).toBeHidden()
  }
})

test('touch navigation keeps the drawer on even wide desktop-site viewports', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'This case validates the coarse-pointer layout only.')
  for (const width of [1281, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const menuToggle = page.locator('.site-header .menu-toggle')
    const nav = page.locator('.site-header #primary-navigation')
    await expect(menuToggle).toBeVisible()
    await expect(nav).toBeHidden()
    await expect(page.locator('.site-header .nav-drawer-search')).toBeHidden()
    await menuToggle.click()
    await expect(nav).toBeVisible()
    await expect(nav.locator('.nav-drawer-search')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(nav).toBeHidden()
  }
})

test('desktop command palette remains available when drawer Quick Find is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.site-header .nav-drawer-search')).toBeHidden()
  await page.getByRole('button', { name: /search tools and articles|cari tools dan artikel/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
