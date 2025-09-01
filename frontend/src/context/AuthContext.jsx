// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, authApi, setAccessToken } from "@/api/client";

const AuthContext = createContext(null);
const USE_REFRESH = import.meta.env.VITE_USE_REFRESH === "true";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // bootstrap: in prod prova refresh (cookie httpOnly); in dev salta
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!USE_REFRESH) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.refresh();
        if (cancelled) return;
        if (data?.accessToken) {
          setAccessToken(data.accessToken);
          setToken(data.accessToken);
          setUser((u) => u || null);
        }
      } catch (_) {
        // anonimi
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    setUser(data.user || null);
    setToken(data.accessToken || null);
    setAccessToken(data.accessToken || null);
    return data.user;
  };

  const register = async (email, password, username) => {
    await authApi.register({ email, password, username });
    return true;
  };

  const logout = async () => {
    if (USE_REFRESH) {
      try { await authApi.logout(); } catch {}
    }
    setUser(null);
    setToken(null);
    setAccessToken(null);
  };

  const value = useMemo(() => ({
    user, token, loading,
    isAuthenticated: !!token,
    login, register, logout,
    api,
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export { AuthContext };

