// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, redirectTo = "/login" }) {
  const { isAuthenticated, loading } = useAuth();

  // Evita flicker/redirect finché il refresh (cookie) non ha risposto
  if (loading) return null; // oppure uno spinner

  return isAuthenticated ? children : <Navigate to={redirectTo} replace />;
}

