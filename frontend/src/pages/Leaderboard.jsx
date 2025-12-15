// src/pages/Leaderboard.jsx
/**
 * Scopo: costruire una classifica delle figure previste nelle challenge
 *
 * Supporta:
 * - Filtro temporale: all, this_month, this_week (backend)
 * - Ricerca username: client-side su entry.user (frontend)
 * - Colonne: posizione, username, punti, task verificati, ultima attività.
 * - Chiamata API centralizzata: API_PATHS.leaderboardUsers()
 */

import React, { useEffect, useMemo, useState } from "react";
import { api, API_PATHS } from "@/api/client";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [window, setWindow] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(API_PATHS.leaderboardUsers(), {
          params: { window },
        });
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
      } catch (err) {
        console.error(err);
        setError("Errore durante il caricamento della classifica");
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [window]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      (e?.user || "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">Leaderboard utenti</h2>

        {/* FILTRI */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Filtri</h3>

          <div className="form-grid">
            <label>
              Intervallo temporale
              <select
                className="control control-pill"
                value={window}
                onChange={(e) => setWindow(e.target.value)}
              >
                <option value="all">Tutti i tempi</option>
                <option value="this_month">Questo mese</option>
                <option value="this_week">Questa settimana</option>
              </select>
            </label>

            <label>
              Cerca utente
              <input
                className="control control-pill"
                placeholder="Username…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className={`hint ${search ? "ok" : ""}`}>
                {search ? "Filtro attivo" : "Inserisci uno username"}
              </div>
            </label>
          </div>
        </div>

        {/* STATI */}
        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && <div className="callout error">{error}</div>}

        {!loading && !error && filteredEntries.length === 0 && (
          <div className="callout neutral">Nessun dato disponibile</div>
        )}

        {/* LISTA */}
        {!loading && !error && filteredEntries.length > 0 && (
          <div className="card">
            <h3>Classifica</h3>

            <div className="table-like">
              <div
                className="row head"
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 120px 160px 180px",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,.1)",
                }}
              >
                <div>Pos.</div>
                <div>Username</div>
                <div>Punti</div>
                <div>Task verificati</div>
                <div>Ultima attività</div>
              </div>

              {filteredEntries.map((entry) => (
                <div
                  key={entry.userId}
                  className="row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 120px 160px 180px",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <div className="muted-strong">{entry.rank}</div>
                  <div className="muted-strong">
                    {entry.user || `Utente #${entry.userId}`}
                  </div>
                  <div>{entry.score}</div>
                  <div>{entry.verified_tasks}</div>
                  <div className="muted">{fmtDateTime(entry.last_event_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

