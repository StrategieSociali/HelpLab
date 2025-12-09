// src/server.ts

/**
 * Scopo: Istanziare Fastify, registrare middleware e route,
 * abilitare Swagger, CORS, Rate Limit, Cookie e sicurezza.
 *
 * NOTA: Nessuna cache esterna. La cache delle leaderboard
 *       è ora gestita in-memory via utils/memoryCache.ts
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import cookie from '@fastify/cookie'

dotenv.config()

// Routes
import { learningPathsRoutes } from './routes/learningPaths.js'
import { scoringV1Routes } from './routes/v1/scoring.js'
import { proposalsV1Routes } from './routes/v1/proposals.js'
import { judgesV1Routes } from './routes/v1/judges.js'
import { adminJudgesV1Routes } from './routes/v1/adminJudges.js'
import { challengesV1Routes } from './routes/v1/challenges.js'
import { submissionsV1Routes } from './routes/v1/submissions.js'
import { leaderboardV1Routes } from './routes/v1/leaderboard.js'
import { v1Routes } from './routes/v1/index.js'

async function start() {
  const server = Fastify({ logger: true })

  // === Sicurezza
  await server.register(helmet)

  // === CORS
  const origins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

  await server.register(cors, {
    origin: origins.length ? origins : false,
    credentials: true
  })

  // === Rate limit
  await server.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
    hook: 'onRequest',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    },
    errorResponseBuilder: (_req, ctx: any) => ({
      error: 'too_many_requests',
      message: 'Troppe richieste, riprova più tardi',
      statusCode: 429,
      limit: ctx?.max ?? null
    })
  })

  // === Cookie
  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'changeme',
    parseOptions: {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    },
  })

  // === Swagger
  await server.register(swagger, {
    openapi: {
      info: { title: 'HelpLab API', version: process.env.npm_package_version || '0.6.4' },
      servers: [{ url: '/api' }],
      tags: [
        { name: 'Auth', description: 'Registrazione, login, sessione (v1)' },
        { name: 'Learning', description: 'Percorsi formativi (legacy)' },
        { name: 'Scoring v1', description: 'Configurazione e anteprima punteggi sfide' },
        { name: 'Proposals v1', description: 'Proposte utenti' },
        { name: 'Judges v1', description: 'Revisione giudici' },
        { name: 'Admin v1', description: 'Operazioni amministrative' },
        { name: 'Challenges v1', description: 'Sfide attive' },
        { name: 'Submissions v1', description: 'Invio e moderazione attività' },
        { name: 'Tasks v1', description: 'Gestione task challenge' },
        { name: 'Summary v1', description: 'Statistiche sfide' },
        { name: 'Leaderboard v1', description: 'Classifiche utenti' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          refreshCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: process.env.COOKIE_NAME || 'helplab_refresh'
          }
        }
      }
    }
  })

  await server.register(swaggerUI, {
    routePrefix: '/api/docs',
    uiConfig: { docExpansion: 'list' }
  })

  // === Health check
  server.get('/api/health', async () => ({ status: 'ok' }))

  // === Rotte v0
  await server.register(learningPathsRoutes, { prefix: '/api/learning-paths' })

  // === Rotte v1
  await server.register(v1Routes, { prefix: '/api/v1' })

  // === Avvio server
  const port = Number(process.env.PORT || 3001)
  const host = process.env.HOST || '127.0.0.1'

  await server.listen({ host, port })
  server.log.info(`API listening on http://${host}:${port}`)
}

start().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
