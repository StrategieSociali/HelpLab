import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'

export async function summaryV1Routes(app: FastifyInstance) {
  // ============================================================
  // GET /api/v1/challenges/:id/summary
  // → Riepilogo challenge con stats submissions e top leaderboard
  // ============================================================
  app.get('/challenges/:id/summary', {
    schema: {
      tags: ['Challenges v1'],
      summary: 'Riepilogo challenge con statistiche e top leaderboard',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            challenge: { type: 'object' },
            submissions_stats: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                pending: { type: 'number' },
                approved: { type: 'number' },
                rejected: { type: 'number' }
              }
            },
            leaderboard_top: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { type: 'string' },
                  score: { type: 'number' }
                }
              }
            }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const challengeId = BigInt((req.params as any).id)

    const challenge = await prisma.challenges.findUnique({
      where: { id: challengeId as any },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        judge_user_id: true,
        challenge_proposals: {
          select: {
            description: true,
            difficulty: true
          }
        }
      }
    })

    if (!challenge) {
      return reply.code(404).send({ error: 'challenge not found' })
    }

    const formattedChallenge = {
      id: Number(challenge.id),
      title: challenge.title,
      description: challenge.challenge_proposals?.description ?? null,
      difficulty: challenge.challenge_proposals?.difficulty ?? 'n/a',
      created_at: challenge.created_at,
      updated_at: challenge.updated_at,
      judge_user_id: challenge.judge_user_id
    }

    // Statistiche submissions
    const stats = await prisma.challenge_submissions.groupBy({
      by: ['status'],
      where: { challenge_id: challengeId as any },
      _count: { status: true }
    })

    const total = stats.reduce((a, s) => a + s._count.status, 0)
    const pending = stats.find(s => s.status === 'pending')?._count.status || 0
    const approved = stats.find(s => s.status === 'approved')?._count.status || 0
    const rejected = stats.find(s => s.status === 'rejected')?._count.status || 0

    // Top 5 leaderboard
    const leaderboard = await prisma.challenge_scores.findMany({
      where: { challenge_id: challengeId as any },
      orderBy: { score: 'desc' },
      take: 5,
      select: {
        score: true,
        users: { select: { username: true } }
      }
    })

    const leaderboard_top = leaderboard.map(l => ({
      user: l.users?.username ?? 'anon',
      score: l.score
    }))

    return reply.send({
      challenge: formattedChallenge,
      submissions_stats: { total, pending, approved, rejected },
      leaderboard_top
    })
  })

  // ============================================================
  // GET /api/v1/user/submissions
  // → Lista submissions create dall’utente autenticato
  // ============================================================
  app.get('/user/submissions', {
    preHandler: requireAuth(),
    schema: {
      tags: ['Submissions v1'],
      summary: 'Elenca tutte le submission create dall’utente corrente',
      querystring: {
        type: 'object',
        properties: {
          status: { enum: ['pending', 'approved', 'rejected', 'all'], default: 'all' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          cursor: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'object' } },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)
    const { status = 'all', limit = 20, cursor } = req.query
    let where: any = { user_id: userId as any }

    if (status !== 'all') where.status = status
    if (cursor) where.created_at = { lt: new Date(cursor) }

    const rows = await prisma.challenge_submissions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        challenge_id: true,
        status: true,
        points_awarded: true,
        created_at: true,
        reviewed_at: true,
        challenges: { select: { title: true } }
      }
    })

    const more = rows.length > limit
    const items = rows.slice(0, limit).map(r => ({
      id: Number(r.id),
      challenge_id: Number(r.challenge_id),
      challenge_title: r.challenges?.title ?? '',
      status: r.status,
      points: r.points_awarded ?? null,
      createdAt: r.created_at.toISOString(),
      reviewedAt: r.reviewed_at ? r.reviewed_at.toISOString() : null
    }))
    const nextCursor = more ? rows[limit].created_at.toISOString() : null

    return reply.send({ items, nextCursor })
  })
}
