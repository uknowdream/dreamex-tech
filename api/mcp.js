import { applyRateLimitHeaders, clientKey, createRateLimiter } from './_rateLimit.js'

const MAX_BODY_BYTES = 16_384
const mcpLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000 })

export function resetMcpRateLimiter() {
  mcpLimiter.reset()
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
  if (payload === null) {
    res.end()
    return
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const MCP_TOOLS = [
  {
    name: 'calculate_usl_scalability',
    description: 'Compute Gunther Universal Scalability Law (USL) node ceiling N_max, throughput capacity, and Little’s Law database connection pool sizing.',
    inputSchema: {
      type: 'object',
      properties: {
        alphaContention: { type: 'number', description: 'Serial contention factor alpha (0.001 to 0.5)', default: 0.025 },
        betaCoherency: { type: 'number', description: 'Cross-node coherency penalty beta (0.00001 to 0.05)', default: 0.0008 },
        baseRpsPerNode: { type: 'number', description: 'Single-node baseline throughput RPS', default: 1200 },
        avgQueryMs: { type: 'number', description: 'Average database query time in ms', default: 8 },
      },
    },
  },
  {
    name: 'compile_gherkin_bdd',
    description: 'Compile a business requirement intent into deterministic Gherkin BDD scenarios and bi-directional RTM IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string', description: 'Feature title' },
        requirement: { type: 'string', description: 'System intent or acceptance rule' },
      },
      required: ['featureName', 'requirement'],
    },
  },
  {
    name: 'forecast_monte_carlo_sprint',
    description: 'Forecast P50, P85, and P95 sprint completion confidence for a given backlog size and historical velocity range.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItems: { type: 'number', description: 'Remaining stories or points', default: 42 },
        minVelocity: { type: 'number', description: 'Minimum historical velocity per sprint', default: 9 },
        maxVelocity: { type: 'number', description: 'Maximum historical velocity per sprint', default: 16 },
      },
    },
  },
  {
    name: 'estimate_llm_token_economics',
    description: 'Model 30-day LLM token volume, semantic cache ROI savings, and Little’s Law peak worker concurrency.',
    inputSchema: {
      type: 'object',
      properties: {
        dailyRequests: { type: 'number', default: 100000 },
        tokensPerRequest: { type: 'number', default: 2400 },
        cacheHitPercent: { type: 'number', default: 55 },
        p95LatencyMs: { type: 'number', default: 450 },
      },
    },
  },
]

function executeMcpTool(name, args = {}) {
  if (name === 'calculate_usl_scalability') {
    const alpha = Math.max(0.0005, Math.min(0.9, Number(args.alphaContention) || 0.025))
    const beta = Math.max(0.00001, Math.min(0.2, Number(args.betaCoherency) || 0.0008))
    const baseRps = Math.max(10, Math.min(500_000, Number(args.baseRpsPerNode) || 1200))
    const avgQueryMs = Math.max(0.5, Math.min(5000, Number(args.avgQueryMs) || 8))
    const nMax = Math.max(1, Math.floor(Math.sqrt((1 - alpha) / beta)))
    const cMax = nMax / (1 + alpha * (nMax - 1) + beta * nMax * (nMax - 1))
    const peakRps = Math.round(baseRps * cMax)
    const dbPoolPerNode = Math.max(4, Math.ceil(((peakRps / nMax) * (avgQueryMs / 1000)) * 1.35))
    return { nMaxNodes: nMax, relativeCapacityGain: Number(cMax.toFixed(2)), peakClusterRps: peakRps, recommendedDbPoolPerNode: dbPoolPerNode }
  }

  if (name === 'compile_gherkin_bdd') {
    const feature = String(args.featureName || 'Autonomous System Capability').slice(0, 120)
    const req = String(args.requirement || 'Enforce idempotent execution and RBAC authorization').slice(0, 400)
    const gherkin = [
      `Feature: ${feature}`,
      `  # RTM-REQ-001 · Synthesized by DreamEx MCP`,
      `  Scenario: Deterministic happy-path & idempotency verification`,
      `    Given an authenticated principal with authorized RBAC scope`,
      `    When the client dispatches "${req}" with a SHA-256 idempotency key`,
      `    Then the service commits atomically and returns HTTP 200 with zero duplicate side effects`,
    ].join('\n')
    return { rtmId: 'RTM-REQ-001', gherkin }
  }

  if (name === 'forecast_monte_carlo_sprint') {
    const backlog = Math.max(1, Math.min(5000, Number(args.backlogItems) || 42))
    const minV = Math.max(1, Math.min(500, Number(args.minVelocity) || 9))
    const maxV = Math.max(minV, Math.min(1000, Number(args.maxVelocity) || 16))
    const trials = 2000
    const results = []
    let seed = 1337
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0xffffffff
    }
    for (let i = 0; i < trials; i += 1) {
      let rem = backlog
      let sprints = 0
      while (rem > 0 && sprints < 200) {
        const v = minV + nextRand() * (maxV - minV)
        rem -= v
        sprints += 1
      }
      results.push(sprints)
    }
    results.sort((a, b) => a - b)
    return {
      trials,
      p50Sprints: results[Math.floor(trials * 0.5)],
      p85Sprints: results[Math.floor(trials * 0.85)],
      p95Sprints: results[Math.floor(trials * 0.95)],
    }
  }

  if (name === 'estimate_llm_token_economics') {
    const daily = Math.max(100, Math.min(100_000_000, Number(args.dailyRequests) || 100_000))
    const tok = Math.max(50, Math.min(128_000, Number(args.tokensPerRequest) || 2400))
    const cachePct = Math.max(0, Math.min(95, Number(args.cacheHitPercent) || 55))
    const p95Ms = Math.max(5, Math.min(30_000, Number(args.p95LatencyMs) || 450))
    const monthlyMillionTokens = (daily * 30 * tok) / 1_000_000
    const uncachedUsd = Math.round(monthlyMillionTokens * 6.5)
    const hybridCachedUsd = Math.round(monthlyMillionTokens * (1 - cachePct / 100) * 1.95 + monthlyMillionTokens * (cachePct / 100) * 0.12)
    const peakWorkers = Math.max(2, Math.ceil((daily / 86400) * 4.5 * (p95Ms / 1000)))
    return {
      monthlyMillionTokens: Number(monthlyMillionTokens.toFixed(1)),
      uncachedFrontierMonthlyUsd: uncachedUsd,
      optimizedHybridMonthlyUsd: hybridCachedUsd,
      savingsPercent: Math.max(0, Math.round(((uncachedUsd - hybridCachedUsd) / Math.max(1, uncachedUsd)) * 100)),
      littlesLawPeakWorkers: peakWorkers,
    }
  }

  return null
}

function parseJsonBody(req) {
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) return { error: 'payload_too_large' }
    try { return { value: JSON.parse(req.body) } } catch { return { error: 'parse_error' } }
  }
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return { value: req.body }
  }
  return { error: 'invalid_request' }
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, null)
  }

  const limit = mcpLimiter.check(clientKey(req, 'mcp:rpc'))
  applyRateLimitHeaders(res, limit)
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'rate_limit_exceeded', retryAfterSec: limit.retryAfterSec })
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      protocol: 'Model Context Protocol (Streamable HTTP JSON-RPC 2.0)',
      protocolVersion: '2025-03-26',
      serverInfo: { name: 'dreamex-os-mcp', version: '6.0.0', homepage: 'https://dreamex.tech' },
      tools: MCP_TOOLS.map(tool => ({ name: tool.name, description: tool.description })),
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const parsed = parseJsonBody(req)
  if (parsed.error) {
    return sendJson(res, 400, {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: parsed.error },
    })
  }

  const rpc = parsed.value
  const id = rpc.id ?? null
  const method = rpc.method

  if (method === 'initialize') {
    return sendJson(res, 200, {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'dreamex-os-mcp', version: '6.0.0' },
      },
    })
  }

  if (method === 'notifications/initialized') {
    return sendJson(res, 202, { jsonrpc: '2.0', result: { acknowledged: true } })
  }

  if (method === 'tools/list') {
    return sendJson(res, 200, {
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS },
    })
  }

  if (method === 'tools/call') {
    const toolName = rpc.params?.name
    const toolArgs = rpc.params?.arguments ?? {}
    const output = executeMcpTool(toolName, toolArgs)
    if (!output) {
      return sendJson(res, 200, {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown tool: ${String(toolName)}` },
      })
    }
    return sendJson(res, 200, {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      },
    })
  }

  return sendJson(res, 200, {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${String(method)}` },
  })
}
