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
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === 'bigint' ? Number(value) : serializeBigInt(value)
      ])
    )
  }
  return obj
}

export async function sponsorRoutes(app: FastifyInstance) {

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
