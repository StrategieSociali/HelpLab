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
import "../../styles/event-detail.css";

// ─── Cosa misura la piattaforma, per tipo di sfida ────────────────────────────
/**
 * Traduce il tipo di impatto di una sfida in ciò che i partecipanti contano
 * davvero. Serve alla sezione "Cosa misuriamo": un evento qualunque promette una
 * bella giornata, questo dichiara in anticipo quali numeri produrrà. È l'unica
 * cosa che questa piattaforma può mettere su una pagina evento e nessun altro,
 * e parla a due pubblici insieme: chi partecipa capisce che il suo gesto viene
 * contato, e lo sponsor vede su cosa poggeranno i numeri del suo attestato.
 *
 * L'unità è quella che la persona conta e digita (decisione PM 7/8/2026), non i
 * kg di CO2: la CO2 è il risultato, non l'obiettivo.
 */
const IMPACT_LABELS = {
  no_waste:      { icon: "♻️", label: "Rifiuti raccolti",        unit: "kg" },
  waste:         { icon: "♻️", label: "Rifiuti raccolti",        unit: "kg" },
  reuse:         { icon: "👕", label: "Capi rimessi in circolo", unit: "capi" },
  mobility:      { icon: "🚲", label: "Spostamenti sostenibili", unit: "spostamenti" },
  social:        { icon: "🤝", label: "Volontariato",            unit: "ore" },
  tree_planting: { icon: "🌱", label: "Alberi messi a dimora",   unit: "alberi" },
};

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

  // Dimensioni misurate dall'evento, dedotte dai tipi delle sfide collegate.
  // Nessuna chiamata in più: `type` arriva già con l'evento (BE 0.18.4).
  const measured = Array.from(
    new Map(
      challenges
        .map((ch) => IMPACT_LABELS[ch.type])
        .filter(Boolean)
        .map((m) => [m.label, m])
    ).values()
  );

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Breadcrumb */}
        <Link to={routes.events.list} className="muted small ev-back">
          ← Tutti gli eventi
        </Link>

        {/* ── Testata ──────────────────────────────────────────────────────
            Due colonne: la locandina a sinistra, i fatti a destra. La locandina
            è l'oggetto caratteristico dell'evento (l'ha disegnata chi lo
            organizza) e prima stava in un francobollo alto 80px, schiacciata in
            un campo pensato per un logo. Su mobile le colonne si impilano e
            l'immagine è limitata in altezza, perché sotto ci sono data e luogo:
            le due cose che la persona è venuta a cercare. */}
        <div className="card glass ev-hero">

          {logo_url && (
            <div>
              {/* Cliccabile: una locandina contiene programma e orari in piccolo,
                  e da telefono l'unico modo di leggerli è aprirla a schermo pieno. */}
              <a
                href={logo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ev-poster-link"
              >
                <img src={logo_url} alt={`Locandina di ${name}`} className="ev-poster" />
              </a>
              <span className="muted small ev-poster-caption">
                Tocca per ingrandire la locandina
              </span>
            </div>
          )}

          <div>
            <StatusBadge status={status} />
            <h1 className="ev-title">{name}</h1>

            <ul className="ev-facts">
              <li className="ev-fact">
                <span className="ev-fact__label">Quando</span>
                <span className="ev-fact__value">{dateRangeLabel(start_date, end_date)}</span>
              </li>
              {location_address && (
                <li className="ev-fact">
                  <span className="ev-fact__label">Dove</span>
                  <span className="ev-fact__value">
                    {mapUrl ? (
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                        {location_address} ↗
                      </a>
                    ) : (
                      location_address
                    )}
                  </span>
                </li>
              )}
            </ul>

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
        </div>

        {/* ── Descrizione ──────────────────────────────────────────────────
            Fuori dalla testata e a larghezza piena: è testo lungo, e in una
            colonna stretta accanto alla locandina diventerebbe illeggibile.
            La classe conserva gli a capo dell'originale (`white-space: pre-line`):
            le descrizioni arrivano incollate dai social, dove le interruzioni di
            riga sono la struttura del testo, e dentro un <p> normale venivano
            collassate in un muro unico. */}
        {description && (
          <div className="card glass ev-section">
            <p className="ev-description">{description}</p>
          </div>
        )}

        {/* ── Cosa misuriamo ───────────────────────────────────────────────
            Compare solo se le sfide collegate dichiarano un tipo d'impatto:
            senza sfide non si promette nulla che non si possa mantenere. */}
        {measured.length > 0 && (
          <div className="card glass ev-measure">
            <div className="ev-measure__eyebrow">Cosa misuriamo</div>
            <ul className="ev-measure__list">
              {measured.map((m) => (
                <li key={m.label} className="ev-measure__item">
                  <span aria-hidden="true">{m.icon}</span>
                  {m.label}
                  <span className="ev-measure__unit">({m.unit})</span>
                </li>
              ))}
            </ul>
            <p className="muted small" style={{ margin: 0 }}>
              {status === "ended"
                ? "I numeri di questo evento sono stati verificati uno per uno, con fonti dichiarate."
                : "Ogni contributo viene verificato prima di entrare nel conto, con fonti dichiarate."}
            </p>
          </div>
        )}

        {/* ── Sfide dell'evento ──────────────────────────────────────── */}
        {challenges.length > 0 && (
          <div className="card glass ev-section">
            <h2 className="dynamic-subtitle ev-section__title">
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

        {/* ── Sponsor ──────────────────────────────────────────────────────
            Ogni logo su una PIASTRA CHIARA. I marchi di terzi sono quasi sempre
            disegnati per il bianco: su fondo scuro un PNG con trasparenza si
            sporca o sparisce del tutto, e prima erano immagini nude alte 48px
            appoggiate sul gradiente. È il dettaglio che distingue "loghi
            presentati" da "loghi incollati", ed è la parte della pagina che uno
            sponsor guarda per prima.

            ⚠️ NOTA STRUTTURALE: gli sponsor si ricavano dalle SFIDE collegate
            (`sponsor_id` + `challenge_sponsorships`), non dall'evento. Un
            sostenitore dell'evento che non sponsorizza una singola sfida non ha
            oggi alcun modo di comparire qui. Vedi `bug-e-todo.md`. */}
        {sponsors.length > 0 && (
          <div className="card glass ev-section">
            <h2 className="dynamic-subtitle ev-section__title">
              Con il sostegno di
            </h2>
            <div className="ev-sponsors__grid">
              {sponsors.map((sp) => {
                const plate = (
                  <div className="ev-sponsor__plate">
                    {sp.logo_url ? (
                      <img src={sp.logo_url} alt={sp.name} className="ev-sponsor__logo" />
                    ) : (
                      <span className="ev-sponsor__name">{sp.name}</span>
                    )}
                  </div>
                );
                return (
                  <div key={sp.id} className="ev-sponsor">
                    {/* Con un sito, tutta la piastra è cliccabile: un bersaglio
                        grande è più comodo del link testuale sotto, e su telefono
                        è la differenza fra un tocco e tre tentativi. */}
                    {sp.website ? (
                      <a
                        href={sp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ width: "100%" }}
                        aria-label={`Sito di ${sp.name}`}
                      >
                        {plate}
                      </a>
                    ) : (
                      plate
                    )}
                    <span className="muted small">{sp.name}</span>
                  </div>
                );
              })}
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
