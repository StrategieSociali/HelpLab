// src/routes/v1/submissions.ts
/**
 * Scopo: permette l'invio delle submission,
 *permette di convertire una submission e registrate i dati relativi
 * 
 */
import type { FastifyInstance, FastifyReply } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth } from '../../utils/requireAuth.js'
import { onApprove } from '../../services/scoring/onApprove.js'
import { invalidateLeaderboardCache } from '../../services/leaderboardService.js'
import { generateLeaderboardCacheKey } from '../../services/leaderboardService.js'
import { users_role } from '@prisma/client'


// Invalida leaderboard globale
        async function invalidateGlobalLeaderboards() {
  await Promise.all([
    invalidateLeaderboardCache(generateLeaderboardCacheKey('user-global', { window: 'all' })),
    invalidateLeaderboardCache(generateLeaderboardCacheKey('user-global', { window: 'this_month' })),
    invalidateLeaderboardCache(generateLeaderboardCacheKey('user-global', { window: 'this_week' }))
  ])
}

// visibilità consentita in base al ruolo/contesto
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
          cursor: { type: 'string' }
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
        users: { select: { username: true } }
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
    preHandler: requireAuth(),
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
        }
      }
    }
  }, async (req: any, reply) => {
    const cid = BigInt(String((req.params as any).id))
    const body = req.body || {}

    const visibility = (body.visibility ?? 'participants') as 'private' | 'participants' | 'public'
    const activity = (body.activity_description ?? '').toString().slice(0, 500)
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}

    const created = await prisma.challenge_submissions.create({
      data: {
        challenge_id: cid as any,
        user_id: req.user.id as any,
        status: 'pending',
        visibility,
        activity_description: activity || null,
        payload_json: payload as any
      },
      select: { id: true, status: true }
    })

    return reply.code(201).send({ id: Number(created.id), status: created.status })
  })

// ================================
// POST /api/v1/submissions/:id/review (approve/reject)
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
        points: { type: 'number' },
        task_id: { type: 'number' },
        note: { type: 'string' }
      },
      required: ['decision', 'task_id']
    }
  }
}, async (req: any, reply) => {
  const sid = BigInt(req.params.id)
  const { decision, points, task_id, note } = req.body

  const sub = await prisma.challenge_submissions.findUnique({
    where: { id: sid },
    select: {
      id: true,
      status: true,
      challenge_id: true,
      user_id: true
    }
  })

  if (!sub || sub.status !== 'pending') {
    return reply.code(404).send({ error: 'submission non trovata o già revisionata' })
  }

  // Verifica permessi se non admin
  if (req.user.role !== 'admin') {
    const ch = await prisma.challenges.findUnique({
      where: { id: sub.challenge_id },
      select: { judge_user_id: true }
    })
    if (!ch?.judge_user_id || BigInt(ch.judge_user_id) !== BigInt(req.user.id)) {
      return reply.code(403).send({ error: 'forbidden' })
    }
  }

  // Verifica task_id valido
  const task = await prisma.challenge_tasks.findUnique({
    where: { id: BigInt(task_id) }
  })

  if (!task || task.challenge_id !== sub.challenge_id) {
    return reply.code(400).send({ error: 'task non valido per questa challenge' })
  }

  const now = new Date()

  // Transazione: update submission + audit
  await prisma.$transaction([
    prisma.challenge_submissions.update({
      where: { id: sid },
      data: {
        status: decision,
        reviewer_user_id: req.user.id,
        reviewed_at: now,
        points_awarded: decision === 'approved' ? points ?? 0 : 0,
        task_id: BigInt(task_id)
      }
    }),
    prisma.review_audit.create({
      data: {
        submission_id: sid,
        reviewer_user_id: BigInt(req.user.id),
        action: decision === 'approved' ? 'approve' : 'reject',
        points_awarded: decision === 'approved' ? points ?? 0 : 0,
        note: note ?? null
      }
    })
  ])

  // Se approved, esegui hook e cache invalidate
  if (decision === 'approved') {
    try {
      await onApprove({
        submission_id: sub.id,
        challenge_id: sub.challenge_id,
        user_id: sub.user_id,
        reviewer_user_id: req.user.id,
        delta: points ?? 0,
        event: 'task_completed_verified',
        version: '1.0',
        meta: {
          review_context: 'manual_approval',
          judge_role: req.user.role
        }
      })

      // Invalida cache leaderboard
      await invalidateLeaderboardCache(
        generateLeaderboardCacheKey('challenge', { challenge_id: sub.challenge_id })
      )
      await invalidateGlobalLeaderboards()

    } catch (err) {
      req.log.error({ err }, 'Errore in onApprove hook')
    }
  }

  return reply.send({
    id: Number(sid),
    status: decision,
    points: points ?? 0,
    reviewedAt: now.toISOString()
  })
})
}
