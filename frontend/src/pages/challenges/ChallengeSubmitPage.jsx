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
<section className="page-section page-text">
  <div className="container space-y-6">
    <h1 className="page-title">Invia una nuova submission</h1>

    <p className="page-subtitle">
      Inserisci una descrizione dell’attività svolta e almeno un’evidenza
      (immagine, testo, documento o link).
    </p>

    {error && (
      <div className="callout error" role="alert">
        {error}
      </div>
    )}

    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="form-grid">
          {/* DESCRIZIONE ATTIVITÀ */}
          <label>
            Descrizione attività
            <textarea
              className="control"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              rows={5}
              required
            />
            <div className="hint">
              Descrivi in modo chiaro cosa hai fatto
            </div>
          </label>

          {/* EVIDENZE */}
          <label>
            Evidenze
            <div className="space-y-2">
              {evidences.map((evidence, index) => (
                <input
                  key={index}
                  type="text"
                  className="control control-pill"
                  placeholder="Link o descrizione"
                  value={evidence}
                  onChange={(e) =>
                    handleEvidenceChange(index, e.target.value)
                  }
                />
              ))}
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-outline btn-pill"
                onClick={handleAddEvidence}
              >
                + Aggiungi evidenza
              </button>
            </div>

            <div className="hint">
              Inserisci almeno un link, testo o riferimento
            </div>
          </label>
        </div>

        {/* CTA */}
        <div
          className="cta-row"
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="submit"
            className="btn btn-primary btn-pill"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Invio in corso…" : "Invia submission"}
          </button>
        </div>
      </div>
    </form>
  </div>
</section>

  );
}

