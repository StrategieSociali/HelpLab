//src/pages/roadmap.jsx
/**
 * Scopo: mantenere un'informazione aggiornata per gli sviluppatori e aggregare una community
 *
 * Attualmente supporta:
 * - Attività in cantiere
 * - Roadmap storica
 * - CTA
 * - Tasto login/registrati/logout
*/
import React from "react";
import { useNavigate } from "react-router-dom";
import { APP_VERSION } from "@/config/constants";
import { useTranslation } from "react-i18next";
import "./../styles/roadmap.css"; // ← IMPORT CSS DEDICATO

export default function Roadmap() {
  const navigate = useNavigate();
  
  const { t } = useTranslation("pages/roadmap", {
    useSuspense: false,
  });

  const mailtoHref = `mailto:info@helplab.space?subject=${encodeURIComponent(
    "Vorrei maggiori informazioni sulle proposte di HelpLab"
  )}&body=${encodeURIComponent(
    "Descrivi brevemente la tua organizzazione o il tuo interesse nel progetto."
  )}`;

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        {/* HEADER */}
        <header className="roadmap-header">
          <h1 className="roadmap-title">
            {t("header.title")}
          </h1>
          <p className="roadmap-subtitle">
            {t("header.version", { version: APP_VERSION })}
          </p>
          <p className="roadmap-subtitle">
            {t("header.openSource")}
          </p>
        </header>

        {/* =========================
            IN CANTIERE (SEZIONE VIVA) - Community Requests
            ========================= */}
        <div className="roadmap-grid roadmap-grid--featured">
          <div className="roadmap-card roadmap-card--featured">
            <h3 className="roadmap-card__title">
              {t("workInProgress.features.title")}
            </h3>
            <hr className="roadmap-card__divider" />
            <div className="roadmap-card__content">
              {t("workInProgress.features.items", {
                returnObjects: true,
                defaultValue: [],
              }).map((item, i) => (
                <p className="roadmap-card__item" key={i}>{item}</p>
              ))}
            </div>
          </div>

          <div className="roadmap-card roadmap-card--featured">
            <h3 className="roadmap-card__title">
              {t("workInProgress.improvements.title")}
            </h3>
            <hr className="roadmap-card__divider" />
            <div className="roadmap-card__content">
              {t("workInProgress.improvements.items", {
                returnObjects: true,
                defaultValue: [],
              }).map((item, i) => (
                <p className="roadmap-card__item" key={i}>{item}</p>
              ))}
            </div>
          </div>

          <div className="roadmap-card roadmap-card--featured">
            <h3 className="roadmap-card__title">
              {t("workInProgress.bugfixes.title")}
            </h3>
            <hr className="roadmap-card__divider" />
            <div className="roadmap-card__content">
              {t("workInProgress.bugfixes.items", {
                returnObjects: true,
                defaultValue: [],
              }).map((item, i) => (
                <p className="roadmap-card__item" key={i}>{item}</p>
              ))}
            </div>
          </div>
        </div>

        {/* =========================
            ROADMAP (FUTURO → PASSATO) - Piano consolidato
            ========================= */}
        <div className="roadmap-grid roadmap-grid--timeline">
          {t("roadmap", {
            returnObjects: true,
            defaultValue: [],
          }).map((item, i) => (
            <div className="roadmap-card" key={i}>
              <h3 className="roadmap-card__title">{item.title}</h3>
              <p className="roadmap-card__description">{item.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="roadmap-cta">
          <h2 className="roadmap-cta__title">{t("cta.title")}</h2>
          <p className="roadmap-cta__subtitle">{t("cta.subtitle")}</p>
          <div className="roadmap-cta__actions">
            <a className="btn btn-primary" href={mailtoHref}>
              {t("cta.contact")}
            </a>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/challenges")}
            >
              {t("cta.explore")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
