// src/pages/admin/AdminCoverage.jsx
/**
 * AdminCoverage.jsx
 * -----------------
 * Vista admin di copertura giudici (multi-giudice §7.2).
 *
 * Route: /dashboard/admin/coverage   ·   Accesso: admin
 *
 * SCOPO
 * L'admin vede sfide aperte ed eventi pubblicati SOTTO-COPERTI (giudici attivi <
 * tetto) e tappa i buchi: (a) avanza il round-robin (sweep), (b) assegna a mano
 * un giudice, (c) apre l'overview della sfida per intervenire (es. force-release
 * di un claim bloccato). È il fallback quando la Fase 2 non basta.
 *
 * DATI
 * - GET  /api/v1/admin/coverage             → { challenges, events } sotto-coperti
 * - GET  /api/v1/admin/judges               → elenco giudici (per l'assegnazione)
 * - POST /api/v1/admin/judge-offers/sweep    → avanza il round-robin
 * - POST /api/v1/challenges/:id/assign-judge → grant su sfida (409 se ha già un giudice)
 * - POST /api/v1/events/:id/assign-judge     → grant su evento (upsert)
 *
 * NOTA
 * - Tre stati UI (loading/errore/vuoto). "Vuoto" = tutto coperto (messaggio positivo).
 * - L'assign sfida può dare 409 se la sfida ha già un giudice singolo: mostrato con
 *   un messaggio che rimanda a sweep/marketplace per le coperture aggiuntive.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminCoverage,
  getAdminJudges,
  runJudgeOffersSweep,
  assignChallengeJudge,
  assignEventJudge,
  getOpenChallenges,
} from "@/api/judge.api";
import { routes } from "@/routes";
import "../../styles/dynamic-pages.css";

export default function AdminCoverage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({ challenges: [], events: [] });
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sweeping, setSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState("");

  // Tutte le sfide aperte: ingresso admin per aprire QUALSIASI overview
  // (override/force-release), indipendente dai buchi di copertura.
  const [openChallenges, setOpenChallenges] = useState([]);

  // stato per riga: { [`c:id`|`e:id`]: { userId, busy, msg, err } }
  const [rowState, setRowState] = useState({});
  const setRow = (key, patch) =>
    setRowState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));

  const loadCoverage = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await getAdminCoverage(token);
      setData({ challenges: res.challenges || [], events: res.events || [] });
    } catch (e) {
      setError("Impossibile caricare la copertura.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverage();
    // giudici + sfide aperte caricati una volta (selettori di assegnazione e
    // ingresso "apri qualsiasi sfida")
    if (token) {
      getAdminJudges(token)
        .then(setJudges)
        .catch(() => setJudges([]));
      getOpenChallenges(token)
        .then(setOpenChallenges)
        .catch(() => setOpenChallenges([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const doSweep = async () => {
    setSweeping(true);
    setSweepMsg("");
    try {
      const r = await runJudgeOffersSweep(token);
      setSweepMsg(
        `Sweep completato: ${r.offersCreated} offerte create, ${r.expired} scadute ` +
          `(scoperti: ${r.uncovered.challenges} sfide, ${r.uncovered.events} eventi).`
      );
      await loadCoverage();
    } catch (e) {
      setSweepMsg("Sweep non riuscito. Riprova.");
    } finally {
      setSweeping(false);
    }
  };

  const doAssign = async (kind, id) => {
    const key = `${kind}:${id}`;
    const userId = rowState[key]?.userId;
    if (!userId) {
      setRow(key, { err: "Seleziona un giudice." });
      return;
    }
    setRow(key, { busy: true, err: "", msg: "" });
    try {
      if (kind === "c") await assignChallengeJudge(token, id, Number(userId));
      else await assignEventJudge(token, id, Number(userId));
      setRow(key, { busy: false, msg: "Giudice assegnato." });
      await loadCoverage();
    } catch (e) {
      const status = e?.response?.status;
      const beErr = e?.response?.data?.error;
      let msg = e?.response?.data?.message || beErr || "Assegnazione non riuscita.";
      if (status === 409 && beErr === "already assigned") {
        msg = "La sfida ha già un giudice: usa lo sweep o il marketplace per aggiungerne altri.";
      }
      setRow(key, { busy: false, err: msg });
    }
  };

  const judgeSelect = (key) => (
    <select
      value={rowState[key]?.userId || ""}
      onChange={(e) => setRow(key, { userId: e.target.value, err: "" })}
      style={{ minWidth: 160 }}
    >
      <option value="">Scegli giudice…</option>
      {judges.map((j) => (
        <option key={j.id} value={j.id}>
          {j.username}
        </option>
      ))}
    </select>
  );

  const isEmpty = data.challenges.length === 0 && data.events.length === 0;

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Copertura giudici</h1>
        <p className="page-subtitle">
          Sfide ed eventi che non hanno abbastanza giudici. Tappa i buchi: avanza il
          round-robin o assegna a mano.
        </p>

        {/* Sweep round-robin */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={sweeping} onClick={doSweep}>
              {sweeping ? "…" : "Avanza round-robin (sweep)"}
            </button>
            <span className="muted small">
              Genera offerte per le sfide scoperte oltre la finestra, verso i giudici disponibili.
            </span>
          </div>
          {sweepMsg && (
            <div className="callout neutral" style={{ marginTop: 10 }}>{sweepMsg}</div>
          )}
        </div>

        {loading && <TextBlock>Caricamento copertura…</TextBlock>}

        {!loading && error && (
          <div
            className="callout error"
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <span>{error}</span>
            <button className="btn btn-ghost" onClick={loadCoverage}>
              Riprova
            </button>
          </div>
        )}

        {!loading && !error && isEmpty && (
          <TextBlock>Tutto coperto: nessuna sfida o evento sotto-coperto al momento. 🎉</TextBlock>
        )}

        {!loading && !error && !isEmpty && (
          <>
            {data.challenges.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <h2 className="dynamic-title">Sfide sotto-coperte ({data.challenges.length})</h2>
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
                              giudici {c.coverage}/{c.coverageCap} · mancano {c.missing}
                              {c.pendingOffers > 0 ? ` · ${c.pendingOffers} offerte in volo` : ""}
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost"
                            onClick={() => navigate(routes.judge.challengeOverview(c.id))}
                          >
                            Apri
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {judgeSelect(key)}
                          <button className="btn btn-outline" disabled={rs.busy} onClick={() => doAssign("c", c.id)}>
                            {rs.busy ? "…" : "Assegna"}
                          </button>
                        </div>

                        {rs.err && <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>}
                        {rs.msg && <div className="callout neutral" style={{ marginTop: 8 }}>{rs.msg}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.events.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <h2 className="dynamic-title">Eventi sotto-coperti ({data.events.length})</h2>
                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {data.events.map((ev) => {
                    const key = `e:${ev.id}`;
                    const rs = rowState[key] || {};
                    return (
                      <div key={key} className="card-info neutral">
                        <div>
                          <strong>{ev.name || `Evento #${ev.id}`}</strong>
                          <div className="muted small">
                            giudici {ev.coverage}/{ev.coverageCap} · mancano {ev.missing}
                            {ev.pendingOffers > 0 ? ` · ${ev.pendingOffers} offerte in volo` : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {judgeSelect(key)}
                          <button className="btn btn-outline" disabled={rs.busy} onClick={() => doAssign("e", ev.id)}>
                            {rs.busy ? "…" : "Assegna all'evento"}
                          </button>
                        </div>

                        {rs.err && <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>}
                        {rs.msg && <div className="callout neutral" style={{ marginTop: 8 }}>{rs.msg}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Ingresso admin a QUALSIASI sfida aperta: override (§7.4) e force-release
            (§3) vivono nell'overview, non solo sui buchi di copertura. */}
        {!loading && !error && openChallenges.length > 0 && (
          <div className="card" style={{ padding: 16, marginTop: 20 }}>
            <h2 className="dynamic-title">Apri una sfida (revisione / override)</h2>
            <p className="muted small" style={{ marginTop: 4 }}>
              Tutte le sfide aperte. Apri l'overview per revisionare, forzare il
              rilascio di un claim o ribaltare una decisione.
            </p>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {openChallenges.map((c) => (
                <div
                  key={c.id}
                  className="card-info neutral"
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}
                >
                  <strong>{c.title || `Sfida #${c.id}`}</strong>
                  <button
                    className="btn btn-ghost"
                    onClick={() => navigate(routes.judge.challengeOverview(c.id))}
                  >
                    Apri
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
