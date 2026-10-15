import { expect, type Locator, type Page } from '@playwright/test'

/** Open primary navigation in a way that supports desktop navigation and the mobile drawer dialog. */
export async function ensurePrimaryNavigationVisible(page: Page): Promise<Locator> {
  const navigation = page.getByRole('navigation', { name: /Main navigation|Navigasi utama/i })
  if (await navigation.isVisible()) return navigation

  const drawer = page.getByRole('dialog', { name: /Navigation|Navigasi/i })
  if (await drawer.isVisible()) return drawer

  const toggle = page.getByRole('button', { name: /Open menu|Buka menu/i })
  if (await toggle.isVisible()) {
    await toggle.click()
    // The mobile drawer intentionally changes the nav landmark into a modal dialog.
    await expect(drawer).toBeVisible()
    return drawer
  }

  await expect(navigation).toBeVisible()
  return navigation
}

/** Open the unified command palette and return its dialog for focused assertions. */
export async function openCommandPalette(page: Page): Promise<Locator> {
  const trigger = page.getByRole('button', { name: /Search tools and articles|Cari tools dan artikel/i })
  await expect(trigger).toBeVisible()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  await expect(dialog).toBeVisible()
  return dialog
}
