import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { setAccessToken as wireAxiosToken } from "@/api/client";

// Storage dev/local
const LS_TOKEN_KEY = "hl_access_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, email, username, role } | null
  const [token, setToken] = useState(null);     // accessToken (JWT) | null
  const [loading, setLoading] = useState(true); // bootstrap in corso

  // --- helpers ---
  const saveToken = (t) => {
    setToken(t || null);
    wireAxiosToken(t || null);
    try {
      if (t) localStorage.setItem(LS_TOKEN_KEY, t);
      else localStorage.removeItem(LS_TOKEN_KEY);
    } catch {}
  };

  const fetchMe = async () => {
    // GET /auth/me → { user: {...} }
    const { data } = await api.get("auth/me");
    if (data?.user) setUser(data.user);
    return data?.user || null;
  };

  // Bootstrap auth: restore token (dev), refresh (prod), quindi /auth/me
  useEffect(() => {
    const USE_REFRESH = (import.meta.env.VITE_USE_REFRESH || "false") === "true";

    (async () => {
      let restored = null;
      try {
        restored = localStorage.getItem(LS_TOKEN_KEY);
        if (restored) {
          // token da sessione precedente (utile in dev)
          saveToken(restored);
        }
      } catch {}

      try {
        if (USE_REFRESH) {
          // prova refresh: se esiste cookie httpOnly lato BE, restituisce un nuovo accessToken
          const { data } = await api.post("auth/refresh");
          if (data?.accessToken) {
            saveToken(data.accessToken);
          }
        }

        // se abbiamo un token valido a questo punto, chiediamo il profilo/ruolo
        if (restored || USE_REFRESH) {
          if (token || restored) {
            await fetchMe();
          }
        }
      } catch (err) {
        // refresh o /me falliti → stato non autenticato
        saveToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ogni volta che cambia token sincronizza axios + storage
  useEffect(() => {
    wireAxiosToken(token || null);
    try {
      if (token) localStorage.setItem(LS_TOKEN_KEY, token);
      else localStorage.removeItem(LS_TOKEN_KEY);
    } catch {}
  }, [token]);

  // --- azioni public API del context ---
  const login = async (email, password) => {
    // POST /auth/login → { user, accessToken }
    const { data } = await api.post("auth/login", { email, password });
    const accessToken = data?.accessToken;
    if (!accessToken) throw new Error("Nessun accessToken nella risposta di login");

    saveToken(accessToken);
    // Imposta subito l’utente ritornato dalla login (ha già il role)
    setUser(data?.user || null);

    // Per robustezza, riallinea con /auth/me (evita desincronizzazioni)
    try { await fetchMe(); } catch {}
    return data;
  };

  const register = async (payload) => {
    // POST /auth/register → 201 { user } (niente token); poi login
    const { data } = await api.post("auth/register", payload);

    if (data?.accessToken) {
      // In caso il BE restituisse anche token (non standard qui), gestiamolo
      saveToken(data.accessToken);
      setUser(data?.user || null);
      try { await fetchMe(); } catch {}
      return data;
    }

    if (payload?.email && payload?.password) {
      return login(payload.email, payload.password);
    }
    return data;
  };

  const logout = async () => {
    try { await api.post("auth/logout"); } catch {}
    saveToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      setUser,   // esposto per eventuali aggiornamenti profilo
      setToken: saveToken, // espone già la logica di sync axios/localStorage
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

