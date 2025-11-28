// scripts/migrate-tasks.js
import { prisma } from '../src/db/client.js'

console.log('⏳ Inizio migrazione tasks...')

const challenges = await prisma.challenges.findMany({
  where: {
    NOT: { proposal_uuid: null }
  },
  select: {
    id: true,
    proposal_uuid: true
  }
})

let totalInserted = 0

for (const ch of challenges) {
  const proposal = await prisma.challenge_proposals.findUnique({
    where: { id: ch.proposal_uuid },
    select: { tasks: true }
  })

  if (!proposal || !Array.isArray(proposal.tasks)) continue

  for (const [index, t] of proposal.tasks.entries()) {
    await prisma.challenge_tasks.create({
      data: {
        challenge_id: ch.id,
        title: t.label || t.title || 'Untitled Task',
        description: '',
        order_index: index
      }
    })
    totalInserted++
  }
}

console.log(`✅ Migrazione completata: ${totalInserted} task inseriti.`)
process.exit(0)
