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

  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1])
  for (const asset of assets) {
    requireFile(join(dist, asset.replace(/^\//, '')), asset)
  }

  if (!/<urlset\b/.test(sitemap) || !/<loc>https:\/\/dreamex\.tech\/<\/loc>/.test(sitemap)) {
    errors.push('Sitemap XML is missing its urlset or homepage URL')
  }
}

if (errors.length > 0) {
  console.error('Build verification failed:')
  for (const error of errors) console.error(` - ${error}`)
  process.exitCode = 1
} else {
  console.log('Build verification passed: required files, SEO metadata, assets, and sitemap routes are consistent.')
}
