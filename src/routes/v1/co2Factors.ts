// src/routes/v1/co2Factors.ts
/**
 * Scopo: esporre al frontend le opzioni per i dropdown dei fattori di emissione
 *
 * Funzionalità:
 * - GET /co2-factors/mobility → lista veicoli (id + label) per il dropdown
 *   del form di submission della biciclettata
 *
 * Principio di protezione del know-how:
 * Questo endpoint non espone MAI i valori numerici dei coefficienti (co2_g_per_km)
 * né le fonti di riferimento. Il frontend riceve solo id e label per popolare
 * i menu a tendina. Il calcolo avviene interamente nel backend (onApprove).
 *
 * Il file sorgente co2-factors.v1.json viene letto una volta e tenuto in cache
 * in memoria per tutta la durata del processo — nessuna lettura su disco
 * a ogni richiesta.
 */
import { FastifyInstance } from 'fastify'
import { readFileSync } from 'fs'
import { join } from 'path'

// Lettura del JSON una sola volta all'avvio del modulo
// process.cwd() punta alla root del progetto dove si trova la cartella config/
const factorsPath = join(process.cwd(), 'config/co2-factors.v1.json')
const co2Factors  = JSON.parse(readFileSync(factorsPath, 'utf-8'))

// Lista pubblica: solo id e label — nessun valore numerico esposto
const mobilityOptions: Array<{ id: string; label: string }> =
  co2Factors.mobility.map((entry: { id: string; label: string }) => ({
    id:    entry.id,
    label: entry.label
  }))

export async function co2FactorsV1Routes(app: FastifyInstance) {

  // ================================
  // GET /api/v1/co2-factors/mobility
  // Pubblico — lista veicoli per dropdown nel form di submission
  // Risponde con id e label. Nessun valore numerico esposto.
  // ================================
  app.get('/co2-factors/mobility', {
    schema: {
      tags: ['CO2 Factors v1'],
      summary: 'Lista veicoli per il dropdown del form submission (solo id e label)',
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id:    { type: 'string' },
                  label: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (_req, reply) => {
    return reply.send({ items: mobilityOptions })
  })
}