// src/pages/admin/AdminPointsCorrection.jsx
/**
 * AdminPointsCorrection.jsx
 * -------------------------
 * Pagina admin «Correzione punti» (PM-4 e PM-3, decisione PM 2/10/2026).
 *
 * SCOPO
 * Correggere un contributo già deciso (override §7.4) trovandolo in due clic dal menu
 * admin. Il 30/8 l'override esisteva ma stava in fondo alla pagina del giudice, che un
 * admin raggiunge solo per le sfide di cui è giudice: in mezzo all'evento non si trovava.
 * Ora vive solo qui.
 *
 * FLUSSO
 * Si sceglie la sfida (solo quelle con contributi decisi) e/o si cerca la persona per
 * nome; l'elenco mostra approvati e rifiutati, dal più recente. «Correggi» apre
 * PointsCorrectionModal, con la proposta del motore già nel campo punti. La riga
 * appena corretta resta segnata in verde, «✓ Appena corretto» (rilievo PM 2/10/2026:
 * in prova una seconda correzione è finita sulla riga sbagliata).
 *
 * ENDPOINT: vedi src/api/adminSubmissions.api.js
 */

import React, { useEffect, useState } from "react";
import PointsCorrectionModal from "@/components/admin/PointsCorrectionModal";
import { getCorrectionChallenges, getDecidedSubmissions } from "@/api/adminSubmissions.api";

const STATUS_LABEL = { approved: "approvato", rejected: "rifiutato" };

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("it-IT");
}

export default function AdminPointsCorrection() {
  const [challenges, setChallenges] = useState([]);
  const [challengeId, setChallengeId] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [doneMsg, setDoneMsg] = useState("");
  const [lastCorrectedId, setLastCorrectedId] = useState(null);

  useEffect(() => {
    getCorrectionChallenges()
      .then(setChallenges)
      .catch(() => setChallenges([]));
  }, []);

  async function load({ append = false } = {}) {
    setLoading(true);
    setError("");
    try {
      const page = await getDecidedSubmissions({
        challengeId,
        q: appliedQuery,
        cursor: append ? nextCursor : undefined,
      });
      setItems((prev) => (append ? [...prev, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
    } catch {
      setError("Non riesco a caricare i contributi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, appliedQuery]);

  function onSearch(e) {
    e.preventDefault();
    setDoneMsg("");
    setAppliedQuery(query.trim());
  }

  function onDone(res) {
    const sub = editing;
    setEditing(null);
    setLastCorrectedId(sub.id);
    setDoneMsg(
      res?.status === "approved"
        ? `Contributo #${sub.id} di ${sub.user_name || "—"}: approvato, ${res.points} punti.`
        : `Contributo #${sub.id} di ${sub.user_name || "—"}: rifiutato${res?.points_revoked ? ", punti tolti dalla classifica" : ""}.`
    );
    load();
  }

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Correzione punti</h1>
        <p className="page-subtitle">
          Correggi un contributo già approvato o rifiutato: forzane l'esito e, se lo approvi,
          i punti. Il campo punti parte dalla proposta del motore.
        </p>

        <form className="card" style={{ padding: 16, marginBottom: 20 }} onSubmit={onSearch}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: "1 1 240px" }}>
              <label htmlFor="pc-challenge">Sfida</label>
              <select
                id="pc-challenge"
                className="control"
                value={challengeId}
                onChange={(e) => { setDoneMsg(""); setChallengeId(e.target.value); }}
              >
                <option value="">Tutte le sfide</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.decided_count})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: "1 1 200px" }}>
              <label htmlFor="pc-query">Persona</label>
              <input
                id="pc-query"
                className="control"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome o parte del nome"
              />
            </div>
            <button type="submit" className="btn btn-primary">Cerca</button>
          </div>
        </form>

        {doneMsg && <div className="callout neutral" role="status" style={{ marginBottom: 16 }}>{doneMsg}</div>}

        {error ? (
          <div className="callout error" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>{error}</span>
            <button className="btn btn-ghost" onClick={() => load()}>Riprova</button>
          </div>
        ) : !loading && items.length === 0 ? (
          <div className="card-info neutral">Nessun contributo deciso con questi filtri.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((s) => (
              <div
                key={s.id}
                className={`card-info ${s.id === lastCorrectedId ? "success" : "neutral"}`}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
              >
                <div>
                  <strong>#{s.id}</strong> · {s.user_name || "persona senza nome"}
                  {s.id === lastCorrectedId && <strong> · ✓ Appena corretto</strong>}
                  <div className="muted small">
                    {s.challenge_title || "sfida"} · {s.task_title || "task"}
                    {s.reviewed_at ? ` · deciso il ${fmtDate(s.reviewed_at)}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className="muted small">
                    <strong>{STATUS_LABEL[s.status] || s.status}</strong> · {s.points} punti
                  </span>
                  <button className="btn btn-outline" onClick={() => { setDoneMsg(""); setEditing(s); }}>
                    Correggi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextCursor && !error && (
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-outline" disabled={loading} onClick={() => load({ append: true })}>
              {loading ? "…" : "Carica altri"}
            </button>
          </div>
        )}

        {editing && (
          <PointsCorrectionModal
            submission={editing}
            onClose={() => setEditing(null)}
            onDone={onDone}
          />
        )}
      </div>
    </section>
  );
}
