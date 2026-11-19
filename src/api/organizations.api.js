// src/api/organizations.api.js
//
// Enti organizzatori, membri e inviti (punto 8a, passo 2;
// docs/contesto/organizzatore-8a.md nel workspace).
//
// L'ente nasce da una richiesta di ruolo `organizer` (roleRequests.api.js) che
// l'admin approva: chi l'ha chiesta ne diventa il primo referente. Il ruolo
// dell'utente (users.role) NON cambia: i permessi passano dall'appartenenza
// all'ente, quindi qui non serve rinnovare il token dopo l'approvazione.
//
// Regole del BE da ricordare nel FE:
//   - chi non è membro riceve 404 (non 403): l'ente "non esiste" per lui
//   - invitare, togliere e cambiare ruolo: solo i referenti (l'admin no)
//   - il nome dell'ente lo cambia solo l'admin
//   - l'ultimo referente non si toglie e non si declassa (409)
//
// DIPENDENZE: src/api/client.js (api, API_PATHS)

import { api, API_PATHS } from "./client";

// ---------------------------------------------------------------------------
// Richiesta di diventare ente
// ---------------------------------------------------------------------------

/** Testo della dichiarazione: è quello che il BE salva con la richiesta. */
export async function getOrganizerDeclaration() {
  const res = await api.get(API_PATHS.organizationsDeclaration());
  return res.data?.text ?? "";
}

/**
 * Invia la richiesta di registrare un ente.
 * @param {{ company_name: string, motivation: string }} body
 */
export async function requestOrganization({ company_name, motivation }) {
  const res = await api.post(API_PATHS.roleRequests(), {
    requested_role: "organizer",
    company_name,
    motivation,
    declaration_accepted: true,
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Enti e membri
// ---------------------------------------------------------------------------

/** Enti di cui sono membro attivo: [{ id, name, ..., my_role, member_id }] */
export async function getMyOrganizations() {
  const res = await api.get(API_PATHS.organizationsMine());
  return res.data?.items ?? [];
}

export async function getOrganization(id) {
  const res = await api.get(API_PATHS.organization(id));
  return res.data;
}

/** @param {{ website?: string|null, description?: string|null, logo_url?: string|null }} body */
export async function updateOrganization(id, body) {
  const res = await api.patch(API_PATHS.organization(id), body);
  return res.data;
}

/** Membri attivi e inviti in attesa (solo nome visibile, niente email). */
export async function getOrganizationMembers(id) {
  const res = await api.get(API_PATHS.organizationMembers(id));
  return res.data?.items ?? [];
}

/** @param {string} identifier email o nickname di un utente registrato */
export async function inviteMember(id, identifier) {
  const res = await api.post(API_PATHS.organizationInvites(id), { identifier });
  return res.data;
}

/** Toglie un membro, annulla un invito, oppure (sulla propria riga) esce dall'ente. */
export async function removeMember(id, memberId) {
  const res = await api.delete(API_PATHS.organizationMember(id, memberId));
  return res.data;
}

/** @param {"referent"|"member"} role */
export async function changeMemberRole(id, memberId, role) {
  const res = await api.patch(API_PATHS.organizationMember(id, memberId), { role });
  return res.data;
}

// ---------------------------------------------------------------------------
// I miei inviti
// ---------------------------------------------------------------------------

export async function getMyOrganizationInvites() {
  const res = await api.get(API_PATHS.myOrganizationInvites());
  return res.data?.items ?? [];
}

/** @param {"accept"|"decline"} action */
export async function answerOrganizationInvite(memberId, action) {
  const res = await api.post(API_PATHS.myOrganizationInviteAnswer(memberId, action));
  return res.data;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminGetOrganizations() {
  const res = await api.get(API_PATHS.adminOrganizations());
  return res.data?.items ?? [];
}

/** @param {{ name?: string, sponsor_id?: number|null }} body */
export async function adminUpdateOrganization(id, body) {
  const res = await api.patch(API_PATHS.adminOrganization(id), body);
  return res.data;
}
