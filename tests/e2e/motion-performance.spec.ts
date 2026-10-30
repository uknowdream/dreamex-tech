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
      gridSweep: animation('.hero-gridlines', '::after'),
      ambientDrift: animation('.hero', '::before'),
      auroraRotation: animation('.hero', '::after'),
      terminalSignal: animation('.terminal-bar', '::after'),
      codeLinePulse: animation('.terminal-content p:not(.terminal-comment)'),
      ambientFilter: getComputedStyle(document.querySelector('.hero')!, '::before').filter,
      auroraFilter: getComputedStyle(document.querySelector('.hero')!, '::after').filter,
      headerBackdropFilter: getComputedStyle(document.querySelector('.site-header')!).backdropFilter,
      artGrid: animation('.art-grid'),
      artSymbol: animation('.art-symbol'),
      signalCard: animation('.hero-signal-card'),
      signalSweep: animation('.hero-signal-card', '::after'),
      signalTrack: animation('.hero-signal-track > span'),
      signalCardRect: (() => {
        const rect = document.querySelector('.hero-signal-card')!.getBoundingClientRect()
        return { left: rect.left, right: rect.right, width: rect.width }
      })(),
      heroBeforeDisplay: pseudoDisplay('::before'),
      heroAfterDisplay: pseudoDisplay('::after'),
      contentVisibility: getComputedStyle(document.querySelector('.articles-section')!).contentVisibility,
    }
  })

  for (const key of [
    'heading', 'heroVisual', 'firstOrbit', 'secondOrbit', 'terminalFloat',
    'terminalScan', 'chipFloat', 'statusPulse', 'gridDrift', 'gridSweep',
    'ambientDrift', 'auroraRotation', 'terminalSignal', 'artGrid', 'artSymbol',
    'signalCard', 'signalSweep', 'signalTrack',
  ] as const) {
    expect(motion[key], key).not.toBe('none')
    expect(motion[key], key).not.toBeNull()
  }
  expect(motion.codeLinePulse).toBe('none')
  expect(motion.ambientFilter).toBe('none')
  expect(motion.auroraFilter).toBe('none')
  expect(motion.headerBackdropFilter).toBe('none')
  expect(motion.heroBeforeDisplay).not.toBe('none')
  expect(motion.heroAfterDisplay).not.toBe('none')
  expect(motion.contentVisibility).not.toBe('auto')
  expect(motion.signalCardRect.left).toBeGreaterThanOrEqual(0)
  expect(motion.signalCardRect.right).toBeLessThanOrEqual(1440)
  expect(motion.signalCardRect.width).toBeLessThanOrEqual(194)

  const sweepTransformBefore = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.hero-gridlines')!, '::after').transform
  )
  await page.waitForTimeout(350)
  const sweepTransformAfter = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.hero-gridlines')!, '::after').transform
  )
  expect(sweepTransformAfter).not.toBe(sweepTransformBefore)
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
      signalCardAnimation: animation('.hero-signal-card'),
      signalSweepAnimation: animation('.hero-signal-card', '::after'),
      signalTrackAnimation: animation('.hero-signal-track > span'),
      visualAnimation: animation('.hero-visual'),
      orbitAnimation: animation('.visual-orbit.orbit-one'),
      terminalAnimation: animation('.terminal'),
      scanAnimation: animation('.terminal', '::after'),
      chipAnimation: animation('.floating-chip'),
      ambientAnimation: animation('.hero', '::before'),
      auroraAnimation: animation('.hero', '::after'),
      gridAnimation: animation('.hero-gridlines'),
      sweepAnimation: animation('.hero-gridlines', '::after'),
      terminalSignalAnimation: animation('.terminal-bar', '::after'),
      terminalSignalContent: getComputedStyle(document.querySelector('.terminal-bar')!, '::after').content,
      terminalSignalWidth: getComputedStyle(document.querySelector('.terminal-bar')!, '::after').width,
      codeLineAnimation: animation('.terminal-content p:not(.terminal-comment)'),
      headingOpacity: heading ? getComputedStyle(heading).opacity : null,
      footerRevealCount: document.querySelectorAll('.footer-inner.motion-reveal').length,
    }
  })

  expect(result.preference).toBe(true)
  expect(result.headingAnimation).toBe('none')
  expect(result.signalCardAnimation).toBe('none')
  expect(result.signalSweepAnimation).toBe('none')
  expect(result.signalTrackAnimation).toBe('none')
  expect(result.visualAnimation).toBe('none')
  expect(result.orbitAnimation).toBe('none')
  expect(result.terminalAnimation).toBe('none')
  expect(result.scanAnimation).toBe('none')
  expect(result.chipAnimation).toBe('none')
  expect(result.ambientAnimation).toBe('none')
  expect(result.auroraAnimation).toBe('none')
  expect(result.gridAnimation).toBe('none')
  expect(result.sweepAnimation).toBe('none')
  expect(result.terminalSignalAnimation).toBe('none')
  expect(result.terminalSignalContent).not.toBe('none')
  expect(result.terminalSignalWidth).toBe('5px')
  expect(result.codeLineAnimation).toBe('none')
  expect(result.headingOpacity).toBe('1')
  expect(result.footerRevealCount).toBe(0)
})
