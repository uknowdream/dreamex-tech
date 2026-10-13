import { useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Boxes, CheckCircle2, Download, FileJson2, FileText, Filter, Fingerprint, PackageCheck, Search, ShieldAlert, ShieldCheck, Upload, XCircle } from 'lucide-react'
import { useLanguage } from './i18n'

type Risk = 'critical' | 'high' | 'medium' | 'low' | 'review'
type ComponentRecord = { id: string; name: string; version: string; type: string; purl: string; license: string; supplier: string; hashes: string[]; vulnerabilities: string[]; risks: Risk[] }
type VulnerabilityRecord = { id: string; source: string; severity: Risk; description: string; affected: string[]; recommendation: string }
type Inventory = { source: string; format: 'CycloneDX' | 'SPDX'; importedAt: string; components: ComponentRecord[]; vulnerabilities: VulnerabilityRecord[] }
const MAX_BYTES = 10 * 1024 * 1024
const HISTORY_KEY = 'dreamex-supply-chain-history-v1'
const asObject = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const str = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const unique = (values: string[]) => [...new Set(values.filter(Boolean))]
function readLicense(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(readLicense).filter(Boolean).join(' OR ')
  const record = asObject(value)
  if (!record) return ''
  if (typeof record.expression === 'string') return record.expression
  const license = asObject(record.license)
  return str(license?.id) || str(license?.name) || str(record.id) || str(record.name)
}
function riskFromSeverity(value: unknown): Risk {
  const severity = str(value).toLowerCase()
  if (severity === 'critical' || severity === 'blocker') return 'critical'
  if (severity === 'high' || severity === 'important') return 'high'
  if (severity === 'medium' || severity === 'moderate' || severity === 'normal') return 'medium'
  if (severity === 'low' || severity === 'negligible') return 'low'
  return 'review'
}
function cyclonedxVulnerabilities(raw: unknown): VulnerabilityRecord[] {
  return arr(raw).flatMap((item, index) => {
    const record = asObject(item)
    if (!record) return []
    const id = str(record.id, 'UNIDENTIFIED-' + (index + 1))
    const ratings = arr(record.ratings).map(asObject).filter((value): value is Record<string, unknown> => value !== null)
    const rating = ratings.find(value => str(value.severity)) ?? ratings[0]
    const affected = arr(record.affects).map(value => str(asObject(value)?.ref)).filter(Boolean)
    const recommendation = str(record.recommendation) || arr(record.advisories).map(value => str(asObject(value)?.url)).filter(Boolean).join(', ')
    return [{ id, source: 'CycloneDX SBOM', severity: riskFromSeverity(rating?.severity), description: str(record.description) || 'No vulnerability description was supplied in the imported SBOM.', affected, recommendation }]
  })
}
function parseCycloneDX(root: Record<string, unknown>): Inventory {
  const components: ComponentRecord[] = []
  const visit = (raw: unknown, path: string) => {
    const component = asObject(raw)
    if (!component) return
    const name = str(component.name, 'Unnamed component')
    const version = str(component.version)
    const purl = str(component.purl)
    const license = readLicense(component.licenses) || 'UNKNOWN'
    const hashes = arr(component.hashes).map(value => str(asObject(value)?.alg) + ':' + str(asObject(value)?.content)).filter(value => value !== ':')
    const bomRef = str(component['bom-ref']) || purl || [name, version, path].join('@')
    const vulnerabilities = cyclonedxVulnerabilities(root.vulnerabilities).filter(vulnerability => vulnerability.affected.includes(bomRef)).map(vulnerability => vulnerability.id)
    const risks: Risk[] = []
    if (vulnerabilities.length) risks.push(...cyclonedxVulnerabilities(root.vulnerabilities).filter(vulnerability => vulnerabilities.includes(vulnerability.id)).map(vulnerability => vulnerability.severity))
    if (!version) risks.push('review')
    if (!purl) risks.push('review')
    if (!license || /^(unknown|noassertion|none|n\/a)$/i.test(license)) risks.push('review')
    components.push({ id: bomRef, name, version, type: str(component.type, 'library'), purl, license, supplier: str(asObject(component.supplier)?.name) || str(asObject(component.publisher)?.name), hashes, vulnerabilities, risks: unique(risks) as Risk[] })
    arr(component.components).forEach((child, index) => visit(child, path + '.' + index))
  }
  arr(root.components).forEach((component, index) => visit(component, String(index)))
  return { source: '', format: 'CycloneDX', importedAt: new Date().toISOString(), components, vulnerabilities: cyclonedxVulnerabilities(root.vulnerabilities) }
}
function parseSpdx(root: Record<string, unknown>): Inventory {
  const components: ComponentRecord[] = arr(root.packages).flatMap((raw, index) => {
    const item = asObject(raw)
    if (!item) return []
    const name = str(item.name, 'Unnamed package')
    const version = str(item.versionInfo)
    const concluded = str(item.licenseConcluded)
    const declared = str(item.licenseDeclared)
    const license = concluded && !/^(noassertion|none)$/i.test(concluded) ? concluded : declared || concluded || 'UNKNOWN'
    const refs = arr(item.externalRefs).map(asObject).filter((value): value is Record<string, unknown> => value !== null)
    const purl = str(refs.find(value => /purl/i.test(str(value.referenceType) + ' ' + str(value.referenceCategory)))?.referenceLocator)
    const hashes = arr(item.checksums).map(value => str(asObject(value)?.algorithm) + ':' + str(asObject(value)?.checksumValue)).filter(value => value !== ':')
    const risks: Risk[] = []
    if (!version || !purl || /^(unknown|noassertion|none|n\/a)$/i.test(license)) risks.push('review')
    return [{ id: str(item.SPDXID, name + ':' + index), name, version, type: 'package', purl, license, supplier: str(item.supplier) || str(item.originator), hashes, vulnerabilities: [], risks }]
  })
  return { source: '', format: 'SPDX', importedAt: new Date().toISOString(), components, vulnerabilities: [] }
}
function parseSbom(raw: string, source: string): Inventory {
  const value: unknown = JSON.parse(raw)
  const root = asObject(value)
  if (!root) throw new Error('The JSON root must be an object.')
  let inventory: Inventory
  if (str(root.bomFormat).toLowerCase() === 'cyclonedx' && Array.isArray(root.components)) inventory = parseCycloneDX(root)
  else if (str(root.spdxVersion).startsWith('SPDX-') && Array.isArray(root.packages)) inventory = parseSpdx(root)
  else throw new Error('Unsupported SBOM. Import a CycloneDX JSON BOM or SPDX JSON document.')
  if (!inventory.components.length) throw new Error('No software components were found in this SBOM.')
  inventory.source = source
  return inventory
}
function summarize(inventory: Inventory) {
  const components = inventory.components
  const licenses = new Map<string, number>()
  components.forEach(component => licenses.set(component.license, (licenses.get(component.license) ?? 0) + 1))
  return {
    total: components.length,
    licenses: licenses.size,
    unknownLicenses: components.filter(component => /^(unknown|noassertion|none|n\/a)$/i.test(component.license)).length,
    missingVersion: components.filter(component => !component.version).length,
    missingPurl: components.filter(component => !component.purl).length,
    vulnerableComponents: components.filter(component => component.vulnerabilities.length).length,
    findings: inventory.vulnerabilities.length,
    highCritical: inventory.vulnerabilities.filter(item => item.severity === 'high' || item.severity === 'critical').length,
  }
}
function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
const demo: Inventory = {
  source: 'Demo sample — not a real project SBOM', format: 'CycloneDX', importedAt: new Date().toISOString(),
  components: [
    { id: 'pkg:npm/react@19.1.0', name: 'react', version: '19.1.0', type: 'library', purl: 'pkg:npm/react@19.1.0', license: 'MIT', supplier: 'Meta', hashes: [], vulnerabilities: [], risks: [] },
    { id: 'pkg:npm/example-legacy@1.2.0', name: 'example-legacy', version: '1.2.0', type: 'library', purl: 'pkg:npm/example-legacy@1.2.0', license: 'UNKNOWN', supplier: '', hashes: [], vulnerabilities: ['DEMO-2026-0001'], risks: ['high', 'review'] },
    { id: 'pkg:npm/utility-kit', name: 'utility-kit', version: '', type: 'library', purl: '', license: 'NOASSERTION', supplier: '', hashes: [], vulnerabilities: [], risks: ['review'] },
    { id: 'pkg:npm/typescript@5.8.3', name: 'typescript', version: '5.8.3', type: 'library', purl: 'pkg:npm/typescript@5.8.3', license: 'Apache-2.0', supplier: 'Microsoft', hashes: [], vulnerabilities: [], risks: [] },
  ],
  vulnerabilities: [{ id: 'DEMO-2026-0001', source: 'Demo only', severity: 'high', description: 'Illustrative finding used to demonstrate SBOM triage. This is not a real vulnerability advisory.', affected: ['pkg:npm/example-legacy@1.2.0'], recommendation: 'Replace with the actual scanner finding and vendor advisory before acting.' }],
}

export function SupplyChainIntelligencePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | Risk>('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ source: string; format: string; importedAt: string; components: number; vulnerabilities: number }[]>(() => {
    try { const value: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]'); return Array.isArray(value) ? value.filter(item => { const row = asObject(item); return Boolean(row && typeof row.source === 'string' && typeof row.components === 'number') }).slice(0, 8) as { source: string; format: string; importedAt: string; components: number; vulnerabilities: number }[] : [] } catch { return [] }
  })
  const metrics = inventory ? summarize(inventory) : null
  const filtered = useMemo(() => (inventory?.components ?? []).filter(component => (riskFilter === 'all' || component.risks.includes(riskFilter) || component.vulnerabilities.length > 0 && ['high', 'critical'].includes(riskFilter)) && [component.name, component.version, component.purl, component.license, component.supplier, component.vulnerabilities.join(' ')].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [inventory, query, riskFilter])
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setNotice('')
    if (file.size > MAX_BYTES) { setError(en ? 'SBOM exceeds 10 MB. Split the inventory into smaller files.' : 'SBOM melebihi 10 MB. Pisahkan inventaris menjadi file lebih kecil.'); return }
    setLoading(true)
    try {
      const next = parseSbom(await file.text(), file.name)
      setInventory(next); setRiskFilter('all'); setQuery('')
      const summary = summarize(next)
      const row = { source: file.name, format: next.format, importedAt: next.importedAt, components: summary.total, vulnerabilities: summary.findings }
      const nextHistory = [row, ...history.filter(item => item.source !== row.source)].slice(0, 8)
      try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory)); setHistory(nextHistory) } catch { setNotice(en ? 'SBOM analyzed locally, but browser history could not be saved.' : 'SBOM dianalisis secara lokal, tetapi riwayat browser tidak dapat disimpan.') }
      if (!summary.findings) setNotice(en ? 'Inventory analyzed. No vulnerability records were included in this SBOM; this does not mean the dependencies are vulnerability-free.' : 'Inventaris dianalisis. SBOM ini tidak memuat data kerentanan; ini bukan berarti dependensi bebas kerentanan.')
      else setNotice(en ? 'SBOM analyzed locally. Vulnerability findings reflect only records present in the imported file.' : 'SBOM dianalisis secara lokal. Temuan kerentanan hanya mencerminkan data dalam file impor.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : (en ? 'Unable to analyze this SBOM.' : 'Tidak dapat menganalisis SBOM ini.')) }
    finally { setLoading(false) }
  }
  const loadDemo = () => { setInventory(demo); setQuery(''); setRiskFilter('all'); setError(''); setNotice(en ? 'Demo data only — not a real project inventory or vulnerability scan.' : 'Hanya data demo — bukan inventaris proyek atau pemindaian kerentanan nyata.') }
  const exportJson = () => { if (inventory) downloadFile('dreamex-sbom-inventory.json', JSON.stringify({ format: 'dreamex-sbom-analysis', version: 1, summary: metrics, inventory }, null, 2), 'application/json;charset=utf-8') }
  const exportCsv = () => {
    if (!inventory) return
    const rows = [['Name', 'Version', 'Type', 'Package URL', 'License', 'Supplier', 'Vulnerabilities', 'Review flags'], ...inventory.components.map(item => [item.name, item.version, item.type, item.purl, item.license, item.supplier, item.vulnerabilities.join('; '), item.risks.join('; ')])]
    downloadFile('dreamex-sbom-inventory.csv', '\uFEFF' + rows.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\r\n'), 'text/csv;charset=utf-8')
  }
  const exportMarkdown = () => { if (!inventory || !metrics) return; downloadFile('dreamex-sbom-review.md', ['# Software Supply Chain Review', '', '- Source: ' + inventory.source, '- Format: ' + inventory.format, '- Imported: ' + inventory.importedAt, '- Components: ' + metrics.total, '- Distinct license labels: ' + metrics.licenses, '- Vulnerability records included: ' + metrics.findings, '- High/critical records: ' + metrics.highCritical, '- Missing version: ' + metrics.missingVersion, '- Missing package URL: ' + metrics.missingPurl, '', '## Components for review', ...inventory.components.filter(item => item.risks.length || item.vulnerabilities.length).map(item => '- **' + item.name + (item.version ? '@' + item.version : '') + '** — ' + [...item.risks, ...item.vulnerabilities].join(', ')), '', '_Local SBOM analysis only. This is not a vulnerability scan, license opinion, or proof of software safety._'].join('\n'), 'text/markdown;charset=utf-8') }
  const clearHistory = () => { try { window.localStorage.removeItem(HISTORY_KEY); setHistory([]); setNotice(en ? 'Local history cleared.' : 'Riwayat lokal dihapus.') } catch { setNotice(en ? 'Unable to clear local history.' : 'Tidak dapat menghapus riwayat lokal.') } }

  return <main id="main-content" className="container supply-chain-page">
    <header className="supply-chain-hero"><div><span className="section-kicker"><Boxes size={14}/> SOFTWARE SUPPLY CHAIN / SBOM INTELLIGENCE</span><h1>{en ? <>Know what ships. <span>Prove the inventory.</span></> : <>Ketahui yang dirilis. <span>Buktikan inventarisnya.</span></>}</h1><p>{en ? 'Import CycloneDX or SPDX software bills of materials to inspect dependency inventory, license metadata, package identifiers, hashes, and vulnerability records supplied by the SBOM.' : 'Impor software bill of materials CycloneDX atau SPDX untuk meninjau inventaris dependensi, metadata lisensi, identitas paket, hash, dan data kerentanan yang disertakan dalam SBOM.'}</p><div className="supply-chain-trust"><ShieldCheck size={15}/>{en ? 'Browser-local analysis · no upload · 10 MB file limit' : 'Analisis lokal browser · tanpa unggah · batas file 10 MB'}</div></div><div className="supply-chain-import"><span className="supply-chain-import-icon"><Upload size={20}/></span><strong>{en ? 'Import an SBOM' : 'Impor SBOM'}</strong><p>CycloneDX JSON · SPDX JSON</p><label className="button button-primary supply-chain-file"><Upload size={15}/>{loading ? (en ? 'Analyzing…' : 'Menganalisis…') : (en ? 'Choose SBOM file' : 'Pilih file SBOM')}<input type="file" accept=".json,application/json" aria-label={en ? 'Choose CycloneDX or SPDX JSON SBOM' : 'Pilih SBOM JSON CycloneDX atau SPDX'} disabled={loading} onChange={event => void importFile(event)}/></label><button className="button button-secondary" type="button" onClick={loadDemo}><PackageCheck size={15}/>{en ? 'Explore demo inventory' : 'Lihat inventaris demo'}</button></div></header>
    {error && <p className="supply-chain-alert" role="alert"><AlertTriangle size={16}/>{error}</p>}{notice && <p className="supply-chain-notice" role="status">{notice}</p>}
    {inventory && metrics ? <><section className="supply-chain-summary"><div className="supply-chain-heading"><div><span className="section-kicker">{en ? 'IMPORTED INVENTORY' : 'INVENTARIS IMPOR'}</span><h2>{inventory.source}</h2><p>{inventory.format} · {metrics.total} {en ? 'components' : 'komponen'} · {new Date(inventory.importedAt).toLocaleString(en ? 'en-US' : 'id-ID')}</p></div><div className="supply-chain-exports"><button className="button button-secondary" onClick={exportJson}><FileJson2 size={15}/> JSON</button><button className="button button-secondary" onClick={exportCsv}><Download size={15}/> CSV</button><button className="button button-secondary" onClick={exportMarkdown}><FileText size={15}/> Markdown</button></div></div><div className="supply-chain-metrics"><article><span><Boxes size={16}/>{en ? 'Components' : 'Komponen'}</span><strong>{metrics.total}</strong><small>{en ? 'Inventory entries' : 'Entri inventaris'}</small></article><article><span><Fingerprint size={16}/>{en ? 'License labels' : 'Label lisensi'}</span><strong>{metrics.licenses}</strong><small>{en ? 'Distinct labels, not legal advice' : 'Label berbeda, bukan nasihat hukum'}</small></article><article><span><ShieldAlert size={16}/>{en ? 'Vulnerability records' : 'Data kerentanan'}</span><strong>{metrics.findings}</strong><small>{en ? 'Included in this SBOM' : 'Termasuk dalam SBOM ini'}</small></article><article><span><AlertTriangle size={16}/>{en ? 'High / critical' : 'Tinggi / kritis'}</span><strong>{metrics.highCritical}</strong><small>{en ? 'Based on imported ratings' : 'Berdasarkan rating impor'}</small></article><article><span><CheckCircle2 size={16}/>{en ? 'Needs metadata review' : 'Perlu tinjau metadata'}</span><strong>{inventory.components.filter(item => item.risks.includes('review')).length}</strong><small>{en ? 'Missing or unknown fields' : 'Field hilang atau tidak diketahui'}</small></article></div></section>
    <section className="supply-chain-components"><div className="supply-chain-section-head"><div><span className="section-kicker">{en ? 'DEPENDENCY INVENTORY' : 'INVENTARIS DEPENDENSI'}</span><h2>{en ? 'Component-level evidence' : 'Bukti per komponen'}</h2><p>{en ? 'Filter by review signal and search names, package URLs, licenses, or vulnerability IDs.' : 'Filter sinyal review dan cari nama, URL paket, lisensi, atau ID kerentanan.'}</p></div><span>{filtered.length} / {inventory.components.length}</span></div><div className="supply-chain-filters"><label><Filter size={15}/><select aria-label={en ? 'Filter components by risk' : 'Filter komponen berdasarkan risiko'} value={riskFilter} onChange={event => setRiskFilter(event.target.value as typeof riskFilter)}><option value="all">{en ? 'All components' : 'Semua komponen'}</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="review">{en ? 'Needs review' : 'Perlu tinjau'}</option></select></label><label className="supply-chain-search"><Search size={15}/><input type="search" aria-label={en ? 'Search SBOM components' : 'Cari komponen SBOM'} placeholder={en ? 'Search name, version, license, purl…' : 'Cari nama, versi, lisensi, purl…'} value={query} onChange={event => setQuery(event.target.value)}/></label></div><div className="supply-chain-table-wrap"><table className="supply-chain-table"><thead><tr><th>{en ? 'Component' : 'Komponen'}</th><th>{en ? 'License' : 'Lisensi'}</th><th>{en ? 'Review signals' : 'Sinyal review'}</th></tr></thead><tbody>{filtered.map(component => <tr key={component.id}><td><strong>{component.name}</strong><small>{component.version || (en ? 'Version missing' : 'Versi tidak tersedia')} · {component.type}</small>{component.purl && <code>{component.purl}</code>}{component.supplier && <small>{en ? 'Supplier: ' : 'Pemasok: '}{component.supplier}</small>}{component.hashes.map(hash => <small key={hash}>{hash}</small>)}</td><td>{component.license}</td><td><div className="supply-chain-badges">{component.vulnerabilities.map(id => <span key={id} className="supply-chain-risk risk-high">{id}</span>)}{component.risks.map((risk,index) => <span key={risk+index} className={'supply-chain-risk risk-'+risk}>{risk==='review' ? (en ? 'Review metadata' : 'Tinjau metadata') : risk}</span>)}{!component.risks.length && !component.vulnerabilities.length && <span className="supply-chain-clean"><CheckCircle2 size={13}/>{en ? 'No imported flags' : 'Tidak ada flag impor'}</span>}</div></td></tr>)}</tbody></table>{filtered.length===0&&<p className="supply-chain-empty">{en ? 'No components match this filter.' : 'Tidak ada komponen yang cocok dengan filter.'}</p>}</div></section>
    {inventory.vulnerabilities.length>0&&<section className="supply-chain-vulnerabilities"><div className="supply-chain-section-head"><div><span className="section-kicker">{en ? 'IMPORTED FINDINGS' : 'TEMUAN IMPOR'}</span><h2>{en ? 'Vulnerability records' : 'Data kerentanan'}</h2><p>{en ? 'Only vulnerabilities present in the imported CycloneDX file are displayed.' : 'Hanya data kerentanan yang ada dalam file CycloneDX impor yang ditampilkan.'}</p></div></div><div className="supply-chain-vuln-list">{inventory.vulnerabilities.map(vulnerability=><article key={vulnerability.id}><div><span className={'supply-chain-risk risk-'+vulnerability.severity}>{vulnerability.severity}</span><h3>{vulnerability.id}</h3></div><p>{vulnerability.description}</p>{vulnerability.affected.length>0&&<small>{en ? 'Affected refs: ' : 'Referensi terdampak: '}{vulnerability.affected.join(', ')}</small>}{vulnerability.recommendation&&<small>{en ? 'Advisory / recommendation: ' : 'Advisori / rekomendasi: '}{vulnerability.recommendation}</small>}</article>)}</div></section>}</> : <section className="supply-chain-empty-state"><div><Boxes size={26}/><h2>{en ? 'Start with an SBOM, not a guess' : 'Mulai dari SBOM, bukan tebakan'}</h2><p>{en ? 'Import a real CycloneDX or SPDX JSON file, or open the clearly labeled demo inventory.' : 'Impor file JSON CycloneDX atau SPDX nyata, atau buka inventaris demo yang diberi label jelas.'}</p></div><div><span><CheckCircle2 size={15}/>{en ? 'Component and license inventory' : 'Inventaris komponen dan lisensi'}</span><span><Fingerprint size={15}/>{en ? 'Package URLs and available hashes' : 'Package URL dan hash yang tersedia'}</span><span><ShieldAlert size={15}/>{en ? 'Vulnerability records included in the SBOM' : 'Data kerentanan yang disertakan dalam SBOM'}</span><span><Download size={15}/>{en ? 'Portable JSON, CSV, and Markdown evidence' : 'Bukti portabel JSON, CSV, dan Markdown'}</span></div></section>}
    {history.length>0&&<section className="supply-chain-history"><div className="supply-chain-section-head"><div><span className="section-kicker">{en ? 'LOCAL HISTORY' : 'RIWAYAT LOKAL'}</span><h2>{en ? 'Recent SBOM snapshots' : 'Snapshot SBOM terbaru'}</h2><p>{en ? 'Summary only. Raw component inventories are not stored in browser history.' : 'Hanya ringkasan. Inventaris komponen mentah tidak disimpan dalam riwayat browser.'}</p></div><button className="button button-secondary" onClick={clearHistory}><XCircle size={15}/>{en ? 'Clear history' : 'Hapus riwayat'}</button></div><div className="supply-chain-history-list">{history.map((item,index)=><article key={item.source+item.importedAt+index}><div><strong>{item.source}</strong><small>{item.format} · {new Date(item.importedAt).toLocaleString(en ? 'en-US' : 'id-ID')}</small></div><strong>{item.components}</strong><span>{item.vulnerabilities} {en ? 'vulnerability records' : 'data kerentanan'}</span></article>)}</div></section>}
    <p className="supply-chain-disclaimer"><ShieldCheck size={15}/>{en ? 'This tool parses only the SBOM you provide. It does not query vulnerability databases, validate license obligations, or certify supply-chain security. No imported file content is uploaded.' : 'Tool ini hanya mem-parsing SBOM yang Anda berikan. Tool tidak mengakses database kerentanan, memvalidasi kewajiban lisensi, atau mensertifikasi keamanan supply chain. Isi file impor tidak diunggah.'}</p>
  </main>
}
