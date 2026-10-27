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

    return {
      animationNames: selectors.flatMap(({ selector, pseudo }) => {
        const element = document.querySelector(selector)
        if (!element) return []
        const style = pseudo
          ? window.getComputedStyle(element, pseudo)
          : window.getComputedStyle(element)
        return [{ selector: selector + (pseudo ?? ''), animationName: style.animationName }]
      }),
      heroHeadingAnimation: window.getComputedStyle(document.querySelector('.hero h1')!).animationName,
    }
  })

  expect(result.animationNames.length).toBeGreaterThanOrEqual(8)
  for (const item of result.animationNames) {
    expect(item.animationName, item.selector).toBe('none')
  }
  expect(result.heroHeadingAnimation).not.toBe('none')
})

test('scroll reveal still completes after navigating and reduced motion stays accessible', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await expect(page.locator('.footer-inner')).toHaveClass(/is-visible/)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const reducedMotion = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>('.motion-reveal')
    if (!element) return null
    const style = window.getComputedStyle(element)
    return { opacity: style.opacity, transform: style.transform, animationName: style.animationName }
  })
  expect(reducedMotion).not.toBeNull()
  expect(reducedMotion?.opacity).toBe('1')
  expect(reducedMotion?.transform).toBe('none')
  expect(reducedMotion?.animationName).toBe('none')
})
