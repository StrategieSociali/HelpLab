import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, status, error } = useAuth();

  // Stato di caricamento: possiamo mostrare uno spinner o un messaggio
  if (status === 'loading') {
    return <div>Caricamento in corso...</div>;
  }

  // Stato di errore: se riguarda l'autenticazione, possiamo reindirizzare o mostrare un messaggio
  if (status === 'error' || error) {
    return <Navigate to="/login" replace />;
  }

  // Se non autenticato, reindirizza al login
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }

  // Se autenticato, renderizza i figli
  return <>{children}</>;
}

export default ProtectedRoute;
