// src/services/scoring/onApprove.ts
/**
 * Hook post-approvazione submission
 *
 * Eseguito dal route submissions.ts dopo che il giudice approva una submission.
 *
 * Responsabilità:
 * 1. Controllo idempotenza — evita doppie registrazioni su stessa submission + evento
 * 2. Calcolo CO2 salvata — se il payload contiene km_percorsi e vehicle_id,
 *    legge il coefficiente dal file co2-factors.v1.json e calcola co2_saved_kg.
 *    Il valore NUMERICO del coefficiente viene salvato nel meta_json insieme
 *    alla fonte e alla versione del file — fondamentale per l'auditabilità ESG:
 *    se il JSON viene aggiornato in futuro, i calcoli passati restano coerenti.
 * 3. Registra transazione audit in points_transactions (con meta CO2 incluso)
 * 4. Aggiorna (o crea) challenge_scores per la classifica
 *
 * Protezione know-how:
 * I coefficienti numerici non escono mai verso il frontend.
 * Questo hook gira interamente server-side e salva solo il risultato finale
 * (co2_saved_kg) nel meta_json, insieme al snapshot del fattore usato.
 */
import { prisma } from '../../db/client.js'
import { readFileSync } from 'fs'
import { join } from 'path'

// ================================
// Caricamento fattori CO2 (una volta sola all'avvio del modulo)
// ================================
interface Co2Factor {
  id:          string
  label:       string
  co2_g_per_km: number
  reference:   string
}

interface Co2FactorsFile {
  metadata: {
    version:   string
    last_sync: string
    sources:   Record<string, string>
  }
  mobility: Co2Factor[]
}

const factorsPath = join(process.cwd(), 'config/co2-factors.v1.json')
const co2FactorsFile: Co2FactorsFile = JSON.parse(readFileSync(factorsPath, 'utf-8'))

// Indice per lookup O(1) per vehicle_id
const mobilityIndex = new Map<string, Co2Factor>(
  co2FactorsFile.mobility.map(f => [f.id, f])
)

// ================================
// Calcolo CO2 salvata
// Restituisce null se il payload non contiene i campi necessari
// ================================
function computeCo2Saved(payload: Record<string, unknown>): {
  co2_saved_kg:        number
  km_percorsi:         number
  vehicle_id:          string
  co2_g_per_km_used:   number  // snapshot del coefficiente al momento del calcolo
  factor_reference:    string  // fonte ufficiale (ISPRA, Mimit, ecc.)
  factors_version:     string  // versione del file JSON usato
  factors_last_sync:   string  // data ultimo aggiornamento del file
} | null {
  const km        = Number(payload['km_percorsi'])
  const vehicleId = String(payload['vehicle_id'] ?? '')

  if (!km || km <= 0 || !vehicleId) return null

  const factor = mobilityIndex.get(vehicleId)
  if (!factor) return null

  const co2_saved_kg = parseFloat(((km * factor.co2_g_per_km) / 1000).toFixed(4))

  return {
    co2_saved_kg,
    km_percorsi:       km,
    vehicle_id:        vehicleId,
    co2_g_per_km_used: factor.co2_g_per_km,   // valore numerico snapshot — non cambia mai
    factor_reference:  factor.reference,
    factors_version:   co2FactorsFile.metadata.version,
    factors_last_sync: co2FactorsFile.metadata.last_sync
  }
}

// ================================
// Hook principale
// ================================
export async function onApprove({
  submission_id,
  challenge_id,
  user_id,
  reviewer_user_id,
  delta,
  event   = 'task_completed_verified',
  version = '1.0',
  meta    = {}
}: {
  submission_id:     bigint | number
  challenge_id:      bigint | number
  user_id:           bigint | number
  reviewer_user_id?: bigint | number
  delta:             number
  event?:            string
  version?:          string
  meta?:             Record<string, any>
}) {

  // === STEP 1: Idempotenza ===
  const exists = await prisma.points_transactions.findFirst({
    where: { submission_id: BigInt(submission_id), event }
  })
  if (exists) {
    console.warn(`[onApprove] ⚠️ Transaction already exists for submission ${submission_id} (${event})`)
    return exists
  }

  // === STEP 2: Calcolo CO2 ===
  // Legge il payload della submission per estrarre km_percorsi e vehicle_id
  let co2Meta: ReturnType<typeof computeCo2Saved> = null

  try {
    const submission = await prisma.challenge_submissions.findUnique({
      where:  { id: BigInt(submission_id) },
      select: { payload_json: true }
    })

    if (submission?.payload_json && typeof submission.payload_json === 'object') {
      co2Meta = computeCo2Saved(submission.payload_json as Record<string, unknown>)
      if (co2Meta) {
        console.log(`[onApprove] 🌱 CO2 saved: ${co2Meta.co2_saved_kg} kg (${co2Meta.km_percorsi} km × ${co2Meta.co2_g_per_km_used} g/km — ${co2Meta.vehicle_id})`)
      }
    }
  } catch (err) {
    // Il calcolo CO2 non deve mai bloccare l'assegnazione dei punti
    console.warn(`[onApprove] ⚠️ CO2 calculation skipped:`, err)
  }

  // === STEP 3: Registra transazione audit ===
  const txId = `pt_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12)}_${Math.random().toString(36).slice(2, 6)}`
  const now  = new Date()

  const tx = await prisma.points_transactions.create({
    data: {
      id:            txId,
      user_id:       BigInt(user_id),
      challenge_id:  BigInt(challenge_id),
      submission_id: BigInt(submission_id),
      event,
      delta,
      version,
      created_at:    now,
      meta_json: JSON.stringify({
        ...meta,
        reviewer_user_id: reviewer_user_id ? String(reviewer_user_id) : null,
        source:           'auto_hook',
        // Snapshot CO2 — se co2Meta è null la challenge non ha dati di mobilità
        ...(co2Meta ? { co2: co2Meta } : {})
      })
    }
  })

  // === STEP 4: Aggiorna o crea challenge_scores ===
  await prisma.challenge_scores.upsert({
    where: {
      challenge_id_user_id: {
        challenge_id: BigInt(challenge_id),
        user_id:      BigInt(user_id)
      }
    },
    update: {
      score:                { increment: delta },
      verified_tasks_count: { increment: 1 },
      last_event_at:        now
    },
    create: {
      challenge_id:         BigInt(challenge_id),
      user_id:              BigInt(user_id),
      score:                delta,
      verified_tasks_count: 1,
      last_event_at:        now
    }
  })

  console.log(`[onApprove] ✅ Points +${delta} assigned to user ${user_id} for challenge ${challenge_id}`)
  return tx
}