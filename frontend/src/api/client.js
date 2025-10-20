// src/api/client.js
import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

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


// 🔁 NOTA: da qui in giù ESPORTIAMO SOLO PATH (niente API_BASE davanti)
export const API_PATHS = {
  // pubblico (v1)
  challenges: (q = "") => `/v1/challenges${q}`,        // ?limit=&cursor=
  challengeDetail: (id) => `/v1/challenges/${id}`,

  // admin – proposals (v1)
  adminProposals: (q = "") => `/v1/admin/proposals${q}`,
  approveProposal: (id) => `/v1/challenge-proposals/${id}/approve`,
  rejectProposal:  (id) => `/v1/challenge-proposals/${id}/reject`,

  // admin – judges (v1)
  adminJudges: (q = "") => `/v1/admin/judges${q}`,
  unassigned:  (q = "") => `/v1/challenges/unassigned${q}`,
  assignJudge: (id) => `/v1/challenges/${id}/assign-judge`,

  // auth
  login:   `/auth/login`,
  refresh: `/auth/refresh`,
  me:      `/auth/me`,
};

