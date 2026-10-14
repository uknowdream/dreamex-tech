import { expect, type Page } from '@playwright/test'

/** Open the primary navigation only when it is collapsed; safe on desktop and mobile projects. */
export async function ensurePrimaryNavigationVisible(page: Page) {
  const navigation = page.getByRole('navigation', { name: /Main navigation|Navigasi utama/i })
  if (!(await navigation.isVisible())) {
    const toggle = page.getByRole('button', { name: /Open menu|Buka menu/i })
    if (await toggle.isVisible()) await toggle.click()
  }
  await expect(navigation).toBeVisible()
  return navigation
}

/** Open the unified command palette and return its dialog for focused assertions. */
export async function openCommandPalette(page: Page) {
  const trigger = page.getByRole('button', { name: /Search tools and articles|Cari tools dan artikel/i })
  await expect(trigger).toBeVisible()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  await expect(dialog).toBeVisible()
  return dialog
}
