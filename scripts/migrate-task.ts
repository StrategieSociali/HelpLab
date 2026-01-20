// scripts/migrate-tasks.ts
// Migra i tasks da challenge_proposals a challenge_tasks

import { prisma } from '../src/db/client'
import { copyProposalTasks } from '../src/utils/copyProposalTasks'

async function migrate() {
  const approvedChallenges = await prisma.challenges.findMany({
    where: {
      status: 'open',
      challenge_tasks: { none: {} }, // solo se non hanno già task
      proposal_uuid: { not: null }   // NB: il campo corretto è "proposal_uuid", NON "proposal_id"
    },
    select: {
      id: true,
      proposal_uuid: true
    }
  })

  for (const ch of approvedChallenges) {
    console.log(`🔄 Importing tasks for challenge ${ch.id} (proposal ${ch.proposal_uuid})...`)
    try {
      await copyProposalTasks(ch.proposal_uuid!, BigInt(ch.id))
      console.log(`✅ Challenge ${ch.id} OK`)
    } catch (e) {
      console.error(`❌ Errore in challenge ${ch.id}:`, e)
    }
  }

  console.log('✅ Migrazione completata.')
  process.exit(0)
}

migrate()