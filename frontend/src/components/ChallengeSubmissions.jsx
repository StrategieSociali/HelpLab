// src/components/ChallengeSubmissions.jsx DEPRECATO sostituito da JudgeChallengeOverview e altro
import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import TextBlock from "@/components/UI/TextBlock";

export default function ChallengeSubmissions({ challengeId }) {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!challengeId || !token) return;
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get(`/v1/challenges/${challengeId}/submissions`);
        setSubmissions(data);
      } catch (e) {
        setErr("Errore nel caricamento delle submission.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [challengeId, token]);

  return (
    <section className="challenge-submissions">
    <h3 className="page-subtitle">DEPRECATO</h3>
      <h3 className="page-subtitle">Le tue submission</h3>

      {loading && <div className="callout neutral">Caricamento…</div>}
      {err && <div className="callout error">{err}</div>}
      {!loading && submissions.length === 0 && (
        <div className="callout info">Non hai ancora inviato nessuna submission.</div>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {submissions.map((s) => (
          <li key={s.id} className="card" style={{ marginBottom: 16 }}>
            <TextBlock>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.content}</div>
                  {s.evidence_url && (
                    <a
                      href={s.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="muted small"
                    >
                      Visualizza evidenza
                    </a>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="chip chip-status">{s.status}</div>
                  {s.points != null && (
                    <div style={{ marginTop: 4 }}>
                      <strong>{s.points}</strong> punti
                    </div>
                  )}
                </div>
              </div>
              <div className="muted small" style={{ marginTop: 6 }}>
                Inviata il {new Date(s.created_at).toLocaleString()}
              </div>
            </TextBlock>
          </li>
        ))}
      </ul>
    </section>
  );
}

