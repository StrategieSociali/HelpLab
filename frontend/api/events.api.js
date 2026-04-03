// src/api/events.api.js
/**
 * API Events — HelpLab
 * ---------------------
 * Tutte le chiamate relative agli eventi.
 * Usa sempre `api` da client.js — mai fetch/axios diretti.
 *
 * REGOLA: il FE non costruisce mai lo slug autonomamente.
 * Lo slug si legge sempre dalla response del BE (event.slug).
 * Se lo slug cambia dopo un PATCH, il BE lo comunica nella response.
 *
 * ENDPOINT DISPONIBILI (handoff v0.9 §8):
 *   GET    /events                        → lista pubblica
 *   GET    /events/:idOrSlug              → dettaglio
 *   GET    /events/:id/summary            → dashboard live (cache 30s)
 *   POST   /events                        → crea evento (auth)
 *   GET    /events/mine                   → miei eventi (auth)
 *   PATCH  /events/:id                    → modifica (auth, solo draft)
 *   POST   /events/:id/consent            → accetta consenso (auth)
 *   DELETE /events/:id/consent            → revoca consenso (auth)
 *   POST   /events/:id/challenges         → collega challenge (admin)
 *   DELETE /events/:id/challenges/:cId    → scollega challenge (admin)
 *   GET    /admin/events                  → lista admin
 *   PATCH  /events/:id/approve            → approva (admin)
 *   PATCH  /events/:id/reject             → rifiuta (admin)
 *   PATCH  /events/:id/end               → chiudi evento (admin)
 */

import { api } from "@/api/client";

// ─── PUBBLICI ────────────────────────────────────────────────────────────────

/**
 * Lista pubblica eventi con cursor-based pagination.
 * @param {Object} params
 * @param {number} [params.limit=12]
 * @param {string} [params.cursor]   - ISO timestamp nextCursor dalla response precedente
 * @returns {Promise<{items: Array, nextCursor: string|null}>}
 */
export async function getEvents({ limit = 12, cursor } = {}) {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  if (cursor) q.set("cursor", cursor);
  const { data } = await api.get(`/v1/events?${q.toString()}`);
  return data;
}

/**
 * Dettaglio evento. Accetta sia ID numerico che slug.
 * @param {string|number} idOrSlug
 */
export async function getEventDetail(idOrSlug) {
  const { data } = await api.get(`/v1/events/${idOrSlug}`);
  return data;
}

/**
 * Dashboard live evento — dati aggregati con cache 30s lato BE.
 * Usare con polling ogni 30s durante l'evento.
 * @param {string|number} id
 */
export async function getEventSummary(id) {
  const { data } = await api.get(`/v1/events/${id}/summary`);
  return data;
}

// ─── AUTENTICATI ─────────────────────────────────────────────────────────────

/**
 * Crea un nuovo evento (stato iniziale: draft).
 * Lo slug viene generato dal BE dal campo `name` — non mandarlo.
 * @param {Object} payload
 * @param {string} payload.name          - min 5 caratteri, obbligatorio
 * @param {string} [payload.description]
 * @param {string} [payload.logo_url]
 * @param {string} payload.start_date    - YYYY-MM-DD, obbligatorio
 * @param {string} payload.end_date      - YYYY-MM-DD, obbligatorio
 * @param {string} [payload.location_address]
 * @param {Object} [payload.location_geo] - { lat, lon }
 */
export async function createEvent(payload) {
  const { data } = await api.post("/v1/events", payload);
  return data;
}

/**
 * Lista degli eventi creati dall'utente corrente.
 */
export async function getMyEvents() {
  const { data } = await api.get("/v1/events/mine");
  return data;
}

/**
 * Modifica evento — solo se status === "draft" e sei il creatore (o admin).
 * @param {number} id
 * @param {Object} patch - stessi campi di createEvent, tutti opzionali
 */
export async function updateEvent(id, patch) {
  const { data } = await api.patch(`/v1/events/${id}`, patch);
  return data;
}

/**
 * Accetta il consenso privacy per un evento.
 * Il testo DEVE essere esattamente quello mostrato all'utente (compliance GDPR).
 * Importare sempre EVENT_CONSENT da config/eventConsent.js.
 * @param {number} id
 * @param {string} consentText - testo verbatim del consenso accettato
 */
export async function acceptEventConsent(id, consentText) {
  const { data } = await api.post(`/v1/events/${id}/consent`, {
    consent_text: consentText,
  });
  return data;
}

/**
 * Revoca il consenso privacy per un evento.
 * @param {number} id
 */
export async function revokeEventConsent(id) {
  await api.delete(`/v1/events/${id}/consent`);
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

/**
 * Lista eventi per admin con filtro per stato.
 * @param {Object} params
 * @param {string} [params.status]  - es. "draft", "published"
 * @param {number} [params.limit=20]
 * @param {string} [params.cursor]
 */
export async function getAdminEvents({ status, limit = 20, cursor } = {}) {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (cursor) q.set("cursor", cursor);
  const { data } = await api.get(`/v1/admin/events?${q.toString()}`);
  return data;
}

/**
 * Approva un evento (lo porta da draft a published).
 * @param {number} id
 */
export async function approveEvent(id) {
  const { data } = await api.patch(`/v1/events/${id}/approve`);
  return data;
}

/**
 * Rifiuta un evento con motivazione.
 * @param {number} id
 * @param {string} reason
 */
export async function rejectEvent(id, reason) {
  const { data } = await api.patch(`/v1/events/${id}/reject`, { reason });
  return data;
}

/**
 * Chiude un evento (es. a fine giornata).
 * @param {number} id
 */
export async function endEvent(id) {
  const { data } = await api.patch(`/v1/events/${id}/end`);
  return data;
}

/**
 * Collega una challenge esistente a un evento.
 * NOTA: questa chiamata è indipendente da createEvent — non è atomica.
 * Se fallisce, l'evento esiste già. Gestire l'errore mostrando:
 * "Evento creato, ma il collegamento alla challenge è fallito."
 * @param {number} eventId
 * @param {number} challengeId
 */
export async function linkChallengeToEvent(eventId, challengeId) {
  const { data } = await api.post(`/v1/events/${eventId}/challenges`, {
    challenge_id: challengeId,
  });
  return data;
}

/**
 * Scollega una challenge da un evento.
 * @param {number} eventId
 * @param {number} challengeId
 */
export async function unlinkChallengeFromEvent(eventId, challengeId) {
  await api.delete(`/v1/events/${eventId}/challenges/${challengeId}`);
}
