// src/pages/challenges/ChallengeSubmissions.jsx
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import JudgeModerationPanel from "@/components/JudgeModerationPanel";
import ChallengeProgress from "@/components/ChallengeProgress";
import useChallenge from "@/hooks/useChallenge"; // da creare se non l'hai
import ChallengeSubmissionList from "@/components/ChallengeSubmissionList";

export default function ChallengeSubmissions() {
  const { accessToken, user } = useAuth();
const { challengeId } = useParams(); // OK: ora challengeId è definito

const { challenge, loading, error } = useChallenge(challengeId); // OK


  if (loading) return <TextBlock>Caricamento sfida…</TextBlock>;
  if (error) return <TextBlock>Errore durante il caricamento: {error}</TextBlock>;
  if (!challenge) return <TextBlock>Sfida non trovata.</TextBlock>;
 


  // esempio: mappa tipo→metrica
  const metricMap = {
    clean_up: "kg_recycled",
    energia: "kwh_saved",
    mobilita: "km_sustainable",
    social: "volunteer_hours",
    biodiversita: "native_species_planted",
  };

  const metricKey = metricMap[challenge.type] || "volunteer_hours";
  const targetAmount = Number(challenge?.target?.amount ?? 0);

  const isJudge = user?.role === "judge" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <h2 className="page-title">Sottomissioni della sfida</h2>

      {/* Componente progresso */}
      {targetAmount > 0 && (
        <ChallengeProgress
          challengeId={challengeId}
          metricKey={metricKey}
          targetAmount={targetAmount}
          token={accessToken}
        />
      )}

      {/* Panel moderazione solo per giudici */}
      {isJudge && (
        <div>
          <h3 className="page-subtitle">Moderazione</h3>
          <JudgeModerationPanel challengeId={challengeId} token={accessToken} />
        </div>
      )}

      {/* Lista visibile agli utenti */}
      <div>
        <h3 className="page-subtitle">Tutte le sottomissioni</h3>
        <ChallengeSubmissionList challengeId={challengeId} token={accessToken} />
      </div>
    </div>
  );
}

