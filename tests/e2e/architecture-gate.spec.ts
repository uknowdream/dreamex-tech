import { test, expect } from '@playwright/test'

test.describe('DreamEx Tech v3.0 Sovereign Architecture Gate', () => {
  test('Homepage has zero mixed-language strings in English mode and links to Sovereign Workbench', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dreamex-language', 'en')
    })
    await page.goto('/')
    const featuredOverline = page.locator('.featured-overline')
    await expect(featuredOverline).toContainText('MIN READ')
    await expect(featuredOverline).not.toContainText('MENIT')

    await expect(page.locator('.launchpad-foot')).toBeVisible()
    await expect(page.locator('.launchpad-foot a[href="/tools"]')).toBeVisible()
    await expect(page.locator('.launchpad-foot a[href="/ba-hub"]')).toBeVisible()
    await expect(page.locator('.launchpad-foot a[href="/pm-jira-hub"]')).toBeVisible()
  })

  test('/tools renders all 6 interactive pillars (SE, QA/UAT, BA, Jira, PM, DevSecOps) with zero horizontal code overflow', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dreamex-language', 'en')
    })
    await page.goto('/tools')

    await expect(page.getByTestId('sovereign-workbench-title')).toContainText('Sovereign IT, QA, BA, PM & Jira')

    // Pillar 01: SE & Arch
    await expect(page.getByTestId('pillar-panel-eng')).toBeVisible()
    await expect(page.getByTestId('usl-nmax')).toBeVisible()

    // Pillar 02: QA & UAT
    await page.getByTestId('pillar-tab-qa').click()
    await expect(page.getByTestId('pillar-panel-qa')).toBeVisible()
    await expect(page.getByTestId('qa-resilience-score')).toContainText('/ 100')

    // Pillar 03: BA & Product
    await page.getByTestId('pillar-tab-ba').click()
    await expect(page.getByTestId('pillar-panel-ba')).toBeVisible()
    await expect(page.getByTestId('ba-gherkin-output')).toContainText('Feature:')
    await expect(page.getByTestId('ba-rtm-coverage')).toContainText('%')

    // Pillar 04: Jira Engine
    await page.getByTestId('pillar-tab-jira').click()
    await expect(page.getByTestId('pillar-panel-jira')).toBeVisible()
    await expect(page.getByTestId('jira-computed-priority')).toContainText('P0 (Blocker)')
    await expect(page.getByTestId('jira-output-box')).toContainText('"version": 1')
    await expect(page.getByTestId('jql-output-box')).toContainText('ORDER BY created DESC')

    // Pillar 05: PM Delivery
    await page.getByTestId('pillar-tab-pm').click()
    await expect(page.getByTestId('pillar-panel-pm')).toBeVisible()
    await expect(page.getByTestId('pm-p85-sprints')).toContainText('Sprints')
    await expect(page.getByTestId('pm-spi')).toBeVisible()
    await expect(page.getByTestId('pm-cpi')).toBeVisible()

    // Pillar 06: DevSecOps
    await page.getByTestId('pillar-tab-sec').click()
    await expect(page.getByTestId('pillar-panel-sec')).toBeVisible()
    await expect(page.getByTestId('sec-compliance-score')).toContainText('/ 100')
  })

  test('/ba-hub and /pm-jira-hub deep-link directly into BA and Jira/PM pillars', async ({ page }) => {
    await page.goto('/ba-hub')
    await expect(page.getByTestId('pillar-panel-ba')).toBeVisible()

    await page.goto('/pm-jira-hub')
    await expect(page.getByTestId('pillar-panel-jira')).toBeVisible()
  })
})
