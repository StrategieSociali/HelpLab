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
        <header className="page-header">
         <h1 className="page-title">
          {t("header.title")}
         </h1>

         <p className="page-subtitle">
           {t("header.version", { version: APP_VERSION })}
         </p>

         <p className="page-subtitle">
            {t("header.openSource")}
         </p>
        </header>

{/* =========================
   IN CANTIERE (SEZIONE VIVA)
   ========================= */}
<div className="content-grid" style={{ marginBottom: 32 }}>

  <div className="benefit-card">
    <h3>{t("workInProgress.features.title")}</h3>
    <hr />
    {t("workInProgress.features.items", {
  returnObjects: true,
  defaultValue: [],
}).map((item, i) => (
  <p className="muted" key={i}>{item}</p>
))}
  </div>

  <div className="benefit-card">
    <h3>{t("workInProgress.improvements.title")}</h3>
    <hr />
    {t("workInProgress.improvements.items", {
  returnObjects: true,
  defaultValue: [],
}).map((item, i) => (
  <p className="muted" key={i}>{item}</p>
))}
  </div>

  <div className="benefit-card">
    <h3>{t("workInProgress.bugfixes.title")}</h3>
    <hr />
    {t("workInProgress.bugfixes.items", {
  returnObjects: true,
  defaultValue: [],
}).map((item, i) => (
  <p className="muted" key={i}>{item}</p>
))}
  </div>

</div>

        {/* =========================
            ROADMAP (FUTURO → PASSATO)
           ========================= */}
        <div className="content-grid" style={{ marginBottom: 16 }}>
          {/* FUTURO */}
           {t("roadmap", {
             returnObjects: true,
             defaultValue: [],
            }).map((item, i) => (
           <div className="benefit-card" key={i}>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
         </div>
        ))}
          </div>
      

        {/* CTA */}
        <div className="card" style={{ padding: 20 }}>
<h2>{t("cta.title")}</h2>
<p className="page-subtitle">{t("cta.subtitle")}</p>

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
    </section>
  );
}
