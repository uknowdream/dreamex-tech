export type AiProviderId = 'gemini' | 'openai'

export interface ByokAiConfig {
  provider: AiProviderId
  apiKey: string
  model: string
  customEndpoint?: string
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
}

const SESSION_STORAGE_KEY = 'dreamex-byok-ai-session-v1'

export const DEFAULT_MODELS: Record<AiProviderId, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
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

function validateHttpsEndpoint(rawUrl: string): URL {
  const parsed = new URL(rawUrl.trim())
  if (parsed.protocol !== 'https:') {
    throw new Error('Endpoint must use strict HTTPS.')
  }
  if (parsed.username || parsed.password) {
    throw new Error('Embedded URL credentials are not permitted.')
  }
  return parsed
}

/**
 * Executes direct browser-to-LLM inference over HTTPS using the caller's ephemeral BYOK API key.
 * Falls back cleanly with descriptive errors if rate-limited, unauthorized, or CORS-blocked.
 */
export async function generateWithByokAi(
  config: ByokAiConfig,
  request: AiSynthesisRequest,
): Promise<AiSynthesisResult> {
  const key = config.apiKey.trim()
  if (!key) {
    throw new Error('No BYOK API key configured in this session.')
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 28_000)
  const started = performance.now()
  const model = config.model.trim() || DEFAULT_MODELS[config.provider][0]

  try {
    if (config.provider === 'gemini') {
      const safeModel = encodeURIComponent(model)
      const endpoint = config.customEndpoint?.trim()
        ? validateHttpsEndpoint(config.customEndpoint)
        : new URL(`https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent`)

      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
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

      const data = (await response.json().catch(() => ({}))) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        error?: { message?: string }
      }
      if (!response.ok) {
        throw new Error(data.error?.message || `Gemini API returned HTTP ${response.status}.`)
      }
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map(part => part.text ?? '')
        .join('')
        .trim()
      if (!text) {
        throw new Error('Gemini returned an empty synthesis response.')
      }
      return {
        text,
        provider: 'gemini',
        model,
        latencyMs: Math.round(performance.now() - started),
      }
    }

    const endpoint = config.customEndpoint?.trim()
      ? validateHttpsEndpoint(config.customEndpoint)
      : new URL('https://api.openai.com/v1/chat/completions')

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: request.temperature ?? 0.35,
        max_tokens: request.maxTokens ?? 1400,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    })

    const data = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>
      error?: { message?: string }
    }
    if (!response.ok) {
      throw new Error(data.error?.message || `LLM endpoint returned HTTP ${response.status}.`)
    }
    const text = (data.choices?.[0]?.message?.content ?? '').trim()
    if (!text) {
      throw new Error('LLM endpoint returned an empty response.')
    }
    return {
      text,
      provider: 'openai',
      model,
      latencyMs: Math.round(performance.now() - started),
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Live AI synthesis timed out after 28s. Try a concise prompt or deterministic mode.')
    }
    throw err
  } finally {
    window.clearTimeout(timeout)
  }
}
