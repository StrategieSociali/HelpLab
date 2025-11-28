// src/routes/v1/tasks.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'

export async function tasksV1Routes(app: FastifyInstance) {
  // ================================
  // GET /api/v1/challenges/:id/tasks
  // ================================
  app.get('/challenges/:id/tasks', {
    schema: {
      tags: ['Tasks v1'],
      summary: 'Lista dei task associati a una challenge',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              order_index: { type: 'number' },
              created_at: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const challengeId = BigInt(id)

  const tasks = await prisma.challenge_tasks.findMany({
    where: { challenge_id: challengeId },
    orderBy: { order_index: 'asc' }
  })

  return reply.send(tasks.map(t => ({
    id: Number(t.id),
    title: t.title,
    description: t.description ?? '',
    order_index: t.order_index,
    created_at: t.created_at.toISOString()
  })))
})

  // ================================
  // POST /api/v1/challenges/:id/tasks
  // ================================
  app.post('/challenges/:id/tasks', {
    preHandler: requireAuth('admin'),
    schema: {
      tags: ['Tasks v1'],
      summary: 'Crea un nuovo task per una challenge',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          order_index: { type: 'integer' }
        },
        required: ['title']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            order_index: { type: 'number' }
          }
        }
      }
    }
  }, async (req: any, reply) => {
  const { id } = req.params as { id: string }
  const challengeId = BigInt(id)
  const { title, description, order_index } = req.body

  const task = await prisma.challenge_tasks.create({
    data: {
      challenge_id: challengeId,
      title,
      description: description ?? null,
      order_index: order_index ?? 0
    }
  })

  return reply.code(201).send(task)
})

  // ================================
  // GET /api/v1/tasks/:id/submissions
  // ================================
  app.get('/tasks/:id/submissions', {
    preHandler: requireAuth('judge'),
    schema: {
      tags: ['Tasks v1'],
      summary: 'Elenca le submissions collegate a un task',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              status: { type: 'string' },
              points_awarded: { type: 'number' },
              author: { type: 'string' },
              reviewed_at: { anyOf: [{ type: 'string' }, { type: 'null' }] }
            }
          }
        }
      }
    }
  }, async (req: any, reply) => {
  const { id } = req.params as { id: string }
  const taskId = BigInt(id)

  const submissions = await prisma.challenge_submissions.findMany({
    where: { task_id: taskId },
    select: {
      id: true,
      status: true,
      points_awarded: true,
      reviewed_at: true,
      users: { select: { username: true } }
    }
  })

  const formatted = submissions.map(s => ({
    id: Number(s.id),
    status: s.status,
    points_awarded: s.points_awarded ?? 0,
    author: s.users?.username ?? 'anon',
    reviewed_at: s.reviewed_at ? s.reviewed_at.toISOString() : null
  }))

  return reply.send(formatted)
})
}