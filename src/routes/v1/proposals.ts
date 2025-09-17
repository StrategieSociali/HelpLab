// src/routes/v1/proposals.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { proposalBodySchema } from '../../schemas/scoringSchemas.js'
import { verifyAccessToken } from '../../utils/jwt.js'

type UserJWT = { sub: string; email: string }

// ————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————

function toBig(v: string | number | bigint) {
  return BigInt(String(v))
}

// Sanitize: rimuove null/stringhe vuote e normalizza ricorsivamente
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

// Estrae utente dal Bearer e, se serve, verifica che sia admin
async function requireAuth(req: any, reply: any) {
  const auth = req.headers?.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) {
    reply.code(401).send({ error: 'unauthorized' })
    return null
  }
  try {
    const payload = verifyAccessToken(token) as unknown as UserJWT
    const userId = toBig(payload.sub)
    const user = await prisma.users.findUnique({
      where: { id: userId as any },
      select: { id: true, role: true, email: true, username: true }
    })
    if (!user) {
      reply.code(401).send({ error: 'unauthorized' })
      return null
    }
    return user
  } catch {
    reply.code(401).send({ error: 'unauthorized' })
    return null
  }
}

async function requireAdmin(req: any, reply: any) {
  const user = await requireAuth(req, reply)
  if (!user) return null
  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'forbidden' })
    return null
  }
  return user
}

// ————————————————————————————————————————————
// Routes
// ————————————————————————————————————————————

export async function proposalsV1Routes(app: FastifyInstance) {
  // POST /api/v1/challenge-proposals (crea proposta) — Auth richiesta
  app.post('/challenge-proposals', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Proposals v1'],
      summary: 'Crea una proposta di challenge (protetto con Bearer)',
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
    const user = await requireAuth(req, reply)
    if (!user) return

    // 1) Sanitize base
    const body = cleanPayload(req.body || {})

    // 2) Coercioni mirate
    if (body?.target?.amount !== undefined) {
      body.target.amount = Number(body.target.amount)
    }
    if (body?.co2e_estimate_kg !== undefined) {
      body.co2e_estimate_kg = Number(body.co2e_estimate_kg)
    }
    if (body?.sponsor_budget_requested !== undefined) {
      body.sponsor_budget_requested = Number(body.sponsor_budget_requested)
    }

    // 3) Autogenera id nei task se mancanti
    if (Array.isArray(body?.tasks)) {
      let i = 1
      body.tasks = body.tasks.map((t: any) => ({
        id: t?.id || `t${i++}`,
        label: t.label,
        evidence_required: !!t.evidence_required,
        verification: t.verification || 'user'
      }))
    }

    // 4) Validazione Zod (XOR co2/difficulty e regole)
    const parsed = proposalBodySchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => {
        const path = i.path.join('.') || '(root)'
        return `${path}: ${i.message}`
      })
      const details = issues.join('; ')
      app.log.warn({ validation_error: issues }, 'Invalid proposal body')
      return reply.code(400).send({ error: details || 'invalid body' })
    }

    const b = parsed.data
    const created = await prisma.challenge_proposals.create({
      data: {
        user_id: user.id as any,
        title: b.title,
        description: b.description,
        impact_type: b.impact_type,
        start_date: b.start_date ? new Date(b.start_date) : null,
        deadline:    b.deadline    ? new Date(b.deadline)    : null,
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
        terms_consent: true,
        status: 'pending_review'
      } as any,
      select: { id: true, status: true }
    })

    return reply.code(201).send({
      proposalId: created.id,
      status: created.status,
      version: '1.0'
    })
  })

  // GET /api/v1/challenge-proposals — SOLO ADMIN, paginata
  app.get('/challenge-proposals', {
    schema: {
      tags: ['Proposals v1'],
      summary: 'Lista proposte (admin)',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending_review', 'approved', 'rejected'] },
          page:   { type: 'string' },
          limit:  { type: 'string' }
        }
      }
    }
  }, async (req: any, reply) => {
    const admin = await requireAdmin(req, reply)
    if (!admin) return

    const q = (req.query || {}) as { status?: string; page?: string; limit?: string }
    const where: any = {}
    if (q.status) where.status = q.status

    const page  = Math.max(1, Number(q.page ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? '20')))
    const skip  = (page - 1) * limit

    const [total, items] = await Promise.all([
      prisma.challenge_proposals.count({ where }),
      prisma.challenge_proposals.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          title: true,
          impact_type: true,
          created_at: true,
          user_id: true
        }
      })
    ])

    return reply.send({
      page,
      limit,
      total,
      items: items.map(it => ({
        id: it.id,
        status: it.status,
        title: it.title,
        impact_type: it.impact_type,
        createdAt: it.created_at,
        userId: Number(it.user_id)
      }))
    })
  })

  // PATCH /api/v1/challenge-proposals/:id/approve — SOLO ADMIN
  app.patch('/challenge-proposals/:id/approve', {
    schema: {
      tags: ['Proposals v1'],
      summary: 'Approva proposta (admin)'
    }
  }, async (req: any, reply) => {
    const admin = await requireAdmin(req, reply)
    if (!admin) return

    const id = String(req.params?.id || '')
    const found = await prisma.challenge_proposals.findUnique({
      where: { id },
      select: { id: true, status: true }
    })
    if (!found) return reply.code(404).send({ error: 'not found' })
    if (found.status !== 'pending_review') {
      return reply.code(409).send({ error: 'invalid status transition' })
    }

    const updated = await prisma.challenge_proposals.update({
      where: { id },
      data: { status: 'approved', updated_at: new Date() },
      select: { id: true, status: true, updated_at: true }
    })
    return reply.send({ proposalId: updated.id, status: updated.status, updatedAt: updated.updated_at })
  })

  // PATCH /api/v1/challenge-proposals/:id/reject — SOLO ADMIN
  app.patch('/challenge-proposals/:id/reject', {
    schema: {
      tags: ['Proposals v1'],
      summary: 'Rifiuta proposta (admin)'
    }
  }, async (req: any, reply) => {
    const admin = await requireAdmin(req, reply)
    if (!admin) return

    const id = String(req.params?.id || '')
    const found = await prisma.challenge_proposals.findUnique({
      where: { id },
      select: { id: true, status: true }
    })
    if (!found) return reply.code(404).send({ error: 'not found' })
    if (found.status !== 'pending_review') {
      return reply.code(409).send({ error: 'invalid status transition' })
    }

    const updated = await prisma.challenge_proposals.update({
      where: { id },
      data: { status: 'rejected', updated_at: new Date() },
      select: { id: true, status: true, updated_at: true }
    })
    return reply.send({ proposalId: updated.id, status: updated.status, updatedAt: updated.updated_at })
  })
}
