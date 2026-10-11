import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const errors = []
const read = path => readFileSync(join(root, path), 'utf8')
const articles = read('src/articles.ts')
const translations = read('src/articleTranslations.ts')
const i18n = read('src/i18n.tsx')
const app = read('src/App.tsx')
const main = read('src/main.tsx')

const articleSlugs = [...articles.matchAll(/slug:\s*'([^']+)'/g)].map(match => match[1])
const translationSlugs = [...translations.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(match => match[1])

for (const slug of articleSlugs) {
  if (!translationSlugs.includes(slug)) errors.push(`Missing English article translation: ${slug}`)
}
for (const slug of translationSlugs) {
  if (!articleSlugs.includes(slug)) errors.push(`Translation references unknown article: ${slug}`)
}

const idBlock = i18n.match(/\bid:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*en:\s*\{/)
const enBlock = i18n.match(/\ben:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*\}/)
if (!idBlock || !enBlock) {
  errors.push('Could not parse Indonesian and English message dictionaries')
} else {
  const keys = block => [...block.matchAll(/^\s*([A-Za-z]\w*):/gm)].map(match => match[1]).sort()
  const idKeys = keys(idBlock[1])
  const enKeys = keys(enBlock[1])
  for (const key of idKeys) if (!enKeys.includes(key)) errors.push(`English dictionary missing key: ${key}`)
  for (const key of enKeys) if (!idKeys.includes(key)) errors.push(`Indonesian dictionary missing key: ${key}`)
}

if (!main.includes('<LanguageProvider>') || !main.includes('</LanguageProvider>')) {
  errors.push('Application root is not wrapped in LanguageProvider')
}
if (!i18n.includes('document.documentElement.lang = language')) {
  errors.push('Document language attribute is not synchronized with the selected language')
}
if (!app.includes('articleTranslations[article.slug]')) {
  errors.push('Article UI is not connected to the article translation dictionary')
}

if (errors.length) {
  console.error('Bilingual verification failed:')
  for (const error of errors) console.error(` - ${error}`)
  process.exitCode = 1
} else {
  console.log(`Bilingual verification passed: ${articleSlugs.length} article translations, matching ID/EN message keys, provider wiring, and document language.`)
}
