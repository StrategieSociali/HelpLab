import { FastifyInstance } from 'fastify'
import { scoringConfigV1, previewScoreV1 } from '../../services/scoringService.js'
import { previewBodySchema } from '../../schemas/scoringSchemas.js'

export async function scoringV1Routes(app: FastifyInstance) {
  /**
   * GET /api/v1/scoring/config
   * Pubblica la configurazione ufficiale di scoring (cache 1h)
   */
  app.get('/scoring/config', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      description: 'Ottiene la configurazione di scoring corrente (versionata).',
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            co2e_coef: { type: 'number' },
            difficulty_multipliers: {
              type: 'object',
              properties: {
                low: { type: 'number' },
                medium: { type: 'number' },
                high: { type: 'number' }
              }
            },
            target_scaling: { type: 'string' },
            evidence_bonus: {
              type: 'object',
              properties: {
                judge: { type: 'number' },
                auto: { type: 'number' },
                user: { type: 'number' }
              }
            },
            min_tasks: { type: 'number' },
            require_one_task_with_evidence: { type: 'boolean' }
          }
        }
      }
    }
  }, async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600')
    return reply.send(scoringConfigV1)
  })

  /**
   * POST /api/v1/challenges/preview-scoring
   * Calcola una stima punteggio locale (bozza challenge)
   */
  app.post('/challenges/preview-scoring', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      description: 'Calcola una stima punteggio a partire da una bozza di challenge (body parziale OK).',
      body: { type: 'object' }, // Zod farà la validazione vera
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            points_estimate_total: { type: 'number' },
            breakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'number' }
                }
              }
            },
            notes: { type: 'array', items: { type: 'string' } }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parsed = previewBodySchema.safeParse(req.body)
    if (!parsed.success) {
      const msg = parsed.error.errors.map(e => e.message).join('; ')
      return reply.code(400).send({ error: msg || 'invalid body' })
    }

    const result = previewScoreV1(parsed.data)
    return reply.send(result)
  })
}