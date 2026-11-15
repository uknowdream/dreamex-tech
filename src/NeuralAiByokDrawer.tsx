import { useState } from 'react'
import { Check, Copy, KeyRound, Sparkles } from 'lucide-react'
import {
  clearSessionAiConfig,
  DEFAULT_MODELS,
  generateWithByokAi,
  loadSessionAiConfig,
  saveSessionAiConfig,
  type AiProviderId,
} from './aiClient'
import './NeuralAiByokDrawer.css'

export default function NeuralAiByokDrawer({
  en,
  roleLabel,
  commandText,
  promptSeed,
}: {
  en: boolean
  roleLabel: string
  commandText: string
  promptSeed: string
}) {
  const [config, setConfig] = useState(loadSessionAiConfig)
  const [customTask, setCustomTask] = useState('')
  const [busy, setBusy] = useState(false)
  const [output, setOutput] = useState('')
  const [meta, setMeta] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const runLiveAi = () => {
    setError('')
    setBusy(true)
    const prompt =
      customTask.trim() ||
      `Generate an actionable, structured production specification and verification checklist for role "${roleLabel}". Context command: ${commandText}. Seed requirement: ${promptSeed}`
    void generateWithByokAi(config, {
      systemPrompt: `You are DreamEx Neural Core (${roleLabel}). Reply concisely in ${en ? 'English' : 'Indonesian'} with markdown headings and executable code or test bullets.`,
      userPrompt: prompt,
    })
      .then(result => {
        setOutput(result.text)
        setMeta(`${result.provider.toUpperCase()} · ${result.model} · ${result.latencyMs}ms`)
      })
      .catch(cause => {
        setError(cause instanceof Error ? cause.message : en ? 'Live AI call failed.' : 'Permintaan AI gagal.')
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="byok-drawer" role="region" aria-label={en ? 'BYOK Live AI Engine' : 'Mesin AI Langsung BYOK'}>
      <div className="byok-drawer-head">
        <span className="section-kicker">BYOK LIVE FRONTIER AI · SESSION-ONLY KEY</span>
        {meta && <span className="byok-meta-badge">{meta}</span>}
      </div>
      <div className="byok-grid">
        <label className="byok-field">
          <span>{en ? 'Provider' : 'Penyedia'}</span>
          <select
            aria-label={en ? 'AI Provider' : 'Penyedia AI'}
            value={config.provider}
            onChange={e => {
              const provider = e.target.value as AiProviderId
              const next = { ...config, provider, model: DEFAULT_MODELS[provider][0] }
              setConfig(next)
              saveSessionAiConfig(next)
            }}
          >
            <option value="gemini">Google Gemini API</option>
            <option value="openai">OpenAI Compatible</option>
          </select>
        </label>
        <label className="byok-field">
          <span>{en ? 'Model' : 'Model'}</span>
          <input
            aria-label={en ? 'AI Model ID' : 'ID Model AI'}
            value={config.model}
            onChange={e => {
              const next = { ...config, model: e.target.value }
              setConfig(next)
              saveSessionAiConfig(next)
            }}
          />
        </label>
        <label className="byok-field byok-field-wide">
          <span>{en ? 'Session API Key (sessionStorage only)' : 'API Key Sesi (sessionStorage saja)'}</span>
          <input
            type="password"
            autoComplete="off"
            aria-label={en ? 'BYOK Session API Key' : 'API Key Sesi BYOK'}
            placeholder={config.provider === 'gemini' ? 'AIza...' : 'sk-...'}
            value={config.apiKey}
            onChange={e => {
              const next = { ...config, apiKey: e.target.value }
              setConfig(next)
              saveSessionAiConfig(next)
            }}
          />
        </label>
      </div>
      <label className="byok-field">
        <span>{en ? 'Custom Live Prompt (optional)' : 'Prompt Khusus Langsung (opsional)'}</span>
        <input
          value={customTask}
          onChange={e => setCustomTask(e.target.value)}
          placeholder={en ? 'e.g. Review my settlement idempotency edge cases and generate Playwright specs' : 'cth: Tinjau edge case idempotency pembayaran & buat skrip Playwright'}
        />
      </label>
      <div className="byok-actions">
        <button type="button" className="button button-primary" disabled={busy} onClick={runLiveAi}>
          <Sparkles size={14} /> {busy ? (en ? 'Streaming AI…' : 'Memproses AI…') : en ? 'Run Live AI Synthesis' : 'Jalankan Sintesis AI Langsung'}
        </button>
        {config.apiKey && (
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              clearSessionAiConfig()
              setConfig(loadSessionAiConfig())
              setOutput('')
              setMeta('')
            }}
          >
            <KeyRound size={14} /> {en ? 'Clear Key' : 'Hapus Kunci'}
          </button>
        )}
      </div>
      {error && (
        <p className="byok-error" role="alert">
          {error}
        </p>
      )}
      {output && (
        <div className="byok-output-wrap">
          <div className="byok-output-head">
            <span>LIVE LLM OUTPUT</span>
            <button
              type="button"
              className="byok-copy-btn"
              onClick={() =>
                void navigator.clipboard.writeText(output).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1800)
                })
              }
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? (en ? 'Copied' : 'Tersalin') : en ? 'Copy' : 'Salin'}
            </button>
          </div>
          <pre className="byok-output">
            <code>{output}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
