import { expect, test } from '@playwright/test'

test('Page Health Audit runs locally, filters findings, and exports a JSON report', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/site-audit')
  await expect(page.locator('main#main-content h1')).toBeVisible()
  await expect(page.getByRole('button', { name: /Run audit|Jalankan audit/i })).toBeVisible()
  const exportButton = page.getByRole('button', { name: /Export JSON|Ekspor JSON/i })
  await expect(exportButton).toBeDisabled()
  await page.getByRole('button', { name: /Run audit|Jalankan audit/i }).click()
  await expect(page.getByRole('region', { name: /Audit summary|Ringkasan audit/i })).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Findings|Temuan/i })).toBeVisible()
  const warningFilter = page.getByRole('button', { name: /Warnings|Peringatan/i })
  await warningFilter.click()
  await expect(warningFilter).toHaveAttribute('aria-pressed', 'true')
  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^dreamex-page-audit-\d{4}-\d{2}-\d{2}\.json$/)
})

test('Page Health Audit stays within narrow mobile viewports', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/site-audit')
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
    expect(dimensions.document, `Page audit overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
    expect(dimensions.body, `Page audit body overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
  }
})

test('Page Health Audit inspects pasted custom HTML snippets offline with DOMParser', async ({ page }) => {
  await page.goto('/site-audit')
  await page.getByRole('tab', { name: /Inspect Custom HTML|Audit HTML Eksternal/i }).click()
  const editor = page.locator('#site-audit-html-input')
  await expect(editor).toBeVisible()
  await page.getByRole('button', { name: /Run audit|Jalankan audit/i }).click()
  await expect(page.getByRole('heading', { name: /Images missing alt attributes|Gambar tanpa atribut alt/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /New-tab links should use noopener|Tautan tab baru disarankan memakai rel="noopener"/i })).toBeVisible()
})

test('Theme polarity toggle switches cleanly between dark Obsidian and Daylight light modes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const getActiveThemeToggle = async () => {
    const desktopToggle = page.locator('.nav-desktop-language .theme-toggle-btn')
    if (await desktopToggle.isVisible()) return desktopToggle
    const menuToggle = page.locator('.menu-toggle')
    if (await menuToggle.isVisible()) {
      const expanded = await menuToggle.getAttribute('aria-expanded')
      if (expanded !== 'true') await menuToggle.click()
    }
    return page.locator('.nav-drawer-footer .theme-toggle-btn')
  }

  const toggleBtn = await getActiveThemeToggle()
  await expect(toggleBtn).toBeVisible()
  await toggleBtn.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const toggleAfterReload = await getActiveThemeToggle()
  await expect(toggleAfterReload).toBeVisible()
  await toggleAfterReload.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('Light mode applies high-contrast light surfaces across home, dashboards, editorial, and overlays', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dreamex-theme-v1', 'light')
  })

  const checks: Array<{ path: string; surface: string; text: string }> = [
    { path: '/', surface: '.hero-ai-cockpit', text: '.hero h1' },
    { path: '/', surface: '.articles-section', text: '.article-card h3 a' },
    { path: '/tools', surface: 'body', text: 'main#main-content h1' },
    { path: '/command-center', surface: '.command-center-hero', text: 'main#main-content h1' },
    { path: '/quality-intelligence', surface: '.quality-intelligence-empty-state', text: '.quality-intelligence-empty-state h2' },
    { path: '/rss', surface: '.rss-article-card', text: '.rss-list-heading h2' },
    { path: '/about', surface: '.about-hero', text: '.about-prose p' },
    { path: '/blog/qa-automation-foundations', surface: '.article-toc', text: '.article-toc a' },
  ]

  for (const item of checks) {
    await page.goto(item.path)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const result = await page.evaluate(({ surfaceSel, textSel }) => {
      const parseColor = (str: string): [number, number, number] | null => {
        const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/i)
        if (!m || (m[4] !== undefined && Number(m[4]) <= 0.1)) return null
        return [Number(m[1]), Number(m[2]), Number(m[3])]
      }
      const lum = ([r, g, b]: [number, number, number]) => {
        const chan = [r, g, b].map(v => {
          const n = v / 255
          return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2]
      }
      const surface = document.querySelector(surfaceSel)
      const textEl = document.querySelector(textSel)
      const sStyle = surface ? getComputedStyle(surface) : getComputedStyle(document.body)
      const gradRgb = sStyle.backgroundImage?.match(/linear-gradient[^;]+rgba?\(\s*\d+,\s*\d+,\s*\d+[^)]*\)/i)?.[0]
      const parsedSurface = parseColor(sStyle.backgroundColor) ?? (gradRgb ? parseColor(gradRgb) : null) ?? parseColor(getComputedStyle(document.body).backgroundColor)
      const parsedBody = parseColor(getComputedStyle(document.body).backgroundColor)
      const parsedFg = parseColor(textEl ? getComputedStyle(textEl).color : getComputedStyle(document.body).color)
      return {
        bodyLum: parsedBody ? lum(parsedBody) : 0,
        surfaceLum: parsedSurface ? lum(parsedSurface) : 0,
        textLum: parsedFg ? lum(parsedFg) : 1,
      }
    }, { surfaceSel: item.surface, textSel: item.text })

    expect(result.bodyLum, `${item.path} body should be light`).toBeGreaterThan(0.75)
    expect(result.surfaceLum, `${item.path} (${item.surface}) surface should be light`).toBeGreaterThan(0.65)
    expect(result.textLum, `${item.path} (${item.text}) text should be dark`).toBeLessThan(0.25)
  }

  // Verify Command Palette & Mega-Menu open cleanly in Light Mode
  await page.goto('/')
  const trigger = page.locator('.command-trigger').first()
  if (await trigger.isVisible()) {
    await trigger.click()
    await expect(page.locator('.command-dialog')).toBeVisible()
    const paletteLum = await page.evaluate(() => {
      const m = getComputedStyle(document.querySelector('.command-dialog')!).backgroundColor.match(/(\d+),\s*(\d+),\s*(\d+)/)
      return m ? (+m[1] + +m[2] + +m[3]) / 3 : 0
    })
    expect(paletteLum).toBeGreaterThan(220)
    await page.keyboard.press('Escape')
  }
})
