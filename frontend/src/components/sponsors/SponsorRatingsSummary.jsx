// src/components/sponsors/SponsorRatingsSummary.jsx
/**
 * Scopo: mostra il riepilogo delle recensioni di uno sponsor
 *
 * Attualmente supporta:
 * - visualizzazione media rating (1–5)
 * - numero totale recensioni
 * - accesso pubblico
 *
 * Note:
 * - componente READ-ONLY
 * - nessuna autenticazione richiesta
 * - utilizza esclusivamente:
 *   GET /api/v1/sponsors/:id/ratings/average
 */

import React, { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function SponsorRatingsSummary({ sponsorId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAverage() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/v1/sponsors/${sponsorId}/ratings/average`
        );

        if (!res.ok) {
          throw new Error("Errore nel caricamento rating");
        }

        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (sponsorId) fetchAverage();

    return () => {
      mounted = false;
    };
  }, [sponsorId]);

  /* =======================
     RENDER
     ======================= */

  if (loading) {
    return <div className="muted small">Caricamento valutazioni…</div>;
  }

  if (error || !data) {
    return null; // rating non bloccante
  }

  if (data.total === 0) {
    return (
      <div className="muted small">
        Nessuna recensione disponibile
      </div>
    );
  }

const fullStars = Math.floor(data.average);

return (
  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
    <span aria-hidden="true">
      {"⭐".repeat(fullStars)}
    </span>

    <strong>{data.average.toFixed(1)}</strong>

    <span className="muted small">
      ({data.total} recension{data.total === 1 ? "e" : "i"})
    </span>
  </div>
);
}
