// src/components/events/EventLeaderboard.jsx
/**
 * EventLeaderboard.jsx
 * --------------------
 * Classifica di evento (PM-5, decisione PM 2/10/2026): le prime posizioni sommando i
 * punti di tutte le sfide collegate all'evento, con la regola delle classifiche di
 * sfida (punti, poi contributi, poi chi è arrivato prima). Il 30/8 si è fatta a mano.
 *
 * Usata in due pagine: la dashboard live (con `poll`, ogni 30 secondi come il resto
 * della dashboard) e la pagina pubblica dell'evento (caricata una volta).
 *
 * PROPS:
 *   eventId {number}  - id dell'evento
 *   poll    {boolean} - aggiorna ogni 30 secondi
 *
 * Per un evento non visibile (bozza, rifiutato) il BE risponde 404: il blocco non si
 * mostra. Un errore di rete durante il polling non cancella la classifica già mostrata.
 *
 * ENDPOINT: GET /v1/events/:id/leaderboard
 */

import React, { useEffect, useState } from "react";
import { getEventLeaderboard } from "@/api/events.api";

const POLL_INTERVAL_MS = 30_000;

export default function EventLeaderboard({ eventId, poll = false }) {
  const [entries, setEntries] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let stop = false;

    async function load() {
      try {
        const data = await getEventLeaderboard(eventId, 10);
        if (!stop) setEntries(data?.entries ?? []);
      } catch (err) {
        if (!stop && err?.response?.status === 404) setHidden(true);
      }
    }

    load();
    const interval = poll ? setInterval(load, POLL_INTERVAL_MS) : null;
    return () => {
      stop = true;
      if (interval) clearInterval(interval);
    };
  }, [eventId, poll]);

  if (hidden || entries === null) return null;

  return (
    <div className="card glass ev-section" style={{ padding: "20px 24px", marginBottom: 24 }}>
      <h2 className="dynamic-subtitle ev-section__title">🏆 Classifica dell'evento</h2>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Punti di tutte le sfide dell'evento. A pari punti conta chi ha più contributi,
        poi chi è arrivato prima.
      </p>

      {entries.length === 0 ? (
        <div className="muted small">Nessun punto ancora assegnato.</div>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {entries.map((entry, i) => (
            <li
              key={entry.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: i < entries.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
              }}
            >
              <span style={{ width: 28, textAlign: "center", fontSize: "1.1rem" }}>
                {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `${entry.rank}.`}
              </span>
              <span style={{ flex: 1, color: "#fff" }}>{entry.user}</span>
              <span className="muted small">
                {entry.verified_tasks} {entry.verified_tasks === 1 ? "contributo" : "contributi"}
              </span>
              <span style={{ fontWeight: 700, color: "rgb(74,222,128)", minWidth: 64, textAlign: "right" }}>
                {entry.score} pt
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
