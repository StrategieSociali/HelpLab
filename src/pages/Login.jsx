// src/pages/Login.jsx
/**
 * Scopo: permettere l'autenticazione degli utenti
 *
 * Attualmente supporta:
 * - Login
 * - Sessione scaduta (dal 2/10/2026): se la sessione è finita da sola, un avviso lo
 *   dice al posto dell'errore tecnico; dopo il login si torna alla pagina da cui
 *   ProtectedRoute ha rimandato qui (`state.from`), altrimenti alle sfide.
 */

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import FormNotice from "@/components/common/FormNotice.jsx";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation("pages/login", {
    useSuspense: false, // OBBLIGATORIO: pagina raggiunta da click
  });

  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const backTo = from?.pathname ? `${from.pathname}${from.search || ""}` : "/challenges";

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
      navigate(backTo, { replace: true });
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

        {sessionExpired && (
          <div className="notice notice--info" role="status" aria-live="polite">
            <div className="notice__content">{t("sessionExpired")}</div>
          </div>
        )}

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

