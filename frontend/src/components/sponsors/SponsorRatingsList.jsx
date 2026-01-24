// src/components/sponsors/SponsorRatingsList.jsx
/**
 * Scopo: mostra le recensioni pubbliche di uno sponsor
 *
 * Attualmente supporta:
 * - caricamento lista recensioni sponsor (pubbliche)
 * - visualizzazione rating, feedback, autore (nickname) e data
 * - gestione stati: loading / empty / error
 *
 * Note:
 * - componente READ-ONLY
 * - nessuna autenticazione richiesta
 * - utilizza esclusivamente:
 *   GET /api/v1/sponsors/:id/ratings
 */

import React, { useEffect, useState } from "react";
import TextBlock from "@/components/UI/TextBlock";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function SponsorRatingsList({ sponsorId, limit = 20 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sponsorId) return;

    let mounted = true;

    async function fetchRatings() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/v1/sponsors/${sponsorId}/ratings?limit=${limit}&offset=0`
        );

        if (!res.ok) {
          throw new Error("Errore nel caricamento delle recensioni");
        }

        const data = await res.json();
        if (mounted) setItems(data.items || []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRatings();
    return () => {
      mounted = false;
    };
  }, [sponsorId, limit]);

  /* =======================
     RENDER STATES
     ======================= */

  if (loading) {
    return <TextBlock>Caricamento recensioni…</TextBlock>;
  }

  if (error) {
    return <TextBlock className="muted">{error}</TextBlock>;
  }

  if (items.length === 0) {
    return <TextBlock className="muted">Nessuna recensione disponibile.</TextBlock>;
  }

  /* =======================
     MAIN RENDER
     ======================= */

  return (
    <div className="space-y-4">
      {items.map((r, idx) => (
        <div key={idx} className="card" style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <strong>{r.nickname || "Utente"}</strong>
            <span className="muted small">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            {"⭐".repeat(Math.floor(r.rating))}{" "}
            <span className="muted small">{r.rating}</span>
          </div>

          {r.feedback && <p>{r.feedback}</p>}
        </div>
      ))}
    </div>
  );
}
