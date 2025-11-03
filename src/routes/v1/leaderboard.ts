// src/routes/v1/leaderboard.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'

export async function leaderboardV1Routes(app: FastifyInstance) {
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
      },
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            challengeId: { type: 'number' },
            window: { type: 'string' },
            updatedAt: { type: 'string' },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rank: { type: 'integer' },
                  userId: { type: 'number' },
                  user: { type: 'string' },
                  score: { type: 'number' },
                  verified_tasks: { type: 'number' },
                  last_event_at: { anyOf: [{ type: 'string' }, { type: 'null' }] }
                }
              }
            },
            total_entries: { type: 'integer' }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const challengeId = BigInt(req.params.id)
    const { window = 'all', limit = 50, offset = 0 } = req.query
    const now = new Date()
    let since: Date | null = null

    // ✅ Fix micro bug: variabile "d" usata prima della dichiarazione
    if (window === 'this_week') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      since = d
    } else if (window === 'this_month') {
      const today = new Date()
      since = new Date(today.getFullYear(), today.getMonth(), 1)
    }

    let rows: any[] = []

    if (window === 'all') {
      // ✅ Usa query parametrica sicura (Prisma gestisce escaping)
      rows = await prisma.$queryRaw`
        SELECT cs.user_id, u.username AS user,
               cs.score, cs.verified_tasks_count AS verified_tasks,
               cs.last_event_at
        FROM challenge_scores cs
        JOIN users u ON u.id = cs.user_id
        WHERE cs.challenge_id = ${challengeId}
        ORDER BY cs.score DESC,
                 cs.verified_tasks_count DESC,
                 cs.last_event_at ASC,
                 cs.user_id ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    } else {
      // ✅ Aggregazione temporale — anche qui parametri safe
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
        ORDER BY score DESC,
                 verified_tasks DESC,
                 last_event_at ASC,
                 pt.user_id ASC
        LIMIT ${Number(limit)} OFFSET ${Number(offset)};
      `
    }

    const entries = rows.map((r, i) => ({
      rank: i + 1 + Number(offset),
      userId: Number(r.user_id),
      user: r.user,
      score: Number(r.score ?? 0),
      verified_tasks: Number(r.verified_tasks ?? 0),
      last_event_at: r.last_event_at
        ? new Date(r.last_event_at).toISOString()
        : null
    }))

    const result = {
      version: '1.0',
      challengeId: Number(challengeId),
      window,
      updatedAt: now.toISOString(),
      entries,
      total_entries: entries.length
    }

    return reply.send(result)
  })
}
