// src/routes/v1/sponsor.ts
/**
 * Scopo: gestione del profilo sponsor
 *
 * Funzionalità:
 * - GET /sponsors → elenco pubblico paginato con ricerca
 * - GET /sponsors/:id → dettaglio pubblico di uno sponsor
 * - GET /sponsors/me → profilo dello sponsor autenticato
 * - POST /sponsors/me → creazione profilo sponsor (prima volta)
 * - PUT /sponsors/me → aggiornamento completo profilo sponsor
 * - PATCH /sponsors/me → aggiornamento parziale profilo sponsor
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { serializeBigInt } from '../../utils/serialize.js'
import { users_role } from '@prisma/client'

// --- Schemas di validazione ---

// PUT e POST: tutti i campi, name obbligatorio
const sponsorBodyFull = z.object({
  name: z.string().min(2).max(180),
  website: z.string().url().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.string().url().max(255).optional().nullable()
}).strict()

// PATCH: tutti opzionali, almeno uno presente
const sponsorBodyPatch = z.object({
  name: z.string().min(2).max(180).optional(),
  website: z.string().url().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.string().url().max(255).optional().nullable()
}).strict().refine(
  data => Object.values(data).some(v => v !== undefined),
  { message: 'Almeno un campo deve essere presente' }
)

export async function sponsorRoutes(app: FastifyInstance) {

  // ================================
  // GET /api/v1/sponsors
  // Pubblico — elenco sponsor con paginazione e ricerca
  // ================================
  app.get('/sponsors', {
    schema: {
      tags: ['Sponsors'],
      summary: 'Elenco pubblico sponsor (paginato, con search)',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          cursor: { type: 'string' },
          search: { type: 'string' }
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
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const search =
      typeof q.search === 'string' && q.search.trim().length > 0
        ? q.search.trim()
        : null

    const where: any = {
      ...(cursorDate ? { created_at: { lt: cursorDate } } : {}),
      ...(search ? { name: { contains: search } } : {})
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
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
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

  // ================================
  // GET /api/v1/sponsors/:id
  // Pubblico — dettaglio sponsor con sponsorships attive (stato pagamento incluso)
  // ================================
  app.get('/sponsors/:id', {
    schema: {
      tags: ['Sponsors'],
      summary: 'Dettaglio pubblico di uno sponsor con storico sponsorizzazioni',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    let sponsorId: bigint
    try {
      sponsorId = BigInt(req.params.id)
    } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const sponsor = await prisma.sponsors.findUnique({
      where: { id: sponsorId },
      select: {
        id: true,
        name: true,
        website: true,
        description: true,
        logo_url: true,
        public_score: true,
        created_at: true,
        sponsorships: {
          select: {
            challenge_id:    true,
            amount_eur:      true,
            public_comment:  true,
            payment_status:  true,
            payment_deadline: true,
            confirmed_at:    true,
            sponsored_at:    true,
            challenge: {
              select: {
                title:  true,
                slug:   true,
                status: true
              }
            }
          },
          orderBy: { sponsored_at: 'desc' }
        }
      }
    })

    if (!sponsor) {
      return reply.code(404).send({ error: 'not found' })
    }

    // Nota: amount_eur esposto solo se > 0 (lo sponsor può scegliere di non renderlo pubblico)
    // private_notes e admin_notes NON escono mai qui
    const sponsorships = sponsor.sponsorships.map(s => ({
      challenge_id:     Number(s.challenge_id),
      challenge_title:  s.challenge?.title ?? null,
      challenge_slug:   s.challenge?.slug ?? null,
      challenge_status: s.challenge?.status ?? null,
      amount_eur:       s.amount_eur > 0 ? s.amount_eur : null,
      public_comment:   s.public_comment ?? null,
      payment_status:   s.payment_status,
      payment_deadline: s.payment_deadline
        ? s.payment_deadline.toISOString().slice(0, 10)
        : null,
      confirmed_at:     s.confirmed_at ? s.confirmed_at.toISOString() : null,
      sponsored_at:     s.sponsored_at instanceof Date
        ? s.sponsored_at.toISOString()
        : String(s.sponsored_at)
    }))

    return reply.send({
      id:           Number(sponsor.id),
      name:         sponsor.name,
      website:      sponsor.website ?? null,
      description:  sponsor.description ?? null,
      logo_url:     sponsor.logo_url ?? null,
      public_score: sponsor.public_score ?? null,
      created_at:   sponsor.created_at instanceof Date
        ? sponsor.created_at.toISOString()
        : String(sponsor.created_at),
      sponsorships
    })
  })

  // ================================
  // GET /api/v1/sponsors/me
  // Protetto (sponsor) — profilo personale
  // ================================
  app.get('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
    schema: {
      tags: ['Sponsors'],
      summary: 'Profilo dello sponsor autenticato',
      response: {
        200: { type: 'object', additionalProperties: true },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
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

  // ================================
  // POST /api/v1/sponsors/me
  // Protetto (sponsor) — creazione profilo (prima volta)
  // ================================
  app.post('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Sponsors'],
      summary: 'Crea profilo sponsor (prima volta)',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          website: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          logo_url: { anyOf: [{ type: 'string' }, { type: 'null' }] }
        },
        required: ['name']
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = sponsorBodyFull.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => (i.path.join('.') || '(root)') + ': ' + i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    const userId = BigInt(req.user.id)

    const exists = await prisma.sponsors.findUnique({
      where: { user_id: userId }
    })

    if (exists) {
      return reply.code(400).send({ error: 'already exists' })
    }

    const sponsor = await prisma.sponsors.create({
      data: {
        user_id: userId,
        name: parsed.data.name,
        website: parsed.data.website ?? null,
        description: parsed.data.description ?? null,
        logo_url: parsed.data.logo_url ?? null
      }
    })

    return reply.send(serializeBigInt(sponsor))
  })

  // ================================
  // PUT /api/v1/sponsors/me
  // Protetto (sponsor) — aggiornamento completo
  // ================================
  app.put('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
    schema: {
      tags: ['Sponsors'],
      summary: 'Aggiorna profilo sponsor (completo)',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          website: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          logo_url: { anyOf: [{ type: 'string' }, { type: 'null' }] }
        },
        required: ['name']
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = sponsorBodyFull.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => (i.path.join('.') || '(root)') + ': ' + i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    const userId = BigInt(req.user.id)

    const sponsor = await prisma.sponsors.update({
      where: { user_id: userId },
      data: {
        name: parsed.data.name,
        website: parsed.data.website ?? null,
        description: parsed.data.description ?? null,
        logo_url: parsed.data.logo_url ?? null
      }
    })

    return reply.send(serializeBigInt(sponsor))
  })

  // ================================
  // PATCH /api/v1/sponsors/me
  // Protetto (sponsor) — aggiornamento parziale
  // ================================
  app.patch('/sponsors/me', {
    preHandler: requireAuth(users_role.sponsor),
    schema: {
      tags: ['Sponsors'],
      summary: 'Aggiorna profilo sponsor (parziale)',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          website: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          logo_url: { anyOf: [{ type: 'string' }, { type: 'null' }] }
        }
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = sponsorBodyPatch.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => (i.path.join('.') || '(root)') + ': ' + i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    const userId = BigInt(req.user.id)

    // Costruisce oggetto data solo con i campi effettivamente presenti
    const data: any = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.website !== undefined) data.website = parsed.data.website
    if (parsed.data.description !== undefined) data.description = parsed.data.description
    if (parsed.data.logo_url !== undefined) data.logo_url = parsed.data.logo_url

    const sponsor = await prisma.sponsors.update({
      where: { user_id: userId },
      data
    })

    return reply.send(serializeBigInt(sponsor))
  })
}