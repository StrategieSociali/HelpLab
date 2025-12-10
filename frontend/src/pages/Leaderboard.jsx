// src/pages/Leaderboard.jsx
/**
 * Scopo: costruire una classifica delle figure previste nelle challenge
 *
 * Attualmente supporta:
 * Filtro temporale: tutti i tempi, mese, settimana.
 * Colonne: posizione, nickname, punti, task verificati, ultima attività.
 * Chiamata API corretta: /v1/leaderboard/users.
 */
import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { API_PATHS } from "@/api/client";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [window, setWindow] = useState("all");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/v1/leaderboard/users?window=${window}`);
        setEntries(data.entries || []);
      } catch (err) {
        setError("Errore durante il caricamento della classifica");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [window]);

  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">Leaderboard Utenti</h2>

        <div style={{ marginBottom: 16 }}>
          <label>Filtro temporale: </label>
          <select value={window} onChange={(e) => setWindow(e.target.value)}>
            <option value="all">Tutti i tempi</option>
            <option value="this_month">Questo mese</option>
            <option value="this_week">Questa settimana</option>
          </select>
        </div>

        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && <div className="callout error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="callout neutral">Nessun dato disponibile</div>
        )}

        {!loading && entries.length > 0 && (
          <div className="table-like">
            <div className="row head" style={{
              display: "grid",
              gridTemplateColumns: "50px 1fr 100px 100px 140px",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,.1)"
            }}>
              <div>#</div>
              <div>Nickname</div>
              <div>Punti</div>
              <div>Task Verificati</div>
              <div>Ultima Attività</div>
            </div>

            {entries.map((entry, idx) => (
              <div key={entry.userId} className="row" style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 100px 100px 140px",
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,.06)"
              }}>
                <div>{entry.rank}</div>
                <div className="muted-strong">{entry.user || `Utente #${entry.userId}`}</div>
                <div>{entry.score}</div>
                <div>{entry.verified_tasks}</div>
                <div>{entry.last_event_at ? new Date(entry.last_event_at).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
