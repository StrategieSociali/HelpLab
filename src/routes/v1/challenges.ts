// src/routes/v1/challenges.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'

export async function challengesV1Routes(app: FastifyInstance) {
  // GET /api/v1/challenges — feed pubblico delle sfide "reali"
  app.get('/challenges', {
    schema: {
  tags: ['Challenges v1'],
  summary: 'Feed pubblico delle challenge (da proposals approvate)',
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'number' },
      cursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
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
            additionalProperties: true, // 👈 evita stripping dei campi
            properties: {
              id: { anyOf: [{ type: 'string' }, { type: 'number' }] },
              slug: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              title: { type: 'string' },
              type: { type: 'string' },
              location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              rules: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              deadline: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              status: { type: 'string' },
              budget: {
                anyOf: [
                  { type: 'null' },
                  {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                      amount: { type: 'number' },
                      currency: { type: 'string' }
                    }
                  }
                ]
              },
              sponsor: {
                anyOf: [
                  { type: 'null' },
                  { type: 'object', additionalProperties: true, properties: { name: { anyOf: [{ type: 'string' }, { type: 'null' }] } } }
                ]
              },
              judge: {
                anyOf: [
                  { type: 'null' },
                  {
                    type: 'object',
                    additionalProperties: true, // 👈 consente {id, name}
                    properties: {
                      id: { anyOf: [{ type: 'number' }, { type: 'string' }] },
                      name: { anyOf: [{ type: 'string' }, { type: 'null' }] }
                    }
                  }
                ]
              },
              target: { anyOf: [{ type: 'object', additionalProperties: true }, { type: 'null' }] },
              updatedAt: { anyOf: [{ type: 'string' }, { type: 'null' }] }
            }
          }
        },
        nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
      }
    }
  }
}

  }, async (req, reply) => {
    const q = (req as any).query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 12)))

    // cursor (ISO) -> Date valida oppure null
    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const where: any = {
      status: { in: ['open', 'in_review', 'closed'] as any },
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
        judge_user_id: true,                    // <-- serve per capire se c’è un giudice
        target_json: true,
        updated_at: true,
        sponsors: { select: { name: true } },   // sponsor.name (può essere null)
        users:    { select: { id: true, username: true } } // relazione judge -> users
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })
    


    const more = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map(r => {
      const idNum = r.id != null ? Number(r.id) : null

      // Se judge_user_id è valorizzato, restituiamo judge { id, name }
      const judge = r.judge_user_id != null
        ? {
            id: Number(r.users?.id ?? r.judge_user_id),
            name: r.users?.username ?? null
          }
        : null

      return {
        // Il FE può usare `slug` come stringa ID “stabile” per la UI
        id: r.slug ?? (idNum ? String(idNum) : null),
        slug: r.slug || (idNum ? `ch-${idNum}` : null),
        title: r.title || '',
        type: r.type || 'generic',
        location: r.location ?? null,
        rules: r.rules ?? '',
        deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
        status: r.status || 'open',
        budget: r.budget_amount != null
          ? { amount: Number(r.budget_amount), currency: r.budget_currency || 'EUR' }
          : { amount: 0, currency: 'EUR' },
        sponsor: r.sponsors?.name ? { name: r.sponsors.name } : { name: null },
        judge, // <-- adesso popolato quando esiste
        target: r.target_json ?? {},
        updatedAt: r.updated_at ? r.updated_at.toISOString() : null
      }
    })

    const nextCursor = more && rows[limit].updated_at
      ? rows[limit].updated_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })
}
