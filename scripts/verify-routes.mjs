import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const appSource = readFileSync('src/App.tsx', 'utf8')
const declaredRoutes = [...appSource.matchAll(/<Route\b[^>]*\bpath=["']([^"']+)["']/g)]
  .map(match => match[1])
const concreteRoutes = declaredRoutes.filter(route => route !== '*')

function normalizePath(value) {
  const pathname = value.split(/[?#]/, 1)[0] || '/'
  if (!pathname.startsWith('/')) return null
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
}

function routeMatches(destination) {
  const target = normalizePath(destination)
  if (target === null) return false
  const targetParts = target.split('/').filter(Boolean)
  return concreteRoutes.some(route => {
    const pattern = normalizePath(route)
    if (pattern === null) return false
    if (pattern === target) return true
    const routeParts = pattern.split('/').filter(Boolean)
    return routeParts.length === targetParts.length &&
      routeParts.every((part, index) => part.startsWith(':') || part === targetParts[index])
  })
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.isFile() && path.endsWith('.tsx') ? [path] : []
  })
}

const errors = []
if (!concreteRoutes.includes('/')) errors.push('App.tsx must declare the home route (path="/").')
if (!declaredRoutes.includes('*')) errors.push('App.tsx must retain an explicit not-found route (path="*").')
if (new Set(concreteRoutes).size !== concreteRoutes.length) errors.push('Duplicate concrete route declarations were found.')

const linkPattern = /\bto\s*=\s*["']([^"']+)["']/g
const checkedLinks = []
for (const file of sourceFiles('src')) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(linkPattern)) {
    const raw = match[1]
    if (!raw.startsWith('/') || raw.includes('${')) continue
    const destination = normalizePath(raw)
    if (!destination) continue
    checkedLinks.push({ file, destination })
    if (!routeMatches(destination)) errors.push(`${file}: internal destination "${destination}" has no matching <Route> declaration.`)
  }
}

if (errors.length) {
  console.error('Internal route inventory verification failed:')
  for (const error of [...new Set(errors)]) console.error(' - ' + error)
  process.exit(1)
}

console.log(`Internal route inventory passed: ${concreteRoutes.length} concrete route patterns, ${checkedLinks.length} static internal destinations verified.`)
