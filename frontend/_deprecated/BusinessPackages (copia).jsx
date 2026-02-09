// /src/pages/BusinessPackages.jsx
/**
 * Scopo: presentare le modalità di collaborazione con HelpLab
 *
 * Principi:
 * - nessun listino rigido
 * - piattaforma open source
 * - sponsorship, reportistica e supporto progettuale
 * - CTA soft e istituzionale
 */

import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function BusinessPackages () {
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

        {/* ================= HERO ================= */}
        <header className="page-header">
          <h1 className="page-title">{t("hero.title")}</h1>
          <p className="page-subtitle" style={{ maxWidth: 720 }}>
            {t("hero.subtitle")}
          </p>
        </header>

        {/* ================= INTRO ================= */}
        <div className="card" style={{ marginBottom: 32 }}>
          <p className="page-text-block">
            {t("intro.paragraph1")}
          </p>
          <p className="page-text-block">
            {t("intro.paragraph2")}
          </p>
        </div>

        {/* ================= MODALITÀ ================= */}
        <h2 className="page-title" style={{ marginBottom: 16 }}>
          {t("modes.title")}
        </h2>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          {t("modes.subtitle")}
        </p>

        <div className="content-grid" style={{ marginBottom: 40 }}>
          {t("modes.items", { returnObjects: true, defaultValue: [] }).map(
            (item, i) => (
              <div className="benefit-card" key={i}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            )
          )}
        </div>

        {/* ================= CTA ================= */}
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>
            {t("cta.title")}
          </h2>
          <p className="page-subtitle" style={{ marginBottom: 16 }}>
            {t("cta.subtitle")}
          </p>

          <div
            className="cta-row"
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a className="btn btn-primary" href={mailtoHref}>
              {t("actions.requestDiscussion")}
            </a>

            <Link to="/sponsors" className="btn btn-outline">
              {t("actions.viewSponsors")}
            </Link>

            <button
              className="btn btn-outline"
              onClick={() => navigate("/challenges")}
            >
              {t("actions.exploreChallenges")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

