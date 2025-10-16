// src/pages/UserProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";

export default function UserProfile() {
  const { user, token, logout, loading } = useAuth();

  // ---- Stato coda giudice ----
  const isJudge = user?.role === "judge";
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState("");

  const loadQueue = async ({ append = false } = {}) => {
    if (!isJudge || !token) return;
    setQLoading(true);
    setQError("");
    try {
      const { data } = await api.get("/v1/judge/my-queue", {
        params: { limit: 10, cursor: append ? cursor : undefined },
        headers: authHeaders,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setQueue((prev) => (append ? [...prev, ...items] : items));
      setCursor(data?.nextCursor ?? null);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Errore nel caricamento della coda";
      setQError(msg);
      if (!append) {
        setQueue([]);
        setCursor(null);
      }
    } finally {
      setQLoading(false);
    }
  };

  useEffect(() => {
    // reset e fetch quando divento giudice o cambio token
    setQueue([]);
    setCursor(null);
    setQError("");
    if (isJudge && token) loadQueue({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJudge, token]);

  // ---- UI di base profilo ----
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

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">Profilo</h2>

        {/* Dati utente */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            {user.username && <div><strong>Username:</strong> {user.username}</div>}
            {user.role && <div><strong>Ruolo:</strong> {user.role}</div>}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Sezione giudice */}
        {isJudge && (
          <div className="card" style={{ padding: 16 }}>
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
                {/* intestazione */}
                <div className="row head" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 1fr 120px 160px", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                  <div>Titolo</div>
                  <div>Luogo</div>
                  <div>Scadenza</div>
                  <div>Aggiornata</div>
                </div>

                {/* righe */}
                {queue.map((ch) => (
                  <div
                    key={ch.id || ch.challengeId}
                    className="row"
                    style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 1fr 120px 160px", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}
                  >
                    <div className="muted-strong">{ch.title || "—"}</div>
                    <div className="muted">{ch.location || "—"}</div>
                    <div className="muted">{fmtDate(ch.deadline)}</div>
                    <div className="muted">{ch.updatedAt ? new Date(ch.updatedAt).toLocaleString() : "—"}</div>
                  </div>
                ))}
              </div>
            )}

            {/* paginazione */}
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

