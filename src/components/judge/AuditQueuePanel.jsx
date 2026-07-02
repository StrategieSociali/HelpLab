// src/components/judge/AuditQueuePanel.jsx
/**
 * AuditQueuePanel.jsx
 * -------------------
 * Coda d'audit del giudice — re-review dei campioni (§3-bis).
 *
 * SCOPO
 * Le approvazioni non-giudice (verification_mode user/auto) sono auditabili: un
 * campione viene ri-revisionato da un giudice, che lo VALIDA (concorde) o lo
 * INVALIDA (discorde → il caso viene segnalato per il clawback admin). È il
 * segnale che rompe la collusione e alimenta la metrica auto↔giudice.
 *
 * DATI
 * - GET  /api/v1/judge/audit/queue            → casi da ri-revisionare (esclude i propri)
 * - POST /api/v1/judge/audit/cases/:id/claim   → presa in carico morbida (409 se già preso)
 * - POST /api/v1/judge/audit/cases/:id/decide  → { outcome: validated|invalidated, note? }
 *
 * FLUSSO
 * - claim-first: il caso preso in carico ESCE dalla coda lato BE, quindi dopo il
 *   claim tengo la card in locale e mostro Valida/Invalida (nessun refetch).
 * - Su 409/404 (preso da altri / già deciso) rimuovo il caso dalla lista.
 *
 * NOTA UX
 * - Notifiche transitorie: a coda vuota il pannello si nasconde.
 * - Il giudice vede attività dichiarata, punti assegnati e modalità: non decide
 *   sui punti, valida/invalida la coerenza dell'auto-approvazione.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getJudgeAuditQueue,
  claimAuditCase,
  decideAuditCase,
} from "@/api/judge.api";

export default function AuditQueuePanel() {
  const { token } = useAuth();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowState, setRowState] = useState({}); // { [caseId]: { claimed, busy, note, err } }

  const setRow = (id, patch) =>
    setRowState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  const removeCase = (id) => setCases((prev) => prev.filter((c) => c.id !== id));

  const load = async () => {
    if (!token) return;
    setError("");
    try {
      setCases(await getJudgeAuditQueue(token));
    } catch (e) {
      setError("Impossibile caricare la coda d'audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onClaim = async (c) => {
    setRow(c.id, { busy: true, err: "" });
    try {
      await claimAuditCase(token, c.id);
      setRow(c.id, { busy: false, claimed: true });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409 || status === 404) {
        removeCase(c.id); // preso da altri o non più disponibile
      } else {
        setRow(c.id, { busy: false, err: "Presa in carico non riuscita. Riprova." });
      }
    }
  };

  const onDecide = async (c, outcome) => {
    setRow(c.id, { busy: true, err: "" });
    try {
      await decideAuditCase(token, c.id, outcome, (rowState[c.id]?.note || "").trim() || undefined);
      removeCase(c.id);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409 || status === 404) {
        removeCase(c.id); // già deciso da altri
      } else {
        setRow(c.id, { busy: false, err: "Operazione non riuscita. Riprova." });
      }
    }
  };

  // Notifiche transitorie: a vuoto/loading iniziale il pannello non si mostra.
  if (loading) return null;
  if (!error && cases.length === 0) return null;

  return (
    <div
      className="card"
      style={{ padding: 16, marginBottom: 20, border: "1px solid rgba(124,131,255,0.4)" }}
    >
      <h2 className="dynamic-title" style={{ margin: 0 }}>
        Casi da ri-controllare (audit)
      </h2>
      <p className="muted small" style={{ marginTop: 6 }}>
        Queste submission sono state approvate <strong>automaticamente</strong>, senza
        un giudice. Ti chiediamo di ricontrollarne alcune a campione: prendile in
        carico e <strong>valida</strong> se l'approvazione era corretta, oppure
        <strong> invalida</strong> se non lo era.
      </p>

      {error && (
        <div className="callout error" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={load}>Riprova</button>
        </div>
      )}

      {!error && (
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {cases.map((c) => {
            const rs = rowState[c.id] || {};
            return (
              <div key={c.id} className="card-info neutral">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>Submission #{c.submissionId}</strong>
                    <div className="muted small">
                      sfida #{c.submission?.challengeId ?? "—"} · modalità {c.verificationMode}
                      {c.sampleRound ? ` · giro ${c.sampleRound}` : ""} · punti {c.submission?.pointsAwarded ?? "—"}
                    </div>
                  </div>
                </div>

                {c.submission?.activityDescription && (
                  <p style={{ marginTop: 8, marginBottom: 0 }}>{c.submission.activityDescription}</p>
                )}

                {!rs.claimed ? (
                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-primary" disabled={rs.busy} onClick={() => onClaim(c)}>
                      {rs.busy ? "…" : "Prendi in carico"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nota (facoltativa)</label>
                      <textarea
                        rows={2}
                        value={rs.note ?? ""}
                        onChange={(e) => setRow(c.id, { note: e.target.value })}
                        placeholder="Motivo…"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" disabled={rs.busy} onClick={() => onDecide(c, "validated")}>
                        {rs.busy ? "…" : "Valida"}
                      </button>
                      <button className="btn btn-outline" disabled={rs.busy} onClick={() => onDecide(c, "invalidated")}>
                        {rs.busy ? "…" : "Invalida"}
                      </button>
                    </div>
                  </div>
                )}

                {rs.err && <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
