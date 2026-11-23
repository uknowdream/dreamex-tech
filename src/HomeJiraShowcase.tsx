import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, CheckCircle2, Kanban, RotateCcw, Zap } from 'lucide-react'
import { useLanguage } from './i18n'
import './HomeJiraShowcase.css'

interface PreviewTicket {
  key: string
  titleEn: string
  titleId: string
  col: 'todo' | 'progress' | 'qa' | 'done'
  sp: number
  owner: string
  badge: string
}

const BASELINE_TICKETS: PreviewTicket[] = [
  {
    key: 'DX-104',
    titleEn: 'Blocked FX cache invalidation race condition',
    titleId: 'Race condition invalidasi cache FX (Terhambat)',
    col: 'todo',
    sp: 5,
    owner: 'Rizky',
    badge: 'BLOCKED · SLA RISK',
  },
  {
    key: 'DX-102',
    titleEn: 'Idempotent T+0 ledger settlement Outbox',
    titleId: 'Outbox settlement ledger T+0 idempoten',
    col: 'progress',
    sp: 8,
    owner: 'Rizky',
    badge: 'P0 · 8 SP',
  },
  {
    key: 'DX-103',
    titleEn: 'Self-healing Playwright ARIA locator gate',
    titleId: 'Gerbang locator ARIA Playwright self-healing',
    col: 'qa',
    sp: 5,
    owner: 'Nadia',
    badge: 'AUTO-02 QA',
  },
  {
    key: 'DX-101',
    titleEn: 'Ed25519 rotating refresh-token replay lock',
    titleId: 'Kunci anti-replay rotasi token Ed25519',
    col: 'done',
    sp: 8,
    owner: 'Alya',
    badge: 'v7.1.0 READY',
  },
]

const OPTIMIZED_TICKETS: PreviewTicket[] = [
  {
    key: 'DX-112',
    titleEn: '[AI Foresight] Pre-release canary failover sentinel',
    titleId: '[AI Foresight] Penjaga failover canary pra-rilis',
    col: 'todo',
    sp: 3,
    owner: 'Bima',
    badge: 'SPRINT 25 AUTO',
  },
  {
    key: 'DX-104',
    titleEn: 'FX cache invalidation decoupled via contract stub',
    titleId: 'Cache FX dilepas lewat contract stub paralel',
    col: 'progress',
    sp: 5,
    owner: 'Nadia',
    badge: 'UNBLOCKED · SLA OK',
  },
  {
    key: 'DX-102',
    titleEn: 'Idempotent T+0 ledger Outbox + 3 QA subtasks',
    titleId: 'Outbox ledger T+0 + 3 subtask QA otomatis',
    col: 'qa',
    sp: 8,
    owner: 'Rizky',
    badge: 'DECOMPOSED',
  },
  {
    key: 'DX-101',
    titleEn: 'Ed25519 token rotation + DX-103 Playwright verified',
    titleId: 'Rotasi token Ed25519 + DX-103 terverifikasi QA',
    col: 'done',
    sp: 13,
    owner: 'Alya',
    badge: '98% CONFIDENCE',
  },
]

export default function HomeJiraShowcase() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [optimized, setOptimized] = useState(false)

  const tickets = optimized ? OPTIMIZED_TICKETS : BASELINE_TICKETS
  const cols = [
    { id: 'todo' as const, en: 'To Do / Next', idLabel: 'Akan Dikerjakan' },
    { id: 'progress' as const, en: 'In Progress (WIP)', idLabel: 'Dikerjakan (WIP)' },
    { id: 'qa' as const, en: 'QA & Playwright', idLabel: 'Review & QA' },
    { id: 'done' as const, en: 'Done & Verified', idLabel: 'Selesai' },
  ]

  return (
    <section
      className="home-jira-section"
      data-testid="home-jira-showcase"
      aria-labelledby="home-jira-heading"
    >
      <div className="container">
        <div className="home-jira-shell">
          <div className="home-jira-head">
            <div className="home-jira-title-wrap">
              <span className="section-kicker">
                <Kanban size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                {en
                  ? 'FLAGSHIP SUITE · AUTONOMOUS JIRA CLOUD ENTERPRISE (v13.0 · 15 MODULES)'
                  : 'FITUR UNGGULAN · JIRA CLOUD ENTERPRISE OTONOM (v13.0 · 15 MODUL)'}
              </span>
              <h2 id="home-jira-heading">
                {en ? (
                  <>
                    Full Jira Cloud +{' '}
                    <span>Self-Driving AI Sprint Brain.</span>
                  </>
                ) : (
                  <>
                    Fitur Lengkap Jira Cloud +{' '}
                    <span>Otak Sprint AI Otonom.</span>
                  </>
                )}
              </h2>
              <p>
                {en
                  ? '14 integrated Atlassian-grade modules: Left-Sidebar Project Shell, Multi-Project Spaces (DX/FIN/OPS/AI), WIP Swimlanes, Backlog & Poker, Epic Gantt, Delivery Calendar, Forms Portal, Visual Workflow & RBAC, Discovery RICE, JSM Incidents, Confluence Wiki, Undo/Redo, and Self-Driving AI Autopilot.'
                  : '14 modul lengkap setara Atlassian Cloud: Sidebar Proyek Kiri, Ruang Multi-Proyek (DX/FIN/OPS/AI), Swimlane WIP, Backlog & Poker, Gantt Epic, Kalender Delivery, Portal Formulir, Desainer Workflow & RBAC, Discovery RICE, Insiden JSM, Wiki Confluence, Undo/Redo, serta AI Autopilot Otonom.'}
              </p>
            </div>

            <div className="home-jira-controls">
              <button
                type="button"
                className="button button-primary"
                data-testid="home-jira-autopilot-demo-btn"
                onClick={() => setOptimized(true)}
              >
                <Zap size={15} />{' '}
                {optimized
                  ? en
                    ? 'Autopilot Applied (98% Confidence)'
                    : 'Autopilot Aktif (Keyakinan 98%)'
                  : en
                    ? 'Simulate AI Sprint Autopilot'
                    : 'Simulasikan AI Autopilot'}
              </button>
              {optimized && (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setOptimized(false)}
                >
                  <RotateCcw size={14} /> {en ? 'Reset' : 'Reset'}
                </button>
              )}
              <Link className="button button-ghost" to="/jira">
                {en ? 'Open Full Jira OS' : 'Buka Jira Lengkap'} <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="home-jira-mini-board">
            {cols.map(col => {
              const items = tickets.filter(t => t.col === col.id)
              return (
                <div className="home-jira-col" key={col.id}>
                  <div className="home-jira-col-head">
                    <span>{en ? col.en : col.idLabel}</span>
                    <span>{items.reduce((s, i) => s + i.sp, 0)} SP</span>
                  </div>
                  {items.map(item => (
                    <div className="home-jira-ticket" key={item.key}>
                      <div className="home-jira-ticket-meta">
                        <span>{item.key}</span>
                        <span>{item.badge}</span>
                      </div>
                      <strong>{en ? item.titleEn : item.titleId}</strong>
                      <div className="home-jira-ticket-meta">
                        <span>@{item.owner}</span>
                        <span>{item.sp} SP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="home-jira-foot">
            <div className="home-jira-module-pills">
              <span className="home-jira-module-pill">Multi-Project Shell</span>
              <span className="home-jira-module-pill">Kanban WIP & Swimlanes</span>
              <span className="home-jira-module-pill">Delivery Calendar</span>
              <span className="home-jira-module-pill">Forms Intake Portal</span>
              <span className="home-jira-module-pill">Visual Workflow & RBAC</span>
              <span className="home-jira-module-pill">Discovery RICE & JSM</span>
              <span className="home-jira-module-pill">Confluence PRD/ADR</span>
              <span className="home-jira-module-pill">Live JQL & REST v3 ADF</span>
            </div>
            <span>
              {optimized ? (
                <>
                  <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                  {en
                    ? 'AI Brain rebalanced Rizky -> Nadia, decoupled DX-104 & scheduled Sprint 25!'
                    : 'Otak AI menyeimbangkan beban Rizky -> Nadia, membuka DX-104 & menjadwalkan Sprint 25!'}
                </>
              ) : (
                <>
                  <BrainCircuit size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                  {en
                    ? 'Click "Simulate AI Sprint Autopilot" or open /jira for full workspace'
                    : 'Klik "Simulasikan AI Autopilot" atau buka /jira untuk fitur penuh'}
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
