import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, AlertTriangle, ArrowDownToLine, Boxes, CheckCircle2, Copy, FileCode2, GitCompare, Network, Plus, Search, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useLanguage } from './i18n'

type Service = {
  id: string
  name: string
  kind: string
  owner: string
  repo: string
  environment: string
  criticality: string
  description: string
  tags: string[]
  source: 'sample' | 'custom' | 'imported'
  updatedAt: string
}
type Operation = {
  key: string
  method: string
  path: string
  summary: string
  operationId: string
  responses: string[]
  parameters: string[]
  requiredParameters: string[]
  requestBody: boolean
  secured: boolean
}
type Finding = { severity: 'high' | 'medium' | 'low'; message: string }
type ContractAnalysis = {
  title: string
  version: string
  servers: string[]
  schemas: string[]
  operations: Operation[]
  findings: Finding[]
}
const CATALOG_KEY = 'dreamex-engineering-catalog-v1'
const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']
const sampleCatalog: Service[] = [
  { id: 'sample-web', name: 'Customer Web', kind: 'Web application', owner: 'Product Engineering', repo: 'uknowdream/customer-web', environment: 'Production', criticality: 'High', description: 'Customer-facing web experience and authenticated journeys.', tags: ['react', 'frontend'], source: 'sample', updatedAt: 'Example data' },
  { id: 'sample-api', name: 'Commerce API', kind: 'API service', owner: 'Platform Engineering', repo: 'uknowdream/commerce-api', environment: 'Staging', criticality: 'High', description: 'Example REST API for orders, catalog, and customer workflows.', tags: ['rest', 'openapi'], source: 'sample', updatedAt: 'Example data' },
  { id: 'sample-docs', name: 'Engineering Docs', kind: 'Documentation', owner: 'Developer Experience', repo: 'uknowdream/engineering-docs', environment: 'Production', criticality: 'Medium', description: 'Example documentation service and engineering knowledge base.', tags: ['docs', 'knowledge'], source: 'sample', updatedAt: 'Example data' },
]
const demoSpec = {
  openapi: '3.0.3',
  info: { title: 'Commerce API', version: '1.2.0', description: 'Example contract for order workflows.' },
  servers: [{ url: 'https://api.example.com/v1' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    schemas: { Order: { type: 'object', required: ['id', 'status'], properties: { id: { type: 'string' }, status: { type: 'string' } } } },
  },
  paths: {
    '/orders': {
      get: { summary: 'List orders', operationId: 'listOrders', tags: ['Orders'], responses: { '200': { description: 'Orders returned' } } },
      post: { summary: 'Create an order', operationId: 'createOrder', tags: ['Orders'], requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/Order' } } } }, responses: { '201': { description: 'Order created' }, '400': { description: 'Invalid order' } } },
    },
    '/orders/{orderId}': {
      get: { summary: 'Get order details', operationId: 'getOrder', parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Order details' }, '404': { description: 'Order not found' } } },
    },
  },
}
function readCatalog(): Service[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CATALOG_KEY) ?? 'null')
    if (Array.isArray(value)) return value.filter((item): item is Service => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.kind === 'string'))
  } catch { /* Storage can be unavailable in private or restricted browser contexts. */ }
  return sampleCatalog
}
function saveCatalog(value: Service[]) {
  try { window.localStorage.setItem(CATALOG_KEY, JSON.stringify(value)); return true } catch { return false }
}
function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
function parseContract(raw: string): ContractAnalysis {
  const doc: unknown = JSON.parse(raw)
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('The contract must be a JSON object.')
  const root = doc as Record<string, unknown>
  if (typeof root.openapi !== 'string' || !root.openapi.startsWith('3.')) throw new Error('Only OpenAPI 3.x JSON contracts are supported in this version.')
  const info = root.info && typeof root.info === 'object' ? root.info as Record<string, unknown> : {}
  const paths = root.paths && typeof root.paths === 'object' && !Array.isArray(root.paths) ? root.paths as Record<string, unknown> : null
  if (!paths) throw new Error('The contract must contain a valid paths object.')
  const security = root.security
  const rootSecured = Array.isArray(security) && security.length > 0
  const operations: Operation[] = []
  const findings: Finding[] = []
  Object.entries(paths).forEach(([path, pathValue]) => {
    if (!pathValue || typeof pathValue !== 'object' || Array.isArray(pathValue)) return
    const pathItem = pathValue as Record<string, unknown>
    methods.forEach(method => {
      const value = pathItem[method]
      if (!value || typeof value !== 'object' || Array.isArray(value)) return
      const op = value as Record<string, unknown>
      const parameters = [...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []), ...(Array.isArray(op.parameters) ? op.parameters : [])]
      const parameterNames = parameters.flatMap(parameter => parameter && typeof parameter === 'object' && !Array.isArray(parameter) && typeof (parameter as Record<string, unknown>).name === 'string' ? [(parameter as Record<string, unknown>).name as string] : [])
      const requiredParameters = parameters.flatMap(parameter => {
        if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) return []
        const item = parameter as Record<string, unknown>
        return item.required === true && typeof item.name === 'string' ? [item.name] : []
      })
      const responses = op.responses && typeof op.responses === 'object' && !Array.isArray(op.responses) ? Object.keys(op.responses as Record<string, unknown>) : []
      const secured = Array.isArray(op.security) ? op.security.length > 0 : rootSecured
      const key = method.toUpperCase() + ' ' + path
      operations.push({ key, method: method.toUpperCase(), path, summary: typeof op.summary === 'string' ? op.summary : '', operationId: typeof op.operationId === 'string' ? op.operationId : '', responses, parameters: parameterNames, requiredParameters, requestBody: Boolean(op.requestBody), secured })
      if (!op.summary && !op.description) findings.push({ severity: 'low', message: key + ' has no summary or description.' })
      if (!op.operationId) findings.push({ severity: 'low', message: key + ' has no operationId; generated clients may be harder to maintain.' })
      if (responses.length === 0) findings.push({ severity: 'high', message: key + ' has no documented responses.' })
      if (path.includes('{') && ![...path.matchAll(/\{([^}]+)\}/g)].every(match => parameterNames.includes(match[1]))) findings.push({ severity: 'high', message: key + ' has a path template parameter without a matching parameter declaration.' })
      if (!secured) findings.push({ severity: 'medium', message: key + ' does not declare a security requirement; confirm that public access is intentional.' })
    })
  })
  if (operations.length === 0) findings.push({ severity: 'high', message: 'No supported HTTP operations were found under paths.' })
  if (!Array.isArray(root.servers) || root.servers.length === 0) findings.push({ severity: 'medium', message: 'No server URL is declared in the contract.' })
  if (!root.components || typeof root.components !== 'object' || !('securitySchemes' in (root.components as Record<string, unknown>))) findings.push({ severity: 'low', message: 'No reusable securitySchemes are declared in components.' })
  const servers = Array.isArray(root.servers) ? root.servers.flatMap(item => item && typeof item === 'object' && typeof (item as Record<string, unknown>).url === 'string' ? [(item as Record<string, unknown>).url as string] : []) : []
  const components = root.components && typeof root.components === 'object' ? root.components as Record<string, unknown> : {}
  const schemas = components.schemas && typeof components.schemas === 'object' ? Object.keys(components.schemas as Record<string, unknown>) : []
  return { title: typeof info.title === 'string' ? info.title : 'Untitled API', version: typeof info.version === 'string' ? info.version : 'Unversioned', servers, schemas, operations, findings }
}
function compareContracts(baseline: ContractAnalysis, current: ContractAnalysis): Finding[] {
  const findings: Finding[] = []
  const currentKeys = new Set(current.operations.map(operation => operation.key))
  const baselineKeys = new Set(baseline.operations.map(operation => operation.key))
  baseline.operations.filter(operation => !currentKeys.has(operation.key)).forEach(operation => findings.push({ severity: 'high', message: 'Potential breaking change: removed operation ' + operation.key + '.' }))
  current.operations.filter(operation => !baselineKeys.has(operation.key)).forEach(operation => findings.push({ severity: 'low', message: 'New operation added: ' + operation.key + '.' }))
  baseline.operations.filter(operation => currentKeys.has(operation.key)).forEach(previous => {
    const next = current.operations.find(operation => operation.key === previous.key)
    if (!next) return
    next.requiredParameters.filter(name => !previous.requiredParameters.includes(name)).forEach(name => findings.push({ severity: 'high', message: 'Potential breaking change: ' + previous.key + ' adds required parameter "' + name + '".' }))
    previous.responses.filter(code => !next.responses.includes(code)).forEach(code => findings.push({ severity: 'medium', message: 'Response code ' + code + ' was removed from ' + previous.key + '.' }))
  })
  if (findings.length === 0) findings.push({ severity: 'low', message: 'No operation removals, newly required parameters, or response-code removals were detected by this basic comparison.' })
  return findings
}
export function EngineeringIntelligencePage() {
  const { language } = useLanguage()
  const en = language === 'en'
  useEffect(() => {
    document.title = en ? 'Engineering Intelligence — DreamEx Tech' : 'Engineering Intelligence — DreamEx Tech'
    return () => { document.title = 'DreamEx Tech — Engineering, AI & QA' }
  }, [en])
  const [tab, setTab] = useState<'catalog' | 'contracts'>('catalog')
  const [catalog, setCatalog] = useState<Service[]>(readCatalog)
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('All')
  const [serviceName, setServiceName] = useState('')
  const [serviceKind, setServiceKind] = useState('API service')
  const [serviceOwner, setServiceOwner] = useState('')
  const [serviceRepo, setServiceRepo] = useState('')
  const [serviceEnvironment, setServiceEnvironment] = useState('Development')
  const [serviceCriticality, setServiceCriticality] = useState('Medium')
  const [serviceDescription, setServiceDescription] = useState('')
  const [importText, setImportText] = useState('')
  const [contractText, setContractText] = useState('')
  const [baselineText, setBaselineText] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const filteredCatalog = useMemo(() => catalog.filter(item => [item.name, item.kind, item.owner, item.repo, item.description, ...item.tags].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && (kindFilter === 'All' || item.kind === kindFilter)), [catalog, query, kindFilter])
  const catalogStats = useMemo(() => ({ total: catalog.length, critical: catalog.filter(item => item.criticality === 'High' || item.criticality === 'Critical').length, production: catalog.filter(item => item.environment.toLowerCase() === 'production').length, examples: catalog.filter(item => item.source === 'sample').length }), [catalog])
  const contract = useMemo(() => {
    if (!contractText.trim()) return { analysis: null as ContractAnalysis | null, error: '' }
    try { return { analysis: parseContract(contractText), error: '' } } catch (value) { return { analysis: null, error: value instanceof Error ? value.message : 'Unable to parse this contract.' } }
  }, [contractText])
  const baseline = useMemo(() => {
    if (!baselineText.trim()) return { analysis: null as ContractAnalysis | null, error: '' }
    try { return { analysis: parseContract(baselineText), error: '' } } catch (value) { return { analysis: null, error: value instanceof Error ? value.message : 'Unable to parse the baseline contract.' } }
  }, [baselineText])
  const diff = useMemo(() => contract.analysis && baseline.analysis ? compareContracts(baseline.analysis, contract.analysis) : [], [contract.analysis, baseline.analysis])
  const updateCatalog = (next: Service[], message: string) => {
    setCatalog(next)
    setNotice(saveCatalog(next) ? message : (en ? 'Updated for this session, but browser storage is unavailable.' : 'Diperbarui untuk sesi ini, tetapi penyimpanan browser tidak tersedia.'))
    setError('')
  }
  const addService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!serviceName.trim()) { setError(en ? 'A service name is required.' : 'Nama service wajib diisi.'); return }
    const item: Service = { id: 'svc-' + Date.now().toString(36), name: serviceName.trim(), kind: serviceKind, owner: serviceOwner.trim() || (en ? 'Unassigned' : 'Belum ditentukan'), repo: serviceRepo.trim(), environment: serviceEnvironment, criticality: serviceCriticality, description: serviceDescription.trim(), tags: [], source: 'custom', updatedAt: new Date().toISOString() }
    updateCatalog([item, ...catalog], en ? 'Service added to the local catalog.' : 'Service ditambahkan ke katalog lokal.')
    setServiceName(''); setServiceOwner(''); setServiceRepo(''); setServiceDescription('')
  }
  const importCatalog = () => {
    try {
      const value: unknown = JSON.parse(importText)
      const raw = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).items) ? (value as { items: unknown[] }).items : null
      if (!raw) throw new Error(en ? 'Use a JSON array or an object containing an items array.' : 'Gunakan array JSON atau objek yang memiliki array items.')
      const imported = raw.flatMap((item, index): Service[] => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const record = item as Record<string, unknown>
        if (typeof record.name !== 'string' || !record.name.trim()) return []
        return [{ id: typeof record.id === 'string' ? record.id : 'import-' + Date.now().toString(36) + '-' + index, name: record.name.trim(), kind: typeof record.kind === 'string' ? record.kind : 'Unknown service', owner: typeof record.owner === 'string' ? record.owner : 'Unassigned', repo: typeof record.repo === 'string' ? record.repo : '', environment: typeof record.environment === 'string' ? record.environment : 'Unknown', criticality: typeof record.criticality === 'string' ? record.criticality : 'Medium', description: typeof record.description === 'string' ? record.description : '', tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20) : [], source: 'imported', updatedAt: new Date().toISOString() }]
      })
      if (!imported.length) throw new Error(en ? 'No valid services were found. Each item needs a name.' : 'Tidak ada service valid. Setiap item harus memiliki name.')
      updateCatalog([...imported, ...catalog.filter(existing => !imported.some(item => item.name.toLowerCase() === existing.name.toLowerCase()))], en ? imported.length + ' service(s) imported.' : imported.length + ' service berhasil diimpor.')
      setImportText('')
    } catch (value) { setError(value instanceof Error ? value.message : 'Invalid JSON.') }
  }
  const loadDemo = () => { setContractText(JSON.stringify(demoSpec, null, 2)); setBaselineText(''); setNotice(en ? 'Example OpenAPI contract loaded. It is sample data, not a live service.' : 'Contoh kontrak OpenAPI dimuat. Ini data contoh, bukan service live.'); setError('') }
  const exportContractReport = () => {
    if (!contract.analysis) return
    const report = ['# API Contract Review', '', '- API: ' + contract.analysis.title, '- Version: ' + contract.analysis.version, '- Servers: ' + (contract.analysis.servers.join(', ') || 'Not declared'), '- Operations: ' + contract.analysis.operations.length, '- Schemas: ' + contract.analysis.schemas.length, '', '## Findings', ...(contract.analysis.findings.length ? contract.analysis.findings.map(item => '- [' + item.severity.toUpperCase() + '] ' + item.message) : ['- No findings detected.']), '', ...(baseline.analysis ? ['## Contract comparison', ...diff.map(item => '- [' + item.severity.toUpperCase() + '] ' + item.message)] : []), '', 'Scope: static inspection of the provided OpenAPI JSON only. This does not call the API, prove authorization, or replace a full contract test suite.'].join('\n')
    downloadText('dreamex-api-contract-review.md', report, 'text/markdown;charset=utf-8')
    setNotice(en ? 'Contract review exported.' : 'Tinjauan kontrak berhasil diekspor.')
  }
  const exportCatalog = () => downloadText('dreamex-service-catalog.json', JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), items: catalog }, null, 2), 'application/json;charset=utf-8')
  const resetSamples = () => { updateCatalog(sampleCatalog, en ? 'Example catalog restored.' : 'Katalog contoh dipulihkan.') }
  const removeService = (id: string) => updateCatalog(catalog.filter(item => item.id !== id), en ? 'Service removed from this browser catalog.' : 'Service dihapus dari katalog browser ini.')
  const copyReport = async () => {
    if (!contract.analysis) return
    try { await navigator.clipboard.writeText(contract.analysis.findings.map(item => '[' + item.severity.toUpperCase() + '] ' + item.message).join('\n')); setNotice(en ? 'Findings copied.' : 'Temuan berhasil disalin.') } catch { setError(en ? 'Clipboard access is unavailable in this browser.' : 'Akses clipboard tidak tersedia di browser ini.') }
  }
  return <main id="main-content" className="container intelligence-page">
    <header className="intelligence-hero">
      <span className="section-kicker"><Network size={14}/> DREAMEX ENGINEERING / INTELLIGENCE</span>
      <h1>{en ? <>Engineering <span>Intelligence.</span></> : <>Engineering <span>Intelligence.</span></>}</h1>
      <p>{en ? 'A local-first engineering catalog and API contract workbench. Map your software estate, inspect OpenAPI contracts, and catch potential breaking changes before release.' : 'Katalog engineering lokal dan workbench kontrak API. Petakan aset software, periksa kontrak OpenAPI, dan deteksi potensi breaking change sebelum rilis.'}</p>
      <div className="intelligence-principles"><span><ShieldCheck size={15}/>{en ? 'Local-first data' : 'Data lokal'}</span><span><GitCompare size={15}/>{en ? 'Contract diff' : 'Perbandingan kontrak'}</span><span><Activity size={15}/>{en ? 'Evidence over guesswork' : 'Bukti, bukan asumsi'}</span></div>
    </header>
    <section className="intelligence-overview" aria-label={en ? 'Engineering inventory summary' : 'Ringkasan inventaris engineering'}>
      <div className="intelligence-stat"><span>{en ? 'CATALOG ITEMS' : 'ITEM KATALOG'}</span><strong>{catalogStats.total}</strong><small>{en ? 'Services and systems' : 'Service dan sistem'}</small></div>
      <div className="intelligence-stat"><span>{en ? 'HIGH CRITICALITY' : 'KRITIKALITAS TINGGI'}</span><strong>{catalogStats.critical}</strong><small>{en ? 'Requires closer review' : 'Perlu tinjauan lebih ketat'}</small></div>
      <div className="intelligence-stat"><span>{en ? 'PRODUCTION' : 'PRODUKSI'}</span><strong>{catalogStats.production}</strong><small>{en ? 'Catalog environment labels' : 'Label lingkungan katalog'}</small></div>
      <div className="intelligence-stat"><span>{en ? 'API OPERATIONS' : 'OPERASI API'}</span><strong>{contract.analysis?.operations.length ?? '—'}</strong><small>{en ? 'From current OpenAPI input' : 'Dari input OpenAPI saat ini'}</small></div>
    </section>
    <div className="intelligence-tabs" role="tablist" aria-label={en ? 'Engineering intelligence tools' : 'Tool engineering intelligence'}>
      <button type="button" role="tab" aria-selected={tab === 'catalog'} className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}><Boxes size={16}/>{en ? 'Software catalog' : 'Katalog software'}</button>
      <button type="button" role="tab" aria-selected={tab === 'contracts'} className={tab === 'contracts' ? 'active' : ''} onClick={() => setTab('contracts')}><FileCode2 size={16}/>{en ? 'API contract studio' : 'Studio kontrak API'}</button>
    </div>
    {tab === 'catalog' ? <section className="intelligence-panel">
      <div className="intelligence-panel-heading"><div><span className="section-kicker">{en ? 'SYSTEM INVENTORY' : 'INVENTARIS SISTEM'}</span><h2>{en ? 'Software catalog' : 'Katalog software'}</h2><p>{en ? 'Track ownership, repository references, environment, and criticality. Data stays in this browser until you export it.' : 'Catat owner, referensi repository, environment, dan kritikalitas. Data tersimpan di browser ini sampai Anda mengekspornya.'}</p></div><button className="button button-ghost" type="button" onClick={exportCatalog}><ArrowDownToLine size={15}/>{en ? 'Export JSON' : 'Ekspor JSON'}</button></div>
      {catalogStats.examples > 0 && <div className="intelligence-notice"><AlertTriangle size={15}/>{en ? catalogStats.examples + ' example record(s) are shown as starter data. Replace them with your real inventory before using these metrics.' : catalogStats.examples + ' data contoh ditampilkan sebagai awal. Ganti dengan inventaris nyata sebelum menggunakan metrik ini.'}<button type="button" onClick={resetSamples}>{en ? 'Reset examples' : 'Pulihkan contoh'}</button></div>}
      <div className="intelligence-toolbar"><label className="intelligence-search"><Search size={16}/><input aria-label={en ? 'Search catalog' : 'Cari katalog'} placeholder={en ? 'Search service, owner, repository…' : 'Cari service, owner, repository…'} value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label={en ? 'Filter service type' : 'Filter tipe service'} value={kindFilter} onChange={event => setKindFilter(event.target.value)}><option value="All">{en ? 'All types' : 'Semua tipe'}</option>{[...new Set(catalog.map(item => item.kind))].map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></div>
      <div className="intelligence-service-grid">{filteredCatalog.map(item => <article className="intelligence-service-card" key={item.id}><div className="intelligence-service-top"><span className="intelligence-service-icon"><Boxes size={17}/></span><span className={'intelligence-criticality ' + item.criticality.toLowerCase()}>{item.criticality}</span></div><h3>{item.name}</h3><p>{item.description || (en ? 'No description provided.' : 'Deskripsi belum tersedia.')}</p><dl><div><dt>{en ? 'Owner' : 'Pemilik'}</dt><dd>{item.owner || '—'}</dd></div><div><dt>{en ? 'Environment' : 'Lingkungan'}</dt><dd>{item.environment}</dd></div><div><dt>Repository</dt><dd>{item.repo || '—'}</dd></div></dl><div className="intelligence-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}{item.source === 'sample' && <span>{en ? 'Example' : 'Contoh'}</span>}{item.source === 'imported' && <span>{en ? 'Imported' : 'Diimpor'}</span>}</div><button type="button" className="intelligence-remove" onClick={() => removeService(item.id)} aria-label={(en ? 'Remove service ' : 'Hapus service ') + item.name}><Trash2 size={14}/></button></article>)}</div>
      {!filteredCatalog.length && <div className="intelligence-empty"><Boxes size={25}/><strong>{en ? 'No matching services' : 'Tidak ada service yang cocok'}</strong><p>{en ? 'Change the search or add a service below.' : 'Ubah pencarian atau tambahkan service di bawah.'}</p></div>}
      <div className="intelligence-workbench-grid">
        <section className="intelligence-subpanel"><div className="intelligence-subheading"><Plus size={17}/><h3>{en ? 'Register a service' : 'Daftarkan service'}</h3></div><form className="intelligence-form" onSubmit={addService}>
          <label>{en ? 'Service name *' : 'Nama service *'}<input required value={serviceName} onChange={event => setServiceName(event.target.value)} placeholder={en ? 'Payments API' : 'Payments API'}/></label>
          <div className="intelligence-form-row"><label>{en ? 'Type' : 'Tipe'}<select value={serviceKind} onChange={event => setServiceKind(event.target.value)}>{['Web application','API service','Worker','Data platform','Library','Documentation','Infrastructure','Other'].map(value => <option key={value}>{value}</option>)}</select></label><label>{en ? 'Criticality' : 'Kritikalitas'}<select value={serviceCriticality} onChange={event => setServiceCriticality(event.target.value)}>{['Low','Medium','High','Critical'].map(value => <option key={value}>{value}</option>)}</select></label></div>
          <div className="intelligence-form-row"><label>{en ? 'Owner / team' : 'Owner / tim'}<input value={serviceOwner} onChange={event => setServiceOwner(event.target.value)} placeholder="Platform Engineering"/></label><label>{en ? 'Environment' : 'Environment'}<select value={serviceEnvironment} onChange={event => setServiceEnvironment(event.target.value)}>{['Development','Staging','Production','Unknown'].map(value => <option key={value}>{value}</option>)}</select></label></div>
          <label>Repository URL or slug<input value={serviceRepo} onChange={event => setServiceRepo(event.target.value)} placeholder="owner/repository"/></label>
          <label>{en ? 'Description' : 'Deskripsi'}<textarea value={serviceDescription} onChange={event => setServiceDescription(event.target.value)} rows={3} placeholder={en ? 'Purpose, dependencies, or operational notes' : 'Tujuan, dependensi, atau catatan operasional'}/></label>
          <button className="button button-primary" type="submit"><Plus size={15}/>{en ? 'Add service' : 'Tambah service'}</button>
        </form></section>
        <section className="intelligence-subpanel"><div className="intelligence-subheading"><Upload size={17}/><h3>{en ? 'Import catalog JSON' : 'Impor JSON katalog'}</h3></div><p className="intelligence-help">{en ? 'Paste a JSON array, or an object with an items array. Records need a name; other fields are optional.' : 'Tempel array JSON atau objek dengan array items. Setiap record wajib memiliki name; field lain opsional.'}</p><textarea className="intelligence-code-input" aria-label={en ? 'Catalog JSON import' : 'Impor JSON katalog'} value={importText} onChange={event => setImportText(event.target.value)} rows={10} placeholder={'[\n  { "name": "Payments API", "kind": "API service", "owner": "Platform", "environment": "Staging", "criticality": "High" }\n]'}/><div className="intelligence-inline-actions"><button className="button button-ghost" type="button" onClick={importCatalog}><Upload size={15}/>{en ? 'Import JSON' : 'Impor JSON'}</button><button className="button button-ghost" type="button" onClick={() => setImportText(JSON.stringify(catalog, null, 2))}><Copy size={15}/>{en ? 'Load current catalog' : 'Muat katalog saat ini'}</button></div></section>
      </div>
    </section> : <section className="intelligence-panel">
      <div className="intelligence-panel-heading"><div><span className="section-kicker">{en ? 'CONTRACT GOVERNANCE' : 'GOVERNANCE KONTRAK'}</span><h2>{en ? 'API contract studio' : 'Studio kontrak API'}</h2><p>{en ? 'Inspect an OpenAPI 3.x JSON document, review contract hygiene, and compare it with a baseline to flag likely breaking changes.' : 'Periksa dokumen JSON OpenAPI 3.x, tinjau kualitas kontrak, dan bandingkan dengan baseline untuk menandai potensi breaking change.'}</p></div><button className="button button-ghost" type="button" onClick={loadDemo}><FileCode2 size={15}/>{en ? 'Load example' : 'Muat contoh'}</button></div>
      <div className="intelligence-notice"><ShieldCheck size={15}/>{en ? 'Static local analysis only. The contract is not sent to a server, and no live API request is made.' : 'Analisis statis lokal. Kontrak tidak dikirim ke server dan tidak ada request API live yang dijalankan.'}</div>
      <div className="intelligence-contract-grid"><label className="intelligence-contract-editor">{en ? 'Current OpenAPI JSON' : 'JSON OpenAPI saat ini'}<textarea aria-label={en ? 'Current OpenAPI JSON' : 'JSON OpenAPI saat ini'} spellCheck={false} value={contractText} onChange={event => { setContractText(event.target.value); setError('') }} rows={18} placeholder={en ? 'Paste an OpenAPI 3.x JSON contract, or load the example.' : 'Tempel kontrak JSON OpenAPI 3.x atau muat contoh.'}/></label><label className="intelligence-contract-editor">{en ? 'Baseline contract (optional)' : 'Kontrak baseline (opsional)'}<textarea aria-label={en ? 'Baseline contract (optional)' : 'Kontrak baseline (opsional)'} spellCheck={false} value={baselineText} onChange={event => { setBaselineText(event.target.value); setError('') }} rows={18} placeholder={en ? 'Paste the previous release contract to compare operations and responses.' : 'Tempel kontrak rilis sebelumnya untuk membandingkan operasi dan respons.'}/></label></div>
      {contract.error && <p className="intelligence-error" role="alert">{contract.error}</p>}{baseline.error && <p className="intelligence-error" role="alert">{en ? 'Baseline: ' : 'Baseline: '}{baseline.error}</p>}{error && <p className="intelligence-error" role="alert">{error}</p>}
      {contract.analysis && <><div className="intelligence-contract-summary"><div><span>{en ? 'API' : 'API'}</span><strong>{contract.analysis.title}</strong></div><div><span>{en ? 'VERSION' : 'VERSI'}</span><strong>{contract.analysis.version}</strong></div><div><span>{en ? 'OPERATIONS' : 'OPERASI'}</span><strong>{contract.analysis.operations.length}</strong></div><div><span>{en ? 'SCHEMAS' : 'SKEMA'}</span><strong>{contract.analysis.schemas.length}</strong></div></div><div className="intelligence-operations"><div className="intelligence-subheading"><Activity size={17}/><h3>{en ? 'Operations' : 'Operasi'}</h3><span>{contract.analysis.operations.length}</span></div><div className="intelligence-operation-list">{contract.analysis.operations.map(operation => <article className="intelligence-operation" key={operation.key}><span className={'intelligence-method method-' + operation.method.toLowerCase()}>{operation.method}</span><div><strong>{operation.path}</strong><p>{operation.summary || (en ? 'No summary provided.' : 'Ringkasan belum tersedia.')}</p><small>{operation.operationId || (en ? 'Missing operationId' : 'operationId belum tersedia')} · {operation.responses.length} {en ? 'response code(s)' : 'kode respons'}</small></div><span className={operation.secured ? 'intelligence-auth secured' : 'intelligence-auth'}>{operation.secured ? (en ? 'Secured' : 'Terproteksi') : (en ? 'Review auth' : 'Tinjau auth')}</span></article>)}</div></div><div className="intelligence-findings"><div className="intelligence-subheading"><AlertTriangle size={17}/><h3>{en ? 'Contract findings' : 'Temuan kontrak'}</h3><span>{contract.analysis.findings.length}</span></div>{contract.analysis.findings.length ? contract.analysis.findings.map((finding, index) => <div className={'intelligence-finding ' + finding.severity} key={index}><span>{finding.severity.toUpperCase()}</span><p>{finding.message}</p></div>) : <div className="intelligence-success"><CheckCircle2 size={16}/>{en ? 'No basic contract hygiene findings detected.' : 'Tidak ditemukan temuan dasar pada kualitas kontrak.'}</div>}</div>{baseline.analysis && <div className="intelligence-findings"><div className="intelligence-subheading"><GitCompare size={17}/><h3>{en ? 'Baseline comparison' : 'Perbandingan baseline'}</h3><span>{diff.length}</span></div>{diff.map((finding, index) => <div className={'intelligence-finding ' + finding.severity} key={index}><span>{finding.severity.toUpperCase()}</span><p>{finding.message}</p></div>)}</div>}<div className="intelligence-inline-actions"><button className="button button-primary" type="button" onClick={exportContractReport}><ArrowDownToLine size={15}/>{en ? 'Export review' : 'Ekspor tinjauan'}</button><button className="button button-ghost" type="button" onClick={copyReport}><Copy size={15}/>{en ? 'Copy findings' : 'Salin temuan'}</button></div></>}
      {!contractText.trim() && <div className="intelligence-empty"><FileCode2 size={25}/><strong>{en ? 'Ready to inspect an API contract' : 'Siap memeriksa kontrak API'}</strong><p>{en ? 'Paste your OpenAPI JSON or load the clearly labelled example to start.' : 'Tempel JSON OpenAPI atau muat contoh yang diberi label dengan jelas.'}</p></div>}
    </section>}
    {(notice || error) && <p className={error ? 'intelligence-error' : 'intelligence-status'} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    <aside className="intelligence-footnote"><ShieldCheck size={16}/><p>{en ? 'Data is stored locally in this browser. Sample inventory records are illustrative, not live integrations. Contract analysis is heuristic and does not validate runtime behavior, authorization, or full OpenAPI conformance.' : 'Data disimpan lokal di browser ini. Record contoh hanya ilustrasi, bukan integrasi live. Analisis kontrak bersifat heuristik dan tidak memvalidasi perilaku runtime, otorisasi, atau seluruh kesesuaian OpenAPI.'}</p></aside>
  </main>
}
