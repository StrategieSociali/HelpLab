// src/pages/UserProfile.jsx
/**
 * Scopo: costruire una pagina utente con tutte le informazioni utili
 *
 * Attualmente supporta:
 * Esposizione anagrafica
 * Esposizione ruolo
 * Esposizione attività challenge
 * Logout.
 */
// src/pages/UserProfile.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, API_PATHS } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { isJudge } from "@/utils/roles";
import { useTranslation } from "react-i18next";
import LogoutButton from "@/components/common/LogoutButton";
import "../styles/dynamic-pages.css";


export default function UserProfile() {
  const { t } = useTranslation("pages/userProfile", {
  useSuspense: false, // pagina raggiunta da click
});

  const { user, token, loading } = useAuth();

  const navigate = useNavigate();

  const isJudgeUser = isJudge(user?.role);

  const [dashboard, setDashboard] = useState(null);

  // Carica dati da /v1/dashboard
  const [errorCode, setErrorCode] = useState(null);
useEffect(() => {
  if (!token) return;

  api
    .get(API_PATHS.dashboard())
    .then((res) => {
      setDashboard(res.data);
    })
    .catch((err) => {
      console.error("Profile load error:", err);
      setErrorCode("profile_load_error");
    });
}, [token]);


  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  // UI: stati di attesa
  if (loading) {
    return (
      <section className="page-section page-text">
        <div className="container">{t("states.loading")}</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-section page-text">
        <div className="container">{t("states.notAuthenticated")}</div>
      </section>
    );
  }

  const dashboardUser = dashboard?.user;

  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">{t("title")}</h2>
        
        {/* Render errore di caricamento */}
        {errorCode && (
  <div className="callout error">
    {t(`errors.${errorCode}`, {
      defaultValue: t("errors.generic"),
    })}
  </div>
)}


        {/* Card utente – ordine B */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            {dashboardUser?.username && (
              <div><strong>{t("fields.username")}:</strong> {dashboardUser.username}</div>
            )}

            {dashboardUser?.nickname && (
              <div><strong>{t("fields.nickname")}:</strong> {dashboardUser.nickname}</div>
            )}

            <div><strong>{t("fields.email")}:</strong> {dashboardUser?.email ?? user.email}</div>

            {dashboardUser?.role && (
              <div><strong>{t("fields.role")}:</strong> {dashboardUser.role}</div>
            )}

            <div><strong>{t("fields.id")}:</strong> {dashboardUser?.id ?? user.id}</div>

            {dashboard?.totalPoints != null && (
              <div><strong>{t("fields.totalPoints")}:</strong> {dashboard.totalPoints}</div>
            )}

            {dashboard?.totalVerified != null && (
              <div><strong>{t("fields.totalVerified")}:</strong> {dashboard.totalVerified}</div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <LogoutButton />
          </div>
        </div>

        {/* Submissions utente */}
        {dashboard?.submissions?.length > 0 && (
          <div className="card" style={{ padding: 16, marginTop: 24 }}>
            <h3 className="dynamic-title" style={{ marginBottom: 10 }}>
              {t("submissions.title")}
            </h3>
            <ul className="space-y-2">
              {dashboard.submissions.map((sub) => (
                <li key={sub.id} className="border rounded p-3">
                  <div>
                    <strong>{t("submissions.challenge")}</strong> #{sub.challengeId}
                  </div>
                  <div>
                    <strong> {t("submissions.activity")}</strong> {sub.activity}
                  </div>
                  <div className="muted small">
                    {t("submissions.status")} {sub.status} &middot; {t("submissions.points")} {sub.points ?? 0}
                  </div>
                  <div className="muted small">
                   {t("submissions.submittedAt")} {fmtDate(sub.createdAt)} &middot; {t("submissions.reviewedAt")} {fmtDate(sub.reviewedAt)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        
        {/* Sezione giudice */}
        
        {isJudgeUser && (
  <div className="card" style={{ padding: 16, marginTop: 24 }}>
    <h3 className="dynamic-title">{t("judge.title")}</h3>
    <p className="muted">
      Accedi alla tua area di moderazione per valutare le challenge assegnate.
    </p>

    <button
      className="btn btn-outline"
      onClick={() => navigate("/judge")}
    >
      Vai all’area giudice
    </button>
  </div>
)}
        
        {dashboardUser?.role === 'sponsor' && (
  <div className="card" style={{ padding: 16, marginTop: 24 }}>
    <h3 className="dynamic-title">Profilo Sponsor</h3>
    <p className="muted">
      Gestisci le informazioni pubbliche della tua organizzazione
    </p>

    <button
      className="btn btn-outline"
      onClick={() => navigate('/dashboard/sponsor')}
    >
      Modifica profilo sponsor
    </button>
  </div>
)}
      </div>
    </section>
  );
}

