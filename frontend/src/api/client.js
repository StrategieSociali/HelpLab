import axios from "axios";

const RAW = import.meta.env.VITE_API_URL;
// In dev metti /api nel tuo .env.development.local; in prod l'URL pieno.
// Rimuoviamo eventuali slash finali.
const BASE_URL = (RAW && RAW.trim() ? RAW : "/api").replace(/\/+$/, "");
const USE_REFRESH = (import.meta.env.VITE_USE_REFRESH || "false") === "true";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // necessario per inviare il cookie httpOnly di refresh
});

// Log utile anche in PROD (temporaneo): vedi dove stai puntando davvero
if (import.meta.env.DEV) {
  console.log("[API] baseURL =", api.defaults.baseURL, "USE_REFRESH =", USE_REFRESH);
}
if (import.meta.env.PROD) {
  console.log("[API-PROD] baseURL =", api.defaults.baseURL, "USE_REFRESH =", USE_REFRESH);
}

// Token in memoria + setter esportato per AuthContext
let accessToken = null;
export const setAccessToken = (t) => {
  accessToken = t || null;
};

// Authorization header su ogni richiesta se abbiamo il token
api.interceptors.request.use((cfg) => {
  if (accessToken) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

// 401 -> refresh (solo se abilitato)
if (USE_REFRESH) {
  api.interceptors.response.use(
    (r) => r,
    async (err) => {
      const orig = err?.config;
      const status = err?.response?.status;

      if (!orig || orig.__retry) {
        // niente retry o già ritentata
        throw err;
      }

      if (status !== 401) {
        throw err;
      }

      try {
        // prova refresh: il BE prende il cookie httpOnly e ritorna { accessToken }
        const { data } = await api.post("auth/refresh");
        const newToken = data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          orig.__retry = true;
          // ritenta la richiesta originale con il nuovo token
          return api(orig);
        }
      } catch (e) {
        // fallito il refresh: propaga l’errore 401
      }

      throw err;
    }
  );
}

