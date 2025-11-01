// src/pages/JoinHelpLab.jsx
import React, { useState } from "react";
import FormNotice from "@/components/common/FormNotice.jsx";
import { api } from "@/api/client";

const INTEREST_OPTIONS = [
  { value: "platform-test",   label: "Test della piattaforma" },
  { value: "local-projects",  label: "Proporre progetti locali" },
  { value: "trainer",         label: "Diventare formatore" },
  { value: "judge",           label: "Diventare giudice" },
  { value: "sponsor",         label: "Sostenere un progetto locale" },
];

export default function JoinHelpLab() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    interests: [],
    newsletter: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

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
    setOk(false);

    if (!form.name || !form.email) {
      setError("Compila nome ed email.");
      return;
    }
    if (form.interests.length === 0) {
      setError("Seleziona almeno un’area di interesse.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/forms/waitlist", {
        name: form.name,
        email: form.email,
        interests: form.interests,   // <-- array, come richiesto dal backend
        newsletter: !!form.newsletter,
      });
      setOk(true);
      // reset soft (mantieni la spunta newsletter)
      setForm((prev) => ({ name: "", email: "", interests: [], newsletter: prev.newsletter }));
    } catch (err) {
      console.error(err);
      setError("Invio non riuscito. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
<section className="registration-form">
  <div className="container">
    <FormNotice className="notice--center" />
    <form className="registration-form" onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="name">Nome completo</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Mario Rossi"
          value={form.name}
          onChange={onChange}
          required
          autoComplete="name"
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={onChange}
          required
          autoComplete="email"
        />
      </div>
      <div className="form-group">
        <label>Aree di interesse</label>
        <div className="checkbox-grid">
          {INTEREST_OPTIONS.map((opt) => (
            <label key={opt.value} className="checkbox-item">
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
      <div className="form-group">
        <label className="checkbox-item checkbox-single">
          <input
            type="checkbox"
            id="newsletter"
            name="newsletter"
            checked={form.newsletter}
            onChange={onChange}
          />
          <span>Iscriviti alla newsletter per ricevere aggiornamenti</span>
        </label>
      </div>
      {error && <div className="form-message form-message--error">{error}</div>}
      {ok && <div className="form-message form-message--success">Grazie! Ti abbiamo aggiunto alla lista d'attesa.</div>}
      <button
        type="submit"
        className="submit-button"
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? "Invio in corso…" : "Proponiti alla Community"}
      </button>
    </form>
  </div>
</section>
  );
}

