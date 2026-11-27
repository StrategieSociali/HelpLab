// src/api/sponsorship.api.js
//
// Gestisce tutte le operazioni legate alle sponsorizzazioni:
//   - candidature sponsor (crea, lista personale, ritiro)
//   - endpoint admin (lista, approva, rifiuta, conferma pagamento)
//   - 8a, passo 7: promemoria all'ente, conferma del pagamento di un evento,
//     proposte sugli eventi dell'ente e risposta del referente
//
// DIPENDENZE: src/api/client.js (api, API_PATHS)
// RUOLI COINVOLTI: sponsor, admin

import { api, API_PATHS } from "./client";

// ---------------------------------------------------------------------------
// SPONSOR — candidature
// ---------------------------------------------------------------------------

/**
 * Crea una nuova candidatura di sponsorizzazione.
 *
 * @param {Object} body
 * @param {"challenge"|"event"|"platform"} body.target_type
 * @param {number|null}  body.challenge_id        - obbligatorio se target_type === "challenge"
 * @param {string}       body.motivation          - min 20 caratteri
 * @param {string|null}  body.report_requests     - opzionale
 * @param {number}       body.budget_proposed_eur
 * @returns {Promise<{ id, status, next_steps: string[] }>}
 *   next_steps: array di istruzioni da mostrare all'utente post-submission
 *   (sostituisce email fino a quando il sistema di notifiche non sarà attivo)
 */
export async function createSponsorshipRequest(body) {
  const res = await api.post(API_PATHS.sponsorshipRequests(), body);
  return res.data;
}

/**
 * Lista le candidature dello sponsor autenticato.
 * Ogni item include il blocco `payment` (null finché non approvata dall'admin).
 *
 * @returns {Promise<Array>}
 */
export async function getMySponshorshipRequests() {
  const res = await api.get(API_PATHS.sponsorshipRequestsMine());
  return res.data;
}

/**
 * Ritira una candidatura ancora in stato "pending_review".
 *
 * @param {number} id - ID della candidatura
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteSponsorshipRequest(id) {
  const res = await api.delete(API_PATHS.sponsorshipRequestDelete(id));
  return res.data;
}

// ---------------------------------------------------------------------------
// ADMIN — gestione candidature
// ---------------------------------------------------------------------------

/**
 * Lista paginata di tutte le candidature (solo admin).
 *
 * @param {Object} params
 * @param {string} [params.status]  - filtra per stato
 * @param {number} [params.limit]
 * @param {string} [params.cursor]  - cursor ISO per paginazione
 * @returns {Promise<{ items: Array, nextCursor: string|null }>}
 */
export async function adminGetSponsorshipRequests({ status, limit, cursor } = {}) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (limit)  q.set("limit", limit);
  if (cursor) q.set("cursor", cursor);
  const qs = q.toString() ? `?${q.toString()}` : "";
  const res = await api.get(API_PATHS.adminSponsorshipRequests(qs));
  return res.data;
}

/**
 * Approva una candidatura (solo admin).
 *
 * @param {number} id
 * @param {Object} [body]
 * @param {string} [body.payment_deadline] - YYYY-MM-DD
 * @param {string} [body.admin_notes]      - non esposto allo sponsor
 * @returns {Promise}
 */
export async function adminApproveSponsorshipRequest(id, body = {}) {
  const res = await api.patch(API_PATHS.adminSponsorshipApprove(id), body);
  return res.data;
}

/**
 * Rifiuta una candidatura (solo admin).
 *
 * @param {number} id
 * @param {Object} [body]
 * @param {string} [body.reason]
 * @returns {Promise}
 */
export async function adminRejectSponsorshipRequest(id, body = {}) {
  const res = await api.patch(API_PATHS.adminSponsorshipReject(id), body);
  return res.data;
}

/**
 * Conferma la ricezione del pagamento (solo admin).
 *
 * @param {number} id - ID della sponsorship (non della candidatura)
 * @param {Object} body
 * @param {number} body.amount_eur
 * @param {string} [body.private_notes] - non esposto allo sponsor
 * @returns {Promise}
 */
export async function adminConfirmPayment(id, body) {
  const res = await api.patch(API_PATHS.adminSponsorshipConfirmPayment(id), body);
  return res.data;
}

// ---------------------------------------------------------------------------
// 8a, passo 7 — sponsor di evento
// ---------------------------------------------------------------------------

/**
 * Promemoria all'ente (solo admin, solo mentre la richiesta aspetta l'ente).
 * Rimanda l'email ai referenti e resta registrato (chi, quando, a quanti).
 *
 * @param {number} id - ID della candidatura
 * @returns {Promise<{ id, sent_at, recipients }>}
 */
export async function adminRemindSponsorshipRequest(id) {
  const res = await api.post(API_PATHS.adminSponsorshipRemind(id));
  return res.data;
}

/**
 * Conferma il pagamento di una sponsorizzazione di EVENTO (solo admin).
 *
 * @param {number} id - `event_sponsorship_id` della riga admin (non della candidatura)
 * @param {Object} body - { amount_eur, private_notes? }
 */
export async function adminConfirmEventPayment(id, body) {
  const res = await api.patch(API_PATHS.adminEventSponsorshipConfirmPayment(id), body);
  return res.data;
}

/**
 * Proposte degli sponsor sugli eventi dell'ente (membri attivi dell'ente).
 * Ogni item ha `can_answer`: true solo per i referenti, mentre la proposta aspetta l'ente.
 *
 * @param {number} orgId
 * @returns {Promise<{ items: Array, total: number }>}
 */
export async function getOrganizationSponsorshipRequests(orgId) {
  const res = await api.get(API_PATHS.organizationSponsorshipRequests(orgId));
  return res.data;
}

/**
 * Risposta del referente: accetta o declina. Il messaggio vale solo per il rifiuto
 * e lo legge lo sponsor. Il primo referente che risponde decide (409 per gli altri).
 *
 * @param {number} orgId
 * @param {number} requestId
 * @param {{ answer: "accept"|"decline", message?: string }} body
 */
export async function answerOrganizationSponsorshipRequest(orgId, requestId, body) {
  const res = await api.post(API_PATHS.organizationSponsorshipAnswer(orgId, requestId), body);
  return res.data;
}
