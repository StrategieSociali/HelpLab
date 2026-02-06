// src/components/judge/JudgeChallengeCard.jsx
/**
 * JudgeChallengeCard.jsx
 * ---------------------
 * Card di riepilogo utilizzata nella dashboard del giudice.
 *
 * SCOPO
 * Rappresenta una singola challenge assegnata a un giudice, fornendo
 * una vista sintetica e immediata sullo stato delle submission.
 *
 * È il punto di ingresso operativo del giudice verso:
 * - la revisione delle submission
 * - l’overview completa della challenge
 *
 * CONTESTO DI UTILIZZO
 * - Utilizzata esclusivamente in JudgeDashboard.jsx
 * - Ogni card corrisponde a una challenge assegnata al giudice autenticato
 *
 * INFORMAZIONI MOSTRATE
 * - Titolo della challenge
 * - Livello di difficoltà (se disponibile)
 * - Numero di submission in stato "pending"
 *
 * COMPORTAMENTO UX
 * - Se sono presenti submission in attesa:
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
 * - Parte integrante del nuovo flusso giudice
 *
 * NOTA DI DESIGN
 * Questo componente non gestisce logica di business:
 * è volutamente minimale e orientato alla scansione rapida
 * dello stato di lavoro del giudice.
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

