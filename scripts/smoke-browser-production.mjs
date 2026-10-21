import { chromium } from '@playwright/test'

const baseUrl = new URL(process.env.SMOKE_BASE_URL || 'https://www.dreamex.tech')
if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/') {
  throw new Error('Browser smoke requires a clean HTTPS origin.')
}
const approvedHost = new Set([
  'dreamex.tech',
  'www.dreamex.tech',
  'dreamex-tech.vercel.app',
  'dreamex-tech-uknowdreams-projects.vercel.app',
  'dreamex-tech-git-main-uknowdreams-projects.vercel.app',
]).has(baseUrl.hostname) || /^dreamex-tech-[a-z0-9-]+-uknowdreams-projects\.vercel\.app$/.test(baseUrl.hostname)
if (!approvedHost) throw new Error('Browser smoke is restricted to approved DreamEx production hostnames.')

const routes = [
  '/',
  '/control-plane',
  '/workspace',
  '/api-playground',
  '/qa-studio',
  '/quality-intelligence',
  '/supply-chain-intelligence',
  '/security-center',
  '/reliability-center',
  '/learn',
  '/blog/qa-automation-foundations',
]
const failures = []
const browser = await chromium.launch({ headless: true })
try {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })
    const issues = []
    page.on('pageerror', error => issues.push('uncaught page error: ' + error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /content security policy|refused to (?:execute|load|apply)|violates the following directive/i.test(message.text())) {
        issues.push('browser security policy violation: ' + message.text())
      }
    })
    try {
      const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 25_000 })
      if (!response) issues.push('navigation returned no HTTP response')
      else if (!response.ok()) issues.push('HTTP ' + response.status())
      await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 12_000 })
      const title = await page.title()
      if (!title.trim()) issues.push('document title is empty')
      if (await page.locator('#root').count() !== 1) issues.push('application root is missing')
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error))
    } finally {
      await page.close()
    }
    if (issues.length) {
      failures.push(route + ': ' + issues.join(' | '))
      console.error('FAIL ' + route + ' — ' + issues.join(' | '))
    } else {
      console.log('PASS ' + route)
    }
  }
} finally {
  await browser.close()
}

if (failures.length) {
  console.error('\nProduction browser smoke failed:')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}
console.log('Production browser smoke passed for ' + routes.length + ' critical routes with no uncaught page errors or CSP violations.')
