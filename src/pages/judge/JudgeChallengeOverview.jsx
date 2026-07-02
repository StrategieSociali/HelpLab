// src/pages/judge/JudgeChallengeOverview.jsx
/**
 * JudgeChallengeOverview.jsx
 * --------------------------
 * Vista operativa principale del giudice su una singola challenge assegnata.
 *
 * SCOPO
 * Permette di:
 * - comprendere la struttura della challenge (task, limiti, metriche)
 * - analizzare le submission inviate dai volontari
 * - validare o rifiutare i contributi in modo strutturato e tracciabile
 *
 * FLUSSO
 * Il volontario ha già scelto il task al momento della creazione della submission.
 * Il giudice vede a quale task è collegata ogni submission e decide
 * se approvare (con punteggio) o rifiutare (con nota).
 *
 * FUNZIONALITÀ SUPPORTATE
 * - Overview challenge e task associati
 *   GET /api/v1/judge/challenges/:id/overview
 *
 * - Lista paginata delle submission della challenge
 *   GET /api/v1/challenges/:id/submissions
 *
 * - Presa in carico esplicita (claim-first, multi-giudice §3)
 *   POST /api/v1/submissions/:id/claim   → prenota la submission (409 se già di altri)
 *   POST /api/v1/submissions/:id/release → rilascia (giudice: la propria; admin: qualsiasi)
 *   La lista submission espone claimedBy / claimedByName (claim attivo).
 *   Il giudice deve DETENERE il claim per decidere; l'admin è esente.
 *
 * - Revisione submission (approvazione / rifiuto)
 *   POST /api/v1/submissions/:id/review
 *   Body: { decision, points?, note? }
 *   (task_id non serve: arriva dalla submission)
 *   Su 409 (lock coda giudici: già revisionata da un'altra sessione)
 *   la lista viene ricaricata automaticamente.
 *
 * - Override admin (§7.4): SOLO admin, sulle submission già decise
 *   POST /api/v1/submissions/:id/override  Body: { decision, points?, note? }
 *   Ribalta approved↔rejected (loggato). La revoca punti su approved→rejected
 *   resta MANUALE (clawback admin, §3-bis): la UI lo ricorda.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import { getJudgeChallengeOverview } from "@/api/judge.api";
import { api } from "@/api/client";
import "../../styles/dynamic-pages.css";

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

  if (!res.ok) {
    let msg = "Errore durante la revisione";
    try {
      const data = await res.json();
      // Gli errori strutturati del BE mettono il messaggio leggibile in `message`
      // (es. 409 lock coda giudici), gli altri in `error`.
      msg = data?.message || data?.error || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// Presa in carico / rilascio (§3). Stessa gestione di reviewSubmission: catturo
// lo status per distinguere il 409 (claim di altri / già revisionata) dagli errori generici.
async function claimSubmission(token, submissionId) {
  const res = await fetch(`${API_BASE}/v1/submissions/${submissionId}/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = "Errore nella presa in carico";
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function releaseSubmission(token, submissionId) {
  const res = await fetch(`${API_BASE}/v1/submissions/${submissionId}/release`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = "Errore nel rilascio";
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Override admin (§7.4): ribalta una decisione già presa. Solo admin lato BE.
async function overrideSubmission(token, submissionId, body) {
  const res = await fetch(`${API_BASE}/v1/submissions/${submissionId}/override`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = "Errore durante l'override";
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export default function JudgeChallengeOverview() {
  const { id } = useParams();
  const { token, user, role } = useAuth();
  const meId = user?.id;
  const isAdmin = role === "admin";

  const [overview, setOverview] = useState(null);
  const [oLoading, setOLoading] = useState(true);
  const [oError, setOError] = useState("");

  const [subs, setSubs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [sLoading, setSLoading] = useState(false);
  const [sError, setSError] = useState("");

  // form state per ogni submission: solo points e note (task_id non serve più)
  const [forms, setForms] = useState({}); // { [subId]: { points, note, busy, err } }

  // Mappa codice ISTAT → label comune, per mostrare il comune di partenza dei
  // task mobility in chiaro (il payload contiene solo il codice). Caricata una volta.
  const [comuniById, setComuniById] = useState(null);
  useEffect(() => {
    let alive = true;
    api
      .get("/v1/comuni")
      .then(({ data }) => {
        if (!alive) return;
        setComuniById(new Map((data?.items || []).map((o) => [o.id, o.label])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  // Helper: trova il nome del task dato l'id
  const getTaskLabel = (taskId) => {
    if (!taskId) return null;
    const t = taskOptions.find((opt) => opt.id === taskId || String(opt.id) === String(taskId));
    return t?.label || `Task #${taskId}`;
  };

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

      // init forms per nuove submissions (senza task_id)
      setForms((prev) => {
        const next = { ...prev };
        for (const s of items) {
          if (!next[s.id]) next[s.id] = { points: "", note: "", busy: false, err: "" };
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
    if (f.points === "" || Number.isNaN(Number(f.points))) {
      setForm(sub.id, { err: "Inserisci i punti (numero) per approvare." });
      return;
    }

    setForm(sub.id, { busy: true, err: "" });
    try {
      await reviewSubmission(token, sub.id, {
        decision: "approved",
        points: Number(f.points),
        note: f.note?.trim() || undefined,
      });

      await loadSubmissions({ reset: true });
      const ov = await getJudgeChallengeOverview(token, id);
      setOverview(ov);
    } catch (e) {
      if (e.status === 409) {
        // Lock coda giudici: un'altra sessione l'ha già revisionata. Ricarico.
        setForm(sub.id, { err: "Questa submission è già stata revisionata. Aggiorno la lista…" });
        await loadSubmissions({ reset: true });
        const ov = await getJudgeChallengeOverview(token, id);
        setOverview(ov);
      } else {
        setForm(sub.id, { err: e.message || "Errore approvazione" });
      }
    } finally {
      setForm(sub.id, { busy: false });
    }
  };

  const onReject = async (sub) => {
    const f = forms[sub.id] || {};

    setForm(sub.id, { busy: true, err: "" });
    try {
      await reviewSubmission(token, sub.id, {
        decision: "rejected",
        note: f.note?.trim() || undefined,
      });

      await loadSubmissions({ reset: true });
      const ov = await getJudgeChallengeOverview(token, id);
      setOverview(ov);
    } catch (e) {
      if (e.status === 409) {
        // Lock coda giudici: un'altra sessione l'ha già revisionata. Ricarico.
        setForm(sub.id, { err: "Questa submission è già stata revisionata. Aggiorno la lista…" });
        await loadSubmissions({ reset: true });
        const ov = await getJudgeChallengeOverview(token, id);
        setOverview(ov);
      } else {
        setForm(sub.id, { err: e.message || "Errore rifiuto" });
      }
    } finally {
      setForm(sub.id, { busy: false });
    }
  };

  // Prende in carico la submission (claim-first §3). 409/404 = qualcun altro
  // l'ha presa o l'ha già revisionata → messaggio + refresh (stato reale dal BE).
  const onClaim = async (sub) => {
    setForm(sub.id, { busy: true, err: "" });
    try {
      await claimSubmission(token, sub.id);
      await loadSubmissions({ reset: true });
    } catch (e) {
      if (e.status === 409 || e.status === 404) {
        setForm(sub.id, { err: e.message || "Non è stato possibile prenderla in carico. Aggiorno la lista…" });
        await loadSubmissions({ reset: true });
      } else {
        setForm(sub.id, { err: e.message || "Errore nella presa in carico" });
      }
    } finally {
      setForm(sub.id, { busy: false });
    }
  };

  // Rilascia la presa in carico (giudice: la propria; admin: force-release).
  const onRelease = async (sub) => {
    setForm(sub.id, { busy: true, err: "" });
    try {
      await releaseSubmission(token, sub.id);
      await loadSubmissions({ reset: true });
    } catch (e) {
      setForm(sub.id, { err: e.message || "Errore nel rilascio" });
      await loadSubmissions({ reset: true });
    } finally {
      setForm(sub.id, { busy: false });
    }
  };

  // Override admin (§7.4): ribalta una submission già decisa. Approvando serve
  // il punteggio; ribaltando a rifiutata i punti vanno tolti a mano (clawback).
  const onOverride = async (sub, decision) => {
    const f = forms[sub.id] || {};
    if (decision === "approved" && (f.points === "" || f.points == null || Number.isNaN(Number(f.points)))) {
      setForm(sub.id, { err: "Inserisci i punti per forzare l'approvazione." });
      return;
    }
    setForm(sub.id, { busy: true, err: "" });
    try {
      await overrideSubmission(token, sub.id, {
        decision,
        points: decision === "approved" ? Number(f.points) : undefined,
        note: f.note?.trim() || undefined,
      });
      await loadSubmissions({ reset: true });
      const ov = await getJudgeChallengeOverview(token, id);
      setOverview(ov);
    } catch (e) {
      setForm(sub.id, { err: e.message || "Errore durante l'override" });
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
          <h2 className="dynamic-title">Task</h2>

          {taskOptions.length === 0 ? (
            <TextBlock>Nessun task disponibile.</TextBlock>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {taskOptions.map((t) => {
                const max = t.max_points ?? null;
                const assigned = t.assigned_points ?? 0;
                const remaining = max == null ? null : Math.max(0, max - assigned);

                return (
                  <div key={t.id} className="card-info neutral">
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
          <h2 className="dynamic-title">Submissions</h2>

          {sError && <div className="callout error">{sError}</div>}
          {sLoading && subs.length === 0 && <div className="callout neutral">Caricamento…</div>}

          {/* PENDING */}
          <div style={{ marginTop: 10 }}>
            <h3 className="dynamic-subtitle">
              In attesa ({pendingSubs.length})
            </h3>

            {pendingSubs.length === 0 ? (
              <div className="card-info neutral">Nessuna submission pending</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pendingSubs.map((s) => {
                  const f = forms[s.id] || {};
                  const taskLabel = s.taskTitle || getTaskLabel(s.taskId) || "—";

                  // Stato presa in carico (§3). claimedBy/claimedByName arrivano
                  // dal BE solo per claim ATTIVI (non scaduti).
                  const claimedByMe = s.claimedBy != null && String(s.claimedBy) === String(meId);
                  const claimedByOther = s.claimedBy != null && !claimedByMe;
                  const isFree = s.claimedBy == null;
                  // Claim-first: per decidere devi detenere il claim; l'admin è esente.
                  const canDecide = isAdmin || claimedByMe;

                  return (
                    <div key={s.id} className="card-info neutral">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>#{s.id}</strong> {s.author ? `· ${s.author}` : ""}
                          <div className="muted small">
                            inviato: {fmtDate(s.createdAt)} · visibilità: {s.visibility}
                          </div>
                        </div>
                        <div className="muted small">status: <strong>{s.status}</strong></div>
                      </div>

                      {/* Task collegato (in sola lettura) */}
                      <div
                        style={{
                          marginTop: 8,
                          padding: "6px 10px",
                          background: "rgba(255,255,255,0.07)",
                          borderRadius: 6,
                          display: "inline-block",
                        }}
                      >
                        <span className="muted small">Task: </span>
                        <strong>{taskLabel}</strong>
                      </div>

                      {s.activity && <p style={{ marginTop: 10, marginBottom: 10 }}>{s.activity}</p>}

                      {/* ── Dati dichiarati dal volontario (payload) ──────────
                          Sola lettura per il giudice. vehicleLabels è solo
                          display — nessun calcolo avviene qui (backend). */}
                      {s.payload && <PayloadDisplay payload={s.payload} comuniById={comuniById} />}

                      {/* Stato presa in carico (§3) */}
                      <ClaimStatus sub={s} claimedByMe={claimedByMe} />

                      {claimedByOther && !isAdmin ? (
                        /* In carico ad altri: nessun form, il giudice salta */
                        <div className="muted small" style={{ marginTop: 10 }}>
                          In carico a {s.claimedByName || "un altro giudice"}. Attendi il
                          rilascio o passa a un'altra submission.
                          {f.err && <div className="callout error" style={{ marginTop: 8 }}>{f.err}</div>}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                          {/* Controlli di presa in carico / rilascio */}
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {isFree && !isAdmin && (
                              <button
                                className="btn btn-primary"
                                disabled={f.busy}
                                onClick={() => onClaim(s)}
                              >
                                {f.busy ? "…" : "Prendi in carico"}
                              </button>
                            )}
                            {claimedByMe && (
                              <button
                                className="btn btn-ghost"
                                disabled={f.busy}
                                onClick={() => onRelease(s)}
                              >
                                {f.busy ? "…" : "Rilascia"}
                              </button>
                            )}
                            {isAdmin && claimedByOther && (
                              <button
                                className="btn btn-outline"
                                disabled={f.busy}
                                onClick={() => onRelease(s)}
                              >
                                {f.busy ? "…" : "Forza rilascio"}
                              </button>
                            )}
                          </div>

                          {/* Form decisione: solo se detieni il claim (o sei admin) */}
                          {canDecide && (
                            <>
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

                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  className="btn btn-primary"
                                  disabled={f.busy}
                                  onClick={() => onApprove(s)}
                                >
                                  {f.busy ? "…" : "Approva"}
                                </button>
                                <button
                                  className="btn btn-outline"
                                  disabled={f.busy}
                                  onClick={() => onReject(s)}
                                >
                                  {f.busy ? "…" : "Rifiuta"}
                                </button>
                              </div>
                            </>
                          )}

                          {!canDecide && (
                            <div className="muted small">
                              Prendi in carico la submission per poterla valutare.
                            </div>
                          )}

                          {f.err && <div className="callout error">{f.err}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* REVIEWED */}
          <div style={{ marginTop: 24 }}>
            <h3 className="dynamic-subtitle">
              Già revisionate ({reviewedSubs.length})
            </h3>

            {reviewedSubs.length === 0 ? (
              <div className="muted small">Nessuna submission revisionata in questa pagina.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {reviewedSubs.map((s) => {
                  const taskLabel = s.taskTitle || getTaskLabel(s.taskId) || "—";
                  const f = forms[s.id] || {};

                  return (
                    <div key={s.id} className="card-info neutral" style={{ opacity: 0.9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>#{s.id}</strong> {s.author ? `· ${s.author}` : ""}
                          <div className="muted small">
                            task: {taskLabel} · reviewed: {fmtDate(s.reviewedAt)} · points: {s.points ?? "—"}
                          </div>
                        </div>
                        <div className="muted small">status: <strong>{s.status}</strong></div>
                      </div>

                      {/* Override admin (§7.4): ribalta la decisione già presa */}
                      {isAdmin && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                          {!f.overrideOpen ? (
                            <button
                              className="btn btn-ghost"
                              onClick={() => setForm(s.id, { overrideOpen: true, err: "" })}
                            >
                              Override (admin)
                            </button>
                          ) : (
                            <div style={{ display: "grid", gap: 8 }}>
                              <div className="muted small" style={{ fontWeight: 600 }}>
                                Override admin — ribalta l'esito
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Punti (se forzi l'approvazione)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={f.points ?? ""}
                                  onChange={(e) => setForm(s.id, { points: e.target.value })}
                                  placeholder="Es. 30"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Nota (facoltativa)</label>
                                <textarea
                                  rows={2}
                                  value={f.note ?? ""}
                                  onChange={(e) => setForm(s.id, { note: e.target.value })}
                                  placeholder="Motivo dell'override…"
                                />
                              </div>
                              <div className="muted small">
                                Ribaltare un'approvazione a rifiutata non revoca i punti in automatico:
                                vanno tolti a mano (clawback §3-bis).
                              </div>
                              {f.err && <div className="callout error">{f.err}</div>}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                  className="btn btn-outline"
                                  disabled={f.busy}
                                  onClick={() => onOverride(s, "approved")}
                                >
                                  {f.busy ? "…" : "Forza approvata"}
                                </button>
                                <button
                                  className="btn btn-outline"
                                  disabled={f.busy}
                                  onClick={() => onOverride(s, "rejected")}
                                >
                                  {f.busy ? "…" : "Forza rifiutata"}
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  disabled={f.busy}
                                  onClick={() => setForm(s.id, { overrideOpen: false, err: "" })}
                                >
                                  Annulla
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

// ─── Componente: visualizzazione payload submission ───────────────────────────
/**
 * Mostra in sola lettura i dati dichiarati dal volontario.
 * Usato nella card pending del giudice per permettere la valutazione
 * senza dover aprire file o cercare altrove.
 *
 * vehicleLabels è solo per display: non usare per logica o calcoli.
 * La mappa è qui perché è informazione di presentazione, non di business.
 */
// ─── Componente: stato della presa in carico (§3) ────────────────────────────
// Riga compatta con pallino colorato: libera / in carico a te (verde) / in
// carico a un altro giudice (ambra). claimedBy è valorizzato solo per claim
// attivi (il BE filtra quelli scaduti).
function ClaimStatus({ sub, claimedByMe }) {
  if (sub.claimedBy == null) {
    return (
      <div className="muted small" style={{ marginTop: 8 }}>
        Libera — non ancora presa in carico
      </div>
    );
  }
  const color = claimedByMe ? "#3fb950" : "#d29922";
  const label = claimedByMe
    ? "In carico a te"
    : `In carico a ${sub.claimedByName || "un altro giudice"}`;
  return (
    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, color }}>
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }}
      />
      <span className="small" style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}

const vehicleLabels = {
  car_petrol_old: "Auto Benzina (Pre-Euro 5)",
  car_petrol_new: "Auto Benzina (Euro 6d/7)",
  car_diesel:     "Auto Diesel (Media)",
  car_electric:   "Auto Elettrica (BEV)",
  motorbike:      "Moto / Scooter",
  none:           "Nessun mezzo alternativo",
};

function PayloadDisplay({ payload, comuniById }) {
  if (!payload || typeof payload !== "object") return null;

  const { comune_origine, km_percorsi, vehicle_id, evidences, kg_rifiuti, num_alberi, n_capi, volunteer_hours, people_reached } = payload;
  const comuneLabel = comune_origine
    ? (comuniById?.get(comune_origine) || comune_origine)
    : null;
  const hasData = comune_origine || km_percorsi != null || vehicle_id || kg_rifiuti != null || num_alberi != null || n_capi != null || volunteer_hours != null || people_reached != null;
  const photos  = Array.isArray(evidences) ? evidences.filter(Boolean) : [];

  return (
    <div
      style={{
        margin: "10px 0",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 8,
        borderLeft: "3px solid rgba(255,255,255,0.2)",
      }}
    >
      <div className="muted small" style={{ marginBottom: 8, fontWeight: 600, letterSpacing: "0.03em" }}>
        DATI DICHIARATI DAL VOLONTARIO
      </div>

      {/* Dati numerici e testuali */}
      {hasData && (
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", margin: 0 }}>
          {comune_origine && (
            <>
              <dt className="muted small">Comune di partenza</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{comuneLabel}</dd>
            </>
          )}
          {km_percorsi != null && (
            <>
              <dt className="muted small">Km percorsi in bici</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{km_percorsi} km</dd>
            </>
          )}
          {vehicle_id && (
            <>
              <dt className="muted small">Mezzo alternativo</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>
                {vehicleLabels[vehicle_id] || vehicle_id}
              </dd>
            </>
          )}
          {kg_rifiuti != null && (
            <>
              <dt className="muted small">Kg rifiuti raccolti</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{kg_rifiuti} kg</dd>
            </>
          )}
          {num_alberi != null && (
            <>
              <dt className="muted small">Alberi piantati</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{num_alberi}</dd>
            </>
          )}
          {n_capi != null && (
            <>
              <dt className="muted small">Capi riusati</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{n_capi}</dd>
            </>
          )}
          {volunteer_hours != null && (
            <>
              <dt className="muted small">Ore di volontariato</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{volunteer_hours} h</dd>
            </>
          )}
          {people_reached != null && (
            <>
              <dt className="muted small">Persone raggiunte</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{people_reached}</dd>
            </>
          )}
        </dl>
      )}

      {/* Foto caricate — miniature cliccabili */}
      {photos.length > 0 && (
        <div style={{ marginTop: hasData ? 10 : 0 }}>
          <div className="muted small" style={{ marginBottom: 6 }}>
            Foto caricate ({photos.length})
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {photos.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Apri foto ${i + 1} in una nuova scheda`}
                aria-label={`Foto evidenza ${i + 1}`}
                style={{ display: "block", flexShrink: 0 }}
              >
                <img
                  src={url}
                  alt={`Evidenza ${i + 1}`}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "2px solid rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {!hasData && photos.length === 0 && (
        <span className="muted small">Nessun dato aggiuntivo dichiarato.</span>
      )}
    </div>
  );
}
