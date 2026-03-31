// src/server.ts
/**
 * Scopo: istanziare Fastify, registrare middleware e route,
 * abilitare Swagger, CORS, Rate Limit, Cookie e sicurezza.
 *
 * Entry point dell'applicazione.
 * Tutte le route v1 sono registrate tramite il router aggregato in routes/v1/index.ts
 *
 * Sicurezza:
 * - FIX 2 (mar 2026): blocco avvio in production se COOKIE_SECRET non è definita.
 *   Warning in sviluppo se si usa il fallback.
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

// Route v1 (router aggregato)
import { v1Routes } from './routes/v1/index.js'


// ================================
// FIX 2 — Validazione variabili d'ambiente critiche
// Eseguita prima di qualsiasi altra operazione.
// ================================
function validateEnv(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const secret = process.env.COOKIE_SECRET

  if (!secret) {
    if (isProd) {
      // In produzione non c'è fallback accettabile: una chiave nota
      // permetterebbe a chiunque di forgiare cookie firmati validi.
      console.error(
        '[FATAL] COOKIE_SECRET non è definita. ' +
        'Imposta la variabile d\'ambiente COOKIE_SECRET prima di avviare il server in produzione.'
      )
      process.exit(1)
    }

    // In sviluppo si può procedere ma con un warning visibile
    const fallback = process.env.JWT_SECRET || 'changeme'
    console.warn(
      '[WARN] COOKIE_SECRET non definita — uso fallback "' + fallback + '". ' +
      'Non usare in produzione.'
    )
    return fallback
  }

  return secret
}

const cookieSecret = validateEnv()


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
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']
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
  // FIX 2: cookieSecret è già stato validato in validateEnv().
  // In produzione è garantito che non sia il fallback 'changeme'.
  await server.register(cookie, {
    secret: cookieSecret,
    parseOptions: {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    },
  })

  // === Swagger
  await server.register(swagger, {
    openapi: {
      info: { title: 'HelpLab API', version: process.env.npm_package_version || '0.7.1' },
      servers: [{ url: '/api' }],
      tags: [
        { name: 'Auth', description: 'Registrazione, login, sessione (v1)' },
        { name: 'Learning v1', description: 'Percorsi formativi' },
        { name: 'Scoring v1', description: 'Configurazione e anteprima punteggi sfide' },
        { name: 'Proposals v1', description: 'Proposte utenti' },
        { name: 'Judges v1', description: 'Revisione giudici' },
        { name: 'Admin v1', description: 'Operazioni amministrative' },
        { name: 'Challenges v1', description: 'Sfide attive' },
        { name: 'Sponsors', description: 'Profili sponsor e recensioni' },
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
