// src/routes/v1/judges.ts
/**
 * Scopo: Gestione delle attività dei giudici -> DEPRECATED FROM V0.7
 *
 * Attualmente supporta:
 * assegnazione a challenge,
 * consultazione coda personale
 * gestione challenge non assegnate
*/
import { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db/client.js'
import { verifyAccessToken } from '../../utils/jwt.js'
import { users_role } from '@prisma/client'


/**
 * Auth helper locale: verifica Bearer JWT e (opzionalmente) ruolo richiesto.
 * Se si richiede 'judge' o 'admin', l'admin passa sempre (super-ruolo).
 */
function requireAuth(role?: 'admin' | 'judge') {
  return async (req: any, reply: FastifyReply) => {
    const auth = req.headers?.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'unauthorized' })

    try {
      const p = verifyAccessToken(token) as any
      const userId = BigInt(p.sub)

      // carica ruolo dal DB
      const user = await prisma.users.findFirst({
        where: { id: userId as any },
        select: { role: true }
      })
      if (!user) return reply.code(401).send({ error: 'unauthorized' })

      if (role && user.role !== role && user.role !== 'admin') {
        return reply.code(403).send({ error: 'forbidden' })
      }

      req.user = { id: userId, email: p.email, role: user.role }
    } catch {
      return reply.code(401).send({ error: 'unauthorized' })
    }
  }
}

export async function judgesV1Routes(app: FastifyInstance) {
  /**
   * GET /api/v1/challenges/unassigned  (solo admin)
   * Challenge "open" senza giudice assegnato, paginato.
   * query: ?limit=20&cursor=<ISO date> (cursor = updated_at LT)
   */
  app.get('/challenges/unassigned', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Judges v1'],
      summary: 'Elenco challenge senza giudice (paginato, solo admin)',
      querystring: {
        type: 'object',
        properties: {
          limit:  { type: 'number' },
          cursor: { type: 'string' } // ISO date
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id:        { type: 'number' },
                  slug:      { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  title:     { type: 'string' },
                  type:      { type: 'string' },
                  location:  { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  rules:     { type: 'string' },
                  deadline:  { anyOf: [{ type: 'string' }, { type: 'null' }] }, // YYYY-MM-DD
                  status:    { type: 'string' },
                  budget: {
                    anyOf: [
                      { type: 'null' },
                      {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          amount:   { type: 'number' },
                          currency: { type: 'string' }
                        },
                        required: ['amount','currency']
                      }
                    ]
                  },
                  sponsor: {
                    anyOf: [
                      { type: 'null' },
                      { type: 'object', additionalProperties: false, properties: { name: { type: 'string' } }, required: ['name'] }
                    ]
                  },
                  judge: {
                    anyOf: [
                      { type: 'null' },
                      { type: 'object', additionalProperties: false, properties: { name: { type: 'string' } }, required: ['name'] }
                    ]
                  },
                  target:    { anyOf: [{ type: 'object' }, { type: 'null' }] },
                  updatedAt: { anyOf: [{ type: 'string' }, { type: 'null' }] }
                },
                required: ['id','title','type','status']
              }
            },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          },
          required: ['items','nextCursor']
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const q = req.query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    // cursor (ISO); se invalido lo ignoriamo
    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const where: any = {
      status: 'open',
      judge_user_id: null,
      ...(cursorDate ? { updated_at: { lt: cursorDate } } : {})
    }

    const rows = await prisma.challenges.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        location: true,
        rules: true,
        deadline: true,
        status: true,
        budget_amount: true,
        budget_currency: true,
        sponsor_id: true,
        judge_user_id: true,
        target_json: true,
        updated_at: true,
        sponsors: { select: { name: true } },      // sponsor.name
        users:    { select: { username: true } },  // judge.username (qui sarà null)
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })

    const more = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map(r => {
      const idNum = r.id != null ? Number(r.id) : null
      return {
        id: idNum!,
        slug: r.slug || (idNum ? `ch-${idNum}` : null),
        title: r.title || '(senza titolo)',
        type: r.type || 'generic',
        location: r.location ?? null,
        rules: r.rules ?? '',
        deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
        status: r.status || 'open',
        budget: r.budget_amount != null
          ? { amount: Number(r.budget_amount), currency: r.budget_currency || 'EUR' }
          : null,
        sponsor: r.sponsors?.name ? { name: r.sponsors.name } : null,
        judge: r.users?.username ? { name: r.users.username } : null,
        target: r.target_json ?? null,
        updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
      }
    })

    const nextCursor = more && rows[limit].updated_at
      ? rows[limit].updated_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })

  /**
   * POST /api/v1/challenges/:id/assign-judge  (solo admin)
   * Body: { userId }
   */
  app.post('/challenges/:id/assign-judge', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Judges v1'],
      summary: 'Assegna un giudice a una challenge (solo admin)',
      body: {
        type: 'object',
        properties: { userId: { anyOf: [{ type: 'string' }, { type: 'number' }] } },
        required: ['userId']
      },
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const schema = z.object({ userId: z.union([z.string(), z.number()]) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })

    const challengeIdRaw = req.params?.id
    if (!challengeIdRaw) return reply.code(400).send({ error: 'missing id' })

    let challengeId: bigint
    try {
      challengeId = BigInt(challengeIdRaw)
    } catch {
      return reply.code(400).send({ error: 'invalid id' })
    }

    const judgeId = BigInt(String(parsed.data.userId))

    // challenge esiste & open & senza judge
    const ch = await prisma.challenges.findFirst({
      where: { id: challengeId as any },
      select: { id: true, status: true, judge_user_id: true }
    })
    if (!ch) return reply.code(404).send({ error: 'challenge not found' })
    if (ch.status !== 'open') return reply.code(409).send({ error: 'challenge not open' })
    if (ch.judge_user_id !== null) return reply.code(409).send({ error: 'already assigned' })

    // utente è judge o admin
    const ju = await prisma.users.findFirst({
      where: { id: judgeId as any },
      select: { role: true }
    })
    if (!ju) return reply.code(404).send({ error: 'user not found' })
    if (ju.role !== 'judge' && ju.role !== 'admin') {
      return reply.code(400).send({ error: 'user is not judge/admin' })
    }

    await prisma.challenges.update({
      where: { id: challengeId as any },
      data: { judge_user_id: judgeId as any, updated_at: new Date() }
    })

    return reply.send({ ok: true })
  })

  /**
   * GET /api/v1/judge/my-queue  (solo judge)
   * Challenge assegnate al giudice loggato con status 'open'.
   */
  app.get('/judge/my-queue', {
    preHandler: requireAuth(users_role.judge),
    schema: {
      tags: ['Judges v1'],
      summary: 'Coda del giudice: challenge assegnate (paginato)',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          cursor: { type: 'string' } // ISO date
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'number' },
                  slug: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  title:{ anyOf: [{ type: 'string' }, { type: 'null' }] },
                  type: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  location:{ anyOf: [{ type: 'string' }, { type: 'null' }] },
                  status:{ anyOf: [{ type: 'string' }, { type: 'null' }] },
                  deadline:{ anyOf: [{ type: 'string' }, { type: 'null' }] }, // YYYY-MM-DD
                  sponsor: {
                    anyOf: [
                      { type: 'null' },
                      { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
                    ]
                  },
                  target:   { anyOf: [{ type: 'object' }, { type: 'null' }] },
                  updatedAt:{ anyOf: [{ type: 'string' }, { type: 'null' }] } // ISO
                },
                required: ['id']
              }
            },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          },
          required: ['items','nextCursor']
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const q = req.query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 10)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const where: any = {
      judge_user_id: req.user.id as any,
      status: 'open',
      ...(cursorDate ? { updated_at: { lt: cursorDate } } : {})
    }

    const rows = await prisma.challenges.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        location: true,
        status: true,
        deadline: true,
        budget_amount: true,
        budget_currency: true,
        sponsor_id: true,
        judge_user_id: true,
        target_json: true,
        updated_at: true,
        sponsors: { select: { name: true } },
        users:    { select: { username: true } },
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })

    const more = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map(r => {
      const idNum = r.id != null ? Number(r.id) : null
      return {
        id: idNum!,
        slug: r.slug || (idNum ? `ch-${idNum}` : null),
        title: r.title || '(senza titolo)',
        type: r.type || 'generic',
        location: r.location ?? null,
        status: r.status || 'open',
        deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
        sponsor: r.sponsors?.name ? { name: r.sponsors.name } : null,
        target: r.target_json ?? null,
        updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
      }
    })

    const nextCursor = more && rows[limit].updated_at
      ? rows[limit].updated_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })
}
