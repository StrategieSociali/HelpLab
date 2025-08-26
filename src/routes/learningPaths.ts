import { FastifyInstance } from 'fastify'

export async function learningPathsRoutes(app: FastifyInstance) {
  // GET /api/learning-paths
  app.get('/', async () => {
    return [
      {
        id: 1,
        title: "Riduci rifiuti domestici",
        description: "Percorso base per ridurre i rifiuti in casa",
        level: "beginner",
        estimatedMinutes: 120,
        tags: ["ambiente", "casa", "riciclo"],
        updatedAt: "2025-08-01T10:00:00.000Z",
        modules: [
          { id: 101, title: "Introduzione al riciclo", estMinutes: 20, order: 1 },
          { id: 102, title: "Compostaggio base", estMinutes: 40, order: 2 },
          { id: 103, title: "Acquisti zero-waste", estMinutes: 60, order: 3 }
        ]
      },
      {
        id: 2,
        title: "Mobilità sostenibile in città",
        description: "Muoversi meglio, spendere meno, inquinare meno",
        level: "intermediate",
        estimatedMinutes: 90,
        tags: ["mobilità", "salute"],
        updatedAt: "2025-07-15T09:30:00.000Z",
        modules: [
          { id: 201, title: "Bike-to-work", estMinutes: 30, order: 1 },
          { id: 202, title: "Trasporti pubblici smart", estMinutes: 30, order: 2 },
          { id: 203, title: "Car pooling", estMinutes: 30, order: 3 }
        ]
      }
    ]
  })

  // GET /api/learning-paths/progress  (mock utente demo)
  app.get('/progress', async () => {
    // shape: { [pathId]: [moduleId, ...] }
    return {
      1: [101, 102], // sul percorso 1 ha completato i moduli 101 e 102
      2: [201]       // sul percorso 2 ha completato il modulo 201
    }
  })

  // POST /api/learning-paths/:id/progress { moduleId } (demo: 200 OK)
  app.post<{
    Params: { id: string }
    Body: { moduleId: number }
  }>('/:id/progress', async (req, reply) => {
    const { id } = req.params
    const { moduleId } = req.body || {}
    if (!moduleId || typeof moduleId !== 'number') {
      return reply.code(400).send({ error: 'moduleId mancante o non valido' })
    }
    // Demo: niente DB per ora, solo OK
    return reply.send({ ok: true, pathId: Number(id), moduleId })
  })
}

