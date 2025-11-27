// src/pages/challenges/ChallengeSubmitPage.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TextBlock from "@/components/UI/TextBlock";

export default function ChallengeSubmitPage() {
  const { id: challengeId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activityDescription, setActivityDescription] = useState("");
  const [evidences, setEvidences] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEvidenceChange = (index, value) => {
    const updated = [...evidences];
    updated[index] = value;
    setEvidences(updated);
  };

  const handleAddEvidence = () => {
    setEvidences([...evidences, ""]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!activityDescription.trim()) {
      setError("Inserisci una descrizione dell’attività.");
      return;
    }

    const filteredEvidences = evidences.filter((e) => e.trim() !== "");
    if (filteredEvidences.length === 0) {
      setError("Inserisci almeno un’evidenza.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/v1/challenges/${challengeId}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visibility: "participants",
          activity_description: activityDescription,
          payload: {
            evidences: filteredEvidences,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Errore durante l’invio. Verifica i dati.");
      }

      navigate(`/challenges/${challengeId}/submissions`);
    } catch (err) {
      console.error(err);
      setError("Invio fallito. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="page-title">Invia una nuova submission</h1>

      <TextBlock>
        Inserisci una descrizione dell’attività svolta e almeno un’evidenza (immagine, testo,
        documento o link).
      </TextBlock>

      {error && (
        <div className="callout error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="activity">Descrizione attività</label>
          <textarea
            id="activity"
            className="w-full"
            value={activityDescription}
            onChange={(e) => setActivityDescription(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block">Evidenze</label>
          {evidences.map((evidence, index) => (
            <input
              key={index}
              type="text"
              className="w-full"
              placeholder="Link o descrizione"
              value={evidence}
              onChange={(e) => handleEvidenceChange(index, e.target.value)}
            />
          ))}
          <button type="button" className="btn btn-outline" onClick={handleAddEvidence}>
            + Aggiungi evidenza
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Invio in corso…" : "Invia submission"}
        </button>
      </form>
    </section>
  );
}

