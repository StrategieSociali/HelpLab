// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

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

