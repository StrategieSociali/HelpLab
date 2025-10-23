// src/routes/v1/submissions.ts
import type { FastifyInstance, FastifyReply } from 'fastify'
import { prisma } from '../../db/client.js'

// Auth helper locale (stile già usato altrove)
function requireAuth(role?: 'admin' | 'judge') {
  return async (req: any, reply: FastifyReply) => {
    const auth = String(req.headers?.authorization || '')
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    try {
      // NB: usa le tue funzioni reali di firma/verify
      const { verifyAccessToken } = await import('../../utils/jwt.js')
      const p = verifyAccessToken(token) as any
      req.user = { id: BigInt(p.sub), email: p.email }
      // carica il ruolo
      const u = await prisma.users.findFirst({
        where: { id: req.user.id as any },
        select: { role: true }
      })
      if (!u) return reply.code(401).send({ error: 'unauthorized' })
      if (role && u.role !== role && u.role !== 'admin') {
        return reply.code(403).send({ error: 'forbidden' })
      }
      ;(req.user as any).role = u.role ?? 'user'
    } catch {
      return reply.code(401).send({ error: 'invalid token' })
    }
  }
}

// visibilità consentita in base al ruolo/contesto
async function computeVisibilityFilter(opts: {
  challengeId: bigint
  user: { id: bigint | null; role: string | null }
}) {
  const { challengeId, user } = opts

  // base: pubbliche sempre visibili
  const allowed: Array<'public' | 'participants' | 'private'> = ['public']

  // se loggato:
  if (user.id) {
    // “participants”: per semplicità → visibile a tutti gli autenticati
    // (in futuro potremo controllare challenge_participants)
    allowed.push('participants')

    // se admin o giudice della challenge → tutto
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
          limit: { type: 'number' },
          cursor: { type: 'string' } // ISO date
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'object' } },
            nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        }
      }
    }
  }, async (req: any, reply) => {
    const cid = BigInt(String((req.params as any).id))
    const q = req.query || {}
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)))

    let cursorDate: Date | null = null
    if (q.cursor) {
      const d = new Date(String(q.cursor))
      if (!isNaN(d.getTime())) cursorDate = d
    }

    const user = {
      id: (req.user?.id ? BigInt(req.user.id) : null) as any,
      role: req.user?.role ?? null
    }
    const allowed = await computeVisibilityFilter({ challengeId: cid, user })

    const where: any = {
      challenge_id: cid as any,
      visibility: { in: allowed as any }
    }
    if (cursorDate) where.created_at = { lt: cursorDate }

    const rows = await prisma.challenge_submissions.findMany({
      where,
      select: {
        id: true,
        challenge_id: true,
        user_id: true,
        reviewer_user_id: true,
        status: true,
        visibility: true,
        activity_description: true,
        payload_json: true,
        points_awarded: true,
        created_at: true,
        reviewed_at: true,
        users: { select: { username: true } } // autore
      },
      orderBy: { created_at: 'desc' },
      take: limit + 1
    })

    const more = rows.length > limit
    const items = rows.slice(0, limit).map((r: any) => ({
      id: Number(r.id),
      author: r.users?.username ?? null,
      status: r.status,
      visibility: r.visibility,
      activity: r.activity_description ?? null,
      payload: r.payload_json ?? {},
      points: r.points_awarded ?? null,
      createdAt: r.created_at?.toISOString() ?? null,
      reviewedAt: r.reviewed_at?.toISOString() ?? null
    }))
    const nextCursor = more && rows[limit]?.created_at
      ? rows[limit].created_at.toISOString()
      : null

    return reply.send({ items, nextCursor })
  })

  // ================================
  // POST /api/v1/challenges/:id/submissions (crea)
  // ================================
  app.post('/challenges/:id/submissions', {
    preHandler: requireAuth(), // utente loggato
    schema: {
      tags: ['Submissions v1'],
      summary: 'Crea una submission',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          visibility: { enum: ['private', 'participants', 'public'] },
          activity_description: { type: 'string' },
          payload: { type: 'object' }
        },
        required: ['payload']
      },
      response: {
        201: {
          type: 'object',
          properties: { id: { type: 'number' }, status: { type: 'string' } }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const cid = BigInt(String((req.params as any).id))
    const body = req.body || {}

    const visibility = (body.visibility ?? 'participants') as 'private'|'participants'|'public'
    const activity = (body.activity_description ?? '').toString().slice(0, 500)
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}

    const created = await prisma.challenge_submissions.create({
      data: {
        challenge_id: cid as any,
        user_id: req.user.id as any,
        status: 'pending',
        visibility: visibility as any,
        activity_description: activity || null,
        payload_json: payload as any
      } as any,
      select: { id: true, status: true }
    })

    return reply.code(201).send({ id: Number(created.id), status: created.status })
  })

  // ================================
  // PATCH /api/v1/submissions/:id/review (approve/reject)
  // ================================
  app.patch('/submissions/:id/review', {
    preHandler: requireAuth('judge'), // judge o admin
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
          points: { type: 'number' }
        },
        required: ['decision']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            status: { type: 'string' },
            points: { anyOf: [{ type: 'number' }, { type: 'null' }] },
            reviewedAt: { anyOf: [{ type: 'string' }, { type: 'null' }] }
          }
        },
         401: { type: 'object', properties: { error: { type: 'string' } } },
    	 403: { type: 'object', properties: { error: { type: 'string' } } },
  		 404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const sid = BigInt(String((req.params as any).id))
    const { decision, points } = (req.body || {}) as { decision: 'approved'|'rejected', points?: number }

    const sub = await prisma.challenge_submissions.findUnique({
      where: { id: sid as any },
      select: { id: true, challenge_id: true }
    })
    if (!sub) return reply.code(404).send({ error: 'not found' })

    // se judge → deve essere il giudice assegnato alla challenge; admin bypassa
    if (req.user.role !== 'admin') {
      const ch = await prisma.challenges.findUnique({
        where: { id: sub.challenge_id as any },
        select: { judge_user_id: true }
      })
      if (!ch?.judge_user_id || BigInt(ch.judge_user_id as any) !== BigInt(req.user.id)) {
        return reply.code(403).send({ error: 'forbidden' })
      }
    }

    const now = new Date()
    const updated = await prisma.challenge_submissions.update({
      where: { id: sid as any },
      data: {
        status: decision,
        reviewer_user_id: req.user.id as any,
        reviewed_at: now,
        points_awarded: points != null ? Number(points) : null
      } as any,
      select: { id: true, status: true, points_awarded: true, reviewed_at: true }
    })

    return reply.send({
      id: Number(updated.id),
      status: updated.status,
      points: updated.points_awarded,
      reviewedAt: updated.reviewed_at?.toISOString() ?? null
    })
  })
}
