import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const errors = []
const vercelConfig = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))
const globalHeaders = vercelConfig.headers?.find(entry => entry.source === '/(.*)')?.headers ?? []
for (const [key, expected] of [['X-Content-Type-Options', 'nosniff'], ['Referrer-Policy', 'strict-origin-when-cross-origin'], ['X-Frame-Options', 'DENY'], ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'], ['Strict-Transport-Security', 'max-age=31536000']]) {
  if (!globalHeaders.some(header => header.key.toLowerCase() === key.toLowerCase() && header.value === expected)) errors.push('Missing or incorrect production security header: ' + key)
}

function requireFile(path, label = path) {
  if (!existsSync(path)) errors.push(`Missing required build output: ${label}`)
}

requireFile(join(dist, 'index.html'), 'dist/index.html')
requireFile(join(dist, 'robots.txt'), 'dist/robots.txt')
requireFile(join(dist, 'sitemap.xml'), 'dist/sitemap.xml')
requireFile(join(dist, 'rss.xml'), 'dist/rss.xml')
requireFile(join(dist, 'rss.xsl'), 'dist/rss.xsl')
requireFile(join(dist, 'favicon.svg'), 'dist/favicon.svg')
requireFile(join(dist, 'manifest.webmanifest'), 'dist/manifest.webmanifest')
requireFile(join(dist, 'sw.js'), 'dist/sw.js')
requireFile(join(dist, 'icon-192.png'), 'dist/icon-192.png')
requireFile(join(dist, 'icon-512.png'), 'dist/icon-512.png')

if (errors.length === 0) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const manifest = readFileSync(join(dist, 'manifest.webmanifest'), 'utf8')
  const serviceWorker = readFileSync(join(dist, 'sw.js'), 'utf8')
  const mainSource = readFileSync(join(root, 'src', 'main.tsx'), 'utf8')
  if (!html.includes('rel="manifest"') || !mainSource.includes("serviceWorker.register('/sw.js')")) errors.push('PWA manifest link or service worker registration is missing')
  try {
    const parsedManifest = JSON.parse(manifest)
    if (parsedManifest.name !== 'DreamEx Tech' || !parsedManifest.icons?.some(icon => icon.src === '/icon-192.png') || !parsedManifest.icons?.some(icon => icon.src === '/icon-512.png')) errors.push('PWA manifest name or required icons are invalid')
  } catch { errors.push('PWA manifest is not valid JSON') }
  if (!serviceWorker.includes("addEventListener('fetch'") || !serviceWorker.includes('CACHE_NAME')) errors.push('Offline service worker strategy is missing')
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8')
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8')
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8')
  const source = readFileSync(join(root, 'src/articles.ts'), 'utf8')
  const styles = readFileSync(join(root, 'src/styles.css'), 'utf8')
  const i18n = readFileSync(join(root, 'src/i18n.tsx'), 'utf8')
  const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
  if (!app.includes('function InstallAppButton()') || !app.includes('beforeinstallprompt') || !app.includes('function OfflineNotice()')) errors.push('PWA install action and offline status are required')

  if (!app.includes('function RssPage()') || !app.includes('path="/rss" element={<RssPage />}')) errors.push('Human-readable RSS web route is missing')
  if (!app.includes("navigator.clipboard.writeText('https://www.dreamex.tech/rss.xml')")) errors.push('RSS subscription action must copy the feed URL without navigating to raw XML')
  if (app.includes('href="/rss.xml"><Rss size={16} />')) errors.push('RSS subscription CTA still navigates directly to raw XML')

  if (!/"@type"\s*:\s*"Organization"/.test(html) || !/"@type"\s*:\s*"WebSite"/.test(html) || !html.includes('https://dreamex.tech/#organization')) errors.push('Homepage Organization and WebSite structured data are missing or invalid')

  for (const [label, pattern] of [
    ['page title', /<title>[^<]+<\/title>/i],
    ['meta description', /<meta\s+name="description"\s+content="[^"]+"/i],
    ['canonical URL', /<link\s+rel="canonical"\s+href="https:\/\/dreamex\.tech\/?"/i],
  ]) {
    if (!pattern.test(html)) errors.push(`Missing or invalid ${label} in built HTML`)
  }

  if (!robots.includes('Sitemap: https://dreamex.tech/sitemap.xml')) {
    errors.push('robots.txt does not reference the production sitemap')
  }

  if (!/^<!doctype html>\s*<html lang="en">/i.test(html)) errors.push('Initial HTML language must match the default English experience')
  if (!/document\.documentElement\.lang\s*=\s*language/.test(i18n)) errors.push('Document language is not synchronized with the selected UI language')
  if (!app.includes('className="skip-link"') || !app.includes('href="#main-content"')) errors.push('Skip link to main content is missing')
  if (!styles.includes('@media (prefers-reduced-motion: reduce)')) errors.push('Stylesheet does not respect reduced-motion preferences')

  const articleSlugs = [...source.matchAll(/slug:\s*'([^']+)'/g)].map(match => match[1])
  const sitemapSlugs = [...sitemap.matchAll(/https:\/\/dreamex\.tech\/blog\/([^<\s]+)/g)].map(match => match[1])

  for (const slug of articleSlugs) {
    if (!sitemapSlugs.includes(slug)) errors.push(`Article missing from sitemap: ${slug}`)
  }
  for (const slug of sitemapSlugs) {
    if (!articleSlugs.includes(slug)) errors.push(`Sitemap references unknown article: ${slug}`)
  }

  if (!rss.includes('<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>')) errors.push('RSS browser stylesheet reference is missing')
  if (!rss.includes('<rss version="2.0"') || !rss.includes('<channel>') || !rss.includes('https://dreamex.tech/rss.xml')) {
    errors.push('RSS feed is missing required channel metadata')
  }
  const rssSlugs = [...rss.matchAll(/https:\/\/dreamex\.tech\/blog\/([^<\s]+)/g)].map(match => match[1])
  const itemBlocks = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1])
  const rssGuids = [...rss.matchAll(/<guid(?:\s+isPermaLink="true")?>([^<]+)<\/guid>/g)].map(match => match[1])
  const rssDates = [...rss.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map(match => Date.parse(match[1]))
  if (itemBlocks.length !== articleSlugs.length) errors.push(`RSS item count mismatch: expected ${articleSlugs.length}, found ${itemBlocks.length}`)
  if (new Set(rssGuids).size !== rssGuids.length) errors.push('RSS contains duplicate GUIDs')
  if (rssDates.some(Number.isNaN)) errors.push('RSS contains an invalid pubDate')
  for (let index = 1; index < rssDates.length; index++) {
    if (rssDates[index] > rssDates[index - 1]) errors.push('RSS items are not sorted newest-first')
  }
  for (const slug of articleSlugs) if (rssSlugs.filter(value => value === slug).length !== 2) errors.push(`Article should have exactly one link and one GUID in RSS: ${slug}`)
  for (const slug of rssSlugs) if (!articleSlugs.includes(slug)) errors.push(`RSS references unknown article: ${slug}`)
  if (!/<language>id-ID<\/language>/.test(rss)) errors.push('RSS channel language is missing')
  if (!/<atom:link href="https:\/\/dreamex\.tech\/rss\.xml" rel="self" type="application\/rss\+xml"\s*\/>/.test(rss)) errors.push('RSS self link is missing or invalid')

  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1])
  for (const asset of assets) {
    requireFile(join(dist, asset.replace(/^\//, '')), asset)
  }

  if (!/<urlset\b/.test(sitemap) || !/<loc>https:\/\/dreamex\.tech\/<\/loc>/.test(sitemap)) {
    errors.push('Sitemap XML is missing its urlset or homepage URL')
  }
}

if (existsSync(join(dist, 'sitemap.xml'))) {
  const sitemapOutput = readFileSync(join(dist, 'sitemap.xml'), 'utf8')
  for (const route of ['https://dreamex.tech/about', 'https://dreamex.tech/lab', 'https://dreamex.tech/observatory', 'https://dreamex.tech/devtools', 'https://dreamex.tech/engineering-intelligence', 'https://dreamex.tech/control-plane', 'https://dreamex.tech/quality-intelligence', 'https://dreamex.tech/reliability-center', 'https://dreamex.tech/workspace', 'https://dreamex.tech/api-playground', 'https://dreamex.tech/performance', 'https://dreamex.tech/knowledge-graph', 'https://dreamex.tech/learn', 'https://dreamex.tech/qa-studio', 'https://dreamex.tech/security-center', 'https://dreamex.tech/rss']) {
    if (!sitemapOutput.includes(`<loc>${route}</loc>`)) errors.push(`Sitemap is missing canonical route: ${route}`)
  }
  if (!sitemapOutput.includes('<lastmod>')) errors.push('Sitemap is missing article publication dates')
  if (!sitemapOutput.includes('<loc>https://dreamex.tech/learn</loc>') || !sitemapOutput.includes('<loc>https://dreamex.tech/lab</loc>') || !sitemapOutput.includes('<loc>https://dreamex.tech/roadmap</loc>')) errors.push('Sitemap is missing public learning, engineering-tool, or roadmap routes')
}

const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8')
if (!appSource.includes('path="/reading-list"') || !appSource.includes('function ReadingListPage') || !appSource.includes('READING_LIST_KEY')) {
  errors.push('Personal reading list route and persistence are required')
}
if (!appSource.includes('READING_PROGRESS_KEY') || !appSource.includes('function readReadingProgress') || !appSource.includes('resume-reading')) errors.push('Resume reading progress persistence and home card are required')

if (!appSource.includes('path="/observatory"') || !appSource.includes('function WebQualityObservatoryPage')) errors.push('Web Quality Observatory route is required')
if (!appSource.includes('path="/devtools"') || !appSource.includes('function DeveloperUtilitiesPage')) errors.push('Developer Utilities route is required')
if (!appSource.includes('path="/workspace"') || !appSource.includes('EngineeringWorkspacePage')) errors.push('Engineering Workspace route is required')
if (!appSource.includes('path="/api-playground"') || !appSource.includes('ApiPlaygroundPage')) errors.push('API Playground route is required')
if (!appSource.includes('path="/performance"') || !appSource.includes('PerformanceObservatoryPage')) errors.push('Performance Observatory route is required')
if (!appSource.includes('path="/knowledge-graph"') || !appSource.includes('EngineeringKnowledgeGraphPage')) errors.push('Engineering Knowledge Graph route is required')
if (!appSource.includes('path="/roadmap"') || !appSource.includes('EngineeringRoadmapPage')) errors.push('Engineering Roadmap and Readiness Center route is required')
if (!appSource.includes('path="/qa-studio"') || !appSource.includes('QAAutomationStudioPage')) errors.push('QA Automation Studio route is required')
if (!appSource.includes('path="/security-center"') || !appSource.includes('SecurityCenterPage')) errors.push('Security Center route is required')
if (!appSource.includes('path="/engineering-intelligence"') || !appSource.includes('EngineeringIntelligencePage')) errors.push('Engineering Intelligence route is required')
if (!appSource.includes('path="/control-plane"') || !appSource.includes('EngineeringControlPlanePage')) errors.push('Engineering Control Plane route is required')
if (!appSource.includes('path="/quality-intelligence"') || !appSource.includes('QualityIntelligencePage')) errors.push('Quality Intelligence route is required')
if (!appSource.includes('path="/reliability-center"') || !appSource.includes('ReliabilityCenterPage')) errors.push('Reliability Center route is required')
const reliabilitySource = readFileSync(join(root, 'src', 'ReliabilityCenter.tsx'), 'utf8')
if (!reliabilitySource.includes('dreamex-reliability-incidents-v1') || !reliabilitySource.includes('dreamex-reliability-metrics-v1') || !reliabilitySource.includes('incidentMarkdown') || !reliabilitySource.includes('not an official DORA assessment')) errors.push('Reliability Center local persistence, postmortem export, and metrics disclosure are required')
const qualitySource = readFileSync(join(root, 'src', 'QualityIntelligence.tsx'), 'utf8')
if (!qualitySource.includes('parseJUnitXml') || !qualitySource.includes('parsePlaywrightJson') || !qualitySource.includes('MAX_REPORT_BYTES') || !qualitySource.includes('dreamex-quality-intelligence-history-v1')) errors.push('Quality Intelligence report parsing, file size guard, and local summary history are required')
const controlPlaneSource = readFileSync(join(root, 'src', 'EngineeringControlPlane.tsx'), 'utf8')
if (!controlPlaneSource.includes('dreamex-control-plane-checklist-v1') || !controlPlaneSource.includes('dreamex-control-plane-snapshot.json') || !controlPlaneSource.includes('Browser-session signals')) errors.push('Control Plane checklist persistence, snapshot export, and honest signal disclosure are required')
const intelligenceSource = readFileSync(join(root, 'src', 'EngineeringIntelligence.tsx'), 'utf8')
if (!intelligenceSource.includes('parseContract') || !intelligenceSource.includes('compareContracts') || !intelligenceSource.includes('dreamex-engineering-catalog-v1')) errors.push('Engineering Intelligence catalog and OpenAPI contract analysis are required')
const suiteSource = readFileSync(join(root, 'src', 'EngineeringQualitySuite.tsx'), 'utf8')
if (!suiteSource.includes('dreamex-qa-studio-history-v1') || !suiteSource.includes('dreamex-security-audit-v1') || !suiteSource.includes('Feature: ')) errors.push('QA artifact generation and local security audit persistence are required')
if (!suiteSource.includes('readLocalInventory') || !suiteSource.includes('clearLocalData') || !suiteSource.includes('dreamex-local-data-backup.json')) errors.push('Local privacy inventory, scoped deletion, and data export are required')

const roadmapSource = readFileSync(join(root, 'src', 'EngineeringRoadmap.tsx'), 'utf8')
if (!roadmapSource.includes('dreamex-readiness-scorecard-v1') || !roadmapSource.includes('STRIDE') || !roadmapSource.includes('Architecture Decision Record')) errors.push('Roadmap, readiness scorecard, ADR, and threat-model tools are required')
if (!appSource.includes('dreamex-learning-progress-v1')) errors.push('Persistent learning progress is required')

if (!appSource.includes('path="/lab"') || !appSource.includes('function EngineeringLabPage')) {
  errors.push('Engineering Lab route and toolkit are required')
}
if (!appSource.includes('path="/learn"') || !appSource.includes('function LearningHubPage') || !appSource.includes('Engineering glossary')) {
  errors.push('Learning Hub route, curated paths, and glossary are required')
}

if (errors.length > 0) {
  console.error('Build verification failed:')
  for (const error of errors) console.error(` - ${error}`)
  process.exitCode = 1
} else {
  console.log('Build verification passed: required files, SEO metadata, assets, and sitemap routes are consistent.')
}
