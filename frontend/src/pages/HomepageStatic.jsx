// src/pages/HomeStatic.jsx
/**
 * Scopo: accogliere l'utente
 *
  * Attualmente contiene:
  * HERO (aziende/PA)
  * Benefici imprese
  * Come funziona
  * Valore concreto
  * Testimonianze
  * CTA finale imprese
  * HERO cittadini
  * Benefici cittadini
  * Tabella piani
 */
import React from 'react';
import { useNavigate } from "react-router-dom";
import FormNotice from "@/components/common/FormNotice.jsx";
import { Wrench, Gift, Users } from "lucide-react";
import heroBg from '@/assets/sustainability-hero.jpg';
import { useTranslation } from "react-i18next";

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

  const businessValueRows = t("businessValue.rows", {
    returnObjects: true,
    defaultValue: [],
  });

  const testimonialItems = t("testimonials.items", {
    returnObjects: true,
    defaultValue: [],
  });

  const citizenBenefitsItems = t("citizens.benefits.items", {
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
      {/* 1) HERO */}
      <section
      className="hero-section"
 	 style={{
  	  backgroundImage: `url(${heroBg})`,
  	  backgroundSize: 'cover',
  	  backgroundPosition: 'center',
 	 }}
>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1>{t("hero.title")}</h1>
            <p className="page-subtitle" style={{maxWidth: 860}}>
              {t("hero.subtitle")}
            </p><p className="page-subtitle" style={{maxWidth: 860}}>
              <strong>{t("hero.note.label")}</strong>{t("hero.note.text")}
            </p>

            {/* CTA doppia: aziende/PA vs cittadini */}
            <div
  className="cta-row"
  style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}
>
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

      {/* 2) PERCHÉ CONVIENE ALLE IMPRESE (3 pilastri) */}
      <section className="community-section">
  <div className="community-bg"></div>

  <div className="container">
    <h2>{t("businessBenefits.title")}</h2>

    <div className="home-grid home-grid--benefits">
      {Array.isArray(businessBenefitsItems) &&
  businessBenefitsItems.map((item, i) => (
    <div className="benefit-card" key={i}>
      <div className="benefit-icon">
        {i === 0 && "📊"}
        {i === 1 && "🏅"}
        {i === 2 && "🤝"}
      </div>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </div>
))}
    </div>
  </div>
</section>
 
      {/* 3) COME FUNZIONA (per le imprese) */}
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
      <h3>{i + 1}. {step.title}</h3>
      <p>{step.text}</p>
    </div>
))}
    </div>
  </div>
</section>

      {/* 4) VALORE PER LE AZIENDE (esempio di output concreti) */}
<section className="features-section">
  <div className="container">
    <h2>{t("businessValue.title")}</h2>

    <div className="features-table card" style={{ padding: 16 }}>
      {Array.isArray(businessValueRows) &&
  businessValueRows.map((row, i) => (
    <div className="table-row" key={i}>
      <div className="feature-cell">✅ {row.left}</div>
      <div className="plan-cell">{row.right}</div>
    </div>
))}
    </div>

    <p className="muted" style={{ marginTop: 10 }}>
      {t("businessValue.note")}
    </p>
  </div>
</section>


      {/* 5) TESTIMONIANZE / SPONSOR (placeholder) */}
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
        “{item.quote}”
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

      
      {/* 6) CALL TO ACTION FINALE */}
<section className="support-section">
  <div className="container">
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

      
      {/* HERO CITTADINI */}
<section className="hero-section">
  <div className="hero-overlay"></div>
  <div className="hero-content">
    <div className="hero-text">
      <h1>{t("citizens.hero.title")}</h1>

      <p className="page-subtitle" style={{ maxWidth: 860 }}>
        {t("citizens.hero.subtitle")}
      </p>

      <div className="cta-row" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="btn btn-outline" onClick={() => navigate("/challenges")}>
          {t("citizens.hero.cta.join")}
        </button>
        <button className="btn btn-outline" onClick={() => navigate("/register")}>
          {t("citizens.hero.cta.register")}
        </button>
      </div>
    </div>
  </div>
</section>


{/* BENEFICI CITTADINI */}
<section className="community-section">
  <div className="community-bg"></div>
  <div className="container">
    <h2>{t("citizens.benefits.title")}</h2>

    <div className="home-grid home-grid--benefits">
     {Array.isArray(citizenBenefitsItems) &&
  citizenBenefitsItems.map((item, i) => (
    <div className="benefit-card" key={i}>
      <div className="benefit-icon">
        {i === 0 && <Wrench size={40} strokeWidth={1.5} />}
        {i === 1 && <Gift size={40} strokeWidth={1.5} />}
        {i === 2 && <Users size={40} strokeWidth={1.5} />}
      </div>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </div>
))}
    </div>
  </div>
</section>



{/* Features Table */}
   <section className="features-section">
  <div className="container">
    <h2>{t("membership.title")}</h2>

    {/* DESKTOP */}
    <div className="desktop-table">
      <div className="table-header">
        <div className="feature-column"></div>
       {Array.isArray(membershipPlans) &&
  membershipPlans.map((plan, i) => (
    <div className={`plan-column ${i === 1 ? "premium" : ""}`} key={i}>
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
          <div className="plan-cell" key={j}>{value}</div>
        ))}
    </div>
))}
    </div>

    {/* MOBILE */}
    <div className="mobile-plan-cards">
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

