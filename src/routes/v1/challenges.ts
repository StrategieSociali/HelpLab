// v1: lista sfide pubbliche derivate da challenge_proposals APPROVATE
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { makeSlug } from '../../utils/slug.js'

export async function challengesV1Routes(app: FastifyInstance) {
  app.get('/challenges', {
    schema: {
      tags: ['Challenges v1'],
      summary: 'Lista sfide pubbliche (da proposals approvate)',
      querystring: {
        type: 'object',
        properties: {
          limit:  { type: 'integer', minimum: 1, maximum: 50, default: 12 },
          // cursor = ISO date di updated_at per paginazione "infinite scroll"
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
                properties: {
                  id:       { type: 'string' },
                  slug:     { type: 'string' },
                  title:    { type: 'string' },
                  type:     { type: 'string' },
                  location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  rules:    { type: 'string' },
                  deadline: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  status:   { type: 'string' },
                  budget:   {
                    type: 'object',
                    properties: {
                      amount:   { type: 'number' },
                      currency: { type: 'string' }
                    },
                    required: ['amount','currency']
                  },
                  sponsor:  {
                    type: 'object',
                    properties: { name: { anyOf: [{ type: 'string' }, { type: 'null' }] } }
                  },
                  judge:    {
                    type: 'object',
                    properties: { name: { anyOf: [{ type: 'string' }, { type: 'null' }] } }
                  },
                  target: {
                    type: 'object',
                    properties: {
                      kind:   { anyOf: [{ type:'string' }, { type:'null' }] },
                      unit:   { anyOf: [{ type:'string' }, { type:'null' }] },
                      amount: { type: 'number' }
                    },
                    required: ['amount']
                  },
                  scoreboard: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        user:  { type: 'string' },
                        score: { type: 'number' }
                      },
                      required: ['user','score']
                    }
                  },
                  updatedAt: { type: 'string' }
                },
                required: ['id','slug','title','type','budget','target','scoreboard','updatedAt'],
                additionalProperties: false
              }
            },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          },
          required: ['items']
        }
      }
    }
  }, async (req, reply) => {
    const q = (req as any).query || {}
    const limit = Math.min(Math.max(Number(q.limit ?? 12), 1), 50)
    const cursor = q.cursor ? new Date(q.cursor) : null

    const where: any = { status: 'approved' }
    const cursorStr = (q.cursor ?? '').toString().trim()
    const cursorDate = cursorStr ? new Date(cursorStr) : null
    if (cursorDate && !isNaN(cursorDate.getTime())) {
      where.updated_at = { lt: cursorDate }
}

    const rows = await prisma.challenge_proposals.findMany({
      where,
      select: {
        id: true,
        title: true,
        impact_type: true,
        location_address: true,
        deadline: true,
        target: true,
        updated_at: true
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })

    const items = rows.slice(0, limit).map(r => {
      const t: any = r.target || {}
      return {
        id: r.id,
        slug: makeSlug(r.title || 'sfida'),
        title: r.title || 'Sfida',
        type: r.impact_type || 'generic',
        location: r.location_address ?? null,
        rules: '',
        deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
        status: 'open',
        budget: { amount: 0, currency: 'EUR' },
        sponsor: { name: null },
        judge: { name: null },
        target: {
          kind: t.kind ?? null,
          unit: t.unit ?? null,
          amount: Number(t.amount ?? 0)
        },
        scoreboard: [],
        updatedAt: r.updated_at.toISOString()
      }
    })

    const hasMore = rows.length > limit
    const nextCursor = hasMore ? rows[limit].updated_at.toISOString() : null

    return reply.send({ items, nextCursor })
  })
}
