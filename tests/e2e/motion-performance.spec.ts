import { expect, test } from '@playwright/test'

test('homepage uses lightweight transform/opacity motion without expensive blur loops', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const motion = await page.evaluate(() => {
    const animationName = (selector: string) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element).animationName : null
    }
    const pseudo = (selector: string, type: string) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element, type).display : null
    }
    const header = document.querySelector('.site-header')
    return {
      intro: {
        heading: animationName('.hero h1'),
        visual: animationName('.hero-visual'),
        orbit: animationName('.visual-orbit.orbit-one'),
        secondOrbit: animationName('.visual-orbit.orbit-two'),
        topChip: animationName('.floating-chip.chip-top'),
        bottomChip: animationName('.floating-chip.chip-bottom'),
        statusPulse: animationName('.eyebrow-dot'),
        featureSway: animationName('.art-symbol'),
      },
      staticElements: {
        terminal: animationName('.terminal'),
        articleCard: animationName('.article-card'),
        launchpadCard: animationName('.launchpad-card'),
        gridlines: animationName('.hero-gridlines'),
      },
      heroPseudoBefore: pseudo('.hero', '::before'),
      heroPseudoAfter: pseudo('.hero', '::after'),
      headerBackdrop: header ? getComputedStyle(header).backdropFilter : null,
    }
  })

  expect(motion.intro.heading).toBe('dx-enter')
  expect(motion.intro.visual).toBe('dx-hero-float')
  expect(motion.intro.orbit).toBe('dx-orbit-spin')
  expect(motion.intro.secondOrbit).toBe('dx-orbit-spin-reverse')
  expect(motion.intro.topChip).toBe('dx-chip-float')
  expect(motion.intro.bottomChip).toBe('dx-chip-float')
  expect(motion.intro.statusPulse).toBe('dx-status-pulse')
  expect(motion.intro.featureSway).toBe('dx-symbol-sway')

  expect(motion.staticElements.terminal).toBe('none')
  expect(motion.staticElements.articleCard).toBe('none')
  expect(motion.staticElements.launchpadCard).toBe('none')
  expect(motion.staticElements.gridlines).toBe('none')
  expect(motion.heroPseudoBefore).toBe('none')
  expect(motion.heroPseudoAfter).toBe('none')
  expect(motion.headerBackdrop).toBe('none')
})

test('reduced-motion disables animated movement and keeps hero content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const result = await page.evaluate(() => {
    const selectors = [
      '.hero .eyebrow',
      '.hero h1',
      '.hero .hero-description',
      '.hero .hero-actions',
      '.hero .hero-stats',
      '.hero-visual',
      '.visual-orbit',
      '.floating-chip',
      '.eyebrow-dot',
      '.terminal-live i',
      '.art-symbol',
    ]
    return selectors.flatMap(selector => Array.from(document.querySelectorAll<HTMLElement>(selector)).map(element => {
      const style = getComputedStyle(element)
      return { selector, animationName: style.animationName, opacity: style.opacity }
    }))
  })

  expect(result.length).toBeGreaterThanOrEqual(11)
  for (const item of result) {
    expect(item.animationName, item.selector).toBe('none')
    expect(item.opacity, item.selector).toBe('1')
  }
  await expect(page.locator('.hero h1')).toBeVisible()
  await expect(page.locator('.hero .hero-actions')).toBeVisible()

  const primaryAction = page.locator('.hero .hero-actions .button').first()
  await primaryAction.hover()
  const hoverTransform = await primaryAction.evaluate(element => getComputedStyle(element).transform)
  expect(hoverTransform).toBe('none')
})

test('homepage scroll path avoids per-element reveal work and updates progress without React state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('main#main-content')).toBeVisible()

  const initial = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('.site-header')
    const articleCard = document.querySelector<HTMLElement>('.article-card')
    const launchpadCard = document.querySelector<HTMLElement>('.launchpad-card')
    const before = header ? window.getComputedStyle(header) : null
    const heroBefore = window.getComputedStyle(document.querySelector('.hero')!, '::before')
    const heroAfter = window.getComputedStyle(document.querySelector('.hero')!, '::after')
    return {
      headerBackdrop: before?.backdropFilter,
      initialProgressTransform: window.getComputedStyle(document.querySelector('.site-scroll-progress > span')!).transform,
      heroBeforeDisplay: heroBefore.display,
      heroAfterDisplay: heroAfter.display,
      articleAnimation: articleCard ? window.getComputedStyle(articleCard).animationName : null,
      launchpadAnimation: launchpadCard ? window.getComputedStyle(launchpadCard).animationName : null,
      revealCount: document.querySelectorAll('.motion-reveal').length,
      hasContentVisibility: ['.topics-section', '.launchpad-section', '.featured-section', '.articles-section', '.newsletter']
        .every(selector => window.getComputedStyle(document.querySelector(selector)!).contentVisibility === 'auto'),
    }
  })

  expect(initial.headerBackdrop).toBe('none')
  expect(initial.initialProgressTransform).toBe('matrix(0, 0, 0, 1, 0, 0)')
  expect(initial.heroBeforeDisplay).toBe('none')
  expect(initial.heroAfterDisplay).toBe('none')
  expect(initial.articleAnimation).toBe('none')
  expect(initial.launchpadAnimation).toBe('none')
  expect(initial.revealCount).toBe(0)
  expect(initial.hasContentVisibility).toBe(true)

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(page.locator('.footer-inner')).toBeVisible()
  await expect(page.locator('.site-scroll-progress')).toHaveAttribute('aria-valuenow', '100')
  await expect(page.locator('.newsletter')).toBeVisible()

  const afterScroll = await page.evaluate(() => ({
    revealCount: document.querySelectorAll('.motion-reveal').length,
    progressTransform: getComputedStyle(document.querySelector('.site-scroll-progress > span')!).transform,
  }))
  expect(afterScroll.revealCount).toBe(0)
  expect(afterScroll.progressTransform).toBe('matrix(1, 0, 0, 1, 0, 0)')
})
