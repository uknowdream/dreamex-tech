import { expect, test } from '@playwright/test'

test('homepage uses lightweight motion on normal-motion devices', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const result = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')!
    const terminal = document.querySelector<HTMLElement>('.terminal')!
    const header = document.querySelector<HTMLElement>('.site-header')!
    const style = (element: Element, pseudo?: string) =>
      window.getComputedStyle(element, pseudo)

    const orbitAnimations = Array.from(document.querySelectorAll('.visual-orbit'))
      .map(element => style(element).animationName)
    const chipAnimations = Array.from(document.querySelectorAll('.floating-chip'))
      .map(element => style(element).animationName)
    const statusAnimations = [
      ...Array.from(document.querySelectorAll('.terminal-live i')),
      ...Array.from(document.querySelectorAll('.eyebrow-dot')),
      ...Array.from(document.querySelectorAll('.terminal-bar')).map(element => element),
    ].map(element => {
      if (element.matches('.terminal-bar')) return style(element, '::after').animationName
      return style(element).animationName
    })
    const codeLineAnimations = Array.from(document.querySelectorAll('.terminal-content p:not(.terminal-comment)'))
      .map(element => style(element).animationName)
    const card = document.querySelector<HTMLElement>('.article-card')!
    const cardStyle = style(card)

    return {
      heroHeadingAnimation: style(document.querySelector('.hero h1')!).animationName,
      heroVisualAnimation: style(document.querySelector('.hero-visual')!).animationName,
      ambientAnimation: style(hero, '::before').animationName,
      ambientFilter: style(hero, '::before').filter,
      staticGlowAnimation: style(hero, '::after').animationName,
      staticGlowFilter: style(hero, '::after').filter,
      orbitAnimations,
      terminalAnimation: style(terminal).animationName,
      terminalFilter: style(terminal).filter,
      scanAnimation: style(terminal, '::after').animationName,
      scanFilter: style(terminal, '::after').filter,
      statusAnimations,
      chipAnimations,
      codeLineAnimations,
      cardTransitionProperty: cardStyle.transitionProperty,
      cardTransitionDuration: cardStyle.transitionDuration,
      headerBackdropFilter: style(header).backdropFilter,
      heroGridAnimation: style(document.querySelector('.hero-gridlines')!).animationName,
    }
  })

  expect(result.heroHeadingAnimation).not.toBe('none')
  expect(result.heroVisualAnimation).toBe('visual-enter')
  expect(result.ambientAnimation).toBe('dx-ambient-drift')
  expect(result.ambientFilter).toBe('none')
  expect(result.staticGlowAnimation).toBe('none')
  expect(result.staticGlowFilter).toBe('none')
  expect(result.orbitAnimations.length).toBeGreaterThanOrEqual(1)
  expect(result.orbitAnimations.every(name => name === 'dx-orbit-spin')).toBe(true)
  expect(result.terminalAnimation).toBe('dx-terminal-float')
  expect(result.terminalFilter).toBe('none')
  expect(result.scanAnimation).toBe('dx-terminal-scan')
  expect(result.scanFilter).toBe('none')
  expect(result.statusAnimations.length).toBeGreaterThan(0)
  expect(result.statusAnimations.every(name => name === 'dx-status-breathe')).toBe(true)
  expect(result.chipAnimations.length).toBeGreaterThanOrEqual(1)
  expect(result.chipAnimations.every(name => name === 'dx-chip-drift')).toBe(true)
  expect(result.codeLineAnimations.every(name => name === 'none')).toBe(true)
  expect(result.cardTransitionProperty).toContain('transform')
  expect(result.cardTransitionProperty).not.toContain('box-shadow')
  expect(result.cardTransitionProperty).not.toContain('background')
  expect(result.cardTransitionDuration).toContain('0.18s')
  expect(result.headerBackdropFilter).toBe('none')
  expect(result.heroGridAnimation).toBe('none')
})

test('reduced-motion preference disables continuous and entrance motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const animations = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')!
    const terminal = document.querySelector<HTMLElement>('.terminal')!
    const selectors = [
      '.hero h1',
      '.hero-visual',
      '.terminal',
      '.eyebrow-dot',
      '.floating-chip',
      '.visual-orbit',
      '.featured-art .art-symbol',
    ]
    const regular = selectors.flatMap(selector =>
      Array.from(document.querySelectorAll(selector)).map((element, index) => ({
        selector: selector + (index ? '[' + index + ']' : ''),
        name: getComputedStyle(element).animationName,
      })),
    )
    return [
      ...regular,
      { selector: '.hero::before', name: getComputedStyle(hero, '::before').animationName },
      { selector: '.hero::after', name: getComputedStyle(hero, '::after').animationName },
      { selector: '.terminal::after', name: getComputedStyle(terminal, '::after').animationName },
      { selector: '.terminal-bar::after', name: getComputedStyle(document.querySelector('.terminal-bar')!, '::after').animationName },
    ]
  })

  expect(animations.length).toBeGreaterThan(8)
  for (const item of animations) {
    expect(item.name, item.selector).toBe('none')
  }
  await expect(page.locator('.hero h1')).toBeVisible()

  // Reduced motion stops decorative animation, not the functional reading-position indicator.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: 'instant' }))
  await expect(page.locator('.site-scroll-progress')).not.toHaveAttribute('aria-valuenow', '0')
  const progressTransform = await page.locator('.site-scroll-progress > span').evaluate(element => getComputedStyle(element).transform)
  expect(progressTransform).not.toBe('none')
})

test('homepage scroll path stays light and scroll progress updates without React state', async ({ page }) => {
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
      heroBeforeFilter: heroBefore.filter,
      heroAfterFilter: heroAfter.filter,
      articleAnimation: articleCard ? window.getComputedStyle(articleCard).animationName : null,
      launchpadAnimation: launchpadCard ? window.getComputedStyle(launchpadCard).animationName : null,
      revealCount: document.querySelectorAll('.motion-reveal').length,
      hasContentVisibility: ['.topics-section', '.launchpad-section', '.featured-section', '.articles-section', '.newsletter']
        .every(selector => window.getComputedStyle(document.querySelector(selector)!).contentVisibility === 'auto'),
    }
  })

  expect(initial.headerBackdrop).toBe('none')
  expect(initial.initialProgressTransform).toBe('matrix(0, 0, 0, 1, 0, 0)')
  expect(initial.heroBeforeDisplay).toBe('block')
  expect(initial.heroAfterDisplay).toBe('block')
  expect(initial.heroBeforeFilter).toBe('none')
  expect(initial.heroAfterFilter).toBe('none')
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
