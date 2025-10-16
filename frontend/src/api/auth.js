// src/api/auth.js
import { api, setAccessToken } from './client';  // ⬅️ usa il client centralizzato

export const STORAGE_KEYS = {
  access: 'accessToken',
  refresh: 'refreshToken',   // tienilo solo se NON usi cookie httpOnly
  user: 'userProfile',
};

// opzionale: se vuoi localStorage anche col client centralizzato
export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access) || null;
}
export function setAccess(token) {                 // wrapper che aggiorna anche il client
  if (token) localStorage.setItem(STORAGE_KEYS.access, token);
  setAccessToken(token);
}
export function clearAuthStorage() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

// ENDPOINTS CORRETTI (tutti sotto /auth/*)
export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  // sincronizza il token anche nel client
  if (data?.accessToken) setAccess(data.accessToken);
  return data;
}

export async function register({ username, email, password }) {
  const { data } = await api.post('/auth/register', { username, email, password });
  return data;
}

export async function logout() {
  try { await api.post('/auth/logout'); } finally { clearAuthStorage(); setAccessToken(null); }
}

export async function refreshAccessToken() {
  // backend usa cookie httpOnly: nessun body, serve withCredentials (già ON in client.js)
  const { data } = await api.post('/auth/refresh');
  if (data?.accessToken) setAccess(data.accessToken);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data; // { id, email, username, role }
}


// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function extractMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}
