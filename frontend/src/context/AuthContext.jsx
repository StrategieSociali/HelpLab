import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { setAccessToken as wireAxiosToken } from "@/api/client";

const LS_TOKEN_KEY = "hl_access_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap auth: restore da localStorage (dev) + refresh silenzioso (prod, se abilitato)
useEffect(() => {
  const USE_REFRESH = (import.meta.env.VITE_USE_REFRESH || "false") === "true";

  (async () => {
    let saved = null;
    try {
      saved = localStorage.getItem(LS_TOKEN_KEY);
      if (saved) {
        setToken(saved);
        wireAxiosToken(saved);
      }
    } catch {}

    // In produzione: valida sempre lo stato via refresh anche se hai un token salvato.
    if (USE_REFRESH) {
      try {
        const { data } = await api.post("auth/refresh");
        const t = data?.accessToken;
        if (t) {
          setToken(t);
          wireAxiosToken(t);
          try { localStorage.setItem(LS_TOKEN_KEY, t); } catch {}
        } else {
          // niente token nuovo → considera non autenticato
          setToken(null);
          setUser(null);
          try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
        }
      } catch {
        // refresh fallito → stato non autenticato (evita "falsi login")
        setToken(null);
        setUser(null);
        try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
      }
    }
  })().finally(() => setLoading(false));
}, []);


  // Ogni volta che cambia token → aggiorna axios + storage
  useEffect(() => {
    wireAxiosToken(token || null);
    try {
      if (token) localStorage.setItem(LS_TOKEN_KEY, token);
      else localStorage.removeItem(LS_TOKEN_KEY);
    } catch {}
  }, [token]);

  const login = async (email, password) => {
    const { data } = await api.post("auth/login", { email, password });
    const accessToken = data?.accessToken;
    if (!accessToken) throw new Error("Nessun accessToken nella risposta di login");
    setToken(accessToken);
    setUser(data?.user || null);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("auth/register", payload);
    if (data?.accessToken) {
      setToken(data.accessToken);
      setUser(data?.user || null);
      return data;
    }
    if (payload?.email && payload?.password) {
      return login(payload.email, payload.password);
    }
    return data;
  };

  const logout = async () => {
    try { await api.post("auth/logout"); } catch {}
    setToken(null);
    setUser(null);
    try { localStorage.removeItem(LS_TOKEN_KEY); } catch {}
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
      setUser,
      setToken,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

