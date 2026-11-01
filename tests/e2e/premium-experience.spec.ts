import { expect, test } from '@playwright/test'

const responsiveWidths = [320, 360, 390, 768, 1024, 1280, 1366, 1440, 1920]

test('premium homepage hero keeps its aurora and signal card inside every supported viewport', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main#main-content .hero h1')).toBeVisible()
  await expect(page.locator('.hero-signal-card')).toBeVisible()
  await expect.poll(() => page.evaluate(() => Boolean(getComputedStyle(document.documentElement).getPropertyValue('--dx-glass').trim()))).toBe(true)

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
  await expect.poll(() => page.evaluate(() => Boolean(getComputedStyle(document.documentElement).getPropertyValue('--dx-glass').trim()))).toBe(true)

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
