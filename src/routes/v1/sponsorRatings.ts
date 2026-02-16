// src/routes/v1/sponsorRatings.ts
/**
 * Scopo: Gestione recensioni degli sponsor da parte degli utenti
 * - POST: create o update (una sola recensione a vita, modificabile)
 * - GET: elenco recensioni per uno sponsor (pubblico, paginato, privacy-safe)
 * - GET: media voti per uno sponsor (pubblico)
 */

import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { serializeBigInt } from '../../utils/serialize.js'
import { users_role } from '@prisma/client'

function clampInt(value: any, def: number, min: number, max: number) {
  const n = Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(n)) return def
  return Math.max(min, Math.min(max, n))
}


export async function sponsorRatingsRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/sponsors/:id/ratings
   * Crea o aggiorna una recensione per lo sponsor indicato.
   * Regola: consentito solo se l'utente ha almeno 1 submission su una challenge di quello sponsor.
   */
  app.post(
    '/sponsors/:id/ratings',
    {
      preHandler: requireAuth(users_role.user),
      schema: {
        tags: ['Sponsors'],
        summary: 'Crea o aggiorna una recensione per uno sponsor (solo se hai almeno una submission)',
        body: {
          type: 'object',
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            feedback: { type: 'string', maxLength: 2000 }
          },
          required: ['rating']
        }
      }
    },
    async (req: any, reply) => {
      // 1) Parse IDs
      let sponsorId: bigint
      try {
        sponsorId = BigInt(req.params.id)
      } catch {
        return reply.code(400).send({ error: 'invalid_sponsor_id' })
      }

      const userId = BigInt(req.user.id)
      const { rating, feedback } = req.body ?? {}

      // 2) Sponsor existence (evita errori FK e risposte ambigue)
      const sponsorExists = await prisma.sponsors.findUnique({
        where: { id: sponsorId },
        select: { id: true }
      })
      if (!sponsorExists) {
        return reply.code(404).send({ error: 'sponsor_not_found' })
      }

      // 3) Eligibility check: almeno una submission su challenge dello sponsor
      const hasSubmission = await prisma.challenge_submissions.findFirst({
        where: {
          user_id: userId,
          challenges: {
            sponsor_id: sponsorId
          }
        },
        select: { id: true }
      })

      if (!hasSubmission) {
        return reply.code(403).send({ error: 'not_eligible' })
      }

      // 4) Create or Update (una sola recensione a vita, modificabile)
      const existing = await prisma.sponsor_ratings.findUnique({
        where: {
          sponsor_id_user_id: {
            sponsor_id: sponsorId,
            user_id: userId
          }
        },
        select: { sponsor_id: true, user_id: true, created_at: true }
      })

      if (!existing) {
        const created = await prisma.sponsor_ratings.create({
          data: {
            sponsor_id: sponsorId,
            user_id: userId,
            rating,
            feedback: feedback ?? null
          },
          select: {
            sponsor_id: true,
            rating: true,
            feedback: true,
            created_at: true
          }
        })
        return reply.code(201).send(serializeBigInt(created))
      }

      const updated = await prisma.sponsor_ratings.update({
        where: {
          sponsor_id_user_id: {
            sponsor_id: sponsorId,
            user_id: userId
          }
        },
        data: {
          rating,
          feedback: feedback ?? null
        },
        select: {
          sponsor_id: true,
          rating: true,
          feedback: true,
          created_at: true
        }
      })

      return reply.code(200).send(serializeBigInt(updated))
    }
  )

  /**
   * GET /api/v1/sponsors/:id/ratings
   * Pubblico, paginato, privacy-safe
   * Query: ?limit=20&offset=0
   */
  app.get(
    '/sponsors/:id/ratings',
    {
      schema: {
        tags: ['Sponsors'],
        summary: 'Elenco recensioni di uno sponsor (pubblico, paginato)',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 50 },
            offset: { type: 'integer', minimum: 0 }
          }
        }
      }
    },
    async (req: any, reply) => {
      let sponsorId: bigint
      try {
        sponsorId = BigInt(req.params.id)
      } catch {
        return reply.code(400).send({ error: 'invalid_sponsor_id' })
      }

      const sponsorExists = await prisma.sponsors.findUnique({
        where: { id: sponsorId },
        select: { id: true }
      })
      if (!sponsorExists) {
        return reply.code(404).send({ error: 'sponsor_not_found' })
      }

      const limit = clampInt(req.query?.limit, 20, 1, 50)
      const offset = clampInt(req.query?.offset, 0, 0, 1_000_000)

      const ratings = await prisma.sponsor_ratings.findMany({
        where: { sponsor_id: sponsorId },
        select: {
          rating: true,
          feedback: true,
          created_at: true,
          user: {
            select: {
              nickname: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      })

      return reply.send({
        limit,
        offset,
        items: ratings.map(r => ({
          rating: r.rating,
          feedback: r.feedback,
          created_at: r.created_at,
          nickname: r.user?.nickname ?? null
        }))
      })
    }
  )

  /**
   * GET /api/v1/sponsors/:id/ratings/average
   * Pubblico
   */
  app.get(
    '/sponsors/:id/ratings/average',
    {
      schema: {
        tags: ['Sponsors'],
        summary: 'Media valutazioni sponsor (pubblico)'
      }
    },
    async (req: any, reply) => {
      let sponsorId: bigint
      try {
        sponsorId = BigInt(req.params.id)
      } catch {
        return reply.code(400).send({ error: 'invalid_sponsor_id' })
      }

      const sponsorExists = await prisma.sponsors.findUnique({
        where: { id: sponsorId },
        select: { id: true }
      })
      if (!sponsorExists) {
        return reply.code(404).send({ error: 'sponsor_not_found' })
      }

      const result = await prisma.sponsor_ratings.aggregate({
        where: { sponsor_id: sponsorId },
        _avg: { rating: true },
        _count: { rating: true }
      })

      return reply.send({
        average: result._avg.rating ?? 0,
        total: result._count.rating
      })
    }
  )
}