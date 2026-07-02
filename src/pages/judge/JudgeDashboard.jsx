// src/pages/judge/JudgeDashboard.jsx
/**
 * JudgeDashboard.jsx
 * ------------------
 * Dashboard principale per gli utenti con ruolo "judge".
 *
 * SCOPO
 * Questo componente rappresenta il punto di ingresso del giudice nella piattaforma.
 * Mostra l’elenco delle challenge assegnate al giudice autenticato e costituisce
 * il punto di partenza per l’attività di revisione e validazione delle submission.
 *
 * CONTESTO ARCHITETTURALE
 * - Fa parte del nuovo flusso user-centrico (non challenge-centrico).
 * - Sostituisce di fatto le vecchie viste legacy basate su listing globali di submission.
 * - Ogni giudice vede solo le challenge a lui assegnate tramite endpoint dedicato.
 *
 * FLUSSO DATI
 * - Recupera il token dall’AuthContext.
 * - Chiama l’endpoint `getJudgeChallenges` per ottenere le challenge assegnate.
 * - Ogni challenge viene renderizzata tramite `JudgeChallengeCard`,
 *   che gestisce la navigazione verso il dettaglio/moderazione.
 *
 * STATO ATTUALE
 * - File attivo e NON legacy.
 * - Punto di riferimento per tutta l’esperienza giudice.
 * - Da estendere in futuro con metriche, badge di priorità e stati di avanzamento.
 */
import React, { useEffect, useState } from "react";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import { getJudgeChallenges } from "@/api/judge.api";
import JudgeChallengeCard from "@/components/judge/JudgeChallengeCard";
import AvailabilityPanel from "@/components/judge/AvailabilityPanel";
import OffersPanel from "@/components/judge/OffersPanel";
import AuditQueuePanel from "@/components/judge/AuditQueuePanel";
import JudgeScoreCard from "@/components/judge/JudgeScoreCard";
import "../../styles/dynamic-pages.css";

export default function JudgeDashboard() {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadChallenges = () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    getJudgeChallenges(token)
      .then((res) => {
        setItems(res.challenges || []);
      })
      .catch((err) => {
        console.error("Errore dashboard giudice", err);
        setError("Errore nel caricamento delle challenge assegnate.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">Dashboard Giudice</h1>
        <p className="page-subtitle">
          Qui trovi le challenge assegnate a te e le submission in attesa di revisione.
        </p>

        {/* Punteggio-attività del giudice (§6) */}
        <JudgeScoreCard />

        {/* Disponibilità settimanale (§5): gate del push, indicatore di stato */}
        <AvailabilityPanel />

        {/* Offerte round-robin Fase 2 (§4.2): visibili solo se ce ne sono */}
        <OffersPanel onChange={reloadChallenges} />

        {/* Coda d'audit §3-bis: casi campionati da ri-controllare (nascosta se vuota) */}
        <AuditQueuePanel />

        <h2 className="dynamic-title" style={{ marginTop: 8 }}>
          Le tue challenge
        </h2>

        {loading ? (
          <TextBlock>Caricamento challenge assegnate…</TextBlock>
        ) : error ? (
          <div className="callout error" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>{error}</span>
            <button className="btn btn-ghost" onClick={reloadChallenges}>
              Riprova
            </button>
          </div>
        ) : items.length === 0 ? (
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

