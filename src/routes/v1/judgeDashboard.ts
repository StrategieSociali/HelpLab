// src/routes/v1/judgeDashboard.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'

export async function judgeDashboardV1Routes(app: FastifyInstance) {
  app.get('/judge/challenges', {
    preHandler: requireAuth('judge'),
    schema: {
      tags: ['Judges v1'],
      summary: 'Elenco sfide assegnate al giudice con conteggio submissions pending',
      response: {
        200: {
          type: 'object',
          properties: {
            challenges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  title: { type: 'string' },
                  difficulty: { type: 'string' },
                  pending_count: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const judgeId = BigInt(req.user.id)

    const challenges = await prisma.challenges.findMany({
      where: { judge_user_id: judgeId as any },
      select: {
        id: true,
        title: true,
        challenge_proposals: {
          select: {
            difficulty: true
          }
        },
        challenge_submissions: {
          where: { status: 'pending' },
          select: { id: true }
        }
      }
    })

    const formatted = challenges.map(ch => ({
      id: Number(ch.id),
      title: ch.title,
      difficulty: ch.challenge_proposals?.difficulty ?? 'n/a',
      pending_count: ch.challenge_submissions.length
    }))

    return reply.send({ challenges: formatted })
  })
}
