// src/components/events/EventCard.jsx
/**
 * EventCard.jsx
 * -------------
 * Card riutilizzabile per la visualizzazione di un evento nella lista.
 * Usata da EventsList.jsx e potenzialmente da HomepageStatic.jsx in futuro.
 *
 * PROPS:
 *   event  {Object}   - oggetto evento dalla response BE (shape §8 handoff)
 *   onOpen {Function} - callback al click su "Scopri l'evento"
 *
 * ACCESSIBILITÀ:
 * - role="article" con aria-label descrittivo
 * - Il link mappa si apre in nuova tab con rel="noopener noreferrer"
 * - I badge di stato hanno aria-label esplicito
 *
 * DESIGN:
 * Segue il pattern visivo delle challenge card (Challenges.jsx):
 * chip status, meta-list, target-box, mini-box, card-actions.
 */

import React from "react";
import "../../styles/dynamic-pages.css";

// ─── Helper: etichetta leggibile per lo stato evento ─────────────────────────
function statusLabel(status) {
  const map = {
    draft:     "Bozza",
    published: "Aperto",
    ended:     "Concluso",
    rejected:  "Rifiutato",
  };
  return map[status] ?? status;
}

// Riusa le classi status-badge di dynamic-pages.css
function statusBadgeClass(status) {
  if (status === "published") return "status-badge status-badge--published";
  if (status === "ended")     return "status-badge status-badge--ended";
  if (status === "draft")     return "status-badge status-badge--draft";
  if (status === "rejected")  return "status-badge status-badge--rejected";
  return "status-badge";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function dateRangeLabel(start, end) {
  if (!start) return "—";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function EventCard({ event, onOpen }) {
  if (!event) return null;

  const {
    name,
    status,
    start_date,
    end_date,
    location_address,
    location_geo,
    description,
    logo_url,
    sponsors = [],
    challenges = [],
  } = event;

  // Link OpenStreetMap — nessuna libreria esterna necessaria
  const mapUrl =
    location_geo?.lat && location_geo?.lon
      ? `https://www.openstreetmap.org/?mlat=${location_geo.lat}&mlon=${location_geo.lon}`
      : null;

  const mainSponsor = sponsors[0] ?? null;
  const openChallenges = challenges.filter((ch) => ch.status === "open").length;

  return (
    <article className="card ch-card glass" aria-label={`Evento: ${name}`}>

      {/* Logo opzionale */}
      {logo_url && (
        <div style={{ marginBottom: 12, textAlign: "center" }}>
          <img
            src={logo_url}
            alt={`Logo ${name}`}
            style={{ maxHeight: 64, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }}
          />
        </div>
      )}

      {/* Status + contatore sfide */}
      <div className="card-header">
        <span className={statusBadgeClass(status)} aria-label={`Stato: ${statusLabel(status)}`}>
          {statusLabel(status)}
        </span>
        {challenges.length > 0 && (
          <span className="chip chip-type">
            {challenges.length === 1 ? "1 sfida" : `${challenges.length} sfide`}
          </span>
        )}
      </div>

      {/* Titolo */}
      <h3 className="card-title">{name}</h3>

      {/* Meta */}
      <ul className="meta-list">
        <li>
          <span>Quando</span>
          <span>{dateRangeLabel(start_date, end_date)}</span>
        </li>
        {location_address && (
          <li>
            <span>Dove</span>
            <span>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="muted"
                  style={{ textDecoration: "underline" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {location_address}
                </a>
              ) : (
                location_address
              )}
            </span>
          </li>
        )}
      </ul>

      {/* Descrizione troncata */}
      {description && (
        <p
          className="card-description"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      )}

      {/* Sfide collegate */}
      {challenges.length > 0 && (
        <div className="target-box">
          <div className="target-title">Sfide dell'evento</div>
          <div className="target-body">
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {challenges.slice(0, 3).map((ch) => (
                <li key={ch.id} style={{ marginBottom: 4, fontSize: "0.9rem" }}>
                  • {ch.title}
                </li>
              ))}
              {challenges.length > 3 && (
                <li className="muted small">+ altri {challenges.length - 3}…</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Sponsor + sfide aperte */}
      <div className="row two-col soft-gap">
        <div className="mini-box">
          <div className="mini-label">Organizzato da</div>
          <div className="mini-value">
            {mainSponsor?.logo_url ? (
              <img
                src={mainSponsor.logo_url}
                alt={mainSponsor.name}
                style={{ maxHeight: 24, maxWidth: 80, objectFit: "contain" }}
              />
            ) : (
              mainSponsor?.name ?? "—"
            )}
          </div>
        </div>
        <div className="mini-box">
          <div className="mini-label">Sfide aperte</div>
          <div className="mini-value">{openChallenges || "—"}</div>
        </div>
      </div>

      {/* CTA */}
      <div className="card-actions">
        <button
          className="btn btn-primary"
          onClick={() => onOpen?.(event)}
          aria-label={`Scopri l'evento ${name}`}
        >
          Scopri l'evento
        </button>
      </div>

    </article>
  );
}
