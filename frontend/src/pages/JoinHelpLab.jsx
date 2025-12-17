// src/pages/JoinHelpLab.jsx
/**
 * Scopo: Presentare la community 
 *
 * Attualmente supporta:
 * Breve presentazione
 * Iscrizione a Mautic
 */
 
import React, { useEffect, useState } from "react";
import FormNotice from "@/components/common/FormNotice.jsx";
import communityHero from "@/assets/community-hero.jpg";
import { useTranslation } from "react-i18next";

export default function JoinHelpLab() {
  const { t } = useTranslation("pages/join", {
    useSuspense: false,
  });

  const INTEREST_OPTIONS = [
    { value: "volontario", label: t("form.interests.testing") },
    { value: "proponer", label: t("form.interests.propose") },
    { value: "aspirante_formatore", label: t("form.interests.trainer") },
    { value: "aspirante_giudice", label: t("form.interests.judge") },
    { value: "aspirante_sponsor", label: t("form.interests.sponsor") },
  ];

  const [form, setForm] = useState({
    name: "",
    email: "",
    interests: [],
    newsletter: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.MauticSDKLoaded) {
      const script = document.createElement("script");
      script.src = "https://community.helplab.space/media/js/mautic-form.js";
      script.onload = () => window.MauticSDK?.onLoad?.();
      document.head.appendChild(script);
      window.MauticSDKLoaded = true;
      window.MauticDomain = "https://community.helplab.space";
      window.MauticLang = { submittingMessage: "Please wait..." };
    }
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "interests") {
      const v = value;
      setForm((prev) => {
        const set = new Set(prev.interests);
        checked ? set.add(v) : set.delete(v);
        return { ...prev, interests: Array.from(set) };
      });
    } else if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!form.name || !form.email) {
      setError("Compila nome ed email.");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("mauticform[formId]", "1");
      data.append("mauticform[formName]", "community");
      data.append("mauticform[nome]", form.name);
      data.append("mauticform[email]", form.email);
      form.interests.forEach((val) =>
        data.append("mauticform[aree_di_interesse][]", val)
      );
      if (form.newsletter) {
        data.append("mauticform[iscriviti_alla_newsletter][]", "newsletter");
      }

      await fetch("https://community.helplab.space/form/submit?formId=1", {
        method: "POST",
        body: data,
        mode: "no-cors",
      });

      setSuccess(true);
      setForm({ name: "", email: "", interests: [], newsletter: false });
    } catch (err) {
      console.error(err);
      setError("Invio non riuscito. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* --- HERO SECTION con immagine di sfondo --- */}
      <section
        className="hero-section join-hero"
        style={{
          backgroundImage: `url(${communityHero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          position: "relative",
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
         <h1 className="section-title">
         {t("hero.title")}
         </h1>

        <p className="section-subtitle">
         {t("hero.text")}
        </p>

        </div>
      </section>

      {/* --- CTA SECTION (testo bianco) --- */}
      <section className="cta-section" style={{ backgroundColor: "#0f172a" }}>
        <div className="container text-center" style={{ color: "white" }}>
          <h1 className="section-title">
           {t("hero.title")}
          </h1>

          <p className="section-subtitle">
             {t("hero.text")}
          </p>

        </div>
      </section>

      {/* --- FORM SECTION --- 
       ⚠️ ATTENZIONE:
       Le chiavi "mauticform[...]" sono CONTRATTO con Mautic.
       Non tradurre né rinominare. */}

      <section className="registration-form">
        <div className="mauticform-innerform">
          <FormNotice className="notice--center" />
          <form className="registration-form" onSubmit={onSubmit}>
            <div className="form-group mauticform-row">
	  <label htmlFor="name" className="mauticform-label">
	    {t("form.name.label")} <span className="required">*</span>
	  </label>
	  <input
	    id="name"
 	   name="name"
 	   type="text"
 	   className="mauticform-input"
 	   placeholder={t("form.name.placeholder")}
 	   value={form.name}
 	   onChange={onChange}
 	   required
 	   autoComplete="name"
 	 />
	</div>

            <div className="form-group mauticform-row">
              <label htmlFor="email" className="mauticform-label">
                {t("form.email.label")} <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mauticform-input"
                placeholder={t("form.email.placeholder")}
                value={form.email}
                onChange={onChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group mauticform-row">
              <label className="mauticform-label">{t("form.interests.label")}</label>
              <div className="checkbox-grid">
                {INTEREST_OPTIONS.map((opt) => (
                  <label key={opt.value} className="checkbox-item">
                    <input
                      type="checkbox"
                      name="interests"
                      value={opt.value}
                      checked={form.interests.includes(opt.value)}
                      onChange={onChange}
                      className="mauticform-checkboxgrp-checkbox"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group mauticform-row">
              <label className="checkbox-item checkbox-single">
                <input
                  type="checkbox"
                  id="newsletter"
                  name="newsletter"
                  checked={form.newsletter}
                  onChange={onChange}
                  className="mauticform-checkboxgrp-checkbox"
                />
                <span>
                  {t("form.newsletter")}
                </span>
              </label>
            </div>

               {error && (
                 <div className="mauticform-error">
                  {t("form.errors.required")}
                 </div>
               )}

               {success && (
                 <div className="mautic-message">
                  {t("form.success")}
                 </div>
               )}


            <div className="mauticform-row mauticform-button-wrapper">
              <button
                type="submit"
                className="btn btn-ghost mauticform-button"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting
                  ? t("form.submitting")
                  : t("form.submit")}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

