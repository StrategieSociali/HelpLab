// src/components/ChallengeSubmissionList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import TextBlock from "@/components/UI/TextBlock";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function ChallengeSubmissionList({ challengeId, token }) {
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
        console.error("Errore fetch submissions:", err);
        if (!cancel) setError("Errore durante il caricamento delle submission.");
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
    return <TextBlock>Nessuna sottomissione trovata per questa sfida.</TextBlock>;
  }

  return (
    <ul className="space-y-4">
      {submissions.map((sub) => (
        <li key={sub.id} className="rounded-xl border p-4 space-y-2">
          <div className="text-sm text-white/80">
            <strong>Autore:</strong>{" "}
            {sub.author?.name || `user#${sub.author?.id ?? "?"}`}{" "}
            &middot; <strong>Data:</strong>{" "}
            {new Date(sub.createdAt).toLocaleString()}
          </div>

          {sub.activity_description && (
            <p className="text-white">{sub.activity_description}</p>
          )}

          {sub.photos?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {sub.photos.slice(0, 4).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`foto ${i + 1}`}
                  className="w-full h-24 object-cover rounded-xl border"
                />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

