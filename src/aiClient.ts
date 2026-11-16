export type AiProviderId = 'gemini' | 'openai'

export interface ByokAiConfig {
  provider: AiProviderId
  apiKey: string
  model: string
  customEndpoint?: string
  allowUntrustedEndpoint?: boolean
}

export interface AiSynthesisRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface AiSynthesisResult {
  text: string
  provider: AiProviderId
  model: string
  latencyMs: number
  streamed: boolean
}

const SESSION_STORAGE_KEY = 'dreamex-byok-ai-session-v1'

export const DEFAULT_MODELS: Record<AiProviderId, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
}

export const TRUSTED_AI_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'openrouter.ai',
  'api.groq.com',
  'api.together.xyz',
  'api.deepseek.com',
])

const PRIVATE_HOST_PATTERNS = [
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
]

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function inspectEndpointTrust(rawUrl: string): { valid: boolean; trusted: boolean; host: string; error?: string } {
  const trimmed = rawUrl.trim()
  if (!trimmed) return { valid: true, trusted: true, host: '' }
  try {
    const parsed = new URL(trimmed)
    if (parsed.username || parsed.password) {
      return { valid: false, trusted: false, host: parsed.hostname, error: 'Embedded URL credentials are not permitted.' }
    }
    const host = parsed.hostname.toLowerCase()
    const loopback = isLoopbackHost(host)
    if (PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(host))) {
      return { valid: false, trusted: false, host, error: 'Private network IP targets are blocked.' }
    }
    if (!loopback && parsed.protocol !== 'https:') {
      return { valid: false, trusted: false, host, error: 'Remote custom endpoints must use strict HTTPS.' }
    }
    if (loopback && parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, trusted: false, host, error: 'Localhost endpoint must use HTTP or HTTPS.' }
    }
    return {
      valid: true,
      trusted: loopback || TRUSTED_AI_HOSTS.has(host),
      host,
    }
  } catch {
    return { valid: false, trusted: false, host: '', error: 'Enter a valid absolute URL.' }
  }
}

function validateEndpointForDispatch(rawUrl: string, allowUntrustedEndpoint: boolean): URL {
  const verdict = inspectEndpointTrust(rawUrl)
  if (!verdict.valid) {
    throw new Error(verdict.error || 'Invalid AI endpoint URL.')
  }
  if (!verdict.trusted && !allowUntrustedEndpoint) {
    throw new Error(`Untrusted host "${verdict.host}". Enable explicit custom-host confirmation before sending your API key.`)
  }
  return new URL(rawUrl.trim())
}

/**
 * Loads BYOK AI runtime configuration from ephemeral sessionStorage (cleared when the tab closes).
 */
export function loadSessionAiConfig(): ByokAiConfig {
  const fallback: ByokAiConfig = {
    provider: 'gemini',
    apiKey: '',
    model: DEFAULT_MODELS.gemini[0],
    customEndpoint: '',
    allowUntrustedEndpoint: false,
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<ByokAiConfig>
    const provider: AiProviderId = parsed.provider === 'openai' ? 'openai' : 'gemini'
    const model =
      typeof parsed.model === 'string' && parsed.model.trim()
        ? parsed.model.trim().slice(0, 80)
        : DEFAULT_MODELS[provider][0]
    return {
      provider,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      model,
      customEndpoint: typeof parsed.customEndpoint === 'string' ? parsed.customEndpoint.trim() : '',
      allowUntrustedEndpoint: Boolean(parsed.allowUntrustedEndpoint),
    }
  } catch {
    return fallback
  }
}

/**
 * Persists BYOK configuration strictly to ephemeral sessionStorage (never localStorage).
 */
export function saveSessionAiConfig(config: ByokAiConfig): void {
  try {
    const clean: ByokAiConfig = {
      provider: config.provider,
      apiKey: config.apiKey.trim(),
      model: config.model.trim() || DEFAULT_MODELS[config.provider][0],
      customEndpoint: config.customEndpoint?.trim() || '',
      allowUntrustedEndpoint: Boolean(config.allowUntrustedEndpoint),
    }
    if (!clean.apiKey && !clean.customEndpoint) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return
    }
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(clean))
  } catch {
    /* sessionStorage disabled in restricted profiles; in-memory state remains active */
  }
}

export function clearSessionAiConfig(): void {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* Ignore storage access errors */
  }
}

function toGeminiStreamEndpoint(model: string, customEndpoint: string, allowUntrusted: boolean): URL {
  if (customEndpoint.trim()) {
    return validateEndpointForDispatch(customEndpoint, allowUntrusted)
  }
  return new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`)
}

function toOpenAiEndpoint(customEndpoint: string, allowUntrusted: boolean): URL {
  if (customEndpoint.trim()) {
    return validateEndpointForDispatch(customEndpoint, allowUntrusted)
  }
  return new URL('https://api.openai.com/v1/chat/completions')
}

async function consumeSseStream(
  response: Response,
  extractDelta: (parsed: unknown) => string,
  onProgress: (accumulated: string, delta: string) => void,
): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as unknown
        const delta = extractDelta(parsed)
        if (delta) {
          accumulated += delta
          onProgress(accumulated, delta)
        }
      } catch {
        /* Ignore partial SSE event keep-alive chunks */
      }
    }
  }

  return accumulated.trim()
}

/**
 * Executes direct browser-to-LLM token streaming over SSE (with graceful non-stream JSON fallback).
 */
export async function generateWithByokAiStream(
  config: ByokAiConfig,
  request: AiSynthesisRequest,
  onProgress: (accumulated: string, delta: string) => void,
  externalSignal?: AbortSignal,
): Promise<AiSynthesisResult> {
  const key = config.apiKey.trim()
  const custom = config.customEndpoint?.trim() || ''
  const isLoopback = custom ? isLoopbackHost(inspectEndpointTrust(custom).host) : false
  if (!key && !isLoopback) {
    throw new Error('No BYOK API key configured in this session.')
  }

  const controller = new AbortController()
  const onExternalAbort = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })
  const timeout = window.setTimeout(() => controller.abort('timeout'), 35_000)
  const started = performance.now()
  const model = config.model.trim() || DEFAULT_MODELS[config.provider][0]

  try {
    if (config.provider === 'gemini') {
      const endpoint = toGeminiStreamEndpoint(model, custom, Boolean(config.allowUntrustedEndpoint))
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'x-goog-api-key': key } : {}),
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.35,
            maxOutputTokens: request.maxTokens ?? 1400,
          },
        }),
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(errData.error?.message || `Gemini API returned HTTP ${response.status}.`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream') && response.body) {
        const text = await consumeSseStream(
          response,
          parsed => {
            const p = parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
            return (p.candidates?.[0]?.content?.parts ?? []).map(part => part.text ?? '').join('')
          },
          onProgress,
        )
        if (!text) throw new Error('Gemini stream completed with empty content.')
        return { text, provider: 'gemini', model, latencyMs: Math.round(performance.now() - started), streamed: true }
      }

      const data = (await response.json().catch(() => ({}))) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = (data.candidates?.[0]?.content?.parts ?? []).map(part => part.text ?? '').join('').trim()
      if (!text) throw new Error('Gemini returned an empty synthesis response.')
      onProgress(text, text)
      return { text, provider: 'gemini', model, latencyMs: Math.round(performance.now() - started), streamed: false }
    }

    const endpoint = toOpenAiEndpoint(custom, Boolean(config.allowUntrustedEndpoint))
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: request.temperature ?? 0.35,
        max_tokens: request.maxTokens ?? 1400,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(errData.error?.message || `LLM endpoint returned HTTP ${response.status}.`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream') && response.body) {
      const text = await consumeSseStream(
        response,
        parsed => {
          const p = parsed as { choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }> }
          return p.choices?.[0]?.delta?.content ?? p.choices?.[0]?.message?.content ?? ''
        },
        onProgress,
      )
      if (!text) throw new Error('LLM stream ended without content.')
      return { text, provider: 'openai', model, latencyMs: Math.round(performance.now() - started), streamed: true }
    }

    const data = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = (data.choices?.[0]?.message?.content ?? '').trim()
    if (!text) throw new Error('LLM endpoint returned an empty response.')
    onProgress(text, text)
    return { text, provider: 'openai', model, latencyMs: Math.round(performance.now() - started), streamed: false }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw new Error('Generation cancelled by user.')
      }
      throw new Error('Live AI synthesis timed out after 35s. Try a concise prompt or deterministic mode.')
    }
    throw err
  } finally {
    window.clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

export async function generateWithByokAi(
  config: ByokAiConfig,
  request: AiSynthesisRequest,
): Promise<AiSynthesisResult> {
  return generateWithByokAiStream(config, request, () => {})
}
