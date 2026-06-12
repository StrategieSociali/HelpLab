// src/pages/ImpactPage.jsx
/**
 * ImpactPage.jsx
 * --------------
 * Pagina pubblica dell'impatto globale della piattaforma HelpLab.
 *
 * SCOPO
 * Mostrare a cittadini e potenziali sostenitori:
 * - I tre numeri chiave (CO₂ risparmiata, volontari, azioni completate)
 * - Il gap di compensazione (alberi piantati vs alberi necessari)
 * - Lo stato di compensazione per ogni evento
 * - Una CTA per adottare un albero
 *
 * ENDPOINT
 * GET /v1/impact/global-summary — pubblico, nessun token richiesto
 * Cache server 5 minuti. Nessun polling automatico:
 * l'utente può aggiornare manualmente con il pulsante dedicato.
 *
 * ROUTE
 * /impact
 *
 * ACCESSO
 * Pubblica — nessuna autenticazione richiesta.
 *
 * NOTE
 * - Il frontend non calcola mai fattori CO₂ o formule di business.
 * - L'unico valore derivato è co2_pending_kg / trees_pending per il
 *   micro-copy del CTA: è una divisione di due valori già calcolati
 *   dal backend, non un algoritmo proprietario.
 * - Il grafico storico è un placeholder: verrà popolato quando
 *   il backend esporrà l'endpoint /impact/history.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { routes } from "@/routes";

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Formatta un numero con separatore decimale italiano (virgola).
 * Restituisce "—" se il valore è nullo o non numerico.
 */
function fmt(value, decimals = 1) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals).replace(".", ",");
}

/**
 * Formatta un numero intero con separatore delle migliaia.
 * Es: 1245 → "1.245"
 */
function fmtInt(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Math.round(Number(value)).toLocaleString("it-IT");
}

// ─── Sotto-componenti ─────────────────────────────────────────────────────────

/**
 * HeroCounter
 * Counter grande per la sezione hero.
 * accent=true → evidenzia in verde il dato principale (CO₂).
 */
function HeroCounter({ label, value, unit, accent = false }) {
  return (
    <div
      style={{
        flex: "1 1 200px",
        padding: "32px 24px",
        borderRadius: "var(--radius-lg)",
        background: accent
          ? "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%)"
          : "rgba(255,255,255,0.06)",
        border: accent
          ? "1px solid rgba(16,185,129,0.40)"
          : "1px solid rgba(255,255,255,0.10)",
        textAlign: "center",
        minWidth: 160,
      }}
    >
      {/* Valore numerico */}
      <div
        style={{
          fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: accent ? "rgb(74,222,128)" : "#ffffff",
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: "0.38em",
              fontWeight: 600,
              marginLeft: 6,
              opacity: 0.7,
              letterSpacing: 0,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {/* Label */}
      <div
        style={{
          marginTop: 10,
          fontSize: "0.82rem",
          opacity: 0.6,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "#ffffff",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * ProgressBar
 * Barra di avanzamento orizzontale con percentuale.
 * Usata nella sezione compensazione.
 */
function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div>
      {/* Barra */}
      <div
        style={{
          height: 12,
          borderRadius: "var(--radius-pill)",
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
          marginBottom: 8,
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% degli alberi già piantati`}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent-green-2), var(--accent-green-1))",
            borderRadius: "var(--radius-pill)",
            transition: "width 0.8s ease",
          }}
        />
      </div>
      {/* Etichetta percentuale */}
      <div
        style={{
          fontSize: "0.82rem",
          opacity: 0.6,
          color: "#ffffff",
          textAlign: "right",
        }}
      >
        {pct}% completato
      </div>
    </div>
  );
}

/**
 * EventCompensationCard
 * Card per ogni evento nell'array by_event.
 * Mostra nome, CO₂, stato compensazione e mini-progress.
 */
function EventCompensationCard({ event }) {
  const isCompensated = event.status === "compensated";
  const pct =
    event.trees_needed > 0
      ? Math.min(100, Math.round((event.trees_planted / event.trees_needed) * 100))
      : 0;

  return (
    <div
      className="card"
      style={{
        /* Bordo colorato a sinistra come indicatore visivo rapido */
        borderLeft: isCompensated
          ? "3px solid rgb(74,222,128)"
          : "3px solid rgb(250,204,21)",
        padding: "20px 20px 20px 18px",
      }}
    >
      {/* Intestazione card: nome evento + badge stato */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 700,
            color: "#ffffff",
            flex: 1,
          }}
        >
          {event.event_name}
        </h3>
        {/* Badge stato: usa le classi chip semantiche già in styles.css */}
        <span
          className={`chip ${isCompensated ? "chip-success" : "chip-warning"}`}
          aria-label={isCompensated ? "Evento compensato" : "Compensazione in corso"}
        >
          {isCompensated ? "✓ Compensato" : "⏳ In attesa"}
        </span>
      </div>

      {/* Dati numerici in riga */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "rgb(74,222,128)", lineHeight: 1 }}
          >
            {fmt(event.co2_saved_kg)}
            <span style={{ fontSize: "0.5em", marginLeft: 4, opacity: 0.7 }}>kg CO₂</span>
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: 4, color: "#ffffff" }}>
            CO₂ risparmiata
          </div>
        </div>
        <div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ffffff", lineHeight: 1 }}
          >
            {event.trees_planted}
            <span style={{ opacity: 0.45, fontSize: "0.65em" }}> / {event.trees_needed}</span>
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: 4, color: "#ffffff" }}>
            Alberi piantati / necessari
          </div>
        </div>
      </div>

      {/* Mini barra progresso */}
      <div
        style={{
          height: 6,
          borderRadius: "var(--radius-pill)",
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: isCompensated
              ? "linear-gradient(90deg, var(--accent-green-2), var(--accent-green-1))"
              : "linear-gradient(90deg, #b45309, #d97706)",
            borderRadius: "var(--radius-pill)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

/**
 * ChartComingSoon
 * Placeholder per il grafico storico.
 * Quando il backend esporrà /impact/history, sostituire questo componente
 * con il grafico reale senza dover ricostruire la struttura della pagina.
 */
function ChartComingSoon() {
  return (
    <div
      style={{
        border: "1px dashed rgba(255,255,255,0.20)",
        borderRadius: "var(--radius-lg)",
        padding: "48px 32px",
        textAlign: "center",
        background: "rgba(255,255,255,0.03)",
      }}
      aria-label="Grafico storico in arrivo"
    >
      {/* Simulazione visiva degli assi del grafico */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 8,
          marginBottom: 24,
          height: 80,
          opacity: 0.25,
        }}
        aria-hidden="true"
      >
        {[30, 50, 40, 70, 60, 90, 75].map((h, i) => (
          <div
            key={i}
            style={{
              width: 24,
              height: `${h}%`,
              background: "linear-gradient(180deg, var(--accent-green-1), var(--accent-green-2))",
              borderRadius: "4px 4px 0 0",
            }}
          />
        ))}
      </div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
        📈 Il grafico della crescita nel tempo sarà disponibile presto
      </div>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", marginTop: 6 }}>
        I dati storici verranno aggiunti con il prossimo aggiornamento del backend
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function ImpactPage() {
  const { t } = useTranslation("pages/impact", { useSuspense: false });

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  /**
   * fetchData
   * Recupera il summary globale dall'API.
   * isManual=true → attiva lo stato "refreshing" per il feedback visivo
   * sul pulsante di aggiornamento manuale.
   */
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: response } = await api.get("/v1/impact/global-summary");
      setData(response);
      setLastUpdate(new Date());
      setError("");
    } catch (err) {
      console.error("Errore caricamento impact summary:", err);
      setError(t("errors.load", "Impossibile caricare i dati. Riprova tra qualche istante."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Caricamento iniziale — nessun polling automatico (dati stabili su scala di giorni)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Dati estratti dalla risposta API ──────────────────────────────────────
  const totalCo2     = data?.total_co2_saved_kg ?? 0;
  const totalVolunteers = data?.total_volunteers ?? 0;
  const totalSubmissions = data?.total_submissions ?? 0;
  const treesPlanted = data?.compensation?.trees_planted ?? 0;
  const treesNeeded  = data?.compensation?.trees_needed_total ?? 0;
  const treesPending = data?.compensation?.trees_pending ?? 0;
  const co2Pending   = data?.compensation?.co2_pending_kg ?? 0;

  // Filtro eventi: solo quelli con CO₂ > 0 (come da specifiche backend)
  const events = (data?.by_event ?? []).filter((e) => e.co2_saved_kg > 0);

  // Calcolo micro-copy CTA: kg di CO₂ per albero necessario
  // Divisione di due valori già calcolati dal backend — non è IP.
  const co2PerTree =
    treesPending > 0 && co2Pending > 0
      ? Math.round(co2Pending / treesPending)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text">
      <div className="container">

        {/* ══════════════════════════════════════════════════════════════════
            HEADER PAGINA
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 48, paddingTop: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                className="page-title"
                style={{ marginBottom: 8 }}
              >
                🌍 Il nostro impatto
              </h1>
              <p style={{ opacity: 0.65, maxWidth: 520, lineHeight: 1.6, color: "#ffffff" }}>
                Ogni viaggio in bici, ogni azione sostenibile dei nostri volontari diventa
                CO₂ evitata misurabile. Qui teniamo traccia di quanto abbiamo fatto insieme
                — e di quanto manca per compensare tutto con alberi veri.
              </p>
            </div>

            {/* Pulsante aggiornamento manuale + timestamp */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
                flexShrink: 0,
                paddingTop: 4,
              }}
            >
              <button
                className="btn btn-outline btn-small"
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                aria-label="Aggiorna le statistiche"
                style={{ minWidth: 160 }}
              >
                {refreshing ? "↻ Aggiornamento…" : "↻ Aggiorna statistiche"}
              </button>
              {lastUpdate && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.45,
                    color: "#ffffff",
                  }}
                >
                  Aggiornato alle {lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stato: caricamento */}
        {loading && (
          <div className="callout neutral" role="status" aria-live="polite">
            Caricamento dei dati in corso…
          </div>
        )}

        {/* Stato: errore */}
        {error && !loading && (
          <div className="callout error" role="alert">
            {error}
            <button
              className="btn btn-small"
              onClick={() => fetchData()}
              style={{ marginLeft: 12 }}
            >
              Riprova
            </button>
          </div>
        )}

        {/* Stato: dati caricati */}
        {data && !loading && (
          <>
            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 1: HERO — I tre numeri principali
            ══════════════════════════════════════════════════════════════ */}
            <div style={{ marginBottom: 56 }}>
              {/* Label sezione */}
              <div
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  opacity: 0.45,
                  marginBottom: 16,
                  color: "#ffffff",
                }}
              >
                Impatto cumulativo della piattaforma
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                {/* CO₂ — dato principale, evidenziato */}
                <HeroCounter
                  label="CO₂ risparmiata dai volontari"
                  value={fmt(totalCo2)}
                  unit="kg"
                  accent
                />
                <HeroCounter
                  label="Volontari attivi"
                  value={fmtInt(totalVolunteers)}
                />
                <HeroCounter
                  label="Azioni completate"
                  value={fmtInt(totalSubmissions)}
                />
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 2: IL GAP — Compensazione con alberi
                Questa è la sezione narrativa chiave e il funnel principale.
            ══════════════════════════════════════════════════════════════ */}
            <div
              style={{
                marginBottom: 56,
                padding: "40px 32px",
                borderRadius: "var(--radius-lg)",
                background: "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(5,150,105,0.06) 100%)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              {/* Titolo sezione */}
              <div
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  marginBottom: 8,
                  color: "#ffffff",
                }}
              >
                Compensazione CO₂
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: 8,
                  letterSpacing: "-0.02em",
                }}
              >
                Ogni kg di CO₂ risparmiata, la compensiamo piantando alberi
              </h2>
              <p style={{ opacity: 0.6, marginBottom: 32, maxWidth: 560, color: "#ffffff", lineHeight: 1.6 }}>
                Non basta ridurre: vogliamo anche compensare. Per ogni evento, calcoliamo
                gli alberi necessari e li piantiamo davvero. Ecco a che punto siamo.
              </p>

              {/* Numeri alberi + barra progresso */}
              <div
                style={{
                  display: "flex",
                  gap: 40,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  marginBottom: 32,
                }}
              >
                {/* Colonna sinistra: numeri */}
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", flex: "1 1 280px" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "clamp(2rem, 5vw, 3rem)",
                        fontWeight: 800,
                        color: "rgb(74,222,128)",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {fmtInt(treesPlanted)}
                      <span style={{ fontSize: "0.4em", marginLeft: 6, opacity: 0.65 }}>🌳</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", opacity: 0.55, marginTop: 8, color: "#ffffff" }}>
                      Alberi già piantati
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "clamp(2rem, 5vw, 3rem)",
                        fontWeight: 800,
                        color: "rgb(250,204,21)",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {fmtInt(treesPending)}
                      <span style={{ fontSize: "0.4em", marginLeft: 6, opacity: 0.65 }}>🌱</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", opacity: 0.55, marginTop: 8, color: "#ffffff" }}>
                      Alberi ancora necessari
                    </div>
                  </div>
                </div>

                {/* Colonna destra: barra progresso */}
                <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                  <ProgressBar current={treesPlanted} total={treesNeeded} />
                  <div style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: 10, color: "#ffffff" }}>
                    {fmtInt(treesPlanted)} di {fmtInt(treesNeeded)} alberi totali necessari
                  </div>
                </div>
              </div>

              {/* CO₂ residua */}
              {co2Pending > 0 && (
                <div
                  style={{
                    background: "rgba(250,204,21,0.08)",
                    border: "1px solid rgba(250,204,21,0.20)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    marginBottom: 32,
                    fontSize: "0.9rem",
                    color: "rgb(250,204,21)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>⚠️</span>
                  <span>
                    Ancora <strong>{fmt(co2Pending)} kg di CO₂</strong> da compensare
                  </span>
                </div>
              )}

              {/* CTA principale — adozione albero */}
              <div>
                <Link
                  to={routes.impact.adoptTree}
                  className="btn btn-primary btn-large"
                  style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
                >
                  🌳 Adotta un albero
                </Link>
                {/* Micro-copy motivazionale derivato da valori API */}
                {co2PerTree && (
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: "0.82rem",
                      opacity: 0.55,
                      color: "#ffffff",
                    }}
                  >
                    Ogni albero che adotti compensa circa {fmtInt(co2PerTree)} kg di CO₂
                  </p>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 3: STATO PER EVENTO
            ══════════════════════════════════════════════════════════════ */}
            {events.length > 0 && (
              <div style={{ marginBottom: 56 }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    opacity: 0.45,
                    marginBottom: 8,
                    color: "#ffffff",
                  }}
                >
                  Dettaglio per evento
                </div>
                <h2
                  style={{
                    fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: 24,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Stato compensazione per evento
                </h2>

                <div className="grid-cards">
                  {events.map((event) => (
                    <EventCompensationCard key={event.event_id} event={event} />
                  ))}
                </div>

                {/* Legenda badge */}
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chip chip-success" style={{ fontSize: "0.72rem" }}>✓ Compensato</span>
                    <span style={{ fontSize: "0.78rem", opacity: 0.5, color: "#ffffff" }}>
                      Tutti gli alberi necessari sono stati piantati
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chip chip-warning" style={{ fontSize: "0.72rem" }}>⏳ In attesa</span>
                    <span style={{ fontSize: "0.78rem", opacity: 0.5, color: "#ffffff" }}>
                      Mancano ancora alcuni alberi
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stato vuoto: nessun evento con CO₂ > 0 */}
            {events.length === 0 && (
              <div className="callout neutral" style={{ marginBottom: 56 }}>
                Nessun evento con dati di compensazione disponibili al momento.
                I dati compariranno non appena i volontari completeranno le prime azioni.
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 4: GRAFICO STORICO (placeholder)
                TODO: sostituire ChartComingSoon con il grafico reale
                quando il backend esporrà GET /v1/impact/history
            ══════════════════════════════════════════════════════════════ */}
            <div style={{ marginBottom: 56 }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  opacity: 0.45,
                  marginBottom: 8,
                  color: "#ffffff",
                }}
              >
                Crescita nel tempo
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: 24,
                  letterSpacing: "-0.01em",
                }}
              >
                L'impatto cresce di evento in evento
              </h2>
              <ChartComingSoon />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 5: FOOTER CTA
                Ripetizione del CTA per chi ha letto tutta la pagina.
                Tono diverso: più narrativo, meno urgente.
            ══════════════════════════════════════════════════════════════ */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.10)",
                paddingTop: 48,
                marginBottom: 32,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>🌱</div>
              <h2
                style={{
                  fontSize: "clamp(1.3rem, 3vw, 1.8rem)",
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                }}
              >
                Vuoi aiutarci a piantare gli alberi mancanti?
              </h2>
              <p
                style={{
                  opacity: 0.6,
                  maxWidth: 480,
                  margin: "0 auto 28px",
                  lineHeight: 1.6,
                  color: "#ffffff",
                }}
              >
                Non serve essere sviluppatori o esperti. Bastano pochi euro per contribuire
                alla compensazione reale e misurabile di tutta la CO₂ che i nostri volontari
                hanno evitato insieme.
              </p>
              <Link
                to={routes.impact.adoptTree}
                className="btn btn-primary btn-large"
                style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
              >
                🌳 Adotta un albero
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
