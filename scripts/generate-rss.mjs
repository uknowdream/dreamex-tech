import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const source = readFileSync(join(root, 'src/articles.ts'), 'utf8')
const articlePattern = /slug:\s*'([^']+)',\s*title:\s*'([^']+)',\s*excerpt:\s*'([^']+)'[\s\S]*?date:\s*'([^']+)'/g
const articles = [...source.matchAll(articlePattern)].map((match) => ({ slug: match[1], title: match[2], excerpt: match[3], date: match[4] }))

if (articles.length === 0) {
  console.error('RSS generation failed: no articles were found in src/articles.ts')
  process.exit(1)
}

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
const items = articles.map(article => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>https://dreamex.tech/blog/${article.slug}</link>
      <guid isPermaLink="true">https://dreamex.tech/blog/${article.slug}</guid>
      <description>${escapeXml(article.excerpt)}</description>
      <pubDate>${new Date(`${article.date}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`).join('
')
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DreamEx Tech</title>
    <link>https://dreamex.tech/</link>
    <description>Practical notes on software engineering, quality engineering, AI, and modern technology.</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://dreamex.tech/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
writeFileSync(join(root, 'public/rss.xml'), xml)
console.log(`RSS generation passed: generated ${articles.length} article entries in public/rss.xml`)
