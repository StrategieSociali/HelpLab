// src/pages/admin/AdminAudit.jsx
/**
 * AdminAudit.jsx
 * --------------
 * Pannello admin dell'audit adattivo §3-bis.
 *
 * Route: /dashboard/admin/audit   ·   Accesso: admin
 *
 * SCOPO
 * L'admin guida il run d'audit su un EVENTO: apre il campione iniziale, valuta il
 * cancello di qualità (che approfondisce se sotto target), vede lo stato, e lavora
 * la lista dei clawback (revoca punti ADMIN-MANUALE per agosto: reverte a mano,
 * poi segna risolto). La re-review dei casi la fanno i giudici (coda audit §3-bis).
 *
 * DATI
 * - GET  /api/v1/admin/events                       → selettore evento
 * - POST /api/v1/admin/events/:id/audit/open         → apre l'audit (idempotente)
 * - POST /api/v1/admin/events/:id/audit/evaluate     → valuta / approfondisce
 * - GET  /api/v1/admin/events/:id/audit/state        → conteggi + qualità + cancello
 * - GET  /api/v1/admin/audit/clawbacks?eventId=       → casi da revertire
 * - POST /api/v1/admin/audit/cases/:id/clawback/resolve → segna revertito
 */

import React, { useEffect, useState } from "react";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import { getAdminEvents } from "@/api/events.api";
import {
  openEventAudit,
  evaluateEventAudit,
  getEventAuditState,
  getAuditClawbacks,
  resolveAuditClawback,
} from "@/api/judge.api";
import "../../styles/dynamic-pages.css";

const GATE_LABEL = {
  close: "Audit chiuso: qualità sopra il target.",
  deepen: "Sotto target: estratto un nuovo campione (approfondimento).",
  full_review: "Pool esaurito e ancora sotto target: revisione completa + alert admin.",
  awaiting_review: "In attesa: ci sono casi campionati non ancora ri-revisionati.",
};

export default function AdminAudit() {
  const { token } = useAuth();

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [state, setState] = useState(null);
  const [clawbacks, setClawbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [rowState, setRowState] = useState({}); // { [caseId]: { busy, err } }

  // Elenco eventi per il selettore.
  useEffect(() => {
    getAdminEvents({ limit: 50 })
      .then((d) => setEvents(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setEvents([]));
  }, []);

  const loadState = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [st, cb] = await Promise.all([
        getEventAuditState(token, id),
        getAuditClawbacks(token, id),
      ]);
      setState(st);
      setClawbacks(cb);
    } catch (e) {
      setError("Impossibile caricare lo stato dell'audit.");
    } finally {
      setLoading(false);
    }
  };

  const onSelectEvent = (id) => {
    setEventId(id);
    setState(null);
    setClawbacks([]);
    setActionMsg("");
    if (id) loadState(id);
  };

  const doOpen = async () => {
    setBusy(true);
    setActionMsg("");
    try {
      const r = await openEventAudit(token, eventId);
      setActionMsg(
        r.opened ? `Audit aperto: ${r.sampled} casi campionati.` : "Audit già aperto su questo evento (usa Valuta per approfondire)."
      );
      await loadState(eventId);
    } catch (e) {
      setActionMsg("Apertura non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  const doEvaluate = async () => {
    setBusy(true);
    setActionMsg("");
    try {
      const r = await evaluateEventAudit(token, eventId);
      const label = GATE_LABEL[r.action] || r.action;
      setActionMsg(
        `${label}${r.action === "deepen" ? ` (+${r.sampled} casi, giro ${r.round})` : ""}`
      );
      await loadState(eventId);
    } catch (e) {
      setActionMsg("Valutazione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  const onResolve = async (c) => {
    setRowState((p) => ({ ...p, [c.id]: { busy: true, err: "" } }));
    try {
      await resolveAuditClawback(token, c.id);
      setClawbacks((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      setRowState((p) => ({ ...p, [c.id]: { busy: false, err: "Non riuscito. Riprova." } }));
    }
  };

  const pct = (q) => (q == null ? "—" : `${Math.round(q * 100)}%`);

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Audit qualità</h1>
        <p className="page-subtitle">
          Ricontrollo a campione delle approvazioni automatiche di un evento. Apri
          l'audit, valuta il cancello di qualità, gestisci i clawback.
        </p>

        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Evento</label>
            <select value={eventId} onChange={(e) => onSelectEvent(e.target.value)} style={{ minWidth: 240 }}>
              <option value="">Scegli un evento…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name || `Evento #${ev.id}`} {ev.status ? `· ${ev.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          {eventId && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={busy} onClick={doOpen}>
                {busy ? "…" : "Apri audit"}
              </button>
              <button className="btn btn-outline" disabled={busy} onClick={doEvaluate}>
                {busy ? "…" : "Valuta cancello"}
              </button>
            </div>
          )}
          {actionMsg && <div className="callout neutral" style={{ marginTop: 10 }}>{actionMsg}</div>}
        </div>

        {!eventId && <TextBlock>Scegli un evento per vedere lo stato dell'audit.</TextBlock>}

        {eventId && loading && <TextBlock>Caricamento stato…</TextBlock>}

        {eventId && !loading && error && (
          <div className="callout error" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>{error}</span>
            <button className="btn btn-ghost" onClick={() => loadState(eventId)}>Riprova</button>
          </div>
        )}

        {eventId && !loading && !error && state && (
          <>
            {/* Stato del run */}
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <h2 className="dynamic-title">Stato</h2>
              <div className="muted small" style={{ marginTop: 8, lineHeight: 1.8 }}>
                Pool auditabile: <strong>{state.state.poolSize}</strong> ·
                {" "}ri-revisionati: <strong>{state.state.audited}</strong>
                {" "}(validi <strong>{state.state.valid}</strong> / invalidi <strong>{state.state.invalid}</strong>) ·
                {" "}aperti: <strong>{state.state.open}</strong> ·
                {" "}giro: <strong>{state.state.round}</strong> ·
                {" "}qualità: <strong>{pct(state.quality)}</strong>
              </div>
              {state.gate?.action && (
                <div className="callout neutral" style={{ marginTop: 10 }}>
                  {GATE_LABEL[state.gate.action] || state.gate.action}
                </div>
              )}
            </div>

            {/* Clawback da revertire */}
            <div className="card" style={{ padding: 16 }}>
              <h2 className="dynamic-title">Clawback da revertire ({clawbacks.length})</h2>
              <p className="muted small" style={{ marginTop: 4 }}>
                Casi invalidati: revoca i punti a mano (points.v1), poi segna risolto.
              </p>
              {clawbacks.length === 0 ? (
                <div className="card-info neutral" style={{ marginTop: 10 }}>Nessun clawback in sospeso.</div>
              ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {clawbacks.map((c) => {
                    const rs = rowState[c.id] || {};
                    return (
                      <div key={c.id} className="card-info neutral">
                        <div>
                          <strong>Submission #{c.submissionId}</strong>
                          <div className="muted small">
                            sfida #{c.submission?.challengeId ?? "—"} · utente #{c.submission?.userId ?? "—"} ·
                            {" "}punti da revocare: <strong>{c.submission?.pointsAwarded ?? "—"}</strong> · modalità {c.verificationMode}
                          </div>
                          {c.note && <div className="muted small" style={{ marginTop: 4 }}>Nota: {c.note}</div>}
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <button className="btn btn-outline" disabled={rs.busy} onClick={() => onResolve(c)}>
                            {rs.busy ? "…" : "Segna risolto (punti revertiti)"}
                          </button>
                        </div>
                        {rs.err && <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
