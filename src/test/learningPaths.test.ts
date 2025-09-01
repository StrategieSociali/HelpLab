import Fastify from 'fastify'
import supertest from 'supertest'

// *** IMPORTANTE: mock della path .js perché la route importa .js ***
vi.mock('../services/learningService.js', () => {
  return {
    listLearningPaths: vi.fn(async () => []),
    getUserProgress: vi.fn(async (userId: bigint) => {
      if (String(userId) === '3') {
        return { '1': [11, 12], '2': [21] } // progress finti per userId=3
      }
      return {}
    }),
    markModuleDone: vi.fn(async () => {}),
  }
})

// Import dopo il mock
import { learningPathsRoutes } from '../routes/learningPaths.js'

describe('GET /api/learning-paths/progress', () => {
  let app: any
  let request: any

  beforeAll(async () => {
    app = Fastify({ logger: false })
    await app.register(learningPathsRoutes, { prefix: '/api/learning-paths' })
    await app.ready() // <— fondamentale
    request = supertest(app.server)
  })

  afterAll(async () => {
    await app.close()
  })

  it('400 quando manca userId', async () => {
    const res = await request.get('/api/learning-paths/progress')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'userId is required')
  })

  it('200 con {} per utente inesistente/senza progressi', async () => {
    const res = await request.get('/api/learning-paths/progress?userId=999999')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('progress')
    expect(res.body.progress).toEqual({})
  })

  it('200 con progress per utente con dati', async () => {
    const res = await request.get('/api/learning-paths/progress?userId=3')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('progress')
    expect(res.body.progress).toEqual({ '1': [11, 12], '2': [21] })
  })
})
