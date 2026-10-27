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

test('scroll reveal reinitializes on in-app navigation and reduced motion stays accessible', async ({ page }) => {
  await page.goto('/')
  const articleLink = page.locator('a[href="/blog/qa-automation-foundations"]').first()
  await expect(articleLink).toBeVisible()
  await articleLink.click()
  await expect(page).toHaveURL(new RegExp('blog/qa-automation-foundations$'))

  const articleHeader = page.locator('.article-header')
  await expect(articleHeader).toHaveClass(/motion-reveal/)
  await articleHeader.scrollIntoViewIfNeeded()
  await expect(articleHeader).toHaveClass(/is-visible/)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.motion-reveal').first()).toBeAttached()
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
