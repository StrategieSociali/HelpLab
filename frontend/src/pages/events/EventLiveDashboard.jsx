// src/pages/events/EventLiveDashboard.jsx
/**
 * EventLiveDashboard.jsx
 * ----------------------
 * Dashboard pubblica live di un evento. Ideale per proiezione su schermo
 * durante l'evento e per i volontari che vogliono seguire l'impatto in tempo reale.
 *
 * ACCESSO: pubblico — nessun token richiesto.
 *
 * ROUTE: /eventi/:slug/live
 *
 * ENDPOINT:
 *   GET /v1/events/:id/summary  — cache 30s lato BE
 *
 * NOTA TECNICA:
 * Il summary usa l'ID numerico, non lo slug. Per ottenerlo facciamo prima
 * GET /v1/events/:slug (dettaglio) che restituisce l'id, poi usiamo quello
 * per il polling del summary. Due chiamate iniziali, poi solo summary ogni 30s.
 *
 * POLLING: ogni 30 secondi — coerente con la cache BE e con ChallengeLiveDashboard.
 *
 * UX NOTE:
 * - Contatori grandi e leggibili anche da lontano (proiezione su schermo)
 * - Layout responsive: su mobile mostra i counter in colonna
 * - Pulsante "Partecipa" sempre visibile per chi arriva sulla live e vuole iscriversi
 * - Aggiornamento silenzioso (nessun flash di loading durante il polling)
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getEventDetail, getEventSummary } from "@/api/events.api";
import { routes } from "@/routes";

const POLL_INTERVAL_MS = 30_000;

// ─── Utility ─────────────────────────────────────────────────────────────────
function fmt(value, decimals = 1) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals).replace(".", ",");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Counter grande — ottimizzato per leggibilità a distanza ─────────────────
function BigCounter({ label, value, unit, accent = false }) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        padding: "28px 20px",
        borderRadius: 14,
        background: accent
          ? "linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(16,185,129,0.10) 100%)"
          : "rgba(255,255,255,0.06)",
        border: accent
          ? "1px solid rgba(34,197,94,0.35)"
          : "1px solid rgba(255,255,255,0.10)",
        textAlign: "center",
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: "clamp(2.2rem, 6vw, 3.8rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: accent ? "rgb(74,222,128)" : "#ffffff",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "0.4em", fontWeight: 500, marginLeft: 6, opacity: 0.75 }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: "0.85rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Barra progresso sfida ────────────────────────────────────────────────────
function ChallengeProgressBar({ challenge }) {
  const approved = challenge.approved_count ?? 0;
  const pending  = challenge.pending_count ?? 0;
  const total    = approved + pending;
  const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, color: "#fff" }}>{challenge.title}</span>
        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
          {approved} approvate · {pending} in attesa
        </span>
      </div>
      {/* CO2 e km se disponibili */}
      <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
        {challenge.co2_saved_kg != null && (
          <span style={{ fontSize: "0.9rem", color: "rgb(74,222,128)" }}>
            🌱 {fmt(challenge.co2_saved_kg)} kg CO₂
          </span>
        )}
        {challenge.total_km != null && (
          <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
            🚲 {fmt(challenge.total_km, 0)} km
          </span>
        )}
      </div>
      {/* Barra progresso */}
      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "rgb(74,222,128)",
            borderRadius: 3,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function EventLiveDashboard() {
  const { slug }     = useParams();
  const navigate     = useNavigate();

  // Stato evento (caricato una volta sola)
  const [event, setEvent]       = useState(null);
  const [eventError, setEventError] = useState("");

  // Stato summary (aggiornato con polling)
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  // ID numerico dell'evento — necessario per chiamare /summary
  const eventIdRef = useRef(null);

  // ── Step 1: carica dettaglio evento per ottenere l'id ──────────────────
  useEffect(() => {
    async function loadEvent() {
      try {
        const data = await getEventDetail(slug);
        setEvent(data);
        eventIdRef.current = data.id;
      } catch (err) {
        setEventError(
          err?.response?.status === 404
            ? "Evento non trovato."
            : "Impossibile caricare l'evento."
        );
        setLoading(false);
      }
    }
    loadEvent();
  }, [slug]);

  // ── Step 2: polling summary — parte solo dopo aver ottenuto l'id ───────
  const fetchSummary = useCallback(async () => {
    if (!eventIdRef.current) return;
    try {
      const data = await getEventSummary(eventIdRef.current);
      setSummary(data);
      setLastUpdate(new Date());
      setSummaryError("");
    } catch (err) {
      // Errore silenzioso durante il polling — non resetta i dati già mostrati
      setSummaryError("Aggiornamento non riuscito. I dati mostrati potrebbero non essere aggiornati.");
      console.error("Errore summary evento:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!event) return;
    fetchSummary();
    const interval = setInterval(fetchSummary, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [event, fetchSummary]);

  // ── Dati estratti dal summary ───────────────────────────────────────────
  const impact     = summary?.impact ?? {};
  const challenges = summary?.challenges ?? [];
  const sponsors   = summary?.sponsors ?? [];

  // ── Render errore evento ────────────────────────────────────────────────
  if (eventError) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container">
          <div className="callout error">{eventError}</div>
          <Link to={routes.events.list} className="btn btn-outline" style={{ marginTop: 16 }}>
            ← Tutti gli eventi
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <Link
            to={routes.events.detail(slug)}
            className="muted small"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
          >
            ← Torna all'evento
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              {event?.logo_url && (
                <img
                  src={event.logo_url}
                  alt={`Logo ${event.name}`}
                  style={{ maxHeight: 48, maxWidth: 160, objectFit: "contain", marginBottom: 8, display: "block" }}
                />
              )}
              <h1 className="page-title" style={{ marginBottom: 4 }}>
                {event?.name ?? "Dashboard live"}
              </h1>
              {event?.start_date && (
                <div className="muted small">
                  {event.location_address && `${event.location_address} · `}
                  {formatDate(event.start_date)}
                </div>
              )}
              <div className="muted small" style={{ marginTop: 4 }}>
                Aggiornamento automatico ogni 30 secondi
              </div>
            </div>

            {/* Controlli aggiornamento */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              {lastUpdate && (
                <span className="muted small">
                  Ultimo aggiornamento: {lastUpdate.toLocaleTimeString("it-IT")}
                </span>
              )}
              <button
                onClick={fetchSummary}
                className="btn btn-outline btn-small"
                aria-label="Aggiorna dati ora"
              >
                ↻ Aggiorna ora
              </button>
            </div>
          </div>
        </div>

        {/* Stato caricamento iniziale */}
        {loading && <div className="callout neutral">Caricamento dati in corso…</div>}

        {/* Avviso errore polling (non blocca la UI) */}
        {summaryError && !loading && (
          <div className="card-info error" style={{ marginBottom: 16 }} role="alert">
            {summaryError}
          </div>
        )}

        {summary && (
          <>
            {/* ── Counter impatto ─────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
              <BigCounter
                label="CO₂ evitata"
                value={fmt(impact.total_co2_saved_kg)}
                unit="kg"
                accent
              />
              <BigCounter
                label="Km percorsi"
                value={fmt(impact.total_km, 0)}
                unit="km"
              />
              <BigCounter
                label="Partecipanti"
                value={impact.participants ?? "—"}
              />
              <BigCounter
                label="Contributi approvati"
                value={impact.approved_submissions ?? "—"}
              />
              {impact.pending_submissions > 0 && (
                <BigCounter
                  label="In attesa"
                  value={impact.pending_submissions}
                />
              )}
            </div>

            {/* ── Dettaglio per sfida ─────────────────────────────────── */}
            {challenges.length > 0 && (
              <div className="card glass" style={{ padding: "20px 24px", marginBottom: 24 }}>
                <h2 className="dynamic-title" style={{ marginBottom: 4 }}>
                  Dettaglio per sfida
                </h2>
                <p className="muted small" style={{ marginBottom: 16 }}>
                  Progresso calcolato su contributi approvati e in attesa di revisione.
                </p>
                {challenges.map((ch) => (
                  <ChallengeProgressBar key={ch.id} challenge={ch} />
                ))}
              </div>
            )}

            {/* ── CTA partecipazione — visibile anche sulla live ──────── */}
            {event?.status === "published" && (
              <div
                className="card glass"
                style={{
                  padding: "20px 24px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    Vuoi partecipare?
                  </div>
                  <div className="muted small">
                    Registra il tuo contributo e vedi il tuo impatto in tempo reale.
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(routes.events.detail(slug))}
                  style={{ flexShrink: 0 }}
                >
                  Partecipa all'evento
                </button>
              </div>
            )}

            {/* ── Sponsor (se presenti) ───────────────────────────────── */}
            {sponsors.length > 0 && (
              <div className="card glass" style={{ padding: "16px 24px" }}>
                <div className="muted small" style={{ marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Sostenuto da
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                  {sponsors.map((sp) => (
                    sp.logo_url ? (
                      <img
                        key={sp.id}
                        src={sp.logo_url}
                        alt={sp.name}
                        style={{ maxHeight: 40, maxWidth: 120, objectFit: "contain", opacity: 0.85 }}
                      />
                    ) : (
                      <span key={sp.id} style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                        {sp.name}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </section>
  );
}
