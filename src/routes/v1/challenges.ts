// src/routes/v1/challenges.ts
/**
 * Scopo: gestione delle challenge pubbliche e modifica da parte di giudice/admin
 *
 * Funzionalità:
 * - GET   /challenges           → lista pubblica paginata
 * - GET   /challenges/:idOrSlug → dettaglio challenge
 * - PATCH /challenges/:id       → modifica challenge (giudice assegnato o admin)
 *
 * Regola modifica:
 * Solo il giudice assegnato alla challenge o un admin possono modificarla.
 * Il giudice non può cambiare lo stato della challenge né riassegnare il giudice —
 * quelle operazioni sono riservate all'admin.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role } from '@prisma/client'
import { z } from 'zod'


// ================================
// Schema validazione PATCH
// ================================
const patchChallengeSchema = z.object({
  title:    z.string().min(5).max(200).optional(),
  location: z.string().max(255).optional(),
  rules:    z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato atteso: YYYY-MM-DD').optional(),
  type:     z.string().max(80).optional()
}).strict()


export async function challengesV1Routes(app: FastifyInstance) {

  // ================================
  // GET /api/v1/challenges — lista paginata
  // ================================
  app.get('/challenges', {
    schema: {
      tags: ['Challenges v1'],
      summary: 'Lista challenge pubbliche (paginata)',
      querystring: {
        type: 'object',
        properties: {
          limit:  { type: 'number' },
          cursor: { type: 'string' },
          status: { type: 'string', enum: ['open', 'in_review', 'closed'] }
        }
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id:                 { anyOf: [{ type: 'number' }, { type: 'string' }] },
            slug:               { type: 'string' },
            title:              { type: 'string' },
            type:               { type: 'string' },
            location:           { anyOf: [{ type: 'string' }, { type: 'null' }] },
            rules:              { anyOf: [{ type: 'string' }, { type: 'null' }] },
            deadline:           { anyOf: [{ type: 'string' }, { type: 'null' }] },
            status:             { type: 'string' },
            budget:             { anyOf: [{ type: 'object' }, { type: 'null' }] },
            sponsor:            { anyOf: [{ type: 'object' }, { type: 'null' }] },
            judge:              { anyOf: [{ type: 'object' }, { type: 'null' }] },
            target:             { anyOf: [{ type: 'object' }, { type: 'null' }] },
            participants_count: { type: 'number' },
            scoreboard:         { type: 'array' },
            updatedAt:          { anyOf: [{ type: 'string' }, { type: 'null' }] },
            createdAt:          { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const q = (req as any).query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 12)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const validStatuses = ['open', 'in_review', 'closed']
    const statusFilter = q.status && validStatuses.includes(q.status) ? q.status : undefined

    const where: any = {
      ...(cursorDate   ? { updated_at: { lt: cursorDate } } : {}),
      ...(statusFilter ? { status: statusFilter }           : {})
    }

    const rows = await prisma.challenges.findMany({
      where,
      select: {
        id:              true,
        slug:            true,
        title:           true,
        type:            true,
        location:        true,
        rules:           true,
        deadline:        true,
        status:          true,
        budget_amount:   true,
        budget_currency: true,
        sponsor_id:      true,
        judge_user_id:   true,
        target_json:     true,
        updated_at:      true,
        sponsors: { select: { name: true } },
        users:    { select: { id: true, username: true } }
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })

    const more  = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map((r) => {
      const idNum = r.id != null ? Number(r.id) : null
      const judge = r.judge_user_id != null
        ? { id: Number(r.users?.id ?? r.judge_user_id), name: r.users?.username ?? null }
        : null

      return {
        id:                 idNum ?? r.slug ?? null,
        slug:               r.slug ?? (idNum ? `ch-${idNum}` : null),
        title:              r.title || '(senza titolo)',
        type:               r.type || 'generic',
        location:           r.location ?? null,
        rules:              r.rules ?? '',
        deadline:           r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
        status:             r.status || 'open',
        budget:             r.budget_amount != null
                              ? { amount: Number(r.budget_amount), currency: r.budget_currency || 'EUR' }
                              : null,
        sponsor:            r.sponsors?.name ? { name: r.sponsors.name } : null,
        judge,
        target:             r.target_json ?? null,
        scoreboard:         [],
        updatedAt:          r.updated_at ? r.updated_at.toISOString() : null
      }
    })

    const nextCursor = more && rows[limit].updated_at
      ? rows[limit].updated_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })


  // ================================
  // GET /api/v1/challenges/:idOrSlug — dettaglio
  // ================================
  app.get('/challenges/:idOrSlug', {
    schema: {
      tags: ['Challenges v1'],
      summary: 'Dettaglio challenge',
      params: {
        type: 'object',
        properties: { idOrSlug: { type: 'string' } },
        required: ['idOrSlug']
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id:                 { anyOf: [{ type: 'number' }, { type: 'string' }] },
            slug:               { type: 'string' },
            title:              { type: 'string' },
            type:               { type: 'string' },
            location:           { anyOf: [{ type: 'string' }, { type: 'null' }] },
            rules:              { anyOf: [{ type: 'string' }, { type: 'null' }] },
            deadline:           { anyOf: [{ type: 'string' }, { type: 'null' }] },
            status:             { type: 'string' },
            budget:             { anyOf: [{ type: 'object' }, { type: 'null' }] },
            sponsor:            { anyOf: [{ type: 'object' }, { type: 'null' }] },
            judge:              { anyOf: [{ type: 'object' }, { type: 'null' }] },
            target:             { anyOf: [{ type: 'object' }, { type: 'null' }] },
            participants_count: { type: 'number' },
            scoreboard:         { type: 'array' },
            updatedAt:          { anyOf: [{ type: 'string' }, { type: 'null' }] },
            createdAt:          { anyOf: [{ type: 'string' }, { type: 'null' }] }
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
        id:              true,
        slug:            true,
        title:           true,
        type:            true,
        location:        true,
        rules:           true,
        deadline:        true,
        status:          true,
        budget_amount:   true,
        budget_currency: true,
        sponsor_id:      true,
        judge_user_id:   true,
        target_json:     true,
        updated_at:      true,
        created_at:      true,
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
      id:                 idNum ?? r.slug ?? null,
      slug:               r.slug ?? (idNum ? `ch-${idNum}` : ''),
      title:              r.title || '(senza titolo)',
      type:               r.type || 'generic',
      location:           r.location ?? null,
      rules:              r.rules ?? '',
      deadline:           r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
      status:             r.status || 'open',
      budget:             r.budget_amount != null
                            ? { amount: Number(r.budget_amount), currency: r.budget_currency || 'EUR' }
                            : null,
      sponsor:            r.sponsors?.name ? { name: r.sponsors.name } : null,
      judge,
      target:             r.target_json ?? null,
      participants_count: 0,
      scoreboard:         [],
      updatedAt:          r.updated_at ? r.updated_at.toISOString() : null,
      createdAt:          r.created_at ? r.created_at.toISOString() : null
    })
  })


  // ================================
  // PATCH /api/v1/challenges/:id
  // Modifica challenge — giudice assegnato o admin
  // Il giudice può modificare: title, location, rules, deadline, type
  // Non può cambiare status, giudice assegnato o sponsor (operazioni admin)
  // ================================
  app.patch('/challenges/:id', {
    preHandler: requireAuth(users_role.judge),
    schema: {
      tags: ['Challenges v1'],
      summary: 'Modifica challenge (giudice assegnato o admin)',
      description: 'Il giudice assegnato può modificare title, location, rules, deadline e type. Le operazioni di cambio stato, riassegnazione giudice e gestione sponsor sono riservate all\'admin.',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title:    { type: 'string', minLength: 5, maxLength: 200 },
          location: { type: 'string', maxLength: 255 },
          rules:    { type: 'string' },
          deadline: { type: 'string', description: 'Formato YYYY-MM-DD' },
          type:     { type: 'string', maxLength: 80 }
        }
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true
        },
        400: { type: 'object', properties: { error: { type: 'string' }, errors: { type: 'object' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const { id } = req.params as { id: string }
    const challengeId = BigInt(id)

    const challenge = await prisma.challenges.findUnique({
      where:  { id: challengeId },
      select: { id: true, judge_user_id: true, title: true, status: true }
    })

    if (!challenge) return reply.code(404).send({ error: 'Challenge non trovata' })

    // Verifica autorizzazione: admin sempre, judge solo se assegnato
    const isAdmin         = req.user.role === users_role.admin
    const isAssignedJudge = challenge.judge_user_id !== null &&
                            BigInt(challenge.judge_user_id as any) === BigInt(req.user.id)

    if (!isAdmin && !isAssignedJudge) {
      return reply.code(403).send({ error: 'Non autorizzato: devi essere il giudice assegnato o un admin' })
    }

    const parsed = patchChallengeSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const data = parsed.data
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: 'Nessun campo da aggiornare fornito' })
    }

    const updateData: Record<string, any> = {}
    if (data.title    !== undefined) updateData.title    = data.title
    if (data.location !== undefined) updateData.location = data.location
    if (data.rules    !== undefined) updateData.rules    = data.rules
    if (data.type     !== undefined) updateData.type     = data.type
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline)

    const updated = await prisma.challenges.update({
      where: { id: challengeId },
      data:  updateData,
      select: {
        id:       true,
        slug:     true,
        title:    true,
        type:     true,
        location: true,
        rules:    true,
        deadline: true,
        status:   true,
        updated_at: true
      }
    })

    return reply.send({
      id:         Number(updated.id),
      slug:       updated.slug,
      title:      updated.title,
      type:       updated.type,
      location:   updated.location ?? null,
      rules:      updated.rules ?? null,
      deadline:   updated.deadline ? updated.deadline.toISOString().slice(0, 10) : null,
      status:     updated.status,
      updatedAt:  updated.updated_at.toISOString()
    })
  })
}