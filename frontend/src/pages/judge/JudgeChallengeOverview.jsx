// src/pages/judge/JudgeChallengeOverview.jsx
/**
 * Scopo: vista operativa del giudice su una challenge
 *
 * Attualmente supporta:
 * - overview challenge + tasks (GET /api/v1/judge/challenges/:id/overview)
 * - lista submissions della challenge (GET /api/v1/challenges/:id/submissions)
 * - approva/rifiuta submission con punti e task_id (POST /api/v1/submissions/:id/review)
 *
 * Note:
 * - usa endpoint definitivi v1.0 (no legacy /judge/my-queue)
 * - task_id è obbligatorio in review
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import { getJudgeChallengeOverview } from "@/api/judge.api";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

async function fetchChallengeSubmissions(token, challengeId, cursor = null) {
  const params = new URLSearchParams();
  params.set("limit", "20");
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${API_BASE}/v1/challenges/${challengeId}/submissions?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Errore caricamento submissions");
  return res.json();
}

async function reviewSubmission(token, submissionId, body) {
  const res = await fetch(`${API_BASE}/v1/submissions/${submissionId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // backend esplicito: 400/401/403/404...
  if (!res.ok) {
    let msg = "Errore durante la revisione";
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export default function JudgeChallengeOverview() {
  const { id } = useParams();
  const { token } = useAuth();

  const [overview, setOverview] = useState(null);
  const [oLoading, setOLoading] = useState(true);
  const [oError, setOError] = useState("");

  const [subs, setSubs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [sLoading, setSLoading] = useState(false);
  const [sError, setSError] = useState("");

  // form state per ogni submission
  const [forms, setForms] = useState({}); // { [subId]: { task_id, points, note, busy, err } }

  const tasks = overview?.tasks || [];

  const taskOptions = useMemo(
    () =>
      tasks.map((t) => ({
        id: t.id,
        label: t.title,
        max_points: t.max_points,
        co2_quota: t.co2_quota,
        assigned_points: t.assigned_points,
      })),
    [tasks]
  );

  useEffect(() => {
    if (!token || !id) return;

    setOLoading(true);
    setOError("");
    getJudgeChallengeOverview(token, id)
      .then((data) => setOverview(data))
      .catch((e) => setOError(e.message || "Errore caricamento overview"))
      .finally(() => setOLoading(false));
  }, [token, id]);

  const loadSubmissions = async ({ reset = false } = {}) => {
    if (!token || !id) return;
    setSLoading(true);
    setSError("");

    try {
      const data = await fetchChallengeSubmissions(token, id, reset ? null : nextCursor);
      const items = Array.isArray(data?.items) ? data.items : [];

      setSubs((prev) => (reset ? items : [...prev, ...items]));
      setNextCursor(data?.nextCursor ?? null);

      // init forms per nuove submissions
      setForms((prev) => {
        const next = { ...prev };
        for (const s of items) {
          if (!next[s.id]) next[s.id] = { task_id: "", points: "", note: "", busy: false, err: "" };
        }
        return next;
      });
    } catch (e) {
      setSError(e.message || "Errore caricamento submissions");
    } finally {
      setSLoading(false);
    }
  };

  useEffect(() => {
    // carica submissions dopo overview (ma non dipende da essa)
    if (!token || !id) return;
    loadSubmissions({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const pendingSubs = useMemo(() => subs.filter((s) => s.status === "pending"), [subs]);
  const reviewedSubs = useMemo(() => subs.filter((s) => s.status !== "pending"), [subs]);

  const setForm = (subId, patch) => {
    setForms((prev) => ({ ...prev, [subId]: { ...(prev[subId] || {}), ...patch } }));
  };

  const onApprove = async (sub) => {
    const f = forms[sub.id] || {};
    if (!f.task_id) {
      setForm(sub.id, { err: "Seleziona un task prima di approvare." });
      return;
    }
    if (f.points === "" || Number.isNaN(Number(f.points))) {
      setForm(sub.id, { err: "Inserisci i punti (numero) per approvare." });
      return;
    }

    setForm(sub.id, { busy: true, err: "" });
    try {
      await reviewSubmission(token, sub.id, {
        decision: "approved",
        task_id: Number(f.task_id),
        points: Number(f.points),
        note: f.note?.trim() || undefined,
      });

      // refresh: ricarico la prima pagina per stato coerente
      await loadSubmissions({ reset: true });
      // refresh overview per assigned_points aggiornati
      const ov = await getJudgeChallengeOverview(token, id);
      setOverview(ov);
    } catch (e) {
      setForm(sub.id, { err: e.message || "Errore approvazione" });
    } finally {
      setForm(sub.id, { busy: false });
    }
  };

  const onReject = async (sub) => {
    const f = forms[sub.id] || {};
    if (!f.task_id) {
      setForm(sub.id, { err: "Seleziona un task prima di rifiutare." });
      return;
    }

    setForm(sub.id, { busy: true, err: "" });
    try {
      await reviewSubmission(token, sub.id, {
        decision: "rejected",
        task_id: Number(f.task_id),
        note: f.note?.trim() || undefined,
      });

      await loadSubmissions({ reset: true });
      const ov = await getJudgeChallengeOverview(token, id);
      setOverview(ov);
    } catch (e) {
      setForm(sub.id, { err: e.message || "Errore rifiuto" });
    } finally {
      setForm(sub.id, { busy: false });
    }
  };

  if (oLoading) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <TextBlock>Caricamento overview…</TextBlock>
        </div>
      </section>
    );
  }

  if (oError) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <div className="card" style={{ padding: 16 }}>
            <h2 className="page-title">Errore</h2>
            <p className="muted">{oError}</p>
          </div>
        </div>
      </section>
    );
  }

  const ch = overview?.challenge;

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">{ch?.title || `Challenge #${id}`}</h1>
        <p className="muted">
          Tipo: <strong>{ch?.type || "—"}</strong>
          {" · "}
          CO₂ approvata: <strong>{ch?.approved_co2 ?? "—"}</strong>
          {" · "}
          Punti max: <strong>{ch?.max_points ?? "—"}</strong>
        </p>

        {/* TASKS */}
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h2 className="page-title" style={{ marginBottom: 10 }}>Task</h2>

          {taskOptions.length === 0 ? (
            <TextBlock>Nessun task disponibile.</TextBlock>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {taskOptions.map((t) => {
                const max = t.max_points ?? null;
                const assigned = t.assigned_points ?? 0;
                const remaining = max == null ? null : Math.max(0, max - assigned);

                return (
                  <div key={t.id} className="callout neutral" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong>{t.label}</strong>
                        <div className="muted small">
                          max_points: {t.max_points ?? "—"} · co2_quota: {t.co2_quota ?? "—"}
                        </div>
                      </div>
                      <div className="muted small" style={{ textAlign: "right" }}>
                        assegnati: <strong>{assigned}</strong>
                        {remaining != null && (
                          <>
                            {" · "}
                            residui: <strong>{remaining}</strong>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SUBMISSIONS */}
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h2 className="page-title" style={{ marginBottom: 10 }}>Submissions</h2>

          {sError && <div className="callout error">{sError}</div>}
          {sLoading && subs.length === 0 && <div className="callout neutral">Caricamento…</div>}

          {/* PENDING */}
          <div style={{ marginTop: 10 }}>
            <h3 className="page-subtitle" style={{ marginBottom: 10 }}>
              In attesa ({pendingSubs.length})
            </h3>

            {pendingSubs.length === 0 ? (
              <div className="callout neutral">Nessuna submission pending 🎉</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pendingSubs.map((s) => {
                  const f = forms[s.id] || {};
                  return (
                    <div key={s.id} className="callout neutral" style={{ padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>#{s.id}</strong> {s.author ? `· ${s.author}` : ""}
                          <div className="muted small">
                            inviato: {fmtDate(s.createdAt)} · visibilità: {s.visibility}
                          </div>
                        </div>
                        <div className="muted small">status: <strong>{s.status}</strong></div>
                      </div>

                      {s.activity && <p style={{ marginTop: 10, marginBottom: 10 }}>{s.activity}</p>}

                      <div style={{ display: "grid", gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Task</label>
                          <select
                            value={f.task_id}
                            onChange={(e) => setForm(s.id, { task_id: e.target.value })}
                          >
                            <option value="">Seleziona task…</option>
                            {taskOptions.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Punti (solo se approvi)</label>
                          <input
                            type="number"
                            min="0"
                            value={f.points}
                            onChange={(e) => setForm(s.id, { points: e.target.value })}
                            placeholder="Es. 30"
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Nota (facoltativa)</label>
                          <textarea
                            rows={3}
                            value={f.note}
                            onChange={(e) => setForm(s.id, { note: e.target.value })}
                            placeholder="Scrivi una breve nota…"
                          />
                        </div>

                        {f.err && <div className="callout error">{f.err}</div>}

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-primary btn-pill"
                            disabled={f.busy}
                            onClick={() => onApprove(s)}
                          >
                            {f.busy ? "…" : "Approva"}
                          </button>
                          <button
                            className="btn btn-outline btn-pill"
                            disabled={f.busy}
                            onClick={() => onReject(s)}
                          >
                            {f.busy ? "…" : "Rifiuta"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* REVIEWED */}
          <div style={{ marginTop: 24 }}>
            <h3 className="page-subtitle" style={{ marginBottom: 10 }}>
              Già revisionate ({reviewedSubs.length})
            </h3>

            {reviewedSubs.length === 0 ? (
              <div className="muted small">Nessuna submission revisionata in questa pagina.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {reviewedSubs.map((s) => (
                  <div key={s.id} className="callout neutral" style={{ padding: 12, opacity: 0.9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong>#{s.id}</strong> {s.author ? `· ${s.author}` : ""}
                        <div className="muted small">
                          reviewed: {fmtDate(s.reviewedAt)} · points: {s.points ?? "—"}
                        </div>
                      </div>
                      <div className="muted small">status: <strong>{s.status}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {nextCursor && (
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button
                className="btn btn-ghost"
                disabled={sLoading}
                onClick={() => loadSubmissions({ reset: false })}
              >
                {sLoading ? "Caricamento…" : "Carica altre"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
