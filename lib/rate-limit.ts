const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimit.get(key)

  if (!record || now > record.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count }
}

// Cleanup stale entries to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  rateLimit.forEach((record, key) => {
    if (now > record.resetTime) rateLimit.delete(key)
  })
}, 60000)
