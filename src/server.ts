import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import dotenv from 'dotenv'

// importa le route mock
import { challengesRoutes } from './routes/challenges.js'
import { learningPathsRoutes } from './routes/learningPaths.js'

dotenv.config()

const server = Fastify({
  logger: true
})

// CORS: solo gli origin ammessi (separa con virgole in .env)
await server.register(cors, {
  origin: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
})

// Helmet: headers di sicurezza base
await server.register(helmet)

// ✅ HEALTHCHECK
server.get('/api/health', async () => {
  return { status: 'ok' }
})

// (facoltativo) redirect dalla root alla health, così non vedi 404 se apri /
server.get('/', async (_req, reply) => reply.redirect('/api/health'))

// Rotte API (mock per ora)
server.register(challengesRoutes, { prefix: '/api/challenges' })
server.register(learningPathsRoutes, { prefix: '/api/learning-paths' })

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '127.0.0.1'

try {
  await server.listen({ port, host })
  server.log.info(`API listening on http://${host}:${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
