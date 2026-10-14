import { useMemo, useState } from 'react'
import { Activity, ArrowDownToLine, Gauge, ShieldCheck } from 'lucide-react'
import { useLanguage } from './i18n'
import './SloErrorBudget.css'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const numeric = (value: string, fallback = 0) => value.trim() === '' ? fallback : Number(value)

export function SloErrorBudgetWorksheet() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [target, setTarget] = useState('99.9')
  const [days, setDays] = useState('30')
  const [downtime, setDowntime] = useState('12')
  const [total, setTotal] = useState('100000')
  const [failed, setFailed] = useState('45')
  const inputs = [numeric(target, NaN), numeric(days, NaN), numeric(downtime, NaN), numeric(total, NaN), numeric(failed, NaN)]
  const valid = Number.isFinite(inputs[0]) && inputs[0] > 0 && inputs[0] < 100 &&
    Number.isFinite(inputs[1]) && inputs[1] >= 1 && inputs[1] <= 365 &&
    Number.isFinite(inputs[2]) && inputs[2] >= 0 && inputs[2] <= inputs[1] * 1440 &&
    Number.isFinite(inputs[3]) && Number.isInteger(inputs[3]) && inputs[3] > 0 && inputs[3] <= 1_000_000_000_000 &&
    Number.isFinite(inputs[4]) && Number.isInteger(inputs[4]) && inputs[4] >= 0 && inputs[4] <= inputs[3]
  const metrics = useMemo(() => {
    const goal = numeric(target, 99.9)
    const windowDays = numeric(days, 30)
    const observed = numeric(downtime)
    const requestCount = numeric(total)
    const failedCount = numeric(failed)
    const windowMinutes = windowDays * 1440
    const allowedMinutes = windowMinutes * (1 - goal / 100)
    const consumed = allowedMinutes > 0 ? observed / allowedMinutes * 100 : 0
    const availability = requestCount > 0 ? (requestCount - failedCount) / requestCount * 100 : 0
    return { windowMinutes, allowedMinutes, consumed, remaining: allowedMinutes - observed, availability, errorRate: requestCount > 0 ? failedCount / requestCount * 100 : 0, meetsTarget: availability >= goal && observed <= allowedMinutes }
  }, [target, days, downtime, total, failed])
  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      provenance: 'manual user input; not connected to live telemetry',
      inputs: { sloTargetPercent: numeric(target), windowDays: numeric(days), observedDowntimeMinutes: numeric(downtime), totalRequests: numeric(total), failedRequests: numeric(failed) },
      results: { allowedDowntimeMinutes: metrics.allowedMinutes, budgetRemainingMinutes: metrics.remaining, budgetConsumedPercent: metrics.consumed, requestAvailabilityPercent: metrics.availability, requestErrorRatePercent: metrics.errorRate, meetsTarget: metrics.meetsTarget },
      limitations: ['Calculations depend entirely on manually entered values.', 'Request-based availability and downtime-based error budget are separate indicators.', 'SLO results are not monitoring evidence or a production health assertion.'],
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dreamex-slo-error-budget.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const percent = (value: number) => Number.isFinite(value) ? value.toLocaleString(en ? 'en-US' : 'id-ID', { maximumFractionDigits: 4 }) + '%' : '—'
  const minutes = (value: number) => Number.isFinite(value) ? value.toLocaleString(en ? 'en-US' : 'id-ID', { maximumFractionDigits: 2 }) + ' min' : '—'
  return <section className="slo-worksheet" aria-labelledby="slo-worksheet-title">
    <header className="slo-worksheet-heading">
      <div><span className="section-kicker"><Gauge size={14}/> RELIABILITY / SLO WORKSHEET</span><h2 id="slo-worksheet-title">{en ? 'SLO and error-budget calculator' : 'Kalkulator SLO dan error budget'}</h2><p>{en ? 'Model an availability target against manually supplied downtime and request counts.' : 'Modelkan target ketersediaan menggunakan downtime dan jumlah request yang dimasukkan manual.'}</p></div>
      <span className="slo-worksheet-local"><ShieldCheck size={14}/>{en ? 'Manual inputs' : 'Input manual'}</span>
    </header>
    <div className="slo-worksheet-grid">
      <div className="slo-worksheet-fields">
        <label>{en ? 'Availability SLO (%)' : 'Target availability SLO (%)'}<input type="number" min="0.001" max="99.999999" step="0.001" value={target} onChange={event => setTarget(event.target.value)} aria-label={en ? 'Availability SLO percent' : 'Target availability SLO persen'}/></label>
        <label>{en ? 'Observation window (days)' : 'Jendela observasi (hari)'}<select value={days} onChange={event => setDays(event.target.value)} aria-label={en ? 'Observation window days' : 'Jendela observasi hari'}>{[7, 14, 30, 60, 90, 180, 365].map(value => <option key={value} value={value}>{value} {en ? 'days' : 'hari'}</option>)}</select></label>
        <label>{en ? 'Observed downtime (minutes)' : 'Downtime teramati (menit)'}<input type="number" min="0" max={numeric(days, 30) * 1440} step="0.1" value={downtime} onChange={event => setDowntime(event.target.value)} aria-label={en ? 'Observed downtime minutes' : 'Downtime teramati menit'}/></label>
        <label>{en ? 'Total requests' : 'Total request'}<input type="number" min="1" max="1000000000000" step="1" value={total} onChange={event => setTotal(event.target.value)} aria-label={en ? 'Total requests' : 'Total request'}/></label>
        <label>{en ? 'Failed requests' : 'Request gagal'}<input type="number" min="0" max={numeric(total, 100000)} step="1" value={failed} onChange={event => setFailed(event.target.value)} aria-label={en ? 'Failed requests' : 'Request gagal'}/></label>
        {!valid && <p className="slo-worksheet-error" role="alert">{en ? 'Check the ranges: target must be between 0 and 100%, downtime must fit the window, and failed requests cannot exceed total requests.' : 'Periksa rentang: target harus antara 0 dan 100%, downtime harus sesuai jendela, dan request gagal tidak boleh melebihi total request.'}</p>}
      </div>
      <div className="slo-worksheet-results">
        <div className="slo-worksheet-status"><span>{en ? 'Request-based availability' : 'Availability berdasarkan request'}</span><strong>{valid ? percent(metrics.availability) : '—'}</strong><small>{en ? 'Derived from the request counts above' : 'Dihitung dari jumlah request di atas'}</small></div>
        <div className="slo-worksheet-metrics"><article><span>{en ? 'Allowed downtime' : 'Downtime yang diizinkan'}</span><strong>{valid ? minutes(metrics.allowedMinutes) : '—'}</strong></article><article><span>{en ? 'Budget remaining' : 'Sisa budget'}</span><strong>{valid ? minutes(metrics.remaining) : '—'}</strong></article><article><span>{en ? 'Budget consumed' : 'Budget terpakai'}</span><strong>{valid ? percent(metrics.consumed) : '—'}</strong></article><article><span>{en ? 'Request error rate' : 'Rasio error request'}</span><strong>{valid ? percent(metrics.errorRate) : '—'}</strong></article></div>
        {valid && <div className={'slo-worksheet-verdict ' + (metrics.meetsTarget ? 'meets' : 'misses')} role="status"><Activity size={16}/><span>{metrics.meetsTarget ? (en ? 'Entered values meet the target' : 'Nilai input memenuhi target') : (en ? 'Entered values exceed the target budget or miss request availability' : 'Nilai input melewati budget target atau tidak memenuhi availability request')}</span></div>}
        <button type="button" className="button button-secondary" onClick={exportReport} disabled={!valid}><ArrowDownToLine size={15}/>{en ? 'Export calculation' : 'Ekspor perhitungan'}</button>
      </div>
    </div>
    <p className="slo-worksheet-note"><ShieldCheck size={14}/>{en ? 'This worksheet uses manual data only. It does not query monitoring systems. Request-based availability and downtime-based error budget are distinct measures; confirm the SLI definition and measurement window before using this for release decisions.' : 'Worksheet ini hanya menggunakan data manual dan tidak mengakses sistem monitoring. Availability berdasarkan request dan error budget berdasarkan downtime adalah ukuran berbeda; pastikan definisi SLI dan jendela pengukuran sebelum memakai hasil untuk keputusan rilis.'}</p>
  </section>
}
