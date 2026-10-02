// src/components/admin/PointsCorrectionModal.jsx
/**
 * PointsCorrectionModal.jsx
 * -------------------------
 * Correzione di un contributo già deciso (override admin §7.4), dalla pagina
 * «Correzione punti» (PM-4 e PM-3, decisione PM 2/10/2026).
 *
 * Mostra stato, punti di oggi e proposta del motore, calcolata al momento dal backend.
 * Il campo punti PARTE DALLA PROPOSTA DEL MOTORE: prima partiva vuoto e una
 * ri-approvazione si faceva con un numero deciso alla cieca. Se il motore non fa una
 * proposta (task senza calcolatore), parte dai punti di oggi e lo dice.
 *
 * PROPS:
 *   submission {Object}   - riga dell'elenco: { id, user_name, challenge_title, task_title, status, points }
 *   onClose    {Function} - chiusura senza modifiche
 *   onDone     {Function} - riceve la risposta dell'override, a correzione riuscita
 *
 * ENDPOINT: GET /admin/submissions/:id/points-preview, POST /submissions/:id/override
 */

import React, { useEffect, useState } from "react";
import Modal from "@/components/UI/Modal";
import { getPointsPreview, overrideSubmission } from "@/api/adminSubmissions.api";

const STATUS_LABEL = { approved: "approvato", rejected: "rifiutato" };

export default function PointsCorrectionModal({ submission, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoadError("");
    try {
      const p = await getPointsPreview(submission.id);
      setPreview(p);
      setPoints(String(p.engine_proposal ?? p.points_now ?? 0));
    } catch {
      setLoadError("Non riesco a leggere i punti di questo contributo.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id]);

  async function apply(decision) {
    setError("");
    if (decision === "approved" && (points === "" || Number.isNaN(Number(points)) || Number(points) < 0)) {
      setError("Indica i punti da assegnare (zero o più).");
      return;
    }
    setBusy(true);
    try {
      const res = await overrideSubmission(submission.id, {
        decision,
        points: Number(points),
        note: note.trim(),
      });
      onDone?.(res);
    } catch (e) {
      const status = e?.response?.status;
      setError(
        status === 503
          ? "La correzione non è stata registrata e non è rimasto nulla a metà: riprova."
          : e?.response?.data?.message || "La correzione non è riuscita. Riprova."
      );
    } finally {
      setBusy(false);
    }
  }

  const who = submission.user_name || "persona senza nome";

  return (
    <Modal title={`Correggi il contributo #${submission.id}`} onClose={busy ? undefined : onClose}>
      <p className="muted small" style={{ marginTop: 0 }}>
        {who} · {submission.challenge_title || "sfida"} · {submission.task_title || "task"}
      </p>

      {loadError ? (
        <>
          <div className="card-info error" role="alert">{loadError}</div>
          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-primary" onClick={load} style={{ flex: 1 }}>Riprova</button>
            <button className="btn btn-ghost" onClick={onClose}>Chiudi</button>
          </div>
        </>
      ) : !preview ? (
        <p className="muted small">Calcolo la proposta del motore…</p>
      ) : (
        <>
          <ul className="muted small" style={{ margin: "0 0 12px", paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Stato: <strong>{STATUS_LABEL[preview.status] || preview.status}</strong></li>
            <li>Punti di oggi: <strong>{preview.points_now}</strong></li>
            <li>
              Proposta del motore:{" "}
              {preview.engine_proposal == null
                ? <strong>nessuna (il task non ha un calcolo dei punti)</strong>
                : <strong>{preview.engine_proposal}</strong>}
            </li>
          </ul>

          <div className="form-group">
            <label htmlFor="pc-points">Punti, se forzi l'approvazione</label>
            <input
              id="pc-points"
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <div className="muted small" style={{ marginTop: 4 }}>
              {preview.engine_proposal == null
                ? "Parte dai punti di oggi."
                : "Parte dalla proposta del motore: cambialo solo se hai un motivo."}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pc-note">Nota (facoltativa)</label>
            <textarea
              id="pc-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo della correzione…"
            />
          </div>

          <p className="muted small">
            Forzare il rifiuto di un contributo approvato toglie da sé i punti dalla classifica
            e la CO₂ dai totali. Il movimento resta a registro azzerato, con la sua storia.
          </p>

          {error && <div className="card-info error" role="alert">{error}</div>}

          <div className="dynamic-actions" style={{ marginTop: 4, flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy} onClick={() => apply("approved")}>
              {busy ? "…" : "Forza approvata"}
            </button>
            <button className="btn btn-outline" disabled={busy} onClick={() => apply("rejected")}>
              {busy ? "…" : "Forza rifiutata"}
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={onClose}>
              Annulla
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
