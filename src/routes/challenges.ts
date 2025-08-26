import { FastifyInstance } from 'fastify'

export async function challengesRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return [
      {
        id: 1,
        title: "Pulizia Parco Comunale",
        type: "community",
        location: "Roma",
        rules: "Raccogli rifiuti e segnala l'area pulita",
        deadline: "2025-09-30",
        status: "open",
        budget: { amount: 100, currency: "EUR" },
        sponsor: { name: "Comune di Roma" },
        judge: { name: "Giuria Popolare" },
        target: { type: "quantity", goal: 50 },
        scoreboard: [{ user: "Mario", score: 12 }]
      }
    ]
  })
}

