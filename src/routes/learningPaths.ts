import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { listLearningPaths, getUserProgress, markModuleDone } from '../services/learningService.js'

const toBig = (v: string | number) => BigInt(v)

// Cache leggera in memoria (30s)
const cache = new Map<string, { data: Record<string, number[]>; exp: number }>()
const TTL_MS = 30_000

export async function learningPathsRoutes(app: FastifyInstance) {
  // GET /api/learning-paths
  app.get('/', async () => listLearningPaths())

  // GET /api/learning-paths/progress?userId=...
  app.get('/progress', async (req, reply) => {
    try {
      const q = (req as any).query as { userId?: string | number }
      const raw = q?.userId

      // userId mancante -> 400
      if (raw === undefined || raw === null || raw === '') {
        return reply.code(400).send({ error: 'userId is required' })
      }

      // coerce a numero intero positivo
      const num = Number(raw)
      if (!Number.isInteger(num) || num <= 0) {
        // Tratta come valido ma senza dati
        return reply.send({ progress: {} })
      }

      const userId = toBig(num)

      // cache (prima di andare a DB)
      const key = `progress:${userId.toString()}`
      const now = Date.now()
      const hit = cache.get(key)
      if (hit && hit.exp > now) {
        return reply.send({ progress: hit.data })
      }

      // DB
      const data = await getUserProgress(userId)

      // salva in cache e rispondi
      cache.set(key, { data, exp: now + TTL_MS })
      return reply.send({ progress: data })
    } catch (e) {
      app.log.error(e)
      // 500 SOLO per errori imprevisti
      return reply.code(500).send({ error: 'server error' })
    }
  })

  // POST /api/learning-paths/:id/progress { userId, moduleId }
  const bodySchema = z.object({
    userId: z.union([z.string(), z.number()]),
    moduleId: z.union([z.string(), z.number()]),
  })

  app.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/progress',
    async (req, reply) => {
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
