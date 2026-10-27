import { expect, test } from '@playwright/test'

test('homepage avoids perpetual decorative animation while preserving entrance motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.hero h1')).toBeVisible()

  const result = await page.evaluate(() => {
    const selectors = [
      { selector: '.hero', pseudo: '::before' },
      { selector: '.hero', pseudo: '::after' },
      { selector: '.hero-gridlines' },
      { selector: '.visual-orbit' },
      { selector: '.terminal' },
      { selector: '.terminal', pseudo: '::after' },
      { selector: '.terminal-bar', pseudo: '::after' },
      { selector: '.terminal-live i' },
      { selector: '.eyebrow-dot' },
      { selector: '.floating-chip' },
      { selector: '.terminal-content p:not(.terminal-comment)' },
      { selector: '.art-grid' },
      { selector: '.art-symbol' },
      { selector: '.trust-strip', pseudo: '::before' },
    ]

    const missingSelectors = selectors
      .filter(({ selector }) => !document.querySelector(selector))
      .map(({ selector, pseudo }) => selector + (pseudo ?? ''))

    return {
      missingSelectors,
      expectedSelectorCount: selectors.length,
      animationNames: selectors.flatMap(({ selector, pseudo }) => {
        const elements = Array.from(document.querySelectorAll(selector))
        return elements.map((element, index) => {
          const style = pseudo
            ? window.getComputedStyle(element, pseudo)
            : window.getComputedStyle(element)
          return {
            selector: selector + (pseudo ?? '') + (elements.length > 1 ? '[' + index + ']' : ''),
            animationName: style.animationName,
          }
        })
      }),
      heroHeadingAnimation: window.getComputedStyle(document.querySelector('.hero h1')!).animationName,
    }
  })

  expect(result.missingSelectors).toEqual([])
  expect(result.animationNames.length).toBeGreaterThanOrEqual(result.expectedSelectorCount)
  for (const item of result.animationNames) {
    expect(item.animationName, item.selector).toBe('none')
  }
  expect(result.heroHeadingAnimation).not.toBe('none')
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
      headerWebkitBackdrop: before?.webkitBackdropFilter,
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
  expect(initial.headerWebkitBackdrop).toBe('none')
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

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const heroHeadingAnimation = await page.locator('.hero h1').evaluate(element => getComputedStyle(element).animationName)
  expect(heroHeadingAnimation).toBe('none')
})
