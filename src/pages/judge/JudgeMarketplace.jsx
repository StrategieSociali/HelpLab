// src/pages/judge/JudgeMarketplace.jsx
/**
 * JudgeMarketplace.jsx
 * --------------------
 * Marketplace Fase 1 (pull competitivo, multi-giudice §4.1).
 *
 * SCOPO
 * Il giudice vede le sfide e gli eventi SCOPERTI (grant attivi < tetto di
 * copertura) e si candida ("Prendi in carico") fino al riempimento del tetto:
 * primo arrivato riempie gli slot, poi l'elemento sparisce dall'offerta.
 *
 * Route: /judge/marketplace   ·   Accesso: judge (admin super-ruolo)
 *
 * DATI
 * - GET  /api/v1/judge/marketplace        → { challenges, events } (solo scoperti)
 * - POST /api/v1/challenges/:id/opt-in     → grant su sfida (409 coverage_full)
 * - POST /api/v1/events/:id/opt-in         → grant su evento (409 coverage_full)
 *
 * NOTA
 * - In Fase 1 la disponibilità NON è richiesta: candidarsi è già un impegno.
 * - Su 409 (tetto riempito da un altro un attimo prima) → messaggio + refresh.
 * - Tre stati UI: caricamento / errore (riprova) / vuoto (nessuna offerta).
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import {
  getJudgeMarketplace,
  optInChallenge,
  optInEvent,
} from "@/api/judge.api";
import { routes } from "@/routes";
import "../../styles/dynamic-pages.css";

export default function JudgeMarketplace() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({ challenges: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // stato per singolo elemento in opt-in: { [`c:${id}`|`e:${id}`]: { busy, err } }
  const [rowState, setRowState] = useState({});

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await getJudgeMarketplace(token);
      setData({
        challenges: res.challenges || [],
        events: res.events || [],
      });
    } catch (e) {
      setError("Impossibile caricare il marketplace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setRow = (key, patch) =>
    setRowState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));

  const doOptIn = async (kind, id) => {
    const key = `${kind}:${id}`;
    setRow(key, { busy: true, err: "" });
    try {
      if (kind === "c") await optInChallenge(token, id);
      else await optInEvent(token, id);
      // Successo: l'elemento è ora coperto (o più vicino al tetto) → ricarico.
      await load();
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.response?.data?.error;
      if (status === 409) {
        // Tetto riempito da un altro un attimo prima (o non più disponibile).
        setRow(key, {
          busy: false,
          err: msg || "Non più disponibile. Aggiorno la lista…",
        });
        await load();
      } else {
        setRow(key, { busy: false, err: msg || "Candidatura non riuscita. Riprova." });
      }
    }
  };

  const isEmpty = data.challenges.length === 0 && data.events.length === 0;

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Marketplace giudici</h1>
        <p className="page-subtitle">
          Sfide ed eventi che cercano giudici. Prendi in carico ciò che vuoi
          seguire: gli slot si riempiono per primi arrivati.
        </p>

        {loading && <TextBlock>Caricamento offerte…</TextBlock>}

        {!loading && error && (
          <div
            className="callout error"
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <span>{error}</span>
            <button className="btn btn-ghost" onClick={load}>
              Riprova
            </button>
          </div>
        )}

        {!loading && !error && isEmpty && (
          <TextBlock>
            Nessuna sfida o evento scoperto al momento. Torna più tardi: le nuove
            offerte compaiono qui.
          </TextBlock>
        )}

        {!loading && !error && !isEmpty && (
          <>
            {/* ── SFIDE ─────────────────────────────────────────── */}
            {data.challenges.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <h2 className="dynamic-title">Sfide scoperte ({data.challenges.length})</h2>
                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {data.challenges.map((c) => {
                    const key = `c:${c.id}`;
                    const rs = rowState[key] || {};
                    return (
                      <div key={key} className="card-info neutral">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <strong>{c.title || `Sfida #${c.id}`}</strong>
                            <div className="muted small">
                              tipo: {c.type || "—"}
                              {c.location ? ` · ${c.location}` : ""}
                              {c.deadline ? ` · scadenza ${c.deadline}` : ""}
                              {c.sponsor?.name ? ` · sponsor ${c.sponsor.name}` : ""}
                            </div>
                          </div>
                          <div className="muted small" style={{ textAlign: "right" }}>
                            giudici: <strong>{c.coverage}</strong> / {c.coverageCap}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-primary"
                            disabled={rs.busy}
                            onClick={() => doOptIn("c", c.id)}
                          >
                            {rs.busy ? "…" : "Prendi in carico"}
                          </button>
                          {c.slug && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => navigate(routes.dashboard.challengeLive(c.id))}
                            >
                              Vedi dettaglio
                            </button>
                          )}
                        </div>

                        {rs.err && (
                          <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── EVENTI ────────────────────────────────────────── */}
            {data.events.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <h2 className="dynamic-title">Eventi scoperti ({data.events.length})</h2>
                <p className="muted small" style={{ marginTop: 4 }}>
                  Prendere in carico un evento copre tutte le sue sfide, anche quelle
                  aggiunte dopo.
                </p>
                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {data.events.map((ev) => {
                    const key = `e:${ev.id}`;
                    const rs = rowState[key] || {};
                    const period =
                      ev.startDate && ev.endDate
                        ? `${ev.startDate} → ${ev.endDate}`
                        : ev.startDate || ev.endDate || null;
                    return (
                      <div key={key} className="card-info neutral">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <strong>{ev.name || `Evento #${ev.id}`}</strong>
                            <div className="muted small">
                              {period ? period : "date da definire"}
                              {ev.location ? ` · ${ev.location}` : ""}
                            </div>
                          </div>
                          <div className="muted small" style={{ textAlign: "right" }}>
                            giudici: <strong>{ev.coverage}</strong> / {ev.coverageCap}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-primary"
                            disabled={rs.busy}
                            onClick={() => doOptIn("e", ev.id)}
                          >
                            {rs.busy ? "…" : "Prendi in carico l'evento"}
                          </button>
                        </div>

                        {rs.err && (
                          <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
