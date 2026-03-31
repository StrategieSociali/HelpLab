// src/routes/v1/submissions.ts
/**
 * Scopo: gestione delle submission dei volontari nelle challenge
 *
 * Funzionalità:
 * - GET   /challenges/:id/submissions  → lista submission visibili (rispetta privacy)
 * - POST  /challenges/:id/submissions  → creazione submission (autenticato, task_id obbligatorio)
 * - PATCH /submissions/:id             → modifica submission rifiutata (solo autore, solo se rejected)
 * - POST  /submissions/:id/review      → approvazione/rifiuto da parte del giudice
 * - GET   /user/submissions            → lista submission dell'utente corrente
 *
 * Regola modifica:
 * Una submission può essere modificata dal suo autore solo quando è in stato "rejected".
 * Dopo la modifica torna automaticamente in stato "pending" per una nuova revisione.
 * Il payload viene rivalidato contro il payload_schema del task prima del salvataggio.
 *
 * Cache:
 * All'approvazione di una submission viene invalidata la cache del summary
 * della challenge (TTL 30s) per aggiornare immediatamente i counter CO2
 * nella dashboard evento.
 *
 * Sicurezza:
 * - FIX 1 (mar 2026): validazione URL Cloudinary su tutti i campi url_array.
 *   Ogni URL deve iniziare con https://res.cloudinary.com/dmxlulwdv/
 *   Applicata in POST (creazione) e PATCH (modifica submission rifiutata).
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth, optionalAuth } from '../../utils/requireAuth.js'
import { onApprove } from '../../services/scoring/onApprove.js'
import {
  invalidateLeaderboardCache,
  generateLeaderboardCacheKey
} from '../../services/leaderboardService.js'
import { invalidateSummaryCache } from './summary.js'
import { users_role } from '@prisma/client'


// ================================
// Tipi interni per payload_schema
// ================================
interface PayloadFieldSchema {
  name:      string
  type:      'number' | 'string' | 'boolean' | 'url_array'
  required?: boolean
  min?:      number
  max?:      number
  minItems?: number
}

interface TaskPayloadSchema {
  fields: PayloadFieldSchema[]
}


// ================================
// FIX 1 — Prefisso Cloudinary consentito
// Centralizzato qui: se il cloud_name cambia, si aggiorna solo questa costante.
// ================================
const CLOUDINARY_ALLOWED_PREFIX = 'https://res.cloudinary.com/dmxlulwdv/'

/**
 * Verifica che tutti gli URL di un campo url_array provengano dal bucket
 * Cloudinary del progetto. Restituisce l'array degli URL non conformi.
 */
function validateCloudinaryUrls(urls: unknown[]): string[] {
  return urls.filter(
    (u) => typeof u !== 'string' || !u.startsWith(CLOUDINARY_ALLOWED_PREFIX)
  ) as string[]
}


// ================================
// Motore di validazione payload
// Restituisce array di messaggi di errore (vuoto = valido)
// ================================
function validatePayload(payload: Record<string, unknown>, schema: TaskPayloadSchema): string[] {
  const errors: string[] = []

  for (const field of schema.fields) {
    const value = payload[field.name]
    const missing = value === undefined || value === null

    if (missing) {
      if (field.required) {
        errors.push(`Campo obbligatorio mancante: "${field.name}"`)
      }
      continue
    }

    switch (field.type) {
      case 'number': {
        const n = Number(value)
        if (isNaN(n)) {
          errors.push(`"${field.name}" deve essere un numero`)
          break
        }
        if (field.min !== undefined && n < field.min) {
          errors.push(`"${field.name}" deve essere almeno ${field.min}`)
        }
        if (field.max !== undefined && n > field.max) {
          errors.push(`"${field.name}" non può superare ${field.max}`)
        }
        break
      }
      case 'string': {
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push(`"${field.name}" deve essere una stringa non vuota`)
        }
        break
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push(`"${field.name}" deve essere true o false`)
        }
        break
      }
      case 'url_array': {
        if (!Array.isArray(value)) {
          errors.push(`"${field.name}" deve essere un array di URL`)
          break
        }
        const minItems = field.minItems ?? 1
        if (value.length < minItems) {
          errors.push(
            `"${field.name}" richiede almeno ${minItems} element${minItems === 1 ? 'o' : 'i'}`
          )
        }
        // Controlla che ogni elemento sia una stringa non vuota
        const invalidItems = value.filter(v => typeof v !== 'string' || v.trim() === '')
        if (invalidItems.length > 0) {
          errors.push(`"${field.name}" contiene elementi non validi`)
          break
        }
        // FIX 1 — Controlla che ogni URL provenga da Cloudinary
        const nonCloudinary = validateCloudinaryUrls(value)
        if (nonCloudinary.length > 0) {
          errors.push(
            `"${field.name}" contiene URL non consentiti: le immagini devono essere caricate tramite la piattaforma`
          )
        }
        break
      }
    }
  }

  return errors
}

// ================================
// Invalida leaderboard globale (tutte le finestre temporali)
// ================================
async function invalidateGlobalLeaderboards() {
  await Promise.all([
    invalidateLeaderboardCache(generateLeaderboardCacheKey('user-global', { window: 'all' })),
    invalidateLeaderboardCache(generateLeaderboardCacheKey('user-global', { window: 'this_month' })),
    invalidateLeaderboardCache(generateLeaderboardCacheKey('user-global', { window: 'this_week' }))
  ])
}

// ================================
// Calcola i livelli di visibilità consentiti in base al ruolo
// ================================
async function computeVisibilityFilter(opts: {
  challengeId: bigint
  user: { id: bigint | null; role: string | null }
}) {
  const { challengeId, user } = opts
  const allowed: Array<'public' | 'participants' | 'private'> = ['public']

  if (user.id) {
    allowed.push('participants')
    if (user.role === 'admin') {
      allowed.push('private')
    } else if (user.role === 'judge') {
      const ch = await prisma.challenges.findUnique({
        where: { id: challengeId as any },
        select: { judge_user_id: true }
      })
      if (ch?.judge_user_id && BigInt(ch.judge_user_id as any) === BigInt(user.id)) {
        allowed.push('private')
      }
    }
  }

  return allowed
}


export async function submissionsV1Routes(app: FastifyInstance) {

  // ================================
  // GET /api/v1/challenges/:id/submissions
  // ================================
  app.get('/challenges/:id/submissions', {
    preHandler: optionalAuth(),
    schema: {
      tags: ['Submissions v1'],
      summary: 'Lista submission con rispetto visibilità',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          limit:  { type: 'number' },
          cursor: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items:      { type: 'array', items: { type: 'object', additionalProperties: true } },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const cid = BigInt(String((req.params as any).id))
    const q   = req.query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const user = {
      id:   (req.user?.id ? BigInt(req.user.id) : null) as any,
      role: req.user?.role ?? null
    }
    const allowed = await computeVisibilityFilter({ challengeId: cid, user })

    const where: any = {
      challenge_id: cid as any,
      visibility:   { in: allowed as any }
    }
    if (cursorDate) where.created_at = { lt: cursorDate }

    const rows = await prisma.challenge_submissions.findMany({
      where,
      select: {
        id:                  true,
        challenge_id:        true,
        user_id:             true,
        task_id:             true,
        reviewer_user_id:    true,
        status:              true,
        visibility:          true,
        activity_description: true,
        payload_json:        true,
        points_awarded:      true,
        created_at:          true,
        reviewed_at:         true,
        users: { select: { username: true } },
        task:  { select: { id: true, title: true } }
      },
      orderBy: { created_at: 'desc' },
      take: limit + 1
    })

    const more  = rows.length > limit
    const items = rows.slice(0, limit).map((r: any) => ({
      id:         Number(r.id),
      author:     r.users?.username ?? null,
      status:     r.status,
      visibility: r.visibility,
      activity:   r.activity_description ?? null,
      payload:    r.payload_json ?? {},
      points:     r.points_awarded ?? null,
      taskId:     r.task_id ? Number(r.task_id) : null,
      taskTitle:  r.task?.title ?? null,
      createdAt:  r.created_at?.toISOString() ?? null,
      reviewedAt: r.reviewed_at?.toISOString() ?? null
    }))

    const nextCursor = more && rows[limit]?.created_at
      ? rows[limit].created_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })


  // ================================
  // POST /api/v1/challenges/:id/submissions
  // ================================
  app.post('/challenges/:id/submissions', {
    preHandler: requireAuth(),
    schema: {
      tags: ['Submissions v1'],
      summary: 'Crea una submission collegata a un task',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          task_id:              { type: 'number' },
          visibility:           { enum: ['private', 'participants', 'public'] },
          activity_description: { type: 'string' },
          payload:              { type: 'object' }
        },
        required: ['payload', 'task_id']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id:     { type: 'number' },
            status: { type: 'string' },
            taskId: { type: 'number' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error:  { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const cid  = BigInt(String((req.params as any).id))
    const body = req.body || {}

    if (!body.task_id) {
      return reply.code(400).send({ error: 'task_id è obbligatorio' })
    }

    let taskId: bigint
    try {
      taskId = BigInt(body.task_id)
    } catch {
      return reply.code(400).send({ error: 'task_id non valido' })
    }

    const task = await prisma.challenge_tasks.findUnique({
      where:  { id: taskId as any },
      select: { id: true, challenge_id: true, payload_schema: true }
    })

    if (!task || BigInt(task.challenge_id as any) !== cid) {
      return reply.code(400).send({ error: 'task non valido per questa challenge' })
    }

    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}
    const schema  = (task as any).payload_schema as TaskPayloadSchema | null

    if (schema?.fields?.length) {
      const errors = validatePayload(payload, schema)
      if (errors.length > 0) {
        return reply.code(400).send({ error: 'Payload non valido', errors })
      }
    }

    const visibility = (body.visibility ?? 'participants') as 'private' | 'participants' | 'public'
    const activity   = (body.activity_description ?? '').toString().slice(0, 500)

    const created = await prisma.challenge_submissions.create({
      data: {
        challenge_id:         cid as any,
        user_id:              req.user.id as any,
        task_id:              taskId as any,
        status:               'pending',
        visibility,
        activity_description: activity || null,
        payload_json:         payload as any
      },
      select: { id: true, status: true, task_id: true }
    })

    return reply.code(201).send({
      id:     Number(created.id),
      status: created.status,
      taskId: Number(created.task_id)
    })
  })


  // ================================
  // PATCH /api/v1/submissions/:id
  // Modifica submission rifiutata — solo autore, solo se status = rejected
  // Dopo la modifica la submission torna in stato "pending"
  // Il payload viene rivalidato contro il payload_schema del task
  // ================================
  app.patch('/submissions/:id', {
    preHandler: requireAuth(),
    schema: {
      tags: ['Submissions v1'],
      summary: 'Modifica submission rifiutata (solo autore)',
      description: 'Permette al volontario di correggere una submission rifiutata. La submission torna in stato pending per una nuova revisione. Il payload viene rivalidato contro lo schema del task.',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          activity_description: { type: 'string', maxLength: 500 },
          visibility:           { enum: ['private', 'participants', 'public'] },
          payload:              { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id:        { type: 'number' },
            status:    { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error:  { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const sid    = BigInt(req.params.id)
    const userId = BigInt(req.user.id)
    const body   = req.body || {}

    // Recupera la submission con il task per poter rivalidare il payload
    const sub = await prisma.challenge_submissions.findUnique({
      where: { id: sid },
      select: {
        id:           true,
        user_id:      true,
        status:       true,
        task_id:      true,
        task: {
          select: { payload_schema: true }
        }
      }
    })

    if (!sub) {
      return reply.code(404).send({ error: 'Submission non trovata' })
    }

    // Solo l'autore può modificare
    if (BigInt(sub.user_id as any) !== userId) {
      return reply.code(403).send({ error: 'Non autorizzato: puoi modificare solo le tue submission' })
    }

    // Solo se rejected
    if (sub.status !== 'rejected') {
      return reply.code(400).send({
        error: `Modifica non consentita: la submission è in stato "${sub.status}". Solo le submission rifiutate possono essere modificate.`
      })
    }

    // Almeno un campo deve essere presente nel body
    const hasPayload     = body.payload     !== undefined
    const hasActivity    = body.activity_description !== undefined
    const hasVisibility  = body.visibility  !== undefined

    if (!hasPayload && !hasActivity && !hasVisibility) {
      return reply.code(400).send({ error: 'Nessun campo da aggiornare fornito' })
    }

    // Rivalidazione payload se fornito
    if (hasPayload) {
      const payload = typeof body.payload === 'object' ? body.payload : {}
      const schema  = (sub.task as any)?.payload_schema as TaskPayloadSchema | null

      if (schema?.fields?.length) {
        const errors = validatePayload(payload, schema)
        if (errors.length > 0) {
          return reply.code(400).send({ error: 'Payload non valido', errors })
        }
      }
    }

    // Costruisce l'oggetto di aggiornamento con solo i campi forniti
    const updateData: Record<string, any> = {
      status:       'pending',   // torna sempre in pending dopo la modifica
      reviewed_at:  null,        // azzera la data di revisione precedente
      reviewer_user_id: null     // azzera il reviewer precedente
    }

    if (hasActivity)   updateData.activity_description = body.activity_description?.toString().slice(0, 500) ?? null
    if (hasVisibility) updateData.visibility            = body.visibility
    if (hasPayload)    updateData.payload_json          = body.payload

    const updated = await prisma.challenge_submissions.update({
      where: { id: sid },
      data:  updateData,
      select: { id: true, status: true, updated_at: true }
    } as any)

    return reply.send({
      id:        Number(updated.id),
      status:    updated.status,
      updatedAt: (updated as any).updated_at
        ? new Date((updated as any).updated_at).toISOString()
        : new Date().toISOString()
    })
  })


  // ================================
  // POST /api/v1/submissions/:id/review
  // ================================
  app.post('/submissions/:id/review', {
    preHandler: requireAuth(users_role.judge),
    schema: {
      tags: ['Submissions v1'],
      summary: 'Valuta una submission (judge/admin)',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          decision: { enum: ['approved', 'rejected'] },
          points:   { type: 'number' },
          note:     { type: 'string' }
        },
        required: ['decision']
      }
    }
  }, async (req: any, reply) => {
    const sid = BigInt(req.params.id)
    const { decision, points, note } = req.body

    const sub = await prisma.challenge_submissions.findUnique({
      where:  { id: sid },
      select: {
        id:           true,
        status:       true,
        challenge_id: true,
        user_id:      true,
        task_id:      true
      }
    })

    if (!sub || sub.status !== 'pending') {
      return reply.code(404).send({ error: 'submission non trovata o già revisionata' })
    }

    if (!sub.task_id) {
      return reply.code(400).send({ error: 'submission senza task associato' })
    }

    if (req.user.role !== 'admin') {
      const ch = await prisma.challenges.findUnique({
        where:  { id: sub.challenge_id },
        select: { judge_user_id: true }
      })
      if (!ch?.judge_user_id || BigInt(ch.judge_user_id) !== BigInt(req.user.id)) {
        return reply.code(403).send({ error: 'forbidden' })
      }
    }

    const now = new Date()

    await prisma.$transaction([
      prisma.challenge_submissions.update({
        where: { id: sid },
        data: {
          status:           decision,
          reviewer_user_id: req.user.id,
          reviewed_at:      now,
          points_awarded:   decision === 'approved' ? points ?? 0 : 0
        }
      }),
      prisma.review_audit.create({
        data: {
          submission_id:    sid,
          reviewer_user_id: BigInt(req.user.id),
          action:           decision === 'approved' ? 'approve' : 'reject',
          points_awarded:   decision === 'approved' ? points ?? 0 : 0,
          note:             note ?? null
        }
      })
    ])

    if (decision === 'approved') {
      try {
        await onApprove({
          submission_id:    sub.id,
          challenge_id:     sub.challenge_id,
          user_id:          sub.user_id,
          reviewer_user_id: req.user.id,
          delta:            points ?? 0,
          event:            'task_completed_verified',
          version:          '1.0',
          meta: {
            review_context: 'manual_approval',
            judge_role:     req.user.role
          }
        })

        await invalidateLeaderboardCache(
          generateLeaderboardCacheKey('challenge', { challenge_id: sub.challenge_id })
        )
        await invalidateGlobalLeaderboards()

        // Invalida la cache del summary per aggiornare immediatamente
        // i counter CO2 e km nella dashboard evento
        invalidateSummaryCache(Number(sub.challenge_id))

      } catch (err) {
        req.log.error({ err }, 'Errore in onApprove hook')
      }
    }

    return reply.send({
      id:         Number(sid),
      status:     decision,
      points:     points ?? 0,
      reviewedAt: now.toISOString()
    })
  })


  // ================================
  // GET /api/v1/user/submissions
  // ================================
  app.get('/user/submissions', {
    preHandler: requireAuth(),
    schema: {
      tags: ['Submissions v1'],
      summary: "Lista submission dell'utente corrente",
      querystring: {
        type: 'object',
        properties: {
          status: { enum: ['pending', 'approved', 'rejected', 'all'], default: 'all' },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          cursor: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items:      { type: 'array', items: { type: 'object', additionalProperties: true } },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const userId = BigInt(req.user.id)
    const { status = 'all', limit = 20, cursor } = req.query
    const where: any = { user_id: userId as any }

    if (status !== 'all') where.status = status
    if (cursor) where.created_at = { lt: new Date(cursor) }

    const rows = await prisma.challenge_submissions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit + 1,
      select: {
        id:                   true,
        challenge_id:         true,
        task_id:              true,
        status:               true,
        visibility:           true,
        activity_description: true,
        payload_json:         true,
        points_awarded:       true,
        created_at:           true,
        reviewed_at:          true,
        challenges: { select: { title: true } },
        task:       { select: { title: true } }
      }
    })

    const more  = rows.length > limit
    const items = rows.slice(0, limit).map((r: any) => ({
      id:              Number(r.id),
      challenge_id:    Number(r.challenge_id),
      challenge_title: r.challenges?.title ?? '',
      taskId:          r.task_id ? Number(r.task_id) : null,
      taskTitle:       r.task?.title ?? null,
      status:          r.status,
      visibility:      r.visibility,
      activity:        r.activity_description ?? null,
      payload:         r.payload_json ?? {},
      points:          r.points_awarded ?? null,
      createdAt:       r.created_at.toISOString(),
      reviewedAt:      r.reviewed_at ? r.reviewed_at.toISOString() : null
    }))

    const nextCursor = more ? rows[limit].created_at.toISOString() : null

    return reply.send({ items, nextCursor })
  })
}
