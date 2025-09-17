// src/routes/v1/judges.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../db/client.js'
import { verifyAccessToken } from '../../utils/jwt.js'
import { z } from 'zod'

function requireAuth(role?: 'admin' | 'judge') {
  return async (req: any, reply: FastifyReply) => {
    const auth = req.headers?.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    try {
      const p = verifyAccessToken(token) as any
      req.user = { id: BigInt(p.sub), email: p.email }
      // carica ruolo utente
      const u = await prisma.users.findFirst({
        where: { id: req.user.id as any },
        select: { role: true }
      })
      if (!u) return reply.code(401).send({ error: 'unauthorized' })
      if (role && u.role !== role && u.role !== 'admin') {
        return reply.code(403).send({ error: 'forbidden' })
      }
      req.user.role = u.role
    } catch {
      return reply.code(401).send({ error: 'unauthorized' })
    }
  }
}

export async function judgesV1Routes(app: FastifyInstance) {
  // 1) Assegna giudice (solo admin)
  app.post(
    '/challenges/:id/assign-judge',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      preHandler: requireAuth('admin'),
      schema: {
        tags: ['Judges v1'],
        body: {
          type: 'object',
          properties: { userId: { anyOf: [{ type: 'string' }, { type: 'number' }] } },
          required: ['userId']
        },
        response: {
          200: { type: 'object', properties: { ok: { type: 'boolean' } } },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } }
        }
      }
    },
    async (req: any, reply: FastifyReply) => {
      const schema = z.object({ userId: z.union([z.string(), z.number()]) })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })

      const challengeId = BigInt(req.params.id)
      const judgeId = BigInt(parsed.data.userId)

      const judge = await prisma.users.findFirst({
        where: { id: judgeId as any, role: { in: ['judge', 'admin'] as any } } as any
      })
      if (!judge) return reply.code(400).send({ error: 'user is not judge/admin' })

      const ok = await prisma.challenges.updateMany({
        where: { id: challengeId as any },
        data: { judge_user_id: judgeId as any }
      })
      if (ok.count === 0) return reply.code(404).send({ error: 'challenge not found' })
      return reply.send({ ok: true })
    }
  )

  // 2) Coda del giudice (pending)
  app.get(
    '/judge/my-queue',
    {
      preHandler: requireAuth('judge'),
      schema: {
        tags: ['Judges v1'],
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
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    submissionId: { type: 'number' },
                    challengeId: { type: 'number' },
                    challengeTitle: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        username: { type: 'string' }
                      }
                    },
                    payload: { type: 'object', additionalProperties: true },
                    created_at: { type: 'string' }
                  }
                }
              },
              nextCursor: { anyOf: [{ type: 'string' }, { type: 'null' }] }
            }
          }
        }
      }
    },
    async (req: any, reply: FastifyReply) => {
      const q = req.query || {}
      const limit = Math.min(Math.max(Number(q.limit || 20), 1), 50)
      const cursor = q.cursor ? BigInt(q.cursor) : null

      const rows = await prisma.challenge_submissions.findMany({
        where: {
          status: 'pending' as any,
          challenges: { judge_user_id: req.user.id as any }
        } as any,
        select: {
          id: true, challenge_id: true, user_id: true, payload_json: true, created_at: true,
          challenges: { select: { title: true } },
          users: { select: { id: true, username: true } }
        },
        orderBy: { id: 'asc' },
        ...(cursor ? { cursor: { id: cursor as any }, skip: 1 } : {}),
        take: limit
      })

      const items = rows.map(r => ({
        submissionId: Number(r.id),
        challengeId: Number(r.challenge_id),
        challengeTitle: r.challenges?.title || '',
        user: { id: Number(r.users?.id || 0), username: r.users?.username || '' },
        payload: r.payload_json as any,
        created_at: r.created_at.toISOString?.() ?? r.created_at
      }))
      const nextCursor = rows.length === limit ? String(rows[rows.length - 1].id) : null
      return reply.send({ items, nextCursor })
    }
  )

  // 3) Decisione su submission
  app.post(
    '/submissions/:submissionId/decision',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      preHandler: requireAuth('judge'),
      schema: {
        tags: ['Judges v1'],
        body: {
          type: 'object',
          properties: {
            decision: { type: 'string', enum: ['approve', 'reject'] },
            points: { type: 'number' },
            note: { type: 'string' }
          },
          required: ['decision']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              status: { type: 'string' }
            }
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } }
        }
      }
    },
    async (req: any, reply: FastifyReply) => {
      const decisionSchema = z.object({
        decision: z.enum(['approve', 'reject']),
        points: z.number().int().min(0).max(100).optional(),
        note: z.string().max(255).optional()
      })
      const parsed = decisionSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: 'invalid body' })

      const sid = BigInt(req.params.submissionId)
      const me = req.user.id as bigint
      const { decision, points, note } = parsed.data

      if (decision === 'approve' && (points === undefined || points === null)) {
        return reply.code(400).send({ error: 'points required for approve' })
      }

      const result = await prisma.$transaction(async (tx) => {
        const sub = await tx.challenge_submissions.findUnique({
          where: { id: sid as any },
          select: { id: true, status: true, challenge_id: true, user_id: true }
        })
        if (!sub) return { notFound: true }

        // autorizzazione: admin oppure giudice assegnato
        const ch = await tx.challenges.findUnique({
          where: { id: sub.challenge_id as any },
          select: { judge_user_id: true }
        })
        const meRole = (await tx.users.findUnique({
          where: { id: me as any }, select: { role: true }
        }))?.role
        const meIsAdmin = meRole === 'admin'
        if (!meIsAdmin && ch?.judge_user_id?.toString() !== me.toString()) {
          return { forbidden: true }
        }

        // idempotenza
        if (sub.status !== 'pending') {
          return { already: true, status: sub.status }
        }

        // update submission
        const newStatus = decision === 'approve' ? 'approved' : 'rejected'
        const pts = decision === 'approve' ? (points ?? 0) : null

        await tx.challenge_submissions.update({
          where: { id: sid as any },
          data: {
            status: newStatus as any,
            points_awarded: pts as any,
            reviewer_user_id: me as any,
            reviewed_at: new Date()
          } as any
        })

        // se approvata → aggiorna punteggio
        if (decision === 'approve' && pts && pts > 0) {
          await tx.challenge_scores.upsert({
            where: {
              challenge_id_user_id: {
                challenge_id: sub.challenge_id as any,
                user_id: sub.user_id as any
              }
            },
            create: { challenge_id: sub.challenge_id as any, user_id: sub.user_id as any, score: pts },
            update: { score: { increment: pts } }
          })
        }

        // audit (raw SQL perché non abbiamo il model Prisma)
        await tx.$executeRawUnsafe(
          `INSERT INTO review_audit (submission_id, reviewer_user_id, action, points_awarded, note, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          sub.id, me, decision, pts, note ?? null
        )

        return { ok: true, status: newStatus }
      })

      if (result?.notFound) return reply.code(404).send({ error: 'not found' })
      if (result?.forbidden) return reply.code(403).send({ error: 'forbidden' })
      return reply.send({ ok: true, status: result?.status ?? 'unchanged' })
    }
  )
}
