// src/components/judge/JudgeScoreCard.jsx
/**
 * JudgeScoreCard.jsx
 * ------------------
 * Punteggio-attività del giudice (multi-giudice §6).
 *
 * SCOPO
 * Mostra l'asse "attività" del giudice (quanto lavora): +10 per submission
 * approvata (valore in config lato BE). È il seme della gamification; è distinto
 * dalla reputazione-qualità (stelline, points.v1), che vive altrove.
 *
 * DATI
 * - GET /api/v1/judge/score → { score } (0 se non ha ancora una riga)
 *
 * NOTA
 * - Stat non critica: in errore resta discreta (niente blocco della dashboard).
 * - score 0 è un valore valido (giudice nuovo), non uno stato "vuoto".
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getJudgeScore } from "@/api/judge.api";

export default function JudgeScoreCard() {
  const { token } = useAuth();
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) return;
    getJudgeScore(token)
      .then((res) => {
        if (alive) setScore(res.score ?? 0);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div
        aria-hidden={loading || error}
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1,
          color: "#7c83ff",
          minWidth: 44,
          textAlign: "center",
        }}
      >
        {loading ? "…" : error ? "—" : score}
      </div>
      <div>
        <div style={{ fontWeight: 600 }}>Punteggio attività</div>
        <div className="muted small">
          {error
            ? "Punteggio non disponibile al momento."
            : "Cresce di 10 punti a ogni submission che approvi."}
        </div>
      </div>
    </div>
  );
}
