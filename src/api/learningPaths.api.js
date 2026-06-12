/**
 * src/api/learningPaths.api.js
 * ----------------------------
 * Funzioni API per il catalogo dei percorsi di apprendimento.
 *
 * HelpLab non è un LMS: i corsi vengono erogati su piattaforme esterne
 * (YouTube, LifterLMS). Questo modulo gestisce solo il catalogo curato.
 *
 * Endpoint pubblici: nessun token richiesto.
 * Endpoint admin (POST, PUT, DELETE): richiedono JWT con ruolo admin.
 *
 * Ref backend handoff: Learning Path Catalog v1.1 – 27/02/2026
 */

import { api } from "@/api/client";

// ─── ENDPOINT PATH ───────────────────────────────────────────────────────────
const BASE = "/v1/learning-paths";

// ─── PUBBLICI ─────────────────────────────────────────────────────────────────

/**
 * Recupera la lista dei corsi pubblicati.
 *
 * I filtri sono tutti opzionali e vengono inviati come query string.
 * Il backend restituisce sempre un array (vuoto se nessun corso corrisponde).
 *
 * @param {Object} filters
 * @param {string} [filters.category]   - Es. "ONBOARDING"
 * @param {string} [filters.targetRole] - Es. "VOLUNTEER"
 * @param {string} [filters.type]       - "FREE" | "PREMIUM"
 * @returns {Promise<Array>}
 */
export async function fetchLearningPaths(filters = {}) {
  const params = new URLSearchParams();

  if (filters.category)   params.set("category",   filters.category);
  if (filters.targetRole) params.set("targetRole", filters.targetRole);
  if (filters.type)       params.set("type",        filters.type);

  const query = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get(`${BASE}${query}`);

  // Il backend restituisce un array diretto (non wrappato in { items })
  return Array.isArray(data) ? data : [];
}

/**
 * Recupera il dettaglio di un singolo corso pubblicato.
 * Per uso futuro (es. pagina dettaglio corso, breadcrumb, SEO).
 *
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function fetchLearningPath(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

// ─── ADMIN (richiedono JWT con role: admin) ───────────────────────────────────

/**
 * Crea un nuovo corso nel catalogo.
 * Il corso viene creato con isPublished = false di default.
 *
 * @param {Object} body - Vedi handoff sezione 3.1 per i campi richiesti
 * @returns {Promise<Object>} corso creato
 */
export async function createLearningPath(body) {
  const { data } = await api.post(BASE, body);
  return data;
}

/**
 * Aggiorna uno o più campi di un corso esistente.
 * Usato anche per pubblicare/nascondere un corso (is_published).
 *
 * @param {number} id
 * @param {Object} body - Solo i campi da aggiornare
 * @returns {Promise<Object>} corso aggiornato
 */
export async function updateLearningPath(id, body) {
  const { data } = await api.put(`${BASE}/${id}`, body);
  return data;
}

/**
 * Disattiva un corso (soft delete: isPublished → false).
 * Il record NON viene eliminato dal database.
 *
 * @param {number} id
 * @returns {Promise<{ ok: boolean }>}
 */
export async function deactivateLearningPath(id) {
  const { data } = await api.delete(`${BASE}/${id}`);
  return data;
}
