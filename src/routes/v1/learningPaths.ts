// src/routes/v1/learningPaths.ts
/**
 * Learning Path Catalog — v1.1
 *
 * HelpLab NON è un LMS. Questi endpoint gestiscono un catalogo curato
 * di corsi erogati su piattaforme esterne (YouTube, LifterLMS, ecc.).
 * Il tracciamento del completamento utenti non è implementato in questa versione.
 *
 * Endpoint pubblici (no auth):
 *   GET  /learning-paths         → lista corsi pubblicati, con filtri
 *   GET  /learning-paths/:id     → singolo corso (solo se pubblicato)
 *
 * Endpoint admin:
 *   POST   /learning-paths       → crea nuovo corso
 *   PUT    /learning-paths/:id   → aggiorna corso (tutti i campi)
 *   DELETE /learning-paths/:id   → soft delete (is_published = false)
 */
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role } from '@prisma/client'
import {
  listPublishedPaths,
  getPublishedPathById,
  createPath,
  updatePath,
  softDeletePath,
} from '../../services/learningCatalogService.js'
import {
  createLearningPathSchema,
  updateLearningPathSchema,
} from '../../schemas/learningSchemas.js'

export async function learningPathsV1Routes(app: FastifyInstance) {
  // ----------------------------------------------------------------
  // GET /api/v1/learning-paths
  // Pubblico — lista corsi con filtri opzionali
  // Query string: ?category=ONBOARDING&targetRole=VOLUNTEER&type=FREE
  // ----------------------------------------------------------------
  app.get('/learning-paths', {
    schema: {
      tags: ['Learning Catalog v1.1'],
      summary: 'Lista corsi pubblicati nel catalogo',
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['ONBOARDING', 'PLATFORM_USAGE', 'DATA_LITERACY', 'SUSTAINABILITY', 'GAME_THEORY', 'TECHNICAL'],
          },
          targetRole: {
            type: 'string',
            enum: ['ALL', 'VOLUNTEER', 'JUDGE', 'SPONSOR', 'PA'],
          },
          type: {
            type: 'string',
            enum: ['FREE', 'PREMIUM'],
          },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
  }, async (req: any, reply) => {
    const { category, targetRole, type } = req.query ?? {}
    const paths = await listPublishedPaths({ category, targetRole, type })
    return reply.send(paths)
  })

  // ----------------------------------------------------------------
  // GET /api/v1/learning-paths/:id
  // Pubblico — singolo corso (solo se pubblicato)
  // ----------------------------------------------------------------
  app.get<{ Params: { id: string } }>('/learning-paths/:id', {
    schema: {
      tags: ['Learning Catalog v1.1'],
      summary: 'Dettaglio singolo corso pubblicato',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const id = BigInt(req.params.id)
    const path = await getPublishedPathById(id)
    if (!path) return reply.code(404).send({ error: 'Corso non trovato' })
    return reply.send(path)
  })

  // ----------------------------------------------------------------
  // POST /api/v1/learning-paths
  // Admin only — crea nuovo corso
  // ----------------------------------------------------------------
  app.post('/learning-paths', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Learning Catalog v1.1 — Admin'],
      summary: 'Crea un nuovo corso nel catalogo (admin)',
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: {
        201: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array' } } },
      },
    },
  }, async (req: any, reply) => {
    const parsed = createLearningPathSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Dati non validi',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      })
    }

    const created = await createPath(parsed.data)
    return reply.code(201).send(created)
  })

  // ----------------------------------------------------------------
  // PUT /api/v1/learning-paths/:id
  // Admin only — aggiornamento completo (o parziale, tutti i campi opzionali)
  // ----------------------------------------------------------------
  app.put<{ Params: { id: string } }>('/learning-paths/:id', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Learning Catalog v1.1 — Admin'],
      summary: 'Aggiorna un corso nel catalogo (admin)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req: any, reply) => {
    // Almeno un campo deve essere presente
    if (!req.body || Object.keys(req.body).length === 0) {
      return reply.code(400).send({ error: 'Body vuoto: fornire almeno un campo da aggiornare' })
    }

    const parsed = updateLearningPathSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Dati non validi',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      })
    }

    const id = BigInt(req.params.id)
    const updated = await updatePath(id, parsed.data)
    if (!updated) return reply.code(404).send({ error: 'Corso non trovato' })
    return reply.send(updated)
  })

  // ----------------------------------------------------------------
  // DELETE /api/v1/learning-paths/:id
  // Admin only — soft delete (is_published = false)
  // Il record non viene eliminato dal DB.
  // ----------------------------------------------------------------
  app.delete<{ Params: { id: string } }>('/learning-paths/:id', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Learning Catalog v1.1 — Admin'],
      summary: 'Disattiva un corso (soft delete — admin)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req: any, reply) => {
    const id = BigInt(req.params.id)
    const result = await softDeletePath(id)
    if (!result) return reply.code(404).send({ error: 'Corso non trovato' })
    return reply.send({ ok: true })
  })
}
