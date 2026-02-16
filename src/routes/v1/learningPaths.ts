// src/routes/v1/learningPaths.ts
/**
 * Scopo: gestione dei percorsi formativi (learning paths) e del progresso utente
 *
 * Funzionalità:
 * - GET /learning-paths → lista pubblica dei percorsi con moduli
 * - GET /learning-paths/progress → progressi dell'utente autenticato (protetto)
 * - POST /learning-paths/:id/progress → segna un modulo come completato (protetto)
 *
 * Sicurezza: gli endpoint di progress usano req.user.id dal token JWT,
 * non accettano userId dal client.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { listLearningPaths, getUserProgress, markModuleDone } from '../../services/learningService.js'
import { requireAuth } from '../../utils/requireAuth.js'

// Cache leggera in memoria (30s)
const cache = new Map<string, { data: Record<string, number[]>; exp: number }>()
const TTL_MS = 30_000

export async function learningPathsV1Routes(app: FastifyInstance) {
  // ================================
  // GET /api/v1/learning-paths
  // Pubblico — lista percorsi con moduli
  // ================================
  app.get('/learning-paths', {
    schema: {
      tags: ['Learning v1'],
      summary: 'Lista Learning Paths con moduli',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              level: { type: 'string', nullable: true },
              estimatedMinutes: { type: 'number', nullable: true },
              tags: { type: 'array', items: { type: 'string' }, nullable: true },
              modules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    title: { type: 'string' },
                    order: { type: 'number' },
                    estMinutes: { type: 'number', nullable: true }
                  }
                }
              },
              updatedAt: { type: 'string' }
            }
          }
        }
      }
    }
  }, async () => listLearningPaths())

  // ================================
  // GET /api/v1/learning-paths/progress
  // Protetto — progressi dell'utente autenticato
  // ================================
  app.get('/learning-paths/progress', {
    preHandler: requireAuth(),
    schema: {
      tags: ['Learning v1'],
      summary: 'Progressi dell\'utente autenticato per Learning Paths',
      response: {
        200: {
          type: 'object',
          properties: {
            progress: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'number' }
              }
            }
          }
        },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)

    // cache
    const key = `progress:${userId.toString()}`
    const now = Date.now()
    const hit = cache.get(key)
    if (hit && hit.exp > now) {
      return reply.send({ progress: hit.data })
    }

    // DB/service
    const data = await getUserProgress(userId)

    // salva in cache e rispondi
    cache.set(key, { data, exp: now + TTL_MS })
    return reply.send({ progress: data })
  })

  // ================================
  // POST /api/v1/learning-paths/:id/progress
  // Protetto — segna un modulo come completato per l'utente autenticato
  // ================================
  app.post<{ Params: { id: string } }>('/learning-paths/:id/progress', {
    preHandler: requireAuth(),
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Learning v1'],
      summary: 'Marca un modulo come completato (idempotente)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['moduleId'],
        properties: {
          moduleId: { anyOf: [{ type: 'string' }, { type: 'number' }] }
        }
      },
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const bodySchema = z.object({
      moduleId: z.union([z.string(), z.number()])
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })

    const pathId = BigInt(req.params.id)
    const moduleId = BigInt(String(parsed.data.moduleId))
    const userId = BigInt(req.user.id)

    await markModuleDone(pathId, moduleId, userId)

    // Invalida cache per questo utente
    cache.delete(`progress:${userId.toString()}`)

    return reply.send({ ok: true })
  })
}