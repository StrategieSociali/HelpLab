// src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import cookie from '@fastify/cookie'

// Routes
import { authRoutes } from './routes/auth.js'
import { learningPathsRoutes } from './routes/learningPaths.js'

// v1
import { scoringV1Routes } from './routes/v1/scoring.js'
import { proposalsV1Routes } from './routes/v1/proposals.js'
import { judgesV1Routes } from './routes/v1/judges.js'
import { adminJudgesV1Routes } from './routes/v1/adminJudges.js'
import { challengesV1Routes } from './routes/v1/challenges.js'

dotenv.config()

async function start() {
  const server = Fastify({ logger: true })

  // Sicurezza
  await server.register(helmet)

  // CORS
  const origins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  await server.register(cors, {
    origin: origins.length ? origins : false,
    credentials: true
  })

  // Rate limit globale (con messaggio JSON coerente)
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

  // Cookie (prima delle route che li usano)
  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'changeme',
    parseOptions: {
      httpOnly: true,
      sameSite: 'none',
      secure: true
    }
  })

  // Swagger (opzionale ma utile)
  await server.register(swagger, {
    openapi: {
      info: { title: 'HelpLab API', version: process.env.npm_package_version || '0.5.0' },
      servers: [{ url: '/api' }],
      tags: [
        { name: 'Auth', description: 'Registrazione, login, sessione' },
        { name: 'Learning', description: 'Percorsi formativi' },
        { name: 'Scoring v1', description: 'Config e preview scoring v1' },
        { name: 'Proposals v1', description: 'Proposte di challenge (v1)' },
        { name: 'Judges v1', description: 'Coda e decisioni giudici' },
        { name: 'Admin v1', description: 'Operazioni amministrative' },
        { name: 'Challenges v1', description: 'Feed pubblico sfide (da proposals approvate)' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          refreshCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: process.env.COOKIE_NAME || 'helplab_refresh',
            description: 'Refresh token httpOnly impostato dal login'
          }
        }
      }
    }
  })
  await server.register(swaggerUI, { routePrefix: '/api/docs', uiConfig: { docExpansion: 'list' } })

  // Health
  server.get('/api/health', async () => ({ status: 'ok' }))

  // v0 (solo learning paths; feed challenges legacy è stato rimosso)
  await server.register(learningPathsRoutes, { prefix: '/api/learning-paths' })

  // v1
  await server.register(scoringV1Routes,     { prefix: '/api/v1' })
  await server.register(proposalsV1Routes,   { prefix: '/api/v1' })
  await server.register(judgesV1Routes,      { prefix: '/api/v1' })
  await server.register(adminJudgesV1Routes, { prefix: '/api/v1' })
  await server.register(challengesV1Routes,  { prefix: '/api/v1' })

  // Auth
  await server.register(authRoutes, { prefix: '/api/auth' })

  // Avvio
  const port = Number(process.env.PORT || 3001)
  const host = process.env.HOST || '127.0.0.1'
  await server.listen({ host, port })
  server.log.info(`API listening on http://${host}:${port}`)
}

// Entry point
start().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
