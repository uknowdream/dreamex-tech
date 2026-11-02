import { test, expect } from '@playwright/test'

test('SBOM tool posts package coordinates to the OSV lookup and displays returned evidence', async ({ page }) => {
  let payload: unknown
  await page.route('**/api/osv-scan', async route => {
    payload = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      source: 'OSV.dev', scannedAt: '2026-10-22T00:00:00.000Z', scannedCount: 1, advisoryCount: 1, detailsTruncated: false,
      advisories: [{ id: 'GHSA-demo-1234', source: 'OSV.dev', severity: 'high', description: 'Mocked advisory', details: 'Fixture', recommendation: 'https://osv.dev/vulnerability/GHSA-demo-1234', references: [], modified: null, url: 'https://osv.dev/vulnerability/GHSA-demo-1234' }],
      results: [{ componentId: 'pkg:npm/lodash@4.17.21', purl: 'pkg:npm/lodash@4.17.21', vulnerabilities: [{ id: 'GHSA-demo-1234', modified: null }] }],
    }) })
  })
  await page.goto('/supply-chain-intelligence')
  await page.getByLabel(/Choose CycloneDX or SPDX JSON SBOM/i).setInputFiles({
    name: 'sbom.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
      bomFormat: 'CycloneDX', specVersion: '1.6',
      components: [{ 'bom-ref': 'pkg:npm/lodash@4.17.21', name: 'lodash', version: '4.17.21', type: 'library', purl: 'pkg:npm/lodash@4.17.21' }],
    })),
  })
  await page.getByRole('button', { name: /Scan live advisories/i }).click()
  await expect(page.getByRole('heading', { name: 'GHSA-demo-1234' })).toBeVisible()
  await expect(page.locator('.supply-chain-live-scan-meta')).toContainText('1 package(s) checked')
  expect(payload).toEqual({ packages: [{ id: 'pkg:npm/lodash@4.17.21', purl: 'pkg:npm/lodash@4.17.21', version: '4.17.21' }] })
})
