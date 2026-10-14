import { expect, test } from '@playwright/test'

test('SBOM import reports provenance, license coverage, duplicate identities, and safe CSV output', async ({ page }) => {
  await page.goto('/supply-chain-intelligence')
  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: 'urn:example:sbom-integrity-test',
    metadata: { timestamp: '2026-01-01T00:00:00Z', authors: [{ name: 'Test SBOM Author' }] },
    components: [
      { type: 'library', name: 'react', version: '19.1.0', purl: 'pkg:npm/react@19.1.0', licenses: [{ license: { id: 'MIT' } }], hashes: [{ alg: 'SHA-256', content: 'abc123' }] },
      { type: 'library', name: 'react', version: '19.1.0', purl: 'pkg:npm/react@19.1.0', licenses: [{ license: { id: 'MIT' } }] },
      { type: 'library', name: '=HYPERLINK("https://evil.example")', version: '1.0.0', purl: 'pkg:npm/fixture@1.0.0', licenses: [{ license: { id: 'NOASSERTION' } }] },
    ],
  }
  await page.getByLabel(/Choose CycloneDX or SPDX JSON SBOM/i).setInputFiles({
    name: 'integrity-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sbom)),
  })

  await expect(page.getByRole('heading', { name: /Provenance and integrity review/i })).toBeVisible()
  await expect(page.getByText('urn:example:sbom-integrity-test')).toBeVisible()
  await expect(page.getByText('Test SBOM Author')).toBeVisible()
  await expect(page.getByText('67%', { exact: true })).toBeVisible()
  await expect(page.getByText(/1 duplicate entries/i)).toBeVisible()
  await expect(page.getByText(/purl:pkg:npm\/react@19\.1\.0/)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-sbom-inventory.csv')
  const stream = await download.createReadStream()
  let csv = ''
  for await (const chunk of stream ?? []) csv += chunk.toString()
  expect(csv).toContain('"\'=HYPERLINK(')
})
