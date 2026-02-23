// src/routes/v1/tasks.ts
/**
 * Scopo: CRUD dei task associati a una challenge
 *
 * Funzionalità:
 * - GET  /challenges/:id/tasks           → lista task ordinati (pubblico)
 * - POST /challenges/:id/tasks           → crea un task (admin)
 * - GET  /tasks/:id/submissions          → lista submission per task (judge/admin)
 *
 * Struttura payload_schema (Json opzionale):
 * Permette all'admin di definire quali campi sono obbligatori nel payload
 * di una submission collegata a questo task. Il backend legge lo schema
 * al momento della ricezione della submission e valida il payload prima
 * di salvarlo. Questo rende la validazione generica e configurabile senza
 * toccare il codice.
 *
 * Esempio payload_schema per task mobilità biciclettata:
 * {
 *   "fields": [
 *     { "name": "km_percorsi", "type": "number", "min": 0.1, "required": true },
 *     { "name": "vehicle_id",  "type": "string",              "required": true },
 *     { "name": "evidences",   "type": "url_array", "minItems": 1, "required": true }
 *   ]
 * }
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role } from '@prisma/client'


export async function tasksV1Routes(app: FastifyInstance) {

  // ================================
  // GET /api/v1/challenges/:id/tasks
  // Pubblico — lista task ordinati per order_index
  // Espone anche payload_schema per permettere al frontend
  // di costruire form dinamici in base ai campi richiesti dal task
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
            additionalProperties: true
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
      max_points: t.max_points ?? null,
      co2_quota: t.co2_quota ?? null,
      payload_schema: (t as any).payload_schema ?? null,
      created_at: t.created_at.toISOString()
    })))
  })

  // ================================
  // POST /api/v1/challenges/:id/tasks
  // Admin — crea un nuovo task con schema di validazione opzionale
  // ================================
  app.post('/challenges/:id/tasks', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Tasks v1'],
      summary: 'Crea un nuovo task per una challenge (admin)',
      description: 'Permette di definire payload_schema per validare i campi obbligatori nelle submission di questo task.',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title:          { type: 'string', minLength: 3 },
          description:    { type: 'string' },
          order_index:    { type: 'integer' },
          max_points:     { type: 'integer' },
          co2_quota:      { type: 'number' },
          payload_schema: {
            type: 'object',
            description: 'Schema di validazione per il payload delle submission di questo task'
          }
        },
        required: ['title']
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true
        }
      }
    }
  }, async (req: any, reply) => {
    const { id } = req.params as { id: string }
    const challengeId = BigInt(id)
    const { title, description, order_index, max_points, co2_quota, payload_schema } = req.body

    const task = await prisma.challenge_tasks.create({
      data: {
        challenge_id: challengeId,
        title,
        description:    description    ?? null,
        order_index:    order_index    ?? 0,
        max_points:     max_points     ?? null,
        co2_quota:      co2_quota      ?? null,
        payload_schema: payload_schema ?? null
      } as any
    })

    return reply.code(201).send({
      id:             Number((task as any).id),
      title:          task.title,
      description:    task.description ?? '',
      order_index:    task.order_index,
      max_points:     (task as any).max_points ?? null,
      co2_quota:      (task as any).co2_quota ?? null,
      payload_schema: (task as any).payload_schema ?? null,
      created_at:     task.created_at.toISOString()
    })
  })

  // ================================
  // GET /api/v1/tasks/:id/submissions
  // Judge/Admin — lista submission collegate a un task specifico
  // ================================
  app.get('/tasks/:id/submissions', {
    preHandler: requireAuth(users_role.judge),
    schema: {
      tags: ['Tasks v1'],
      summary: 'Elenca le submission collegate a un task (judge/admin)',
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
            additionalProperties: true
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
        id:            true,
        status:        true,
        points_awarded: true,
        reviewed_at:   true,
        users:         { select: { username: true } }
      }
    })

    return reply.send(submissions.map(s => ({
      id:            Number(s.id),
      status:        s.status,
      points_awarded: s.points_awarded ?? 0,
      author:        s.users?.username ?? 'anon',
      reviewed_at:   s.reviewed_at ? s.reviewed_at.toISOString() : null
    })))
  })
}