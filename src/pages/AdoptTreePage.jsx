// src/pages/AdoptTreePage.jsx
/**
 * AdoptTreePage.jsx
 * -----------------
 * Pagina narrativa pubblica per l'adozione di alberi.
 *
 * SCOPO
 * Pagina di conversione emotiva: racconta il ciclo CO₂ → alberi,
 * presenta i tre tier di adozione e raccoglie le richieste via mailto.
 *
 * STRUTTURA
 * 1. Hero — claim + contatore alberi piantati
 * 2. Come funziona — tre passi del ciclo
 * 3. I tre tier — Un albero / Un boschetto / Una foresta
 * 4. Form di contatto — tier vincolato, mailto precompilato
 * 5. Dove mettiamo le radici — anagrafica per località (placeholder)
 * 6. Link a ImpactPage
 *
 * ENDPOINT
 * GET /v1/impact/global-summary — solo per il contatore alberi piantati.
 * Pubblico, nessun token richiesto. In caso di errore la pagina
 * funziona ugualmente senza il numero.
 *
 * PAGAMENTO
 * Attuale: mailto precompilato con tier e dati utente.
 * Futuro: sostituire handleSubmit con chiamata al sistema di pagamento.
 * Il form non cambia — solo l'handler finale.
 *
 * ROUTE
 * /adotta-albero
 *
 * ACCESSO
 * Pubblica — nessuna autenticazione richiesta.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { routes } from "@/routes";

// ─── Dati statici ─────────────────────────────────────────────────────────────

/**
 * TIER DI ADOZIONE
 * Prezzi e contenuti modificabili qui senza toccare il JSX.
 * Quando arriverà il sistema di pagamento, aggiungere il campo
 * `priceId` o equivalente per ogni tier.
 */
const TIERS = [
  {
    id: "albero",
    emoji: "🌱",
    name: "Un albero",
    price: 30,
    description:
      "Il tuo albero, in un luogo reale. Con il tuo nome o quello di chi vuoi omaggiare. Riceverai foto e aggiornamenti sulla sua crescita.",
    includes: [
      "1 albero piantato in un'area pubblica",
      "Il tuo nome associato all'albero",
      "Foto della piantumazione",
      "Aggiornamenti periodici",
    ],
    cta: "Adotta il tuo albero",
    highlight: false,
  },
  {
    id: "boschetto",
    emoji: "🌳",
    name: "Un boschetto",
    price: 120,
    description:
      "Cinque alberi in un unico luogo. Perfetto per gruppi, famiglie, associazioni che vogliono lasciare un segno visibile e duraturo.",
    includes: [
      "5 alberi piantati nello stesso sito",
      "Nome del gruppo visibile sulla mappa",
      "Foto e report della piantumazione",
      "Aggiornamenti periodici",
    ],
    cta: "Adotta il boschetto",
    highlight: true, // tier evidenziato visivamente
  },
  {
    id: "foresta",
    emoji: "🏢",
    name: "Una foresta",
    price: 300,
    description:
      "Per le imprese che vogliono fare la propria parte in modo concreto e documentato. Dati ESG verificabili, logo visibile, impatto reale.",
    includes: [
      "15 alberi piantati",
      "Logo aziendale sulla pagina pubblica",
      "Certificato di compensazione CO₂",
      "Report ESG con dati auditabili",
      "Aggiornamenti periodici",
    ],
    cta: "Contattaci per la tua impresa",
    highlight: false,
  },
];

/**
 * LUOGHI DI PIANTUMAZIONE
 * Dati placeholder — sostituire con dati reali prima del go-live.
 * TODO: quando il backend esporrà GET /v1/trees, sostituire
 * questo array statico con una fetch dinamica.
 */
const LOCATIONS = [
  {
    id: 1,
    city: "Bologna",
    area: "Giardini Margherita",
    type: "Parco pubblico",
    trees: 5,
    date: "Marzo 2025",
    sponsor: null,
  },
  {
    id: 2,
    city: "Rimini",
    area: "Scuola primaria G. Rodari",
    type: "Area scolastica",
    trees: 3,
    date: "Aprile 2025",
    sponsor: "Legambiente Rimini",
  },
  {
    id: 3,
    city: "Ferrara",
    area: "Parco Massari",
    type: "Parco pubblico",
    trees: 4,
    date: "Maggio 2025",
    sponsor: null,
  },
];

// ─── Sotto-componenti ─────────────────────────────────────────────────────────

/**
 * StepCard
 * Un passo del ciclo "come funziona".
 */
function StepCard({ number, title, text }) {
  return (
    <div
      style={{
        flex: "1 1 220px",
        padding: "28px 24px",
        borderRadius: "var(--radius-lg)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(74,222,128,0.15)",
          border: "1px solid rgba(74,222,128,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.85rem",
          fontWeight: 800,
          color: "rgb(74,222,128)",
          marginBottom: 16,
        }}
        aria-hidden="true"
      >
        {number}
      </div>
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.88rem",
          lineHeight: 1.65,
          opacity: 0.6,
          color: "#ffffff",
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * TierCard
 * Card di un tier di adozione — si comporta come un radio button.
 * highlight=true → bordo verde tenue e badge "PIÙ SCELTO".
 */
function TierCard({ tier, selected, onSelect }) {
  const isSelected = selected === tier.id;

  return (
    <div
      onClick={() => onSelect(tier.id)}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(tier.id);
      }}
      style={{
        flex: "1 1 260px",
        padding: "28px 24px",
        borderRadius: "var(--radius-lg)",
        background: isSelected
          ? "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%)"
          : tier.highlight
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.04)",
        border: isSelected
          ? "2px solid rgba(74,222,128,0.70)"
          : tier.highlight
          ? "1px solid rgba(74,222,128,0.30)"
          : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s",
        position: "relative",
      }}
    >
      {/* Badge "più scelto" — solo sul tier highlight */}
      {tier.highlight && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgb(74,222,128)",
            color: "#0a1628",
            fontSize: "0.72rem",
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: "var(--radius-pill)",
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}
        >
          PIÙ SCELTO
        </div>
      )}

      <div style={{ fontSize: "2rem", marginBottom: 8 }} aria-hidden="true">
        {tier.emoji}
      </div>

      <h3
        style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          color: "#ffffff",
          marginBottom: 4,
        }}
      >
        {tier.name}
      </h3>

      {/* Prezzo */}
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 800,
          color: "rgb(74,222,128)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        {tier.price}€
      </div>

      <p
        style={{
          fontSize: "0.87rem",
          lineHeight: 1.6,
          opacity: 0.65,
          color: "#ffffff",
          marginBottom: 20,
        }}
      >
        {tier.description}
      </p>

      {/* Lista inclusioni */}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {tier.includes.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: "0.82rem",
              color: "#ffffff",
              opacity: 0.7,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <span style={{ color: "rgb(74,222,128)", flexShrink: 0, marginTop: 1 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>

      {/* Indicatore selezione attiva */}
      {isSelected && (
        <div
          style={{
            marginTop: 20,
            fontSize: "0.82rem",
            color: "rgb(74,222,128)",
            fontWeight: 700,
            textAlign: "center",
          }}
          aria-live="polite"
        >
          ✓ Selezionato
        </div>
      )}
    </div>
  );
}

/**
 * LocationRow
 * Riga singola dell'anagrafica per località.
 */
function LocationRow({ location }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "1.4rem", flexShrink: 0 }} aria-hidden="true">
        {location.type === "Area scolastica" ? "🏫" : "🌳"}
      </span>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.95rem" }}>
          {location.city} — {location.area}
        </div>
        <div style={{ fontSize: "0.78rem", opacity: 0.5, color: "#ffffff", marginTop: 2 }}>
          {location.type} · {location.date}
          {location.sponsor && (
            <span style={{ marginLeft: 8, color: "rgb(74,222,128)" }}>
              con {location.sponsor}
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            color: "rgb(74,222,128)",
            lineHeight: 1,
          }}
        >
          {location.trees}
        </div>
        <div style={{ fontSize: "0.72rem", opacity: 0.5, color: "#ffffff" }}>
          {location.trees === 1 ? "albero" : "alberi"}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function AdoptTreePage() {
  // ── Contatori alberi dall'API ─────────────────────────────────────────────
  // Entrambi i valori dalla stessa chiamata — zero overhead aggiuntivo.
  // In caso di errore la pagina regge ugualmente senza i numeri.
  const [treesPlanted, setTreesPlanted] = useState(null);
  const [treesPending, setTreesPending] = useState(null);

  useEffect(() => {
    api
      .get("/v1/impact/global-summary")
      .then(({ data }) => {
        setTreesPlanted(data?.compensation?.trees_planted ?? null);
        setTreesPending(data?.compensation?.trees_pending ?? null);
      })
      .catch(() => {
        setTreesPlanted(null);
        setTreesPending(null);
      });
  }, []);

  // ── Stato form ────────────────────────────────────────────────────────────
  const [selectedTier, setSelectedTier] = useState("boschetto"); // default sul tier evidenziato
  const [formData, setFormData]         = useState({ name: "", email: "" });
  const [formError, setFormError]       = useState("");

  const handleFieldChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  /**
   * handleSubmit
   * Valida i campi e apre il client email con i dati precompilati.
   *
   * FUTURO: sostituire window.location.href con la chiamata al sistema
   * di pagamento mantenendo invariata la logica di validazione.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError("Inserisci il tuo nome o il nome dell'ente.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setFormError("Inserisci un indirizzo email valido.");
      return;
    }
    if (!selectedTier) {
      setFormError("Seleziona un tier di adozione.");
      return;
    }

    const tier    = TIERS.find((t) => t.id === selectedTier);
    const subject = encodeURIComponent(
      `Adozione alberi HelpLab — ${tier.name} (${tier.price}€)`
    );
    const body = encodeURIComponent(
      `Ciao,\n\nVorrei adottare: ${tier.name} (${tier.price}€)\n\nNome / Ente: ${formData.name}\nEmail: ${formData.email}\n\nAttendo istruzioni per completare l'adozione.\n\nGrazie!`
    );

    // Apre il client email con i dati precompilati.
    // TODO: sostituire con redirect al sistema di pagamento.
    window.location.href = `mailto:richieste@helplab.space?subject=${subject}&body=${body}`;
  };

  // Helper per leggere il tier selezionato in modo pulito
  const activeTier = TIERS.find((t) => t.id === selectedTier);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text">
      <div className="container">

        {/* ══════════════════════════════════════════════════════════════════
            SEZIONE 1: HERO
        ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            textAlign: "center",
            padding: "64px 24px 72px",
            maxWidth: 680,
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2.4rem, 7vw, 4.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#ffffff",
              marginBottom: 24,
            }}
          >
            Ciò che non brucia,
            <br />
            <span style={{ color: "rgb(74,222,128)" }}>germoglia.</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
              lineHeight: 1.75,
              opacity: 0.7,
              color: "#ffffff",
              maxWidth: 520,
              margin: "0 auto 40px",
            }}
          >
            I volontari di HelpLab pedalano, camminano, agiscono.
            Noi misuriamo ogni kg di CO₂ che non finisce nell'aria.
            E poi lo trasformiamo in alberi veri, in luoghi reali,
            con il tuo nome sopra.
          </p>

          {/* Due card affiancate — visibili solo se l'API risponde.
              Sinistra: alberi già piantati (verde — fatto).
              Destra:   alberi che puoi adottare (ambra — aperto, urgente).
              Il contrasto cromatico racconta lo stato senza una parola. */}
          {(treesPlanted !== null || treesPending !== null) && (
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 40,
              }}
            >
              {/* Card sinistra — alberi già in terra */}
              {treesPlanted !== null && (
                <div
                  style={{
                    flex: "1 1 200px",
                    maxWidth: 260,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "28px 32px",
                    borderRadius: "var(--radius-lg)",
                    background:
                      "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%)",
                    border: "1px solid rgba(74,222,128,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(2.8rem, 8vw, 4.8rem)",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "rgb(74,222,128)",
                    }}
                  >
                    {treesPlanted}
                    <span style={{ fontSize: "0.35em", marginLeft: 6, opacity: 0.7 }}>🌳</span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      opacity: 0.6,
                      marginTop: 10,
                      color: "#ffffff",
                    }}
                  >
                    Alberi già in terra
                  </div>
                </div>
              )}

              {/* Card destra — alberi che puoi adottare (urgenza, invito all'azione) */}
              {treesPending !== null && (
                <div
                  style={{
                    flex: "1 1 200px",
                    maxWidth: 260,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "28px 32px",
                    borderRadius: "var(--radius-lg)",
                    background:
                      "linear-gradient(135deg, rgba(217,119,6,0.18) 0%, rgba(180,83,9,0.10) 100%)",
                    border: "1px solid rgba(251,191,36,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(2.8rem, 8vw, 4.8rem)",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "rgb(251,191,36)",
                    }}
                  >
                    {treesPending}
                    <span style={{ fontSize: "0.35em", marginLeft: 6, opacity: 0.7 }}>🌱</span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      opacity: 0.6,
                      marginTop: 10,
                      color: "#ffffff",
                    }}
                  >
                    Alberi che puoi adottare
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <a
              href="#adotta"
              className="btn btn-primary btn-large"
              style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
            >
              🌱 Adotta il tuo albero
            </a>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SEZIONE 2: COME FUNZIONA
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 72 }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              opacity: 0.45,
              marginBottom: 8,
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            Come funziona
          </div>
          <h2
            style={{
              fontSize: "clamp(1.3rem, 3vw, 1.8rem)",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 32,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            Dal gesto all'albero, in tre passi
          </h2>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StepCard
              number="1"
              title="I volontari agiscono"
              text="Ogni biciclettata, ogni percorso a piedi, ogni azione sostenibile viene documentata e verificata da giudici indipendenti. Nessuna stima: dati reali."
            />
            <StepCard
              number="2"
              title="Noi calcoliamo la CO₂"
              text="Per ogni azione approvata calcoliamo la CO₂ evitata usando parametri ufficiali aggiornati. Poi stabiliamo quanti alberi servono per compensarla completamente."
            />
            <StepCard
              number="3"
              title="Tu pianti l'albero"
              text="Adottando un albero contribuisci a chiudere il cerchio. Il tuo albero viene piantato in un'area pubblica reale. Ricevi foto, luogo e aggiornamenti sulla sua crescita."
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SEZIONE 3 + 4: TIER + FORM
            Fisicamente unite: il form reagisce alla selezione del tier.
        ══════════════════════════════════════════════════════════════════ */}
        <div id="adotta" style={{ marginBottom: 72, scrollMarginTop: 80 }}>
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
            Scegli la tua parte
          </div>
          <h2
            style={{
              fontSize: "clamp(1.3rem, 3vw, 1.8rem)",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Quanto vuoi piantare?
          </h2>
          <p style={{ opacity: 0.55, marginBottom: 40, color: "#ffffff", maxWidth: 520 }}>
            Clicca sul livello che fa per te. Puoi cambiare idea prima di inviare la richiesta.
          </p>

          {/* Tier cards — radio group accessibile */}
          <div
            role="radiogroup"
            aria-label="Scegli il tier di adozione"
            style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 48 }}
          >
            {TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier}
                onSelect={setSelectedTier}
              />
            ))}
          </div>

          {/* Form */}
          <div
            style={{
              maxWidth: 520,
              padding: "36px 32px",
              borderRadius: "var(--radius-lg)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {/* Riepilogo tier selezionato */}
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: 4,
              }}
            >
              {activeTier
                ? `${activeTier.emoji} ${activeTier.name} — ${activeTier.price}€`
                : "Completa la richiesta"}
            </h3>
            <p style={{ fontSize: "0.85rem", opacity: 0.55, marginBottom: 24, color: "#ffffff" }}>
              Ti risponderemo entro 48 ore con tutti i dettagli per completare l'adozione.
            </p>

            {/* Campo nome */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="adopt-name"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  marginBottom: 6,
                  opacity: 0.8,
                }}
              >
                Nome o nome dell'ente *
              </label>
              <input
                id="adopt-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFieldChange}
                placeholder="Mario Rossi / Associazione Verde"
                autoComplete="name"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Campo email */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="adopt-email"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  marginBottom: 6,
                  opacity: 0.8,
                }}
              >
                Email *
              </label>
              <input
                id="adopt-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFieldChange}
                placeholder="mario@esempio.it"
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Errore validazione */}
            {formError && (
              <div
                className="callout error"
                role="alert"
                style={{ marginBottom: 16, fontSize: "0.87rem" }}
              >
                {formError}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              style={{ width: "100%", fontSize: "1rem", padding: "14px" }}
            >
              {activeTier?.cta ?? "Invia richiesta"}
            </button>

            {/* Nota privacy */}
            <p
              style={{
                fontSize: "0.75rem",
                opacity: 0.4,
                marginTop: 12,
                color: "#ffffff",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              I tuoi dati vengono usati solo per risponderti.{" "}
              <Link to={routes.privacy} style={{ color: "inherit", textDecoration: "underline" }}>
                Privacy policy
              </Link>
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SEZIONE 5: DOVE METTIAMO LE RADICI
            Anagrafica per località — struttura definitiva, dati placeholder.
            TODO: sostituire LOCATIONS con fetch da GET /v1/trees
            quando il backend esporrà l'endpoint individuale degli alberi.
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 72 }}>
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
            Le nostre piantumazioni
          </div>
          <h2
            style={{
              fontSize: "clamp(1.3rem, 3vw, 1.8rem)",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Dove mettiamo le radici
          </h2>
          <p style={{ opacity: 0.55, marginBottom: 32, color: "#ffffff", maxWidth: 520 }}>
            Ogni albero ha un indirizzo. Ecco dove sono quelli già in terra.
          </p>

          <div className="card" style={{ padding: "8px 24px" }}>
            {LOCATIONS.map((loc) => (
              <LocationRow key={loc.id} location={loc} />
            ))}
          </div>

          <p
            style={{
              fontSize: "0.78rem",
              opacity: 0.35,
              marginTop: 12,
              color: "#ffffff",
              fontStyle: "italic",
            }}
          >
            * I dati vengono aggiornati con ogni nuova piantumazione.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SEZIONE 6: LINK A IMPACTPAGE
        ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 48,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
              Vuoi vedere quanto abbiamo fatto insieme?
            </div>
            <div style={{ fontSize: "0.88rem", opacity: 0.55, color: "#ffffff" }}>
              CO₂ risparmiata, eventi, volontari attivi: tutti i numeri in un posto solo.
            </div>
          </div>
          <Link
            to={routes.impact.page}
            className="btn btn-outline"
            style={{ flexShrink: 0 }}
          >
            Vedi l'impatto globale →
          </Link>
        </div>

      </div>
    </section>
  );
}
