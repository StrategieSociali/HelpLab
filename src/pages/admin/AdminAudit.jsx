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
 * l'elenco dei contributi invalidati. Dal 6/8/2026 la revoca NON è più manuale: si
 * rifiuta il contributo e punti (BE 0.17.7) e CO2 (BE 0.18.0) escono da soli; qui si
 * segna solo che è stato fatto. La re-review dei casi la fanno i giudici (§3-bis).
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
          Alcune submission vengono approvate <strong>automaticamente</strong> (per
          fiducia o tramite controllo software), senza il giudizio di una persona.
          L'audit ne <strong>ri-controlla un campione a sorpresa</strong>: serve a
          scoraggiare abusi e collusione senza dover rivedere tutto a mano.
        </p>

        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h2 className="dynamic-title">Come funziona</h2>
          <ol className="muted small" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.9 }}>
            <li>
              <strong>Apri audit</strong>: estrai un primo campione casuale di
              approvazioni automatiche dell'evento, da far ri-controllare ai giudici.
            </li>
            <li>
              I <strong>giudici</strong> ri-controllano ogni caso dalla loro coda e lo
              <strong> validano</strong> (l'approvazione era corretta) o lo
              <strong> invalidano</strong> (era sbagliata).
            </li>
            <li>
              <strong>Valuta cancello</strong>: se la quota di casi confermati è sopra la
              soglia, l'audit <strong>si chiude</strong>; se troppi sono sbagliati,
              il campione <strong>si allarga da solo</strong> (approfondimento), finché la
              qualità non rientra o si è controllato tutto il pool.
            </li>
            <li>
              Ogni caso <strong>invalidato</strong> finisce nell'elenco qui sotto:
              i punti già assegnati vanno ancora tolti.
            </li>
          </ol>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Evento</label>
            <select className="control" value={eventId} onChange={(e) => onSelectEvent(e.target.value)} style={{ minWidth: 240 }}>
              <option value="">Scegli un evento…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name || `Evento #${ev.id}`} {ev.status ? `· ${ev.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          {eventId && (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-primary" disabled={busy} onClick={doOpen}>
                  {busy ? "…" : "Apri audit"}
                </button>
                <button className="btn btn-outline" disabled={busy} onClick={doEvaluate}>
                  {busy ? "…" : "Valuta cancello"}
                </button>
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                Prima <strong>Apri audit</strong> (una volta). Poi, dopo che i giudici
                hanno ri-controllato i casi, usa <strong>Valuta cancello</strong> per
                decidere se chiudere o allargare il campione.
              </p>
            </>
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
                  <strong>Cancello di qualità:</strong> {GATE_LABEL[state.gate.action] || state.gate.action}
                </div>
              )}
              <ul className="muted small" style={{ margin: "12px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li><strong>Pool auditabile</strong>: totale delle approvazioni automatiche dell'evento (il massimo controllabile).</li>
                <li><strong>Ri-revisionati</strong>: casi già chiusi dai giudici — <strong>validi</strong> (confermati) o <strong>invalidi</strong> (respinti).</li>
                <li><strong>Aperti</strong>: casi campionati ma non ancora ri-controllati dai giudici.</li>
                <li><strong>Giro</strong>: quante volte il campione è stato allargato (1 = solo il campione iniziale).</li>
                <li><strong>Qualità</strong>: quota di casi confermati sul totale ri-revisionati; alta = le auto-approvazioni sono affidabili.</li>
              </ul>
            </div>

            {/* Contributi invalidati: punti ancora da togliere */}
            <div className="card" style={{ padding: 16 }}>
              <h2 className="dynamic-title">Punti da togliere ({clawbacks.length})</h2>
              {/* Il pulsante si chiamava "Fatto, punti tolti": affermava un fatto che
                  NON compie — toglie solo la riga da questo elenco. Premuto senza aver
                  prima rifiutato il contributo, lascia punti e CO₂ nei totali e cancella
                  l'unico promemoria del lavoro rimasto, in silenzio. Successo davvero il
                  12/8/2026 durante la prova generale. Ora l'etichetta dice cosa fa, e
                  l'istruzione sta PRIMA di ogni riga invece che solo in cima al blocco. */}
              <p className="muted small" style={{ marginTop: 4 }}>
                Un giudice ha ri-controllato questi contributi e li ha giudicati{" "}
                <strong>non validi</strong>, ma i punti e la CO₂ sono ancora conteggiati.
                In due passi: <strong>1.</strong> apri il contributo nella pagina della sua
                sfida e <strong>rifiutalo</strong> — lì punti e impatto escono da soli;{" "}
                <strong>2.</strong> torna qui e togli la riga dall'elenco. Il pulsante qui
                sotto fa <em>solo</em> il passo 2: da solo non toglie nulla.
              </p>
              {clawbacks.length === 0 ? (
                <div className="card-info neutral" style={{ marginTop: 10 }}>Nessun contributo da sistemare.</div>
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
                          <div className="muted small" style={{ marginBottom: 6 }}>
                            Prima rifiuta il contributo dalla pagina della sfida, poi:
                          </div>
                          <button className="btn btn-outline" disabled={rs.busy} onClick={() => onResolve(c)}>
                            {rs.busy ? "…" : "L'ho già rifiutato, togli la riga"}
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
