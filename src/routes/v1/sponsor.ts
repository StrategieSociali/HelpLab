// src/routes/v1/sponsor.ts
/**
 * Scopo: gestisce il profilo degli sponsor
 *
 * Attualmente supporta:
 * - dati di registrazione dello sponsor
 * - esposizione dei dati
 * - creazione e modifica profilo
 */

import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role } from '@prisma/client'

function serializeBigInt(obj: any): any {
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt)
  }

  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === 'bigint'
          ? Number(value)
          : serializeBigInt(value)
      ])
    )
  }

  return obj
}

export async function sponsorRoutes(app: FastifyInstance) {
  
   /**
   * GET /api/v1/sponsors
   * Pubblico – elenco sponsor con paginazione a cursor e search
   */
  app.get('/sponsors', {
    schema: {
      tags: ['Sponsors'],
      summary: 'Elenco pubblico sponsor (paginato, con search)',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          cursor: { type: 'string' }, // ISO date
          search: { type: 'string' }  // ricerca per nome sponsor
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
                  name: { type: 'string' },
                  logo_url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  website: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  public_score: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                  created_at: { type: 'string' }
                },
                required: ['id', 'name', 'created_at']
              }
            },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          },
          required: ['items', 'nextCursor']
        }
      }
    }
  }, async (req: any, reply) => {
    const q = req.query || {}

    // limit sicuro
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    // cursor: ISO date (fallback silenzioso se invalido)
    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) {
        cursorDate = d
      }
    }

    // search: trim + ignore se vuota
    const search =
      typeof q.search === 'string' && q.search.trim().length > 0
        ? q.search.trim()
        : null

    // where dinamico (cursor + search)
    const where: any = {
      ...(cursorDate ? { created_at: { lt: cursorDate } } : {}),
      ...(search
        ? {
            name: {
              contains: search,
              }
          }
        : {})
    }

    const rows = await prisma.sponsors.findMany({
      where,
      select: {
        id: true,
        name: true,
        logo_url: true,
        website: true,
        public_score: true,
        created_at: true
      },
      orderBy: [
        { created_at: 'desc' },
        { id: 'desc' }
      ],
      take: limit + 1
    })

    const hasMore = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map(s => ({
      id: Number(s.id),
      name: s.name,
      logo_url: s.logo_url ?? null,
      website: s.website ?? null,
      public_score: s.public_score ?? null,
      created_at: s.created_at instanceof Date
        ? s.created_at.toISOString()
        : String(s.created_at)
    }))

    const nextCursor =
      hasMore && rows[limit]?.created_at instanceof Date
        ? rows[limit].created_at.toISOString()
        : null

    return reply.send({ items, nextCursor })
  })
  
  

  /**
   * GET /api/v1/sponsors/:id
   * Pubblico
   */
  app.get('/sponsors/:id', async (req: any, reply) => {
    const sponsorId = BigInt(req.params.id)

    const sponsor = await prisma.sponsors.findUnique({
      where: { id: sponsorId },
      select: {
        id: true,
        name: true,
        website: true,
        description: true,
        logo_url: true,
        public_score: true,
        created_at: true
      }
    })

    if (!sponsor) {
      return reply.code(404).send({ error: 'not found' })
    }

    return reply.send(serializeBigInt(sponsor))
  })

  /**
   * GET /api/v1/sponsors/me
   */
  app.get('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)

    const sponsor = await prisma.sponsors.findUnique({
      where: { user_id: userId }
    })

    if (!sponsor) {
      return reply.code(404).send({ error: 'not found' })
    }

    return reply.send(serializeBigInt(sponsor))
  })

  /**
   * PUT /api/v1/sponsors/me
   */
  app.put('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)
    const body = req.body || {}

    if (!body.name) {
      return reply.code(400).send({ error: 'name is required' })
    }

    const sponsor = await prisma.sponsors.update({
      where: { user_id: userId },
      data: {
        name: body.name,
        website: body.website ?? null,
        description: body.description ?? null,
        logo_url: body.logo_url ?? null
      }
    })

    return reply.send(serializeBigInt(sponsor))
  })
  
    /**
   * PATCH /api/v1/sponsors/me
   */
  
  app.patch('/sponsors/me', {
  preHandler: requireAuth(users_role.sponsor),
}, async (req: any, reply) => {
  const userId = BigInt(req.user.id)
  const body = req.body || {}

  const allowedFields = {
    name: body.name,
    website: body.website,
    description: body.description,
    logo_url: body.logo_url
  }

  const sponsor = await prisma.sponsors.update({
    where: { user_id: userId },
    data: allowedFields
  })

  return reply.send(serializeBigInt(sponsor))
})

  /**
   * POST /api/v1/sponsors/me
   */
  app.post('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)
    const body = req.body || {}

    if (!body.name) {
      return reply.code(400).send({ error: 'name is required' })
    }

    const exists = await prisma.sponsors.findUnique({
      where: { user_id: userId }
    })

    if (exists) {
      return reply.code(400).send({ error: 'already exists' })
    }

    const sponsor = await prisma.sponsors.create({
      data: {
        user_id: userId,
        name: body.name,
        website: body.website ?? null,
        description: body.description ?? null,
        logo_url: body.logo_url ?? null
      }
    })

    return reply.send(serializeBigInt(sponsor))
  })
}
