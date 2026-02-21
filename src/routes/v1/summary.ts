// src/routes/v1/summary.ts
/**
 * Scopo: riepilogo statistico di una challenge
 *
 * Funzionalità:
 * - GET /challenges/:id/summary → stats submission + top 5 leaderboard
 *   + totali CO2 salvata, km percorsi, contatori per task
 *
 * Endpoint pubblico, non richiede autenticazione.
 *
 * Dati CO2:
 * I valori co2_saved_kg e km_percorsi vengono letti dal campo meta_json
 * delle points_transactions approvate. Il frontend riceve solo i totali
 * aggregati — nessun coefficiente o formula esposta.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/client.js'

export async function summaryV1Routes(app: FastifyInstance) {

  // ============================================================
  // GET /api/v1/challenges/:id/summary
  // ============================================================
  app.get('/challenges/:id/summary', {
    schema: {
      tags: ['Summary v1'],
      summary: 'Riepilogo challenge con statistiche, CO2 e top leaderboard',
      params: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async (req, reply) => {
    const challengeId = BigInt((req.params as any).id)

    // Challenge base
    const challenge = await prisma.challenges.findUnique({
      where:  { id: challengeId as any },
      select: {
        id:         true,
        title:      true,
        created_at: true,
        updated_at: true,
        challenge_proposals: {
          select: {
            description: true,
            difficulty:  true
          }
        }
      }
    })

    if (!challenge) {
      return reply.code(404).send({ error: 'challenge not found' })
    }

    const formattedChallenge = {
      id:          Number(challenge.id),
      title:       challenge.title,
      description: challenge.challenge_proposals?.description ?? null,
      difficulty:  challenge.challenge_proposals?.difficulty ?? 'n/a',
      created_at:  challenge.created_at,
      updated_at:  challenge.updated_at
    }

    // ================================
    // Statistiche submissions globali
    // ================================
    const stats = await prisma.challenge_submissions.groupBy({
      by:    ['status'],
      where: { challenge_id: challengeId as any },
      _count: { status: true }
    })

    const total    = stats.reduce((a, s) => a + s._count.status, 0)
    const pending  = stats.find(s => s.status === 'pending')?._count.status  || 0
    const approved = stats.find(s => s.status === 'approved')?._count.status || 0
    const rejected = stats.find(s => s.status === 'rejected')?._count.status || 0

    // ================================
    // Contatori per task
    // ================================
    const tasks = await prisma.challenge_tasks.findMany({
      where:   { challenge_id: challengeId as any },
      orderBy: { order_index: 'asc' },
      select:  { id: true, title: true }
    })

    const taskStats = await Promise.all(tasks.map(async task => {
      const taskSubmissions = await prisma.challenge_submissions.groupBy({
        by:    ['status'],
        where: { challenge_id: challengeId as any, task_id: task.id as any },
        _count: { status: true }
      })
      return {
        task_id:        Number(task.id),
        task_title:     task.title,
        approved_count: taskSubmissions.find(s => s.status === 'approved')?._count.status || 0,
        pending_count:  taskSubmissions.find(s => s.status === 'pending')?._count.status  || 0,
        rejected_count: taskSubmissions.find(s => s.status === 'rejected')?._count.status || 0
      }
    }))

    // ================================
    // Totali CO2 e km da points_transactions
    // Legge il campo co2 dal meta_json delle transazioni approvate
    // ================================
    const transactions = await prisma.points_transactions.findMany({
      where:  { challenge_id: challengeId as any },
      select: { meta_json: true }
    })

    let total_co2_saved_kg = 0
    let total_km           = 0

    for (const tx of transactions) {
      try {
        const meta = typeof tx.meta_json === 'string'
          ? JSON.parse(tx.meta_json)
          : tx.meta_json as any

        if (meta?.co2?.co2_saved_kg) {
          total_co2_saved_kg += Number(meta.co2.co2_saved_kg)
        }
        if (meta?.co2?.km_percorsi) {
          total_km += Number(meta.co2.km_percorsi)
        }
      } catch {
        // meta_json malformato — saltiamo senza bloccare
      }
    }

    // ================================
    // Top 5 leaderboard
    // ================================
    const leaderboard = await prisma.challenge_scores.findMany({
      where:   { challenge_id: challengeId as any },
      orderBy: { score: 'desc' },
      take:    5,
      select: {
        score: true,
        users: { select: { username: true } }
      }
    })

    const leaderboard_top = leaderboard.map(l => ({
      user:  l.users?.username ?? 'anon',
      score: l.score
    }))

    return reply.send({
      challenge:          formattedChallenge,
      submissions_stats: {
        total,
        pending,
        approved,
        rejected
      },
      tasks_stats:        taskStats,
      impact: {
        total_co2_saved_kg: parseFloat(total_co2_saved_kg.toFixed(3)),
        total_km:           parseFloat(total_km.toFixed(1))
      },
      leaderboard_top
    })
  })
}