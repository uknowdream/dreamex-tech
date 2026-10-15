import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
const indexPath = join(dist, 'index.html')
const appPath = join(root, 'src/App.tsx')
const articlesPath = join(root, 'src/articles.ts')

if (!existsSync(indexPath)) {
  console.error('Route prerender failed: dist/index.html is missing. Run the Vite build first.')
  process.exit(1)
}

const app = readFileSync(appPath, 'utf8')
const articleSource = readFileSync(articlesPath, 'utf8')
const template = readFileSync(indexPath, 'utf8')
const errors = []
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

function replaceMeta(html, attribute, key, value) {
  const escapedKey = key.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
  const pattern = new RegExp("<meta\\b(?=[^>]*\\b" + attribute + "\\s*=\\s*[\"']" + escapedKey + "[\"'])[^>]*>", 'i')
  const safeValue = escapeHtml(value)
  const update = tag => /\bcontent\s*=/i.test(tag)
    ? tag.replace(/\bcontent\s*=\s*(["']).*?\1/i, 'content="' + safeValue + '"')
    : tag.replace(/\s*\/?>$/, ' content="' + safeValue + '" />')
  if (pattern.test(html)) return html.replace(pattern, update)
  return html.replace('</head>', '  <meta ' + attribute + '="' + escapeHtml(key) + '" content="' + safeValue + '" />\n  </head>')
}

function renderMetadata(page, canonical, type = 'website', publishedAt = '') {
  let html = template
  html = html.replace(/<html\b([^>]*)\blang=["'][^"']*["']([^>]*)>/i, '<html$1lang="id"$2>')
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escapeHtml(page.title) + '</title>')
  html = replaceMeta(html, 'name', 'description', page.description)
  html = replaceMeta(html, 'name', 'robots', 'index, follow, max-image-preview:large')
  html = replaceMeta(html, 'property', 'og:title', page.title)
  html = replaceMeta(html, 'property', 'og:description', page.description)
  html = replaceMeta(html, 'property', 'og:url', canonical)
  html = replaceMeta(html, 'property', 'og:type', type)
  html = replaceMeta(html, 'name', 'twitter:title', page.title)
  html = replaceMeta(html, 'name', 'twitter:description', page.description)
  html = replaceMeta(html, 'name', 'twitter:card', 'summary')
  const canonicalPattern = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i
  if (!canonicalPattern.test(html)) {
    errors.push(canonical + ': template is missing its canonical link')
  } else {
    html = html.replace(canonicalPattern, tag => /\bhref\s*=/i.test(tag)
      ? tag.replace(/\bhref\s*=\s*(["']).*?\1/i, 'href="' + escapeHtml(canonical) + '"')
      : tag.replace(/\s*\/?>$/, ' href="' + escapeHtml(canonical) + '" />'))
  }
  if (type === 'article' && publishedAt) {
    html = replaceMeta(html, 'property', 'article:published_time', publishedAt)
  }
  return html
}

const routeSeoPattern = /^\s*'([^']+)': \{ en: \{ title: '([^']+)', description: '([^']+)' \}, id: \{ title: '([^']+)', description: '([^']+)' \} \},?$/gm
const routeSeo = [...app.matchAll(routeSeoPattern)].map(match => ({
  path: match[1],
  page: { title: match[4], description: match[5] },
}))

if (!routeSeo.length) errors.push('No route SEO entries could be parsed from src/App.tsx.')

function writeRoute(pathname, html) {
  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length || segments.some(segment => segment === '.' || segment === '..' || !/^[a-z0-9-]+$/.test(segment))) {
    errors.push('Unsafe or unsupported prerender route: ' + pathname)
    return false
  }
  const outputPath = resolve(dist, ...segments, 'index.html')
  if (!outputPath.startsWith(dist + sep)) {
    errors.push('Prerender output escaped dist: ' + pathname)
    return false
  }
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html)
  return true
}

let staticPages = 0
for (const entry of routeSeo) {
  if (entry.path === '/') continue
  if (entry.path.includes(':') || entry.path.includes('*')) continue
  if (!/^\/(?:[a-z0-9-]+\/?)*$/.test(entry.path)) {
    errors.push('Unsupported static route pattern: ' + entry.path)
    continue
  }
  const canonical = 'https://dreamex.tech' + entry.path.replace(/\/+$/, '')
  if (writeRoute(entry.path, renderMetadata(entry.page, canonical))) staticPages += 1
}

function readField(body, field) {
  const match = body.match(new RegExp("(?:^|[,\\n]\\s*)" + field + ":\\s*'([^']*)'"))
  return match?.[1]?.replaceAll("\\\\'", "'").replaceAll('\\\\\\\\', '\\\\')
}

const articleObjects = [...articleSource.matchAll(/\{\s*slug:\s*'([^']+)'([\s\S]*?)\s*\},?/g)]
const articles = articleObjects.map(match => ({
  slug: match[1],
  title: readField(match[2], 'title'),
  description: readField(match[2], 'excerpt'),
  date: readField(match[2], 'date'),
}))

if (!articles.length) errors.push('No article entries could be parsed from src/articles.ts.')
const seenSlugs = new Set()
let articlePages = 0
for (const article of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    errors.push('Invalid article slug for prerender: ' + article.slug)
    continue
  }
  if (seenSlugs.has(article.slug)) {
    errors.push('Duplicate article slug: ' + article.slug)
    continue
  }
  seenSlugs.add(article.slug)
  if (!article.title || !article.description || !/^\d{4}-\d{2}-\d{2}$/.test(article.date ?? '')) {
    errors.push('Article metadata is incomplete: ' + article.slug)
    continue
  }
  const pathname = '/blog/' + article.slug
  const canonical = 'https://dreamex.tech' + pathname
  if (writeRoute(pathname, renderMetadata({ title: article.title + ' — DreamEx Tech', description: article.description }, canonical, 'article', article.date))) articlePages += 1
}

if (errors.length) {
  console.error('Route prerender failed:')
  for (const error of [...new Set(errors)]) console.error(' - ' + error)
  process.exit(1)
}

console.log('Route SEO prerender passed: ' + staticPages + ' static route pages and ' + articlePages + ' article pages generated with route-specific title, description, canonical URL, Open Graph, Twitter, and robots metadata.')
