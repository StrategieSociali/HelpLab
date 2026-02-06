/**
 * ChallengeSubmitPage.jsx
 * ----------------------
 * Pagina di invio contributo da parte di un volontario.
 *
 * Scopo:
 * - Consentire al volontario di raccontare cosa ha fatto
 * - Raccogliere evidenze minime verificabili
 * - Preparare i dati per la validazione del giudice
 *
 * Nota:
 * Questo è volutamente un flusso semplice.
 * Non richiede competenze tecniche né documentazione complessa.
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ChallengeSubmitPage() {
  const { id: challengeId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  // -------------------------
  // Stato locale
  // -------------------------
  const [activityDescription, setActivityDescription] = useState("");
  const [evidences, setEvidences] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------
  // Gestione evidenze
  // -------------------------
  const handleEvidenceChange = (index, value) => {
    const updated = [...evidences];
    updated[index] = value;
    setEvidences(updated);
  };

  const handleAddEvidence = () => {
    setEvidences([...evidences, ""]);
  };

  // -------------------------
  // Invio contributo
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Devi essere autenticato per inviare un contributo.");
      return;
    }

    if (!activityDescription.trim()) {
      setError("Inserisci una breve descrizione dell’attività svolta.");
      return;
    }

    const filteredEvidences = evidences.filter((e) => e.trim() !== "");
    if (filteredEvidences.length === 0) {
      setError("Inserisci almeno un’evidenza del tuo contributo.");
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
          payload: { evidences: filteredEvidences },
        }),
      });

      if (!response.ok) {
        // se il BE manda un messaggio utile, proviamo a leggerlo
        let msg = "Errore durante l’invio.";
        try {
          const data = await response.json();
          msg = data?.error || data?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      // ✅ user-centric: rimando alla pagina "I miei contributi"
      navigate(`/me/contributi?challenge=${challengeId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Invio non riuscito. Riprova tra qualche istante.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <section className="page-section page-text">
      <div className="container space-y-6">
        {/* Titolo */}
        <header>
          <h1 className="page-title">Invia il tuo contributo</h1>
          <p className="page-subtitle">
            Raccontaci cosa hai fatto e inserisci almeno un’evidenza.
            Il contributo sarà validato da un giudice per garantire
            correttezza e trasparenza.
          </p>
        </header>

        {/* Errori */}
        {error && (
          <div className="callout error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-grid">
              {/* DESCRIZIONE ATTIVITÀ */}
              <div className="form-group">
                <label htmlFor="activityDescription">Cosa hai fatto</label>

                <textarea
                  id="activityDescription"
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Descrivi brevemente l’attività svolta"
                  required
                />

                <div className="hint">
                  Spiega in modo semplice e concreto cosa hai fatto.
                  Non serve un linguaggio tecnico.
                </div>
              </div>

              {/* EVIDENZE */}
              <div className="form-group">
                <label>Evidenze del contributo</label>

                <div className="space-y-2">
                  {evidences.map((evidence, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder="Link, riferimento o breve descrizione"
                      value={evidence}
                      onChange={(e) => handleEvidenceChange(index, e.target.value)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-pill"
                  style={{ marginTop: 8 }}
                  onClick={handleAddEvidence}
                >
                  + Aggiungi un’altra evidenza
                </button>

                <div className="hint" style={{ marginTop: 8 }}>
                  Può essere una foto, un link, un documento o una breve descrizione.
                  Serve solo a dimostrare che l’attività è stata svolta.
                </div>
              </div>
            </div>

            {/* CTA */}
            <div
              className="cta-row"
              style={{ marginTop: 24, display: "flex", justifyContent: "center" }}
            >
              <button
                type="submit"
                className="btn btn-primary btn-pill"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Invio in corso…" : "Invia contributo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
