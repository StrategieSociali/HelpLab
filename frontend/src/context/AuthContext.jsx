import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { setAccessToken as wireAxiosToken } from "@/api/client";

// Chiave per storage locale del token in dev
const LS_TOKEN_KEY = "hl_access_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // inizialmente “checking...”

  // Ripristina token da localStorage (utile in dev: VITE_USE_REFRESH=false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_TOKEN_KEY);
      if (saved) {
        setToken(saved);
        wireAxiosToken(saved); // imposta header Authorization sull’istanza Axios
      }
    } catch {}
    setLoading(false);
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
    // POST auth/login deve restituire { accessToken, user }
    const { data } = await api.post("auth/login", { email, password });
    const accessToken = data?.accessToken;
    if (!accessToken) throw new Error("Nessun accessToken nella risposta di login");
    setToken(accessToken);
    setUser(data?.user || null);
    return data;
  };

  const register = async (payload) => {
    // POST auth/register: se NON ritorna accessToken, facciamo login subito dopo
    const { data } = await api.post("auth/register", payload);
    if (data?.accessToken) {
      setToken(data.accessToken);
      setUser(data?.user || null);
      return data;
    }
    // fallback: auto-login con le credenziali appena create
    if (payload?.email && payload?.password) {
      return login(payload.email, payload.password);
    }
    return data;
  };

  const logout = async () => {
    try { await api.post("auth/logout"); } catch {}
    setToken(null);
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
      setUser,
      setToken, // esposto per casi particolari
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

