import { prisma } from '../db/client.js'

type LP = {
  id: number; title: string; description: string|null; level: string|null;
  estimatedMinutes: number|null; tags: any[]|null; updatedAt: string|null;
  modules: { id: number; title: string; estMinutes: number|null; order: number }[];
}

export async function listLearningPaths(): Promise<LP[]> {
  const paths = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, title, description, level, estimated_minutes, tags_json, updated_at
    FROM learning_paths
    ORDER BY updated_at DESC, id ASC
  `)
  const modules = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, path_id, title, est_minutes, order_index
    FROM learning_modules
    ORDER BY path_id ASC, order_index ASC, id ASC
  `)

  const modByPath = new Map<number, any[]>()
  for (const m of modules) {
    const pid = Number(m.path_id)
    if (!modByPath.has(pid)) modByPath.set(pid, [])
    modByPath.get(pid)!.push({
      id: Number(m.id),
      title: m.title,
      estMinutes: m.est_minutes == null ? null : Number(m.est_minutes),
      order: Number(m.order_index ?? 0),
    })
  }

  return paths.map(p => ({
    id: Number(p.id),
    title: p.title,
    description: p.description,
    level: p.level,
    estimatedMinutes: p.estimated_minutes == null ? null : Number(p.estimated_minutes),
    tags: p.tags_json ?? null,
    updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
    modules: modByPath.get(Number(p.id)) ?? [],
  }))
}

export async function getUserProgress(userId: bigint) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT path_id, module_id FROM user_module_progress WHERE user_id = ? ORDER BY path_id, module_id`,
    userId
  )
  const out: Record<string, number[]> = {}
  for (const r of rows) {
    const pid = String(Number(r.path_id))
    if (!out[pid]) out[pid] = []
    out[pid].push(Number(r.module_id))
  }
  return out
}

export async function markModuleDone(pathId: bigint, moduleId: bigint, userId: bigint) {
  await prisma.$executeRawUnsafe(
    `INSERT IGNORE INTO user_module_progress (user_id, path_id, module_id, completed_at)
     VALUES (?, ?, ?, NOW())`,
    userId, pathId, moduleId
  )
}
