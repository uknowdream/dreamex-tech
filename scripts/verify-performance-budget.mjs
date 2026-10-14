import { existsSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve, sep } from 'node:path'

const dist = resolve('dist')
const indexPath = join(dist, 'index.html')
if (!existsSync(indexPath)) {
  console.error('Performance budget verification failed: dist/index.html is missing. Run the production build first.')
  process.exit(1)
}
const html = readFileSync(indexPath, 'utf8')
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g)].map(match => match[1])
const styles = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+\.css)["'][^>]*>/g)].map(match => match[1])
const errors = []
function measure(assets, label) {
  if (!assets.length) {
    errors.push('No initial ' + label + ' asset was found in dist/index.html.')
    return { raw: 0, gzip: 0 }
  }
  return assets.reduce((total, asset) => {
    const path = resolve(dist, asset.replace(/^\/+/, ''))
    if (path !== dist && !path.startsWith(dist + sep)) {
      errors.push('Unsafe build asset path: ' + asset)
      return total
    }
    if (!existsSync(path) || !statSync(path).isFile()) {
      errors.push('Missing initial build asset: ' + asset)
      return total
    }
    const buffer = readFileSync(path)
    return { raw: total.raw + buffer.byteLength, gzip: total.gzip + gzipSync(buffer).byteLength }
  }, { raw: 0, gzip: 0 })
}
const js = measure(scripts, 'JavaScript')
const css = measure(styles, 'CSS')
const jsBudget = 160 * 1024
const cssBudget = 50 * 1024
console.log('Initial asset baseline (raw / gzip):')
console.log('  JavaScript: ' + (js.raw / 1024).toFixed(1) + ' / ' + (js.gzip / 1024).toFixed(1) + ' KiB (budget ' + (jsBudget / 1024) + ' KiB gzip)')
console.log('  CSS:        ' + (css.raw / 1024).toFixed(1) + ' / ' + (css.gzip / 1024).toFixed(1) + ' KiB (budget ' + (cssBudget / 1024) + ' KiB gzip)')
if (js.gzip > jsBudget) errors.push('Initial JavaScript exceeds the 160 KiB gzip budget. Lazy-load route-level tools or reduce entry imports.')
if (css.gzip > cssBudget) errors.push('Initial CSS exceeds the 50 KiB gzip budget. Reduce global styles or split non-critical route styles.')
if (errors.length) {
  console.error('\nPerformance budget verification failed:')
  for (const error of errors) console.error(' - ' + error)
  process.exit(1)
}
console.log('Performance budget verification passed.')
