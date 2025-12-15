// src/pages/Login.jsx
/**
 * Scopo: permettere l'autenticazione degli utenti
 *
 * Attualmente supporta:
 * - Login
*/

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import FormNotice from "@/components/common/FormNotice.jsx";
import { useTranslation } from "react-i18next";


export default function Login() {

const { t } = useTranslation("pages/login");

  const { login } = useAuth();               // AuthContext v0.3
  const navigate = useNavigate();

  // Stato del form (email + password, come da backend v0.3)
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password); // chiama /api/auth/login
      navigate("/challenges");                // redirect post-login
    } catch (err) {
      console.error(err);
      setError(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="registration-form">
      <div className="container">
        <FormNotice />

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="email">{t("email_label")}</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t("email_placeholder")}
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("password_label")}</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t("password_placeholder")}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
           <p style={{ color: "salmon", marginTop: 8 }}>
            {t(error) || t("error")}
           </p>
           )}
<button
  type="submit"
  className="submit-button"
  disabled={submitting}
  aria-busy={submitting}
>
  {submitting ? t("logging_in") : t("login_button")}
</button>
        </form>
      </div>
    </section>
  );
}

