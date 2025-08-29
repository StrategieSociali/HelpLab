import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'

// Route modules
import { challengesRoutes } from './routes/challenges.js'
import { learningPathsRoutes } from './routes/learningPaths.js'
import { authRoutes } from './routes/auth.js' 
import { formsRoutes } from './routes/forms.js'

dotenv.config()

// 1) trustProxy = true (sei dietro Nginx)
const server = Fastify({ logger: true, trustProxy: true })

// Sicurezza & CORS
await server.register(helmet)
await server.register(cors, {
  origin: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  credentials: true
})  

// abilita setCookie/lettura cookie
await server.register(cookie) 

// Swagger (OpenAPI) - info base
await server.register(swagger, {
  openapi: {
    info: { title: 'HelpLab API', version: '0.2.0' },
    servers: [{ url: '/api' }]
  }
})

// Swagger UI - pagina web della documentazione
await server.register(swaggerUI, {
  routePrefix: '/api/docs',
  uiConfig: { docExpansion: 'list' }
})

// JSON dell’OpenAPI in un punto fisso (comodo per FE/QA)
server.get('/api/openapi.json', async (_req, reply) => {
  return reply.send(server.swagger())
})

// Healthcheck (rate-limit disabilitato)
server.get('/api/health', async () => ({ status: 'ok' }))


// 2) Rate limit globale
await server.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  skipOnError: true,              // se plugin ha problemi, non blocca il traffico
})

// Disabilita rate-limit per la UI docs (opzionale ma consigliato)
server.addHook('onRoute', (route) => {
  if (route.url.startsWith('/api/docs')) {
    route.config = { ...(route.config || {}), rateLimit: false }
  }
})

// Rotte applicative
server.register(authRoutes, { prefix: '/api/auth' })
server.register(formsRoutes, { prefix: '/api/forms' }) 
server.register(challengesRoutes, { prefix: '/api/challenges' })
server.register(learningPathsRoutes, { prefix: '/api/learning-paths' })

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '127.0.0.1'
await server.listen({ port, host })
server.log.info(`API listening on http://${host}:${port}`)
