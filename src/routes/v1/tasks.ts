// src/routes/v1/tasks.ts
/**
 * Scopo: CRUD dei task associati a una challenge
 *
 * Funzionalità:
 * - GET   /challenges/:id/tasks               → lista task ordinati (pubblico)
 * - POST  /challenges/:id/tasks               → crea un task (admin)
 * - PATCH /challenges/:id/tasks/:taskId       → modifica task (giudice assegnato o admin)
 * - GET   /tasks/:id/submissions              → lista submission per task (judge/admin)
 *
 * Regola modifica task:
 * Solo il giudice assegnato alla challenge o un admin possono modificare un task.
 * Il giudice può aggiornare: title, description, order_index, max_points, co2_quota, payload_schema.
 *
 * Struttura payload_schema (Json opzionale):
 * Permette all'admin o al giudice di definire quali campi sono obbligatori nel payload
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
 *
 * Sicurezza:
 * - FIX 4 (mar 2026): tutti i parametri URL numerici (:id, :taskId) sono
 *   protetti con parseBigIntParam — risponde 400 invece di crashare.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role } from '@prisma/client'
import { z } from 'zod'


// ================================
// FIX 4 — Helper: parsing sicuro di parametri URL numerici
// Restituisce null se il valore non è un intero positivo valido.
// ================================
function parseBigIntParam(value: unknown): bigint | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!/^\d+$/.test(s)) return null
  try {
    const n = BigInt(s)
    return n > 0n ? n : null
  } catch {
    return null
  }
}


// ================================
// Schema validazione PATCH task
// ================================
const patchTaskSchema = z.object({
  title:          z.string().min(3).max(200).optional(),
  description:    z.string().optional(),
  order_index:    z.number().int().min(0).optional(),
  max_points:     z.number().int().min(0).optional(),
  co2_quota:      z.number().min(0).optional(),
  payload_schema: z.any().optional()
}).strict()


export async function tasksV1Routes(app: FastifyInstance) {

  // ================================
  // GET /api/v1/challenges/:id/tasks
  // Pubblico — lista task ordinati per order_index
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
          items: { type: 'object', additionalProperties: true }
        }
      }
    }
  }, async (req, reply) => {
    const challengeId = parseBigIntParam((req.params as any).id)
    if (!challengeId) return reply.code(400).send({ error: 'ID challenge non valido' })

    const tasks = await prisma.challenge_tasks.findMany({
      where:   { challenge_id: challengeId },
      orderBy: { order_index: 'asc' }
    })

    return reply.send(tasks.map(t => ({
      id:             Number(t.id),
      title:          t.title,
      description:    t.description ?? '',
      order_index:    t.order_index,
      max_points:     (t as any).max_points     ?? null,
      co2_quota:      (t as any).co2_quota      ?? null,
      payload_schema: (t as any).payload_schema ?? null,
      created_at:     t.created_at.toISOString()
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
        201: { type: 'object', additionalProperties: true }
      }
    }
  }, async (req: any, reply) => {
    const challengeId = parseBigIntParam((req.params as any).id)
    if (!challengeId) return reply.code(400).send({ error: 'ID challenge non valido' })

    const { title, description, order_index, max_points, co2_quota, payload_schema } = req.body

    const task = await prisma.challenge_tasks.create({
      data: {
        challenge_id:   challengeId,
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
      max_points:     (task as any).max_points     ?? null,
      co2_quota:      (task as any).co2_quota      ?? null,
      payload_schema: (task as any).payload_schema ?? null,
      created_at:     task.created_at.toISOString()
    })
  })


  // ================================
  // PATCH /api/v1/challenges/:id/tasks/:taskId
  // Modifica task — giudice assegnato o admin
  // ================================
  app.patch('/challenges/:id/tasks/:taskId', {
    preHandler: requireAuth(users_role.judge),
    schema: {
      tags: ['Tasks v1'],
      summary: 'Modifica un task (giudice assegnato o admin)',
      description: 'Il giudice assegnato alla challenge può modificare title, description, order_index, max_points, co2_quota e payload_schema del task.',
      params: {
        type: 'object',
        properties: {
          id:     { type: 'number' },
          taskId: { type: 'number' }
        },
        required: ['id', 'taskId']
      },
      body: {
        type: 'object',
        properties: {
          title:          { type: 'string', minLength: 3, maxLength: 200 },
          description:    { type: 'string' },
          order_index:    { type: 'integer', minimum: 0 },
          max_points:     { type: 'integer', minimum: 0 },
          co2_quota:      { type: 'number',  minimum: 0 },
          payload_schema: { type: 'object', description: 'Schema validazione campi submission' }
        }
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' }, errors: { type: 'object' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const challengeId = parseBigIntParam((req.params as any).id)
    if (!challengeId) return reply.code(400).send({ error: 'ID challenge non valido' })

    const taskIdBig = parseBigIntParam((req.params as any).taskId)
    if (!taskIdBig) return reply.code(400).send({ error: 'ID task non valido' })

    // Verifica che il task appartenga alla challenge indicata
    const task = await prisma.challenge_tasks.findUnique({
      where:  { id: taskIdBig },
      select: { id: true, challenge_id: true }
    })

    if (!task || BigInt(task.challenge_id as any) !== challengeId) {
      return reply.code(404).send({ error: 'Task non trovato per questa challenge' })
    }

    // Verifica autorizzazione: admin sempre, judge solo se assegnato alla challenge
    const challenge = await prisma.challenges.findUnique({
      where:  { id: challengeId },
      select: { judge_user_id: true }
    })

    if (!challenge) return reply.code(404).send({ error: 'Challenge non trovata' })

    const isAdmin         = req.user.role === users_role.admin
    const isAssignedJudge = challenge.judge_user_id !== null &&
                            BigInt(challenge.judge_user_id as any) === BigInt(req.user.id)

    if (!isAdmin && !isAssignedJudge) {
      return reply.code(403).send({ error: 'Non autorizzato: devi essere il giudice assegnato o un admin' })
    }

    const parsed = patchTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const data = parsed.data
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: 'Nessun campo da aggiornare fornito' })
    }

    const updateData: Record<string, any> = {}
    if (data.title          !== undefined) updateData.title          = data.title
    if (data.description    !== undefined) updateData.description    = data.description
    if (data.order_index    !== undefined) updateData.order_index    = data.order_index
    if (data.max_points     !== undefined) updateData.max_points     = data.max_points
    if (data.co2_quota      !== undefined) updateData.co2_quota      = data.co2_quota
    if (data.payload_schema !== undefined) updateData.payload_schema = data.payload_schema

    const updated = await prisma.challenge_tasks.update({
      where: { id: taskIdBig },
      data:  updateData as any
    })

    return reply.send({
      id:             Number((updated as any).id),
      title:          updated.title,
      description:    updated.description ?? '',
      order_index:    updated.order_index,
      max_points:     (updated as any).max_points     ?? null,
      co2_quota:      (updated as any).co2_quota      ?? null,
      payload_schema: (updated as any).payload_schema ?? null,
      created_at:     updated.created_at.toISOString()
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
          items: { type: 'object', additionalProperties: true }
        }
      }
    }
  }, async (req: any, reply) => {
    const taskId = parseBigIntParam((req.params as any).id)
    if (!taskId) return reply.code(400).send({ error: 'ID task non valido' })

    const submissions = await prisma.challenge_submissions.findMany({
      where:  { task_id: taskId },
      select: {
        id:             true,
        status:         true,
        points_awarded: true,
        reviewed_at:    true,
        users:          { select: { username: true } }
      }
    })

    return reply.send(submissions.map(s => ({
      id:             Number(s.id),
      status:         s.status,
      points_awarded: s.points_awarded ?? 0,
      author:         s.users?.username ?? 'anon',
      reviewed_at:    s.reviewed_at ? s.reviewed_at.toISOString() : null
    })))
  })
}
