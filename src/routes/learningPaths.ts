import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { listLearningPaths, getUserProgress, markModuleDone } from '../services/learningService.js'
const toBig = (v: string | number) => BigInt(v)

export async function learningPathsRoutes(app: FastifyInstance) {
  app.get('/', async () => listLearningPaths())

  const qSchema = z.object({ userId: z.union([z.string(), z.number()]) })
  app.get('/progress', async (req, reply) => {
    const parsed = qSchema.safeParse((req as any).query)
    if (!parsed.success) return reply.code(400).send({ error: 'userId required' })
    return getUserProgress(toBig(parsed.data.userId))
  })

  const bodySchema = z.object({ userId: z.union([z.string(), z.number()]), moduleId: z.union([z.string(), z.number()]) })
  app.post<{ Params: { id: string }; Body: unknown }>('/:id/progress', async (req, reply) => {
    const parsed = bodySchema.safeParse((req as any).body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })
    await markModuleDone(toBig(req.params.id), toBig(parsed.data.moduleId), toBig(parsed.data.userId))
    return reply.send({ ok: true })
  })
}
