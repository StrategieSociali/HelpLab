// utils/copyProposalTasks.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Copia i task dalla challenge_proposals.tasks (JSON)
 * alla tabella challenge_tasks quando una proposal viene approvata
 */
export async function copyProposalTasks(
  proposalId: string,
  challengeId: bigint
) {
  const proposal = await prisma.challenge_proposals.findUnique({
    where: { id: proposalId },
    select: { tasks: true }
  })

  if (!proposal || !Array.isArray(proposal.tasks)) {
    return
  }

  let order = 0

  for (const t of proposal.tasks as any[]) {
    await prisma.challenge_tasks.create({
      data: {
        challenge_id: challengeId,
        title: t.label ?? `Task ${order + 1}`,
        description: t.description ?? null,
        order_index: order++
      }
    })
  }
}
