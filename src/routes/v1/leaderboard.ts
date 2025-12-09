// src/routes/v1/leaderboard.ts

import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { getUserLeaderboard, generateLeaderboardCacheKey } from '../../services/leaderboardService.js'
import { getCache, setCache } from '../../utils/memoryCache.js'

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
          type: { type: 'string', enum: ['climate', 'social'], nullable: true },
          difficulty: { type: 'string', enum: ['low', 'medium', 'high'], nullable: true },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (req: any, reply) => {

    const { window = 'all', type, difficulty, limit = 50, offset = 0 } = req.query

    const cacheKey = generateLeaderboardCacheKey('user-global', {
      window, type, difficulty, limit, offset
    })

    // ---------------------
    // CACHE CHECK
    // ---------------------
    const cached = getCache(cacheKey)
    if (cached) {
      req.log.info({ cacheKey }, 'Global leaderboard cache HIT')
      return reply.send(cached)
    }

    // ---------------------
    // QUERY DB
    // ---------------------
    const entries = await getUserLeaderboard({ window, type, difficulty, limit, offset })

    const result = {
      version: '1.0',
      window,
      updatedAt: new Date().toISOString(),
      entries,
      total_entries: entries.length
    }

    // ---------------------
    // CACHE SET
    // ---------------------
    setCache(cacheKey, result, 60_000) // TTL 60 sec
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

    // ---------------------
    // CACHE CHECK
    // ---------------------
    const cached = getCache(cacheKey)
    if (cached) {
      req.log.info({ cacheKey }, 'Challenge leaderboard cache HIT')
      return reply.send(cached)
    }

    // ---------------------
    // CALCOLO WINDOW
    // ---------------------
    let since: Date | null = null
    if (window === 'this_week') {
      since = new Date(Date.now() - 7 * 86400000)
    } else if (window === 'this_month') {
      const t = new Date()
      since = new Date(t.getFullYear(), t.getMonth(), 1)
    }

    // ---------------------
    // QUERY DB
    // ---------------------
    let rows: any[] = []

    if (window === 'all') {
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
          AND pt.created_at >= ${since!}
        GROUP BY pt.user_id, u.username
        ORDER BY score DESC, verified_tasks DESC, last_event_at ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    }

    const entries = rows.map((r, i) => ({
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

    // ---------------------
    // CACHE SET
    // ---------------------
    setCache(cacheKey, result, 60_000)
    req.log.info({ cacheKey }, 'Challenge leaderboard cached')

    return reply.send(result)
  })
}
