import { neon } from '@neondatabase/serverless'

/**
 * 100% Vercel-Native Unified Storage Adapter (Zero External VPS Required)
 * Auto-detects whichever storage the user attaches in Vercel Dashboard -> Storage:
 *   1. Neon Serverless Postgres (Vercel Marketplace Native: DATABASE_URL / POSTGRES_URL)
 *   2. Upstash Serverless Redis (Vercel Marketplace Native: UPSTASH_REDIS_REST_URL / KV_REST_API_URL)
 *   3. Vercel Blob (1st-Party Vercel Storage: BLOB_READ_WRITE_TOKEN)
 *   4. Stateless Sovereign Fallback (Zero-DB localStorage + BroadcastChannel + ?sync= URL)
 */

let pgSchemaReady = false

function readPostgresUrl() {
  const raw = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') return ''
    return raw
  } catch {
    return ''
  }
}

function readRedisConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  if (!url || !token) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return null
    return { url: url.replace(/\/+$/, ''), token }
  } catch {
    return null
  }
}

function readBlobToken() {
  const token = (process.env.BLOB_READ_WRITE_TOKEN || '').trim()
  return token.length >= 12 ? token : ''
}

export function getVercelStorageInfo() {
  const pgUrl = readPostgresUrl()
  if (pgUrl) {
    return {
      configured: true,
      driver: 'neon-postgres',
      supportedVercelDrivers: ['neon-postgres', 'upstash-redis', 'vercel-blob'],
    }
  }
  const redis = readRedisConfig()
  if (redis) {
    return {
      configured: true,
      driver: 'upstash-redis',
      supportedVercelDrivers: ['neon-postgres', 'upstash-redis', 'vercel-blob'],
    }
  }
  const blobToken = readBlobToken()
  if (blobToken) {
    return {
      configured: true,
      driver: 'vercel-blob',
      supportedVercelDrivers: ['neon-postgres', 'upstash-redis', 'vercel-blob'],
    }
  }
  return {
    configured: false,
    driver: 'stateless-sovereign',
    supportedVercelDrivers: ['neon-postgres', 'upstash-redis', 'vercel-blob'],
  }
}

async function ensurePgTable(sql) {
  if (pgSchemaReady) return
  await sql`
    CREATE TABLE IF NOT EXISTS dreamex_kv_store (
      storage_key VARCHAR(160) PRIMARY KEY,
      payload_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    )
  `
  pgSchemaReady = true
}

async function redisCommand(config, command) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(6_000),
  })
  if (!response.ok) throw new Error('Redis storage request failed')
  const payload = await response.json()
  if (payload && typeof payload === 'object' && payload.error) {
    throw new Error('Redis rejected command')
  }
  return payload?.result
}

function blobPathFor(storageKey) {
  const safe = String(storageKey).replace(/[^a-zA-Z0-9._:/-]/g, '_').replaceAll(':', '/')
  return `dreamex-store/${safe}.json`
}

async function blobGet(token, storageKey) {
  const pathname = blobPathFor(storageKey)
  const listRes = await fetch(
    `https://blob.vercel-storage.com?prefix=${encodeURIComponent(pathname)}&limit=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6_000),
    },
  )
  if (!listRes.ok) throw new Error('Vercel Blob list failed')
  const listData = await listRes.json()
  const match = Array.isArray(listData?.blobs)
    ? listData.blobs.find(b => b.pathname === pathname) || listData.blobs[0]
    : null
  if (!match?.url) return null
  const dataRes = await fetch(match.url, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(6_000),
  })
  if (!dataRes.ok) return null
  return dataRes.json()
}

async function blobPut(token, storageKey, value) {
  const pathname = blobPathFor(storageKey)
  const putRes = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'x-add-random-suffix': '0',
      'x-cache-control-max-age': '0',
    },
    body: JSON.stringify(value),
    signal: AbortSignal.timeout(6_000),
  })
  if (!putRes.ok) throw new Error('Vercel Blob write failed')
  return true
}

export async function vercelStorageGet(storageKey) {
  const pgUrl = readPostgresUrl()
  if (pgUrl) {
    const sql = neon(pgUrl)
    await ensurePgTable(sql)
    const rows = await sql`
      SELECT payload_json
      FROM dreamex_kv_store
      WHERE storage_key = ${storageKey}
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `
    return rows?.[0]?.payload_json ?? null
  }

  const redis = readRedisConfig()
  if (redis) {
    const raw = await redisCommand(redis, ['GET', storageKey])
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  }

  const blobToken = readBlobToken()
  if (blobToken) {
    return blobGet(blobToken, storageKey)
  }

  return null
}

export async function vercelStorageSet(storageKey, value, ttlSeconds = 60 * 60 * 24 * 30) {
  const pgUrl = readPostgresUrl()
  if (pgUrl) {
    const sql = neon(pgUrl)
    await ensurePgTable(sql)
    const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null
    await sql`
      INSERT INTO dreamex_kv_store (storage_key, payload_json, updated_at, expires_at)
      VALUES (${storageKey}, ${JSON.stringify(value)}::jsonb, NOW(), ${expiresAt})
      ON CONFLICT (storage_key)
      DO UPDATE SET payload_json = EXCLUDED.payload_json, updated_at = NOW(), expires_at = EXCLUDED.expires_at
    `
    return { ok: true, driver: 'neon-postgres' }
  }

  const redis = readRedisConfig()
  if (redis) {
    const args = ttlSeconds > 0
      ? ['SET', storageKey, JSON.stringify(value), 'EX', ttlSeconds]
      : ['SET', storageKey, JSON.stringify(value)]
    await redisCommand(redis, args)
    return { ok: true, driver: 'upstash-redis' }
  }

  const blobToken = readBlobToken()
  if (blobToken) {
    await blobPut(blobToken, storageKey, value)
    return { ok: true, driver: 'vercel-blob' }
  }

  return { ok: false, driver: 'stateless-sovereign' }
}
