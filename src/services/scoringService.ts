// src/services/scoringService.ts

export type ScoringConfigV1 = {
  version: string
  co2e_coef: number
  difficulty_multipliers: { low: number; medium: number; high: number }
  target_scaling: 'log10_1_plus'
  evidence_bonus: { judge: number; auto: number; user: number }
  min_tasks: number
  require_one_task_with_evidence: boolean
}

export const scoringConfigV1: ScoringConfigV1 = {
  version: '1.0',
  co2e_coef: 1.0,
  difficulty_multipliers: { low: 1.0, medium: 1.25, high: 1.5 },
  target_scaling: 'log10_1_plus',
  evidence_bonus: { judge: 0.1, auto: 0.05, user: 0 },
  min_tasks: 2,
  require_one_task_with_evidence: true
}

export type PreviewInput = {
  title?: string
  impact_type?: string
  target?: { kind?: string; unit?: string; amount?: number }
  tasks?: Array<{
    id?: string
    label?: string
    evidence_required?: boolean
    verification?: 'judge' | 'auto' | 'user'
  }>
  co2e_estimate_kg?: number
  difficulty?: 'low' | 'medium' | 'high'
}

/**
 * Calcolo stima punteggio per MVP:
 * - Base da CO2e oppure da Difficulty (mutua esclusione)
 * - Scaling su target: log10(1+amount)+1
 * - Bonus evidenze se tasks >= min e almeno 1 con evidence_required=true
 *   (bonus percentuale in base al tipo di verifica "più alta")
 */
export function previewScoreV1(input: PreviewInput, cfg = scoringConfigV1) {
  const breakdown: Array<{ label: string; value: number }> = []
  let total = 0

  // 1) Impatto o Difficoltà
  if (typeof input.co2e_estimate_kg === 'number' && input.co2e_estimate_kg > 0) {
    const v = Math.round(input.co2e_estimate_kg * cfg.co2e_coef)
    breakdown.push({ label: 'Impatto CO2e', value: v })
    total += v
  } else if (input.difficulty) {
    const mul = cfg.difficulty_multipliers[input.difficulty] ?? 1.0
    const v = Math.round(50 * mul) // base arbitraria per MVP
    breakdown.push({ label: 'Difficoltà', value: v })
    total += v
  }

  // 2) Target scaling: log10(1+amount)+1
  const amount = input.target?.amount ?? 0
  if (amount > 0) {
    const scale = Math.log10(1 + amount) + 1
    const v = Math.round(scale * 10)
    breakdown.push({ label: 'Target scaling', value: v })
    total += v
  } else {
    breakdown.push({ label: 'Target scaling', value: 0 })
  }

  // 3) Bonus evidenze
  const tasks = input.tasks ?? []
  const hasEvidence = tasks.some(t => t?.evidence_required)
  if (tasks.length >= cfg.min_tasks && (cfg.require_one_task_with_evidence ? hasEvidence : true)) {
    const verif =
      tasks.find(t => t.verification === 'judge') ? 'judge' :
      tasks.find(t => t.verification === 'auto')  ? 'auto'  :
      'user'
    const bonusRate = cfg.evidence_bonus[verif]
    const v = Math.round(total * bonusRate)
    breakdown.push({ label: 'Bonus evidenze', value: v })
    total += v
  }

  return {
    version: cfg.version,
    points_estimate_total: total,
    breakdown,
    notes: ['Il calcolo finale dipende dalla verifica del giudice']
  }
}
