// src/api/auth.js
// Client axios centralizzato + funzioni auth.
// Mantiene la compatibilità con REACT_APP_API_URL e aggiunge suggerimenti per il backend.

import axios from 'axios';

// 🔧 URL base dalle env var 
const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL)
    : (process.env.VITE_API_URL || process.env.REACT_APP_API_URL)
  );

// 🏷️ Chiavi di storage (unificate in un unico posto per evitare typo)
export const STORAGE_KEYS = {
  access: 'accessToken',
  refresh: 'refreshToken',
  user: 'userProfile', // opzionale: profilo utente serializzato
};

// ✅ Istanza axios dedicata all'API
export const api = axios.create({
  baseURL: API_URL,
  // Se il backend richiede cookie per refresh token HttpOnly, abilita:
  // withCredentials: true,
});

// 📌 Helper per leggere/scrivere token in localStorage
export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access) || null;
}
export function setAccessToken(token) {
  if (token) localStorage.setItem(STORAGE_KEYS.access, token);
}
export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh) || null;
}
export function setRefreshToken(token) {
  if (token) localStorage.setItem(STORAGE_KEYS.refresh, token);
}
export function clearAuthStorage() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

// ➕ Interceptor per allegare Bearer token a ogni richiesta
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔁 Interceptor di risposta per gestire 401 e tentare un refresh UNA VOLTA per richiesta
let isRefreshing = false;
let pendingRequestsQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Se non è una 401 o abbiamo già ritentato, esci
    if (error?.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Evita loop infiniti
    originalRequest._retry = true;

    // Se non c'è refresh token, fallisci subito
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return Promise.reject(error);
    }

    // Coda le richieste mentre un refresh è in corso
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequestsQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      const newAccess = newTokens?.accessToken;
      const newRefresh = newTokens?.refreshToken; // opzionale

      if (!newAccess) throw new Error('Missing accessToken from refresh response');

      setAccessToken(newAccess);
      if (newRefresh) setRefreshToken(newRefresh);

      // Sblocca le richieste in attesa
      pendingRequestsQueue.forEach((p) => p.resolve(newAccess));
      pendingRequestsQueue = [];

      // Ritenta la richiesta originale con il nuovo token
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshErr) {
      // Fallimento del refresh: rimuovi credenziali locali
      clearAuthStorage();
      pendingRequestsQueue.forEach((p) => p.reject(refreshErr));
      pendingRequestsQueue = [];
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS AUTH (con TODO per il backend)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Effettua login.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ accessToken: string, refreshToken?: string, user?: object }>}
 *
 * 🔧 BACKEND NOTE:
 * - Consigliato rispondere con { accessToken, refreshToken?, user? }
 * - Se usi cookie HttpOnly per refresh, non restituire refreshToken ma imposta il cookie; abilita withCredentials.
 */
export async function login(username, password) {
  try {
    const { data } = await api.post('/login', { username, password });
    return data;
  } catch (error) {
    throw extractMessage(error, 'Login failed. Try again.');
  }
}

/**
 * Registra un utente.
 */
export async function register({ username, email, password }) {
  try {
    const { data } = await api.post('/register', { username, email, password });
    return data;
  } catch (error) {
    throw extractMessage(error, 'Registration failed.');
  }
}

/**
 * Esegue logout lato server (se implementato) e sempre pulisce lo storage locale.
 *
 * 🔧 BACKEND NOTE:
 * - Se gestisci refresh token invalidabili, esporre POST /logout che invalida il refresh.
 */
export async function logout() {
  try {
    // Best effort: se il backend NON ha /logout, questa chiamata può essere omessa.
    // await api.post('/logout');
  } finally {
    clearAuthStorage();
  }
}

/**
 * Richiede un nuovo access token.
 *
 * 🔧 BACKEND NOTE:
 * - Esporre POST /refresh che accetta { refreshToken } o usa cookie HttpOnly.
 * - Rispondere con { accessToken, refreshToken? }.
 */
export async function refreshAccessToken(refreshToken) {
  // Se il backend usa cookie HttpOnly, puoi ignorare l’argomento e inviare una POST vuota con withCredentials.
  const { data } = await api.post('/refresh', { refreshToken });
  return data; // { accessToken, refreshToken? }
}

/**
 * Opzionale: recupera profilo utente corrente.
 *
 * 🔧 BACKEND NOTE:
 * - Esporre GET /me che ritorna il profilo.
 */
export async function fetchMe() {
  const { data } = await api.get('/me');
  return data; // user object
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
