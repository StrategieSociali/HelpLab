// src/pages/Register.jsx
/**
 * Scopo: permettere la registrazione degli utenti
 *
 * Attualmente supporta:
 * - Registrazione con consenso privacy obbligatorio
 *
 * Classi CSS usate da styles.css:
 *   .registration-form, .form-group, .submit-button,
 *   .checkbox-single, .form-message--error, .btn, .btn-outline
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { t } = useTranslation("pages/register", {
    useSuspense: false, // OBBLIGATORIO: pagina raggiunta da click
  });

  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    nickname: "",
    privacy_consent: false,
  });

  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState(null);

  const onChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const validateNickname = (nickname) => {
    const nicknameRegex = /^[a-zA-Z0-9_-]{3,40}$/;
    return nicknameRegex.test(nickname);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorCode(null);

    if (!validateNickname(form.nickname)) {
      setErrorCode("invalid_nickname");
      return;
    }

    setBusy(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        name: form.name,
        nickname: form.nickname,
      });
      navigate("/benvenuto");
    } catch (error) {
      console.error(error);

      if (error?.response?.status === 409) {
        setErrorCode("conflict");
      } else if (error?.response?.status === 400) {
        setErrorCode("invalid_data");
      } else {
        setErrorCode("generic");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="registration-form">
      <div className="container">

        <h1 className="page-title">
          {t("title")}
        </h1>

        {/* Messaggio di errore — usa classe esistente in styles.css */}
        {errorCode && (
          <div className="registration-form form-message form-message--error">
            {t(`errors.${errorCode}`, {
              defaultValue: t("errors.generic"),
            })}
          </div>
        )}

        <form onSubmit={onSubmit} className="registration-form">

          <div className="form-group">
            <label htmlFor="name">{t("name.label")}</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder={t("name.placeholder")}
              value={form.name}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">{t("nickname.label")}</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder={t("nickname.placeholder")}
              value={form.nickname}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t("email.label")}</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t("email.placeholder")}
              value={form.email}
              onChange={onChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("password.label")}</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t("password.placeholder")}
              value={form.password}
              onChange={onChange}
              required
              autoComplete="new-password"
            />
          </div>

          {/*
            Consenso privacy — obbligatorio per procedere.
            Usa .checkbox-single già definita in styles.css:
            layout flex, checkbox a sinistra, testo a destra, sfondo glass.
          */}
          <div className="form-group">
            <div className="checkbox-single">
              <input
                id="privacy_consent"
                name="privacy_consent"
                type="checkbox"
                checked={form.privacy_consent}
                onChange={onChange}
                required
              />
              <label htmlFor="privacy_consent">
                Ho letto e accetto la{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                {" "}e acconsento al trattamento dei miei dati personali.
              </label>
            </div>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? t("actions.creating") : t("actions.submit")}
          </button>

          <div className="form-group" style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link className="btn btn-outline" to="/login">
              {t("actions.loginLink")}
            </Link>
          </div>

        </form>
      </div>
    </section>
  );
}
