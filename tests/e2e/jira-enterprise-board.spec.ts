import { expect, test } from '@playwright/test'

test.describe('DreamEx Jira Agile & Sprint OS (/jira)', () => {
  test('renders 5-column Kanban board, executes live JQL, creates issues with automation rules, and inspects tickets', async ({ page }) => {
    await page.goto('/jira')
    await expect(page.getByTestId('jira-enterprise-page')).toBeVisible()
    await expect(page.getByTestId('jira-col-todo')).toBeVisible()
    await expect(page.getByTestId('jira-col-in_progress')).toBeVisible()
    await expect(page.getByTestId('jira-col-review')).toBeVisible()
    await expect(page.getByTestId('jira-col-blocked')).toBeVisible()
    await expect(page.getByTestId('jira-col-done')).toBeVisible()

    // Test Swimlane grouping
    await page.getByTestId('jira-swimlane-select').selectOption('epic')
    await expect(page.locator('.jira-swimlane-header').first()).toContainText('DX-EPIC-')
    await page.getByTestId('jira-swimlane-select').selectOption('none')

    // Test executable JQL filter
    const jqlInput = page.getByTestId('jira-jql-input')
    await jqlInput.fill('type = Bug AND priority = Highest')
    await expect(page.getByTestId('jira-card-DX-104')).toBeVisible()
    await expect(page.getByTestId('jira-card-DX-102')).toHaveCount(0)
    await jqlInput.fill('')

    // Create new Security issue -> AUTO-01 escalates Priority to Highest & assigns Alya
    await page.getByTestId('jira-open-create-btn').click()
    const modal = page.getByTestId('jira-create-modal')
    await expect(modal).toBeVisible()
    await modal.locator('#create-type').selectOption('security')
    await modal.locator('#create-priority').selectOption('Low')
    await page.getByTestId('jira-create-summary-input').fill('Enforce mTLS certificate pinning on internal webhook mesh')
    await page.getByTestId('jira-submit-create-btn').click()
    await expect(modal).toHaveCount(0)

    const newCard = page.getByTestId('jira-card-DX-110')
    await expect(newCard).toBeVisible()
    await expect(newCard).toContainText('Highest')

    // Transition DX-107 to In Review & QA -> AUTO-02 creates Playwright subtask, then open Drawer
    await page.getByTestId('jira-status-select-DX-107').selectOption('review')
    await page.getByTestId('jira-card-DX-107').locator('.jira-card-title-btn').click()

    const drawer = page.getByTestId('jira-issue-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('Playwright E2E regression gate')

    // Trigger AI Copilot Gherkin & Subtasks synthesizer + post comment
    await page.getByTestId('jira-ai-synthesize-btn').click()
    await expect(drawer.locator('#drawer-issue-desc')).toHaveValue(/Scenario: Primary deterministic execution/)

    await page.getByTestId('jira-comment-input').fill('Verified staging telemetry under 18ms P95.')
    await page.getByTestId('jira-post-comment-btn').click()
    await expect(drawer).toContainText('Verified staging telemetry under 18ms P95.')
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
  })

  test('supports Backlog planning, Epic Gantt Roadmap, Bulk Navigator, Burndown Reports, Automation Sync, Light Mode & 320px responsiveness', async ({ page }) => {
    await page.goto('/jira')

    // Backlog view + quick create
    await page.getByTestId('jira-tab-backlog').click()
    await expect(page.getByTestId('jira-bucket-sprint-24')).toBeVisible()
    await page.getByTestId('jira-backlog-quick-input').fill('Add OpenTelemetry baggage propagation')
    await page.getByTestId('jira-backlog-quick-input').press('Enter')
    await expect(page.getByTestId('jira-bucket-backlog')).toContainText('Add OpenTelemetry baggage propagation')

    // Epic Gantt Roadmap
    await page.getByTestId('jira-tab-roadmap').click()
    await expect(page.locator('.jira-gantt-bar').first()).toBeVisible()

    // Issue Navigator & Bulk Edit
    await page.getByTestId('jira-tab-navigator').click()
    await page.getByLabel('Select DX-102').check()
    await expect(page.getByTestId('jira-bulk-bar')).toBeVisible()

    // Burndown & Velocity Reports
    await page.getByTestId('jira-tab-reports').click()
    await expect(page.getByRole('img', { name: /Sprint burndown chart/i })).toBeVisible()
    await expect(page.getByRole('img', { name: /Team velocity chart/i })).toBeVisible()

    // Automation & Jira Cloud Sync
    await page.getByTestId('jira-tab-automation').click()
    await expect(page.locator('.jira-code-pre').first()).toContainText('[AUTO-')

    // v7.1 AI Autopilot & Forward-Thinking Brain + Goal Compiler + Releases Hub
    await page.getByTestId('jira-tab-autopilot').click()
    await expect(page.getByTestId('jira-autopilot-panel')).toBeVisible()
    await page.getByTestId('jira-goal-input').fill('Cross-border QRIS instant settlement with AI fraud shield')
    await page.getByTestId('jira-compile-goal-btn').click()
    await expect(page.getByTestId('jira-ai-reasoning-log')).toContainText('01 ·')

    await page.getByTestId('jira-auto-optimize-btn').click()
    await expect(page.getByTestId('jira-ai-reasoning-log')).toContainText('[AUTOPILOT-')

    await page.getByTestId('jira-tab-releases').click()
    await expect(page.getByTestId('jira-releases-panel')).toContainText('v7.1.0')

    // Complete Sprint roll-forward
    await page.getByTestId('jira-complete-sprint-btn').click()
    await expect(page.getByTestId('jira-complete-sprint-modal')).toBeVisible()
    await page.getByTestId('jira-confirm-complete-sprint-btn').click()
    await expect(page.getByTestId('jira-active-sprint-name')).toContainText('Sprint 25')

    // Daylight Light Mode + Mobile 320px zero horizontal document overflow (supports both desktop & coarse-pointer mobile-chromium)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByTestId('jira-tab-board').click()
    const desktopToggle = page.locator('.nav-desktop-language .theme-toggle-btn')
    if (await desktopToggle.isVisible()) {
      await desktopToggle.click()
    } else {
      const menuToggle = page.locator('.menu-toggle')
      if ((await menuToggle.getAttribute('aria-expanded')) !== 'true') await menuToggle.click()
      await page.locator('.nav-drawer-footer .theme-toggle-btn').click()
      await page.keyboard.press('Escape')
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const lightCardBg = await page.locator('.jira-card').first().evaluate(el => getComputedStyle(el).backgroundColor)
    expect(lightCardBg).toBe('rgb(255, 255, 255)')

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `No document horizontal overflow at ${width}px`).toBeLessThanOrEqual(1)
    }
  })

  test('v8.0 Full Atlassian Cloud parity: Homepage showcase, Multi-Project switcher, Product Discovery RICE, JSM Incidents, Confluence Wiki & Shortcuts', async ({ page }) => {
    await page.goto('/')
    const showcase = page.getByTestId('home-jira-showcase')
    await expect(showcase).toBeVisible()
    await page.getByTestId('home-jira-autopilot-demo-btn').click()
    await expect(showcase).toContainText(/98% Confidence|Keyakinan 98%/i)

    await page.goto('/jira')
    await expect(page.getByTestId('jira-project-switcher')).toBeVisible()
    await page.getByTestId('jira-project-pill-FIN').click()

    // Product Discovery RICE -> Promote IDEA-01
    await page.getByTestId('jira-tab-discovery').click()
    await expect(page.getByTestId('jira-discovery-panel')).toBeVisible()
    await page.getByTestId('jira-promote-IDEA-01').click()
    await expect(page.getByTestId('jira-discovery-panel')).toContainText('FIN-')

    // JSM Service Desk -> Escalate INC-501
    await page.getByTestId('jira-tab-jsm').click()
    await expect(page.getByTestId('jira-jsm-panel')).toBeVisible()
    await page.getByTestId('jira-escalate-INC-501').click()
    await expect(page.getByTestId('jira-jsm-panel')).toContainText('Linked: FIN-')

    // Confluence Wiki -> Extract Action Item
    await page.getByTestId('jira-tab-wiki').click()
    await expect(page.getByTestId('jira-wiki-panel')).toBeVisible()
    await page.getByTestId('jira-wiki-extract-btn').click()

    // Keyboard Shortcuts Modal
    await page.getByTestId('jira-shortcuts-btn').click()
    await expect(page.getByTestId('jira-shortcuts-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('jira-shortcuts-modal')).toHaveCount(0)
  })

  test('v9.0 Jira Pro Shell: Multi-Project isolation (FIN/ALL), Calendar, Forms Portal, Visual Workflow Designer, Flag/Vote & Undo', async ({ page }) => {
    await page.goto('/jira')

    // Switch to FIN space -> sees dedicated FIN-201 ticket
    await page.getByTestId('jira-project-pill-FIN').click()
    await expect(page.getByTestId('jira-card-FIN-201')).toBeVisible()
    await expect(page.getByTestId('jira-card-DX-102')).toHaveCount(0)

    // Switch to ALL portfolio -> sees both DX and FIN
    await page.getByTestId('jira-project-pill-ALL').click()
    await expect(page.getByTestId('jira-card-FIN-201')).toBeVisible()
    await expect(page.getByTestId('jira-card-DX-102')).toBeVisible()

    // Flag & Vote inside Issue Drawer + verify flagged card highlight
    await page.getByTestId('jira-card-FIN-201').locator('.jira-card-title-btn').click()
    await page.getByTestId('jira-drawer-flag-btn').click()
    await page.getByTestId('jira-drawer-vote-btn').click()
    await expect(page.getByTestId('jira-drawer-vote-btn')).toContainText('1')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('jira-card-FIN-201')).toContainText(/FLAGGED IMPEDIMENT|HAMBATAN DITANDAI/i)

    // Calendar View -> schedule ticket
    await page.getByTestId('jira-tab-calendar').click()
    await expect(page.getByTestId('jira-calendar-panel')).toBeVisible()
    await page.getByTestId('jira-calendar-quick-input').fill('Verify v7.1 canary telemetry cutover')
    await page.getByTestId('jira-calendar-add-btn').click()
    await expect(page.getByTestId('jira-calendar-panel')).toContainText('Verify v7.1 canary')

    // Forms Intake Portal -> submit defect
    await page.getByTestId('jira-tab-forms').click()
    await expect(page.getByTestId('jira-forms-panel')).toBeVisible()
    await page.getByTestId('jira-form-summary-input').fill('Webhook signature header mismatch in APAC')
    await page.getByTestId('jira-form-submit-btn').click()
    await expect(page.getByTestId('jira-forms-panel')).toContainText('1 submitted')

    // Undo button should now be enabled after tracked mutations
    await expect(page.getByTestId('jira-undo-btn')).toBeEnabled()
    await page.getByTestId('jira-undo-btn').click()

    // Visual Workflow Designer & RBAC Matrix
    await page.getByTestId('jira-tab-workflow').click()
    await expect(page.getByTestId('jira-workflow-panel')).toBeVisible()
    await expect(page.getByRole('img', { name: /workflow state transition|Diagram transisi workflow/i })).toBeVisible()
  })
})
