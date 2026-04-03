// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Mentre verifichiamo la sessione (es. refresh in prod)
  if (loading) {
    return <div>Caricamento in corso…</div>;
  }

  // Se non autenticato, vai al login e conserva da dove venivi
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Se autenticato, mostra il contenuto protetto
  return <>{children}</>;
}

export default ProtectedRoute;

