import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const errors = []

function requireFile(path, label = path) {
  if (!existsSync(path)) errors.push(`Missing required build output: ${label}`)
}

requireFile(join(dist, 'index.html'), 'dist/index.html')
requireFile(join(dist, 'robots.txt'), 'dist/robots.txt')
requireFile(join(dist, 'sitemap.xml'), 'dist/sitemap.xml')
requireFile(join(dist, 'rss.xml'), 'dist/rss.xml')
requireFile(join(dist, 'rss.xsl'), 'dist/rss.xsl')
requireFile(join(dist, 'favicon.svg'), 'dist/favicon.svg')

if (errors.length === 0) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8')
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8')
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8')
  const source = readFileSync(join(root, 'src/articles.ts'), 'utf8')

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
  for (const route of ['https://dreamex.tech/about', 'https://dreamex.tech/rss']) {
    if (!sitemapOutput.includes(`<loc>${route}</loc>`)) errors.push(`Sitemap is missing canonical route: ${route}`)
  }
  if (!sitemapOutput.includes('<lastmod>')) errors.push('Sitemap is missing article publication dates')
}

if (errors.length > 0) {
  console.error('Build verification failed:')
  for (const error of errors) console.error(` - ${error}`)
  process.exitCode = 1
} else {
  console.log('Build verification passed: required files, SEO metadata, assets, and sitemap routes are consistent.')
}
