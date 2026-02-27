// src/schemas/learningSchemas.ts
/**
 * Schema Zod per validazione input Learning Path Catalog (v1.1)
 * Usato da POST e PUT in learningPaths.ts
 */
import { z } from 'zod'

export const LearningCategoryEnum = z.enum([
  'ONBOARDING',
  'PLATFORM_USAGE',
  'DATA_LITERACY',
  'SUSTAINABILITY',
  'GAME_THEORY',
  'TECHNICAL',
])

export const LearningTargetRoleEnum = z.enum([
  'ALL',
  'VOLUNTEER',
  'JUDGE',
  'SPONSOR',
  'PA',
])

export const LearningTypeEnum = z.enum(['FREE', 'PREMIUM'])

export const LearningProviderEnum = z.enum([
  'YOUTUBE',
  'LIFTERLMS',
  'EXTERNAL',
])

// Schema per creazione — tutti i campi obbligatori salvo quelli opzionali
export const createLearningPathSchema = z.object({
  title: z.string().min(5, 'Il titolo deve avere almeno 5 caratteri').max(200),
  description: z.string().min(20, 'La descrizione deve avere almeno 20 caratteri'),
  category: LearningCategoryEnum,
  target_role: LearningTargetRoleEnum.default('ALL'),
  type: LearningTypeEnum.default('FREE'),
  provider: LearningProviderEnum,
  external_url: z.string().url('URL non valido').max(500),
  thumbnail_url: z.string().url('URL thumbnail non valido').max(500).optional().nullable(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(false),
})

// Schema per aggiornamento — tutti i campi sono opzionali (partial)
// ma almeno uno deve essere presente (verificato nella route)
export const updateLearningPathSchema = createLearningPathSchema.partial()

export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>
export type UpdateLearningPathInput = z.infer<typeof updateLearningPathSchema>
