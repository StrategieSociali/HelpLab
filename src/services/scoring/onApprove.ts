// src/services/scoring/onApprove.ts
import { prisma } from '../../db/client.js'

// 🔒 Hook onApprove — registra punti e aggiorna classifica
export async function onApprove({
  submission_id,
  challenge_id,
  user_id,
  reviewer_user_id,
  delta,
  event = 'task_completed_verified',
  version = '1.0',
  meta = {}
}: {
  submission_id: bigint | number
  challenge_id: bigint | number
  user_id: bigint | number
  reviewer_user_id?: bigint | number
  delta: number
  event?: string
  version?: string
  meta?: Record<string, any>
}) {
  // === STEP 1: Idempotenza ===
  const exists = await prisma.points_transactions.findFirst({
    where: { submission_id: BigInt(submission_id), event }
  })
  if (exists) {
    console.warn(`[onApprove] ⚠️ Transaction already exists for submission ${submission_id} (${event})`)
    return exists
  }

  const txId = `pt_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12)}_${Math.random().toString(36).slice(2, 6)}`
  const now = new Date()

  // === STEP 2: Registra transazione audit ===
  const tx = await prisma.points_transactions.create({
    data: {
      id: txId,
      user_id: BigInt(user_id),
      challenge_id: BigInt(challenge_id),
      submission_id: BigInt(submission_id),
      event,
      delta,
      version,
      created_at: now,
      // ✅ JSON.stringify per compatibilità con Prisma + MySQL JSON
      meta_json: JSON.stringify({
        ...meta,
        reviewer_user_id: reviewer_user_id ? String(reviewer_user_id) : null,
        source: 'auto_hook'
      })
    }
  })

  // === STEP 3: Aggiorna o crea record in challenge_scores ===
  await prisma.challenge_scores.upsert({
    where: {
      challenge_id_user_id: {
        challenge_id: BigInt(challenge_id),
        user_id: BigInt(user_id)
      }
    },
    update: {
      score: { increment: delta },
      verified_tasks_count: { increment: 1 },
      last_event_at: now
    },
    create: {
      challenge_id: BigInt(challenge_id),
      user_id: BigInt(user_id),
      score: delta,
      verified_tasks_count: 1,
      last_event_at: now
    }
  })

  console.log(`[onApprove] ✅ Points +${delta} assigned to user ${user_id} for challenge ${challenge_id}`)
  return tx
}
