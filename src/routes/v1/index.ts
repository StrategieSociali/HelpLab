// src/routes/v1/index.ts
import { FastifyInstance } from 'fastify'
import { leaderboardV1Routes } from './leaderboard.js'
import { scoringV1Routes } from './scoring.js'
// importa anche submissions/challenges se già esistono
import { challengesV1Routes } from './challenges.js'
import { submissionsV1Routes } from './submissions.js'
import { proposalsV1Routes } from './proposals.js'
import { judgesV1Routes } from './judges.js'
import { adminJudgesV1Routes } from './adminJudges.js'
import { summaryV1Routes } from './summary.js'
import { tasksV1Routes } from './tasks.js'
import { judgeDashboardV1Routes } from './judgeDashboard.js'



export async function v1Routes(app: FastifyInstance) {
  await app.register(scoringV1Routes)
  await app.register(leaderboardV1Routes)
  await app.register(challengesV1Routes)
  await app.register(submissionsV1Routes)
  await app.register(proposalsV1Routes)
  await app.register(judgesV1Routes)
  await app.register(adminJudgesV1Routes)
  await app.register(summaryV1Routes)
  await app.register(tasksV1Routes)
  await app.register(judgeDashboardV1Routes)
}
