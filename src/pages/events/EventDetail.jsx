// src/pages/events/EventDetail.jsx
/**
 * EventDetail.jsx
 * ---------------
 * Pagina pubblica di dettaglio di un evento.
 * È il punto di atterraggio per i volontari che arrivano da QR code o link diretto.
 *
 * ACCESSO: pubblico per la visualizzazione.
 *          Login richiesto solo per partecipare (consenso + redirect a sfida).
 *
 * ROUTE: /eventi/:slug
 *
 * ENDPOINT:
 *   GET /v1/events/:idOrSlug  — dettaglio evento (publico)
 *
 * FLUSSO PARTECIPAZIONE:
 *   1. Utente non loggato  → clic "Partecipa" → redirect a /login?next=<slug>
 *   2. Utente loggato      → apre EventConsentModal
 *   3. Modal confermato    → redirect alla prima sfida aperta dell'evento
 *                            (o alla lista sfide dell'evento se ce ne sono più di una)
 *
 * UX NOTE (200 volontari da mobile):
 * - CTA "Partecipa" visibile immediatamente senza scroll
 * - Informazioni essenziali (data, luogo, descrizione) prima di tutto
 * - Link mappa OpenStreetMap diretto — nessuna libreria JS aggiuntiva
 * - Dashboard live linkata in modo prominente durante l'evento
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getEventDetail } from "@/api/events.api";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/routes";
import EventConsentModal from "@/components/events/EventConsentModal";

// ─── Helper: formato data ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function dateRangeLabel(start, end) {
  if (!start) return "—";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// ─── Helper: badge stato ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    published: { label: "Aperto",    cls: "status-badge status-badge--approved" },
    ended:     { label: "Concluso",  cls: "status-badge status-badge--rejected" },
    draft:     { label: "Bozza",     cls: "status-badge status-badge--pending"  },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "status-badge" };
  return <span className={cls}>{label}</span>;
}

// ─── Helper: stato badge sfida ────────────────────────────────────────────────
function ChallengeBadge({ status }) {
  if (status === "open") {
    return <span className="status-badge status-badge--approved">Aperta</span>;
  }
  return <span className="status-badge status-badge--rejected">Chiusa</span>;
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function EventDetail() {
  const { slug }       = useParams();
  const navigate       = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showConsent, setShowConsent] = useState(false);

  // ── Carica dettaglio evento ─────────────────────────────────────────────
  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEventDetail(slug);
      setEvent(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setError("Evento non trovato. Controlla il link e riprova.");
      } else {
        setError(
          err?.response?.data?.error ||
          "Impossibile caricare l'evento. Riprova."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // ── Click su "Partecipa" ────────────────────────────────────────────────
  function handlePartecipa() {
    if (!isAuthenticated) {
      // Salva la destinazione post-login nella query string
      navigate(`${routes.auth.login}?next=${encodeURIComponent(routes.events.detail(slug))}`);
      return;
    }
    setShowConsent(true);
  }

  // ── Dopo conferma del modal consenso ───────────────────────────────────
  // Con 1 sfida aperta → submission diretta (zero clic aggiuntivi)
  // Con più sfide aperte → rimane sulla pagina evento, che mostra già
  //   le sfide con i bottoni "Vai alla sfida" — nessun redirect esterno
  // Con nessuna sfida → rimane sulla pagina con messaggio
  function handleConsentSuccess() {
    setShowConsent(false);
    if (!event) return;

    const openChallenges = (event.challenges ?? []).filter((ch) => ch.status === "open");

    if (openChallenges.length === 1) {
      // Una sola sfida aperta → vai direttamente alla submission
      navigate(`/challenges/${openChallenges[0].id}/submit`);
    }
    // Con più sfide o nessuna: rimane sulla pagina evento.
    // Le sfide sono già visibili nella sezione "Sfide dell'evento"
    // con i rispettivi bottoni "Vai alla sfida".
  }

  // ── Render stati ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container">
          <div className="callout neutral">Caricamento evento…</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container">
          <div className="callout error">{error}</div>
          <div style={{ marginTop: 16 }}>
            <Link to={routes.events.list} className="btn btn-outline">
              ← Tutti gli eventi
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!event) return null;

  const {
    id,
    name,
    status,
    description,
    logo_url,
    start_date,
    end_date,
    location_address,
    location_geo,
    sponsors = [],
    challenges = [],
  } = event;

  const mapUrl =
    location_geo?.lat && location_geo?.lon
      ? `https://www.openstreetmap.org/?mlat=${location_geo.lat}&mlon=${location_geo.lon}`
      : null;

  const openChallenges = challenges.filter((ch) => ch.status === "open");
  const isActive = status === "published";

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Breadcrumb */}
        <Link
          to={routes.events.list}
          className="muted small"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20 }}
        >
          ← Tutti gli eventi
        </Link>

        {/* ── Hero evento ──────────────────────────────────────────────── */}
        <div
          className="card glass"
          style={{ padding: "28px 24px", marginBottom: 24 }}
        >
          {/* Logo */}
          {logo_url && (
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <img
                src={logo_url}
                alt={`Logo ${name}`}
                style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
              />
            </div>
          )}

          {/* Status + titolo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <StatusBadge status={status} />
          </div>
          <h1 className="dynamic-title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", marginBottom: 16 }}>
            {name}
          </h1>

          {/* Info essenziali — visibili subito senza scroll su mobile */}
          <ul className="meta-list" style={{ marginBottom: 20 }}>
            <li>
              <span>📅 Quando</span>
              <span style={{ fontWeight: 600 }}>{dateRangeLabel(start_date, end_date)}</span>
            </li>
            {location_address && (
              <li>
                <span>📍 Dove</span>
                <span>
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "rgba(255,255,255,0.85)", textDecoration: "underline" }}
                    >
                      {location_address} ↗
                    </a>
                  ) : (
                    location_address
                  )}
                </span>
              </li>
            )}
          </ul>

          {/* Descrizione */}
          {description && (
            <p style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.65, marginBottom: 24 }}>
              {description}
            </p>
          )}

          {/* ── CTA principale ─────────────────────────────────────────── */}
          <div className="dynamic-actions">
            {isActive && openChallenges.length > 0 ? (
              <button
                className="btn btn-primary"
                onClick={handlePartecipa}
                style={{ fontSize: "1.05rem", padding: "14px 28px" }}
              >
                {isAuthenticated ? "Partecipa all'evento" : "Accedi per partecipare"}
              </button>
            ) : status === "ended" ? (
              <div className="card-info neutral">
                Questo evento si è concluso. Puoi ancora consultare i risultati.
              </div>
            ) : (
              <div className="card-info neutral">
                Nessuna sfida attiva al momento.
              </div>
            )}

            {/* Link dashboard impatto — visibile a tutti.
                Mostrato anche a evento CONCLUSO: il riquadro qui sopra promette
                «puoi ancora consultare i risultati», ma fino al 4/8/2026 il link
                era condizionato al solo `isActive` e a evento chiuso spariva →
                promessa senza porta. I dati restano disponibili (`/events/:id/summary`
                risponde regolarmente per gli eventi `ended`). */}
            {(isActive || status === "ended") && (
              <Link
                to={routes.events.live(slug)}
                className="btn btn-outline"
              >
                {isActive ? "📊 Segui l'impatto live" : "📊 Guarda i risultati"}
              </Link>
            )}
          </div>
        </div>

        {/* ── Sfide dell'evento ──────────────────────────────────────── */}
        {challenges.length > 0 && (
          <div className="card glass" style={{ padding: "20px 24px", marginBottom: 24 }}>
            <h2 className="dynamic-subtitle" style={{ marginBottom: 16 }}>
              Sfide dell'evento
            </h2>
            <div className="dynamic-list">
              {challenges.map((ch) => (
                <div key={ch.id} className="dynamic-item">
                  <div className="dynamic-item__header">
                    <span style={{ fontWeight: 600, color: "#fff" }}>{ch.title}</span>
                    <ChallengeBadge status={ch.status} />
                  </div>
                  {ch.deadline && (
                    <div className="dynamic-item__meta">
                      Scadenza: {new Date(ch.deadline).toLocaleDateString("it-IT")}
                    </div>
                  )}
                  {ch.status === "open" && (
                    <div className="dynamic-actions" style={{ marginTop: 10 }}>
                      <button
                        className="btn btn-outline btn-small"
                        onClick={() => navigate(`/challenges/${ch.id}/submit`)}
                      >
                        Vai alla sfida
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => navigate(routes.dashboard.challengeLive(ch.id))}
                      >
                        📊 Live
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Sponsor ────────────────────────────────────────────────── */}
        {sponsors.length > 0 && (
          <div className="card glass" style={{ padding: "20px 24px" }}>
            <h2 className="dynamic-subtitle" style={{ marginBottom: 16 }}>
              Organizzatori e sostenitori
            </h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              {sponsors.map((sp) => (
                <div
                  key={sp.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 100,
                  }}
                >
                  {sp.logo_url ? (
                    <img
                      src={sp.logo_url}
                      alt={sp.name}
                      style={{ maxHeight: 48, maxWidth: 120, objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, color: "#fff" }}>{sp.name}</span>
                  )}
                  {sp.website && (
                    <a
                      href={sp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="muted small"
                      style={{ textDecoration: "underline" }}
                    >
                      Sito web ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Modal consenso GDPR ──────────────────────────────────────── */}
      {showConsent && (
        <EventConsentModal
          eventId={id}
          eventName={name}
          onSuccess={handleConsentSuccess}
          onClose={() => setShowConsent(false)}
        />
      )}

    </section>
  );
}
