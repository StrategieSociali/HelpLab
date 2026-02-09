// src/pages/JoinHelpLab.jsx
/**
 * Scopo: Presentare la community e raccogliere contatti via Mautic
 *
 * Attualmente supporta:
 * - Hero section accattivante
 * - Form integrazione Mautic (community mailing list)
 * - Gestione interessi utente
 * - Stili dedicati e namespaced (.join-*)
 */

import React, { useEffect, useState } from "react";
import FormNotice from "@/components/common/FormNotice.jsx";
import communityHero from "@/assets/community-hero.jpg";
import { useTranslation } from "react-i18next";
import "../styles/joinhelplab.css";

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

  // Mautic SDK initialization
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
      {/* HERO SECTION */}
      <section
        className="join-hero"
        style={{
          backgroundImage: `url(${communityHero})`,
        }}
      >
        <div className="join-hero__overlay"></div>
        <div className="join-hero__content">
          <h1 className="join-hero__title">{t("hero.title")}</h1>
          <p className="join-hero__subtitle">{t("hero.text")}</p>
        </div>
      </section>

      {/* INTRO SECTION */}
      <section className="join-intro">
        <div className="container">
          <h2 className="join-intro__title">{t("hero.title")}</h2>
          <p className="join-intro__text">{t("hero.text")}</p>
        </div>
      </section>

      {/* FORM SECTION
          ⚠️ ATTENZIONE: Le chiavi "mauticform[...]" sono CONTRATTO con Mautic.
          Non tradurre né rinominare. */}
      <section className="join-form-section">
        <div className="container">
          <div className="join-form">
            <FormNotice className="join-form__notice" />

            <form onSubmit={onSubmit}>
              {/* Nome */}
              <div className="join-form__group">
                <label htmlFor="name" className="join-form__label">
                  {t("form.name.label")} <span className="required">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="join-form__input"
                  placeholder={t("form.name.placeholder")}
                  value={form.name}
                  onChange={onChange}
                  required
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div className="join-form__group">
                <label htmlFor="email" className="join-form__label">
                  {t("form.email.label")} <span className="required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="join-form__input"
                  placeholder={t("form.email.placeholder")}
                  value={form.email}
                  onChange={onChange}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Interessi (checkbox grid) */}
              <div className="join-form__group">
                <label className="join-form__label">
                  {t("form.interests.label")}
                </label>
                <div className="join-form__checkbox-grid">
                  {INTEREST_OPTIONS.map((opt) => (
                    <label key={opt.value} className="join-form__checkbox-item">
                      <input
                        type="checkbox"
                        name="interests"
                        value={opt.value}
                        checked={form.interests.includes(opt.value)}
                        onChange={onChange}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div className="join-form__group">
                <label className="join-form__checkbox-single">
                  <input
                    type="checkbox"
                    id="newsletter"
                    name="newsletter"
                    checked={form.newsletter}
                    onChange={onChange}
                  />
                  <span>{t("form.newsletter")}</span>
                </label>
              </div>

              {/* Messages */}
              {error && (
                <div className="join-form__message join-form__message--error">
                  {t("form.errors.required")}
                </div>
              )}

              {success && (
                <div className="join-form__message join-form__message--success">
                  {t("form.success")}
                </div>
              )}

              {/* Submit */}
              <div className="join-form__actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? t("form.submitting") : t("form.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
