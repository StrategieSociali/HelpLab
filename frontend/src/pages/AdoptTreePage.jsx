// src/pages/AdoptTreePage.jsx
/**
 * AdoptTreePage.jsx
 * -----------------
 * Pagina placeholder per la funzionalità "Adotta un albero".
 *
 * STATO
 * Placeholder — la funzionalità non è ancora implementata.
 * La pagina è raggiungibile ma mostra un messaggio di "coming soon"
 * invece di un 404 secco, per non interrompere il funnel dalla ImpactPage.
 *
 * ROUTE
 * /adotta-albero
 *
 * ACCESSO
 * Pubblica — nessuna autenticazione richiesta.
 *
 * TODO
 * Sostituire il contenuto placeholder con il form di adozione reale
 * quando il backend esporrà l'endpoint dedicato.
 */

import React from "react";
import { Link } from "react-router-dom";
import { routes } from "@/routes";

export default function AdoptTreePage() {
  return (
    <section className="page-section page-text">
      <div className="container">
        <div
          style={{
            maxWidth: 560,
            margin: "80px auto",
            textAlign: "center",
          }}
        >
          {/* Icona */}
          <div style={{ fontSize: "4rem", marginBottom: 24 }}>🌳</div>

          {/* Titolo */}
          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            Adotta un albero
          </h1>

          {/* Messaggio placeholder */}
          <p
            style={{
              opacity: 0.65,
              lineHeight: 1.7,
              marginBottom: 12,
              color: "#ffffff",
            }}
          >
            Questa funzionalità è in arrivo. Stiamo lavorando per renderti possibile
            adottare un albero e contribuire direttamente alla compensazione della CO₂
            prodotta dai nostri eventi.
          </p>
          <p
            style={{
              opacity: 0.45,
              fontSize: "0.9rem",
              lineHeight: 1.6,
              marginBottom: 40,
              color: "#ffffff",
            }}
          >
            Seguici sulla roadmap del progetto per sapere quando sarà disponibile.
          </p>

          {/* Azioni */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link to={routes.impact.page} className="btn btn-primary">
              ← Torna all'impatto globale
            </Link>
            <Link to={routes.roadmap} className="btn btn-outline">
              Vedi la roadmap
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
