// src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import cookie from '@fastify/cookie'
import { authRoutes } from './routes/auth.js'

// v0 routes
import { challengesRoutes } from './routes/challenges.js'
import { learningPathsRoutes } from './routes/learningPaths.js'

// v1 routes
import { scoringV1Routes } from './routes/v1/scoring.js'
import { proposalsV1Routes } from './routes/v1/proposals.js'

dotenv.config()

async function start() {
  const server = Fastify({ logger: true })

  // Sicurezza & CORS
  await server.register(helmet)
  await server.register(cors, {
    origin: (process.env.CORS_ORIGIN || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    credentials: true
  })

  // Rate limit globale
  await server.register(rateLimit, { max: 60, timeWindow: '1 minute' })

  // Cookie (prima delle route che li usano)
  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'changeme',
    parseOptions: {
      httpOnly: true,
      sameSite: 'none',
      secure: true
    }
  })

  // Swagger
  await server.register(swagger, {
  openapi: {
    info: { title: 'HelpLab API', version: '0.3.0' },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'Auth', description: 'Registrazione, login e gestione sessione' },
      { name: 'Challenges', description: 'Sfide e leaderboard' },
      { name: 'Learning', description: 'Percorsi formativi' },
      { name: 'Scoring v1', description: 'Config e preview scoring v1' },
      { name: 'Proposals v1', description: 'Proposte di challenge (v1)' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
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


  // Health
  server.get('/api/health', async () => ({ status: 'ok' }))

  // v0
  await server.register(challengesRoutes,    { prefix: '/api/challenges' })
  await server.register(learningPathsRoutes, { prefix: '/api/learning-paths' })

  // v1
  await server.register(scoringV1Routes,   { prefix: '/api/v1' })
  await server.register(proposalsV1Routes, { prefix: '/api/v1' })
  
  await server.register(authRoutes, { prefix: '/api/auth' })

  const port = Number(process.env.PORT || 3001)
  await server.listen({ host: '127.0.0.1', port })
  server.log.info(`API listening on http://127.0.0.1:${port}`)
}

// Avvio “single entrypoint”: evita doppie esecuzioni in caso di import accidentali
start().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
