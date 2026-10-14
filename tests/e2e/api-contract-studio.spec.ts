import { expect, test } from '@playwright/test'

const baselineSpec = {
  openapi: '3.0.3',
  info: { title: 'Pet API', version: '1.0.0' },
  paths: {
    '/pets/{petId}': {
      get: {
        operationId: 'getPet',
        parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/legacy': { get: { operationId: 'legacy', responses: { '200': { description: 'OK' } } } },
  },
}
const currentSpec = {
  openapi: '3.0.3',
  info: { title: 'Pet API', version: '2.0.0' },
  paths: {
    '/pets/{petId}': {
      get: {
        operationId: 'getPetV2',
        parameters: [
          { name: 'petId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'tenantId', in: 'header', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
}

test('API Contract Studio inventories OpenAPI and detects likely breaking changes', async ({ page }) => {
  await page.goto('/api-playground')
  const studio = page.locator('.api-contract-studio')
  await expect(studio).toBeVisible()

  await studio.getByLabel(/Baseline OpenAPI JSON/i).setInputFiles({
    name: 'baseline.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(baselineSpec)),
  })
  await studio.getByLabel(/Current OpenAPI JSON/i).setInputFiles({
    name: 'current.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(currentSpec)),
  })

  await expect(studio.locator('.api-contract-summary article').nth(0)).toContainText('2')
  await expect(studio.locator('.api-contract-summary article').nth(1)).toContainText('2')
  await expect(studio.locator('.api-contract-summary article').nth(2)).toContainText('0')
  await expect(studio.getByText(/Operation removed: GET \/legacy/i)).toBeVisible()
  await expect(studio.getByText(/New required parameter: GET \/pets\/\{petId\}/i)).toBeVisible()
  await expect(studio.getByText(/Response definitions removed: GET \/pets\/\{petId\}/i)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await studio.getByRole('button', { name: /Export report/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('dreamex-openapi-compatibility-report.json')
  const stream = await download.createReadStream()
  let report = ''
  for await (const chunk of stream ?? []) report += chunk.toString()
  expect(report).toContain('static-openapi-diff')
  expect(report).toContain('Operation removed')
})

test('API Contract Studio rejects invalid and oversized formats without crashing', async ({ page }) => {
  await page.goto('/api-playground')
  const studio = page.locator('.api-contract-studio')
  await studio.getByLabel(/Baseline OpenAPI JSON/i).setInputFiles({
    name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{invalid'),
  })
  await expect(studio.getByRole('alert')).toContainText(/not valid JSON/i)
  await studio.getByLabel(/Baseline OpenAPI JSON/i).setInputFiles({
    name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('hello'),
  })
  await expect(studio.getByRole('alert')).toContainText(/OpenAPI JSON/i)
})


test('API Contract Studio validates schemas and examples and recognizes Swagger 2 body parameters', async ({ page }) => {
  await page.goto('/api-playground')
  const studio = page.locator('.api-contract-studio')
  const swagger2 = {
    swagger: '2.0',
    info: { title: 'Orders API', version: '1.0.0' },
    paths: {
      '/orders': {
        post: {
          parameters: [{ name: 'body', in: 'body', required: false, schema: { type: 'object', properties: { id: { type: 'string' } } } }],
          responses: { '200': { description: 'OK', schema: { type: 'object', properties: { ok: { type: 'boolean' } } }, examples: { 'application/json': { ok: 'yes' } } } },
        },
      },
    },
  }
  const openapi3 = {
    openapi: '3.0.3',
    info: { title: 'Orders API', version: '2.0.0' },
    paths: {
      '/orders': {
        post: {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['id', 'missing'], properties: { id: { type: 'string', enum: ['a', 'b'], default: 'c' } } },
                example: { id: 5 },
              },
            },
          },
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } }, example: { unexpected: true } } } } },
        },
      },
    },
  }

  await studio.getByLabel(/Baseline OpenAPI JSON/i).setInputFiles({
    name: 'swagger2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(swagger2)),
  })
  await studio.getByLabel(/Current OpenAPI JSON/i).setInputFiles({
    name: 'openapi3.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(openapi3)),
  })

  await expect(studio.getByText(/required property "missing" is not declared/i)).toBeVisible()
  await expect(studio.getByText(/default value is not included in enum/i)).toBeVisible()
  await expect(studio.getByText(/example value does not match schema type "string"/i)).toBeVisible()
  await expect(studio.getByText(/example value does not match schema type "array"/i)).toBeVisible()
  await expect(studio.getByText(/Request body is now required: POST \/orders/i)).toBeVisible()
})


test('API Contract Studio flags unresolved local schema references and bounded inspection', async ({ page }) => {
  await page.goto('/api-playground')
  const studio = page.locator('.api-contract-studio')
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Reference integrity', version: '1.0.0' },
    components: {
      schemas: {
        Pet: { type: 'object', properties: { owner: { $ref: '#/components/schemas/MissingOwner' } } },
        Tags: { type: 'array' },
      },
    },
    paths: {
      '/pets/{petId}': {
        get: {
          parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
        },
      },
    },
  }
  await studio.getByLabel(/Baseline OpenAPI JSON/i).setInputFiles({
    name: 'reference-integrity.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(spec)),
  })
  await expect(studio.getByText(/Unresolved local schema reference: #\/components\/schemas\/MissingOwner/i)).toBeVisible()
  await expect(studio.getByText(/array schema is missing items/i)).toBeVisible()
  await expect(studio.getByText(/not declared/i)).toHaveCount(0)
})
