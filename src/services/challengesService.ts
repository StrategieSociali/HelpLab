import { prisma } from '../db/client.js'

// helper: BigInt/Decimal/Date → JSON-safe
const toNum = (v: any) => (v == null ? null : Number(v))
const toIso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const toYMD = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : null

export async function listChallenges() {
  const rows = await prisma.challenges.findMany({
    include: {
      sponsors: true,          // sponsor (via sponsor_id)
      users: true,             // judge user (via judge_user_id)
      challenge_scores: {
        include: { users: true },
        orderBy: { score: 'desc' },
        take: 10,
      },
    },
    orderBy: { updated_at: 'desc' },
  })

  return rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    title: r.title,
    type: r.type,
    location: r.location ?? '',
    rules: r.rules ?? '',
    deadline: toYMD(r.deadline), // "YYYY-MM-DD"
    status: r.status,            // enum challenges_status -> string
    budget: {
      amount: r.budget_amount != null ? Number(r.budget_amount) : 0,
      currency: r.budget_currency ?? 'EUR',
    },
    sponsor: r.sponsors ? { name: r.sponsors.name } : null,
    judge: r.users ? { name: r.users.username } : null,
    target: r.target_json as any, // passthrough JSON
    scoreboard: (r.challenge_scores || []).map((s) => ({
      user: s.users.username,
      score: Number(s.score),
    })),
    updatedAt: toIso(r.updated_at),
  }))
}

export async function getLeaderboard(challengeId: bigint) {
  const rows = await prisma.challenge_scores.findMany({
    where: { challenge_id: challengeId },
    include: { users: true },
    orderBy: [{ score: 'desc' }, { users: { username: 'asc' } }],
    take: 50,
  })
  return rows.map((r) => ({ user: r.users.username, score: Number(r.score) }))
}

export async function joinChallenge(challengeId: bigint, userId: bigint) {
  // 404 se la challenge non esiste
  const exists = await prisma.challenges.findFirst({ where: { id: challengeId } })
  if (!exists) {
    const e = new Error('Challenge not found') as any
    e.statusCode = 404
    throw e
  }

  // challenge_participants: idempotente su (challenge_id, user_id)
  await prisma.challenge_participants.upsert({
    where: { challenge_id_user_id: { challenge_id: challengeId, user_id: userId } },
    update: {},
    create: { challenge_id: challengeId, user_id: userId },
  })

  // challenge_scores: garantisci riga con score 0 se non esiste
  await prisma.challenge_scores.upsert({
    where: { challenge_id_user_id: { challenge_id: challengeId, user_id: userId } },
    update: {},
    create: { challenge_id: challengeId, user_id: userId, score: 0 },
  })
}

export async function submitDelta(
  challengeId: bigint,
  userId: bigint,
  delta: number,
  payload?: any
) {
  const ch = await prisma.challenges.findFirst({ where: { id: challengeId } })
  if (!ch) {
    const e = new Error('Challenge not found') as any
    e.statusCode = 404
    throw e
  }

  await prisma.$transaction(async (tx) => {
    await tx.challenge_submissions.create({
      data: {
        challenge_id: challengeId,
        user_id: userId,
        payload_json: payload ?? undefined,
        status: 'pending',      // enum challenge_submissions_status
        points_awarded: null,
      },
    })

    await tx.challenge_scores.upsert({
      where: { challenge_id_user_id: { challenge_id: challengeId, user_id: userId } },
      update: { score: { increment: delta } },
      create: { challenge_id: challengeId, user_id: userId, score: delta },
    })
  })

  const cur = await prisma.challenge_scores.findUnique({
    where: { challenge_id_user_id: { challenge_id: challengeId, user_id: userId } },
    select: { score: true },
  })
  return Number(cur?.score ?? 0)
}
