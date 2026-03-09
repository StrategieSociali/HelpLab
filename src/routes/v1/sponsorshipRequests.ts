// src/routes/v1/sponsorshipRequests.ts
/**
 * Scopo: gestione del ciclo di vita delle candidature di sponsorizzazione
 *
 * Funzionalità:
 * - POST /sponsorship-requests           → crea candidatura (sponsor autenticato)
 * - GET  /sponsorship-requests/mine      → lista candidature dello sponsor autenticato
 * - DELETE /sponsorship-requests/:id     → ritira candidatura (solo se pending_review)
 * - GET  /admin/sponsorship-requests     → lista paginata (admin)
 * - PATCH /admin/sponsorship-requests/:id/approve  → approva + crea challenge_sponsorship
 * - PATCH /admin/sponsorship-requests/:id/reject   → rifiuta con reason
 * - PATCH /admin/sponsorships/:id/confirm-payment  → segna pagamento come confirmed
 *
 * Protezione know-how:
 * admin_notes e private_notes non escono mai verso lo sponsor.
 * Il frontend riceve istruzioni post-submission invece dell'email (da implementare).
 *
 * Payment deadline:
 * Calcolata automaticamente come start_date della challenge - 7 giorni.
 * Fallback su deadline - 7 giorni. Se entrambe null, obbligatorio nel body.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { serializeBigInt } from '../../utils/serialize.js'
import {
  users_role,
  sponsorship_request_target,
  sponsorship_request_status,
  sponsorship_payment_status
} from '@prisma/client'

// ==============================
// Schema validazione
// ==============================

const createRequestSchema = z.object({
  target_type:         z.nativeEnum(sponsorship_request_target),
  challenge_id:        z.number().int().positive().optional(),
  event_id:            z.number().int().positive().optional(),
  motivation:          z.string().min(20).max(5000),
  report_requests:     z.string().max(2000).optional().nullable(),
  budget_proposed_eur: z.number().int().min(0).optional().nullable()
}).refine(
  data => {
    if (data.target_type === 'challenge') return !!data.challenge_id
    if (data.target_type === 'event')     return !!data.event_id
    return true // platform: nessun ID richiesto
  },
  { message: 'challenge_id obbligatorio per target_type=challenge; event_id per target_type=event' }
)

const approveRequestSchema = z.object({
  // Sovrascrive il calcolo automatico della deadline se necessario
  payment_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Nota interna admin — non visibile allo sponsor
  admin_notes:      z.string().max(1000).optional().nullable()
})

const rejectRequestSchema = z.object({
  reason: z.string().max(1000).optional().nullable()
})

// ==============================
// Utility: calcolo payment_deadline
// challenge.start_date - 7 giorni (fallback: deadline - 7 giorni)
// ==============================
function computePaymentDeadline(
  start_date: Date | null | undefined,
  deadline:   Date | null | undefined
): Date | null {
  const base = start_date ?? deadline
  if (!base) return null
  const d = new Date(base)
  d.setDate(d.getDate() - 7)
  return d
}

export async function sponsorshipRequestsRoutes(app: FastifyInstance) {

  // ============================================================
  // POST /api/v1/sponsorship-requests
  // Sponsor autenticato — crea candidatura
  // ============================================================
  app.post('/sponsorship-requests', {
    preHandler: requireAuth(users_role.sponsor),
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Crea una candidatura di sponsorizzazione',
      security: [{ bearerAuth: [] }],
      body: { type: 'object', additionalProperties: true },
      response: {
        201: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = createRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => (i.path.join('.') || '(root)') + ': ' + i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    const userId = BigInt(req.user.id)

    // Recupera il profilo sponsor dell'utente
    const sponsor = await prisma.sponsors.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })
    if (!sponsor) {
      return reply.code(404).send({ error: 'Profilo sponsor non trovato. Crea prima il profilo tramite POST /sponsors/me' })
    }

    const { target_type, challenge_id, event_id, motivation, report_requests, budget_proposed_eur } = parsed.data

    // Verifica esistenza della challenge/evento target
    if (target_type === 'challenge' && challenge_id) {
      const ch = await prisma.challenges.findUnique({
        where: { id: BigInt(challenge_id) },
        select: { id: true, status: true }
      })
      if (!ch) return reply.code(404).send({ error: 'Challenge non trovata' })
      if (ch.status === 'closed') return reply.code(400).send({ error: 'La challenge è già chiusa' })
    }

    if (target_type === 'event' && event_id) {
      const ev = await prisma.events.findUnique({
        where: { id: BigInt(event_id) },
        select: { id: true, status: true }
      })
      if (!ev) return reply.code(404).send({ error: 'Evento non trovato' })
      if (ev.status === 'ended' || ev.status === 'rejected') {
        return reply.code(400).send({ error: 'Evento non disponibile per sponsorizzazione' })
      }
    }

    // Verifica duplicati: uno sponsor non può avere due request pending sulla stessa challenge/evento
    const duplicate = await prisma.sponsorship_requests.findFirst({
      where: {
        sponsor_id:   sponsor.id,
        challenge_id: challenge_id ? BigInt(challenge_id) : null,
        event_id:     event_id     ? BigInt(event_id)     : null,
        target_type,
        status:       'pending_review'
      }
    })
    if (duplicate) {
      return reply.code(400).send({ error: 'Hai già una candidatura in attesa per questo target' })
    }

    const request = await prisma.sponsorship_requests.create({
      data: {
        sponsor_id:          sponsor.id,
        challenge_id:        challenge_id ? BigInt(challenge_id) : null,
        event_id:            event_id     ? BigInt(event_id)     : null,
        target_type,
        motivation,
        report_requests:     report_requests     ?? null,
        budget_proposed_eur: budget_proposed_eur ?? null,
        status:              'pending_review'
      },
      select: {
        id:                  true,
        target_type:         true,
        challenge_id:        true,
        event_id:            true,
        motivation:          true,
        report_requests:     true,
        budget_proposed_eur: true,
        status:              true,
        created_at:          true
      }
    })

    return reply.code(201).send({
      ...serializeBigInt(request),
      // Istruzioni post-submission (sostituisce email fino a quando non sarà attivo il sistema email)
      next_steps: [
        'La tua candidatura è stata ricevuta e verrà esaminata dal team HelpLab entro 2-3 giorni lavorativi.',
        "Riceverai una notifica nel tuo pannello sponsor con l'esito.",
        "In caso di approvazione, ti verranno comunicate le modalità di versamento e la scadenza per il pagamento.",
        "La scadenza per il pagamento è fissata 7 giorni prima dell'inizio della sfida o dell'evento."
      ]
    })
  })

  // ============================================================
  // GET /api/v1/sponsorship-requests/mine
  // Sponsor autenticato — lista candidature proprie
  // ATTENZIONE: registrare PRIMA di /:id nel router
  // ============================================================
  app.get('/sponsorship-requests/mine', {
    preHandler: requireAuth(users_role.sponsor),
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Lista candidature dello sponsor autenticato',
      security: [{ bearerAuth: [] }],
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
      where: { user_id: userId },
      select: { id: true }
    })
    if (!sponsor) return reply.code(404).send({ error: 'Profilo sponsor non trovato' })

    const requests = await prisma.sponsorship_requests.findMany({
      where:   { sponsor_id: sponsor.id },
      orderBy: { created_at: 'desc' },
      select: {
        id:                  true,
        target_type:         true,
        challenge_id:        true,
        event_id:            true,
        motivation:          true,
        report_requests:     true,
        budget_proposed_eur: true,
        status:              true,
        created_at:          true,
        updated_at:          true,
        // admin_notes NON incluso — mai esposto allo sponsor
        challenge: {
          select: {
            title:    true,
            slug:     true,
            status:   true,
            deadline: true
          }
        },
        event: {
          select: {
            name:       true,
            slug:       true,
            status:     true,
            start_date: true,
            end_date:   true
          }
        }
      }
    })

    // Per le request approvate, recupera anche lo stato del pagamento da challenge_sponsorships
    const sponsorshipDetails = await prisma.challenge_sponsorships.findMany({
      where: { sponsor_id: sponsor.id },
      select: {
        challenge_id:    true,
        payment_status:  true,
        payment_deadline: true,
        confirmed_at:    true,
        amount_eur:      true
      }
    })
    const sponsorshipMap = new Map(
      sponsorshipDetails.map(s => [Number(s.challenge_id), s])
    )

    const items = requests.map(r => {
      const challengeId = r.challenge_id ? Number(r.challenge_id) : null
      const paymentInfo = challengeId ? sponsorshipMap.get(challengeId) : null

      return {
        id:                  Number(r.id),
        target_type:         r.target_type,
        challenge_id:        challengeId,
        event_id:            r.event_id ? Number(r.event_id) : null,
        motivation:          r.motivation,
        report_requests:     r.report_requests ?? null,
        budget_proposed_eur: r.budget_proposed_eur ?? null,
        status:              r.status,
        created_at:          r.created_at.toISOString(),
        updated_at:          r.updated_at.toISOString(),
        challenge: r.challenge ? {
          title:    r.challenge.title,
          slug:     r.challenge.slug,
          status:   r.challenge.status,
          deadline: r.challenge.deadline ? r.challenge.deadline.toISOString().slice(0, 10) : null
        } : null,
        event: r.event ? {
          name:       r.event.name,
          slug:       r.event.slug,
          status:     r.event.status,
          start_date: r.event.start_date.toISOString().slice(0, 10),
          end_date:   r.event.end_date.toISOString().slice(0, 10)
        } : null,
        // Stato pagamento — visibile solo se la request è approvata e c'è una sponsorship attiva
        payment: paymentInfo ? {
          payment_status:   paymentInfo.payment_status,
          payment_deadline: paymentInfo.payment_deadline
            ? paymentInfo.payment_deadline.toISOString().slice(0, 10)
            : null,
          confirmed_at:     paymentInfo.confirmed_at ? paymentInfo.confirmed_at.toISOString() : null,
          amount_eur:       paymentInfo.amount_eur > 0 ? paymentInfo.amount_eur : null
        } : null
      }
    })

    return reply.send({ items, total: items.length })
  })

  // ============================================================
  // DELETE /api/v1/sponsorship-requests/:id
  // Sponsor autenticato — ritiro candidatura (solo se pending_review)
  // ============================================================
  app.delete('/sponsorship-requests/:id', {
    preHandler: requireAuth(users_role.sponsor),
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Ritira candidatura (solo se pending_review)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)

    const sponsor = await prisma.sponsors.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })
    if (!sponsor) return reply.code(404).send({ error: 'Profilo sponsor non trovato' })

    let requestId: bigint
    try { requestId = BigInt(req.params.id) } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const request = await prisma.sponsorship_requests.findUnique({
      where:  { id: requestId },
      select: { id: true, sponsor_id: true, status: true }
    })

    if (!request) return reply.code(404).send({ error: 'Candidatura non trovata' })
    if (request.sponsor_id !== sponsor.id) return reply.code(403).send({ error: 'Non autorizzato' })
    if (request.status !== 'pending_review') {
      return reply.code(400).send({ error: `Non è possibile ritirare una candidatura in stato '${request.status}'` })
    }

    await prisma.sponsorship_requests.update({
      where: { id: requestId },
      data:  { status: 'withdrawn' }
    })

    return reply.send({ success: true })
  })

  // ============================================================
  // GET /api/v1/admin/sponsorship-requests
  // Admin — lista paginata candidature
  // ============================================================
  app.get('/admin/sponsorship-requests', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Lista candidature di sponsorizzazione (admin)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'withdrawn'] },
          limit:  { type: 'number' },
          cursor: { type: 'string' }
        }
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
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

    const where: any = {
      ...(q.status   ? { status: q.status }                  : {}),
      ...(cursorDate ? { created_at: { lt: cursorDate } }    : {})
    }

    const rows = await prisma.sponsorship_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit + 1,
      select: {
        id:                  true,
        target_type:         true,
        challenge_id:        true,
        event_id:            true,
        motivation:          true,
        report_requests:     true,
        budget_proposed_eur: true,
        status:              true,
        admin_notes:         true,
        reviewed_at:         true,
        created_at:          true,
        sponsor: {
          select: {
            id:   true,
            name: true,
            user: { select: { email: true } }
          }
        },
        challenge: { select: { title: true, slug: true, status: true, deadline: true } },
        event:     { select: { name: true,  slug: true, status: true } },
        reviewer:  { select: { id: true, username: true } }
      }
    })

    const hasMore = rows.length > limit
    const slice   = rows.slice(0, limit)

    const items = slice.map(r => ({
      id:                  Number(r.id),
      target_type:         r.target_type,
      challenge_id:        r.challenge_id ? Number(r.challenge_id) : null,
      event_id:            r.event_id     ? Number(r.event_id)     : null,
      motivation:          r.motivation,
      report_requests:     r.report_requests ?? null,
      budget_proposed_eur: r.budget_proposed_eur ?? null,
      status:              r.status,
      admin_notes:         r.admin_notes ?? null,
      reviewed_at:         r.reviewed_at ? r.reviewed_at.toISOString() : null,
      created_at:          r.created_at.toISOString(),
      sponsor: {
        id:    Number(r.sponsor.id),
        name:  r.sponsor.name,
        email: r.sponsor.user?.email ?? null
      },
      challenge: r.challenge ? {
        title:    r.challenge.title,
        slug:     r.challenge.slug,
        status:   r.challenge.status,
        deadline: r.challenge.deadline ? r.challenge.deadline.toISOString().slice(0, 10) : null
      } : null,
      event: r.event ? {
        name:   r.event.name,
        slug:   r.event.slug,
        status: r.event.status
      } : null,
      reviewer: r.reviewer ? { id: Number(r.reviewer.id), name: r.reviewer.username } : null
    }))

    const nextCursor = hasMore && rows[limit]?.created_at
      ? rows[limit].created_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })

  // ============================================================
  // PATCH /api/v1/admin/sponsorship-requests/:id/approve
  // Admin — approva candidatura e crea challenge_sponsorship
  // Calcola automaticamente payment_deadline = start_date - 7gg
  // ============================================================
  app.patch('/admin/sponsorship-requests/:id/approve', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Approva candidatura (admin) — crea sponsorship e calcola deadline pagamento',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          payment_deadline: { type: 'string', description: 'YYYY-MM-DD — sovrascrive calcolo automatico' },
          admin_notes:      { type: 'string', nullable: true }
        }
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = approveRequestSchema.safeParse(req.body || {})
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    let requestId: bigint
    try { requestId = BigInt(req.params.id) } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const request = await prisma.sponsorship_requests.findUnique({
      where: { id: requestId },
      select: {
        id:           true,
        status:       true,
        sponsor_id:   true,
        challenge_id: true,
        event_id:     true,
        target_type:  true
      }
    })

    if (!request) return reply.code(404).send({ error: 'Candidatura non trovata' })
    if (request.status !== 'pending_review') {
      return reply.code(409).send({ error: `Transizione non valida da stato '${request.status}'` })
    }

    const now = new Date()
    const adminId = BigInt(req.user.id)

    // Calcola payment_deadline: recupera deadline della challenge se non fornita nel body
    let paymentDeadline: Date | null = null
    if (parsed.data.payment_deadline) {
      paymentDeadline = new Date(parsed.data.payment_deadline)
    } else if (request.challenge_id) {
      const ch = await prisma.challenges.findUnique({
        where:  { id: request.challenge_id },
        select: { deadline: true }
      })
      paymentDeadline = computePaymentDeadline(null, ch?.deadline ?? null)
    }

    await prisma.$transaction(async (tx) => {
      // Aggiorna la request
      await tx.sponsorship_requests.update({
        where: { id: requestId },
        data: {
          status:      'approved',
          admin_notes: parsed.data.admin_notes ?? null,
          reviewed_by: adminId,
          reviewed_at: now
        }
      })

      // Crea challenge_sponsorship solo se il target è una challenge
      // Per eventi e platform la sponsorship è gestita diversamente (futuro)
      if (request.target_type === 'challenge' && request.challenge_id) {
        const existing = await tx.challenge_sponsorships.findUnique({
          where: {
            challenge_id_sponsor_id: {
              challenge_id: request.challenge_id,
              sponsor_id:   request.sponsor_id
            }
          }
        })

        if (!existing) {
          await tx.challenge_sponsorships.create({
            data: {
              challenge_id:    request.challenge_id,
              sponsor_id:      request.sponsor_id,
              amount_eur:      0, // verrà aggiornato al confirm-payment
              payment_status:  'pending',
              payment_deadline: paymentDeadline ?? undefined,
              sponsored_at:    now
            }
          })
        }
      }
    })

    return reply.send({
      id:               Number(requestId),
      status:           'approved',
      payment_deadline: paymentDeadline ? paymentDeadline.toISOString().slice(0, 10) : null,
      reviewed_at:      now.toISOString()
    })
  })

  // ============================================================
  // PATCH /api/v1/admin/sponsorship-requests/:id/reject
  // Admin — rifiuta candidatura
  // ============================================================
  app.patch('/admin/sponsorship-requests/:id/reject', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Rifiuta candidatura (admin)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', nullable: true }
        }
      },
      response: {
        200: { type: 'object', properties: { id: { type: 'number' }, status: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = rejectRequestSchema.safeParse(req.body || {})
    if (!parsed.success) return reply.code(400).send({ error: 'Body non valido' })

    let requestId: bigint
    try { requestId = BigInt(req.params.id) } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const request = await prisma.sponsorship_requests.findUnique({
      where:  { id: requestId },
      select: { id: true, status: true }
    })

    if (!request) return reply.code(404).send({ error: 'Candidatura non trovata' })
    if (request.status === 'approved') {
      return reply.code(409).send({ error: 'Non è possibile rifiutare una candidatura già approvata' })
    }

    await prisma.sponsorship_requests.update({
      where: { id: requestId },
      data: {
        status:      'rejected',
        // Il motivo del rifiuto viene salvato in admin_notes — non visibile allo sponsor nella UI
        // In futuro sarà inviato via email
        admin_notes: parsed.data.reason ?? null,
        reviewed_by: BigInt(req.user.id),
        reviewed_at: new Date()
      }
    })

    return reply.send({ id: Number(requestId), status: 'rejected' })
  })

  // ============================================================
  // PATCH /api/v1/admin/sponsorships/:id/confirm-payment
  // Admin — conferma avvenuto pagamento
  // :id è l'id di challenge_sponsorships
  // ============================================================
  app.patch('/admin/sponsorships/:id/confirm-payment', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Sponsorship Requests'],
      summary: 'Conferma pagamento sponsorizzazione (admin)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          amount_eur:    { type: 'number', description: 'Importo effettivo versato' },
          private_notes: { type: 'string', nullable: true, description: 'Note interne — non visibili allo sponsor' }
        }
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    let sponsorshipId: bigint
    try { sponsorshipId = BigInt(req.params.id) } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const { amount_eur, private_notes } = req.body || {}

    const sponsorship = await prisma.challenge_sponsorships.findUnique({
      where:  { id: sponsorshipId },
      select: { id: true, payment_status: true, challenge_id: true, sponsor_id: true }
    })

    if (!sponsorship) return reply.code(404).send({ error: 'Sponsorizzazione non trovata' })
    if (sponsorship.payment_status === 'confirmed') {
      return reply.code(400).send({ error: 'Il pagamento è già stato confermato' })
    }

    const now = new Date()
    const updateData: any = {
      payment_status: 'confirmed',
      confirmed_at:   now
    }
    if (amount_eur !== undefined && amount_eur >= 0) updateData.amount_eur = amount_eur
    if (private_notes !== undefined) updateData.private_notes = private_notes

    const updated = await prisma.challenge_sponsorships.update({
      where: { id: sponsorshipId },
      data:  updateData,
      select: {
        id:              true,
        challenge_id:    true,
        sponsor_id:      true,
        amount_eur:      true,
        payment_status:  true,
        confirmed_at:    true,
        payment_deadline: true
      }
    })

    return reply.send({
      id:               Number(updated.id),
      challenge_id:     Number(updated.challenge_id),
      sponsor_id:       Number(updated.sponsor_id),
      amount_eur:       updated.amount_eur,
      payment_status:   updated.payment_status,
      confirmed_at:     updated.confirmed_at ? updated.confirmed_at.toISOString() : null,
      payment_deadline: updated.payment_deadline
        ? updated.payment_deadline.toISOString().slice(0, 10)
        : null
    })
  })
}
