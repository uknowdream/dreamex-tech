import { expect, test } from '@playwright/test'

test('homepage uses a small motion budget and honors reduced-motion preferences', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const initial = await page.evaluate(() => {
    const style = (selector: string, pseudo?: string) => {
      const element = document.querySelector(selector)
      return element ? window.getComputedStyle(element, pseudo) : null
    }
    const seconds = (value: string | undefined) => Number.parseFloat(value ?? '0')
    const ambient = [
      { selector: '.terminal', expected: 'dreamex-terminal-drift', maxSeconds: 13 },
      { selector: '.chip-top', expected: 'dreamex-chip-drift', maxSeconds: 10 },
      { selector: '.chip-bottom', expected: 'dreamex-chip-drift', maxSeconds: 12 },
      { selector: '.orbit-one', expected: 'dreamex-orbit-breathe', maxSeconds: 15 },
      { selector: '.eyebrow-dot', expected: 'dreamex-status-pulse', maxSeconds: 3 },
    ].map(item => {
      const computed = style(item.selector)
      return {
        ...item,
        actualName: computed?.animationName,
        durationSeconds: seconds(computed?.animationDuration.replace('s', '')),
      }
    })
    const disabled = [
      ['.hero', '::before'],
      ['.hero', '::after'],
      ['.hero-gridlines', undefined],
      ['.terminal', '::after'],
      ['.terminal-bar', '::after'],
      ['.terminal-content p:not(.terminal-comment)', undefined],
      ['.art-grid', undefined],
      ['.art-symbol', undefined],
      ['.trust-strip', '::before'],
    ].map(([selector, pseudo]) => {
      const computed = style(selector as string, pseudo as string | undefined)
      return { selector, animationName: computed?.animationName, display: computed?.display }
    })
    return {
      ambient,
      disabled,
      headingAnimation: style('.hero h1')?.animationName,
      visualAnimation: style('.hero-visual')?.animationName,
      persistentWillChange: style('.hero h1')?.willChange,
      terminalFilter: style('.terminal')?.filter,
      terminalBackdrop: style('.terminal')?.backdropFilter,
      headerBackdrop: style('.site-header')?.backdropFilter,
    }
  })

  expect(initial.ambient.length).toBe(5)
  for (const item of initial.ambient) {
    expect(item.actualName, item.selector).toBe(item.expected)
    expect(item.durationSeconds).toBeGreaterThan(1)
    expect(item.durationSeconds).toBeLessThanOrEqual(item.maxSeconds)
  }
  for (const item of initial.disabled) {
    expect(item.animationName, item.selector).toBe('none')
  }
  expect(initial.headingAnimation).toBe('dreamex-hero-enter')
  expect(initial.visualAnimation).toBe('dreamex-visual-enter')
  expect(initial.persistentWillChange).toBe('auto')
  expect(initial.terminalFilter).toBe('none')
  expect(initial.terminalBackdrop).toBe('none')
  expect(initial.headerBackdrop).toBe('none')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const style = getComputedStyle(element)
      return { animationName: style.animationName, opacity: style.opacity, transform: style.transform }
    }
    return {
      heading: read('.hero h1'),
      visual: read('.hero-visual'),
      terminal: read('.terminal'),
      chip: read('.chip-top'),
      status: read('.eyebrow-dot'),
    }
  })
  for (const [key, value] of Object.entries(reduced)) {
    expect(value, key).not.toBeNull()
    expect(value?.animationName, key).toBe('none')
    expect(value?.opacity, key).toBe('1')
    expect(value?.transform, key).toBe('none')
  }
})

test('touch-sized homepage keeps entrance motion but disables continuous ambient movement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const mobile = await page.evaluate(() => ({
    headingAnimation: getComputedStyle(document.querySelector('.hero h1')!).animationName,
    terminalAnimation: getComputedStyle(document.querySelector('.terminal')!).animationName,
    chipAnimation: getComputedStyle(document.querySelector('.chip-top')!).animationName,
    statusAnimation: getComputedStyle(document.querySelector('.eyebrow-dot')!).animationName,
  }))
  expect(mobile.headingAnimation).toBe('dreamex-hero-enter')
  expect(mobile.terminalAnimation).toBe('none')
  expect(mobile.chipAnimation).toBe('none')
  expect(mobile.statusAnimation).toBe('dreamex-status-pulse')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  const reduced = await page.locator('.hero h1').evaluate(element => getComputedStyle(element).animationName)
  expect(reduced).toBe('none')
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
