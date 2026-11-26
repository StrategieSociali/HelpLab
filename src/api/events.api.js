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
 *   GET    /events/:id/consent            → testo, ente e stato (auth; 8a passo 5)
 *   POST   /events/:id/consent            → risposta { answer } (auth; il testo lo scrive il server)
 *   DELETE /events/:id/consent            → revoca, la riga resta (auth)
 *   POST   /events/:id/challenges         → collega challenge (admin)
 *   DELETE /events/:id/challenges/:cId    → scollega challenge (admin)
 *   GET    /admin/events                  → lista admin
 *   PATCH  /events/:id/approve            → approva (admin)
 *   PATCH  /events/:id/reject             → rifiuta (admin)
 *   PATCH  /events/:id/end               → chiudi evento (admin)
 *
 *   GET    /admin/events/:id/preflight    → preflight d'evento: rilievi e riepilogo (admin)
 *
 * Preflight d'evento (1/10/2026): ogni riga di /admin/events non conclusa porta
 * `preflight` ({ blocked, needs_confirmation, blocks, warnings }, null se non riuscito).
 * approve risponde 409 `preflight_blocked` con un task che darebbe zero, oppure
 * `preflight_confirm_required` con soli avvisi e senza `confirm_warnings: true`.
 * Il collegamento di una sfida sbagliata risponde 400 col motivo in `error`.
 *
 * approve ed end restituiscono anche `integrity`: riassunto del controllo di integrità
 * del registro punti ({ ok, count, anomalies_count }), null se il controllo non è riuscito.
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
export async function getEvents({ limit = 12, cursor, status } = {}) {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  if (cursor) q.set("cursor", cursor);
  if (status) q.set("status", status);
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

/**
 * Classifica di evento (PM-5, 2/10/2026): le sfide collegate sommate, cache 30s lato BE.
 * Solo eventi pubblicati o conclusi: per gli altri il BE risponde 404.
 * @param {string|number} id
 * @param {number} [limit=10]
 */
export async function getEventLeaderboard(id, limit = 10) {
  const { data } = await api.get(`/v1/events/${id}/leaderboard?limit=${limit}`);
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

// ─── CONSENSI (8a, passo 5) ──────────────────────────────────────────────────
// Il testo lo scrive il SERVER (decisione B del 26/11/2026): il client manda solo
// la risposta, così quello che si salva è per forza quello che la persona ha letto.

/**
 * Stato del consenso della persona per un evento: testo, ente, stato
 * ("none" | "yes" | "no" | "revoked"), `has_sharing` (false se l'evento non ha ente).
 * @param {number} id
 */
export async function getEventConsent(id) {
  const { data } = await api.get(`/v1/events/${id}/consent`);
  return data;
}

/**
 * Risposta della persona: "yes" o "no". Un «no» su un «sì» attivo è una revoca.
 * @param {number} id
 * @param {"yes"|"no"} answer
 */
export async function answerEventConsent(id, answer) {
  const { data } = await api.post(`/v1/events/${id}/consent`, { answer });
  return data;
}

/**
 * Revoca il consenso: la riga resta, con la data della revoca.
 * @param {number} id
 */
export async function revokeEventConsent(id) {
  await api.delete(`/v1/events/${id}/consent`);
}

/**
 * Eventi in corso con un ente, collegati alla sfida, che aspettano ancora una
 * risposta da chi apre il modulo. `{ items: [{ event_id, event_name, organization, text }] }`
 * @param {number|string} challengeId
 */
export async function getConsentRequests(challengeId) {
  const { data } = await api.get(`/v1/challenges/${challengeId}/consent-requests`);
  return data?.items ?? [];
}

/**
 * Scarica il CSV dei contatti (admin o referente dell'ente). Ogni scaricamento
 * resta registrato sul server.
 * @param {number} id
 * @param {string} [nomeFile]
 */
export async function downloadEventContacts(id, nomeFile) {
  const res = await api.get(`/v1/events/${id}/consents/export`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFile || `contatti_evento_${id}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Storia dei consensi di una persona (solo admin): per id, email o nickname esatti.
 * @param {string} chiave
 */
export async function getPersonConsents(chiave) {
  const { data } = await api.get(`/v1/admin/users/${encodeURIComponent(chiave)}/consents`);
  return data;
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
 * @param {Object} [body] - es. { confirm_warnings: true } per confermare gli avvisi del preflight
 */
export async function approveEvent(id, body = {}) {
  const { data } = await api.patch(`/v1/events/${id}/approve`, body);
  return data;
}

/**
 * Preflight d'evento: rilievi sulle sfide collegate e riepilogo della configurazione.
 * @param {number} id
 */
export async function getEventPreflight(id) {
  const { data } = await api.get(`/v1/admin/events/${id}/preflight`);
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
 * Le sfide che il collegamento accetterebbe (8a, passo 3): aperte, e per chi non è
 * admin solo quelle dell'ente dell'evento, o per un evento senza ente quelle senza
 * ente proposte da chi chiama. Così la scelta non propone sfide che il BE rifiuta.
 * @param {number} eventId
 * @returns {Promise<Array>}
 */
export async function getLinkableChallenges(eventId) {
  const { data } = await api.get(`/v1/events/${eventId}/linkable-challenges`);
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * Scollega una challenge da un evento.
 * @param {number} eventId
 * @param {number} challengeId
 */
export async function unlinkChallengeFromEvent(eventId, challengeId) {
  await api.delete(`/v1/events/${eventId}/challenges/${challengeId}`);
}
