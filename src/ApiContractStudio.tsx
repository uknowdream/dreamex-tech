import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, FileCheck2, GitCompareArrows, ShieldCheck } from 'lucide-react'
import { useLanguage } from './i18n'
import './ApiContractStudio.css'

type Operation = { key: string; method: string; path: string; operationId: string; summary: string; responses: string[]; requiredParams: string[]; requestRequired: boolean }
type Contract = { name: string; version: string; title: string; operations: Operation[]; warnings: string[]; schemaCount: number; exampleCount: number }
type Change = { kind: 'breaking' | 'info' | 'warning'; title: string; detail: string }

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']
const MAX_SPEC_BYTES = 2 * 1024 * 1024
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const text = (value: unknown): string => typeof value === 'string' ? value : ''
const keys = (value: unknown): string[] => object(value) ? Object.keys(value as object) : []

function inspectSchemasAndReferences(root: Record<string, unknown>, warnings: string[]) {
  const openapi3 = text(root.openapi).startsWith('3.')
  const components = object(root.components)
  const schemaContainer = object(openapi3 ? components?.schemas : root.definitions)
  const schemaNames = new Set(Object.keys(schemaContainer ?? {}))
  for (const [name, schema] of Object.entries(schemaContainer ?? {})) {
    if (!object(schema)) warnings.push(`Schema ${name} is not an object.`)
  }
  const knownTypes = new Set(['array', 'boolean', 'integer', 'number', 'object', 'string', 'null', 'file'])
  const visited = new WeakSet<object>()
  const stack: Array<{ value: unknown; path: string; depth: number; inSchema: boolean }> = [{ value: root, path: 'root', depth: 0, inSchema: false }]
  const unresolved = new Set<string>()
  let examined = 0
  while (stack.length && examined < 12000) {
    const current = stack.pop()!
    examined += 1
    if (current.depth > 80) {
      warnings.push('Document nesting exceeds the 80-level static inspection limit.')
      continue
    }
    if (Array.isArray(current.value)) {
      current.value.forEach((value, index) => stack.push({ value, path: current.path + '[' + index + ']', depth: current.depth + 1, inSchema: current.inSchema }))
      continue
    }
    const record = object(current.value)
    if (!record) continue
    if (visited.has(record)) continue
    visited.add(record)
    const ref = text(record.$ref)
    if (ref.startsWith('#/components/schemas/') || ref.startsWith('#/definitions/')) {
      const target = ref.split('/').pop()?.replace(/~1/g, '/').replace(/~0/g, '~') ?? ''
      if (!schemaNames.has(target)) unresolved.add(ref)
    }
    if (current.inSchema && typeof record.type === 'string' && !knownTypes.has(record.type)) {
      warnings.push(`${current.path}: unsupported or unknown schema type "${record.type}".`)
    }
    if (current.inSchema && record.type === 'array' && !('$ref' in record) && !('items' in record)) {
      warnings.push(`${current.path}: array schema is missing items.`)
    }
    if (current.inSchema && record.type === 'object' && 'properties' in record && !object(record.properties)) {
      warnings.push(`${current.path}: object schema properties must be an object.`)
    }
    for (const [key, value] of Object.entries(record)) {
      stack.push({ value, path: current.path + '.' + key, depth: current.depth + 1, inSchema: current.inSchema || key === 'schemas' || key === 'definitions' || key === 'schema' })
    }
  }
  for (const ref of unresolved) warnings.push(`Unresolved local schema reference: ${ref}.`)
  if (stack.length) warnings.push('Static inspection stopped at its 12,000-node safety limit.')
  return schemaNames.size
}

function parseContract(raw: unknown, name: string): Contract {
  const root = object(raw)
  if (!root || (!text(root.openapi).startsWith('3.') && !text(root.swagger).startsWith('2.'))) throw new Error('Expected a valid OpenAPI 3.x or Swagger 2.0 JSON document.')
  const info = object(root.info)
  const paths = object(root.paths)
  if (!info || !paths) throw new Error('The specification must include info and paths objects.')
  const operations: Operation[] = []
  const warnings: string[] = []
  const schemaCount = inspectSchemasAndReferences(root, warnings)
  let exampleCount = 0
  const inspectContent = (value: unknown, where: string) => {
    if (value === undefined) return
    const content = object(value)
    if (!content) { warnings.push(`${where}: content must be an object.`); return }
    for (const [mediaType, mediaValue] of Object.entries(content)) {
      const media = object(mediaValue)
      if (!media) { warnings.push(`${where} ${mediaType}: media-type entry must be an object.`); continue }
      if ('schema' in media && !object(media.schema)) warnings.push(`${where} ${mediaType}: schema must be an object or local reference object.`)
      if (Object.prototype.hasOwnProperty.call(media, 'example')) exampleCount += 1
      if ('examples' in media) {
        const examples = object(media.examples)
        if (!examples || !Object.keys(examples).length) warnings.push(`${where} ${mediaType}: examples must be a non-empty object.`)
        else for (const [exampleName, exampleValue] of Object.entries(examples)) {
          const example = object(exampleValue)
          if (!example || (!Object.prototype.hasOwnProperty.call(example, 'value') && typeof example.externalValue !== 'string')) warnings.push(`${where} ${mediaType}: example ${exampleName} must include value or externalValue.`)
          else exampleCount += 1
        }
      }
    }
  }
  for (const [path, pathValue] of Object.entries(paths)) {
    const pathItem = object(pathValue)
    if (!pathItem) { warnings.push(`Path ${path} is not an object.`); continue }
    for (const method of METHODS) {
      const operation = object(pathItem[method])
      if (!operation) continue
      const key = method.toUpperCase() + ' ' + path
      const responsesObject = object(operation.responses)
      const responses = keys(responsesObject)
      if (!responses.length) warnings.push(`${key}: no response definitions found.`)
      for (const status of responses) {
        const response = object(responsesObject?.[status])
        if (!response) { warnings.push(`${key} response ${status}: response must be an object.`); continue }
        inspectContent(response.content, `${key} response ${status}`)
      }
      const parameters = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ].map(object).filter((item): item is Record<string, unknown> => item !== null)
      const requiredParams = parameters.filter(item => item.required === true && item.in !== 'body').map(item => (text(item.in) ? text(item.in) + ':' : '') + (text(item.name) || '(unnamed parameter)')).sort()
      const requestBody = object(operation.requestBody)
      if (requestBody) inspectContent(requestBody.content, `${key} request body`)
      const bodyRequired = requestBody?.required === true || parameters.some(item => item.in === 'body' && item.required === true)
      operations.push({
        key, method: method.toUpperCase(), path,
        operationId: text(operation.operationId),
        summary: text(operation.summary) || text(operation.description).slice(0, 160),
        responses: responses.sort(),
        requiredParams,
        requestRequired: bodyRequired,
      })
    }
  }
  if (!operations.length) throw new Error('No HTTP operations were found under paths.')
  operations.sort((a, b) => a.key.localeCompare(b.key))
  return {
    name: name.slice(0, 160),
    version: text(info.version) || 'Not specified',
    title: text(info.title) || name,
    operations,
    warnings,
    schemaCount,
    exampleCount,
  }
}

function compareContracts(baseline: Contract, current: Contract): Change[] {
  const changes: Change[] = []
  const currentByKey = new Map(current.operations.map(operation => [operation.key, operation]))
  const baselineByKey = new Map(baseline.operations.map(operation => [operation.key, operation]))
  for (const oldOperation of baseline.operations) {
    const next = currentByKey.get(oldOperation.key)
    if (!next) {
      changes.push({ kind: 'breaking', title: 'Operation removed: ' + oldOperation.key, detail: 'Clients calling this operation may fail.' })
      continue
    }
    const removedParams = oldOperation.requiredParams.filter(param => !next.requiredParams.includes(param))
    const addedRequired = next.requiredParams.filter(param => !oldOperation.requiredParams.includes(param))
    if (addedRequired.length) changes.push({ kind: 'breaking', title: 'New required parameter: ' + oldOperation.key, detail: addedRequired.join(', ') })
    if (removedParams.length) changes.push({ kind: 'info', title: 'Required parameter no longer declared: ' + oldOperation.key, detail: removedParams.join(', ') })
    const removedResponses = oldOperation.responses.filter(status => !next.responses.includes(status))
    if (removedResponses.length) changes.push({ kind: 'warning', title: 'Response definitions removed: ' + oldOperation.key, detail: removedResponses.join(', ') })
    if (!oldOperation.requestRequired && next.requestRequired) changes.push({ kind: 'breaking', title: 'Request body is now required: ' + oldOperation.key, detail: 'Previously valid requests may now be rejected.' })
    if (oldOperation.operationId && next.operationId && oldOperation.operationId !== next.operationId) changes.push({ kind: 'warning', title: 'Operation ID changed: ' + oldOperation.key, detail: oldOperation.operationId + ' → ' + next.operationId })
  }
  for (const operation of current.operations) if (!baselineByKey.has(operation.key)) changes.push({ kind: 'info', title: 'Operation added: ' + operation.key, detail: 'New operation detected in the current contract.' })
  return changes.sort((a, b) => ({ breaking: 0, warning: 1, info: 2 }[a.kind] - ({ breaking: 0, warning: 1, info: 2 }[b.kind])))
}

async function readSpec(file: File): Promise<Contract> {
  if (file.size > MAX_SPEC_BYTES) throw new Error('File exceeds the 2 MiB limit.')
  if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Upload an OpenAPI JSON file. YAML is not supported in this version.')
  let parsed: unknown
  try { parsed = JSON.parse(await file.text()) } catch { throw new Error('The file is not valid JSON.') }
  return parseContract(parsed, file.name)
}

export function ApiContractStudio() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [baseline, setBaseline] = useState<Contract | null>(null)
  const [current, setCurrent] = useState<Contract | null>(null)
  const [errors, setErrors] = useState<{ baseline?: string; current?: string }>({})
  const [busy, setBusy] = useState<'baseline' | 'current' | null>(null)
  const changes = useMemo(() => baseline && current ? compareContracts(baseline, current) : [], [baseline, current])
  const load = async (which: 'baseline' | 'current', file?: File) => {
    if (!file) return
    setBusy(which)
    setErrors(old => ({ ...old, [which]: undefined }))
    try {
      const parsed = await readSpec(file)
      if (which === 'baseline') setBaseline(parsed); else setCurrent(parsed)
    } catch (error) {
      setErrors(old => ({ ...old, [which]: error instanceof Error ? error.message : 'Could not parse specification.' }))
    } finally { setBusy(null) }
  }
  const download = () => {
    if (!baseline || !current) return
    const report = { generatedAt: new Date().toISOString(), mode: 'static-openapi-diff', baseline: { title: baseline.title, version: baseline.version, operations: baseline.operations.length }, current: { title: current.title, version: current.version, operations: current.operations.length }, summary: { breaking: changes.filter(change => change.kind === 'breaking').length, warnings: changes.filter(change => change.kind === 'warning').length, informational: changes.filter(change => change.kind === 'info').length }, changes, limitations: ['Static heuristic comparison only.', 'Not a complete OpenAPI schema validator.', 'Does not execute requests or guarantee runtime compatibility.', 'Review findings before making release decisions.'] }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-openapi-compatibility-report.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="api-contract-studio" role="region" aria-labelledby="api-contract-studio-title">
    <header className="api-contract-heading">
      <div><span className="section-kicker"><GitCompareArrows size={14}/> API ENGINEERING / CONTRACT STUDIO</span><h2 id="api-contract-studio-title">{en ? 'API Contract Studio' : 'API Contract Studio'}</h2><p>{en ? 'Inventory OpenAPI operations and compare two versions for potential compatibility breaks.' : 'Inventarisasi operasi OpenAPI dan bandingkan dua versi untuk menemukan potensi perubahan yang tidak kompatibel.'}</p></div>
      <span className="api-contract-local"><ShieldCheck size={14}/>{en ? 'Browser-local' : 'Lokal di browser'}</span>
    </header>
    <div className="api-contract-uploads">
      {(['baseline', 'current'] as const).map(which => <div className="api-contract-upload" key={which}>
        <span className="api-contract-step">{which === 'baseline' ? '01' : '02'} / {which === 'baseline' ? (en ? 'BASELINE' : 'VERSI AWAL') : (en ? 'CURRENT' : 'VERSI BARU')}</span>
        <label>{which === 'baseline' ? (en ? 'Baseline OpenAPI JSON' : 'OpenAPI JSON versi awal') : (en ? 'Current OpenAPI JSON' : 'OpenAPI JSON versi baru')}
          <input type="file" accept=".json,application/json" aria-label={which === 'baseline' ? (en ? 'Baseline OpenAPI JSON' : 'OpenAPI JSON versi awal') : (en ? 'Current OpenAPI JSON' : 'OpenAPI JSON versi baru')} onChange={event => void load(which, event.target.files?.[0])} disabled={busy !== null}/>
        </label>
        {errors[which] && <p className="api-contract-error" role="alert">{errors[which]}</p>}
        {(which === 'baseline' ? baseline : current) && <><div className="api-contract-loaded" role="status"><FileCheck2 size={15}/><div><strong>{(which === 'baseline' ? baseline : current)?.title}</strong><span>v{(which === 'baseline' ? baseline : current)?.version} · {(which === 'baseline' ? baseline : current)?.operations.length} {en ? 'operations' : 'operasi'} · {(which === 'baseline' ? baseline : current)?.schemaCount} {en ? 'schemas' : 'schema'} · {(which === 'baseline' ? baseline : current)?.exampleCount} {en ? 'examples' : 'contoh'}</span></div></div>{(which === 'baseline' ? baseline : current)?.warnings.map((warning, index) => <p className="api-contract-error" role="note" key={index}>{warning}</p>)}</>}
      </div>)}
    </div>
    {baseline && current && <div className="api-contract-results">
      <div className="api-contract-summary"><article><strong>{changes.filter(change => change.kind === 'breaking').length}</strong><span>{en ? 'Potential breaking' : 'Potensi breaking'}</span></article><article><strong>{changes.filter(change => change.kind === 'warning').length}</strong><span>{en ? 'Warnings' : 'Peringatan'}</span></article><article><strong>{changes.filter(change => change.kind === 'info').length}</strong><span>{en ? 'Informational' : 'Informasi'}</span></article></div>
      <div className="api-contract-results-head"><div><h3>{en ? 'Compatibility review' : 'Tinjauan kompatibilitas'}</h3><p>{baseline.operations.length} → {current.operations.length} {en ? 'operations' : 'operasi'}</p></div><button type="button" className="button button-secondary" onClick={download}><ArrowDownToLine size={15}/>{en ? 'Export report' : 'Ekspor laporan'}</button></div>
      {changes.length ? <ul className="api-contract-change-list">{changes.map((change, index) => <li key={change.kind + change.title + index} className={'api-contract-change ' + change.kind}><AlertTriangle size={15}/><div><strong>{change.title}</strong><p>{change.detail}</p></div><span>{change.kind}</span></li>)}</ul> : <p className="api-contract-clean" role="status">{en ? 'No differences detected by the current heuristic checks.' : 'Tidak ada perbedaan yang terdeteksi oleh pemeriksaan heuristik saat ini.'}</p>}
    </div>}
    <p className="api-contract-guardrail"><ShieldCheck size={15}/>{en ? 'Static comparison only: no requests are sent and no input is uploaded. This is not a complete OpenAPI validator; schema-level changes and semantic compatibility may be missed. Review results before release.' : 'Perbandingan statis saja: tidak ada request yang dikirim dan input tidak diunggah. Ini bukan validator OpenAPI lengkap; perubahan schema dan kompatibilitas semantik mungkin terlewat. Tinjau hasil sebelum rilis.'}</p>
  </section>
}
