// src/pages/events/MyEvents.jsx
/**
 * MyEvents.jsx
 * ------------
 * Lista degli eventi creati dall'utente corrente, più quelli degli enti di cui
 * è membro (8a, passo 3): un evento dell'ente lo gestiscono tutti i membri.
 * Mostra stato, motivazione rifiuto e CTA contestuali.
 *
 * ACCESSO: qualsiasi utente autenticato
 * ROUTE: /me/eventi
 *
 * ENDPOINT:
 *   GET /events/mine → { items: [...] }  (nessuna paginazione)
 *
 * STATI POSSIBILI:
 *   draft     → "In attesa di approvazione"
 *   published → "Pubblicato" + link visualizza
 *   rejected  → "Rifiutato" + motivazione + bottone "Modifica e reinvia"
 *   ended     → "Concluso"
 *
 * UX NOTE:
 * Flusso creatore non-admin:
 *   1. Crea evento → draft → vede "In attesa"
 *   2. Admin approva → published → vede link pubblico
 *   3. Admin rifiuta → rejected → vede motivazione + "Modifica e reinvia"
 *   4. Modifica → PATCH → BE resetta a draft → vede "In attesa" di nuovo
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyEvents } from "@/api/events.api";
import { routes } from "@/routes";
import "../../styles/dynamic-pages.css";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// Badge stato con colori semantici
function StatusBadge({ status }) {
  const map = {
    draft:     "In attesa di approvazione",
    published: "Pubblicato",
    rejected:  "Rifiutato",
    ended:     "Concluso",
  };
  const label = map[status] || status;
  const className = `status-badge status-badge--${status}`;
  
  return <span className={className}>{label}</span>;
}

export default function MyEvents() {
  const navigate = useNavigate();

  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getMyEvents();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Impossibile caricare i tuoi eventi.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Header */}
        <div className="page-header">
          <h2 className="page-title">I miei eventi</h2>
          <div className="page-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate(routes.events.create)}
            >
              + Nuovo evento
            </button>
          </div>
        </div>

        {/* Feedback */}
        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && !loading && <div className="callout error">{error}</div>}

        {/* Lista vuota */}
        {!loading && !error && items.length === 0 && (
          <div className="dynamic-empty">
            <div className="dynamic-empty__icon">📅</div>
            <div className="dynamic-empty__text">
              Non hai ancora eventi, né tuoi né degli enti di cui fai parte.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate(routes.events.create)}
              style={{ marginTop: 16 }}
            >
              Crea il tuo primo evento
            </button>
          </div>
        )}

        {/* Lista eventi */}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((ev) => (
            <li key={ev.id} className="card" style={{ padding: "16px 20px", marginBottom: 12 }}>

              {/* Riga titolo + badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#fff" }}>
                  {ev.name || "(senza nome)"}
                </div>
                <StatusBadge status={ev.status} />
              </div>

              {/* Ente (8a, passo 3) */}
              {ev.organization && (
                <div className="small" style={{ marginBottom: 4 }}>
                  <span className="chip chip-role" style={{ whiteSpace: "nowrap" }}>
                    Ente: {ev.organization.name}
                  </span>
                </div>
              )}

              {/* Meta info */}
              <div className="muted small" style={{ marginBottom: 8 }}>
                {ev.start_date && formatDate(ev.start_date)}
                {ev.end_date && ev.end_date !== ev.start_date && ` – ${formatDate(ev.end_date)}`}
                {ev.location_address && ` · ${ev.location_address}`}
              </div>

              {/* Motivazione rifiuto — visibile solo su rejected */}
              {ev.status === "rejected" && ev.rejection_reason && (
                <div className="card-info error" style={{ marginBottom: 12, fontSize: "0.9rem" }}>
                  <strong>Motivo del rifiuto:</strong> {ev.rejection_reason}
                  <div style={{ marginTop: 4, opacity: 0.8 }}>
                    Modifica l'evento per reinviarlo automaticamente all'approvazione.
                  </div>
                </div>
              )}

              {/* Sfide collegate */}
              {Array.isArray(ev.challenges) && ev.challenges.length > 0 && (
                <div className="muted small" style={{ marginBottom: 10 }}>
                  Sfide: {ev.challenges.map((ch) => ch.title).join(", ")}
                </div>
              )}

              {/* CTA contestuali per stato */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                {/* Draft e rejected → Modifica */}
                {(ev.status === "draft" || ev.status === "rejected") && (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(routes.events.edit(ev.id))}
                  >
                    {ev.status === "rejected" ? "Modifica e reinvia" : "Modifica"}
                  </button>
                )}

                {/* Published → Modifica + Visualizza */}
                {ev.status === "published" && (
                  <>
                    <button
                      className="btn btn-outline"
                      onClick={() => navigate(routes.events.edit(ev.id))}
                    >
                      Modifica
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => navigate(routes.events.detail(ev.slug || ev.id))}
                    >
                      Visualizza
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => navigate(routes.events.live(ev.slug || ev.id))}
                    >
                      Live
                    </button>
                  </>
                )}

                {/* Ended → solo visualizza */}
                {ev.status === "ended" && ev.slug && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => navigate(routes.events.detail(ev.slug))}
                  >
                    Visualizza
                  </button>
                )}

                {/* Draft → messaggio di attesa */}
                {ev.status === "draft" && (
                  <span className="muted small" style={{ alignSelf: "center", fontStyle: "italic" }}>
                    In attesa di approvazione admin
                  </span>
                )}

              </div>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
