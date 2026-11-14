import { test, expect } from '@playwright/test'

test.describe('DreamEx Tech AI Visual Studio, Cover Imagery & Responsive Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dreamex-language', 'en')
    })
  })

  test('Hero backdrop, lazy NeuralAiStudio, AI synthesizer & lightbox gallery work interactively', async ({ page }) => {
    await page.goto('/')

    const heroBackdrop = page.locator('.hero-core-backdrop')
    await expect(heroBackdrop).toBeAttached()

    await expect(page.locator('.hero a[href="/tools"]').first()).toBeVisible()

    // Flagship Hero AI Cockpit replaces legacy engineering.ts panel
    const cockpit = page.getByTestId('hero-ai-cockpit')
    await expect(cockpit).toBeVisible()
    await expect(cockpit).not.toContainText('engineering.ts')

    const cockpitImg = cockpit.locator('.hero-cockpit-visual img')
    await expect
      .poll(async () => cockpitImg.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))
      .toBeTruthy()

    const cockpitOutput = page.getByTestId('hero-cockpit-output')
    await expect(cockpitOutput).toContainText('N_max = 34')

    await cockpit.getByRole('tab', { name: '02 · QA AI' }).click()
    await expect(cockpitOutput).toContainText('orphan_rows')
    await expect(cockpit.locator('.hero-cockpit-cta')).toHaveAttribute('href', '/qa-studio')

    await cockpit.getByRole('tab', { name: '03 · BA & Jira AI' }).click()
    await expect(cockpitOutput).toContainText('Jira REST API')
    await expect(cockpit.locator('.hero-cockpit-cta')).toHaveAttribute('href', '/ba-hub')

    const studio = page.locator('.dx-ai-suite')
    await studio.scrollIntoViewIfNeeded()
    await expect(studio).toBeVisible()

    // Kinetic dual-track marquee
    await expect(page.locator('.dx-marquee-band .dx-marquee-pill').first()).toBeVisible()
    const pillCount = await page.locator('.dx-marquee-band .dx-marquee-pill').count()
    expect(pillCount).toBeGreaterThanOrEqual(16)

    // Neural constellation canvas & datacenter visual
    const neuralCard = page.locator('.dx-neural-canvas-card')
    await expect(neuralCard).toBeVisible()
    await expect(page.locator('canvas.dx-neural-canvas')).toBeVisible()

    // Live AI Co-Pilot Synthesizer switching across Architect, QA, BA, and PM
    const synthOutput = page.getByTestId('ai-synth-output')
    await expect(synthOutput).toContainText('ARCHITECTURAL SYNTHESIS')

    await page.getByRole('tab', { name: 'QA & Self-Healing AI' }).click()
    await expect(synthOutput).toContainText('orphan_rows')

    await page.getByRole('tab', { name: 'Business Analyst Studio' }).click()
    await expect(synthOutput).toContainText('Feature:')

    await page.getByRole('tab', { name: 'PM & Jira Neural Engine' }).click()
    await expect(synthOutput).toContainText('MONTE CARLO')

    // Custom prompt synthesis update
    const reqInput = page.getByLabel('System requirement or scenario input')
    await reqInput.fill('Zero-downtime blue-green ledger failover')
    await expect(synthOutput).toContainText('Zero-downtime blue-green ledger failover')

    // Visual Architecture Gallery filters + Lightbox open/Escape close
    const galleryCards = page.locator('.dx-gallery-card')
    await expect(galleryCards).toHaveCount(6)

    await page.getByRole('button', { name: 'AI & Neural' }).click()
    await expect(galleryCards).toHaveCount(2)

    await page.getByRole('button', { name: 'All Visuals (6)' }).click()
    await expect(galleryCards).toHaveCount(6)

    await galleryCards.first().locator('.dx-gallery-media').click()
    const lightbox = page.getByRole('dialog')
    await expect(lightbox).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(lightbox).toHaveCount(0)

    // Verify gallery & article cover images actually decode with non-zero dimensions
    const galleryImgs = page.locator('.dx-gallery-media img')
    const galleryImgCount = await galleryImgs.count()
    for (let i = 0; i < galleryImgCount; i++) {
      const img = galleryImgs.nth(i)
      await img.scrollIntoViewIfNeeded()
      await expect
        .poll(async () => img.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))
        .toBeTruthy()
    }

    const articleImgs = page.locator('.article-cover-img')
    const articleImgCount = await articleImgs.count()
    expect(articleImgCount).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < articleImgCount; i++) {
      const img = articleImgs.nth(i)
      await img.scrollIntoViewIfNeeded()
      await expect
        .poll(async () => img.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))
        .toBeTruthy()
    }

    // Engineering Digest / Release Radar form
    const digestForm = page.locator('.newsletter-form')
    if ((await digestForm.count()) > 0) {
      await digestForm.scrollIntoViewIfNeeded()
      await digestForm.locator('input[type="email"]').fill('architect@dreamex.tech')
      await digestForm.locator('button[type="submit"]').click()
      await expect(page.locator('.newsletter-status')).toBeVisible()
    }
  })

  test('Article reading view renders high-resolution article-hero-figure image cleanly', async ({ page }) => {
    await page.goto('/blog/evaluating-ai-features')
    const heroFigImg = page.locator('.article-hero-figure img')
    await expect(heroFigImg).toBeVisible()
    await expect
      .poll(async () => heroFigImg.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))
      .toBeTruthy()
  })

  for (const vp of [
    { name: 'mobile-320', width: 320, height: 568 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ]) {
    test(`Zero horizontal overflow across / and /tools at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      for (const route of ['/', '/tools']) {
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(overflow.scrollWidth, `Route ${route} overflowed at ${vp.name}`).toBeLessThanOrEqual(overflow.clientWidth + 1)
      }
    })
  }
})
