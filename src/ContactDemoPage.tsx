import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Github, Mail, Rocket, Send, ShieldCheck, TrendingUp } from 'lucide-react'
import { useLanguage } from './i18n'
import './ContactDemoPage.css'

type Topic = 'demo' | 'architecture' | 'jira-enterprise' | 'partnership'

const CASE_STUDIES = [
  {
    id: 'fintech-ledger',
    tagEn: 'FinTech · Ledger Core',
    tagId: 'FinTech · Inti Ledger',
    titleEn: 'T+0 Settlement Ledger with Idempotent Event Sourcing',
    titleId: 'Ledger Settlement T+0 dengan Event Sourcing Idempoten',
    bodyEn: 'Replaced nightly batch reconciliation with an idempotent outbox + event-sourced ledger. Duplicate postings were eliminated and reconciliation moved from next-day to real time.',
    bodyId: 'Mengganti rekonsiliasi batch malam hari dengan outbox idempoten + ledger event-sourced. Posting ganda hilang dan rekonsiliasi berpindah dari H+1 menjadi real-time.',
    metrics: [
      { value: 'T+1 → T+0', en: 'Settlement window', id: 'Jendela settlement' },
      { value: '0', en: 'Duplicate postings', id: 'Posting ganda' },
      { value: '−62%', en: 'Recon effort', id: 'Upaya rekonsiliasi' },
    ],
  },
  {
    id: 'playwright-mesh',
    tagEn: 'Quality Engineering · CI',
    tagId: 'Quality Engineering · CI',
    titleEn: 'Zero-Flake Playwright CI Mesh for a Multi-Project Monorepo',
    titleId: 'Mesh CI Playwright Tanpa Flaky untuk Monorepo Multi-Proyek',
    bodyEn: 'Introduced sharded Playwright projects, deterministic test data, network contracts, and a quarantine lane. Release confidence rose while pipeline time dropped.',
    bodyId: 'Menerapkan proyek Playwright ter-shard, data uji deterministik, kontrak jaringan, dan jalur karantina. Kepercayaan rilis naik sementara durasi pipeline turun.',
    metrics: [
      { value: '11% → 0.4%', en: 'Flake rate', id: 'Tingkat flaky' },
      { value: '38 → 9 min', en: 'Pipeline time', id: 'Durasi pipeline' },
      { value: '4×', en: 'Weekly releases', id: 'Rilis mingguan' },
    ],
  },
  {
    id: 'jira-governance',
    tagEn: 'Delivery · Agile Governance',
    tagId: 'Delivery · Tata Kelola Agile',
    titleEn: 'Autonomous Jira Sprint Governance with Predictive Risk',
    titleId: 'Tata Kelola Sprint Jira Otonom dengan Risiko Prediktif',
    bodyEn: 'Wired WIP guardrails, SLA timers, automation rules and a 3-horizon risk brain into sprint rituals. Spillover and blocked time fell within two sprints.',
    bodyId: 'Menghubungkan batas WIP, timer SLA, aturan otomasi, dan otak risiko 3-horizon ke ritual sprint. Spillover dan waktu terblokir turun dalam dua sprint.',
    metrics: [
      { value: '−47%', en: 'Sprint spillover', id: 'Spillover sprint' },
      { value: '−58%', en: 'Blocked time', id: 'Waktu terblokir' },
      { value: '92%', en: 'Commitment hit', id: 'Komitmen tercapai' },
    ],
  },
] as const

const CHANGELOG = [
  { version: 'v13.0', date: '2026-11-23', en: 'Full UX & visual perfection audit: single-row on-demand Suite Switcher, above-the-fold Atlassian Jira workspace (cuts top chrome 60%+), self-driving Neon Postgres auto-sync & live custom automation rule evaluator, /grader -> /jira auto-ticket bridge with zero broken badges, and zero duplicate photos across the entire homepage.', id: 'Audit menyeluruh UX & visual: Suite Switcher 1 baris on-demand, workspace Jira langsung above-the-fold (pangkas tumpukan atas 60%+), Auto-Sync Neon Postgres otomatis & mesin eksekusi aturan otomasi kustom, jembatan tiket otomatis /grader -> /jira bebas broken badge, serta nol foto duplikat di seluruh beranda.' },
  { version: 'v12.0', date: '2026-11-22', en: 'Live Neon Serverless Postgres cloud auto-sync inside Jira topbar, compact Atlassian Cloud workspace shell, Inline List View spreadsheet editor, Issue Time Tracking worklogs, and 12/12 unique bespoke editorial article covers.', id: 'Sinkronisasi otomatis live Neon Serverless Postgres langsung di topbar Jira, shell Atlassian Cloud ringkas, editor Daftar Inline (List View), Time Tracking worklog tiket, serta 12/12 sampul artikel editorial unik tanpa duplikasi.' },
  { version: 'v11.0', date: '2026-11-22', en: '100% Vercel-native 3-driver storage engine (Neon Postgres / Upstash Redis / Vercel Blob / Zero-DB Sovereign), 2-way GitHub PR/Issue webhook (/api/github-webhook), Slack/Discord demo notifications, Executive DORA Metrics, @mention & QA evidence chips, 1-click /ba-hub & /pm-jira-hub to /jira bridge, and 12/12 interactive article code snippets.', id: 'Mesin penyimpanan 100% native Vercel 3-driver (Neon Postgres / Upstash Redis / Vercel Blob / Zero-DB Sovereign), webhook GitHub 2-arah (/api/github-webhook), notifikasi Slack/Discord demo, Metrik Eksekutif DORA, chip @mention & bukti QA, jembatan 1-klik /ba-hub & /pm-jira-hub ke /jira, serta 12/12 blok kode artikel interaktif.' },
  { version: 'v10.0', date: '2026-11-20', en: 'Cloud sync rooms, multi-tab live sync, shareable board URLs, GitHub Issues bridge, /contact portal, React Router 7, zero npm vulnerabilities.', id: 'Ruang sinkronisasi cloud, sinkron multi-tab langsung, tautan board, jembatan GitHub Issues, portal /contact, React Router 7, nol kerentanan npm.' },
  { version: 'v9.0', date: '2026-11-18', en: 'Jira Pro shell: project sidebar, Calendar, Forms Portal, Workflow designer & RBAC, Flag/Vote, Undo/Redo.', id: 'Shell Jira Pro: sidebar proyek, Kalender, Portal Form, desainer Workflow & RBAC, Flag/Vote, Undo/Redo.' },
  { version: 'v8.0', date: '2026-11-17', en: 'Multi-project spaces, Product Discovery RICE, JSM incidents & CAB, Confluence wiki, Planning Poker, CFD.', id: 'Ruang multi-proyek, Product Discovery RICE, insiden JSM & CAB, wiki Confluence, Planning Poker, CFD.' },
  { version: 'v7.1', date: '2026-11-16', en: 'Autonomous brain: 3-horizon forecasting, self-driving autopilot, goal-to-sprint compiler, SLA engine.', id: 'Otak otonom: prakiraan 3-horizon, autopilot mandiri, kompiler goal-ke-sprint, mesin SLA.' },
  { version: 'v7.0', date: '2026-11-15', en: 'Launched /jira: Kanban, backlog, Epic Gantt, executable JQL, burndown, automation, ADF/CSV export.', id: 'Meluncurkan /jira: Kanban, backlog, Gantt Epic, JQL, burndown, otomasi, ekspor ADF/CSV.' },
  { version: 'v6.1', date: '2026-11-14', en: 'Fixed 21 live audit findings; 98/A+ grader score and full production smoke coverage.', id: 'Memperbaiki 21 temuan audit; skor grader 98/A+ dan cakupan smoke produksi penuh.' },
  { version: 'v5.0', date: '2026-11-10', en: 'AI Prototype Studio, URL Grader, and bilingual technical journal foundation.', id: 'Studio Prototipe AI, Grader URL, dan fondasi jurnal teknis dwibahasa.' },
] as const

export default function ContactDemoPage() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [topic, setTopic] = useState<Topic>('demo')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [openVersion, setOpenVersion] = useState<string>('v13.0')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setReferenceId('')
    setBusy(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, company, topic, message }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; referenceId?: string; message?: string; error?: string }
      if (res.ok && data.ok && data.referenceId) {
        setReferenceId(data.referenceId)
        setMessage('')
      } else if (res.status === 429) {
        setError(en ? 'Too many requests. Please wait a minute and try again.' : 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.')
      } else {
        setError(data.message || data.error || `HTTP ${res.status}`)
      }
    } catch {
      setError(en ? 'Network unavailable. Use the email or GitHub option below.' : 'Jaringan tidak tersedia. Gunakan opsi email atau GitHub di bawah.')
    } finally {
      setBusy(false)
    }
  }

  const mailtoHref = `mailto:hello@dreamex.tech?subject=${encodeURIComponent(`[DreamEx ${topic}] ${company || name || 'Inquiry'}`)}&body=${encodeURIComponent(message)}`

  return (
    <main id="main-content" className="contact-page" data-testid="contact-page">
      <section className="container contact-hero">
        <span className="contact-eyebrow"><Rocket size={13} aria-hidden="true" /> {en ? 'ENTERPRISE DEMO & CONSULTATION' : 'DEMO ENTERPRISE & KONSULTASI'}</span>
        <h1>{en ? 'Turn your delivery system into a measurable advantage.' : 'Ubah sistem delivery Anda menjadi keunggulan yang terukur.'}</h1>
        <p>
          {en
            ? 'Book a guided walkthrough of the DreamEx Jira Sprint OS, request an architecture review, or explore a partnership. Every request gets a traceable reference ID.'
            : 'Pesan demo terpandu DreamEx Jira Sprint OS, minta review arsitektur, atau jajaki kemitraan. Setiap permintaan mendapat ID referensi yang dapat dilacak.'}
        </p>
        <div className="contact-trust-row">
          <span><ShieldCheck size={14} aria-hidden="true" /> {en ? 'Email hashed at rest' : 'Email di-hash saat disimpan'}</span>
          <span><CheckCircle2 size={14} aria-hidden="true" /> {en ? 'Reply within 2 business days' : 'Balasan maks. 2 hari kerja'}</span>
          <span><TrendingUp size={14} aria-hidden="true" /> {en ? 'Outcome-first engagements' : 'Fokus pada hasil terukur'}</span>
        </div>
      </section>

      <section className="container contact-grid">
        <form className="contact-card contact-form" onSubmit={e => void submit(e)} data-testid="contact-form" aria-label={en ? 'Enterprise demo request form' : 'Formulir permintaan demo enterprise'}>
          <h2>{en ? 'Request a demo' : 'Minta demo'}</h2>
          <label>
            <span>{en ? 'Full name' : 'Nama lengkap'}</span>
            <input data-testid="contact-name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" />
          </label>
          <label>
            <span>{en ? 'Work email' : 'Email kerja'}</span>
            <input data-testid="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" />
          </label>
          <label>
            <span>{en ? 'Company (optional)' : 'Perusahaan (opsional)'}</span>
            <input data-testid="contact-company" value={company} onChange={e => setCompany(e.target.value)} maxLength={120} autoComplete="organization" />
          </label>
          <label>
            <span>{en ? 'Topic' : 'Topik'}</span>
            <select data-testid="contact-topic" value={topic} onChange={e => setTopic(e.target.value as Topic)}>
              <option value="demo">{en ? 'Live product demo' : 'Demo produk langsung'}</option>
              <option value="jira-enterprise">{en ? 'Jira Sprint OS for my team' : 'Jira Sprint OS untuk tim saya'}</option>
              <option value="architecture">{en ? 'Architecture / QA review' : 'Review arsitektur / QA'}</option>
              <option value="partnership">{en ? 'Partnership' : 'Kemitraan'}</option>
            </select>
          </label>
          <label>
            <span>{en ? 'What do you want to achieve?' : 'Apa yang ingin Anda capai?'}</span>
            <textarea data-testid="contact-message" value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={1800} rows={5} />
          </label>
          <button type="submit" className="button button-primary" disabled={busy} data-testid="contact-submit">
            <Send size={15} aria-hidden="true" /> {busy ? (en ? 'Sending…' : 'Mengirim…') : en ? 'Send request' : 'Kirim permintaan'}
          </button>
          {referenceId && (
            <div className="contact-success" role="status" data-testid="contact-success">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>{en ? 'Request received. Your reference ID:' : 'Permintaan diterima. ID referensi Anda:'} <b>{referenceId}</b></span>
            </div>
          )}
          {error && <div className="contact-error" role="alert">{error}</div>}
          <div className="contact-alt">
            <a href={mailtoHref}><Mail size={14} aria-hidden="true" /> {en ? 'Email instead' : 'Kirim via email'}</a>
            <a href="https://github.com/uknowdream/dreamex-tech/issues" target="_blank" rel="noreferrer"><Github size={14} aria-hidden="true" /> {en ? 'Open a GitHub issue' : 'Buka issue GitHub'}</a>
          </div>
        </form>

        <aside className="contact-card contact-side">
          <h2>{en ? 'What happens next' : 'Langkah berikutnya'}</h2>
          <ol>
            <li>{en ? 'We review your goals and current delivery stack.' : 'Kami meninjau tujuan dan stack delivery Anda.'}</li>
            <li>{en ? 'A 30-minute walkthrough tailored to your workflow.' : 'Sesi demo 30 menit sesuai alur kerja Anda.'}</li>
            <li>{en ? 'A written plan with measurable success metrics.' : 'Rencana tertulis dengan metrik keberhasilan terukur.'}</li>
          </ol>
          <Link className="read-link" to="/jira">{en ? 'Try the Jira Sprint OS now' : 'Coba Jira Sprint OS sekarang'} <ArrowRight size={14} aria-hidden="true" /></Link>
        </aside>
      </section>

      <section className="container contact-section" aria-labelledby="case-studies-title" data-testid="contact-case-studies">
        <h2 id="case-studies-title">{en ? 'Engineering case studies' : 'Studi kasus engineering'}</h2>
        <div className="contact-cases">
          {CASE_STUDIES.map(cs => (
            <article key={cs.id} className="contact-card contact-case">
              <span className="contact-eyebrow">{en ? cs.tagEn : cs.tagId}</span>
              <h3>{en ? cs.titleEn : cs.titleId}</h3>
              <p>{en ? cs.bodyEn : cs.bodyId}</p>
              <dl className="contact-metrics">
                {cs.metrics.map(m => (
                  <div key={m.en}>
                    <dt>{en ? m.en : m.id}</dt>
                    <dd>{m.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <p className="contact-note">{en ? 'Figures are representative engagement outcomes, anonymized to protect client confidentiality.' : 'Angka merupakan hasil representatif, dianonimkan untuk menjaga kerahasiaan klien.'}</p>
      </section>

      <section className="container contact-section" aria-labelledby="changelog-title" data-testid="contact-changelog">
        <h2 id="changelog-title">{en ? 'Public release changelog' : 'Changelog rilis publik'}</h2>
        <ul className="contact-changelog">
          {CHANGELOG.map(item => {
            const open = openVersion === item.version
            return (
              <li key={item.version} className={open ? 'is-open' : ''}>
                <button type="button" aria-expanded={open} onClick={() => setOpenVersion(open ? '' : item.version)}>
                  <b>{item.version}</b>
                  <time dateTime={item.date}>{item.date}</time>
                </button>
                {open && <p>{en ? item.en : item.id}</p>}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
