// src/services/challengesService.ts
import { prisma } from '../db/client.js'
import { makeSlug } from '../utils/slug.js'

// helpers per serializzare valori in JSON
const toIso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const toYMD = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null)

// ============ READ ============

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
    deadline: toYMD(r.deadline),
    status: r.status,
    budget: {
      amount: r.budget_amount != null ? Number(r.budget_amount) : 0,
      currency: r.budget_currency ?? 'EUR',
    },
    sponsor: r.sponsors ? { name: r.sponsors.name } : null,
    judge: r.users ? { name: r.users.username } : null,
    target: r.target_json as any,
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

// ============ WRITE (demo) ============

export async function joinChallenge(challengeId: bigint, userId: bigint) {
  const exists = await prisma.challenges.findFirst({ where: { id: challengeId } })
  if (!exists) {
    const e = new Error('Challenge not found') as any
    e.statusCode = 404
    throw e
  }

  // idempotente su (challenge_id, user_id)
  await prisma.challenge_participants.upsert({
    where: { challenge_id_user_id: { challenge_id: challengeId, user_id: userId } },
    update: {},
    create: { challenge_id: challengeId, user_id: userId },
  })

  // garantisci riga in scores
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
        status: 'pending',
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

// ============ CREATE (protetta) ============

export async function createChallenge(
  title: string,
  type: string,
  location: string | undefined,
  rules: string | undefined,
  deadline: string | undefined, // "YYYY-MM-DD"
  budget: { amount?: number; currency?: string } | undefined,
  sponsorName: string | undefined,
  target: any,
  creatorId: bigint
) {
  // Sponsor: trova o crea (senza richiedere UNIQUE sul nome)
  let sponsorId: bigint | null = null
  if (sponsorName && sponsorName.trim()) {
    const existing = await prisma.sponsors.findFirst({
      where: { name: sponsorName } as any,
    })
    if (existing) {
      sponsorId = existing.id as any
    } else {
      const created = await prisma.sponsors.create({
        data: { name: sponsorName } as any,
      })
      sponsorId = created.id as any
    }
  }

  const slug = makeSlug(title)

  const created = await prisma.challenges.create({
    data: {
      slug,
      title,
      type,
      location: location ?? '',
      rules: rules ?? '',
      deadline: deadline ? new Date(deadline) : null,
      status: 'open',
      budget_amount: budget?.amount ?? 0,
      budget_currency: budget?.currency ?? 'EUR',
      sponsor_id: sponsorId as any,
      judge_user_id: creatorId as any,   // MVP: il creatore fa da judge
      created_by: creatorId as any,      // richiede colonna in tabella
      target_json: target ?? undefined,
    } as any,
    include: {
      sponsors: true,
      users: true,
      challenge_scores: {
        include: { users: true },
        orderBy: { score: 'desc' },
        take: 10,
      },
    },
  })

  return {
    id: Number(created.id),
    slug: created.slug,
    title: created.title,
    type: created.type,
    location: created.location ?? '',
    rules: created.rules ?? '',
    deadline: toYMD(created.deadline),
    status: created.status,
    budget: {
      amount: Number(created.budget_amount ?? 0),
      currency: created.budget_currency ?? 'EUR',
    },
    sponsor: created.sponsors ? { name: created.sponsors.name } : null,
    judge: created.users ? { name: created.users.username } : null,
    target: created.target_json,
    scoreboard: [],
    updatedAt: toIso(created.updated_at),
  }
}
