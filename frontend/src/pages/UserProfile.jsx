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

export default function UserProfile() {
  const { user, token, logout, loading } = useAuth();
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
      setQError("Errore nel caricamento della coda");
      if (!append) {
        setQueue([]);
        setCursor(null);
      }
    } finally {
      setQLoading(false);
    }
  };

  // Carica dati da /v1/dashboard
  useEffect(() => {
    if (!token) return;

    api
      .get(API_PATHS.dashboard())
      .then((res) => {
        setDashboard(res.data);
      })
      .catch((err) => {
        console.error("Errore nel caricamento del profilo:", err);
        setError("Errore durante il caricamento del profilo.");
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
        <div className="container">Caricamento…</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-section page-text">
        <div className="container">Non sei loggato.</div>
      </section>
    );
  }

  const dashboardUser = dashboard?.user;

  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">Profilo</h2>

        {/* Card utente – ordine B */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            {dashboardUser?.username && (
              <div><strong>Username:</strong> {dashboardUser.username}</div>
            )}

            {dashboardUser?.nickname && (
              <div><strong>Nickname:</strong> {dashboardUser.nickname}</div>
            )}

            <div><strong>Email:</strong> {dashboardUser?.email ?? user.email}</div>

            {dashboardUser?.role && (
              <div><strong>Ruolo:</strong> {dashboardUser.role}</div>
            )}

            <div><strong>ID:</strong> {dashboardUser?.id ?? user.id}</div>

            {dashboard?.totalPoints != null && (
              <div><strong>Punti totali:</strong> {dashboard.totalPoints}</div>
            )}

            {dashboard?.totalVerified != null && (
              <div><strong>Tasks verificati:</strong> {dashboard.totalVerified}</div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Submissions utente */}
        {dashboard?.submissions?.length > 0 && (
          <div className="card" style={{ padding: 16, marginTop: 24 }}>
            <h3 className="page-title" style={{ marginBottom: 10 }}>
              Le tue submission
            </h3>
            <ul className="space-y-2">
              {dashboard.submissions.map((sub) => (
                <li key={sub.id} className="border rounded p-3">
                  <div>
                    <strong>Challenge:</strong> #{sub.challengeId}
                  </div>
                  <div>
                    <strong>Attività:</strong> {sub.activity}
                  </div>
                  <div className="muted small">
                    Stato: {sub.status} &middot; Punti: {sub.points ?? 0}
                  </div>
                  <div className="muted small">
                    Inviata: {fmtDate(sub.createdAt)} &middot; Verificata: {fmtDate(sub.reviewedAt)}
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
              <h3 className="page-title" style={{ margin: 0 }}>Le mie sfide da giudicare</h3>
              <div className="page-actions" style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-outline btn-pill"
                  onClick={() => loadQueue({ append: false })}
                  disabled={qLoading}
                >
                  Aggiorna
                </button>
                <button
                  className="btn btn-outline btn-pill"
                  onClick={() => window.location.href = "/modera"}
                >
                  Modera le submission
                </button>
              </div>
            </div>

            {qLoading && queue.length === 0 && (
              <div className="callout neutral">Caricamento…</div>
            )}
            {qError && !qLoading && (
              <div className="callout error">{qError}</div>
            )}
            {!qLoading && !qError && queue.length === 0 && (
              <div className="callout neutral">Nessuna sfida in coda al momento.</div>
            )}

            {queue.length > 0 && (
              <div className="table-like">
                <div className="row head" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 1fr 120px 160px", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                  <div>Titolo</div>
                  <div>Luogo</div>
                  <div>Scadenza</div>
                  <div>Aggiornata</div>
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
                          Modera la submission
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
                  Carica altri
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

