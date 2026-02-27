// src/services/learningCatalogService.ts
/**
 * Service per il catalogo Learning Path (v1.1)
 *
 * HelpLab non è un LMS. Questo service gestisce solo il catalogo curato
 * di corsi esterni. Non c'è tracciamento completamento utenti (futuro).
 *
 * Pattern: funzioni pure che accedono al DB e restituiscono oggetti
 * serializzati (BigInt → Number). La route non tocca mai Prisma direttamente.
 */
import { prisma } from '../db/client.js'
import type { CreateLearningPathInput, UpdateLearningPathInput } from '../schemas/learningSchemas.js'

// Helper
const toIso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

/**
 * Serializza un record learning_path_catalog nel formato JSON per il frontend.
 */
function serialize(p: any) {
  return {
    id: Number(p.id),
    title: p.title,
    description: p.description,
    category: p.category,
    targetRole: p.target_role,
    type: p.type,
    provider: p.provider,
    externalUrl: p.external_url,
    thumbnailUrl: p.thumbnail_url ?? null,
    durationMinutes: p.duration_minutes ?? null,
    sortOrder: p.sort_order,
    isPublished: p.is_published,
    createdAt: toIso(p.created_at),
    updatedAt: toIso(p.updated_at),
  }
}

// ----------------------------------------------------------------
// Filtri per GET /learning-paths
// ----------------------------------------------------------------
export interface ListFilters {
  category?: string
  targetRole?: string
  type?: string
}

/**
 * Lista tutti i learning path pubblicati, con filtri opzionali.
 * Ordinamento: sort_order ASC, poi created_at DESC.
 */
export async function listPublishedPaths(filters: ListFilters) {
  const where: any = { is_published: true }

  if (filters.category) where.category = filters.category
  if (filters.targetRole) where.target_role = filters.targetRole
  if (filters.type) where.type = filters.type

  const rows = await prisma.learning_path_catalog.findMany({
    where,
    orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
  })

  return rows.map(serialize)
}

/**
 * Singolo learning path per ID (solo se pubblicato).
 * Ritorna null se non esiste o non è pubblicato.
 */
export async function getPublishedPathById(id: bigint) {
  const row = await prisma.learning_path_catalog.findFirst({
    where: { id: id as any, is_published: true },
  })
  return row ? serialize(row) : null
}

/**
 * Crea un nuovo learning path (admin only).
 */
export async function createPath(data: CreateLearningPathInput) {
  const row = await prisma.learning_path_catalog.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      target_role: data.target_role ?? 'ALL',
      type: data.type ?? 'FREE',
      provider: data.provider,
      external_url: data.external_url,
      thumbnail_url: data.thumbnail_url ?? null,
      duration_minutes: data.duration_minutes ?? null,
      sort_order: data.sort_order ?? 0,
      is_published: data.is_published ?? false,
    } as any,
  })
  return serialize(row)
}

/**
 * Aggiorna un learning path esistente (admin only).
 * Ritorna null se il record non esiste.
 */
export async function updatePath(id: bigint, data: UpdateLearningPathInput) {
  // Verifica esistenza
  const existing = await prisma.learning_path_catalog.findFirst({
    where: { id: id as any },
    select: { id: true },
  })
  if (!existing) return null

  const row = await prisma.learning_path_catalog.update({
    where: { id: id as any },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.target_role !== undefined && { target_role: data.target_role }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.external_url !== undefined && { external_url: data.external_url }),
      ...(data.thumbnail_url !== undefined && { thumbnail_url: data.thumbnail_url }),
      ...(data.duration_minutes !== undefined && { duration_minutes: data.duration_minutes }),
      ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
      ...(data.is_published !== undefined && { is_published: data.is_published }),
    } as any,
  })
  return serialize(row)
}

/**
 * Soft delete: imposta is_published = false.
 * Non elimina il record dal DB.
 * Ritorna null se il record non esiste.
 */
export async function softDeletePath(id: bigint) {
  const existing = await prisma.learning_path_catalog.findFirst({
    where: { id: id as any },
    select: { id: true },
  })
  if (!existing) return null

  await prisma.learning_path_catalog.update({
    where: { id: id as any },
    data: { is_published: false } as any,
  })
  return { ok: true }
}
