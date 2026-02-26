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


// 🔁 NOTA: da qui in giù ESPORTIAMO SOLO PATH (niente API_BASE davanti)
export const API_PATHS = {
  // pubblico (v1)
  challenges: (q = "") => `/v1/challenges${q}`,
  challengeDetail: (id) => `/v1/challenges/${id}`,
  scoringConfig: () => `/v1/scoring/config`,
  previewScoring: () => `/v1/challenges/preview-scoring`,
  challengeLeaderboard: (id, q = '') => `/v1/challenges/${id}/leaderboard${q}`,
  
  // user-centric
   userSubmissions: (q = "") => `/v1/user/submissions${q}`,

  // admin – proposals (v1)
  adminProposals: (q = "") => `/v1/admin/proposals${q}`,
  approveProposal: (id) => `/v1/challenge-proposals/${id}/approve`,
  rejectProposal:  (id) => `/v1/challenge-proposals/${id}/reject`,

  // admin – judges (v1)
  adminJudges: (q = "") => `/v1/admin/judges${q}`,
  unassigned:  (q = "") => `/v1/challenges/unassigned${q}`,
  assignJudge: (id) => `/v1/challenges/${id}/assign-judge`,

  // challenge submissions & review
  challengeSubmissions: (id) => `/v1/challenges/${id}/submissions`,
  submitReview: (id) => `/v1/submissions/${id}/review`,
  dashboard: () => "/v1/auth/dashboard",
  leaderboardUsers: () => "/v1/leaderboard/users",

  // auth
  login:    `/v1/auth/login`,
  refresh:  `/v1/auth/refresh`,
  me:       `/v1/auth/me`,
  register: `/v1/auth/register`,
};
