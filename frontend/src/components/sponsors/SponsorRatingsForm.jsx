// src/components/sponsors/SponsorRatingsForm.jsx
/**
 * Scopo: permettere a un utente di creare o aggiornare
 * una recensione per uno sponsor
 *
 * Note:
 * - richiede utente autenticato
 * - l’eleggibilità è validata SOLO dal backend
 * - usa POST /api/v1/sponsors/:id/ratings
 */

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function SponsorRatingsForm({ sponsorId, onSuccess }) {
  const { token, isAuthenticated } = useAuth();

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

      const res = await fetch(
        `${API_BASE}/v1/sponsors/${sponsorId}/ratings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating,
            feedback: feedback || undefined,
          }),
        }
      );

      if (res.status === 403) {
        throw new Error(
          "Puoi recensire uno sponsor solo dopo aver partecipato a una sua challenge."
        );
      }

      if (!res.ok) {
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
      <h3 className="page-title" style={{ marginBottom: 16 }}>
        Lascia una recensione
      </h3>

      {error && <div className="callout error">{error}</div>}
      {success && (
        <div className="callout success">
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
          className="submit-button"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Invio in corso…" : "Invia recensione"}
        </button>
      </form>
    </div>
  );
}
