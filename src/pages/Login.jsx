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
  const { t } = useTranslation("pages/login", {
    useSuspense: false, // OBBLIGATORIO: pagina raggiunta da click
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errorCode, setErrorCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorCode(null);
    setSubmitting(true);

    try {
      await login(form.email, form.password);
      navigate("/challenges");
    } catch (err) {
      console.error(err);
      // codice logico, NON stringa tradotta
      setErrorCode("invalid_credentials");
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
            <label htmlFor="email">
              {t("email.label")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t("email.placeholder")}
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {t("password.label")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t("password.placeholder")}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {errorCode && (
            <p style={{ color: "salmon", marginTop: 8 }}>
              {t(`errors.${errorCode}`, {
                defaultValue: t("errors.generic"),
              })}
            </p>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? t("actions.loggingIn") : t("actions.login")}
          </button>
        </form>
      </div>
    </section>
  );
}

