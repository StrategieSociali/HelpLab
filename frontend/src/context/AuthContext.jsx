// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, attachToken, API_PATHS } from "@/api/client";

const LS_TOKEN_KEY = "hl_access_token";
const USE_REFRESH = (import.meta.env.VITE_USE_REFRESH || "false") === "true";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // { id, email, username, role }
  const [token, setToken] = useState(null);      // accessToken (solo login)
  const [loading, setLoading] = useState(true);  // init app/auth in corso

  // Intercetta tutte le richieste axios e attacca il Bearer se presente
  useEffect(() => {
    attachToken(() => token);
  }, [token]);

  // Legge profilo/ruolo corrente (richiede Bearer)
  const fetchMe = async () => {
    const { data } = await api.get(API_PATHS.me); // GET /auth/me
    if (data?.user) setUser(data.user);
    return data?.user;
  };

  // Helper: salva/azzera token nello state
  const saveToken = (t) => setToken(t || null);

  // Init: ripristino token da localStorage, refresh (solo se abilitato), e /me SOLO se c’è un token valido
  useEffect(() => {
    (async () => {
      let restored = null;

      // 1) ripristina token precedente (utile in dev)
      try {
        restored = localStorage.getItem(LS_TOKEN_KEY);
        if (restored) saveToken(restored);
      } catch {}

      try {
        // 2) tenta il refresh SOLO se abilitato (in prod). In dev normalmente è false.
        if (USE_REFRESH) {
          try {
            // NB: il refresh rinnova il cookie httpOnly; non ritorna accessToken nel body
            await api.post(API_PATHS.refresh); // POST /auth/refresh
          } catch {
            // ok ignorare 401/429 qui: continueremo con eventuale token ripristinato
          }
        }

        // 3) chiama /me SOLO se abbiamo *un* token (dal login precedente o ripristinato)
        const hasAnyToken = !!(restored || token);
        if (hasAnyToken) {
          await fetchMe();
        } else {
          // nessun token → utente non autenticato
          setUser(null);
        }
      } catch {
        // qualunque errore in init → stato non autenticato “pulito”
        saveToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantieni localStorage allineato al token
  useEffect(() => {
    try {
      if (token) localStorage.setItem(LS_TOKEN_KEY, token);
      else localStorage.removeItem(LS_TOKEN_KEY);
    } catch {}
  }, [token]);

  // ---- Azioni Auth ----
  const login = async (email, password) => {
    const { data } = await api.post(API_PATHS.login, { email, password }); // POST /auth/login
    const accessToken = data?.accessToken;
    if (!accessToken) throw new Error("Nessun accessToken nella risposta di login");
    saveToken(accessToken);
    setUser(data?.user || null);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post(API_PATHS.register, payload); // POST /auth/register
    if (data?.accessToken) {
      saveToken(data.accessToken);
      setUser(data?.user || null);
      return data;
    }
    // se il BE non ritorna token al register, fai login immediato con le credenziali
    if (payload?.email && payload?.password) {
      return login(payload.email, payload.password);
    }
    return data;
  };

  const logout = async () => {
    try { await api.post(API_PATHS.logout); } catch {}
    saveToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token,
      role: user?.role || null,
      login,
      register,
      logout,
      setUser,
      setToken: saveToken, // esposto per casi particolari
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

