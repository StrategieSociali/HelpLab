// usa il client compilato in build/
import { prisma } from '../../build/db/client.js'

// slugify semplice
function slugify(s) {
  return (s || 'challenge')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  // 1) prendi tutte le proposals APPROVATE che non hanno ancora una challenge materializzata
  //    (richiede la colonna proposal_id in challenges; se non c'è, te lo dico sotto)
  const proposals = await prisma.challenge_proposals.findMany({
    where: { status: 'approved' },
    select: {
      id: true,
      title: true,
      description: true,
      impact_type: true,
      location_address: true,
      deadline: true,
      target: true,
      sponsor_budget_requested: true,
    }
  })

  let created = 0
  for (const p of proposals) {
    // salta se esiste già una challenge collegata a questa proposal
    const exists = await prisma.challenges.findFirst({
      where: { proposal_id: p.id } // <-- richiede challenges.proposal_id
    })
    if (exists) continue

    await prisma.$transaction(async (tx) => {
      const base = slugify(p.title || 'challenge')
      const suffix = Math.random().toString(36).slice(2, 8)
      const slug = `${base}-${suffix}`

      await tx.challenges.create({
        data: {
          proposal_id: p.id,                        // <— chiave di collegamento
          slug,
          title: p.title,
          type: p.impact_type || 'generic',
          location: p.location_address || null,
          rules: p.description || '',
          deadline: p.deadline,
          status: 'open',
          budget_amount: p.sponsor_budget_requested ?? null,
          budget_currency: p.sponsor_budget_requested ? 'EUR' : null,
          target_json: p.target,
          judge_user_id: null,                     // <-- così appare in /unassigned
          created_at: new Date(),
          updated_at: new Date(),
        }
      })
      created++
    })
    console.log(`✔ materialized -> ${p.id}`)
  }

  console.log(`DONE. Create: ${created}`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
