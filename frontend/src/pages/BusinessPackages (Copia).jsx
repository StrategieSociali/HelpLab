// src/pages/BusinessPackages.jsx
/**
 * Scopo: promuovere i pacchetti commerciali di HelpLab per imprese
 *
 * Attualmente supporta:
 * - Pacchetti commerciali
 * - Proposte sponsorizzazione
 * - CTA
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function BusinessPackages() {
  const navigate = useNavigate();

  const { t } = useTranslation("pages/businessPackages", {
    useSuspense: false,
  });

  const mailtoHref = `mailto:info@helplab.space?subject=${encodeURIComponent(
    t("mailto.subject")
  )}&body=${encodeURIComponent(t("mailto.body"))}`;

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        {/* HERO */}
        <header className="page-header">
          <h1 className="page-title">{t("hero.title")}</h1>
          <p className="page-subtitle">{t("hero.subtitle")}</p>
        </header>

        {/* PILLARS */}
        <div className="content-grid" style={{ marginBottom: 16 }}>
          <div className="benefit-card">
            <div className="benefit-icon">📊</div>
            <h3>{t("pillars.esg.title")}</h3>
            <p>{t("pillars.esg.text")}</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">🏅</div>
            <h3>{t("pillars.marketing.title")}</h3>
            <p>{t("pillars.marketing.text")}</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">🤝</div>
            <h3>{t("pillars.engagement.title")}</h3>
            <p>{t("pillars.engagement.text")}</p>
          </div>
        </div>

        {/* PLANS */}
        <div className="grid-cards" style={{ marginBottom: 16 }}>
          {/* STARTER */}
          <article className="card glass">
            <header className="card-header">
              <div className="chip">{t("plans.starter.label")}</div>
              <h3 className="card-title">{t("plans.starter.title")}</h3>
            </header>

            <ul className="meta-list">
              <li>
                <span className="meta-label">{t("plans.meta.challenge")}</span>
                <span className="meta-value">
                  {t("plans.starter.challenge")}
                </span>
              </li>
              <li>
                <span className="meta-label">{t("plans.meta.report")}</span>
                <span className="meta-value">
                  {t("plans.starter.report")}
                </span>
              </li>
              <li>
                <span className="meta-label">{t("plans.meta.support")}</span>
                <span className="meta-value">
                  {t("plans.starter.support")}
                </span>
              </li>
            </ul>

            <p className="card-description">
              {t("plans.starter.description")}
            </p>

            <div className="card-actions">
              <a className="btn btn-outline" href={mailtoHref}>
                {t("actions.requestInfo")}
              </a>
            </div>
          </article>

          {/* GROWTH */}
          <article className="card glass">
            <header className="card-header">
              <div className="chip chip-type">
                {t("plans.growth.label")}
              </div>
              <h3 className="card-title">{t("plans.growth.title")}</h3>
            </header>

            <ul className="meta-list">
              <li>
                <span className="meta-label">{t("plans.meta.challenge")}</span>
                <span className="meta-value">
                  {t("plans.growth.challenge")}
                </span>
              </li>
              <li>
                <span className="meta-label">{t("plans.meta.report")}</span>
                <span className="meta-value">
                  {t("plans.growth.report")}
                </span>
              </li>
              <li>
                <span className="meta-label">{t("plans.meta.support")}</span>
                <span className="meta-value">
                  {t("plans.growth.support")}
                </span>
              </li>
            </ul>

            <p className="card-description">
              {t("plans.growth.description")}
            </p>

            <div className="card-actions">
              <a className="btn btn-primary" href={mailtoHref}>
                {t("actions.talkToUs")}
              </a>
            </div>
          </article>

          {/* ENTERPRISE */}
          <article className="card glass">
            <header className="card-header">
              <div className="chip">{t("plans.enterprise.label")}</div>
              <h3 className="card-title">
                {t("plans.enterprise.title")}
              </h3>
            </header>

            <ul className="meta-list">
              <li>
                <span className="meta-label">{t("plans.meta.challenge")}</span>
                <span className="meta-value">
                  {t("plans.enterprise.challenge")}
                </span>
              </li>
              <li>
                <span className="meta-label">{t("plans.meta.report")}</span>
                <span className="meta-value">
                  {t("plans.enterprise.report")}
                </span>
              </li>
              <li>
                <span className="meta-label">{t("plans.meta.support")}</span>
                <span className="meta-value">
                  {t("plans.enterprise.support")}
                </span>
              </li>
            </ul>

            <p className="card-description">
              {t("plans.enterprise.description")}
            </p>

            <div className="card-actions">
              <a className="btn btn-outline" href={mailtoHref}>
                {t("actions.requestCall")}
              </a>
            </div>
          </article>
        </div>

        {/* FINAL CTA */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ marginBottom: 6 }}>
            {t("finalCta.title")}
          </h2>

          <p className="page-subtitle" style={{ marginBottom: 12 }}>
            {t("finalCta.subtitle")}
          </p>

          <div
            className="cta-row"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <a className="btn btn-primary" href={mailtoHref}>
              {t("actions.talkToUs")}
            </a>

            <button
              className="btn btn-outline"
              onClick={() => navigate("/challenges/new")}
            >
              {t("actions.launchChallenge")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

