// src/components/ChallengeSubmissionList.jsx DEPRECATO SOSTITUTIO DA JudgeChallengeOverview.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function ChallengeSubmissionList({ challengeId: propChallengeId }) {
  const { token } = useAuth();
  const { id: routeChallengeId } = useParams();
  const challengeId = propChallengeId || routeChallengeId;
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const url = `${API_BASE}/v1/challenges/${challengeId}/submissions`;
        const { data } = await axios.get(url, { headers });
        if (!cancel) {
          setSubmissions(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (err) {
        console.error("Errore caricamento contributi:", err);
        if (!cancel) setError("Errore durante il caricamento dei contributi.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancel = true;
    };
  }, [challengeId, token]);

  if (loading) return <TextBlock>Caricamento in corso…</TextBlock>;
  if (error) return <TextBlock>{error}</TextBlock>;
  if (submissions.length === 0) {
    return <TextBlock>Nessun contributo ancora registrato/validato per questa sfida.</TextBlock>;<h2> DEPRECATO</h2>
  }

  return (
    <li key={sub.id} className="rounded-xl border p-4 space-y-3">
  <div className="text-sm text-white/80">
    <strong>Contributo di</strong>{" "}
    {sub.author?.name || `utente #${sub.author?.id ?? "?"}`}
    {" · "}
    <span>
      {new Date(sub.createdAt).toLocaleDateString()}
    </span>
  </div>

  {sub.activity_description && (
    <p className="text-white leading-relaxed">
      {sub.activity_description}
    </p>
  )}

  {sub.payload?.evidences?.length > 0 && (
    <div className="space-y-1">
      <div className="text-sm text-white/70 font-medium">
        Evidenze fornite
      </div>
      <ul className="list-disc pl-5 space-y-1 text-white">
        {sub.payload.evidences.map((ev, i) => (
          <li key={i}>{ev}</li>
        ))}
      </ul>
    </div>
  )}
</li>
  );
}

