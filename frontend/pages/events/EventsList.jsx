// src/pages/events/EventsList.jsx
/**
 * EventsList.jsx
 * --------------
 * Pagina pubblica con la lista di tutti gli eventi HelpLab.
 * Accessibile anche tramite link diretto e QR code (volantini).
 *
 * ACCESSO: pubblico — nessun token richiesto.
 *
 * PATTERN: identico a Challenges.jsx
 * - useEffect + useState + api diretta (nessun custom hook)
 * - cursor-based pagination con "Carica altri"
 * - filtro testuale lato client (gli eventi sono pochi, non serve lato BE)
 *
 * ROUTE: /eventi
 *
 * UX NOTE (mobile-first):
 * I volontari arrivano spesso da link su WhatsApp/Telegram con il telefono.
 * La card mostra subito le info essenziali: data, luogo, CTA grande.
 * Il filtro è secondario — utile quando gli eventi crescono.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents } from "@/api/events.api";
import { routes } from "@/routes";
import EventCard from "@/components/events/EventCard";

const PAGE_SIZE = 12;

export default function EventsList() {
  const navigate = useNavigate();

  const [items, setItems]           = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [query, setQuery]           = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Fetch pagina ──────────────────────────────────────────────────────────
  const fetchPage = useCallback(async ({ append = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const result = await getEvents({
        limit: PAGE_SIZE,
        cursor: append ? nextCursor : undefined,
      });

      const newItems = Array.isArray(result?.items) ? result.items : [];
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextCursor(result?.nextCursor ?? null);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.message ||
        "Errore nel caricamento degli eventi."
      );
      if (!append) {
        setItems([]);
        setNextCursor(null);
      }
    } finally {
      setLoading(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    fetchPage({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigazione alla pagina dettaglio ─────────────────────────────────────
  // Usa sempre lo slug dalla response BE — mai costruirlo dal nome
  function handleOpen(event) {
    navigate(routes.events.detail(event.slug));
  }

  // ── Filtri lato client ────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let list = [...items];

    // Filtro per stato
    if (filterStatus !== "all") {
      list = list.filter((ev) => ev.status === filterStatus);
    }

    // Filtro testuale: nome, descrizione, location, sponsor
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((ev) =>
        [
          ev.name,
          ev.description,
          ev.location_address,
          ...(ev.sponsors ?? []).map((s) => s.name),
          ...(ev.challenges ?? []).map((ch) => ch.title),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [items, query, filterStatus]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">Eventi</h1>
          <p className="page-subtitle" style={{ maxWidth: 720 }}>
            Partecipa agli eventi organizzati dalla community HelpLab sul
            territorio. Ogni evento raccoglie una o più sfide verificabili
            per un impatto misurabile.
          </p>
        </header>

        {/* Filtri */}
        <div className="filters-row" style={{ marginTop: 16 }}>
          <input
            type="search"
            className="control control-small control-pill"
            placeholder="Cerca evento, luogo o organizzatore…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cerca eventi"
          />
          <select
            className="control control-small control-pill"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filtra per stato"
          >
            <option value="all">Tutti gli stati</option>
            <option value="published">Aperti</option>
            <option value="ended">Conclusi</option>
          </select>
        </div>

        {/* Feedback caricamento / errore */}
        {loading && !items.length && (
          <div className="callout neutral">Caricamento eventi…</div>
        )}
        {error && (
          <div className="callout error">
            {error}{" "}
            <button
              className="btn btn-outline btn-small"
              onClick={() => fetchPage({ append: false })}
              style={{ marginLeft: 8 }}
            >
              Riprova
            </button>
          </div>
        )}

        {/* Lista vuota */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="dynamic-empty">
            <div className="dynamic-empty__icon">📅</div>
            <div className="dynamic-empty__text">
              {query || filterStatus !== "all"
                ? "Nessun evento corrisponde alla ricerca."
                : "Nessun evento disponibile al momento."}
            </div>
          </div>
        )}

        {/* Grid card eventi */}
        <div className="grid-cards">
          {filteredItems.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onOpen={handleOpen}
            />
          ))}
        </div>

        {/* Paginazione */}
        {nextCursor && !loading && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              className="btn btn-outline"
              onClick={() => fetchPage({ append: true })}
            >
              Carica altri eventi
            </button>
          </div>
        )}

        {/* Loader incrementale */}
        {loading && items.length > 0 && (
          <div className="callout neutral" style={{ marginTop: 16, textAlign: "center" }}>
            Caricamento…
          </div>
        )}

      </div>
    </section>
  );
}
