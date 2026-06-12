// src/api/roleRequests.api.js
//
// Gestisce le richieste di cambio ruolo da parte degli utenti.
// Ruoli richiedibili: "sponsor", "judge"
// Il flusso è sempre: richiesta utente → approvazione admin → ruolo aggiornato nel DB
//
// ⚠️  NOTA IMPORTANTE — JWT e cambio ruolo:
//     Dopo che l'admin approva una richiesta, il JWT corrente dell'utente
//     contiene ancora il vecchio ruolo fino alla scadenza naturale.
//     Il FE deve chiamare POST /auth/refresh (o forzare re-login) non appena
//     rileva status === "approved" in getMyRoleRequests(), per aggiornare
//     req.user.role nel contesto di autenticazione.
//
// DIPENDENZE: src/api/client.js (api, API_PATHS)
// RUOLI COINVOLTI: user/judge/sponsor (crea), admin (approva/rifiuta)

import { api, API_PATHS } from "./client";

// ---------------------------------------------------------------------------
// UTENTE — richiesta upgrade ruolo
// ---------------------------------------------------------------------------

/**
 * Invia una richiesta di upgrade ruolo.
 * L'approvazione è manuale (admin) — NON immediata.
 *
 * Regole di business (gestite anche lato BE, ma da rispettare nel FE):
 *   - Un utente con ruolo già "sponsor" o "judge" non può richiedere lo stesso ruolo → 400
 *   - Una sola richiesta "pending" per ruolo alla volta → 409
 *   - Gli admin non possono fare richieste di ruolo → non mostrare il form agli admin
 *
 * @param {Object} body
 * @param {"sponsor"|"judge"} body.requested_role
 * @param {string}            body.motivation      - min 30 caratteri, mostrata all'admin
 * @param {string}           [body.company_name]   - opzionale, rilevante per "sponsor";
 *                                                   può pre-popolare il campo "name"
 *                                                   in POST /sponsors/me dopo l'approvazione
 * @returns {Promise<{
 *   id: number,
 *   requested_role: string,
 *   company_name: string|null,
 *   motivation: string,
 *   status: "pending",
 *   created_at: string,
 *   next_steps: string[]
 * }>}
 *   next_steps: array di istruzioni da mostrare all'utente dopo l'invio
 */
export async function requestRoleUpgrade(body) {
  const res = await api.post(API_PATHS.roleRequests(), body);
  return res.data;
}

/**
 * Recupera tutte le richieste di ruolo dell'utente autenticato.
 *
 * Da usare per:
 *   - mostrare lo stato di una richiesta in attesa
 *   - mostrare rejection_reason in caso di rifiuto (testo leggibile, controproposta)
 *   - rilevare status === "approved" e triggerare POST /auth/refresh per aggiornare il JWT
 *
 * @returns {Promise<{
 *   items: Array<{
 *     id: number,
 *     requested_role: string,
 *     company_name: string|null,
 *     motivation: string,
 *     status: "pending"|"approved"|"rejected",
 *     rejection_reason: string|null,
 *     reviewed_at: string|null,
 *     created_at: string,
 *     updated_at: string
 *   }>,
 *   total: number
 * }>}
 */
export async function getMyRoleRequests() {
  const res = await api.get(API_PATHS.roleRequestsMine());
  return res.data;
}

// ---------------------------------------------------------------------------
// ADMIN — gestione richieste ruolo
// ---------------------------------------------------------------------------

/**
 * Lista paginata di tutte le richieste di ruolo (solo admin).
 *
 * @param {Object} [params]
 * @param {"pending"|"approved"|"rejected"} [params.status]
 * @param {"judge"|"sponsor"}               [params.requested_role]
 * @param {number}                          [params.limit]
 * @param {string}                          [params.cursor] - cursor ISO per paginazione
 * @returns {Promise<{ items: Array, nextCursor: string|null }>}
 *   Ogni item include: dati utente con email, company_name, motivation,
 *   rejection_reason, admin_notes (solo admin), reviewer
 */
export async function adminGetRoleRequests({ status, requested_role, limit, cursor } = {}) {
  const q = new URLSearchParams();
  if (status)         q.set("status", status);
  if (requested_role) q.set("requested_role", requested_role);
  if (limit)          q.set("limit", limit);
  if (cursor)         q.set("cursor", cursor);
  const qs = q.toString() ? `?${q.toString()}` : "";
  const res = await api.get(API_PATHS.adminRoleRequests(qs));
  return res.data;
}

/**
 * Approva una richiesta di cambio ruolo (solo admin).
 * Il ruolo dell'utente viene aggiornato nel DB.
 * L'utente dovrà fare refresh del token per vedere il nuovo ruolo.
 *
 * @param {number} id - ID della role request
 * @param {Object} [body]
 * @param {string} [body.admin_notes] - note interne, non visibili all'utente
 * @returns {Promise}
 */
export async function adminApproveRoleRequest(id, body = {}) {
  const res = await api.patch(API_PATHS.adminRoleRequestApprove(id), body);
  return res.data;
}

/**
 * Rifiuta una richiesta di cambio ruolo (solo admin).
 *
 * @param {number} id
 * @param {Object} [body]
 * @param {string} [body.rejection_reason] - visibile all'utente come controproposta leggibile
 * @param {string} [body.admin_notes]      - note interne, NON visibili all'utente
 * @returns {Promise}
 */
export async function adminRejectRoleRequest(id, body = {}) {
  const res = await api.patch(API_PATHS.adminRoleRequestReject(id), body);
  return res.data;
}
