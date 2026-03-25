// src/routes/v1/proposals.ts
/**
 * Scopo: gestione del ciclo di vita delle proposte di challenge
 *
 * Funzionalità:
 * - GET /admin/proposals → lista paginata delle proposte (solo admin)
 * - POST /challenge-proposals → creazione di una nuova proposta (utente autenticato)
 * - PATCH /challenge-proposals/:id/approve → approvazione proposta e creazione challenge (solo admin)
 * - PATCH /challenge-proposals/:id/reject → rifiuto proposta con motivazione (solo admin)
 *
 * SECURITY FIX (be-1.0):
 * - [CRITICA] approved_co2 e max_points validati con Zod prima di essere scritti nel DB.
 *   Prima arrivavano da req.body senza controllo di tipo o range.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db/client.js'
import { proposalBodySchema } from '../../schemas/scoringSchemas.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { copyProposalTasks } from '../../utils/copyProposalTasks.js'
import { users_role } from '@prisma/client'


// --- util: pulizia payload (toglie null, "", normalizza) ---
function cleanPayload(input: any): any {
  if (Array.isArray(input)) {
    return input.map(cleanPayload).filter(v => v !== undefined)
  }
  if (input && typeof input === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      const c = cleanPayload(v)
      if (c !== undefined) out[k] = c
    }
    return out
  }
  if (input === null) return undefined
  if (typeof input === 'string') {
    const t = input.trim()
    if (t === '') return undefined
    return t
  }
  return input
}

// FIX [CRITICA]: schema Zod per i campi opzionali dell'endpoint approve.
// approved_co2: numero >= 0 oppure null/assente (non ha senso una CO2 negativa)
// max_points: intero >= 1 con un tetto ragionevole oppure null/assente
const approveBodySchema = z.object({
  approved_co2: z.number().min(0).nullable().optional(),
  max_points:   z.number().int().min(1).max(100000).nullable().optional()
}).strict()

export async function proposalsV1Routes(app: FastifyInstance) {
  // =========================
  // GET /api/v1/admin/proposals  (SOLO ADMIN) – listing paginato
  // =========================
  app.get('/admin/proposals', {
    schema: {
      tags: ['Proposals v1'],
      summary: 'Lista challenge proposals (solo admin, paginato)',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending_review', 'approved', 'rejected'] },
          limit:  { type: 'number' },
          cursor: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { type: 'object', additionalProperties: true }
            },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: requireAuth(users_role.admin)
  }, async (req: any, reply) => {
    const q = (req.query || {}) as { status?: string; limit?: number; cursor?: string }

    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const where: any = {}
    if (q.status) where.status = q.status
    if (cursorDate) where.updated_at = { lt: cursorDate }

    const rows = await prisma.challenge_proposals.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        updated_at: true,
        users: { select: { id: true, username: true } }
      },
      orderBy: { updated_at: 'desc' },
      take: limit + 1
    })

    const more = rows.length > limit
    const slice = rows.slice(0, limit)

    const items = slice.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      updatedAt: r.updated_at?.toISOString() ?? null,
      author: r.users ? { id: Number(r.users.id), name: r.users.username } : null
    }))

    const nextCursor = more && rows[limit]?.updated_at
      ? rows[limit].updated_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })


  // =========================
  // POST /api/v1/challenge-proposals   (AUTENTICATI)
  // =========================
  app.post('/challenge-proposals', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: requireAuth(),
    schema: {
      tags: ['Proposals v1'],
      summary: 'Crea una proposta di challenge (protetto con Bearer)',
      description: 'Accetta il JSON della bozza, valida regole minime e salva come "pending_review".',
      security: [{ bearerAuth: [] }],
      body: { type: 'object' },
      response: {
        201: {
          type: 'object',
          properties: {
            proposalId: { type: 'string' },
            status: { type: 'string' },
            version: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    // 1) Sanitize base
    const body = cleanPayload(req.body || {})

    // 2) Coercioni mirate
    if (body?.target?.amount !== undefined) body.target.amount = Number(body.target.amount)
    if (body?.co2e_estimate_kg !== undefined) body.co2e_estimate_kg = Number(body.co2e_estimate_kg)
    if (body?.sponsor_budget_requested !== undefined) body.sponsor_budget_requested = Number(body.sponsor_budget_requested)

    // 3) Normalizza i task preservando payload_schema
    // IMPORTANTE: payload_schema viene mantenuto nel JSON della proposal
    // in modo che copyProposalTasks possa trasferirlo ai challenge_tasks
    // al momento dell'approvazione.
    if (Array.isArray(body?.tasks)) {
      let i = 1
      body.tasks = body.tasks.map((t: any) => ({
        id:               t?.id || `t${i++}`,
        label:            t.label,
        evidence_required: !!t.evidence_required,
        verification:     t.verification || 'user',
        max_points:       t.max_points   ?? null,
        co2_quota:        t.co2_quota    ?? null,
        payload_schema:   t.payload_schema ?? null  // ← preservato
      }))
    }

    // 4) Validazione Zod
    const parsed = proposalBodySchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => (i.path.join('.') || '(root)') + ': ' + i.message)
      app.log.warn({ validation_error: issues }, 'Invalid proposal body')
      return reply.code(400).send({ error: issues.join('; ') || 'invalid body' })
    }

    const b = parsed.data
    const uid = BigInt(String(req.user.id))

    const created = await prisma.challenge_proposals.create({
      data: {
        user_id:          uid as any,
        title:            b.title,
        description:      b.description,
        impact_type:      b.impact_type,
        start_date:       b.start_date ? new Date(b.start_date) : null,
        deadline:         b.deadline   ? new Date(b.deadline)   : null,
        location_address: b.location?.address,
        location_geo:     b.location?.geo as any,
        target:           b.target as any,
        tasks:            b.tasks as any,
        visibility_options: b.visibility_options as any,
        co2e_estimate_kg: b.co2e_estimate_kg as any,
        difficulty:       b.difficulty ?? null,
        complexity_notes: b.complexity_notes,
        sponsor_interest: b.sponsor_interest ?? false,
        sponsor_pitch:    b.sponsor_pitch,
        sponsor_budget_requested: b.sponsor_budget_requested ?? null,
        terms_consent:    true,
        status:           'pending_review'
      } as any,
      select: { id: true, status: true }
    })

    return reply.code(201).send({
      proposalId: created.id,
      status:     created.status,
      version:    '1.0'
    })
  })

  // =========================
  // PATCH /api/v1/challenge-proposals/:id/approve   (SOLO ADMIN)
  // =========================
  function toSlugBase(s: string) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  }
  function shortId(n = 6) {
    return Math.random().toString(36).slice(2, 2 + n)
  }

  app.patch('/challenge-proposals/:id/approve', {
    schema: {
      tags: ['Proposals v1'],
      summary: 'Approva una proposal e crea/aggiorna la challenge collegata',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          approved_co2: { type: 'number', nullable: true },
          max_points:   { type: 'number', nullable: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            proposalId:  { type: 'string' },
            challengeId: { anyOf: [{ type: 'number' }, { type: 'null' }] },
            status:      { type: 'string' },
            updatedAt:   { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' }, errors: { type: 'object' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: requireAuth(users_role.admin)
  }, async (req: any, reply) => {
    const id = String((req.params as any).id || '')
    if (!id) return reply.code(404).send({ error: 'not found' })

    // FIX [CRITICA]: approved_co2 e max_points validati con Zod.
    // Prima venivano letti da req.body e passati direttamente a Prisma
    // senza nessun controllo di tipo o range.
    // - approved_co2: deve essere un numero >= 0 (CO2 negativa non ha senso)
    // - max_points: deve essere un intero >= 1 con tetto a 100.000
    // Entrambi accettano null (campo non fornito = nessuna modifica).
    const bodyParsed = approveBodySchema.safeParse(req.body || {})
    if (!bodyParsed.success) {
      return reply.code(400).send({ errors: bodyParsed.error.flatten().fieldErrors })
    }
    const { approved_co2, max_points } = bodyParsed.data

    const p = await prisma.challenge_proposals.findUnique({
      where: { id },
      select: {
        id:               true,
        status:           true,
        title:            true,
        impact_type:      true,
        location_address: true,
        deadline:         true,
        target:           true,
        challenge_id:     true,
        sponsor_interest: true
      }
    })

    if (!p) return reply.code(404).send({ error: 'proposal not found' })
    if (p.status !== 'pending_review') {
      return reply.code(409).send({ error: 'invalid status transition' })
    }

    const now         = new Date()
    const title       = p.title ?? '(senza titolo)'
    const type        = p.impact_type ?? 'generic'
    const slug        = `${toSlugBase(title) || 'challenge'}-${shortId(6)}`
    const challengeId = (p as any).challenge_id ?? null

    const { outId, outUpdatedAt } = await prisma.$transaction(async (tx) => {
      const challengeData: any = {
        title,
        type,
        location: p.location_address ?? null,
        rules:    '',
        deadline: p.deadline ? new Date(p.deadline) : null,
        target_json: p.target as any,
        status:   'open',
        sponsor_interest: p.sponsor_interest ?? false
      }

      if (type === 'climate' && approved_co2 !== undefined && approved_co2 !== null) {
        challengeData.approved_co2 = approved_co2
      }
      if (max_points !== undefined && max_points !== null) {
        challengeData.max_points = max_points
      }

      let createdOrUpdatedId: bigint
      let updatedAt: Date | null = null

      if (challengeId) {
        const upd = await tx.challenges.update({
          where: { id: challengeId as any },
          data:  challengeData,
          select: { id: true, updated_at: true }
        })
        createdOrUpdatedId = upd.id
        updatedAt = upd.updated_at
      } else {
        const crt = await tx.challenges.create({
          data: {
            ...challengeData,
            proposal_uuid:   p.id,
            slug,
            budget_currency: 'EUR',
            judge_user_id:   null
          },
          select: { id: true, updated_at: true }
        })
        createdOrUpdatedId = crt.id
        updatedAt = crt.updated_at
      }

      await copyProposalTasks(p.id, createdOrUpdatedId, tx as any)

      await tx.challenge_proposals.update({
        where: { id: p.id },
        data: {
          status:       'approved',
          approved_at:  now,
          challenge_id: createdOrUpdatedId
        }
      })

      return { outId: createdOrUpdatedId, outUpdatedAt: updatedAt }
    })

    return reply.send({
      proposalId:  id,
      status:      'approved',
      challengeId: Number(outId),
      updatedAt:   (outUpdatedAt ?? now).toISOString()
    })
  })


  // =========================
  // PATCH /api/v1/challenge-proposals/:id/reject   (SOLO ADMIN)
  // =========================
  app.patch('/challenge-proposals/:id/reject', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Proposals v1'],
      summary: 'Rifiuta una proposal (solo admin)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: { reason: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            proposalId: { type: 'string' },
            status:     { type: 'string' },
            updatedAt:  { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    try {
      const id = String((req.params || {}).id)
      const p  = await prisma.challenge_proposals.findUnique({
        where:  { id },
        select: { id: true, status: true }
      })
      if (!p) return reply.code(404).send({ error: 'not found' })

      if (p.status === 'approved') {
        return reply.code(409).send({ error: 'invalid status transition' })
      }

      await prisma.challenge_proposals.update({
        where: { id },
        data:  { status: 'rejected', updated_at: new Date() as any }
      })
      return reply.send({ proposalId: id, status: 'rejected', updatedAt: new Date().toISOString() })
    } catch (err) {
      app.log.error({ err }, 'reject failed')
      return reply.code(500).send({ error: 'server error' })
    }
  })
}
