// src/components/judge/JudgeChallengeCard.jsx
/**
 * JudgeChallengeCard.jsx
 * ---------------------
 * Card di riepilogo utilizzata nella dashboard del giudice.
 *
 * SCOPO
 * Fornisce una vista sintetica di una challenge assegnata al giudice,
 * permettendo di capire a colpo d’occhio se sono presenti submission
 * in attesa di revisione.
 *
 * CONTESTO DI UTILIZZO
 * - Renderizzata all’interno di JudgeDashboard.jsx
 * - Una card per ogni challenge assegnata al giudice autenticato
 *
 * INFORMAZIONI MOSTRATE
 * - Titolo della challenge
 * - Livello di difficoltà (se disponibile)
 * - Numero di submission in stato "pending"
 *
 * COMPORTAMENTO UX
 * - Se esistono submission in attesa:
 *   → CTA primaria: "Revisiona"
 * - Se non ci sono submission pending:
 *   → CTA secondaria: "Apri overview"
 *
 * NAVIGAZIONE
 * - Porta alla pagina:
 *   /judge/challenges/:id
 *   (JudgeChallengeOverview.jsx)
 *
 * STATO DEL FILE
 * - File ATTIVO
 * - Non legacy
 * - Parte del flusso giudice ufficiale (post refactor user-centrico)
 *
 * NOTA
 * Questo componente è volutamente semplice:
 * nessuna logica di business, solo orientamento rapido del giudice.
 */

import React from "react";
import { useNavigate } from "react-router-dom";

export default function JudgeChallengeCard({ challenge }) {
  const navigate = useNavigate();

  const hasPending = challenge.pending_count > 0;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{challenge.title}</h3>
        <span className="chip">
          {challenge.difficulty !== "n/a"
            ? challenge.difficulty
            : "—"}
        </span>
      </div>

      <ul className="meta-list">
        <li>
          <span className="meta-label">Submission in attesa</span>
          <span className="meta-value">
            {challenge.pending_count}
          </span>
        </li>
      </ul>

      <div className="card-actions">
        <button
          className={`btn ${hasPending ? "btn-primary" : "btn-ghost"}`}
          onClick={() =>
            navigate(`/judge/challenges/${challenge.id}`)
          }
        >
          {hasPending ? "Revisiona" : "Apri overview"}
        </button>
      </div>
    </div>
  );
}

