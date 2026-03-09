// scripts/seed-learning-catalog.ts
/**
 * Seed idempotente: 6 corsi di esempio per il catalogo Learning Path (v1.1)
 *
 * Eseguire con:
 *   npx tsx scripts/seed-learning-catalog.ts
 *
 * Idempotente: se un corso con lo stesso titolo esiste già, viene saltato.
 * Rieseguire il seed non crea duplicati.
 *
 * Prerequisiti:
 *   - Migrazione Prisma già eseguita (npx prisma migrate deploy)
 *   - File .env con DATABASE_URL configurato
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Avvio seed Learning Path Catalog...')

  const courses = [
    {
      title: 'Come registrarsi e creare il profilo',
      description: 'Guida completa per creare il tuo account su HelpLab, configurare il profilo e iniziare a partecipare alla community. Imparerai a navigare la piattaforma e a capire le funzionalità principali.',
      category: 'ONBOARDING',
      target_role: 'ALL',
      type: 'FREE',
      provider: 'YOUTUBE',
      external_url: 'https://youtube.com/watch?v=PLACEHOLDER_REGISTRAZIONE',
      thumbnail_url: null,
      duration_minutes: 8,
      sort_order: 1,
      is_published: true,
    },
    {
      title: 'Come partecipare a una sfida',
      description: 'Scopri come trovare le sfide attive nella tua zona, come iscriverti, caricare le prove della tua partecipazione e seguire il processo di validazione da parte del giudice.',
      category: 'PLATFORM_USAGE',
      target_role: 'VOLUNTEER',
      type: 'FREE',
      provider: 'YOUTUBE',
      external_url: 'https://youtube.com/watch?v=PLACEHOLDER_SFIDE',
      thumbnail_url: null,
      duration_minutes: 12,
      sort_order: 2,
      is_published: true,
    },
    {
      title: 'Come leggere la dashboard di impatto',
      description: 'Impara a interpretare i dati di impatto ambientale e sociale della piattaforma: CO₂ risparmiata, km percorsi, partecipanti e le metriche aggregate degli eventi. Capire i numeri per motivare la comunità.',
      category: 'DATA_LITERACY',
      target_role: 'ALL',
      type: 'FREE',
      provider: 'YOUTUBE',
      external_url: 'https://youtube.com/watch?v=PLACEHOLDER_DASHBOARD',
      thumbnail_url: null,
      duration_minutes: 15,
      sort_order: 3,
      is_published: true,
    },
    {
      title: 'Guida per i giudici: verificare una sfida',
      description: 'Tutto ciò che un giudice deve sapere: come accedere alla coda di revisione, valutare le prove fotografiche, approvare o rifiutare una submission con motivazione, e gestire le contestazioni dei volontari.',
      category: 'PLATFORM_USAGE',
      target_role: 'JUDGE',
      type: 'FREE',
      provider: 'YOUTUBE',
      external_url: 'https://youtube.com/watch?v=PLACEHOLDER_GIUDICI',
      thumbnail_url: null,
      duration_minutes: 20,
      sort_order: 4,
      is_published: true,
    },
    {
      title: 'Organizzare un evento sostenibile',
      description: 'Corso pratico per sponsor e organizzatori: come strutturare un evento civico su HelpLab, collegare le challenge, coinvolgere i partecipanti e produrre il report di impatto per la rendicontazione ESG.',
      category: 'PLATFORM_USAGE',
      target_role: 'SPONSOR',
      type: 'FREE',
      provider: 'LIFTERLMS',
      external_url: 'https://helplab.space/corsi/PLACEHOLDER_EVENTO_SOSTENIBILE',
      thumbnail_url: null,
      duration_minutes: 35,
      sort_order: 5,
      is_published: true,
    },
    {
      title: 'Introduzione alla teoria dei giochi applicata',
      description: "Corso premium per capire i principi della teoria dei giochi non cooperativi applicati alla gamification civica. Ideale per chi vuole comprendere come HelpLab progetta le sfide per massimizzare la partecipazione e l'impatto sociale.",
      category: 'GAME_THEORY',
      target_role: 'ALL',
      type: 'PREMIUM',
      provider: 'LIFTERLMS',
      external_url: 'https://helplab.space/corsi/PLACEHOLDER_TEORIA_GIOCHI',
      thumbnail_url: null,
      duration_minutes: 90,
      sort_order: 6,
      is_published: true,
    },
  ]

  let created = 0
  let skipped = 0

  for (const course of courses) {
    const existing = await (prisma.learning_path_catalog as any).findFirst({
      where: { title: course.title },
      select: { id: true },
    })

    if (existing) {
      console.log(`  ⏭️  Saltato (già presente): "${course.title}"`)
      skipped++
      continue
    }

    await (prisma.learning_path_catalog as any).create({ data: course })
    console.log(`  ✅ Creato: "${course.title}"`)
    created++
  }

  console.log(`\n🎉 Seed completato: ${created} creati, ${skipped} saltati.`)
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
