import { expect, test } from '@playwright/test'

test('incident postmortem flags out-of-order timelines and unowned follow-ups', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /Incident Postmortem|Postmortem Insiden/i }).click()
  await page.getByLabel(/Incident title|Judul insiden/i).fill('Checkout latency incident')
  await page.getByLabel(/Start time|Waktu mulai/i).fill('2026-10-14T10:00')
  await page.getByLabel(/End time|Waktu berakhir/i).fill('2026-10-14T09:00')
  await page.getByLabel(/Timeline \(one event per line\)|Linimasa \(satu peristiwa per baris\)/i).fill('09:08 UTC — Mitigation started\n09:02 UTC — Alert triggered')
  await page.getByLabel(/Follow-up actions \(one per line\)|Tindak lanjut \(satu per baris\)/i).fill('Add latency alert\nUpdate runbook — Platform — 2026-10-20')
  await page.getByRole('button', { name: /Generate postmortem|Buat postmortem/i }).click()

  const report = page.locator('.postmortem-output')
  await expect(report).toContainText('Chronology check: WARNING')
  await expect(report).toContainText('Actions with owner and valid due date: 1 / 2')
  await expect(report).toContainText('Owner: UNASSIGNED')
  await expect(report).toContainText('Due: UNSCHEDULED')
  await expect(report).toContainText('Incident end time is earlier than start time')
})
