// src/routes/v1/index.ts
/**
 * Scopo: registra tutte le route v1 sotto il prefisso /api/v1
 *
 * Questo file è il router aggregato chiamato da server.ts.
 * Ogni modulo di route viene registrato qui.
 */
import { FastifyInstance } from 'fastify'
import { leaderboardV1Routes }    from './leaderboard.js'
import { scoringV1Routes }        from './scoring.js'
import { challengesV1Routes }     from './challenges.js'
import { submissionsV1Routes }    from './submissions.js'
import { proposalsV1Routes }      from './proposals.js'
import { judgesV1Routes }         from './judges.js'
import { adminJudgesV1Routes }    from './adminJudges.js'
import { summaryV1Routes }        from './summary.js'
import { tasksV1Routes }          from './tasks.js'
import { judgeDashboardV1Routes } from './judgeDashboard.js'
import { authV1Routes }           from './auth.js'
import { sponsorRoutes }          from './sponsor.js'
import { sponsorRatingsRoutes }   from './sponsorRatings.js'
import { learningPathsV1Routes }  from './learningPaths.js'
import { co2FactorsV1Routes }     from './co2Factors.js'
import eventsRoutes from './events.js'

export async function v1Routes(app: FastifyInstance) {
  await app.register(scoringV1Routes)
  await app.register(leaderboardV1Routes)
  await app.register(challengesV1Routes)
  await app.register(sponsorRoutes)
  await app.register(submissionsV1Routes)
  await app.register(proposalsV1Routes)
  await app.register(judgesV1Routes)
  await app.register(adminJudgesV1Routes)
  await app.register(summaryV1Routes)
  await app.register(tasksV1Routes)
  await app.register(judgeDashboardV1Routes)
  await app.register(sponsorRatingsRoutes)
  await app.register(authV1Routes, { prefix: '/auth' })
  await app.register(learningPathsV1Routes)
  await app.register(co2FactorsV1Routes)
  await app.register(eventsRoutes)
  
}