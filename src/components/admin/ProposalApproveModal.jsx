// src/components/admin/ProposalApproveModal.jsx
/**
 * ProposalApproveModal.jsx
 * ------------------------
 * Approvazione di una proposta di sfida passando dal preflight (decisione PM
 * 1/10/2026). Prima di approvare si vede che cosa il backend ha trovato nei task:
 * - rilievi bloccanti: la proposta non può diventare sfida, non c'è il pulsante per
 *   approvare; l'uscita è respingerla e avvisare chi l'ha proposta;
 * - soli avvisi: «Approva comunque», che invia la conferma esplicita;
 * - niente da segnalare: «Approva».
 *
 * PROPS:
 *   proposal   {Object}   - { id, title } della proposta
 *   onClose    {Function} - chiusura senza approvare
 *   onApproved {Function} - riceve l'id della proposta approvata
 *
 * ENDPOINT: GET /admin/proposals/:id/preflight, PATCH /challenge-proposals/:id/approve
 */

import React, { useEffect, useState } from "react";
import Modal from "@/components/UI/Modal";
import { api, API_PATHS } from "@/api/client";

export default function ProposalApproveModal({ proposal, onClose, onApproved }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(API_PATHS.proposalPreflight(proposal.id));
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Controllo non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal.id]);

  const approve = async () => {
    setBusy(true);
    setError("");
    try {
      await api.patch(API_PATHS.approveProposal(proposal.id), {
        confirm_warnings: !!report?.needs_confirmation,
      });
      onApproved?.(proposal.id);
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
  const smallStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginTop: 4 };

  const blocking = report?.findings?.filter((f) => f.level === "block") ?? [];
  const warnings = report?.findings?.filter((f) => f.level === "warn") ?? [];

  const findingList = (items) => (
    <ul style={listStyle}>
      {items.map((f, i) => (
        <li key={`${f.code}-${f.task_index}-${i}`} style={itemStyle}>
          <div style={{ color: "#ffffff", fontWeight: 500 }}>
            {f.task_title ? `Task «${f.task_title}»` : "Sfida"}
          </div>
          <div style={smallStyle}>{f.message}</div>
        </li>
      ))}
    </ul>
  );

  return (
    <Modal title={`Approvare «${proposal.title || "senza titolo"}»?`} onClose={busy ? undefined : onClose}>
      {loading && !report && <p style={textStyle}>Controllo dei task in corso…</p>}

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
              Questa proposta non può diventare una sfida: i contributi avrebbero impatto
              zero e zero punti. Respingila e avvisa chi l'ha proposta di cosa correggere.
            </div>
          ) : warnings.length > 0 ? (
            <p style={textStyle}>
              I task si possono approvare, ma ci sono scelte da confermare.
            </p>
          ) : (
            <div className="card-info success">
              Configurazione dei task a posto: la sfida nasce aperta e ogni contributo
              viene calcolato.
            </div>
          )}

          {blocking.length > 0 && findingList(blocking)}
          {warnings.length > 0 && findingList(warnings)}

          {error && <div className="card-info error" role="alert">{error}</div>}

          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            {!report.blocked && (
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
              {report.blocked ? "Chiudi" : "Annulla"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
