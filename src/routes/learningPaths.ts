import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { listLearningPaths, getUserProgress, markModuleDone } from '../services/learningService.js'

const toBig = (v: string | number) => BigInt(v)

const bodySchema = z.object({
  userId: z.union([z.string(), z.number()]),
  moduleId: z.union([z.string(), z.number()]),
})

// Cache leggera in memoria (30s)
const cache = new Map<string, { data: Record<string, number[]>; exp: number }>()
const TTL_MS = 30_000

export async function learningPathsRoutes(app: FastifyInstance) {
  // GET /api/learning-paths
 app.get('/', {
  schema: {
    tags: ['Learning'],
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

  app.get('/progress', {
  schema: {
    tags: ['Learning'],
    summary: 'Progressi utente per Learning Paths',
    querystring: {
      type: 'object',
      properties: { userId: { anyOf: [{ type: 'string' }, { type: 'number' }] } }
    },
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
      400: { type: 'object', properties: { error: { type: 'string' } } },
      500: { type: 'object', properties: { error: { type: 'string' } } }
    }
  }
}, async (req, reply) => {
  try {
    const q = (req as any).query as { userId?: string | number }
    const raw = q?.userId

    // userId mancante -> 400
    if (raw === undefined || raw === null || raw === '') {
      return reply.code(400).send({ error: 'userId is required' })
    }

    // coerci a intero positivo; se non valido -> progress vuoto (200)
    const num = Number(raw)
    if (!Number.isInteger(num) || num <= 0) {
      return reply.send({ progress: {} })
    }

    const userId = BigInt(num)

    // cache
    const key = `progress:${userId.toString()}`
    const now = Date.now()
    const hit = cache.get(key)
    if (hit && hit.exp > now) {
      return reply.send({ progress: hit.data })
    }

    // DB/service
    const data = await getUserProgress(userId) // deve restituire {} se nessun record

    // salva in cache e rispondi
    cache.set(key, { data, exp: now + TTL_MS })
    return reply.send({ progress: data })
  } catch (e) {
    req.log.error(e)
    return reply.code(500).send({ error: 'server error' })
  }
})

  // POST /api/learning-paths/:id/progress { userId, moduleId }
  app.post<{ Params: { id: string }; Body: unknown }>('/:id/progress', {
  config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  schema: {
    tags: ['Learning'],
    summary: 'Marca un modulo come completato (demo, idempotente)',
    params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    body: {
      type: 'object',
      required: ['userId', 'moduleId'],
      properties: {
        userId: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        moduleId: { anyOf: [{ type: 'string' }, { type: 'number' }] }
      }
    },
    response: {
      200: { type: 'object', properties: { ok: { type: 'boolean' } } },
      400: { type: 'object', properties: { error: { type: 'string' } } }
    }
  }
}, async (req, reply) => {
      const parsed = bodySchema.safeParse((req as any).body)
      if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })

      await markModuleDone(
        toBig(req.params.id),
        toBig(parsed.data.moduleId),
        toBig(parsed.data.userId)
      )

      return reply.send({ ok: true })
    }
  )
}
