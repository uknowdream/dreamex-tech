import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const read = path => readFileSync(join(dist, path), 'utf8')
const errors = []
const html = read('index.html')
const rss = read('rss.xml')
const sitemap = read('sitemap.xml')
const robots = read('robots.txt')
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
const articlesSource = readFileSync(join(root, 'src/articles.ts'), 'utf8')

const get = (regex, source, label) => {
  const match = source.match(regex)
  if (!match?.[1]) {
    errors.push('Missing or invalid ' + label)
    return ''
  }
  return match[1].trim()
}
const canonical = get(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i, html, 'canonical URL')
const ogUrl = get(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'Open Graph URL')
const title = get(/<title>([^<]+)<\/title>/i, html, 'document title')
const description = get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'meta description')
const ogTitle = get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'Open Graph title')
const ogDescription = get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'Open Graph description')
const rssHref = get(/<link\s+rel=["']alternate["']\s+type=["']application\/rss\+xml["']\s+title=["'][^"']*["']\s+href=["']([^"']+)["'][^>]*>/i, html, 'RSS alternate link')
const sitemapHref = get(/<link\s+rel=["']sitemap["']\s+type=["']application\/xml["']\s+href=["']([^"']+)["'][^>]*>/i, html, 'sitemap discovery link')
const cardType = get(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'Twitter card type')

if (title.length < 10 || title.length > 70) errors.push('Document title should be between 10 and 70 characters.')
if (description.length < 50 || description.length > 160) errors.push('Meta description should be between 50 and 160 characters.')
if (ogTitle.length < 10 || ogTitle.length > 70) errors.push('Open Graph title should be between 10 and 70 characters.')
if (!ogDescription || ogDescription.length < 40) errors.push('Open Graph description is missing or too short.')
if (!['summary', 'summary_large_image'].includes(cardType)) errors.push('Twitter card type must be summary or summary_large_image.')

let canonicalUrl
try {
  canonicalUrl = new URL(canonical)
  if (canonicalUrl.protocol !== 'https:' || canonicalUrl.pathname !== '/' || canonicalUrl.search || canonicalUrl.hash) errors.push('Canonical URL must be the HTTPS origin root.')
} catch {
  errors.push('Canonical URL is not a valid absolute URL.')
}
const origin = canonicalUrl?.origin
if (origin) {
  if (ogUrl !== canonical) errors.push('Open Graph URL must match the canonical URL exactly.')
  if (rssHref !== origin + '/rss.xml') errors.push('RSS alternate link must target the canonical origin /rss.xml.')
  if (sitemapHref !== '/sitemap.xml') errors.push('Sitemap discovery link should use the root-relative /sitemap.xml path.')
  if (!robots.split(/\r?\n/).some(line => line.trim() === 'Sitemap: ' + origin + '/sitemap.xml')) errors.push('robots.txt Sitemap directive does not match the canonical origin.')
  const selfLink = rss.match(/<atom:link\s+href=["']([^"']+)["']\s+rel=["']self["']/i)?.[1]
  if (selfLink !== origin + '/rss.xml') errors.push('RSS self link does not match the canonical origin.')
  const channelLink = rss.match(/<channel>[\s\S]*?<link>([^<]+)<\/link>/i)?.[1]
  if (channelLink !== origin + '/') errors.push('RSS channel link does not match the canonical origin.')
}

const routeDeclarations = [...app.matchAll(/<Route\b[^>]*\bpath=["']([^"']+)["']/g)].map(match => match[1])
const routePatterns = routeDeclarations.filter(route => route !== '*')
const routeSeoEntries = [...app.matchAll(/^\s*'([^']+)': \{ en: \{ title: '([^']+)', description: '([^']+)' \}, id: \{ title: '([^']+)', description: '([^']+)' \} \},?$/gm)]
const routeSeoPaths = new Set(routeSeoEntries.map(match => match[1]))
if (!app.includes('function RouteMetadata()') || !app.includes("upsertMeta('og:url'")) errors.push('Route-specific metadata controller is missing')
for (const route of routePatterns) {
  if (route === '/blog/:slug' || route.includes(':')) continue
  if (!routeSeoPaths.has(route)) errors.push('Route is missing bilingual SEO metadata: ' + route)
}
for (const [, route, enTitle, enDescription, idTitle, idDescription] of routeSeoEntries) {
  for (const [language, title, description] of [['English', enTitle, enDescription], ['Indonesian', idTitle, idDescription]]) {
    if (title.length < 10 || title.length > 70) errors.push(route + ' ' + language + ' SEO title must be 10–70 characters.')
    if (description.length < 50 || description.length > 180) errors.push(route + ' ' + language + ' meta description must be 50–180 characters.')
  }
}
const articleSlugs = new Set([...articlesSource.matchAll(/slug:\s*'([^']+)'/g)].map(match => match[1]))
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
if (!sitemapLocations.length) errors.push('Sitemap has no URL entries.')
if (new Set(sitemapLocations).size !== sitemapLocations.length) errors.push('Sitemap contains duplicate URLs.')

function routeMatches(pathname) {
  const target = pathname.split(/[?#]/, 1)[0] || '/'
  const targetParts = target.split('/').filter(Boolean)
  return routePatterns.some(route => {
    const parts = route.replace(/\/+$/, '').split('/').filter(Boolean)
    if (route === '/' && target === '/') return true
    if (parts.length !== targetParts.length) return false
    return parts.every((part, index) => part.startsWith(':') || part === targetParts[index])
  })
}

const sitemapPaths = new Set()
const sitemapArticleSlugs = new Set()
for (const value of sitemapLocations) {
  let url
  try { url = new URL(value) } catch { errors.push('Sitemap contains an invalid absolute URL: ' + value); continue }
  if (origin && url.origin !== origin) errors.push('Sitemap URL uses a non-canonical host: ' + value)
  if (url.search || url.hash) errors.push('Sitemap URL must not contain a query or fragment: ' + value)
  if (!routeMatches(url.pathname)) errors.push('Sitemap URL has no matching client route: ' + value)
  sitemapPaths.add(url.pathname)
  const article = url.pathname.match(/^\/blog\/([^/]+)$/)
  if (article) {
    if (!articleSlugs.has(article[1])) errors.push('Sitemap references an unknown article slug: ' + article[1])
    sitemapArticleSlugs.add(article[1])
    const lastmod = sitemap.slice(sitemap.indexOf('<loc>' + value + '</loc>'), sitemap.indexOf('</url>', sitemap.indexOf('<loc>' + value + '</loc>')))
    if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(lastmod)) errors.push('Article sitemap entry is missing a valid lastmod date: ' + value)
  }
}
for (const slug of articleSlugs) {
  if (!sitemapArticleSlugs.has(slug)) errors.push('Article is missing from sitemap: ' + slug)
}
const indexableRoutes = [
  '/', '/about', '/lab', '/observatory', '/devtools', '/workspace',
  '/engineering-intelligence', '/control-plane', '/command-center', '/github-ci', '/team-workspace',
  '/quality-intelligence', '/reliability-center', '/supply-chain-intelligence',
  '/roadmap', '/qa-studio', '/security-center', '/api-playground',
  '/performance', '/knowledge-graph', '/learn', '/rss',
]
for (const route of indexableRoutes) {
  if (!sitemapPaths.has(route)) errors.push('Indexable route is missing from sitemap: ' + route)
}
if (sitemapPaths.has('/reading-list')) errors.push('Personalized browser-local reading list must not be included in the sitemap.')

const rssItems = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1])
const rssArticleSlugs = new Set()
for (const item of rssItems) {
  const itemUrl = item.match(/<link>([^<]+)<\/link>/i)?.[1]
  if (!itemUrl) { errors.push('RSS item is missing a link.'); continue }
  try {
    const url = new URL(itemUrl)
    if (origin && url.origin !== origin) errors.push('RSS item uses a non-canonical host: ' + itemUrl)
    const article = url.pathname.match(/^\/blog\/([^/]+)$/)
    if (!article || !articleSlugs.has(article[1])) errors.push('RSS item does not point to a known article: ' + itemUrl)
    else rssArticleSlugs.add(article[1])
  } catch { errors.push('RSS item link is not a valid absolute URL: ' + itemUrl) }
}
if (rssItems.length !== articleSlugs.size) errors.push('RSS item count does not match the article inventory.')
for (const slug of articleSlugs) if (!rssArticleSlugs.has(slug)) errors.push('Article is missing from RSS: ' + slug)

if (errors.length) {
  console.error('SEO metadata and discovery verification failed:')
  for (const error of [...new Set(errors)]) console.error(' - ' + error)
  process.exit(1)
}
console.log('SEO verification passed: canonical host, metadata, RSS/sitemap discovery, route inventory, and ' + articleSlugs.size + ' article URLs are consistent.')
