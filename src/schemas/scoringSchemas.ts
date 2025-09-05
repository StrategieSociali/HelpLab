// src/schemas/scoringSchemas.ts
import { z } from 'zod'

export const previewBodySchema = z.object({
  proposalId: z.string().optional(),
  status: z.string().optional(),
  version: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  impact_type: z.string().optional(),
  target: z.object({
    kind: z.string().optional(),
    unit: z.string().optional(),
    amount: z.number().positive().optional()
  }).optional(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    label: z.string().optional(),
    evidence_required: z.boolean().optional(),
    verification: z.enum(['judge','auto','user']).optional()
  })).optional(),
  co2e_estimate_kg: z.number().positive().optional(),
  difficulty: z.enum(['low','medium','high']).optional()
}).refine(d => !(d.co2e_estimate_kg && d.difficulty), {
  message: 'co2e_estimate_kg e difficulty sono mutuamente esclusivi'
})

export const proposalBodySchema = z.object({
  title: z.string().min(5),
  description: z.string().min(50),
  impact_type: z.string().optional(),

  location: z.object({
    address: z.string().min(3),
    geo: z.any().optional()
  }).optional(),

  // YYYY-MM-DD (stringhe ISO corte)
  start_date: z.string().optional(),
  deadline: z.string().optional(),

  target: z.object({
    kind: z.string().optional(),
    unit: z.string().optional(),
    amount: z.number().positive()
  }),

  // 🔧 modifiche minime:
  // - id: opzionale
  // - label: OBBLIGATORIA (min 3) per evitare payload inconsistenti
  tasks: z.array(z.object({
    id: z.string().min(1).optional(),
    label: z.string().min(3),                 // ← reso required
    evidence_required: z.boolean().default(false),
    verification: z.enum(['judge','auto','user']).default('user')
  })).min(2),

  visibility_options: z.any().optional(),

  co2e_estimate_kg: z.number().positive().optional(),
  difficulty: z.enum(['low','medium','high']).optional(),

  complexity_notes: z.string().optional(),
  sponsor_interest: z.boolean().optional(),
  sponsor_pitch: z.string().optional(),
  sponsor_budget_requested: z.number().int().nonnegative().optional(),

  terms_consent: z.literal(true)
})
.refine(d => !(d.co2e_estimate_kg && d.difficulty), {
  message: 'co2e_estimate_kg e difficulty sono mutuamente esclusivi'
})
.refine(d => d.tasks.some(t => t.evidence_required === true), {
  message: 'Deve esserci almeno un task con evidence_required=true'
})
