// src/pages/ImpactPage.jsx
/**
 * ImpactPage.jsx
 * --------------
 * Pagina pubblica dell'impatto globale della piattaforma HelpLab.
 *
 * SCOPO
 * Mostrare a cittadini e potenziali sostenitori:
 * - I numeri chiave (CO₂ risparmiata, CO₂ emessa, dato storico, volontari, azioni)
 * - Il fabbisogno di alberi per assorbire la CO₂ emessa, e quelli piantati
 * - La CO₂ di ogni evento
 * - Una CTA per adottare un albero
 *
 * Fabbisogno, non compensazione (be-impact-metodologia.md §5, 14/10/2026): niente
 * eventi «compensati» né CO₂ «da compensare» (art. 23, lett. d-quater, del Codice
 * del consumo). Tre indicatori separati, mai sottratti l'uno dall'altro.
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
 * - Il frontend non calcola mai fattori CO₂ o formule di business, e nessun
 *   rapporto tra valori del backend può far risalire al fattore albero.
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
 * Usata nella sezione alberi: misura la piantumazione rispetto al fabbisogno.
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
        aria-label={`${pct}% degli alberi del fabbisogno piantati`}
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

/** «N albero adulto» / «N alberi adulti» */
function adultTrees(n) {
  return n === 1 ? "1 albero adulto" : `${fmtInt(n)} alberi adulti`;
}

/**
 * EventCo2Card
 * Card per ogni evento nell'array by_event: la CO₂ nelle sue grandezze, mai
 * sommate, e gli alberi. Nessuno stato «compensato» (be-impact-metodologia.md §5,
 * frasi 9 e 10): il fabbisogno dice quanti alberi adulti assorbirebbero in un anno
 * la CO₂ emessa, e quanti ne sono stati piantati.
 */
function EventCo2Card({ event }) {
  const savedKg    = event.co2_saved_kg ?? 0;
  const emittedKg  = event.co2_emitted_kg ?? 0;
  const historicKg = event.co2_historic_kg ?? 0;
  const needed     = event.trees_needed ?? 0;
  const planted    = event.trees_planted ?? 0;
  const equivalent = event.trees_equivalent ?? 0;

  const pct = needed > 0 ? Math.min(100, Math.round((planted / needed) * 100)) : 0;

  // Un chip per grandezza presente: un evento misto li mostra entrambi.
  const chips = [];
  if (event.historic)  chips.push({ cls: "chip-warning", text: "Dato storico" });
  if (emittedKg > 0)   chips.push({ cls: "chip-neutral", text: "Impronta misurata" });
  if (savedKg > 0)     chips.push({ cls: "chip-success", text: "CO₂ risparmiata" });

  return (
    <div
      className="card"
      style={{
        borderLeft: needed > 0
          ? "3px solid rgba(255,255,255,0.35)"
          : "3px solid rgb(74,222,128)",
        padding: "20px 20px 20px 18px",
      }}
    >
      {/* Intestazione card: nome evento + chip delle grandezze */}
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chips.map((c) => (
            <span key={c.text} className={`chip ${c.cls}`}>{c.text}</span>
          ))}
        </div>
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
        {savedKg > 0 && (
          <div>
            <div
              style={{ fontSize: "1.4rem", fontWeight: 800, color: "rgb(74,222,128)", lineHeight: 1 }}
            >
              {fmt(savedKg)}
              <span style={{ fontSize: "0.5em", marginLeft: 4, opacity: 0.7 }}>kg CO₂</span>
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: 4, color: "#ffffff" }}>
              CO₂ risparmiata
            </div>
          </div>
        )}

        {/* Le grandezze non si sommano mai: una e' CO2 non emessa grazie a una
            scelta, l'altra e' CO2 emessa per raggiungere l'evento. */}
        {emittedKg > 0 && (
          <div>
            <div
              style={{ fontSize: "1.4rem", fontWeight: 800, color: "rgb(250,204,21)", lineHeight: 1 }}
            >
              {fmt(emittedKg)}
              <span style={{ fontSize: "0.5em", marginLeft: 4, opacity: 0.7 }}>kg CO₂</span>
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: 4, color: "#ffffff" }}>
              CO₂ emessa per arrivare
            </div>
          </div>
        )}

        {historicKg > 0 && (
          <div>
            <div
              style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ffffff", lineHeight: 1 }}
            >
              {fmt(historicKg)}
              <span style={{ fontSize: "0.5em", marginLeft: 4, opacity: 0.7 }}>kg CO₂</span>
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: 4, color: "#ffffff" }}>
              CO₂ misurata, risparmio e impronta non separati
            </div>
          </div>
        )}
      </div>

      {/* Alberi: fabbisogno sulla CO2 emessa (sul dato storico, tutta la CO2
          misurata: stima per eccesso); per il solo risparmio un'equivalenza. */}
      {needed > 0 && (
        <p style={{ fontSize: "0.85rem", opacity: 0.75, color: "#ffffff", margin: "0 0 10px", lineHeight: 1.5 }}>
          {event.historic
            ? `Per assorbirla tutta in un anno servirebbe${needed === 1 ? "" : "ro"} ${adultTrees(needed)}. Giovani alberi piantati: ${fmtInt(planted)}. Stima per eccesso: comprende anche la CO₂ risparmiata.`
            : `Per assorbirla in un anno servirebbe${needed === 1 ? "" : "ro"} ${adultTrees(needed)}. Giovani alberi piantati: ${fmtInt(planted)}.`}
        </p>
      )}
      {savedKg > 0 && equivalent > 0 && (
        <p style={{ fontSize: "0.85rem", opacity: 0.75, color: "#ffffff", margin: "0 0 10px", lineHeight: 1.5 }}>
          {`Equivale a quanto ${equivalent === 1 ? "assorbe" : "assorbono"} ${adultTrees(equivalent)} in un anno.`}
        </p>
      )}

      {/* Mini barra: solo dove c'e' un fabbisogno. Misura la piantumazione,
          non dichiara nessun evento «compensato». */}
      {needed > 0 && (
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
        aria-label={`${pct}% degli alberi del fabbisogno piantati`}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent-green-2), var(--accent-green-1))",
            borderRadius: "var(--radius-pill)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      )}
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
  const totalCo2Emitted = data?.total_co2_emitted_kg ?? 0;
  const totalVolunteers = data?.total_volunteers ?? 0;
  const totalSubmissions = data?.total_submissions ?? 0;
  const totalCo2Historic = data?.total_co2_historic_kg ?? 0;
  const treesPlanted = data?.trees?.planted ?? 0;
  const treesNeeded  = data?.trees?.needed_total ?? 0;
  const allPlanted   = treesNeeded > 0 && treesPlanted >= treesNeeded;

  // Filtro eventi: si mostra un evento che ha misurato qualcosa, in una delle
  // tre grandezze. Con il solo risparmio restavano fuori gli eventi in modo
  // `emits`, che misurano l'impronta: Wear The Future spariva dalla pagina pur
  // avendo 682 km e cinque contributi. Restano fuori gli eventi davvero a zero,
  // come La Social Pedaleda, che non ha avuto partecipanti.
  const events = (data?.by_event ?? []).filter(
    (e) => (e.co2_saved_kg ?? 0) > 0 || (e.co2_emitted_kg ?? 0) > 0 || (e.co2_historic_kg ?? 0) > 0
  );
  const anyHistoric = events.some((e) => e.historic);

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
                CO₂ evitata misurabile. Qui teniamo traccia di quanto abbiamo fatto insieme,
                e della CO₂ che gli spostamenti verso gli eventi hanno comunque emesso.
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
                {totalCo2Emitted > 0 && (
                  <HeroCounter
                    label="CO₂ emessa per raggiungere gli eventi"
                    value={fmt(totalCo2Emitted)}
                    unit="kg"
                  />
                )}
                <HeroCounter
                  label="Volontari attivi"
                  value={fmtInt(totalVolunteers)}
                />
                <HeroCounter
                  label="Azioni completate"
                  value={fmtInt(totalSubmissions)}
                />
              </div>
              {/* Il dato storico sta fuori dal risparmio: la stessa CO2 non vale
                  «risparmiata» qui e «da assorbire» nella sezione alberi. */}
              {totalCo2Historic > 0 && (
                <div style={{ fontSize: "0.85rem", opacity: 0.6, marginTop: 14, color: "#ffffff" }}>
                  Dato storico (risparmio e impronta non separati): {fmt(totalCo2Historic)} kg
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 2: ALBERI — fabbisogno per assorbire la CO2 emessa
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
                Alberi e CO₂ emessa
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
                Quanti alberi servono per assorbire la CO₂ emessa
              </h2>
              <p style={{ opacity: 0.6, marginBottom: 32, maxWidth: 560, color: "#ffffff", lineHeight: 1.6 }}>
                Per prima cosa evitiamo di emettere: la CO₂ che non emettiamo non ha bisogno
                di alberi che la assorbano. Per quella emessa dagli spostamenti verso gli eventi usiamo come
                misura l'albero adulto: quanti ne servirebbero per assorbirla in un anno. Gli
                alberi che contiamo come piantati sono giovani piante da vivaio, che arrivano a
                quell'assorbimento crescendo. Piantare un albero non cancella un'emissione: la
                riassorbe nel tempo.
              </p>

              {/* Fabbisogno + barra: misura la piantumazione, non dichiara
                  neutralità né promette un obiettivo (frase 5). */}
              {treesNeeded > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 40,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: 32,
                  }}
                >
                  <div style={{ flex: "1 1 280px", fontSize: "1.05rem", lineHeight: 1.5, color: "#ffffff" }}>
                    {allPlanted ? (
                      <>
                        Piantati tutti gli alberi del fabbisogno. La CO₂ emessa resta quella
                        misurata: gli alberi la riassorbono crescendo.
                      </>
                    ) : (
                      <>
                        Alberi piantati:{" "}
                        <strong style={{ fontSize: "1.6em", color: "rgb(74,222,128)" }}>{fmtInt(treesPlanted)}</strong>{" "}
                        su <strong style={{ fontSize: "1.6em" }}>{fmtInt(treesNeeded)}</strong>{" "}
                        che servono ad assorbire in un anno la CO₂ emessa
                      </>
                    )}
                  </div>
                  <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                    <ProgressBar current={treesPlanted} total={treesNeeded} />
                  </div>
                </div>
              )}

              {/* CO2 emessa vera, dalla somma delle righe: mai alberi × fattore (frase 6) */}
              {(totalCo2Emitted > 0 || totalCo2Historic > 0) && (
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
                  <span>
                    CO₂ emessa misurata: <strong>{fmt(totalCo2Emitted + totalCo2Historic)} kg</strong>
                    {totalCo2Historic > 0 && <>, di cui {fmt(totalCo2Historic)} kg da dati storici non separabili</>}
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
                <p
                  style={{
                    marginTop: 12,
                    fontSize: "0.82rem",
                    opacity: 0.55,
                    color: "#ffffff",
                  }}
                >
                  Un albero appena piantato assorbe poca CO₂ e cresce per decenni: adottarlo
                  è un contributo, non uno sconto sulle emissioni.
                </p>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SEZIONE 3: CO2 PER EVENTO
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
                  CO₂ per evento
                </h2>

                <div className="grid-cards">
                  {events.map((event) => (
                    <EventCo2Card key={event.event_id} event={event} />
                  ))}
                </div>

                {/* Legenda: solo il chip che non si spiega da sé */}
                {anyHistoric && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                    <span className="chip chip-warning" style={{ fontSize: "0.72rem" }}>Dato storico</span>
                    <span style={{ fontSize: "0.78rem", opacity: 0.5, color: "#ffffff" }}>
                      Raccolto prima che distinguessimo la CO₂ risparmiata da quella emessa
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Stato vuoto: nessun evento con CO₂ > 0 */}
            {events.length === 0 && (
              <div className="callout neutral" style={{ marginBottom: 56 }}>
                Nessun evento con dati di CO₂ disponibili al momento.
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
                Vuoi piantare un albero con noi?
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
                Ti diciamo dove e quando prima di confermare l'adozione, e lo contiamo qui
                tra quelli piantati.
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
