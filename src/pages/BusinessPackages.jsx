// /src/pages/BusinessPackages.jsx
/**
 * Scopo: presentare le modalità di collaborazione con HelpLab
 *
 * Principi:
 * - Gerarchia visiva chiara (featured vs standard services)
 * - Orientato al valore per l'azienda
 * - CTA soft e istituzionale
 * - Stili dedicati e namespaced (.business-*)
 */

import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./../styles/businesspackages.css";

export default function BusinessPackages() {
  const navigate = useNavigate();

  const { t } = useTranslation("pages/businessPackages", {
    useSuspense: false,
  });

  const mailtoHref = `mailto:info@helplab.space?subject=${encodeURIComponent(
    "Richiesta consulenza HelpLab per la nostra azienda"
  )}&body=${encodeURIComponent(
    "Salve, siamo interessati a esplorare come HelpLab può supportare la strategia ESG della nostra azienda.\n\nNome azienda:\nSettore:\nNumero dipendenti:\n\nGrazie"
  )}`;

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        {/* ================= HERO ================= */}
        <header className="business-header">
          <h1 className="business-title">Collabora con HelpLab</h1>
          <p className="business-subtitle">
            Trasforma l'impegno sociale della tua azienda in impatto misurabile e rendicontabile
          </p>
        </header>

        {/* ================= SERVIZI PRINCIPALI (Featured) ================= */}
        <div className="business-grid business-grid--featured">
          {/* Card 1: Accesso Libero */}
          <div className="business-card business-card--featured">
            <div className="business-card__icon">🆓</div>
            <h3 className="business-card__title">Accesso Libero</h3>
            <hr className="business-card__divider" />
            <div className="business-card__content">
              <p className="business-card__item">Piattaforma open source</p>
              <p className="business-card__item">Nessun costo di licenza</p>
              <p className="business-card__item">Ideale per testare la piattaforma</p>
              <p className="business-card__item">Accesso completo alle funzionalità base</p>
            </div>
          </div>

          {/* Card 2: Sponsorizzazione Sfide */}
          <div className="business-card business-card--featured">
            <div className="business-card__icon">🎯</div>
            <h3 className="business-card__title">Sponsorizzazione Sfide</h3>
            <hr className="business-card__divider" />
            <div className="business-card__content">
              <p className="business-card__item">Scegli le sfide da finanziare</p>
              <p className="business-card__item">Visibilità del brand su challenge specifiche</p>
              <p className="business-card__item">Report di impatto base incluso</p>
              <p className="business-card__item">Detraibilità fiscale delle donazioni</p>
            </div>
          </div>

          {/* Card 3: Reportistica ESG */}
          <div className="business-card business-card--featured">
            <div className="business-card__icon">📊</div>
            <h3 className="business-card__title">Reportistica Socioambientale</h3>
            <hr className="business-card__divider" />
            <div className="business-card__content">
              <p className="business-card__item">Report conformi CSRD/ESRS</p>
              <p className="business-card__item">Calcolo SROI (Social Return on Investment)</p>
              <p className="business-card__item">Analisi predittive con Machine Learning</p>
              <p className="business-card__item">Supporto per bilanci di sostenibilità</p>
            </div>
          </div>
        </div>

        {/* ================= ALTRI SERVIZI (Standard) ================= */}
        <div className="business-grid business-grid--services">
          {/* Card 4: White Label */}
          <div className="business-card">
            <div className="business-card__icon">🏢</div>
            <h3 className="business-card__title">White Label & API</h3>
            <div className="business-card__content">
              <p className="business-card__item">Piattaforma brandizzata con i tuoi colori</p>
              <p className="business-card__item">API dedicate per integrazione ERP</p>
              <p className="business-card__item">Dashboard personalizzata</p>
              <p className="business-card__item">Supporto tecnico prioritario</p>
            </div>
          </div>

          {/* Card 5: Formazione */}
          <div className="business-card">
            <div className="business-card__icon">🎓</div>
            <h3 className="business-card__title">Formazione & Onboarding</h3>
            <div className="business-card__content">
              <p className="business-card__item">Corsi dedicati per i tuoi team</p>
              <p className="business-card__item">Volontariato aziendale strutturato</p>
              <p className="business-card__item">Certificazioni per i dipendenti</p>
              <p className="business-card__item">Webinar e workshop su misura</p>
            </div>
          </div>

          {/* Card 6: Consulenza */}
          <div className="business-card">
            <div className="business-card__icon">🤝</div>
            <h3 className="business-card__title">Consulenza Strategica</h3>
            <div className="business-card__content">
              <p className="business-card__item">Piano ESG personalizzato</p>
              <p className="business-card__item">Supporto conformità normativa</p>
              <p className="business-card__item">Strategia di comunicazione impatto</p>
              <p className="business-card__item">Networking con altre aziende partner</p>
            </div>
          </div>
        </div>

        {/* ================= CTA ================= */}
        <div className="business-cta">
          <h2 className="business-cta__title">Pronto a fare la differenza?</h2>
          <p className="business-cta__subtitle">
            Parliamo di come HelpLab può supportare la strategia ESG della tua azienda
          </p>
          <div className="business-cta__actions">
            <a className="btn btn-primary" href={mailtoHref}>
              Richiedi una consulenza
            </a>
            <Link to="/sponsors" className="btn btn-outline">
              Esplora gli sponsor attivi
            </Link>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/challenges")}
            >
              Scopri le sfide
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
