// src/routes/v1/_challengeMapper.ts
export type RawChallengeRow = {
  id: bigint
  slug: string
  title: string
  type: string | null
  location: string | null
  rules: string | null
  deadline: Date | null
  status: string
  budget_amount: any | null
  budget_currency: string | null
  sponsor_id: bigint | null
  judge_user_id: bigint | null
  target_json: any | null
  updated_at: Date
  sponsor_name?: string | null
  judge_name?: string | null
}

export function mapChallengeRow(r: RawChallengeRow) {
  return {
    id: Number(r.id),
    slug: r.slug,
    title: r.title,
    type: r.type ?? 'generic',
    location: r.location ?? null,
    rules: r.rules ?? '',
    deadline: r.deadline ? r.deadline.toISOString().slice(0,10) : null,
    status: r.status,
    budget: r.budget_amount != null
      ? { amount: Number(r.budget_amount), currency: r.budget_currency ?? 'EUR' }
      : null,
    sponsor: r.sponsor_name ? { name: r.sponsor_name } : null,
    judge: r.judge_name ? { name: r.judge_name } : null,
    target: r.target_json ?? null,
    updatedAt: r.updated_at.toISOString(),
  }
}
