import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import supertest from 'supertest'

// 🔹 MOCK: deve puntare a .js (le route importano .js)
vi.mock('../services/challengesService.js', () => {
  return {
    listChallenges: vi.fn(async () => [
      {
        id: 1,
        slug: 'pulizia-parco-roma-abc123',
        title: 'Pulizia del Parco',
        type: 'clean_up',
        location: 'Roma',
        rules: 'Raccogli almeno 2 kg di rifiuti',
        deadline: '2025-12-31',
        status: 'open',
        budget: { amount: 50, currency: 'EUR' },
        sponsor: { name: 'Bar del Centro' },
        judge: { name: 'Admin' },
        target: { kind: 'quantity', unit: 'kg', amount: 2 },
        scoreboard: [{ user: 'Luca', score: 5 }],
        updatedAt: '2025-08-13T16:05:00Z',
      },
    ]),
    getLeaderboard: vi.fn(async (_id: bigint) => []),
    joinChallenge: vi.fn(async (_challengeId: bigint, _userId: bigint) => {}),
    submitDelta: vi.fn(async (_challengeId: bigint, _userId: bigint, _delta: number) => 14),
  }
})

// Import dopo il mock
import { challengesRoutes } from '../routes/challenges.js'

describe('/api/challenges', () => {
  let app: any
  let request: any

  beforeAll(async () => {
    app = Fastify({ logger: false })
    await app.register(challengesRoutes, { prefix: '/api/challenges' })
    await app.ready()
    request = supertest(app.server)
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/challenges → 200 e array', async () => {
    const res = await request.get('/api/challenges')
    expect(res.status).toBe(200)
    const body = res.body
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('title')
    expect(body[0]).toHaveProperty('scoreboard')
  })

  it('GET /api/challenges/:id/leaderboard → 400 se id non valido', async () => {
    const res = await request.get('/api/challenges/abc/leaderboard')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('GET /api/challenges/:id/leaderboard → 200 [] se non esiste', async () => {
    const res = await request.get('/api/challenges/999999/leaderboard')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('POST /api/challenges/:id/join → 400 se manca userId', async () => {
    const res = await request.post('/api/challenges/1/join').send({})
    expect(res.status).toBe(400)
  })

  it('POST /api/challenges/:id/join → 200 con userId valido', async () => {
    const res = await request.post('/api/challenges/1/join').send({ userId: 123 })
    // la nostra route restituisce { ok: true } quando va a buon fine
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('POST /api/challenges/:id/submit → 400 se body non valido', async () => {
    const res = await request.post('/api/challenges/1/submit').send({})
    expect(res.status).toBe(400)
  })

  it('POST /api/challenges/:id/submit → 200 con body valido', async () => {
    const res = await request
      .post('/api/challenges/1/submit')
      .send({ userId: 123, delta: 2 })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('newScore', 14)
  })
})
