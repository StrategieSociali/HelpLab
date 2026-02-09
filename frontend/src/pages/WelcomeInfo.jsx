// src/pages/WelcomeInfo.jsx
/**
 * Scopo: presentare all'utente appena registrato o al visitatore le opportunità di HelpLab
 *
 * Attualmente ci sono contenuti per:
 * - Informare l'utente appena registrato sulle possibilità offerte dalla piattaforma
 * - Guidarlo nella scelta del suo ruolo o attività preferita
 * - Stimolare l'interazione con sfide, community, e percorsi formativi
 * - Stili dedicati e namespaced (.welcome-*)
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "../styles/welcomeinfo.css";

export default function WelcomeInfo() {
  const { t } = useTranslation("pages/welcome", {
    useSuspense: false,
  });

  const sections = [
    { key: "path", icon: t("sections.path.icon") },
    { key: "challenges", icon: t("sections.challenges.icon") },
    { key: "judge", icon: t("sections.judge.icon") },
    { key: "sponsor", icon: t("sections.sponsor.icon") },
    { key: "learning", icon: t("sections.learning.icon") },
    { key: "community", icon: t("sections.community.icon") },
  ];

  return (
    <section className="page-section page-text">
      <div className="container">
        {/* HEADER */}
        <header className="welcome-header">
          <h1 className="welcome-title">{t("hero.title")}</h1>
          <p className="welcome-subtitle">{t("hero.subtitle")}</p>
        </header>

        {/* GRID OPPORTUNITÀ */}
        <div className="welcome-grid">
          {sections.map((section, i) => (
            <div className="welcome-card" key={i}>
              <h2 className="welcome-card__title">
                <span className="welcome-card__icon">{section.icon}</span>
                <span>{t(`sections.${section.key}.title`)}</span>
              </h2>
              <h3 className="welcome-card__subtitle">
                {t(`sections.${section.key}.subtitle`)}
              </h3>
              <p className="welcome-card__text">
                {t(`sections.${section.key}.text`)}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="welcome-cta">
          <h3 className="welcome-cta__title">{t("cta.title")}</h3>
          <p className="welcome-cta__subtitle">{t("cta.subtitle")}</p>
          <div className="welcome-cta__actions">
            <Link to="/dashboard/profile" className="btn btn-primary btn-pill">
              {t("cta.profile")}
            </Link>
            <Link to="/challenges" className="btn btn-outline btn-pill">
              {t("cta.challenges")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
