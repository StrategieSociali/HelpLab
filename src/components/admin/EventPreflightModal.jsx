// src/components/admin/EventPreflightModal.jsx
/**
 * EventPreflightModal.jsx
 * -----------------------
 * Preflight d'evento (PM-6 ridefinito, decisione PM 1/10/2026): che cosa il backend ha
 * trovato nella configurazione delle sfide di un evento, più un riepilogo leggibile
 * (per ogni task: calcolatore, modo di verifica, evidenze). Il «modo di verifica atteso»
 * è un'intenzione di chi organizza: non si controlla, si legge qui.
 *
 * Due usi:
 * - dall'indicatore della riga (`onApproved` assente): solo lettura;
 * - da «Approva»: i pulsanti del cancello. Con un blocco non si approva; con soli
 *   avvisi «Approva comunque» invia la conferma; senza rilievi «Approva».
 *
 * PROPS:
 *   event      {Object}    - { id, name }
 *   onClose    {Function}  - chiusura
 *   onApproved {Function?} - riceve la risposta di PATCH /events/:id/approve
 *
 * ENDPOINT: GET /admin/events/:id/preflight, PATCH /events/:id/approve
 */

import React, { useEffect, useState } from "react";
import Modal from "@/components/UI/Modal";
import { getEventPreflight, approveEvent } from "@/api/events.api";

const VERIFICATION_LABEL = {
  user: "a fiducia",
  auto: "automatica",
  judge: "giudice",
};

export default function EventPreflightModal({ event, onClose, onApproved }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");

  const approving = typeof onApproved === "function";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await getEventPreflight(event.id));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Controllo non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const approve = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await approveEvent(event.id, { confirm_warnings: !!report?.needs_confirmation });
      onApproved(res);
    } catch (err) {
      const data = err?.response?.data;
      // Il backend rifà lo stesso controllo: se nel frattempo è cambiato, lo si mostra.
      if (data?.preflight) setReport(data.preflight);
      setError(data?.message || data?.error || err?.message || "Approvazione non riuscita.");
      setBusy(false);
    }
  };

  const textStyle = { color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 };
  const listStyle = { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 };
  const itemStyle = {
    padding: "10px 12px", borderRadius: 8,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
  };
  const headStyle  = { color: "#ffffff", fontSize: "1rem", fontWeight: 600, margin: 0 };
  const smallStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginTop: 4 };

  const blocking = report?.findings?.filter((f) => f.level === "block") ?? [];
  const warnings = report?.findings?.filter((f) => f.level === "warn") ?? [];

  const where = (f) =>
    [f.challenge_title && `Sfida «${f.challenge_title}»`, f.task_title && `task «${f.task_title}»`]
      .filter(Boolean)
      .join(" · ") || "Evento";

  const findingList = (items) => (
    <ul style={listStyle}>
      {items.map((f, i) => (
        <li key={`${f.code}-${f.challenge_id}-${f.task_index}-${i}`} style={itemStyle}>
          <div style={{ color: "#ffffff", fontWeight: 500 }}>{where(f)}</div>
          <div style={smallStyle}>{f.message}</div>
        </li>
      ))}
    </ul>
  );

  const title = approving
    ? `Approvare «${event.name || "senza nome"}»?`
    : `Configurazione di «${event.name || "senza nome"}»`;

  return (
    <Modal title={title} onClose={busy ? undefined : onClose}>
      {loading && !report && <p style={textStyle}>Controllo della configurazione in corso…</p>}

      {!loading && !report && error && (
        <>
          <div className="card-info error" role="alert">{error}</div>
          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-primary" onClick={load} style={{ flex: 1 }}>Riprova</button>
            <button className="btn btn-ghost" onClick={onClose}>Chiudi</button>
          </div>
        </>
      )}

      {report && (
        <>
          {report.blocked ? (
            <div className="card-info error" role="alert">
              Alcuni task darebbero zero impatto e zero punti a ogni contributo.
              {approving
                ? " L'evento non si può pubblicare finché non si corregge il task o si scollega la sfida."
                : " Va corretto il task o scollegata la sfida."}
            </div>
          ) : warnings.length > 0 ? (
            <p style={textStyle}>
              Nessun task darebbe zero, ma ci sono scelte da confermare.
            </p>
          ) : (
            <div className="card-info success">
              Configurazione a posto: ogni contributo viene calcolato.
            </div>
          )}

          {blocking.length > 0 && findingList(blocking)}
          {warnings.length > 0 && findingList(warnings)}

          {report.challenges?.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={headStyle}>Riepilogo delle sfide</h3>
              <p style={smallStyle}>
                Il modo di verifica è quello che hai scelto: controlla che sia quello che intendevi.
              </p>
              <ul style={listStyle}>
                {report.challenges.map((c) => (
                  <li key={c.id} style={itemStyle}>
                    <div style={{ color: "#ffffff", fontWeight: 500 }}>
                      {c.title}{c.status !== "open" && " (non aperta)"}
                    </div>
                    {c.tasks.length === 0 && <div style={smallStyle}>Nessun task.</div>}
                    {c.tasks.map((t, i) => (
                      <div key={i} style={smallStyle}>
                        {t.title || "Task senza titolo"}: {t.calculator || "nessun calcolatore"} · verifica{" "}
                        {VERIFICATION_LABEL[t.verification_mode] || t.verification_mode} ·{" "}
                        {t.evidence_required ? "evidenze obbligatorie" : "senza evidenze"}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {error && <div className="card-info error" role="alert">{error}</div>}

          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            {approving && !report.blocked && (
              <button
                className="btn btn-primary"
                onClick={approve}
                disabled={busy}
                aria-busy={busy}
                style={{ flex: 1 }}
              >
                {busy ? "Approvazione…" : warnings.length > 0 ? "Approva comunque" : "Approva"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {approving && !report.blocked ? "Annulla" : "Chiudi"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
