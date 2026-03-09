// src/routes/v1/roleRequests.ts
/**
 * Scopo: gestione richieste di upgrade ruolo (judge / sponsor)
 *
 * Funzionalità:
 * - POST /role-requests              → utente autenticato richiede upgrade
 * - GET  /role-requests/mine         → utente vede le proprie richieste (con rejection_reason)
 * - GET  /admin/role-requests        → admin lista tutte le richieste (con admin_notes)
 * - PATCH /admin/role-requests/:id/approve → admin approva, aggiorna users.role
 * - PATCH /admin/role-requests/:id/reject  → admin rifiuta con controproposta
 *
 * Regole di business:
 * - Solo utenti con ruolo 'user' possono fare richiesta
 * - Non si può richiedere il ruolo che si ha già
 * - Non si può richiedere 'admin' (mai)
 * - Una sola richiesta pending per ruolo alla volta
 * - All'approvazione sponsor: aggiorna solo users.role — il profilo sponsor
 *   va creato separatamente tramite POST /sponsors/me
 *
 * Visibilità campi:
 * - rejection_reason → visibile all'utente (controproposta leggibile)
 * - admin_notes      → solo admin (note interne, storico ragionamenti)
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { users_role, role_request_type } from '@prisma/client'

// ==============================
// Schema validazione
// ==============================

const createRoleRequestSchema = z.object({
  requested_role: z.nativeEnum(role_request_type),
  motivation:     z.string().min(30, 'La motivazione deve essere di almeno 30 caratteri').max(3000),
  company_name:   z.string().min(2).max(180).optional().nullable()
})

const rejectRoleRequestSchema = z.object({
  rejection_reason: z.string().min(10).max(3000).optional().nullable(),
  admin_notes:      z.string().max(3000).optional().nullable()
})

const approveRoleRequestSchema = z.object({
  admin_notes: z.string().max(3000).optional().nullable()
})

export async function roleRequestsRoutes(app: FastifyInstance) {

  // ============================================================
  // POST /api/v1/role-requests
  // Utente autenticato — richiede upgrade a judge o sponsor
  // ============================================================
  app.post('/role-requests', {
    preHandler: requireAuth(),
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Role Requests'],
      summary: 'Richiedi upgrade di ruolo (judge o sponsor)',
      security: [{ bearerAuth: [] }],
      body: { type: 'object', additionalProperties: true },
      response: {
        201: { type: 'object', additionalProperties: true },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const parsed = createRoleRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => (i.path.join('.') || '(root)') + ': ' + i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    const { requested_role, motivation, company_name } = parsed.data
    const userId   = BigInt(req.user.id)
    const userRole = req.user.role as users_role

    // Admin non può fare richieste di ruolo
    if (userRole === users_role.admin) {
      return reply.code(400).send({ error: 'Gli admin non possono fare richieste di upgrade ruolo' })
    }

    // Non si può richiedere il ruolo che si ha già
    if (userRole === requested_role) {
      return reply.code(400).send({ error: `Hai già il ruolo '${requested_role}'` })
    }

    // Verifica duplicato pending
    const existing = await prisma.role_requests.findFirst({
      where: {
        user_id:        userId,
        requested_role,
        status:         'pending'
      }
    })
    if (existing) {
      return reply.code(409).send({ error: `Hai già una richiesta in attesa per il ruolo '${requested_role}'` })
    }

    const request = await prisma.role_requests.create({
      data: {
        user_id:        userId,
        requested_role,
        motivation,
        company_name:   company_name ?? null,
        status:         'pending'
      },
      select: {
        id:             true,
        requested_role: true,
        motivation:     true,
        company_name:   true,
        status:         true,
        created_at:     true
      }
    })

    return reply.code(201).send({
      id:             Number(request.id),
      requested_role: request.requested_role,
      motivation:     request.motivation,
      company_name:   request.company_name ?? null,
      status:         request.status,
      created_at:     request.created_at.toISOString(),
      // Istruzioni post-submission (sostituisce email)
      next_steps: [
        'La tua richiesta è stata ricevuta e verrà esaminata dal team HelpLab.',
        "Riceverai una notifica nel tuo pannello con l'esito.",
        requested_role === 'judge'
          ? 'Per diventare giudice è necessario aver completato il percorso formativo base disponibile nella sezione Learning.'
          : 'Per diventare sponsor è necessario avere un profilo aziendale verificabile e coerente con la mission della piattaforma.'
      ]
    })
  })

  // ============================================================
  // GET /api/v1/role-requests/mine
  // Utente autenticato — lista proprie richieste
  // Espone rejection_reason — NON espone admin_notes
  // ATTENZIONE: registrare PRIMA di /:id se mai aggiunto
  // ============================================================
  app.get('/role-requests/mine', {
    preHandler: requireAuth(),
    schema: {
      tags: ['Role Requests'],
      summary: 'Lista richieste di ruolo dell\'utente autenticato',
      security: [{ bearerAuth: [] }],
      response: {
        200: { type: 'object', additionalProperties: true },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)

    const requests = await prisma.role_requests.findMany({
      where:   { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id:               true,
        requested_role:   true,
        motivation:       true,
        status:           true,
        rejection_reason: true,  // visibile all'utente
        company_name:     true,
        // admin_notes NON incluso — mai esposto all'utente
        reviewed_at:      true,
        created_at:       true,
        updated_at:       true
      }
    })

    const items = requests.map(r => ({
      id:               Number(r.id),
      requested_role:   r.requested_role,
      motivation:       r.motivation,
      status:           r.status,
      rejection_reason: r.rejection_reason ?? null,
      company_name:     r.company_name ?? null,
      reviewed_at:      r.reviewed_at ? r.reviewed_at.toISOString() : null,
      created_at:       r.created_at.toISOString(),
      updated_at:       r.updated_at.toISOString()
    }))

    return reply.send({ items, total: items.length })
  })

  // ============================================================
  // GET /api/v1/admin/role-requests
  // Admin — lista paginata con admin_notes incluse
  // ============================================================
  app.get('/admin/role-requests', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Role Requests'],
      summary: 'Lista richieste di ruolo (admin) — include admin_notes e storico',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status:         { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          requested_role: { type: 'string', enum: ['judge', 'sponsor'] },
          limit:          { type: 'number' },
          cursor:         { type: 'string' }
        }
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const q     = req.query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const where: any = {
      ...(q.status         ? { status: q.status }                 : {}),
      ...(q.requested_role ? { requested_role: q.requested_role } : {}),
      ...(cursorDate       ? { created_at: { lt: cursorDate } }   : {})
    }

    const rows = await prisma.role_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take:    limit + 1,
      select: {
        id:               true,
        requested_role:   true,
        motivation:       true,
        status:           true,
        rejection_reason: true,
        admin_notes:      true,  // visibile solo admin
        company_name:     true,
        reviewed_at:      true,
        created_at:       true,
        user: {
          select: {
            id:       true,
            username: true,
            email:    true,
            role:     true
          }
        },
        reviewer: {
          select: {
            id:       true,
            username: true
          }
        }
      }
    })

    const hasMore = rows.length > limit
    const slice   = rows.slice(0, limit)

    const items = slice.map(r => ({
      id:               Number(r.id),
      requested_role:   r.requested_role,
      motivation:       r.motivation,
      status:           r.status,
      rejection_reason: r.rejection_reason ?? null,
      admin_notes:      r.admin_notes ?? null,
      company_name:     r.company_name ?? null,
      reviewed_at:      r.reviewed_at ? r.reviewed_at.toISOString() : null,
      created_at:       r.created_at.toISOString(),
      user: {
        id:       Number(r.user.id),
        username: r.user.username,
        email:    r.user.email ?? null,
        role:     r.user.role ?? 'user'
      },
      reviewer: r.reviewer
        ? { id: Number(r.reviewer.id), username: r.reviewer.username }
        : null
    }))

    const nextCursor = hasMore && rows[limit]?.created_at
      ? rows[limit].created_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })

  // ============================================================
  // PATCH /api/v1/admin/role-requests/:id/approve
  // Admin — approva richiesta e aggiorna users.role
  // ============================================================
  app.patch('/admin/role-requests/:id/approve', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Role Requests'],
      summary: 'Approva richiesta di ruolo (admin)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          admin_notes: { type: 'string', nullable: true, description: 'Note interne — non visibili all\'utente' }
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
    const parsed = approveRoleRequestSchema.safeParse(req.body || {})
    if (!parsed.success) return reply.code(400).send({ error: 'Body non valido' })

    let requestId: bigint
    try { requestId = BigInt(req.params.id) } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const request = await prisma.role_requests.findUnique({
      where:  { id: requestId },
      select: { id: true, status: true, user_id: true, requested_role: true }
    })

    if (!request) return reply.code(404).send({ error: 'Richiesta non trovata' })
    if (request.status !== 'pending') {
      return reply.code(409).send({ error: `Transizione non valida da stato '${request.status}'` })
    }

    const now     = new Date()
    const adminId = BigInt(req.user.id)

    // Mappa role_request_type → users_role
    const roleMap: Record<string, users_role> = {
      judge:   users_role.judge,
      sponsor: users_role.sponsor
    }
    const newRole = roleMap[request.requested_role]
    if (!newRole) return reply.code(400).send({ error: 'Ruolo non mappabile' })

    await prisma.$transaction(async (tx) => {
      // Aggiorna la richiesta
      await tx.role_requests.update({
        where: { id: requestId },
        data: {
          status:      'approved',
          admin_notes: parsed.data.admin_notes ?? null,
          reviewed_by: adminId,
          reviewed_at: now
        }
      })

      // Aggiorna il ruolo dell'utente
      await tx.users.update({
        where: { id: request.user_id },
        data:  { role: newRole }
      })
    })

    return reply.send({
      id:             Number(requestId),
      status:         'approved',
      new_role:       newRole,
      reviewed_at:    now.toISOString(),
      // Nota per il frontend admin
      note: newRole === users_role.sponsor
        ? "Ruolo aggiornato. Se company_name è presente nel record, può essere usato per pre-popolare POST /sponsors/me"
        : "Ruolo aggiornato. L'utente può ora essere assegnato come giudice alle challenge."
    })
  })

  // ============================================================
  // PATCH /api/v1/admin/role-requests/:id/reject
  // Admin — rifiuta con controproposta visibile all'utente
  //         e note interne visibili solo all'admin
  // ============================================================
  app.patch('/admin/role-requests/:id/reject', {
    preHandler: requireAuth(users_role.admin),
    schema: {
      tags: ['Role Requests'],
      summary: 'Rifiuta richiesta di ruolo (admin) con controproposta',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          rejection_reason: {
            type: 'string',
            nullable: true,
            description: 'Visibile all\'utente — controproposta o motivazione del rifiuto'
          },
          admin_notes: {
            type: 'string',
            nullable: true,
            description: 'Solo admin — note interne, storico ragionamenti'
          }
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
    const parsed = rejectRoleRequestSchema.safeParse(req.body || {})
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => i.message)
      return reply.code(400).send({ error: issues.join('; ') })
    }

    let requestId: bigint
    try { requestId = BigInt(req.params.id) } catch {
      return reply.code(404).send({ error: 'not found' })
    }

    const request = await prisma.role_requests.findUnique({
      where:  { id: requestId },
      select: { id: true, status: true }
    })

    if (!request) return reply.code(404).send({ error: 'Richiesta non trovata' })
    if (request.status === 'approved') {
      return reply.code(409).send({ error: 'Non è possibile rifiutare una richiesta già approvata' })
    }

    await prisma.role_requests.update({
      where: { id: requestId },
      data: {
        status:           'rejected',
        rejection_reason: parsed.data.rejection_reason ?? null,
        admin_notes:      parsed.data.admin_notes      ?? null,
        reviewed_by:      BigInt(req.user.id),
        reviewed_at:      new Date()
      }
    })

    return reply.send({
      id:     Number(requestId),
      status: 'rejected'
    })
  })
}
