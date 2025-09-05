// src/routes/v1/proposals.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { proposalBodySchema } from '../../schemas/scoringSchemas.js'
import { verifyAccessToken } from '../../utils/jwt.js'

// piccola util per pulire il payload: rimuove null/"" e normalizza
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

export async function proposalsV1Routes(app: FastifyInstance) {
  app.post('/challenge-proposals', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
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
    },
    preHandler: async (req: any, reply) => {
      const auth = req.headers?.authorization || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (!token) return reply.code(401).send({ error: 'unauthorized' })
      try {
        const payload = verifyAccessToken(token) as any
        req.user = { id: payload?.sub, email: payload?.email }
      } catch {
        return reply.code(401).send({ error: 'unauthorized' })
      }
    }
  }, async (req: any, reply) => {
    // 1) Sanitize base
    const body = cleanPayload(req.body || {})

    // 2) Coercioni mirate (campi numerici che possono arrivare come stringhe)
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
    const uid = BigInt(String(req.user.id))

    const created = await prisma.challenge_proposals.create({
      data: {
        user_id: uid as any,
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
}
