/**
 * /src/services/leaderboardService.ts
 * ======================
 * Scopo: fornire funzioni per generare classifiche utenti (e in futuro giudici),
 * basate sui punteggi reali registrati come transazioni.
 *
 * Fonti dati:
 *   - points_transactions    → transazioni reali validate
 *   - challenges             → tipo challenge (climate/social)
 *   - challenge_proposals    → difficoltà e metadata
 *
 * Supporta:
 *   - Filtri per tipo challenge
 *   - Filtri per difficoltà
 *   - Filtri temporali (week/month)
 *   - Classifica globale o per singola challenge
 */
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'
import { setCache, getCache, clearCache, deleteCache } from '../utils/memoryCache.js'

// --------------------------------------------------------
// Cache invalidation (in-memory)
// --------------------------------------------------------
export async function invalidateLeaderboardCache(key: string) {
  deleteCache(key)
}

// Tipi di output restituiti
export type UserLeaderboardEntry = {
  user_id: bigint
  total_score: number
  verified_tasks: number
  last_event_at: Date | null
}

export type LeaderboardOptions = {
  limit?: number
  offset?: number
  challenge_id?: bigint
  type?: 'climate' | 'social'
  difficulty?: 'low' | 'medium' | 'high'
  window?: 'all' | 'this_week' | 'this_month'
}

/**
 * getUserLeaderboard
 * Ritorna classifica utenti basata su punti verificati.
 */
export async function getUserLeaderboard(
  options: LeaderboardOptions = {}
): Promise<UserLeaderboardEntry[]> {

  const limit = options.limit ?? 50
  const offset = options.offset ?? 0
  const window = options.window ?? 'all'
  const difficulty = options.difficulty
  const type = options.type
  const challenge_id = options.challenge_id

  // Calcolo finestra temporale
  let since: Date | null = null
  if (window === 'this_week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    since = d
  } else if (window === 'this_month') {
    const t = new Date()
    since = new Date(t.getFullYear(), t.getMonth(), 1)
  }

  // === QUERY SQL COMPLETA (sicura) ===
  const rows = await prisma.$queryRaw<UserLeaderboardEntry[]>`
    SELECT 
      pt.user_id,
      SUM(pt.delta) AS score,
      SUM(pt.event = 'task_completed_verified') AS verified_tasks,
      MAX(pt.created_at) AS last_event_at
    FROM points_transactions pt
    JOIN users u ON u.id = pt.user_id
    JOIN challenges c ON c.id = pt.challenge_id
    JOIN challenge_proposals cp ON cp.id = c.proposal_id
    WHERE pt.event = 'task_completed_verified'
      ${challenge_id ? Prisma.sql`AND pt.challenge_id = ${challenge_id}` : Prisma.empty}
      ${type ? Prisma.sql`AND c.type = ${type}` : Prisma.empty}
      ${difficulty ? Prisma.sql`AND cp.difficulty = ${difficulty}` : Prisma.empty}
      ${window !== 'all' && since ? Prisma.sql`AND pt.created_at >= ${since}` : Prisma.empty}
    GROUP BY pt.user_id
    ORDER BY score DESC, verified_tasks DESC, last_event_at ASC, pt.user_id ASC
    LIMIT ${limit} OFFSET ${offset};
  `

  return rows.map((row) => ({
    user_id: row.user_id,
    total_score: Number(row.total_score ?? 0),
    verified_tasks: Number(row.verified_tasks ?? 0),
    last_event_at: row.last_event_at ? new Date(row.last_event_at) : null
  }))
}

/**
 * generateLeaderboardCacheKey
 * Ritorna una chiave cache univoca per le classifiche basata sui filtri applicati
 */
export function generateLeaderboardCacheKey(
  prefix: string,
  {
    challenge_id,
    window = 'all',
    type,
    difficulty,
    limit = 50,
    offset = 0
  }: LeaderboardOptions
): string {
  const parts = [
    prefix,
    challenge_id ? `challenge:${challenge_id}` : 'global',
    `window:${window}`,
    type ? `type:${type}` : '',
    difficulty ? `diff:${difficulty}` : '',
    `limit:${limit}`,
    `offset:${offset}`
  ]
  return parts.filter(Boolean).join(':')
}
