//src/services/proposalsService.ts
/**
 * Scopo: passare da proposta a challenge
 *
 * Attualmente supporta:
 *   Creazione di proposte di challenge
 *   Approvazione di una proposta → crea una nuova challenge
 */



import { prisma } from '../db/client.js'

// util: slug "pulito" e unico
function onlySlugChars(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/--+/g, '-')
}

async function ensureUniqueSlug(base: string) {
  let slug = base
  let n = 2
  // @ts-ignore
  while (await prisma.challenges.findFirst({ where: { slug } as any })) {
    slug = `${base}-${n++}`
  }
  return slug
}

// normalizza array di task: assicura id/verification/evidence_required coerenti
function normalizeTasks(tasks: any[] | undefined) {
  if (!Array.isArray(tasks)) return []
  let i = 1
  return tasks.map((t) => ({
    id: t?.id || `t${i++}`,
    label: String(t?.label ?? '').trim(),
    evidence_required: !!t?.evidence_required,
    verification: (t?.verification === 'judge' || t?.verification === 'auto' || t?.verification === 'user')
      ? t.verification
      : 'user',
  }))
}

export async function createProposal(userId: bigint, body: any) {
  const data = {
    user_id: userId as any,
    title: body.title,
    description: body.description,
    impact_type: body.impact_type ?? null,
    start_date: body.start_date ? new Date(body.start_date) : null,
    deadline: body.deadline ? new Date(body.deadline) : null,
    location_address: body.location?.address ?? null,
    location_geo: body.location?.geo ?? null,
    target: body.target ?? null,
    tasks: normalizeTasks(body.tasks),
    visibility_options: body.visibility_options ?? null,
    co2e_estimate_kg: body.co2e_estimate_kg ?? null,
    difficulty: body.difficulty ?? null,
    complexity_notes: body.complexity_notes ?? null,
    sponsor_interest: body.sponsor_interest ?? false,
    sponsor_pitch: body.sponsor_pitch ?? null,
    sponsor_budget_requested: body.sponsor_budget_requested ?? null,
    terms_consent: true,
    status: 'pending_review',
  } as any

  const created = await prisma.challenge_proposals.create({
    data,
    select: { id: true, status: true }
  })
  return created
}

export async function approveProposal(adminUserId: bigint, proposalId: string) {
  // carica proposal
  // @ts-ignore
  const p = await prisma.challenge_proposals.findUnique({ where: { id: proposalId } })
  if (!p) {
    const err: any = new Error('proposal not found')
    err.statusCode = 404
    throw err
  }

  const title = p.title ?? 'Untitled'
  const type = p.impact_type ?? 'generic'
  const location = p.location_address ?? null
  const rules = null
  const deadline = p.deadline ? new Date(p.deadline as any) : null
  const target_json = p.target as any
  const baseSlug = onlySlugChars(title) || 'challenge'
  const slug = await ensureUniqueSlug(baseSlug)

  const created = await prisma.$transaction(async (tx) => {
    // @ts-ignore
    const ch = await tx.challenges.create({
      data: {
        slug,
        title,
        type,
        location,
        rules,
        deadline,
        status: 'open',
        budget_amount: null,
        budget_currency: null,
        sponsor_id: null,
        judge_user_id: p.user_id as any,   // MVP: il creator è judge
        created_by: p.user_id as any,
        target_json,
      } as any,
      select: {
        id: true, slug: true, title: true, type: true, location: true, rules: true,
        deadline: true, status: true, budget_amount: true, budget_currency: true,
        sponsor_id: true, judge_user_id: true, target_json: true, updated_at: true
      }
    })

    // marca approved
    // @ts-ignore
    await tx.challenge_proposals.update({
      where: { id: proposalId },
      data: { status: 'approved', updated_at: new Date() as any }
    })

    return ch
  })

  // arricchimento judge name
  let judgeName: string | null = null
  if (created.judge_user_id) {
    // @ts-ignore
    const j = await prisma.users.findUnique({
      where: { id: created.judge_user_id as any },
      select: { username: true }
    })
    judgeName = j?.username ?? null
  }

  return {
    id: Number(created.id),
    slug: created.slug,
    title: created.title,
    type: created.type,
    location: created.location,
    rules: created.rules,
    deadline: created.deadline ? (created.deadline as Date).toISOString().slice(0, 10) : null,
    status: created.status,
    budget: {
      amount: created.budget_amount ? Number(created.budget_amount) : null,
      currency: created.budget_currency ?? null
    },
    sponsor: null,
    judge: judgeName ? { name: judgeName } : null,
    target: created.target_json ?? null,
    scoreboard: [],
    updatedAt: (created.updated_at as Date).toISOString()
  }
}
