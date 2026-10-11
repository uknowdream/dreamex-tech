import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const source = readFileSync(join(root, 'src/articles.ts'), 'utf8')
const articleObjects = [...source.matchAll(/\{\s*slug:\s*'([^']+)'([\s\S]*?)\s*\},?/g)]

const readField = (body, field) => {
  const match = body.match(new RegExp(`(?:^|[,\n]\\s*)${field}:\\s*'((?:\\\\.|[^'])*)'`))
  return match?.[1]?.replaceAll("\\\\'", "'").replaceAll('\\\\\\\\', '\\\\')
}

const articles = articleObjects.map((match) => {
  const slug = match[1]
  const body = match[2]
  return {
    slug,
    title: readField(body, 'title'),
    excerpt: readField(body, 'excerpt'),
    date: readField(body, 'date'),
  }
})

const errors = []
if (articles.length === 0) errors.push('no article objects were found in src/articles.ts')

const seenSlugs = new Set()
for (const article of articles) {
  if (!article.title) errors.push(`Article "${article.slug}" is missing a title`)
  if (!article.excerpt) errors.push(`Article "${article.slug}" is missing an excerpt`)
  if (!article.date || !/^\d{4}-\d{2}-\d{2}$/.test(article.date) || Number.isNaN(Date.parse(`${article.date}T00:00:00Z`))) {
    errors.push(`Article "${article.slug}" has an invalid publication date`)
  }
  if (seenSlugs.has(article.slug)) errors.push(`Duplicate article slug: ${article.slug}`)
  seenSlugs.add(article.slug)
}
if (errors.length) {
  console.error('RSS generation failed:')
  for (const error of errors) console.error(` - ${error}`)
  process.exit(1)
}

articles.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const siteUrl = 'https://dreamex.tech'
const items = articles.map(article => {
  const articleUrl = `${siteUrl}/blog/${article.slug}`
  return [
    '    <item>',
    `      <title>${escapeXml(article.title)}</title>`,
    `      <link>${articleUrl}</link>`,
    `      <guid isPermaLink="true">${articleUrl}</guid>`,
    `      <description>${escapeXml(article.excerpt)}</description>`,
    `      <pubDate>${new Date(`${article.date}T00:00:00Z`).toUTCString()}</pubDate>`,
    '    </item>',
  ].join('\n')
}).join('\n')

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  '  <channel>',
  '    <title>DreamEx Tech</title>',
  `    <link>${siteUrl}/</link>`,
  '    <description>Practical notes on software engineering, quality engineering, AI, and modern technology.</description>',
  '    <language>id-ID</language>',
  `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
  `    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />`,
  items,
  '  </channel>',
  '</rss>',
  '',
].join('\n')

writeFileSync(join(root, 'public/rss.xml'), xml)
console.log(`RSS generation passed: generated ${articles.length} validated article entries in newest-first order.`)
