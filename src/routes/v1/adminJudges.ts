import { FastifyInstance, FastifyReply } from 'fastify'
import { prisma } from '../../db/client.js'
import { verifyAccessToken } from '../../utils/jwt.js'

function requireAuth(role: 'admin') {
  return async (req: any, reply: FastifyReply) => {
    const auth = req.headers?.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    try {
      const p = verifyAccessToken(token) as any
      req.user = { id: BigInt(p.sub), email: p.email }
      const u = await prisma.users.findFirst({
        where: { id: req.user.id as any },
        select: { role: true }
      })
      if (!u) return reply.code(401).send({ error: 'unauthorized' })
      if (u.role !== 'admin') return reply.code(403).send({ error: 'forbidden' })
      req.user.role = u.role
    } catch {
      return reply.code(401).send({ error: 'unauthorized' })
    }
  }
}

export async function adminJudgesV1Routes(app: FastifyInstance) {
  app.get('/admin/judges', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Judges v1'],
      summary: 'Elenco dei giudici (opzionalmente include anche admin)',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          limit: { type: 'number' },
          cursor: { type: 'string' },        // ISO Date (basata su created_at)
          includeAdmins: { type: 'boolean' } // default false
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
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  role: { type: 'string' },
                  updatedAt: { type: 'string' } // usiamo created_at ma esponiamo updatedAt per coerenza FE
                },
                required: ['id', 'username', 'role', 'updatedAt']
              }
            },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          },
          required: ['items', 'nextCursor']
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: requireAuth('admin')
  }, async (req: any, reply) => {
    const q = req.query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    // cursor (ISO); se invalido lo ignoriamo
    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const includeAdmins = String(q.includeAdmins ?? 'false').toLowerCase() === 'true'
    const roles = includeAdmins ? ['judge', 'admin'] : ['judge']

    const where: any = {
      role: { in: roles as any },
      ...(q.q
        ? {
            OR: [
              { username: { contains: String(q.q) } as any },
              { email: { contains: String(q.q) } as any }
            ]
          }
        : {}),
      ...(cursorDate ? { created_at: { lt: cursorDate } } : {})
    }

    const rows = await prisma.users.findMany({
      where,
      select: { id: true, username: true, email: true, role: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: limit + 1
    })

    const more = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map(r => ({
      id: Number(r.id),
      username: r.username,
      email: r.email ?? null,
      role: r.role ?? 'user',
      // esponiamo come updatedAt (per coerenza FE), ma deriva da created_at
      updatedAt: r.created_at.toISOString()
    }))

    const nextCursor =
      more && rows[limit]?.created_at ? rows[limit].created_at.toISOString() : null

    return reply.send({ items, nextCursor })
  })
}
