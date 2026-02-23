// src/pages/challenges/ChallengeLiveDashboard.jsx
/**
 * ChallengeLiveDashboard.jsx
 * --------------------------
 * Dashboard pubblica di una challenge, aggiornata in tempo reale.
 *
 * SCOPO
 * Mostrare a tutti (loggati e non) l'impatto live di una challenge:
 * partecipanti attivi, km totali, CO₂ evitata, top 5.
 * Ideale per proiezione su schermo durante l'evento.
 *
 * ENDPOINT
 * GET /v1/challenges/:id/summary — pubblico, nessun token richiesto
 * Polling ogni 30 secondi (sufficiente per 200 partecipanti).
 *
 * ROUTE
 * /challenges/:id/live
 *
 * ACCESSO
 * Pubblica — nessuna autenticazione richiesta.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/api/client";
import { routes } from "@/routes";

const POLL_INTERVAL_MS = 30_000; // 30 secondi

// ─── Utility ─────────────────────────────────────────────────────────────────
function fmt(value, decimals = 1) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals).replace(".", ",");
}

// ─── Componente: counter grande ───────────────────────────────────────────────
function BigCounter({ label, value, unit, accent = false }) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        padding: "24px 20px",
        borderRadius: 12,
        background: accent
          ? "linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(16,185,129,0.10) 100%)"
          : "rgba(255,255,255,0.06)",
        border: accent
          ? "1px solid rgba(34,197,94,0.35)"
          : "1px solid rgba(255,255,255,0.10)",
        textAlign: "center",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: accent ? "rgb(74,222,128)" : "inherit",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "0.45em", fontWeight: 500, marginLeft: 4, opacity: 0.75 }}>
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: "0.8rem",
          opacity: 0.6,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Componente: riga task stats ──────────────────────────────────────────────
function TaskStatRow({ task }) {
  const total = (task.approved_count || 0) + (task.pending_count || 0) + (task.rejected_count || 0);
  const pct = total > 0 ? Math.round((task.approved_count / total) * 100) : 0;

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: "0.9rem" }}>{task.task_title}</span>
        <span style={{ fontSize: "0.85rem", opacity: 0.6, flexShrink: 0 }}>
          {task.approved_count} approvate · {task.pending_count} in attesa
        </span>
      </div>
      {/* Barra di progresso */}
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "rgb(74,222,128)",
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function ChallengeLiveDashboard() {
  const { id } = useParams();

  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tasksOpen, setTasksOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await api.get(`/v1/challenges/${id}/summary`);
      setSummary(data);
      setLastUpdate(new Date());
      setError("");
    } catch (err) {
      console.error("Errore caricamento summary:", err);
      setError("Impossibile aggiornare i dati. Riprova.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Caricamento iniziale + polling ogni 30s
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const ch    = summary?.challenge;
  const stats = summary?.submissions_stats;
  const impact = summary?.impact;
  const tasks  = summary?.tasks_stats || [];
  const top5   = summary?.leaderboard_top || [];

  return (
    <section className="page-section page-text">
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link
            to={routes.dashboard.challenges}
            className="muted small"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
          >
            ← Tutte le sfide
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>
                {ch?.title || `Sfida #${id}`}
              </h1>
              <div className="muted small">
                Dashboard live · aggiornamento automatico ogni 30 secondi
              </div>
            </div>
            {lastUpdate && (
              <div className="muted small" style={{ flexShrink: 0, paddingTop: 4 }}>
                Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}
                <button
                  onClick={fetchSummary}
                  className="btn btn-outline btn-small"
                  style={{ marginLeft: 8 }}
                  aria-label="Aggiorna ora"
                >
                  ↻ Aggiorna
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && <div className="callout neutral">Caricamento dati…</div>}
        {error && !loading && <div className="callout error">{error}</div>}

        {summary && (
          <>
            {/* ── Counter principali ──────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <BigCounter
                label="CO₂ evitata"
                value={fmt(impact?.total_co2_saved_kg)}
                unit="kg"
                accent
              />
              <BigCounter
                label="Km percorsi"
                value={fmt(impact?.total_km, 0)}
                unit="km"
              />
              <BigCounter
                label="Partecipanti attivi"
                value={stats?.approved ?? "—"}
              />
              <BigCounter
                label="In attesa di validazione"
                value={stats?.pending ?? "—"}
              />
            </div>

            {/* ── Dettaglio per task (collassabile) ───────────────────────── */}
            {tasks.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 24 }}>
                <button
                  onClick={() => setTasksOpen((o) => !o)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    padding: 0,
                  }}
                  aria-expanded={tasksOpen}
                >
                  <h2 className="dynamic-title" style={{ margin: 0, flex: 1 }}>
                    Dettaglio per percorso
                  </h2>
                  <span className="muted small">{tasksOpen ? "▲ Chiudi" : "▼ Mostra"}</span>
                </button>

                {tasksOpen && (
                  <div style={{ marginTop: 16 }}>
                    {tasks.map((t) => (
                      <TaskStatRow key={t.task_id} task={t} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Top 5 leaderboard ───────────────────────────────────────── */}
            {top5.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <h2 className="dynamic-title">🏆 Top partecipanti</h2>
                <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
                  {top5.map((entry, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: i < top5.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                      }}
                    >
                      {/* Medaglia per i primi tre */}
                      <span style={{ width: 28, textAlign: "center", fontSize: "1.1rem" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span style={{ flex: 1 }}>{entry.user}</span>
                      <span style={{ fontWeight: 700, color: "rgb(74,222,128)" }}>
                        {entry.score} pt
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
