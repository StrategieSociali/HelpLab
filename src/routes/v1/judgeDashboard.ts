// src/routes/v1/judgeDashboard.ts
/**
 * Scopo: Restituisce l’elenco delle challenge assegnate al giudice attualmente autenticato
 *
 * Attualmente supporta:
 * conteggio delle submission in attesa di revisione (pending)
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role } from '@prisma/client'


export async function judgeDashboardV1Routes(app: FastifyInstance) {
  app.get('/judge/challenges', {
    preHandler: requireAuth(users_role.judge),
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
// Aggiungere all'interno di judgeDashboardV1Routes

app.get('/judge/challenges/:id/overview', {
  preHandler: requireAuth(users_role.judge),
  schema: {
    tags: ['Judges v1'],
    summary: 'Overview challenge per giudice (contesto + task + punti assegnati)',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          challenge: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              type: { type: 'string' },
              approved_co2: { anyOf: [{ type: 'number' }, { type: 'null' }] },
              max_points: { anyOf: [{ type: 'number' }, { type: 'null' }] }
            },
            required: ['id', 'title', 'type']
          },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                title: { type: 'string' },
                max_points: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                co2_quota: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                assigned_points: { type: 'number' }
              },
              required: ['id', 'title', 'assigned_points']
            }
          }
        }
      },
      403: { type: 'object', properties: { error: { type: 'string' } } },
      404: { type: 'object', properties: { error: { type: 'string' } } }
    }
  }
}, async (req: any, reply) => {
  const challengeId = BigInt(req.params.id)
  const judgeId = BigInt(req.user.id)

  const ch = await prisma.challenges.findFirst({
    where: {
      id: challengeId,
      judge_user_id: judgeId
    },
    select: {
      id: true,
      title: true,
      type: true,
      approved_co2: true,
      max_points: true
    }
  })

  if (!ch) return reply.code(404).send({ error: 'not found' })

  const tasks = await prisma.challenge_tasks.findMany({
    where: { challenge_id: challengeId },
    select: {
      id: true,
      title: true,
      max_points: true,
      co2_quota: true
    }
  })

  const submissions = await prisma.challenge_submissions.groupBy({
    by: ['task_id'],
    where: {
      challenge_id: challengeId,
      status: 'approved',
      task_id: { not: null }
    },
    _sum: {
      points_awarded: true
    }
  })

  const pointsMap = new Map<number, number>()
  for (const s of submissions) {
    const taskId = Number(s.task_id)
    const sum = s._sum.points_awarded ?? 0
    pointsMap.set(taskId, sum)
  }

  const formattedTasks = tasks.map(task => ({
    id: Number(task.id),
    title: task.title,
    max_points: task.max_points != null ? Number(task.max_points) : null,
    co2_quota: task.co2_quota != null ? Number(task.co2_quota) : null,
    assigned_points: pointsMap.get(Number(task.id)) ?? 0
  }))

  return reply.send({
    challenge: {
      id: Number(ch.id),
      title: ch.title,
      type: ch.type,
      approved_co2: ch.approved_co2 != null ? Number(ch.approved_co2) : null,
      max_points: ch.max_points != null ? Number(ch.max_points) : null
    },
    tasks: formattedTasks
  })
})
}
