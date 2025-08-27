import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  listChallenges,
  getLeaderboard,
  joinChallenge,
  submitDelta,
} from '../services/challengesService.js'

const toBig = (v: string) => {
  const n = BigInt(v)
  if (n < 0n) throw new Error('negative id')
  return n
}

export async function challengesRoutes(app: FastifyInstance) {
  // GET /api/challenges
  app.get('/', async () => listChallenges())

  // GET /api/challenges/:id/leaderboard
  app.get<{ Params: { id: string } }>('/:id/leaderboard', async (req, reply) => {
    try {
      const id = toBig(req.params.id)
      return await getLeaderboard(id)
    } catch {
      return reply.code(400).send({ error: 'invalid id' })
    }
  })

  // POST /api/challenges/:id/join { userId }
  const joinSchema = z.object({ userId: z.union([z.string(), z.number()]) })
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/join',
    async (req, reply) => {
      const parsed = joinSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: 'userId required' })
      try {
        const id = toBig(req.params.id)
        const userId = toBig(String(parsed.data.userId))
        await joinChallenge(id, userId)
        return reply.send({ ok: true })
      } catch (e: any) {
        if (e?.statusCode === 404) return reply.code(404).send({ error: 'not found' })
        app.log.error(e)
        return reply.code(500).send({ error: 'server error' })
      }
    }
  )

  // POST /api/challenges/:id/submit { userId, delta, payload? }
  const submitSchema = z.object({
    userId: z.union([z.string(), z.number()]),
    delta: z.number().int().min(1).max(100),
    payload: z.any().optional(),
  })
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/submit',
    async (req, reply) => {
      const parsed = submitSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })
      try {
        const id = toBig(req.params.id)
        const userId = toBig(String(parsed.data.userId))
        const newScore = await submitDelta(id, userId, parsed.data.delta, parsed.data.payload)
        return reply.send({ ok: true, newScore })
      } catch (e: any) {
        if (e?.statusCode === 404) return reply.code(404).send({ error: 'not found' })
        app.log.error(e)
        return reply.code(500).send({ error: 'server error' })
      }
    }
  )
}
