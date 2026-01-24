// src/pages/judge/JudgeDashboard.jsx
import React, { useEffect, useState } from "react";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import { getJudgeChallenges } from "@/api/judge.api";
import JudgeChallengeCard from "@/components/judge/JudgeChallengeCard";

export default function JudgeDashboard() {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    getJudgeChallenges(token)
      .then((res) => {
        setItems(res.challenges || []);
      })
      .catch((err) => {
        console.error("Errore dashboard giudice", err);
        setError("Errore nel caricamento delle challenge assegnate.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <TextBlock>Caricamento dashboard giudice…</TextBlock>;
  if (error) return <TextBlock>{error}</TextBlock>;

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Dashboard Giudice</h1>
        <p className="page-subtitle">
          Qui trovi le challenge assegnate a te e le submission in attesa di revisione.
        </p>

        {items.length === 0 ? (
          <TextBlock>Nessuna challenge assegnata al momento.</TextBlock>
        ) : (
          <div className="grid-cards">
            {items.map((ch) => (
              <JudgeChallengeCard key={ch.id} challenge={ch} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

