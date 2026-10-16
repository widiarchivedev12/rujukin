import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let chatLimiter: Ratelimit | null = null
let ingestLimiter: Ratelimit | null = null

function getLimiters(): { chat: Ratelimit; ingest: Ratelimit } {
  if (!chatLimiter || !ingestLimiter) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    chatLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rujukin:chat',
    })
    ingestLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rujukin:ingest',
    })
  }
  return { chat: chatLimiter, ingest: ingestLimiter }
}

export type LimitResult = { success: boolean; limit: number; remaining: number; reset: number }

export async function checkChatLimit(userId: string): Promise<LimitResult> {
  return getLimiters().chat.limit(userId)
}

export async function checkIngestLimit(userId: string): Promise<LimitResult> {
  return getLimiters().ingest.limit(userId)
}
