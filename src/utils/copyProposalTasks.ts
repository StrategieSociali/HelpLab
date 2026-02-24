// src/utils/copyProposalTasks.ts
/**
 * Scopo: copiare i task dal campo JSON di una proposal alla tabella challenge_tasks
 *
 * Viene chiamato durante l'approvazione di una proposal.
 * Accetta un client Prisma opzionale per funzionare dentro una transazione:
 * se fornito, tutte le operazioni partecipano alla stessa transazione
 * dell'approvazione, garantendo atomicità (tutto o niente).
 *
 * Campi copiati dalla proposal:
 * - title       (da t.label)
 * - description
 * - order_index (posizione nell'array)
 * - max_points
 * - co2_quota
 * - payload_schema  ← aggiunto: schema di validazione per le submission
 */
import { prisma } from '../db/client.js'

export async function copyProposalTasks(
  proposalId: string,
  challengeId: bigint,
  txClient?: typeof prisma
) {
  const db = txClient || prisma

  const proposal = await db.challenge_proposals.findUnique({
    where:  { id: proposalId },
    select: { tasks: true }
  })

  if (!proposal || !Array.isArray(proposal.tasks)) {
    return
  }

  const tasks = proposal.tasks as any[]

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]

    await db.challenge_tasks.create({
      data: {
        challenge_id:   challengeId as any,
        title:          t.label          ?? `Task ${i + 1}`,
        description:    t.description    ?? null,
        order_index:    i,
        max_points:     t.max_points     ?? null,
        co2_quota:      t.co2_quota      ?? null,
        payload_schema: t.payload_schema ?? null   // ← fix: era omesso
      } as any
    })
  }
}