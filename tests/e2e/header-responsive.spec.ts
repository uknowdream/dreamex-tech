import { expect, test } from '@playwright/test'

test('desktop header keeps Quick Find inside the command palette, not in the navigation row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const navigation = page.locator('#primary-navigation')
  await expect(navigation).toBeVisible()
  await expect(navigation.locator('.nav-drawer-search')).toBeHidden()
  await expect(navigation.locator('.nav-recent-tools')).toBeHidden()
  await expect(page.locator('.site-header .command-trigger')).toBeVisible()
  await expect(page.locator('.site-header')).not.toHaveCSS('overflow-x', 'auto')
  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.site-header')!
    const brand = header.querySelector('.brand')!.getBoundingClientRect()
    const command = header.querySelector('.command-trigger')!.getBoundingClientRect()
    const nav = header.querySelector('#primary-navigation')!.getBoundingClientRect()
    return { width: document.documentElement.clientWidth, brandRight: brand.right, commandLeft: command.left, navRight: nav.right }
  })
  expect(geometry.brandRight).toBeLessThan(geometry.commandLeft)
  expect(geometry.navRight).toBeLessThanOrEqual(geometry.width + 1)
})

test('laptop navigation shows Quick Find only after opening the responsive drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/')

  const navigation = page.locator('#primary-navigation')
  await expect(navigation.locator('.nav-drawer-search')).toBeHidden()
  await page.getByRole('button', { name: /open navigation|buka menu|open menu/i }).click()
  await expect(navigation).toBeVisible()
  await expect(navigation.locator('.nav-drawer-search')).toBeVisible()
  await expect(navigation.locator('#nav-drawer-search-input')).toBeVisible()
  await navigation.locator('#nav-drawer-search-input').fill('quality')
  await expect(navigation.locator('#nav-drawer-search-input')).toHaveValue('quality')
})

test('compact mobile header keeps drawer search usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /open navigation|buka menu|open menu/i }).click()

  const search = page.locator('#nav-drawer-search-input')
  await expect(search).toBeVisible()
  await search.fill('api')
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1)
})
