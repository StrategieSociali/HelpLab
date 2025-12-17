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


export default function UserProfile() {
  const { t } = useTranslation("pages/userProfile", {
  useSuspense: false, // pagina raggiunta da click
});

  const { user, token, loading } = useAuth();

  const navigate = useNavigate();

  const isJudgeUser = isJudge(user?.role);

  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  // Queue per i giudici
  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState("");

  const loadQueue = async ({ append = false } = {}) => {
    if (!user || !token || !isJudgeUser) return;

    setQLoading(true);
    setQError("");
    try {
      const { data } = await api.get("/v1/judge/my-queue", {
        params: { limit: 10, cursor: append ? cursor : undefined },
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setQueue((prev) => (append ? [...prev, ...items] : items));
      setCursor(data?.nextCursor ?? null);
    } catch (err) {
      setQError("load_error");

      if (!append) {
        setQueue([]);
        setCursor(null);
      }
    } finally {
      setQLoading(false);
    }
  };

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


  // Coda giudice
  useEffect(() => {
    if (!user || !token || !isJudgeUser) return;
    loadQueue({ append: false });
  }, [user, token]);

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
            <h3 className="page-title" style={{ marginBottom: 10 }}>
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
          <div className="card" style={{ padding: 16, marginTop: 32 }}>
            <div className="page-header" style={{ marginBottom: 10 }}>
              <h3 className="page-title" style={{ margin: 0 }}>{t("judge.title")}</h3>
              <div className="page-actions" style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-outline btn-pill"
                  onClick={() => loadQueue({ append: false })}
                  disabled={qLoading}
                >
                  {t("judge.refresh")}
                </button>
                <button
                  className="btn btn-outline btn-pill"
                  onClick={() => window.location.href = "/modera"}
                >
                  {t("judge.moderateAll")}
                </button>
              </div>
            </div>

            {qLoading && queue.length === 0 && (
              <div className="callout neutral">{t("judge.loading")}</div>
            )}
           {errorCode && !dashboard && (
  <div className="callout error">
    {t(`judge.errors.${qError}`, {
      defaultValue: t("judge.errors.generic"),
    })}
  </div>
)}
            {!qLoading && !qError && queue.length === 0 && (
              <div className="callout neutral">{t("judge.empty")}</div>
            )}

            {queue.length > 0 && (
              <div className="table-like">
                <div className="row head" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 1fr 120px 160px", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                  <div>{t("judge.table.title")}</div>
                  <div>{t("judge.table.location")}</div>
                  <div>{t("judge.table.deadline")}</div>
                  <div>{t("judge.table.updatedAt")}</div>
                </div>

                {queue.map((ch) => (
                  <div
                    key={ch.id || ch.challengeId}
                    className="row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(220px, 2fr) 1fr 120px 160px",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div className="muted-strong">{ch.title || "—"}</div>
                    <div className="muted">{ch.location || "—"}</div>
                    <div className="muted">{fmtDate(ch.deadline)}</div>
                    <div className="muted">
                      {ch.updatedAt ? new Date(ch.updatedAt).toLocaleString() : "—"}
                      <div style={{ marginTop: 6 }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/challenges/${ch.id}/submissions`)}
                        >
                          {t("judge.table.moderate")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cursor && !qLoading && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <button
                  className="btn btn-outline"
                  onClick={() => loadQueue({ append: true })}
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

