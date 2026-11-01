import { expect, test } from '@playwright/test'

const responsiveWidths = [320, 360, 390, 768, 1024, 1280, 1366, 1440, 1920]

test('premium homepage hero keeps its aurora and signal card inside every supported viewport', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main#main-content .hero h1')).toBeVisible()
  await expect(page.locator('.hero-signal-card')).toBeVisible()
  await expect(page.locator('link[data-dreamex-premium-experience]')).toHaveAttribute('href', '/premium-experience.v2.css')

  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: 900 })
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>('.hero')
      const signal = document.querySelector<HTMLElement>('.hero-signal-card')
      if (!hero || !signal) return null
      const card = signal.getBoundingClientRect()
      const aurora = getComputedStyle(hero, '::after')
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        card: { left: card.left, right: card.right, width: card.width },
        aurora: { content: aurora.content, position: aurora.position },
      }
    })

    expect(geometry, `Hero geometry should exist at ${width}px`).not.toBeNull()
    expect(geometry!.document, `Horizontal overflow at ${width}px`).toBeLessThanOrEqual(geometry!.viewport + 1)
    expect(geometry!.card.left, `Signal card clipped on the left at ${width}px`).toBeGreaterThanOrEqual(-1)
    expect(geometry!.card.right, `Signal card clipped on the right at ${width}px`).toBeLessThanOrEqual(geometry!.viewport + 1)
    expect(geometry!.aurora.content, `Aurora pseudo-element missing at ${width}px`).not.toBe('none')
    expect(geometry!.aurora.position).toBe('absolute')
  }
})

test('reduced-motion preference keeps the hero information visible without running animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.hero-signal-card')).toBeVisible()
  await expect(page.locator('link[data-dreamex-premium-experience]')).toHaveAttribute('href', '/premium-experience.v2.css')

  const motion = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')
    const card = document.querySelector<HTMLElement>('.hero-signal-card')
    const track = document.querySelector<HTMLElement>('.hero-signal-track > span')
    if (!hero || !card || !track) return null
    return {
      aurora: getComputedStyle(hero, '::after').animationName,
      card: getComputedStyle(card).animationName,
      cardOpacity: getComputedStyle(card).opacity,
      track: getComputedStyle(track).animationName,
    }
  })

  expect(motion).not.toBeNull()
  expect(motion!.aurora).toBe('none')
  expect(motion!.card).toBe('none')
  expect(motion!.cardOpacity).toBe('1')
  expect(motion!.track).toBe('none')
})

test('premium aurora animations are active when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.home-page .hero h1')).toBeVisible()
  const names = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.home-page .hero')
    if (!hero) return null
    return { ambient: getComputedStyle(hero, '::before').animationName, aurora: getComputedStyle(hero, '::after').animationName }
  })
  expect(names).toEqual({ ambient: 'dx-premium-ambient', aurora: 'dx-premium-aurora' })
})

test('premium visual rules stay scoped to the homepage after client-side article navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-page')).toBeVisible()
  await expect(page.locator('link[data-dreamex-premium-experience]')).toHaveAttribute('href', '/premium-experience.v2.css')
  await page.locator('.featured-copy .read-link').click()
  await expect(page.locator('.article-page')).toBeVisible()
  await expect(page.locator('.home-page')).toHaveCount(0)
  const scoped = await page.evaluate(() => {
    const sheet = Array.from(document.styleSheets).find(item => item.href?.includes('/premium-experience.v2.css'))
    if (!sheet) return false
    const inspect = (rules: CSSRuleList): boolean => Array.from(rules).every(rule => {
      if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) return inspect(rule.cssRules)
      if (rule instanceof CSSKeyframesRule) return true
      const selector = (rule as CSSStyleRule).selectorText
      return !selector || selector.split(',').every(item => item.trim().startsWith('.home-page '))
    })
    return inspect(sheet.cssRules)
  })
  expect(scoped).toBe(true)
})

test('direct non-home routes do not attach the homepage visual stylesheet', async ({ page }) => {
  await page.goto('/about')
  await expect(page.locator('main#main-content h1').first()).toBeVisible()
  await expect(page.locator('.home-page')).toHaveCount(0)
  await expect(page.locator('link[data-dreamex-premium-experience]')).toHaveCount(0)
})
