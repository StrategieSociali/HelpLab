// src/routes/v1/leaderboard.ts
/**
 * Scopo: classifiche utenti aggregate per punteggi verificati
 *
 * Funzionalità:
 * - GET /leaderboard/users → classifica globale (tutti gli utenti)
 * - GET /challenges/:id/leaderboard → classifica per singola challenge
 *
 * Entrambi supportano filtro temporale (window: all, this_week, this_month)
 * e paginazione (limit, offset).
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { generateLeaderboardCacheKey } from '../../services/leaderboardService.js'
import { getCache, setCache } from '../../utils/memoryCache.js'

// Helper: calcola data "since" dal parametro window
function computeSince(window: string): Date | null {
  if (window === 'this_week') {
    return new Date(Date.now() - 7 * 86400000)
  }
  if (window === 'this_month') {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  }
  return null
}

export async function leaderboardV1Routes(app: FastifyInstance) {

  // ============================================================
  // 1. CLASSIFICA GLOBALE UTENTI
  // ============================================================
  app.get('/leaderboard/users', {
    schema: {
      tags: ['Leaderboard v1'],
      summary: 'Classifica utenti per punteggio verificato',
      querystring: {
        type: 'object',
        properties: {
          window: { type: 'string', enum: ['all', 'this_week', 'this_month'], default: 'all' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (req: any, reply) => {
    const { window = 'all', limit = 50, offset = 0 } = req.query

    const cacheKey = generateLeaderboardCacheKey('user-global', {
      window, limit, offset
    })

    const cached = getCache(cacheKey)
    if (cached) {
      req.log.info({ cacheKey }, 'Global leaderboard cache HIT')
      return reply.send(cached)
    }

    const since = computeSince(window)
    let rows: any[]

    if (!since) {
      // window = 'all' → leggi direttamente da challenge_scores (aggregato)
      rows = await prisma.$queryRaw`
        SELECT cs.user_id, u.username AS user,
               SUM(cs.score) AS score,
               SUM(cs.verified_tasks_count) AS verified_tasks,
               MAX(cs.last_event_at) AS last_event_at
        FROM challenge_scores cs
        JOIN users u ON u.id = cs.user_id
        GROUP BY cs.user_id, u.username
        ORDER BY score DESC, verified_tasks DESC, last_event_at ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    } else {
      // window filtrato → leggi da points_transactions
      rows = await prisma.$queryRaw`
        SELECT pt.user_id, u.username AS user,
               SUM(pt.delta) AS score,
               SUM(pt.event = 'task_completed_verified') AS verified_tasks,
               MAX(pt.created_at) AS last_event_at
        FROM points_transactions pt
        JOIN users u ON u.id = pt.user_id
        WHERE pt.created_at >= ${since}
        GROUP BY pt.user_id, u.username
        ORDER BY score DESC, verified_tasks DESC, last_event_at ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    }

    const entries = rows.map((r: any, i: number) => ({
      rank: i + 1 + Number(offset),
      userId: Number(r.user_id),
      user: r.user,
      score: Number(r.score ?? 0),
      verified_tasks: Number(r.verified_tasks ?? 0),
      last_event_at: r.last_event_at ? new Date(r.last_event_at).toISOString() : null
    }))

    const result = {
      version: '1.0',
      window,
      updatedAt: new Date().toISOString(),
      entries,
      total_entries: entries.length
    }

    setCache(cacheKey, result, 60_000)
    req.log.info({ cacheKey }, 'Global leaderboard cached')

    return reply.send(result)
  })

  // ============================================================
  // 2. CLASSIFICA PER SINGOLA CHALLENGE
  // ============================================================
  app.get('/challenges/:id/leaderboard', {
    schema: {
      tags: ['Scoring v1'],
      summary: 'Leaderboard per challenge',
      querystring: {
        type: 'object',
        properties: {
          window: { type: 'string', enum: ['all', 'this_week', 'this_month'], default: 'all' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (req: any, reply) => {
    const challengeId = BigInt(req.params.id)
    const { window = 'all', limit = 50, offset = 0 } = req.query

    const cacheKey = generateLeaderboardCacheKey('challenge', {
      challenge_id: challengeId, window, limit, offset
    })

    const cached = getCache(cacheKey)
    if (cached) {
      req.log.info({ cacheKey }, 'Challenge leaderboard cache HIT')
      return reply.send(cached)
    }

    const since = computeSince(window)
    let rows: any[]

    if (!since) {
      rows = await prisma.$queryRaw`
        SELECT cs.user_id, u.username AS user,
               cs.score, cs.verified_tasks_count AS verified_tasks,
               cs.last_event_at
        FROM challenge_scores cs
        JOIN users u ON u.id = cs.user_id
        WHERE cs.challenge_id = ${challengeId}
        ORDER BY cs.score DESC, cs.verified_tasks_count DESC, cs.last_event_at ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    } else {
      rows = await prisma.$queryRaw`
        SELECT pt.user_id, u.username AS user,
               SUM(pt.delta) AS score,
               SUM(pt.event = 'task_completed_verified') AS verified_tasks,
               MAX(pt.created_at) AS last_event_at
        FROM points_transactions pt
        JOIN users u ON u.id = pt.user_id
        WHERE pt.challenge_id = ${challengeId}
          AND pt.created_at >= ${since}
        GROUP BY pt.user_id, u.username
        ORDER BY score DESC, verified_tasks DESC, last_event_at ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    }

    const entries = rows.map((r: any, i: number) => ({
      rank: i + 1 + Number(offset),
      userId: Number(r.user_id),
      user: r.user,
      score: Number(r.score ?? 0),
      verified_tasks: Number(r.verified_tasks ?? 0),
      last_event_at: r.last_event_at ? new Date(r.last_event_at).toISOString() : null
    }))

    const result = {
      version: '1.0',
      challengeId: Number(challengeId),
      window,
      updatedAt: new Date().toISOString(),
      entries,
      total_entries: entries.length
    }

    setCache(cacheKey, result, 60_000)
    req.log.info({ cacheKey }, 'Challenge leaderboard cached')

    return reply.send(result)
  })
}