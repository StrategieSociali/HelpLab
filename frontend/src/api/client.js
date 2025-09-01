// src/api/client.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";
const USE_API = import.meta.env.VITE_USE_API === "true";
const USE_REFRESH = import.meta.env.VITE_USE_REFRESH === "true";

const baseURL = USE_API ? `${API_URL.replace(/\/$/, "")}/api` : "/api";

// Istanza principale per TUTTE le API
export const api = axios.create({
  baseURL,
  withCredentials: USE_REFRESH, // cookie solo se abilitato (prod)
});

// --- Token in memoria (niente localStorage) ---
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t || null; };
export const getAccessToken = () => accessToken;

// Iniettiamo il Bearer se c’è
api.interceptors.request.use((config) => {
  const t = getAccessToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Istanza separata per le chiamate di auth (evitiamo ricorsioni)
const auth = axios.create({ baseURL, withCredentials: USE_REFRESH });

// Refresh-once per richiesta (evita loop)
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;

    const isAuthPath =
      config?.url?.includes("/auth/login") ||
      config?.url?.includes("/auth/register") ||
      config?.url?.includes("/auth/refresh") ||
      config?.url?.includes("/auth/logout");

    // Prova il refresh SOLO se abilitato
    if (USE_REFRESH && status === 401 && !isAuthPath && !config.__isRetryRequest) {
      try {
        if (!refreshing) {
          refreshing = auth.post("/auth/refresh", {}); // cookie httpOnly
        }
        const { data } = await refreshing;
        refreshing = null;

        const newToken = data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          config.__isRetryRequest = true;
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(config);
        }
      } catch (e) {
        refreshing = null;
        // refresh fallito → prosegui col 401
      }
    }

    return Promise.reject(error);
  }
);

// helper per auth API
export const authApi = {
  register: (payload) => auth.post("/auth/register", payload),
  login: (payload)    => auth.post("/auth/login",    payload),
  refresh: ()         => auth.post("/auth/refresh",  {}),   // usato solo se USE_REFRESH
  logout: ()          => auth.post("/auth/logout",   {}),   // usato solo se USE_REFRESH
};

