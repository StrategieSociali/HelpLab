// src/pages/HomepageStatic.jsx
/**
 * Scopo: accogliere l'utente (landing page principale)
 *
 * Attualmente contiene:
 * - HERO Business/PA
 * - Benefici imprese (3 pilastri)
 * - Testimonianze
 * - HERO Cittadini
 * - CTA finale imprese
 * - Come funziona
 * - Tabella membership
 *
 * Note: Mantiene classi globali (.hero-section, .community-section, etc.)
 *       Stili specifici home in home.css
 */

import React from 'react';
import { useNavigate } from "react-router-dom";
import { Wrench, Gift, Users } from "lucide-react";
import heroBg from '@/assets/sustainability-hero.jpg';
import { useTranslation } from "react-i18next";
import "../styles/home.css";

const HomepageStatic = () => {
  const { t } = useTranslation("pages/home", {
    useSuspense: false,
  });

  const navigate = useNavigate();
  
  const businessBenefitsItems = t("businessBenefits.items", {
    returnObjects: true,
    defaultValue: [],
  });

  const howItWorksSteps = t("howItWorks.steps", {
    returnObjects: true,
    defaultValue: [],
  });

  const testimonialItems = t("testimonials.items", {
    returnObjects: true,
    defaultValue: [],
  });

  const membershipPlans = t("membership.plans", {
    returnObjects: true,
    defaultValue: [],
  });

  const membershipFeatures = t("membership.features", {
    returnObjects: true,
    defaultValue: [],
  });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          1) HERO BUSINESS/PA
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="hero-section home-hero-business"
        style={{
          backgroundImage: `url(${heroBg})`,
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1>{t("hero.title")}</h1>
            <p className="home-hero__subtitle">
              {t("hero.subtitle")}
            </p>
            <p className="home-hero__note">
              <strong>{t("hero.note.label")}</strong> {t("hero.note.text")}
            </p>

            <div className="home-hero__actions">
              <button
                className="btn btn-outline"
                onClick={() => navigate('/challenges')}
                title={t("hero.cta.launchTitle")}
              >
                {t("hero.cta.launch")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/challenges')}
                title={t("hero.cta.joinTitle")}
              >
                {t("hero.cta.join")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2) BUSINESS BENEFITS (3 Pilastri)
          ═══════════════════════════════════════════════════════════ */}
      <section className="community-section">
        <div className="community-bg"></div>
        <div className="container">
          <h2>{t("businessBenefits.title")}</h2>

          <div className="home-grid home-grid--benefits">
            {Array.isArray(businessBenefitsItems) &&
              businessBenefitsItems.map((item, i) => (
                <div className="benefit-card" key={i}>
                  <h3>{item.title}</h3>
                  <p className="benefit-card__tagline">
                    {item.tagline}
                  </p>
                  <p>
                    <strong>{item.highlight}</strong>. {item.text}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3) TESTIMONIALS
          ═══════════════════════════════════════════════════════════ */}
      <section className="community-section">
        <div className="community-bg"></div>
        <div className="container">
          <h2>{t("testimonials.title")}</h2>

          <div className="home-grid home-grid--benefits">
            {Array.isArray(testimonialItems) &&
              testimonialItems.map((item, i) => (
                <div className="benefit-card" key={i}>
                  <div className="benefit-icon">
                    {i === 0 && "💬"}
                    {i === 1 && "🏢"}
                    {i === 2 && "📸"}
                  </div>
                  <h3>{item.title}</h3>
                  <p>
                    "{item.quote}"
                    {item.note && (
                      <>
                        <br />
                        <span className="muted small">{item.note}</span>
                      </>
                    )}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4) HERO CITIZENS
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="hero-section hero-section--citizens home-hero-citizens"
        style={{
          backgroundImage: `url(/assets/hero-citizens.jpg)`,
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1>{t("citizens.hero.title")}</h1>
            <p className="home-hero__subtitle">
              {t("citizens.hero.subtitle")}
            </p>

            <div className="home-hero__actions">
              <button
                className="btn btn-outline"
                onClick={() => navigate("/challenges")}
              >
                {t("citizens.hero.cta.join")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/register")}
              >
                {t("citizens.hero.cta.register")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5) CTA BUSINESS
          ═══════════════════════════════════════════════════════════ */}
      <section className="support-section">
        <div className="container">
          <div className="home-cta">
            <h2 className="home-cta__title">{t("finalCta.title")}</h2>
            <p className="home-cta__subtitle">{t("finalCta.subtitle")}</p>

            <div className="home-cta__actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  const email = t("finalCta.contact.email");
                  const subject = encodeURIComponent(t("finalCta.contact.subject"));
                  const body = encodeURIComponent(t("finalCta.contact.body"));
                  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                }}
              >
                {t("finalCta.contact.label")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/business/packages")}
              >
                {t("finalCta.packages")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6) HOW IT WORKS
          ═══════════════════════════════════════════════════════════ */}
      <section className="support-section">
        <div className="container">
          <h2>{t("howItWorks.title")}</h2>

          <div className="home-grid home-grid--support">
            {Array.isArray(howItWorksSteps) &&
              howItWorksSteps.map((step, i) => (
                <div className="support-card" key={i}>
                  <div className="support-icon">
                    {i === 0 && "🧭"}
                    {i === 1 && "💸"}
                    {i === 2 && "✅"}
                  </div>
                  <h3>
                    {i + 1}. {step.title}
                  </h3>
                  <p>{step.text}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          7) MEMBERSHIP TABLE
          ═══════════════════════════════════════════════════════════ */}
      <section className="features-section">
        <div className="container">
          <h2>{t("membership.title")}</h2>

          {/* DESKTOP TABLE */}
          <div className="home-membership-table desktop-table">
            <div className="table-header">
              <div className="feature-column"></div>
              {Array.isArray(membershipPlans) &&
                membershipPlans.map((plan, i) => (
                  <div
                    className={`plan-column ${i === 1 ? "premium" : ""}`}
                    key={i}
                  >
                    {plan}
                  </div>
                ))}
            </div>

            {Array.isArray(membershipFeatures) &&
              membershipFeatures.map((feature, i) => (
                <div className="table-row" key={i}>
                  <div className="feature-cell">{feature.label}</div>
                  {Array.isArray(feature.values) &&
                    feature.values.map((value, j) => (
                      <div className="plan-cell" key={j}>
                        {value}
                      </div>
                    ))}
                </div>
              ))}
          </div>

          {/* MOBILE CARDS */}
          <div className="home-membership-cards mobile-plan-cards">
            {Array.isArray(membershipPlans) &&
              membershipPlans.map((plan, planIdx) => (
                <div className="plan-card" key={planIdx}>
                  <h3 className="plan-title">{plan}</h3>
                  <ul className="plan-features">
                    {Array.isArray(membershipFeatures) &&
                      membershipFeatures.map((feature, i) => (
                        <li key={i}>
                          <strong>{feature.label}:</strong>{" "}
                          {feature.values?.[planIdx]}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HomepageStatic;
