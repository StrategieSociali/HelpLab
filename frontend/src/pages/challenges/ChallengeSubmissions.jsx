// src/pages/challenges/ChallengeSubmissions.jsx
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import JudgeModerationPanel from "@/components/JudgeModerationPanel";
import ChallengeProgress from "@/components/ChallengeProgress";
import useChallenge from "@/hooks/useChallenge";
import ChallengeSubmissionList from "@/components/ChallengeSubmissionList";
import { isJudge } from "@/utils/roles"; // ✅ IMPORT CORRETTO

export default function ChallengeSubmissions() {
  const { accessToken, user } = useAuth();
  const { challengeId } = useParams();
  const { challenge, loading, error } = useChallenge(challengeId);

  if (loading) return <TextBlock>Caricamento sfida…</TextBlock>;
  if (error) return <TextBlock>Errore durante il caricamento: {error}</TextBlock>;
  if (!challenge) return <TextBlock>Sfida non trovata.</TextBlock>;

  const isJudgeUser = isJudge(user?.role); // ✅ USO FUNZIONE UTILITY

  const metricMap = {
    clean_up: "kg_recycled",
    energia: "kwh_saved",
    mobilita: "km_sustainable",
    social: "volunteer_hours",
    biodiversita: "native_species_planted",
  };

  const metricKey = metricMap[challenge.type] || "volunteer_hours";
  const targetAmount = Number(challenge?.target?.amount ?? 0);

  return (
    <div className="space-y-6">
      <h2 className="page-title">Sottomissioni della sfida</h2>

      {targetAmount > 0 && (
        <ChallengeProgress
          challengeId={challengeId}
          metricKey={metricKey}
          targetAmount={targetAmount}
          token={accessToken}
        />
      )}

      {isJudgeUser && (
        <div>
          <h3 className="page-subtitle">Moderazione</h3>
          <JudgeModerationPanel challengeId={challengeId} token={accessToken} />
        </div>
      )}

      <div>
        <h3 className="page-subtitle">Tutte le sottomissioni</h3>
        <ChallengeSubmissionList challengeId={challengeId} token={accessToken} />
      </div>
    </div>
  );
}

