/**
 * LearningPaths.jsx
 * -----------------
 * Catalogo pubblico dei percorsi di apprendimento di HelpLab.
 *
 * Architettura:
 * - HelpLab NON è un LMS: i corsi sono erogati su piattaforme esterne
 *   (YouTube, LifterLMS). Questa pagina mostra il catalogo e rimanda
 *   all'esterno per la fruizione.
 * - Nessun sistema di completamento, progresso o player video integrato.
 * - Nessun login richiesto: tutti i corsi sono visibili a chiunque.
 * - I filtri (categoria, ruolo, tipo) sono lato frontend con enum fissi
 *   documentati nel backend handoff v1.1. Non serve una chiamata API
 *   per ottenerli.
 *
 * Ref backend handoff: Learning Path Catalog v1.1 – 27/02/2026
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLearningPaths } from "@/api/learningPaths.api";
import "@/styles/learning-paths.css";

// ─── ENUM FISSI (dal backend handoff, sezione 1.2) ───────────────────────────
// Non fare chiamate API per questi valori: sono definiti e stabili.

const CATEGORIES = [
  { value: "",               label: "Tutte le categorie" },
  { value: "ONBOARDING",    label: "Onboarding" },
  { value: "PLATFORM_USAGE",label: "Uso piattaforma" },
  { value: "DATA_LITERACY", label: "Dati e metriche" },
  { value: "SUSTAINABILITY", label: "Sostenibilità" },
  { value: "GAME_THEORY",   label: "Teoria dei giochi" },
  { value: "TECHNICAL",     label: "Tecnico" },
];

const TARGET_ROLES = [
  { value: "",          label: "Tutti i ruoli" },
  { value: "VOLUNTEER", label: "Volontario" },
  { value: "JUDGE",     label: "Giudice" },
  { value: "SPONSOR",   label: "Sponsor" },
  { value: "PA",        label: "PA" },
];

const TYPES = [
  { value: "",        label: "Tutti" },
  { value: "FREE",    label: "Gratuito" },
  { value: "PREMIUM", label: "Premium" },
];

// ─── LABEL LEGGIBILI PER ENUM ─────────────────────────────────────────────────

const CATEGORY_LABELS = {
  ONBOARDING:     "Onboarding",
  PLATFORM_USAGE: "Uso piattaforma",
  DATA_LITERACY:  "Dati e metriche",
  SUSTAINABILITY: "Sostenibilità",
  GAME_THEORY:    "Teoria dei giochi",
  TECHNICAL:      "Tecnico",
};

const TARGET_ROLE_LABELS = {
  ALL:       "Tutti",
  VOLUNTEER: "Volontario",
  JUDGE:     "Giudice",
  SPONSOR:   "Sponsor",
  PA:        "PA",
};

// ─── HELPER: testo del CTA in base al provider ───────────────────────────────
// Distinguiamo tra "Guarda" (YouTube, gratuiti/video) e "Vai al corso" (LMS).

function getCtaLabel(provider) {
  if (provider === "YOUTUBE") return "Guarda il corso";
  return "Vai al corso";
}

// ─── HELPER: icona testuale del provider ─────────────────────────────────────
// Usiamo emoji/testo perché non abbiamo dipendenze da librerie di icone esterne.
// In futuro si può sostituire con SVG dedicati.

function ProviderBadge({ provider }) {
  const map = {
    YOUTUBE:   { icon: "▶", label: "YouTube" },
    LIFTERLMS: { icon: "🎓", label: "LifterLMS" },
    EXTERNAL:  { icon: "↗", label: "Esterno" },
  };
  const entry = map[provider] || map.EXTERNAL;
  return (
    <span className="lp-provider-badge" aria-label={`Provider: ${entry.label}`}>
      <span aria-hidden="true">{entry.icon}</span> {entry.label}
    </span>
  );
}

// ─── HELPER: durata leggibile ─────────────────────────────────────────────────

function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

// ─── PLACEHOLDER: thumbnail assente ──────────────────────────────────────────
// Mostra un'area colorata con l'icona della categoria invece di un'immagine rotta.

const CATEGORY_ICONS = {
  ONBOARDING:     "🚀",
  PLATFORM_USAGE: "🖥️",
  DATA_LITERACY:  "📊",
  SUSTAINABILITY: "🌱",
  GAME_THEORY:    "♟️",
  TECHNICAL:      "⚙️",
};

function ThumbnailPlaceholder({ category }) {
  const icon = CATEGORY_ICONS[category] || "📚";
  return (
    <div className="lp-card__thumb lp-card__thumb--placeholder" aria-hidden="true">
      <span className="lp-card__thumb-icon">{icon}</span>
    </div>
  );
}

// ─── SKELETON: card di caricamento ────────────────────────────────────────────
// Mantiene il layout stabile durante il fetch iniziale (no layout shift).

function SkeletonCard() {
  return (
    <div className="lp-card lp-card--skeleton" aria-hidden="true">
      <div className="lp-card__thumb lp-card__thumb--skeleton" />
      <div className="lp-card__body">
        <div className="skeleton-line skeleton-line--short" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--medium" />
      </div>
    </div>
  );
}

// ─── COMPONENTE CARD CORSO ────────────────────────────────────────────────────

function CourseCard({ course }) {
  const {
    title,
    description,
    category,
    targetRole,
    type,
    provider,
    externalUrl,
    thumbnailUrl,
    durationMinutes,
  } = course;

  const duration = formatDuration(durationMinutes);
  const ctaLabel = getCtaLabel(provider);
  const isPremium = type === "PREMIUM";

  return (
    <article className={`lp-card ${isPremium ? "lp-card--premium" : ""}`}>
      {/* Thumbnail o placeholder */}
      {thumbnailUrl ? (
        <div className="lp-card__thumb">
          <img
            src={thumbnailUrl}
            alt=""
            className="lp-card__thumb-img"
            loading="lazy"
          />
        </div>
      ) : (
        <ThumbnailPlaceholder category={category} />
      )}

      <div className="lp-card__body">
        {/* Intestazione chip: categoria, ruolo, tipo */}
        <div className="lp-card__chips">
          {category && (
            <span className="chip chip-category">
              {CATEGORY_LABELS[category] || category}
            </span>
          )}
          {targetRole && targetRole !== "ALL" && (
            <span className="chip chip-role">
              {TARGET_ROLE_LABELS[targetRole] || targetRole}
            </span>
          )}
          {/* Badge FREE/PREMIUM — visivamente distinti */}
          <span className={`chip ${isPremium ? "chip-premium" : "chip-free"}`}>
            {isPremium ? "Premium" : "Gratuito"}
          </span>
        </div>

        {/* Titolo */}
        <h2 className="lp-card__title">{title}</h2>

        {/* Descrizione troncata via CSS (line-clamp) */}
        {description && (
          <p className="lp-card__desc">{description}</p>
        )}

        {/* Metadati: provider + durata */}
        <div className="lp-card__meta">
          <ProviderBadge provider={provider} />
          {duration && (
            <span className="lp-card__duration" aria-label={`Durata: ${duration}`}>
              ⏱ {duration}
            </span>
          )}
        </div>
      </div>

      {/* CTA — sempre visibile, apre in nuova tab */}
      <div className="lp-card__footer">
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn ${isPremium ? "btn-premium" : "btn-primary"} lp-card__cta`}
          aria-label={`${ctaLabel}: ${title}`}
        >
          {ctaLabel}
        </a>
      </div>
    </article>
  );
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────

export default function LearningPaths() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtri — gestiti lato frontend con i valori degli enum fissi
  const [filterCategory,   setFilterCategory]   = useState("");
  const [filterTargetRole, setFilterTargetRole] = useState("");
  const [filterType,       setFilterType]       = useState("");

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  // Nota: l'API accetta i filtri anche via query string, ma per semplicità
  // e per evitare un fetch ad ogni cambio di chip, filtriamo lato frontend.
  // Il dataset dei corsi è piccolo e stabile.

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLearningPaths();
      setCourses(data);
    } catch (err) {
      console.error("LearningPaths fetch error:", err?.response || err);
      setError("Impossibile caricare i corsi. Verifica la connessione e riprova.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Filtri lato frontend ───────────────────────────────────────────────────

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (filterCategory && c.category !== filterCategory) return false;
      // "ALL" nel DB significa che il corso è adatto a tutti i ruoli
      if (filterTargetRole && c.targetRole !== filterTargetRole && c.targetRole !== "ALL") return false;
      if (filterType && c.type !== filterType) return false;
      return true;
    });
  }, [courses, filterCategory, filterTargetRole, filterType]);

  const hasActiveFilters = filterCategory || filterTargetRole || filterType;
  const isEmpty = !loading && !error && courses.length === 0;
  const isEmptyFiltered = !loading && !error && courses.length > 0 && filteredCourses.length === 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Intestazione pagina */}
        <header className="page-header">
          <h1 className="page-title">Percorsi di apprendimento</h1>
          <p className="page-subtitle" style={{ maxWidth: 760 }}>
            Risorse formative gratuite e premium per conoscere HelpLab,
            partecipare meglio alle sfide e approfondire i temi della
            sostenibilità verificabile. I corsi si tengono su YouTube e
            LifterLMS — clicca per accedere alla piattaforma esterna.
          </p>
        </header>

        {/* ─── Filtri ──────────────────────────────────────────────────────── */}
        <div className="lp-filters" role="search" aria-label="Filtra corsi">

          {/* Filtro categoria — dropdown perché ha 6 valori */}
          <div className="lp-filters__group">
            <label htmlFor="filter-category" className="lp-filters__label">
              Categoria
            </label>
            <select
              id="filter-category"
              className="control control"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro ruolo target — chip selezionabili */}
          <div className="lp-filters__group">
            <span className="lp-filters__label" id="filter-role-label">
              Ruolo
            </span>
            <div
              className="lp-filters__chips"
              role="group"
              aria-labelledby="filter-role-label"
            >
              {TARGET_ROLES.map((r) => (
                <button
                  key={r.value}
                  className={`chip chip-filter ${filterTargetRole === r.value ? "is-active" : ""}`}
                  onClick={() => setFilterTargetRole(r.value)}
                  aria-pressed={filterTargetRole === r.value}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro tipo — chip selezionabili */}
          <div className="lp-filters__group">
            <span className="lp-filters__label" id="filter-type-label">
              Tipo
            </span>
            <div
              className="lp-filters__chips"
              role="group"
              aria-labelledby="filter-type-label"
            >
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`chip chip-filter ${filterType === t.value ? "is-active" : ""}`}
                  onClick={() => setFilterType(t.value)}
                  aria-pressed={filterType === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset filtri — visibile solo se almeno un filtro è attivo */}
          {hasActiveFilters && (
            <button
              className="btn btn-ghost  lp-filters__reset"
              onClick={() => {
                setFilterCategory("");
                setFilterTargetRole("");
                setFilterType("");
              }}
            >
              ✕ Rimuovi filtri
            </button>
          )}
        </div>

        {/* ─── Stato: errore ───────────────────────────────────────────────── */}
        {error && (
          <div className="callout error" role="alert">
            <p>{error}</p>
            <button className="btn btn-outline " onClick={load}>
              Riprova
            </button>
          </div>
        )}

        {/* ─── Stato: loading (skeleton) ───────────────────────────────────── */}
        {loading && (
          <div
            className="lp-grid"
            aria-busy="true"
            aria-label="Caricamento corsi in corso"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ─── Stato: catalogo vuoto (nessun corso in DB) ──────────────────── */}
        {isEmpty && (
          <div className="callout neutral" role="status">
            <p>
              I corsi saranno disponibili a breve.{" "}
              <a
                href="https://t.me/helplab"
                target="_blank"
                rel="noopener noreferrer"
              >
                Seguici su Telegram
              </a>{" "}
              per restare aggiornato!
            </p>
          </div>
        )}

        {/* ─── Stato: filtri senza risultati ───────────────────────────────── */}
        {isEmptyFiltered && (
          <div className="callout neutral" role="status">
            <p>Nessun corso disponibile per i filtri selezionati.</p>
            <button
              className="btn btn-outline "
              onClick={() => {
                setFilterCategory("");
                setFilterTargetRole("");
                setFilterType("");
              }}
            >
              Rimuovi i filtri
            </button>
          </div>
        )}

        {/* ─── Griglia corsi ───────────────────────────────────────────────── */}
        {!loading && !error && filteredCourses.length > 0 && (
          <>
            {/* Contatore risultati — aiuta l'orientamento, spec. su mobile */}
            <p className="lp-results-count" aria-live="polite">
              {filteredCourses.length}{" "}
              {filteredCourses.length === 1 ? "corso trovato" : "corsi trovati"}
              {hasActiveFilters && " con i filtri selezionati"}
            </p>

            <div className="lp-grid" role="list">
              {filteredCourses.map((course) => (
                <div key={course.id} role="listitem">
                  <CourseCard course={course} />
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
