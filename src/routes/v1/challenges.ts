// src/routes/v1/challenges.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'

export async function challengesV1Routes(app: FastifyInstance) {
  // GET /api/v1/challenges — lista paginata
  app.get('/challenges', {
    schema: {
  tags: ['Challenges v1'],
  summary: 'Lista challenge pubbliche (paginata)',
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'number' },
      cursor: { type: 'string' }
    }
  },
  response: {
  200: {
    type: 'object',
    additionalProperties: true,  // 👈 teniamo tutti i campi che inviamo
    properties: {
      id: { anyOf: [{ type: 'number' }, { type: 'string' }] },
      slug: { type: 'string' },
      title: { type: 'string' },
      type: { type: 'string' },
      location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      rules: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      deadline: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      status: { type: 'string' },
      budget: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      sponsor: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      judge: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      target: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      participants_count: { type: 'number' },
      scoreboard: { type: 'array' },
      updatedAt: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      createdAt: { anyOf: [{ type: 'string' }, { type: 'null' }] }
    }
  },
  404: { type: 'object', properties: { error: { type: 'string' } } }
}
}

  }, async (req, reply) => {
    const q = (req as any).query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 12)))

    // cursor (ISO); se invalido lo ignoriamo
    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const where: any = {
      // se vuoi mostrare solo aperte: status: 'open',
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
        sponsors: { select: { name: true } },          // sponsor.name
        users:    { select: { id: true, username: true } } // judge user
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })

    const more = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map((r) => {
      const idNum = r.id != null ? Number(r.id) : null

      const judge = r.judge_user_id != null
        ? { id: Number(r.users?.id ?? r.judge_user_id), name: r.users?.username ?? null }
        : null

      return {
        id: idNum ?? r.slug ?? null, // id numerico o slug come fallback
        slug: r.slug ?? (idNum ? `ch-${idNum}` : null),
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
        judge,
        target: r.target_json ?? null,
        scoreboard: [], // placeholder
        updatedAt: r.updated_at ? r.updated_at.toISOString() : null
      }
    })

    const nextCursor = more && rows[limit].updated_at
      ? rows[limit].updated_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })

  // GET /api/v1/challenges/:idOrSlug — dettaglio
  app.get('/challenges/:idOrSlug', {
    schema: {
      tags: ['Challenges v1'],
      summary: 'Dettaglio challenge',
      params: {
        type: 'object',
        properties: {
          idOrSlug: { type: 'string' }
        },
        required: ['idOrSlug']
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { anyOf: [{ type: 'number' }, { type: 'string' }] },
            slug: { type: 'string' },
            title: { type: 'string' },
            type: { type: 'string' },
            location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            rules: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            deadline: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            status: { type: 'string' },
            budget: { anyOf: [{ type: 'object' }, { type: 'null' }] },
            sponsor: { anyOf: [{ type: 'object' }, { type: 'null' }] },
            judge: { anyOf: [{ type: 'object' }, { type: 'null' }] },
            target: { anyOf: [{ type: 'object' }, { type: 'null' }] },
            participants_count: { type: 'number' },
            scoreboard: { type: 'array' },
            updatedAt: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            createdAt: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { idOrSlug } = (req as any).params as { idOrSlug: string }

    const isNumericId = /^\d+$/.test(idOrSlug)
    const where = isNumericId
      ? { id: BigInt(idOrSlug) as any }
      : { slug: idOrSlug }

    const r = await prisma.challenges.findFirst({
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
        created_at: true,
        sponsors: { select: { name: true } },
        users:    { select: { id: true, username: true } }
      }
    })

    if (!r) return reply.code(404).send({ error: 'not found' })

    const idNum = r.id != null ? Number(r.id) : null
const judge = r.judge_user_id != null
  ? { id: Number(r.users?.id ?? r.judge_user_id), name: r.users?.username ?? null }
  : null

return reply.send({
  id: idNum ?? r.slug ?? null,
  slug: r.slug ?? (idNum ? `ch-${idNum}` : ''),
  title: r.title || '(senza titolo)',
  type: r.type || 'generic',
  location: r.location ?? null,
  rules: r.rules ?? '',
  deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
  status: r.status || 'open',

  // ✅ NULL quando assente
  budget: r.budget_amount != null
    ? { amount: Number(r.budget_amount), currency: r.budget_currency || 'EUR' }
    : null,

  // ✅ NULL quando assente
  sponsor: r.sponsors?.name ? { name: r.sponsors.name } : null,

  // ✅ oggetto solo se c’è un judge_user_id
  judge,

  // ✅ NULL quando assente
  target: r.target_json ?? null,

  participants_count: 0,        // (placeholder, invariato)
  scoreboard: [],               // (placeholder, invariato)
  updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  createdAt: r.created_at ? r.created_at.toISOString() : null
})

  })
}
