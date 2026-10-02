// src/api/client.js
console.warn(">>> CLIENT.JS LOADED <<<");

import axios from "axios";


const API_BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

//temporanea
console.log("API_BASE =", API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Variabile globale per contenere la funzione dinamica
let getTokenFn = null;

export function attachToken(getToken) {
  getTokenFn = getToken;
}

// Aggiungiamo l'interceptor UNA sola volta
api.interceptors.request.use((config) => {
  const t = getTokenFn?.();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// ─── Rinnovo automatico dell'access token (decisione PM 2/10/2026) ────────────
// Prima il token si rinnovava solo al caricamento della pagina (AuthContext):
// chi restava nell'app oltre la durata dell'access token riceveva 401 alla prima
// chiamata protetta. Ora un 401 su una chiamata che portava il token fa partire
// UN solo refresh, anche con più chiamate in volo, e la chiamata si ripete una volta.
// Se il refresh fallisce, la sessione locale si chiude e la chiamata fallisce come prima.
export const USE_REFRESH = (import.meta.env.VITE_USE_REFRESH || "false") === "true";

let onRefreshedFn = null;   // (token) => void — salva il token nuovo
let onSessionLostFn = null; // () => void — azzera token e utente

export function attachSessionHandlers({ onRefreshed, onSessionLost }) {
  onRefreshedFn = onRefreshed;
  onSessionLostFn = onSessionLost;
}

let refreshing = null;

function refreshOnce() {
  if (!refreshing) {
    refreshing = api
      .post(API_PATHS.refresh)
      .then(({ data }) => {
        if (!data?.accessToken) throw new Error("refresh senza accessToken");
        onRefreshedFn?.(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const noRetry = [API_PATHS.login, API_PATHS.refresh, API_PATHS.logout, API_PATHS.register];
    if (
      !USE_REFRESH ||
      error?.response?.status !== 401 ||
      !config ||
      config._retried ||
      !config.headers?.Authorization ||
      noRetry.includes(config.url)
    ) {
      throw error;
    }
    config._retried = true;
    try {
      await refreshOnce();
    } catch {
      onSessionLostFn?.();
      throw error;
    }
    // L'interceptor di richiesta rimette il token corrente, già aggiornato.
    return api(config);
  }
);


// 🔁 NOTA: da qui in giù ESPORTIAMO SOLO PATH (niente API_BASE davanti)
export const API_PATHS = {
  // pubblico (v1)
  challenges: (q = "") => `/v1/challenges${q}`,
  challengeDetail: (id) => `/v1/challenges/${id}`,
  challengeLeaderboard: (id, q = '') => `/v1/challenges/${id}/leaderboard${q}`,
  
  // user-centric
  userSubmissions: (q = "") => `/v1/user/submissions${q}`,

  // admin – proposals (v1)
  adminProposals: (q = "") => `/v1/admin/proposals${q}`,
  approveProposal: (id) => `/v1/challenge-proposals/${id}/approve`,
  rejectProposal:  (id) => `/v1/challenge-proposals/${id}/reject`,
  proposalPreflight: (id) => `/v1/admin/proposals/${id}/preflight`,
  draftPreflight: () => `/v1/challenge-proposals/preflight`,

  // admin – judges (v1)
  adminJudges: (q = "") => `/v1/admin/judges${q}`,

  // challenge submissions & review
  challengeSubmissions: (id) => `/v1/challenges/${id}/submissions`,
  submitReview: (id) => `/v1/submissions/${id}/review`,
  dashboard: () => "/v1/auth/dashboard",
  leaderboardUsers: () => "/v1/leaderboard/users",

  // auth
  login:    `/v1/auth/login`,
  refresh:  `/v1/auth/refresh`,
  logout:   `/v1/auth/logout`,
  me:       `/v1/auth/me`,
  register: `/v1/auth/register`,
  
  // sponsorship — sponsor
  sponsorshipRequests:            ()   => `/v1/sponsorship-requests`,
  sponsorshipRequestsMine:        ()   => `/v1/sponsorship-requests/mine`,
  sponsorshipRequestDelete:       (id) => `/v1/sponsorship-requests/${id}`,
  
  // sponsorship — admin
  adminSponsorshipRequests:       (q = "") => `/v1/admin/sponsorship-requests${q}`,
  adminSponsorshipApprove:        (id) => `/v1/admin/sponsorship-requests/${id}/approve`,
  adminSponsorshipReject:         (id) => `/v1/admin/sponsorship-requests/${id}/reject`,
  adminSponsorshipConfirmPayment: (id) => `/v1/admin/sponsorships/${id}/confirm-payment`,

  // ─── events (v1) ──────────────────────────────────────────────────────────
  // Le funzioni con logica più complessa (admin, consent, link challenge)
  // sono direttamente in events.api.js per mantenere questo file leggibile.
  // Qui i path usati da più componenti o dal routing.
  events:          (q = "") => `/v1/events${q}`,
  eventDetail:     (idOrSlug) => `/v1/events/${idOrSlug}`,
  eventSummary:    (id) => `/v1/events/${id}/summary`,
  eventsMine:      () => `/v1/events/mine`,
  adminEvents:     (q = "") => `/v1/admin/events${q}`,
  eventConsent:    (id) => `/v1/events/${id}/consent`,
  eventChallenges: (id) => `/v1/events/${id}/challenges`,
  
  // ─── role requests — utente (richiesta upgrade ruolo: user → sponsor/judge) ─
  roleRequests:            ()        => `/v1/role-requests`,
  roleRequestsMine:        ()        => `/v1/role-requests/mine`,

  // ─── role requests — admin ──────────────────────────────────────────────────
  adminRoleRequests:       (q = "") => `/v1/admin/role-requests${q}`,
  adminRoleRequestApprove: (id)     => `/v1/admin/role-requests/${id}/approve`,
  adminRoleRequestReject:  (id)     => `/v1/admin/role-requests/${id}/reject`,
};
