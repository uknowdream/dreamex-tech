import { expect, test } from '@playwright/test'

test('homepage restores ambient hero motion and moving terminal details', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const motion = await page.evaluate(() => {
    const animation = (selector: string, pseudo?: string) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element, pseudo).animationName : null
    }
    const pseudoDisplay = (pseudo: string) => getComputedStyle(document.querySelector('.hero')!, pseudo).display
    const backdrop = document.querySelector('.site-header')
    return {
      heading: animation('.hero h1'),
      heroVisual: animation('.hero-visual'),
      firstOrbit: animation('.visual-orbit.orbit-one'),
      secondOrbit: animation('.visual-orbit.orbit-two'),
      terminalFloat: animation('.terminal'),
      terminalScan: animation('.terminal', '::after'),
      chipFloat: animation('.floating-chip.chip-top'),
      statusPulse: animation('.eyebrow-dot'),
      gridDrift: animation('.hero-gridlines'),
      artGrid: animation('.art-grid'),
      artSymbol: animation('.art-symbol'),
      heroBeforeDisplay: pseudoDisplay('::before'),
      heroAfterDisplay: pseudoDisplay('::after'),
      contentVisibility: getComputedStyle(document.querySelector('.articles-section')!).contentVisibility,
    }
  })

  for (const key of [
    'heading', 'heroVisual', 'firstOrbit', 'secondOrbit', 'terminalFloat',
    'terminalScan', 'chipFloat', 'statusPulse', 'gridDrift', 'artGrid', 'artSymbol',
  ] as const) {
    expect(motion[key], key).not.toBe('none')
    expect(motion[key], key).not.toBeNull()
  }
  expect(motion.heroBeforeDisplay).not.toBe('none')
  expect(motion.heroAfterDisplay).not.toBe('none')
  expect(motion.contentVisibility).not.toBe('auto')
})

test('scroll reveals reappear and complete as sections enter the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const footer = page.locator('.footer-inner')
  await expect(footer).toHaveClass(/motion-reveal/)
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(footer).toHaveClass(/is-visible/)
  await expect(page.locator('.site-scroll-progress')).toHaveAttribute('aria-valuenow', '100')
})

test('reduced-motion disables moving decoration and never hides content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()
  await expect(page.locator('.hero .hero-actions')).toBeVisible()

  const result = await page.evaluate(() => {
    const animation = (selector: string, pseudo?: string) => {
      const element = document.querySelector(selector)
      return element ? getComputedStyle(element, pseudo).animationName : null
    }
    const heading = document.querySelector<HTMLElement>('.hero h1')
    return {
      preference: matchMedia('(prefers-reduced-motion: reduce)').matches,
      headingAnimation: animation('.hero h1'),
      visualAnimation: animation('.hero-visual'),
      orbitAnimation: animation('.visual-orbit.orbit-one'),
      terminalAnimation: animation('.terminal'),
      scanAnimation: animation('.terminal', '::after'),
      chipAnimation: animation('.floating-chip'),
      headingOpacity: heading ? getComputedStyle(heading).opacity : null,
      footerRevealCount: document.querySelectorAll('.footer-inner.motion-reveal').length,
    }
  })

  expect(result.preference).toBe(true)
  expect(result.headingAnimation).toBe('none')
  expect(result.visualAnimation).toBe('none')
  expect(result.orbitAnimation).toBe('none')
  expect(result.terminalAnimation).toBe('none')
  expect(result.scanAnimation).toBe('none')
  expect(result.chipAnimation).toBe('none')
  expect(result.headingOpacity).toBe('1')
  expect(result.footerRevealCount).toBe(0)
})
