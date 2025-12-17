// src/pages/WelcomeInfo.jsx
/**
 * Scopo: presentare all'utente appena registrato o al visitatore le opportunità di HelpLab
 *
 * Attualmente ci sono contenuti per:
 * - Informare l’utente appena registrato sulle possibilità offerte dalla piattaforma.
 * - Guidarlo nella scelta del suo ruolo o attività preferita.
 * - Stimolare l’interazione con sfide, community, e percorsi formativi.
 * - Formato coerente con lo stile già presente
*/

import React from "react";
import { useTranslation } from "react-i18next";


export default function WelcomeInfo() {
const { t } = useTranslation("pages/welcome", {
  useSuspense: false,
});
  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">{t("hero.title")}</h2>
        <p className="muted">{t("hero.subtitle")}</p>


<div className="welcome-grid">

<div className="card">
  <h2 className="page-title welcome-title">
    <span className="welcome-icon">{t("sections.path.icon")}</span>
    <span>{t("sections.path.title")}</span>
  </h2>
  <h3 className="page-subtitle">{t("sections.path.subtitle")}</h3>
  <p>{t("sections.path.text")}</p>
</div>
        
<div className="card">
  <h2 className="page-title welcome-title">
    <span className="welcome-icon">{t("sections.challenges.icon")}</span>
    <span>{t("sections.challenges.title")}</span>
  </h2>
  <h3 className="page-subtitle">{t("sections.challenges.subtitle")}</h3>
  <p>{t("sections.challenges.text")}</p>
</div>

<div className="card">
  <h2 className="page-title welcome-title">
    <span className="welcome-icon">{t("sections.judge.icon")}</span>
    <span>{t("sections.judge.title")}</span>
  </h2>
  <h3 className="page-subtitle">{t("sections.judge.subtitle")}</h3>
  <p>{t("sections.judge.text")}</p>
</div>

<div className="card">
  <h2 className="page-title welcome-title">
    <span className="welcome-icon">{t("sections.sponsor.icon")}</span>
    <span>{t("sections.sponsor.title")}</span>
  </h2>
  <h3 className="page-subtitle">{t("sections.sponsor.subtitle")}</h3>
  <p>{t("sections.sponsor.text")}</p>
</div>

<div className="card">
  <h2 className="page-title welcome-title">
    <span className="welcome-icon">{t("sections.learning.icon")}</span>
    <span>{t("sections.learning.title")}</span>
  </h2>
  <h3 className="page-subtitle">{t("sections.learning.subtitle")}</h3>
  <p>{t("sections.learning.text")}</p>
</div>

<div className="card">
  <h2 className="page-title welcome-title">
    <span className="welcome-icon">{t("sections.community.icon")}</span>
    <span>{t("sections.community.title")}</span>
  </h2>
  <h3 className="page-subtitle">{t("sections.community.subtitle")}</h3>
  <p>{t("sections.community.text")}</p>
</div>
</div>

        <div className="card welcome-cta" style={{ marginTop: 48 }}>
  <h3 className="page-title" style={{ marginBottom: 8 }}>
    {t("cta.title")}
  </h3>

  <p className="page-subtitle" style={{ marginBottom: 20 }}>
     {t("cta.subtitle")}
  </p>

  <div
    className="cta-row"
    style={{
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      justifyContent: "center",
    }}
  >
    <a href="/dashboard/profile" className="btn btn-primary btn-pill">
     {t("cta.profile")}
    </a>

    <a href="/challenges" className="btn btn-outline btn-pill">
     {t("cta.challenges")}
    </a>
  </div>
</div>

      </div>
    </section>
  );
}

