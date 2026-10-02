// src/components/sponsors/SponsorRatingsForm.jsx
/**
 * Scopo: permettere a un utente di creare o aggiornare
 * una recensione per uno sponsor
 *
 * Note:
 * - richiede utente autenticato
 * - l’eleggibilità è validata SOLO dal backend
 * - usa POST /api/v1/sponsors/:id/ratings
 * - passa dal client condiviso (`api`) dal 2/10/2026, che rinnova l'access token scaduto
 */

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import "../../styles/dynamic-pages.css";

export default function SponsorRatingsForm({ sponsorId, onSuccess }) {
  const { isAuthenticated } = useAuth();

  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isAuthenticated) {
      setError("Devi essere loggato per lasciare una recensione.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        await api.post(`/v1/sponsors/${sponsorId}/ratings`, {
          rating,
          feedback: feedback || undefined,
        });
      } catch (e) {
        if (e?.response?.status === 403) {
          throw new Error(
            "Puoi recensire uno sponsor solo dopo aver partecipato a una sua challenge."
          );
        }
        throw new Error("Errore durante l’invio della recensione.");
      }

      setSuccess(true);
      setFeedback("");
      onSuccess?.(); // refresh lista / media
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 32 }}>
      <h3 className="dynamic-title" style={{ marginBottom: 16 }}>
        Lascia una recensione
      </h3>

      {error && <div className="card-info" style={{ background: "rgba(239,68,68,.15)", borderColor: "rgba(239,68,68,.3)", color: "#fecaca" }}>{error}</div>}
      {success && (
        <div className="card-info" style={{ background: "rgba(16,185,129,.15)", borderColor: "rgba(16,185,129,.3)", color: "#6ee7b7" }}>
          Recensione inviata con successo.
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-group">
          <label htmlFor="rating">Valutazione</label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((v) => (
              <option key={v} value={v}>
                {"⭐".repeat(v)} {v}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="feedback">Commento (facoltativo)</label>
          <textarea
            id="feedback"
            rows={6}
            placeholder="Racconta brevemente la tua esperienza (opzionale)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Invio in corso…" : "Invia recensione"}
        </button>
      </form>
    </div>
  );
}
