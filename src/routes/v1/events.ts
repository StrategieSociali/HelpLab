// src/routes/v1/events.ts
/**
 * Events — Aggregatori di evento (v0.9)
 *
 * Gerarchia: Events → Challenges → Tasks → Submissions
 * Gli eventi non hanno logica propria di scoring o CO2:
 * aggregano i dati dalle challenge collegate.
 *
 * Flusso di stato:
 *   draft (creato da user) → published (approvato da admin) → ended (chiuso da admin)
 *   draft → rejected (rifiutato da admin)
 *   rejected → draft (automatico quando il creatore modifica l'evento)
 *   rejected → published (admin può riapprovare direttamente)
 *
 * Stati modificabili:
 *   - draft:     creatore o admin
 *   - published: creatore o admin (evento in corso, le cose cambiano)
 *   - rejected:  creatore o admin (per correggere e riapprovare)
 *   - ended:     IMMUTABILE — dati bloccati per auditabilità
 *
 * Sponsor: derivati dalle challenge collegate (challenge.sponsor_id + challenge_sponsorships).
 * Rating sponsor: esposto in lettura tramite sponsors.public_score (già calcolato).
 * Nessun endpoint di scrittura rating in questo file.
 *
 * Protezione know-how:
 * - Il summary espone solo risultati aggregati (co2_saved_kg, total_km, partecipanti)
 * - I coefficienti numerici CO2 non vengono mai esposti
 * - I dati personali dei volontari non compaiono in nessuna response pubblica
 *
 * Sicurezza:
 * - FIX 4 (mar 2026): tutti i parametri URL numerici (:id, :challengeId) sono
 *   protetti con parseBigIntParam — risponde 400 invece di crashare.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../db/client.js'
import { requireAuth, optionalAuth } from '../../utils/requireAuth.js'
import { serializeBigInt } from '../../utils/serialize.js'
import { users_role, events_status } from '@prisma/client'
import { z } from 'zod'
import { getCache, setCache, deleteCache } from '../../utils/memoryCache.js'

// ============================================================
// FIX 4 — Helper: parsing sicuro di parametri URL numerici
// Restituisce null se il valore non è un intero positivo valido.
// ============================================================
function parseBigIntParam(value: unknown): bigint | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!/^\d+$/.test(s)) return null
  try {
    const n = BigInt(s)
    return n > 0n ? n : null
  } catch {
    return null
  }
}

// ============================================================
// Helpers
// ============================================================

/** Genera uno slug URL-safe a partire da una stringa */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160)
}

/** Genera uno slug unico verificando collisioni nel DB */
async function generateUniqueSlug(name: string, excludeId?: bigint): Promise<string> {
  const base = toSlug(name)
  let candidate = base
  let attempt = 0

  while (true) {
    const existing = await prisma.events.findUnique({ where: { slug: candidate } })
    if (!existing || (excludeId && existing.id === excludeId)) break
    attempt++
    candidate = `${base}-${attempt}`
  }

  return candidate
}

/** Chiave cache summary evento */
const summaryKey = (id: number | bigint) => `event_summary_${id}`
const SUMMARY_TTL_MS = 30_000 // 30 secondi

/** Invalida la cache del summary di un evento */
export function invalidateEventSummaryCache(eventId: number | bigint) {
  deleteCache(summaryKey(eventId))
}

// ============================================================
// Validazione input (Zod)
// ============================================================

const createEventSchema = z.object({
  name:             z.string().min(5).max(200),
  description:      z.string().min(20).optional(),
  logo_url:         z.string().url().optional(),
  start_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato atteso: YYYY-MM-DD'),
  end_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato atteso: YYYY-MM-DD'),
  location_address: z.string().max(255).optional(),
  location_geo:     z.object({
    lat: z.number(),
    lon: z.number()
  }).optional()
})

const updateEventSchema = createEventSchema.partial()

const linkChallengeSchema = z.object({
  challenge_id: z.number().int().positive()
})

const consentSchema = z.object({
  consent_text: z.string().min(20)
})

const rejectSchema = z.object({
  reason: z.string().min(5).optional()
})

// ============================================================
// Serializer response — converte BigInt e formatta date
// ============================================================

function formatEvent(ev: any) {
  return serializeBigInt({
    id:               ev.id,
    name:             ev.name,
    slug:             ev.slug,
    description:      ev.description,
    rejection_reason: ev.rejection_reason ?? null,
    logo_url:         ev.logo_url,
    status:           ev.status,
    start_date:       ev.start_date,
    end_date:         ev.end_date,
    location_address: ev.location_address,
    location_geo:     ev.location_geo,
    created_by:       ev.created_by,
    created_at:       ev.created_at,
    updated_at:       ev.updated_at
  })
}

function formatSponsor(s: any) {
  return {
    id:           Number(s.id),
    name:         s.name,
    logo_url:     s.logo_url ?? null,
    website:      s.website ?? null,
    public_score: s.public_score ?? 0
  }
}

function formatChallenge(c: any) {
  return {
    id:       Number(c.id),
    title:    c.title,
    slug:     c.slug,
    status:   c.status,
    deadline: c.deadline ?? null
  }
}

// ============================================================
// Plugin Fastify
// ============================================================

export default async function eventsRoutes(fastify: FastifyInstance) {

  // ----------------------------------------------------------
  // GET /events — Lista eventi pubblicati (pubblica, paginata)
  // ----------------------------------------------------------
  fastify.get('/events', async (req: FastifyRequest, reply: FastifyReply) => {
    const { cursor, limit = '20' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit) || 20, 50)

    const where = { status: events_status.published }
    const cursorWhere = cursor
      ? { created_at: { lt: new Date(cursor) } }
      : {}

    const items = await prisma.events.findMany({
      where:   { ...where, ...cursorWhere },
      orderBy: { created_at: 'desc' },
      take:    take + 1,
      select: {
        id: true, name: true, slug: true, description: true,
        logo_url: true, status: true,
        start_date: true, end_date: true,
        location_address: true, location_geo: true,
        created_at: true, updated_at: true, created_by: true
      }
    })

    const hasMore = items.length > take
    const page   = hasMore ? items.slice(0, take) : items

    return reply.send({
      items:      page.map(formatEvent),
      nextCursor: hasMore ? page[page.length - 1].created_at.toISOString() : null
    })
  })

  // ----------------------------------------------------------
  // GET /events/mine — Lista eventi dell'utente corrente
  // ATTENZIONE: deve essere registrata PRIMA di /events/:idOrSlug
  // ----------------------------------------------------------
  fastify.get('/events/mine', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id

    const items = await prisma.events.findMany({
      where:   { created_by: BigInt(userId) },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, name: true, slug: true, status: true,
        start_date: true, end_date: true,
        location_address: true, created_at: true, updated_at: true,
        created_by: true, description: true, logo_url: true, location_geo: true
      }
    })

    return reply.send({ items: items.map(formatEvent) })
  })

  // ----------------------------------------------------------
  // GET /events/:idOrSlug — Dettaglio evento con challenge e sponsor
  //
  // Visibilità:
  //   - published / ended → pubblico, nessun token richiesto
  //   - draft / rejected  → solo creatore o admin (401/404 per tutti gli altri)
  //
  // Usa optionalAuth: decodifica il token se presente, non blocca se assente.
  // Il parametro può essere un ID numerico o uno slug testuale: nessuna
  // validazione bigint qui, la stringa slug è gestita separatamente.
  // ----------------------------------------------------------
  fastify.get('/events/:idOrSlug', { preHandler: optionalAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { idOrSlug } = req.params as { idOrSlug: string }
    const user = (req as any).user ?? null

    const isId = /^\d+$/.test(idOrSlug)
    const where = isId
      ? { id: BigInt(idOrSlug) }
      : { slug: idOrSlug }

    const ev = await prisma.events.findUnique({
      where,
      include: {
        challenge_links: {
          include: {
            challenge: {
              select: {
                id: true, title: true, slug: true, status: true, deadline: true,
                sponsor_id: true,
                sponsors: {
                  select: { id: true, name: true, logo_url: true, website: true, public_score: true }
                },
                sponsorships: {
                  select: {
                    sponsor: {
                      select: { id: true, name: true, logo_url: true, website: true, public_score: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    // draft e rejected: accessibili solo al creatore o all'admin
    if (ev.status === events_status.draft || ev.status === events_status.rejected) {
      const isAdmin   = user?.role === users_role.admin
      const isCreator = user !== null && ev.created_by !== null && ev.created_by === BigInt(user.id)

      if (!isAdmin && !isCreator) {
        // Restituisce 404 e non 403: non rivela l'esistenza dell'evento
        return reply.status(404).send({ error: 'Evento non trovato' })
      }
    }

    // Raccoglie sponsor unici dalle challenge (sponsor_id + challenge_sponsorships)
    const sponsorMap = new Map<string, any>()
    for (const link of ev.challenge_links) {
      const ch = (link as any).challenge
      if (ch.sponsors) sponsorMap.set(String(ch.sponsors.id), ch.sponsors)
      for (const sp of ch.sponsorships) {
        sponsorMap.set(String(sp.sponsor.id), sp.sponsor)
      }
    }

    return reply.send({
      ...formatEvent(ev),
      sponsors:   Array.from(sponsorMap.values()).map(formatSponsor),
      challenges: ev.challenge_links.map((l: any) => formatChallenge(l.challenge))
    })
  })

  // ----------------------------------------------------------
  // GET /events/:id/summary — Dashboard live (cache 30s)
  // ----------------------------------------------------------
  fastify.get('/events/:id/summary', async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const cacheKey = summaryKey(eventId)
    const cached = getCache(cacheKey)
    if (cached) return reply.send(cached)

    const ev = await prisma.events.findUnique({
      where: { id: eventId },
      select: {
        id: true, name: true, status: true,
        start_date: true, end_date: true,
        location_address: true, location_geo: true,
        challenge_links: {
          select: { challenge_id: true }
        }
      }
    })

    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const challengeIds = ev.challenge_links.map((l: any) => l.challenge_id)

    if (challengeIds.length === 0) {
      const empty = {
        event: serializeBigInt({
          id: ev.id, name: ev.name, status: ev.status,
          start_date: ev.start_date, end_date: ev.end_date,
          location_address: ev.location_address, location_geo: ev.location_geo
        }),
        sponsors:   [],
        impact: {
          total_co2_saved_kg:    0,
          total_km:              0,
          approved_submissions:  0,
          pending_submissions:   0,
          participants:          0
        },
        challenges: []
      }
      setCache(cacheKey, empty, SUMMARY_TTL_MS)
      return reply.send(empty)
    }

    // Recupera tutte le submissions approvate/pending delle challenge collegate
    const [approvedSubs, pendingSubs] = await Promise.all([
      prisma.challenge_submissions.findMany({
        where: {
          challenge_id: { in: challengeIds },
          status: 'approved'
        },
        select: { challenge_id: true, user_id: true }
      }),
      prisma.challenge_submissions.count({
        where: {
          challenge_id: { in: challengeIds },
          status: 'pending'
        }
      })
    ])

    // Partecipanti unici (utenti con almeno una submission approvata)
    const participantSet = new Set(approvedSubs.map((s: any) => String(s.user_id)))

    // Recupera le points_transactions approvate con meta_json CO2
    const transactions = await prisma.points_transactions.findMany({
      where: {
        challenge_id: { in: challengeIds },
        event:        'task_completed_verified'
      },
      select: { challenge_id: true, meta_json: true }
    })

    // Aggrega CO2 e km per challenge
    type ChallengeAgg = {
      approved_count: number
      pending_count:  number
      co2_saved_kg:   number
      total_km:       number
    }
    const challengeAgg = new Map<string, ChallengeAgg>()

    for (const cid of challengeIds) {
      challengeAgg.set(String(cid), {
        approved_count: 0,
        pending_count:  0,
        co2_saved_kg:   0,
        total_km:       0
      })
    }

    for (const sub of approvedSubs) {
      const key = String(sub.challenge_id)
      const agg = challengeAgg.get(key)
      if (agg) agg.approved_count++
    }

    let totalCo2 = 0
    let totalKm  = 0

    for (const tx of transactions) {
      if (!tx.meta_json || typeof tx.meta_json !== 'object') continue
      const meta = tx.meta_json as Record<string, any>
      const co2Data = meta['co2']
      if (!co2Data) continue

      const co2Kg = Number(co2Data['co2_saved_kg'] ?? 0)
      const km    = Number(co2Data['km_percorsi']   ?? 0)
      totalCo2   += co2Kg
      totalKm    += km

      const key = String(tx.challenge_id)
      const agg = challengeAgg.get(key)
      if (agg) {
        agg.co2_saved_kg += co2Kg
        agg.total_km     += km
      }
    }

    const challenges = await prisma.challenges.findMany({
      where: { id: { in: challengeIds } },
      select: {
        id: true, title: true,
        sponsor_id: true,
        sponsors:  { select: { id: true, name: true, logo_url: true, website: true, public_score: true } },
        sponsorships: {
          select: {
            sponsor: { select: { id: true, name: true, logo_url: true, website: true, public_score: true } }
          }
        }
      }
    })

    const sponsorMap = new Map<string, any>()
    for (const ch of challenges) {
      if (ch.sponsors) sponsorMap.set(String(ch.sponsors.id), ch.sponsors)
      for (const sp of ch.sponsorships) {
        sponsorMap.set(String(sp.sponsor.id), sp.sponsor)
      }
    }

    const challengesResult = challenges.map((ch: any) => {
      const agg = challengeAgg.get(String(ch.id)) ?? {
        approved_count: 0, pending_count: 0, co2_saved_kg: 0, total_km: 0
      }
      return {
        id:             Number(ch.id),
        title:          ch.title,
        approved_count: agg.approved_count,
        pending_count:  agg.pending_count,
        co2_saved_kg:   parseFloat(agg.co2_saved_kg.toFixed(4)),
        total_km:       parseFloat(agg.total_km.toFixed(2))
      }
    })

    const result = {
      event: serializeBigInt({
        id: ev.id, name: ev.name, status: ev.status,
        start_date: ev.start_date, end_date: ev.end_date,
        location_address: ev.location_address, location_geo: ev.location_geo
      }),
      sponsors: Array.from(sponsorMap.values()).map(formatSponsor),
      impact: {
        total_co2_saved_kg:   parseFloat(totalCo2.toFixed(4)),
        total_km:             parseFloat(totalKm.toFixed(2)),
        approved_submissions: approvedSubs.length,
        pending_submissions:  pendingSubs,
        participants:         participantSet.size
      },
      challenges: challengesResult
    }

    setCache(cacheKey, result, SUMMARY_TTL_MS)
    return reply.send(result)
  })

  // ----------------------------------------------------------
  // POST /events — Crea evento in stato draft
  // ----------------------------------------------------------
  fastify.post('/events', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user
    const parsed = createEventSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const data = parsed.data
    const start = new Date(data.start_date)
    const end   = new Date(data.end_date)

    if (end < start) {
      return reply.status(400).send({ error: 'end_date deve essere uguale o successiva a start_date' })
    }

    const slug = await generateUniqueSlug(data.name)

    const ev = await prisma.events.create({
      data: {
        name:             data.name,
        slug,
        description:      data.description ?? null,
        logo_url:         data.logo_url ?? null,
        start_date:       start,
        end_date:         end,
        location_address: data.location_address ?? null,
        location_geo:     data.location_geo ?? undefined,
        status:           events_status.draft,
        created_by:       BigInt(user.id)
      }
    })

    return reply.status(201).send(formatEvent(ev))
  })

  // ----------------------------------------------------------
  // PATCH /events/:id — Modifica evento
  // ----------------------------------------------------------
  fastify.patch('/events/:id', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const user = (req as any).user

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const isAdmin   = user.role === users_role.admin
    const isCreator = ev.created_by !== null && ev.created_by === BigInt(user.id)

    if (!isAdmin && !isCreator) {
      return reply.status(403).send({ error: 'Non autorizzato' })
    }

    // ended è immutabile per tutti
    if (ev.status === events_status.ended) {
      return reply.status(403).send({ error: 'Gli eventi conclusi non possono essere modificati' })
    }

    const parsed = updateEventSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const data = parsed.data
    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ error: 'Nessun campo da aggiornare fornito' })
    }

    const updateData: Record<string, any> = {}

    if (data.name !== undefined) {
      updateData.name = data.name
      updateData.slug = await generateUniqueSlug(data.name, ev.id)
    }
    if (data.description      !== undefined) updateData.description      = data.description
    if (data.logo_url          !== undefined) updateData.logo_url          = data.logo_url
    if (data.start_date        !== undefined) updateData.start_date        = new Date(data.start_date)
    if (data.end_date          !== undefined) updateData.end_date          = new Date(data.end_date)
    if (data.location_address !== undefined) updateData.location_address = data.location_address
    if (data.location_geo     !== undefined) updateData.location_geo     = data.location_geo

    // Reset automatico a draft se il creatore modifica un evento rejected
    if (!isAdmin && ev.status === events_status.rejected) {
      updateData.status           = events_status.draft
      updateData.rejection_reason = null
    }

    const updated = await prisma.events.update({
      where: { id: ev.id },
      data:  updateData
    })

    return reply.send(formatEvent(updated))
  })

  // ----------------------------------------------------------
  // POST /events/:id/consent — Accetta consenso privacy
  // ----------------------------------------------------------
  fastify.post('/events/:id/consent', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const user = (req as any).user

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev)                                   return reply.status(404).send({ error: 'Evento non trovato' })
    if (ev.status !== events_status.published) return reply.status(400).send({ error: 'Il consenso può essere accettato solo per eventi pubblicati' })

    const parsed = consentSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const consent = await prisma.event_consents.upsert({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id:  BigInt(user.id)
        }
      },
      update: {
        consent_text: parsed.data.consent_text,
        consented_at: new Date()
      },
      create: {
        event_id:     eventId,
        user_id:      BigInt(user.id),
        consent_text: parsed.data.consent_text
      }
    })

    return reply.status(201).send({
      event_id:     Number(consent.event_id),
      user_id:      Number(consent.user_id),
      consented_at: consent.consented_at
    })
  })

  // ----------------------------------------------------------
  // DELETE /events/:id/consent — Revoca consenso
  // ----------------------------------------------------------
  fastify.delete('/events/:id/consent', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const user = (req as any).user

    const consent = await prisma.event_consents.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id:  BigInt(user.id)
        }
      }
    })

    if (!consent) return reply.status(404).send({ error: 'Nessun consenso trovato per questo evento' })

    await prisma.event_consents.delete({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id:  BigInt(user.id)
        }
      }
    })

    return reply.status(204).send()
  })

  // ----------------------------------------------------------
  // ADMIN — GET /admin/events — Lista tutti gli eventi
  // ----------------------------------------------------------
  fastify.get('/admin/events', { preHandler: requireAuth(users_role.admin) }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { cursor, limit = '20', status } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit) || 20, 100)

    const where: Record<string, any> = {}
    if (status && Object.values(events_status).includes(status as events_status)) {
      where.status = status as events_status
    }

    const cursorWhere = cursor
      ? { created_at: { lt: new Date(cursor) } }
      : {}

    const items = await prisma.events.findMany({
      where:   { ...where, ...cursorWhere },
      orderBy: { created_at: 'desc' },
      take:    take + 1,
      include: {
        creator: { select: { id: true, nickname: true, email: true } }
      }
    })

    const hasMore = items.length > take
    const page   = hasMore ? items.slice(0, take) : items

    return reply.send({
      items: page.map((ev: any) => ({
        ...formatEvent(ev),
        creator: ev.creator
          ? { id: Number(ev.creator.id), nickname: ev.creator.nickname, email: ev.creator.email }
          : null
      })),
      nextCursor: hasMore ? page[page.length - 1].created_at.toISOString() : null
    })
  })

  // ----------------------------------------------------------
  // ADMIN — PATCH /events/:id/approve — draft o rejected → published
  // ----------------------------------------------------------
  fastify.patch('/events/:id/approve', { preHandler: requireAuth(users_role.admin) }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const approvableStatuses: events_status[] = [events_status.draft, events_status.rejected]
    if (!approvableStatuses.includes(ev.status)) {
      return reply.status(400).send({
        error: `L'evento deve essere in stato draft o rejected per essere approvato. Stato attuale: ${ev.status}`
      })
    }

    const updated = await prisma.events.update({
      where: { id: ev.id },
      data:  { status: events_status.published }
    })

    return reply.send(formatEvent(updated))
  })

  // ----------------------------------------------------------
  // ADMIN — PATCH /events/:id/reject — draft o published → rejected
  // ----------------------------------------------------------
  fastify.patch('/events/:id/reject', { preHandler: requireAuth(users_role.admin) }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const rejectableStatuses: events_status[] = [events_status.draft, events_status.published]
    if (!rejectableStatuses.includes(ev.status)) {
      return reply.status(400).send({
        error: `L'evento deve essere in stato draft o published per essere rifiutato. Stato attuale: ${ev.status}`
      })
    }

    const parsed = rejectSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const updated = await prisma.events.update({
      where: { id: ev.id },
      data: {
        status:           events_status.rejected,
        rejection_reason: parsed.data.reason ?? null
      }
    })

    // Invalida cache summary se era published
    if (ev.status === events_status.published) {
      invalidateEventSummaryCache(ev.id)
    }

    return reply.send(formatEvent(updated))
  })

  // ----------------------------------------------------------
  // ADMIN — PATCH /events/:id/end — published → ended
  // ----------------------------------------------------------
  fastify.patch('/events/:id/end', { preHandler: requireAuth(users_role.admin) }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev)                                   return reply.status(404).send({ error: 'Evento non trovato' })
    if (ev.status !== events_status.published) return reply.status(400).send({ error: `L'evento deve essere in stato published. Stato attuale: ${ev.status}` })

    const updated = await prisma.events.update({
      where: { id: ev.id },
      data:  { status: events_status.ended }
    })

    invalidateEventSummaryCache(ev.id)

    return reply.send(formatEvent(updated))
  })

  // ----------------------------------------------------------
  // POST /events/:id/challenges — Collega challenge
  // ----------------------------------------------------------
  fastify.post('/events/:id/challenges', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const user = (req as any).user

    const parsed = linkChallengeSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.flatten().fieldErrors })
    }

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const isAdmin   = user.role === users_role.admin
    const isCreator = ev.created_by !== null && ev.created_by === BigInt(user.id)

    if (!isAdmin && !isCreator) {
      return reply.status(403).send({ error: 'Non autorizzato' })
    }

    if (ev.status === events_status.ended) {
      return reply.status(403).send({ error: 'Gli eventi conclusi non possono essere modificati' })
    }

    if (!isAdmin && ev.status !== events_status.draft) {
      return reply.status(403).send({ error: 'Puoi collegare challenge solo a eventi in bozza' })
    }

    const challengeId = parseBigIntParam(parsed.data.challenge_id)
    if (!challengeId) return reply.status(400).send({ error: 'ID challenge non valido' })

    const challenge = await prisma.challenges.findUnique({ where: { id: challengeId } })
    if (!challenge) return reply.status(404).send({ error: 'Challenge non trovata' })

    const existing = await prisma.event_challenges.findUnique({
      where: {
        event_id_challenge_id: {
          event_id:     eventId,
          challenge_id: challengeId
        }
      }
    })
    if (existing) return reply.status(409).send({ error: 'Challenge già collegata a questo evento' })

    await prisma.event_challenges.create({
      data: {
        event_id:     eventId,
        challenge_id: challengeId
      }
    })

    invalidateEventSummaryCache(eventId)

    return reply.status(201).send({
      event_id:        Number(eventId),
      challenge_id:    Number(challengeId),
      challenge_title: challenge.title
    })
  })

  // ----------------------------------------------------------
  // DELETE /events/:id/challenges/:challengeId — Scollega challenge
  // ----------------------------------------------------------
  fastify.delete('/events/:id/challenges/:challengeId', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const challengeId = parseBigIntParam((req.params as any).challengeId)
    if (!challengeId) return reply.status(400).send({ error: 'ID challenge non valido' })

    const user = (req as any).user

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const isAdmin   = user.role === users_role.admin
    const isCreator = ev.created_by !== null && ev.created_by === BigInt(user.id)

    if (!isAdmin && !isCreator) {
      return reply.status(403).send({ error: 'Non autorizzato' })
    }

    if (ev.status === events_status.ended) {
      return reply.status(403).send({ error: 'Gli eventi conclusi non possono essere modificati' })
    }

    if (!isAdmin && ev.status !== events_status.draft) {
      return reply.status(403).send({ error: 'Puoi scollegare challenge solo da eventi in bozza' })
    }

    const link = await prisma.event_challenges.findUnique({
      where: {
        event_id_challenge_id: {
          event_id:     eventId,
          challenge_id: challengeId
        }
      }
    })

    if (!link) return reply.status(404).send({ error: 'Collegamento non trovato' })

    await prisma.event_challenges.delete({
      where: {
        event_id_challenge_id: {
          event_id:     eventId,
          challenge_id: challengeId
        }
      }
    })

    invalidateEventSummaryCache(eventId)

    return reply.status(204).send()
  })

  // ----------------------------------------------------------
  // ADMIN — GET /events/:id/consents/export — CSV partecipanti con consenso
  // ----------------------------------------------------------
  fastify.get('/events/:id/consents/export', { preHandler: requireAuth(users_role.admin) }, async (req: FastifyRequest, reply: FastifyReply) => {
    const eventId = parseBigIntParam((req.params as any).id)
    if (!eventId) return reply.status(400).send({ error: 'ID evento non valido' })

    const ev = await prisma.events.findUnique({ where: { id: eventId } })
    if (!ev) return reply.status(404).send({ error: 'Evento non trovato' })

    const consents = await prisma.event_consents.findMany({
      where: { event_id: eventId },
      include: {
        user: { select: { id: true, nickname: true, email: true } }
      },
      orderBy: { consented_at: 'asc' }
    })

    const header = 'user_id,nickname,email,consented_at\n'
    const rows = consents.map((c: any) => {
      const nickname = (c.user.nickname ?? '').replace(/,/g, ';')
      const email    = (c.user.email    ?? '').replace(/,/g, ';')
      return `${Number(c.user.id)},${nickname},${email},${c.consented_at.toISOString()}`
    }).join('\n')

    const filename = `consents_event_${Number(eventId)}_${new Date().toISOString().slice(0, 10)}.csv`

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(header + rows)
  })
}
