import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
const articlesSource = readFileSync(join(root, 'src/articles.ts'), 'utf8')
const errors = []
const canonicalOrigin = 'https://dreamex.tech'

const routePatterns = [...app.matchAll(/<Route\b[^>]*\bpath=["']([^"']+)["']/g)]
  .map(match => match[1])
  .filter(path => path !== '*' && !path.includes(':'))
const seoEntries = [...app.matchAll(/^\s*'([^']+)': \{ en: \{ title: '([^']+)', description: '([^']+)' \}, id: \{ title: '([^']+)', description: '([^']+)' \} \},?$/gm)]
  .map(match => ({ path: match[1], title: match[4], description: match[5] }))
const seoByPath = new Map(seoEntries.map(entry => [entry.path, entry]))

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function extractMeta(html, attribute, key) {
  const escapedKey = key.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
  const pattern = new RegExp('<meta\\b(?=[^>]*\\b' + attribute + '\\s*=\\s*["\\']' + escapedKey + '["\\'])[^>]*\\bcontent\\s*=\\s*(["'])(.*?)\\1', 'i')
  return html.match(pattern)?.[2] ?? null
}

function routeOutput(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  const output = resolve(dist, ...segments, 'index.html')
  if (!output.startsWith(dist + sep)) throw new Error('Unsafe output path: ' + pathname)
  return output
}

function verifyPage(pathname, expected, type = 'website', publishedAt = '') {
  const output = routeOutput(pathname)
  if (!existsSync(output)) {
    errors.push(pathname + ': missing prerendered HTML at ' + output)
    return
  }
  const html = readFileSync(output, 'utf8')
  const expectedCanonical = canonicalOrigin + pathname
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null
  const canonical = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["']/i)?.[1] ?? null
  const language = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? null
  if (title !== escapeHtml(expected.title)) errors.push(pathname + ': prerendered title does not match the Indonesian route metadata')
  if (extractMeta(html, 'name', 'description') !== escapeHtml(expected.description)) errors.push(pathname + ': meta description does not match the route metadata')
  if (canonical !== expectedCanonical) errors.push(pathname + ': canonical URL mismatch (' + (canonical ?? 'missing') + ')')
  if (extractMeta(html, 'property', 'og:url') !== expectedCanonical) errors.push(pathname + ': Open Graph URL does not match canonical URL')
  if (extractMeta(html, 'property', 'og:title') !== escapeHtml(expected.title)) errors.push(pathname + ': Open Graph title mismatch')
  if (extractMeta(html, 'property', 'og:description') !== escapeHtml(expected.description)) errors.push(pathname + ': Open Graph description mismatch')
  if (extractMeta(html, 'property', 'og:type') !== type) errors.push(pathname + ': Open Graph type should be ' + type)
  if (extractMeta(html, 'name', 'robots')?.includes('noindex')) errors.push(pathname + ': indexable page unexpectedly contains noindex')
  if (language !== 'id') errors.push(pathname + ': initial HTML should declare Indonesian as the default language')
  if (!html.includes('id="root"')) errors.push(pathname + ': application root is missing from prerendered HTML')
  if (type === 'article' && extractMeta(html, 'property', 'article:published_time') !== publishedAt) errors.push(pathname + ': article publication date metadata mismatch')
}

let staticPages = 0
for (const pathname of routePatterns) {
  if (pathname === '/') continue
  if (pathname.startsWith('/blog/')) continue
  const seo = seoByPath.get(pathname)
  if (!seo) {
    errors.push(pathname + ': static route has no bilingual SEO entry')
    continue
  }
  verifyPage(pathname, seo)
  staticPages += 1
}

const articleObjects = [...articlesSource.matchAll(/\{\s*slug:\s*'([^']+)'([\s\S]*?)\s*\},?/g)]
const seenSlugs = new Set()
let articlePages = 0
for (const match of articleObjects) {
  const slug = match[1]
  const body = match[2]
  const title = body.match(/(?:^|[,\n]\s*)title:\s*'([^']*)'/)?.[1]
  const description = body.match(/(?:^|[,\n]\s*)excerpt:\s*'([^']*)'/)?.[1]
  const date = body.match(/(?:^|[,\n]\s*)date:\s*'([^']*)'/)?.[1]
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Invalid article slug: ' + slug)
    continue
  }
  if (seenSlugs.has(slug)) {
    errors.push('Duplicate article slug: ' + slug)
    continue
  }
  seenSlugs.add(slug)
  if (!title || !description || !date) {
    errors.push('Article metadata is incomplete: ' + slug)
    continue
  }
  verifyPage('/blog/' + slug, { title: title + ' — DreamEx Tech', description }, 'article', date)
  articlePages += 1
}

if (errors.length) {
  console.error('Prerender verification failed:')
  for (const error of [...new Set(errors)]) console.error(' - ' + error)
  process.exit(1)
}

console.log('Prerender verification passed: ' + staticPages + ' static route pages and ' + articlePages + ' article pages have correct localized metadata, canonical URLs, social metadata, and content roots.')
