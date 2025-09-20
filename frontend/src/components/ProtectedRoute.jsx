// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

<<<<<<< HEAD
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Evita flicker mentre l'AuthContext sta inizializzando
  if (loading) return null;

  if (!isAuthenticated) {
    // Passa la rotta di provenienza per tornare lì dopo il login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

=======
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

>>>>>>> release/v0.4.1
