// src/components/judge/JudgeChallengeCard.jsx
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

