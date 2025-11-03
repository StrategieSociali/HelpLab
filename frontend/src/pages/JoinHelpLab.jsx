// src/pages/JoinHelpLab.jsx
import React, { useEffect, useState } from "react";
import FormNotice from "@/components/common/FormNotice.jsx";
import communityHero from "@/assets/community-hero.jpg"; // ✅ immagine hero

const INTEREST_OPTIONS = [
  { value: "volontario", label: "Test della piattaforma" },
  { value: "proponer", label: "Proporre progetti locali" },
  { value: "aspirante_formatore", label: "Diventare formatore" },
  { value: "aspirante_giudice", label: "Diventare giudice" },
  { value: "aspirante_sponsor", label: "Sponsorizzare un progetto" },
];

export default function JoinHelpLab() {
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
            Unisciti a HelpLab: la prima community locale per il cambiamento
          </h1>
          <p className="section-subtitle">
            HelpLab è la <strong>community per la sostenibilità ambientale e sociale</strong> che
            collega cittadini, imprese e pubbliche amministrazioni per
            realizzare <strong>progetti ESG locali</strong> con impatto
            misurabile e verificabile secondo gli standard{" "}
            <strong>CSRD/ESRS</strong>. Iscriviti per ricevere aggiornamenti,
            opportunità di collaborazione e per entrare in una rete che
            trasforma la sostenibilità in azione concreta.
          </p>
        </div>
      </section>

      {/* --- CTA SECTION (testo bianco) --- */}
      <section className="cta-section" style={{ backgroundColor: "#0f172a" }}>
        <div className="container text-center" style={{ color: "white" }}>
          <h2>Iscriviti ora alla community</h2>
          <p>
            Riceverai aggiornamenti sui <strong>progetti ESG locali</strong>,
            nuove opportunità di partecipazione e strumenti per misurare il tuo
            impatto in modo trasparente.  Fantastici regali e opportunità a tutti coloro che ci aiuteranno a testare
	    la piattaforma prima della release stabile v1.0.
          </p>
        </div>
      </section>

      {/* --- FORM SECTION --- */}
      <section className="registration-form">
        <div className="mauticform-innerform">
          <FormNotice className="notice--center" />
          <form className="registration-form" onSubmit={onSubmit}>
            <div className="form-group mauticform-row">
	  <label htmlFor="name" className="mauticform-label">
	    Nome <span className="required">*</span>
	  </label>
	  <input
	    id="name"
 	   name="name"
 	   type="text"
 	   className="mauticform-input"
 	   placeholder="Mario"
 	   value={form.name}
 	   onChange={onChange}
 	   required
 	   autoComplete="name"
 	 />
	</div>

            <div className="form-group mauticform-row">
              <label htmlFor="email" className="mauticform-label">
                Email <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mauticform-input"
                placeholder="nome@esempio.it"
                value={form.email}
                onChange={onChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group mauticform-row">
              <label className="mauticform-label">Aree di interesse</label>
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
                  Iscriviti alla newsletter per ricevere aggiornamenti
                </span>
              </label>
            </div>

            {error && (
              <div className="mauticform-error mauticform-errormsg">
                {error}
              </div>
            )}
            {success && (
              <div className="mauticform-message">
                ✅ Grazie! Ti abbiamo aggiunto alla community.
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
                  ? "Invio in corso…"
                  : "Proponiti alla Community"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

