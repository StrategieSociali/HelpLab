// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
} from '../api/auth';

// ✅ Esportiamo anche il contesto per retro-compatibilità
export const AuthContext = createContext(null);

// ✅ Hook consigliato nei componenti (Login, ProtectedRoute, ecc.)
export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  // user retro-compatibile con i componenti esistenti: { token }
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle');   // idle | loading | ready | error
  const [error, setError] = useState(null);       // stringa o oggetto

  // 🔰 Bootstrap: leggi il token al primo caricamento
  useEffect(() => {
    setStatus('loading');
    try {
      const token = localStorage.getItem('token');
      if (token && token.trim()) {
        setUser({ token });
      }
      setStatus('ready');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, []);

  // 🔐 Login
  const login = useCallback(async (username, password) => {
    setError(null);
    setStatus('loading');
    try {
      // auth.js ritorna { token } oppure { accessToken }
      const data = await loginApi(username, password);
      const accessToken = data?.token || data?.accessToken;
      if (!accessToken) throw new Error('Token mancante nella risposta di login.');

      // Salva token e aggiorna stato
      localStorage.setItem('token', accessToken);
      setUser({ token: accessToken });
      setStatus('ready');
      return data;
    } catch (e) {
      setError(typeof e === 'string' ? e : (e?.message || 'Login failed.'));
      setStatus('error');
      throw e;
    }
  }, []);

  // 🆕 Register (pass-through) — usalo se ti serve nella pagina di registrazione
  const register = useCallback(async ({ username, email, password }) => {
    setError(null);
    setStatus('loading');
    try {
      const data = await registerApi(username, email, password);
      setStatus('ready');
      return data;
    } catch (e) {
      setError(typeof e === 'string' ? e : (e?.message || 'Registration failed.'));
      setStatus('error');
      throw e;
    }
  }, []);

  // 🚪 Logout
  const logout = useCallback(async () => {
    setError(null);
    setStatus('loading');
    try {
      await logoutApi(); // in auth.js rimuove già il token dal localStorage
    } finally {
      // doppia sicurezza
      try { localStorage.removeItem('token'); } catch {}
      setUser(null);
      setStatus('ready');
    }
  }, []);

  const value = useMemo(() => ({
    user,       // { token }
    status,     // 'idle' | 'loading' | 'ready' | 'error'
    error,
    login,
    register,
    logout,
  }), [user, status, error, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

