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

const sitemapUrls = [
  { loc: `${siteUrl}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${siteUrl}/about`, changefreq: 'monthly', priority: '0.6' },
  { loc: `${siteUrl}/lab`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/observatory`, changefreq: 'monthly', priority: '0.6' },
  { loc: `${siteUrl}/devtools`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/workspace`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${siteUrl}/github-ci`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/team-workspace`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/engineering-intelligence`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${siteUrl}/control-plane`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/command-center`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/quality-intelligence`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/reliability-center`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/supply-chain-intelligence`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/roadmap`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/qa-studio`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${siteUrl}/security-center`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/api-playground`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/performance`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${siteUrl}/knowledge-graph`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${siteUrl}/learn`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/prototype`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${siteUrl}/grader`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${siteUrl}/tools`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${siteUrl}/ba-hub`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/pm-jira-hub`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${siteUrl}/rss`, changefreq: 'daily', priority: '0.7' },
  ...articles.map(article => ({
    loc: `${siteUrl}/blog/${article.slug}`,
    lastmod: article.date,
    changefreq: 'monthly',
    priority: '0.8',
  })),
]
const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapUrls.map(url => [
    '  <url>',
    `    <loc>${url.loc}</loc>`,
    ...(url.lastmod ? [`    <lastmod>${url.lastmod}</lastmod>`] : []),
    `    <changefreq>${url.changefreq}</changefreq>`,
    `    <priority>${url.priority}</priority>`,
    '  </url>',
  ].join(String.fromCharCode(10))),
  '</urlset>',
  '',
].join(String.fromCharCode(10))
writeFileSync(join(root, 'public/sitemap.xml'), sitemapXml)
console.log(`Sitemap generation passed: ${sitemapUrls.length} canonical routes included.`)

const llmsSummary = [
  '# DreamEx Tech — Autonomous AI Engineering Operating System (v6.0)',
  '',
  '> DreamEx Tech (https://dreamex.tech) is a client-sovereign AI Engineering Operating System uniting 5-Agent Live UI Prototyping, Universal Scalability Law (USL) distributed systems architecture, Self-Healing Playwright QA automation, Executable Gherkin/RTM Business Analysis, 10,000-trial Monte Carlo Jira delivery forecasting, and Zero-Trust Security/SBOM governance.',
  '',
  '## Flagship Interactive Suites',
  `- [Autonomous AI Prototype & Multi-Agent Studio](${siteUrl}/prototype): Orchestrate 5 specialized engineering AI agents, test responsive Desktop/Tablet/Mobile sandboxes with RBAC & chaos failover, model LLM token ROI, and export a 7-file production starter .zip.`,
  `- [AI Readiness, Security & Architecture Grader](${siteUrl}/grader): Audit any public HTTPS website or GitHub repository across Zero-Trust CSP/HSTS headers, /llms.txt AI discovery, semantic accessibility, and edge latency, with dynamic SVG badges.`,
  `- [6-Pillar Sovereign IT Workbench](${siteUrl}/tools): Unified deterministic workbench for Software Engineers, QA/UAT, Business Analysts, Project Managers, Jira REST v3 ADF, and DevSecOps.`,
  `- [BA Requirement, Gherkin & RTM Studio](${siteUrl}/ba-hub): Compile BRD intents into Gherkin BDD scenarios and bi-directional Requirement Traceability Matrices.`,
  `- [PM Monte Carlo & Jira Neural Hub](${siteUrl}/pm-jira-hub): Synthesize Jira REST API v3 ADF payloads, visual JQL queries, and 10,000-trial sprint forecasts.`,
  `- [Unified Engineering Workspace](${siteUrl}/workspace): Search and launch all 25+ role-indexed engineering suites.`,
  '',
  '## Machine-Readable APIs & Model Context Protocol (MCP)',
  `- Streamable HTTP MCP Server (JSON-RPC 2.0): ${siteUrl}/api/mcp`,
  `- Public AI Readiness & Security Grader API: ${siteUrl}/api/grader`,
  `- Dynamic SVG Readiness Shield Badge: ${siteUrl}/api/badge?domain=dreamex.tech&score=99&grade=A%2B`,
  `- Full Documentation & Article Corpus: ${siteUrl}/llms-full.txt`,
  `- RSS 2.0 Technical Feed: ${siteUrl}/rss.xml`,
  `- Canonical XML Sitemap: ${siteUrl}/sitemap.xml`,
  '',
  '## Technical Research & Architecture Studies',
  ...articles.map(article => `- [${article.title}](${siteUrl}/blog/${article.slug}) (${article.date}): ${article.excerpt}`),
  '',
].join('\n')

const llmsFull = [
  llmsSummary.trimEnd(),
  '',
  '## Complete Platform Route Directory',
  ...sitemapUrls.map(entry => `- ${entry.loc} (priority ${entry.priority}, ${entry.changefreq})`),
  '',
  '## MCP Tool Signatures (POST https://dreamex.tech/api/mcp)',
  '- `calculate_usl_scalability`: Computes Gunther Universal Scalability Law node ceiling N_max and Little’s Law DB connection pool.',
  '- `compile_gherkin_bdd`: Compiles business intent into deterministic Given/When/Then Gherkin scenarios with RTM IDs.',
  '- `forecast_monte_carlo_sprint`: Runs 2,000+ trial Monte Carlo velocity simulation returning P50, P85, and P95 sprint commitments.',
  '- `estimate_llm_token_economics`: Models 30-day LLM token cost, semantic cache savings %, and peak edge worker concurrency.',
  '',
].join('\n')

writeFileSync(join(root, 'public/llms.txt'), llmsSummary)
writeFileSync(join(root, 'public/llms-full.txt'), llmsFull)
console.log('AI agent manifest generation passed: public/llms.txt and public/llms-full.txt written.')
