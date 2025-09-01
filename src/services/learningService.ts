// src/services/learningService.ts
import { prisma } from '../db/client.js'

// Helpers
const toIso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

/**
 * Ritorna tutti i learning paths con i moduli,
 * mappati nello shape che si aspetta il frontend.
 */
export async function listLearningPaths() {
  const rows = await prisma.learning_paths.findMany({
    include: {
      learning_modules: {
        orderBy: { order_index: 'asc' },
      },
    },
    orderBy: { updated_at: 'desc' },
  })

  return rows.map((p) => ({
    id: Number(p.id),
    title: p.title,
    description: p.description ?? '',
    level: p.level ?? 'beginner',
    estimatedMinutes: p.estimated_minutes != null ? Number(p.estimated_minutes) : 0,
    tags: (p.tags_json as unknown as string[]) ?? [],
    modules: (p.learning_modules || []).map((m) => ({
      id: Number(m.id),
      title: m.title,
      estMinutes: m.est_minutes != null ? Number(m.est_minutes) : 0,
      order: m.order_index != null ? Number(m.order_index) : 0,
    })),
    updatedAt: toIso(p.updated_at),
  }))
}

/**
 * Ritorna i progressi per userId sotto forma di mappa:
 * { "<pathId>": [<moduleId>, ...], ... }
 * Se non ci sono record: {} (oggetto vuoto).
 */
export async function getUserProgress(userId: bigint) {
  // Leggiamo i progressi dell'utente e, tramite la relazione, il path_id del modulo
  const rows = await prisma.user_module_progress.findMany({
    where: { user_id: userId as any },
    select: {
      module_id: true,
      learning_modules: { select: { path_id: true } }, // <-- path_id arriva da qui
    },
    orderBy: [{ module_id: 'asc' }],
  })

  const out: Record<string, number[]> = {}
  for (const r of rows as Array<{ module_id: bigint; learning_modules: { path_id: bigint } | null }>) {
    const pidNum = r.learning_modules?.path_id ? Number(r.learning_modules.path_id) : null
    if (!pidNum) continue // se per qualche motivo manca, salta
    const pid = String(pidNum)
    if (!out[pid]) out[pid] = []
    out[pid].push(Number(r.module_id))
  }

  return out // {} se nessun record
}

/**
 * Marca un modulo come completato per l'utente (idempotente).
 * - Verifica che path e modulo esistano e che il modulo appartenga al path.
 * - Inserisce il record solo se non già presente.
 */
export async function markModuleDone(
  pathId: bigint,
  moduleId: bigint,
  userId: bigint
) {
  // 1) Verifica che il path esista
  const path = await prisma.learning_paths.findFirst({
    where: { id: pathId as any },
    select: { id: true },
  })
  if (!path) {
    const e = new Error('path not found') as any
    e.statusCode = 404
    throw e
  }

  // 2) Verifica modulo e appartenenza al path
  const mod = await prisma.learning_modules.findFirst({
    where: { id: moduleId as any },
    select: { id: true, path_id: true },
  })
  if (!mod || String(mod.path_id) !== String(pathId)) {
    const e = new Error('module not found in path') as any
    e.statusCode = 404
    throw e
  }

  // 3) Idempotenza: se esiste già, non fare nulla
  const exists = await prisma.user_module_progress.findFirst({
    where: {
      user_id: userId as any,
      module_id: moduleId as any,
    },
    select: { user_id: true },
  })

  if (!exists) {
    await prisma.user_module_progress.create({
      data: {
        user_id: userId as any,
        path_id: pathId as any,
        module_id: moduleId as any,
      } as any,
    })
  }
}
