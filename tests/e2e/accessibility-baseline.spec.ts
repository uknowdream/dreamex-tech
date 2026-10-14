import { expect, test } from '@playwright/test'

const routes = [
  { path: '/', heading: /Engineer with intent|Rekayasa dengan tujuan/i },
  { path: '/api-playground', heading: /API Playground/i },
  { path: '/command-center', heading: /Operate with clarity|Kelola dengan jelas/i },
  { path: '/security-center', heading: /Security|Keamanan/i },
  { path: '/quality-intelligence', heading: /Turn test results|Ubah hasil pengujian/i },
  { path: '/workspace', heading: /One workspace|Satu workspace/i },
  { path: '/supply-chain-intelligence', heading: /Know what ships|Ketahui yang dirilis/i },
  { path: '/control-plane', heading: /Engineering, in control|Engineering, lebih terkendali/i },
  { path: '/roadmap', heading: /Build with intent|Bangun dengan arah/i },
  { path: '/engineering-intelligence', heading: /Engineering Intelligence/i },
  { path: '/performance', heading: /Measure what|Ukur yang/i },
  { path: '/knowledge-graph', heading: /Follow the|Ikuti/i },
  { path: '/devtools', heading: /Developer Utilities|Utilitas Developer/i },
  { path: '/lab', heading: /Engineering Lab/i },
  { path: '/learn', heading: /Learn with|Belajar lebih/i },
  { path: '/reading-list', heading: /Reading list|Daftar bacaan/i },
]

const widths = [320, 360, 390, 768, 1024, 1440]

for (const route of routes) {
  test(`accessibility baseline: ${route.path} at supported viewport widths`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(route.path)
    await expect(page.locator('main#main-content')).toHaveCount(1)
    await expect(page.locator('main#main-content h1').first()).toBeVisible()
    await expect(page.locator('main#main-content h1').first()).toContainText(route.heading)
    const metadata = await page.evaluate(() => ({ title: document.title.trim(), lang: document.documentElement.lang.trim() }))
    expect(metadata.title, route.path + ' should have a document title').not.toBe('')
    expect(metadata.lang, route.path + ' should declare a document language').toMatch(/^(en|id)(-|$)/)
    await expect(page.locator('a.skip-link')).toHaveCount(1)

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }))
      expect(dimensions.document, `${route.path} overflows at ${width}px: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport)
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.keyboard.press('Tab')
    await expect(page.locator('a.skip-link')).toBeFocused()
    await expect(page.locator('a.skip-link')).toBeVisible()
  })
}

test('primary navigation and command search expose accessible names', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: /Main navigation|Navigasi utama/i })
  if (!(await navigation.isVisible())) {
    const menuToggle = page.getByRole('button', { name: /Open menu|Buka menu/i })
    if (await menuToggle.isVisible()) await menuToggle.click()
  }
  await expect(navigation).toBeVisible()
  await expect(page.getByRole('button', { name: /Search tools and articles|Cari tools dan artikel/i })).toBeVisible()
  await page.getByRole('button', { name: /Search tools and articles|Cari tools dan artikel/i }).click()
  const dialog = page.getByRole('dialog', { name: /Jump to anything|Cari dan buka apa saja/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: /Search commands|Cari perintah/i })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})
