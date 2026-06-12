// src/components/common/LogoutButton.jsx
/**
 * Scopo: permettere il logout dell’utente
 *
 * Utilizzato in:
 * - Header
 * - Menu utente
 * - Altri contesti globali
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export default function LogoutButton({ onAfterLogout }) {
  const { t } = useTranslation("components/common/logout", {
    useSuspense: false,
  });

  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    onAfterLogout?.(); // 👈 callback opzionale
    navigate("/login");
  };

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={handleLogout}
    >
      {t("label")}
    </button>
  );
}


