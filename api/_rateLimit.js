const DEFAULT_MAX_BUCKETS = 2000

export function clientKey(req, scope) {
  const forwarded = typeof req.headers?.['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : ''
  const realIp = typeof req.headers?.['x-real-ip'] === 'string'
    ? req.headers['x-real-ip'].trim()
    : ''
  const ip = forwarded || realIp || 'local-client'
  return `${scope}:${ip.slice(0, 80)}`
}

/**
 * Bounded per-runtime fixed-window rate limiter to throttle burst abuse and token guessing
 * without adding external latency or requiring Redis credentials on cold endpoints.
 */
export function createRateLimiter({ maxRequests, windowMs }) {
  const buckets = new Map()

  return {
    check(key, now = Date.now()) {
      for (const [entryKey, entry] of buckets) {
        if (entry.resetAt <= now) {
          buckets.delete(entryKey)
        }
      }
      while (buckets.size >= DEFAULT_MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value
        if (oldestKey === undefined) break
        buckets.delete(oldestKey)
      }

      const existing = buckets.get(key)
      if (!existing || existing.resetAt <= now) {
        const next = { count: 1, resetAt: now + windowMs }
        buckets.set(key, next)
        return {
          allowed: true,
          limit: maxRequests,
          remaining: Math.max(0, maxRequests - 1),
          retryAfterSec: 0,
        }
      }

      existing.count += 1
      if (existing.count > maxRequests) {
        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        }
      }

      return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - existing.count),
        retryAfterSec: 0,
      }
    },
    reset() {
      buckets.clear()
    },
  }
}

export function applyRateLimitHeaders(res, result) {
  res.setHeader('X-RateLimit-Limit', String(result.limit))
  res.setHeader('X-RateLimit-Remaining', String(result.remaining))
  if (!result.allowed && result.retryAfterSec > 0) {
    res.setHeader('Retry-After', String(result.retryAfterSec))
  }
}
