import axios from 'axios';

const RAW = import.meta.env.VITE_API_URL;
const BASE_URL = (RAW && RAW.trim() ? RAW : 'https://api.helplab.space/api').replace(/\/+$/, '');
const USE_REFRESH = (import.meta.env.VITE_USE_REFRESH || 'false') === 'true';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // serve per cookie httpOnly del refresh in prod
});

if (import.meta.env.DEV) {
  console.log('[API] baseURL =', api.defaults.baseURL, 'USE_REFRESH =', USE_REFRESH);
}

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };

api.interceptors.request.use(cfg => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

// Interceptor 401→refresh: abilitarlo solo quando USE_REFRESH=true (prod o dev con CORS ok)
if (USE_REFRESH) {
  api.interceptors.response.use(
    r => r,
    async (err) => {
      const orig = err?.config;
      if (!orig || orig.__retry) throw err;
      if (err?.response?.status !== 401) throw err;
      await api.post('auth/refresh'); // niente slash iniziale
      orig.__retry = true;
      return api(orig);
    }
  );
}

