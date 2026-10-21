import { expect, test } from '@playwright/test'

const routeCases = [
  { path: '/', title: /Think deeper\. Build smarter\.|Think deeper, build smarter/i },
  { path: '/api-playground', title: /API Playground & Contract Studio/i },
  { path: '/security-center', title: /Security & Privacy Center/i },
  { path: '/reliability-center', title: /Reliability & Incident Center/i },
  { path: '/about', title: /About DreamEx Tech/i },
  { path: '/blog/playwright-test-architecture', title: /DreamEx Tech/i },
]

test('core routes publish route-specific canonical and social metadata', async ({ page }) => {
  const observedTitles = new Set<string>()
  for (const route of routeCases) {
    await page.goto(route.path)
    await expect(page).toHaveTitle(route.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://dreamex.tech${route.path === '/' ? '/' : route.path}`)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://dreamex.tech${route.path === '/' ? '/' : route.path}`)
    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
      socialTitle: document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? '',
      robots: document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? '',
    }))
    expect(metadata.description.length, route.path + ' description length').toBeGreaterThanOrEqual(50)
    expect(metadata.description.length, route.path + ' description length').toBeLessThanOrEqual(180)
    expect(metadata.socialTitle).toBe(metadata.title)
    expect(metadata.robots).toMatch(/index, follow/i)
    expect(observedTitles.has(metadata.title), 'duplicate title on ' + route.path).toBe(false)
    observedTitles.add(metadata.title)
  }
})

test('route metadata follows the selected language and unknown articles are noindex', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/api-playground')
  await expect(page).toHaveTitle(/API Playground & Contract Studio/i)
  const touchInput = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)
  if (touchInput) {
    // Desktop-width touch devices intentionally use the drawer rather than desktop navigation.
    await page.getByRole('button', { name: /Open menu|Buka menu/i }).click()
    const drawer = page.getByRole('dialog', { name: /Navigation|Navigasi/i })
    await drawer.getByRole('button', { name: 'ID', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'ID', exact: true }).click()
  }
  await expect(page).toHaveTitle(/API Playground & Contract Studio/i)
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Periksa alur API/)
  await page.goto('/blog/not-a-real-article')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
})
