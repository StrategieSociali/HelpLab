import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  listChallenges,
  getLeaderboard,
  joinChallenge,
  submitDelta,
  createChallenge, // <— NEW
} from '../services/challengesService.js'
import { authGuard } from '../utils/authGuard.js'               
import { createChallengeSchema } from '../schemas/challengeSchemas.js'

// schema per /:id/join
const joinSchema = z.object({
  userId: z.union([z.string(), z.number()])
})

// schema per /:id/submit
const submitSchema = z.object({
  userId: z.union([z.string(), z.number()]),
  delta: z.number().int().min(1).max(100),
  payload: z.any().optional()
})

const toBig = (v: string) => {
  const n = BigInt(v)
  if (n < 0n) throw new Error('negative id')
  return n
}

export async function challengesRoutes(app: FastifyInstance) {
  // GET /api/challenges
 app.get('/', {
  schema: {
    tags: ['Challenges'],
    summary: 'Lista sfide',
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            slug: { type: 'string' },
            title: { type: 'string' },
            type: { type: 'string' },
            location: { type: 'string', nullable: true },
            rules: { type: 'string', nullable: true },
            deadline: { type: 'string', nullable: true }, // ISO date
            status: { type: 'string' },
            budget: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' }
              }
            },
            sponsor: { type: 'object', properties: { name: { type: 'string' } }, nullable: true },
            judge: { type: 'object', properties: { name: { type: 'string' } }, nullable: true },
            target: { type: 'object', additionalProperties: true, nullable: true },
            scoreboard: {
              type: 'array',
              items: { type: 'object', properties: { user: { type: 'string' }, score: { type: 'number' } } }
            },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  }
}, async () => listChallenges())

  // NEW — POST /api/challenges  (crea una nuova challenge, protetta)
  app.post(
    '/',
    {
      preHandler: authGuard, // richiede Authorization: Bearer <accessToken>
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      // valida il body con Zod (titolo, tipo, deadline YYYY-MM-DD, ecc.)
      const parsed = createChallengeSchema.safeParse((req as any).body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid body' })
      }

      // userId messo in req dall'authGuard (ricavato dal JWT)
      const userId = (req as any).userId as bigint
      const b = parsed.data

      try {
        const data = await createChallenge(
          b.title,
          b.type,
          b.location,
          b.rules,
          b.deadline,
          b.budget,
          b.sponsor?.name,
          b.target,
          userId
        )
        return reply.code(201).send(data)
      } catch (e: any) {
        app.log.error(e)
        return reply.code(500).send({ error: 'server error' })
      }
    }
  )

  // GET /api/challenges/:id/leaderboard
  app.get<{ Params: { id: string } }>('/:id/leaderboard', {
  schema: {
    tags: ['Challenges'],
    summary: 'Leaderboard di una sfida',
    params: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    },
    response: {
      200: {
        type: 'array',
        items: { type: 'object', properties: { user: { type: 'string' }, score: { type: 'number' } } }
      },
      400: { type: 'object', properties: { error: { type: 'string' } } },
      404: { type: 'object', properties: { error: { type: 'string' } } }
    }
  }
}, async (req, reply) => {
  try {
    const id = toBig(req.params.id)
    return await getLeaderboard(id)
  } catch {
    return reply.code(400).send({ error: 'invalid id' })
  }
})

  // POST /api/challenges/:id/join { userId }
app.post<{ Params: { id: string }; Body: unknown }>('/:id/join', {
  config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  schema: {
    tags: ['Challenges'],
    summary: 'Partecipa a una sfida (demo idempotente)',
    params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    body: { type: 'object', required: ['userId'], properties: { userId: { anyOf: [{ type: 'string' }, { type: 'number' }] } } },
    response: {
      200: { type: 'object', properties: { ok: { type: 'boolean' } } },
      400: { type: 'object', properties: { error: { type: 'string' } } },
      404: { type: 'object', properties: { error: { type: 'string' } } }
    }
  }
}, async (req, reply) => {
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
app.post<{ Params: { id: string }; Body: unknown }>('/:id/submit', {
  config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  schema: {
    tags: ['Challenges'],
    summary: 'Invia risultato (demo) e aggiorna punteggio',
    params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    body: {
      type: 'object',
      required: ['userId', 'delta'],
      properties: {
        userId: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        delta: { type: 'number' },
        payload: { type: 'object', additionalProperties: true, nullable: true }
      }
    },
    response: {
      200: { type: 'object', properties: { ok: { type: 'boolean' }, newScore: { type: 'number' } } },
      400: { type: 'object', properties: { error: { type: 'string' } } },
      404: { type: 'object', properties: { error: { type: 'string' } } }
    }
  }
}, async (req, reply) => {
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
