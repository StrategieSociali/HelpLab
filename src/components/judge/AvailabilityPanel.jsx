// src/components/judge/AvailabilityPanel.jsx
/**
 * AvailabilityPanel.jsx
 * ---------------------
 * Pannello di disponibilità settimanale del giudice (multi-giudice §5).
 *
 * SCOPO
 * - Mostra la griglia dell'orizzonte mobile (4 settimane, default BE) con un
 *   toggle per settimana. L'assenza di pianificazione = "non disponibile".
 * - Espone l'indicatore di stato (verde = almeno una settimana pianificata,
 *   ambra = nessuna) come nudge intrinseco: "non pianificato = niente offerte".
 *
 * DATI
 * - GET  /api/v1/judge/availability  → { horizonWeeks, hasAnyAvailability, weeks }
 * - PUT  /api/v1/judge/availability  → aggiorna la singola settimana (il BE
 *   normalizza al lunedì e valida l'orizzonte).
 *
 * NOTA
 * - La disponibilità conta SOLO nel push (marketplace Fase 2): dichiararsi
 *   disponibili non impegna a prendere sfide in Fase 1, ma abilita le offerte.
 * - Tre stati UI: caricamento / errore (con "riprova") / vuoto (nessuna
 *   settimana pianificata = stato ambra, non un errore).
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getJudgeAvailability, setJudgeAvailability } from "@/api/judge.api";

// Etichetta leggibile "lun 29 giu – dom 5 lug" da un lunedì 'YYYY-MM-DD'.
// Formattazione forzata in UTC per non spostare il giorno col fuso locale.
function weekLabel(weekStart) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return weekStart;
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d) =>
    d.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function AvailabilityPanel() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // settimane con PUT in corso: { [weekStart]: true }
  const [busy, setBusy] = useState({});
  // errore per singola settimana: { [weekStart]: string }
  const [rowErr, setRowErr] = useState({});

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await getJudgeAvailability(token);
      setData(res);
    } catch (e) {
      setError("Impossibile caricare la disponibilità.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleWeek = async (week) => {
    const key = week.weekStart;
    setBusy((b) => ({ ...b, [key]: true }));
    setRowErr((r) => ({ ...r, [key]: "" }));
    try {
      const saved = await setJudgeAvailability(token, key, !week.available);
      setData((prev) => {
        if (!prev) return prev;
        const weeks = prev.weeks.map((w) =>
          w.weekStart === saved.weekStart ? { ...w, available: saved.available } : w
        );
        return {
          ...prev,
          weeks,
          hasAnyAvailability: weeks.some((w) => w.available),
        };
      });
    } catch (e) {
      setRowErr((r) => ({ ...r, [key]: "Modifica non riuscita. Riprova." }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 className="dynamic-title" style={{ margin: 0 }}>
          La tua disponibilità
        </h2>
        {data && <StatusBadge available={data.hasAnyAvailability} />}
      </div>

      <p className="muted small" style={{ marginTop: 6 }}>
        Pianifica le settimane in cui sei disponibile a ricevere sfide da
        valutare. Le settimane non pianificate non ricevono offerte (né penalità).
      </p>

      {loading && <div className="callout neutral">Caricamento…</div>}

      {!loading && error && (
        <div className="callout error" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={load}>
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {!data.hasAnyAvailability && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(210,153,34,0.12)",
                border: "1px solid rgba(210,153,34,0.4)",
                color: "#d29922",
              }}
            >
              Non hai pianificato nessuna settimana: al momento sei escluso dalle
              offerte. Attiva almeno una settimana qui sotto.
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {data.weeks.map((week, i) => {
              const key = week.weekStart;
              const isBusy = !!busy[key];
              return (
                <div key={key} className="card-info neutral">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>{weekLabel(key)}</strong>
                      {i === 0 && (
                        <span className="muted small" style={{ marginLeft: 8 }}>
                          (questa settimana)
                        </span>
                      )}
                      <div className="muted small">
                        {week.available ? "Disponibile" : "Non disponibile"}
                      </div>
                    </div>
                    <button
                      className={`btn ${week.available ? "btn-outline" : "btn-primary"}`}
                      disabled={isBusy}
                      onClick={() => toggleWeek(week)}
                    >
                      {isBusy
                        ? "…"
                        : week.available
                        ? "Rendi non disponibile"
                        : "Rendi disponibile"}
                    </button>
                  </div>
                  {rowErr[key] && (
                    <div className="callout error" style={{ marginTop: 8 }}>
                      {rowErr[key]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Indicatore di stato verde/ambra (§5).
function StatusBadge({ available }) {
  return (
    <span
      className="chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: available ? "rgba(46,160,67,0.15)" : "rgba(210,153,34,0.15)",
        color: available ? "#3fb950" : "#d29922",
        border: `1px solid ${available ? "rgba(46,160,67,0.4)" : "rgba(210,153,34,0.4)"}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: available ? "#3fb950" : "#d29922",
        }}
      />
      {available ? "Disponibile" : "Da pianificare"}
    </span>
  );
}
