// src/pages/Register.jsx
/**
 * Scopo: permettere la registrazione degli utenti
 *
 * Attualmente supporta:
 * - Registrazione
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TextBlock from "@/components/UI/TextBlock.jsx";
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
  });

  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState(null);

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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
        <h1
          className="page-title"
          style={{
            textAlign: "center",
            color: "white",
            fontSize: "2.5rem",
            fontWeight: 700,
            marginBottom: "2rem",
          }}
        >
          {t("title")}
        </h1>

        {errorCode && (
          <div
            className="callout error"
            style={{
              background: "rgba(250, 128, 114, 0.15)",
              border: "1px solid rgba(250, 128, 114, 0.3)",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
              color: "#fca5a5",
            }}
          >
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

          <button
            className="submit-button"
            type="submit"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? t("actions.creating") : t("actions.submit")}
          </button>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link
              className="btn btn-outline"
              to="/login"
              style={{
                display: "inline-block",
                color: "white",
                textDecoration: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(255, 255, 255, 0.05)",
                transition: "all 0.3s ease",
              }}
            >
              {t("actions.loginLink")}
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

