import { useMemo, useState } from 'react'
import { ArrowDownToLine, CheckCircle2, Clipboard, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import { useLanguage } from './i18n'
import './TestDataBuilder.css'

type DatasetProfile = 'accounts' | 'commerce' | 'boundaries'
type TestRecord = Record<string, unknown>
type Dataset = { schemaVersion: string; profile: DatasetProfile; seed: string; generatedAt: string; count: number; privacy: string; records: TestRecord[] }

const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Jamie', 'Sam', 'Robin']
const lastNames = ['Sample', 'Example', 'Test', 'Demo', 'Fixture', 'Synthetic', 'Quality', 'Automation', 'Mock', 'Preview']
const orderStates = ['pending', 'paid', 'cancelled', 'refunded']
const roles = ['viewer', 'tester', 'maintainer', 'admin']

function seededRandom(seed: string) {
  let state = 2166136261
  for (let i = 0; i < seed.length; i += 1) state = Math.imul(state ^ seed.charCodeAt(i), 16777619)
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function buildRecords(profile: DatasetProfile, count: number, seed: string): TestRecord[] {
  const random = seededRandom(seed || 'dreamex')
  const safeSeed = (seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'sample')
  if (profile === 'boundaries') {
    const cases: TestRecord[] = [
      { scenario: 'empty string', input: '', expected: 'Required-field validation', risk: 'required' },
      { scenario: 'null value', input: null, expected: 'Null-safe validation', risk: 'nullability' },
      { scenario: 'maximum length', input: 'x'.repeat(255), expected: 'Accept or reject at documented limit', risk: 'boundary' },
      { scenario: 'unicode and emoji', input: 'QA-🚀-测试', expected: 'Preserve valid Unicode', risk: 'encoding' },
      { scenario: 'negative amount', input: -1, expected: 'Reject if domain requires non-negative values', risk: 'range' },
      { scenario: 'zero amount', input: 0, expected: 'Apply explicit zero-value business rule', risk: 'boundary' },
      { scenario: 'large integer', input: Number.MAX_SAFE_INTEGER + 1, expected: 'Reject or preserve precision explicitly', risk: 'precision' },
      { scenario: 'whitespace only', input: '   ', expected: 'Trim or reject according to contract', risk: 'normalization' },
      { scenario: 'duplicate identifier', input: 'duplicate-fixture', expected: 'Apply uniqueness constraint', risk: 'uniqueness' },
      { scenario: 'unexpected structured input', input: JSON.stringify({ nested: true }), expected: 'Reject unexpected input shape safely', risk: 'type' },
    ]
    return Array.from({ length: count }, (_, index) => ({ caseId: 'EDGE-' + String(index + 1).padStart(3, '0'), ...cases[index % cases.length], seed: safeSeed }))
  }
  if (profile === 'commerce') {
    return Array.from({ length: count }, (_, index) => ({
      orderId: 'ORD-' + safeSeed.toUpperCase() + '-' + String(index + 1).padStart(4, '0'),
      sku: 'SKU-TEST-' + String(100 + Math.floor(random() * 900)),
      quantity: 1 + Math.floor(random() * 5),
      unitPrice: Number((1 + random() * 499).toFixed(2)),
      currency: 'USD',
      status: orderStates[Math.floor(random() * orderStates.length)],
      couponCode: random() > 0.65 ? 'QA-SAMPLE-' + String(Math.floor(random() * 90) + 10) : null,
    }))
  }
  return Array.from({ length: count }, (_, index) => ({
    userId: 'USR-' + safeSeed.toUpperCase() + '-' + String(index + 1).padStart(4, '0'),
    name: firstNames[Math.floor(random() * firstNames.length)] + ' ' + lastNames[Math.floor(random() * lastNames.length)],
    email: 'qa.user.' + safeSeed + '.' + String(index + 1).padStart(3, '0') + '@example.test',
    role: roles[Math.floor(random() * roles.length)],
    status: random() > 0.18 ? 'active' : 'locked',
    age: 18 + Math.floor(random() * 63),
    verified: random() > 0.35,
  }))
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value)
  const safe = typeof value === 'string' && /^[=+@\-\t\r]/.test(text) ? "'" + text : text
  return '"' + safe.replaceAll('"', '""') + '"'
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function TestDataBuilder() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [profile, setProfile] = useState<DatasetProfile>('accounts')
  const [seed, setSeed] = useState('dreamex-qa-2026')
  const [count, setCount] = useState(10)
  const [notice, setNotice] = useState('')
  const normalizedCount = Math.max(1, Math.min(100, Number.isFinite(count) ? Math.floor(count) : 10))
  const records = useMemo(() => buildRecords(profile, normalizedCount, seed.trim().slice(0, 80)), [profile, normalizedCount, seed])
  const dataset = useMemo<Dataset>(() => ({
    schemaVersion: '1.0',
    profile,
    seed: seed.trim().slice(0, 80),
    generatedAt: new Date().toISOString(),
    count: records.length,
    privacy: 'Synthetic fixtures only. No real personal data, credentials, or production records are used.',
    records,
  }), [profile, seed, records])
  const preview = useMemo(() => JSON.stringify(records.slice(0, 5), null, 2), [records])
  const csv = useMemo(() => {
    const fields = [...new Set(records.flatMap(record => Object.keys(record)))]
    return [fields.map(csvCell).join(','), ...records.map(record => fields.map(field => csvCell(record[field])).join(','))].join('\r\n')
  }, [records])
  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(dataset, null, 2))
      setNotice(en ? 'JSON copied. The dataset was not saved to a server.' : 'JSON disalin. Dataset tidak disimpan ke server.')
    } catch {
      setNotice(en ? 'Clipboard access was blocked. Use a download instead.' : 'Akses clipboard diblokir. Gunakan unduhan.')
    }
  }
  const profileLabel = profile === 'accounts' ? (en ? 'Synthetic user accounts' : 'Akun pengguna sintetis') : profile === 'commerce' ? (en ? 'E-commerce orders' : 'Pesanan e-commerce') : (en ? 'Boundary & negative cases' : 'Kasus batas & negatif')
  return <section className="qa-data-builder" aria-labelledby="qa-data-title">
    <div className="qa-data-heading">
      <div><span className="section-kicker"><Database size={14} /> 04 / TEST DATA</span><h2 id="qa-data-title">{en ? 'Synthetic test data builder' : 'Pembuat data uji sintetis'}</h2><p>{en ? 'Generate repeatable fixtures for QA workflows without using production data.' : 'Buat fixture berulang untuk alur QA tanpa menggunakan data produksi.'}</p></div>
      <span className="qa-data-local"><ShieldCheck size={14} />{en ? 'Local-only · no upload' : 'Lokal · tanpa unggah'}</span>
    </div>
    <div className="qa-data-controls">
      <label>{en ? 'Dataset profile' : 'Profil dataset'}<select aria-label={en ? 'Dataset profile' : 'Profil dataset'} value={profile} onChange={event => { setProfile(event.target.value as DatasetProfile); setNotice('') }}><option value="accounts">{en ? 'Synthetic user accounts' : 'Akun pengguna sintetis'}</option><option value="commerce">{en ? 'E-commerce orders' : 'Pesanan e-commerce'}</option><option value="boundaries">{en ? 'Boundary & negative cases' : 'Kasus batas & negatif'}</option></select></label>
      <label>{en ? 'Deterministic seed' : 'Seed deterministik'}<input aria-label={en ? 'Deterministic seed' : 'Seed deterministik'} value={seed} onChange={event => { setSeed(event.target.value.slice(0, 80)); setNotice('') }} maxLength={80} /></label>
      <label>{en ? 'Record count (1–100)' : 'Jumlah record (1–100)'}<input aria-label={en ? 'Record count (1–100)' : 'Jumlah record (1–100)'} type="number" min={1} max={100} value={count} onChange={event => setCount(Number(event.target.value))} /></label>
    </div>
    <div className="qa-data-summary"><div><span>{en ? 'Profile' : 'Profil'}</span><strong>{profileLabel}</strong></div><div><span>{en ? 'Records' : 'Record'}</span><strong>{records.length}</strong></div><div><span>{en ? 'Repeatability' : 'Konsistensi'}</span><strong>{en ? 'Seeded' : 'Berbasis seed'}</strong></div></div>
    <div className="qa-data-preview-head"><div><h3>{en ? 'Preview (first 5 records)' : 'Pratinjau (5 record pertama)'}</h3><p>{en ? 'Change the seed to reproduce a different, repeatable dataset.' : 'Ubah seed untuk menghasilkan dataset berbeda yang tetap dapat direproduksi.'}</p></div><button type="button" className="button button-secondary" onClick={() => { setSeed('dreamex-' + Math.random().toString(36).slice(2, 10)); setNotice(en ? 'New seed generated.' : 'Seed baru dibuat.') }}><RefreshCw size={14} />{en ? 'New seed' : 'Seed baru'}</button></div>
    <textarea className="qa-data-output" aria-label={en ? 'Generated test data preview' : 'Pratinjau data uji hasil generasi'} value={preview} readOnly rows={12} spellCheck={false} />
    <div className="qa-data-actions"><button type="button" className="button button-secondary" onClick={() => void copyJson()}><Clipboard size={15} />{en ? 'Copy JSON' : 'Salin JSON'}</button><button type="button" className="button button-secondary" onClick={() => downloadText('dreamex-test-data.json', JSON.stringify(dataset, null, 2), 'application/json;charset=utf-8')}><ArrowDownToLine size={15} />{en ? 'Download JSON' : 'Unduh JSON'}</button><button type="button" className="button button-primary" onClick={() => downloadText('dreamex-test-data.csv', csv, 'text/csv;charset=utf-8')}><ArrowDownToLine size={15} />{en ? 'Download CSV' : 'Unduh CSV'}</button></div>
    <div className="qa-data-guardrail"><ShieldCheck size={16}/><p>{en ? 'Privacy guardrail: generated records are fictional, email addresses use the reserved example.test domain, and no data is persisted or sent anywhere. Validate fixtures against your own schema before use.' : 'Batas privasi: record yang dibuat bersifat fiktif, alamat email memakai domain khusus example.test, dan tidak ada data yang disimpan atau dikirim ke mana pun. Validasi fixture dengan skema Anda sebelum digunakan.'}</p></div>
    {notice && <p className="command-center-notice" role="status">{notice}</p>}
  </section>
}
