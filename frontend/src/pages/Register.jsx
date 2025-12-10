import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TextBlock from "@/components/UI/TextBlock.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    nickname: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const validateNickname = (nickname) => {
    const nicknameRegex = /^[a-zA-Z0-9_-]{3,40}$/;
    return nicknameRegex.test(nickname);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!validateNickname(form.nickname)) {
      setErr(
        "Il nickname deve contenere solo lettere, numeri, _ o - (3-40 caratteri)."
      );
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
        setErr("Email o nickname già registrati.");
      } else if (error?.response?.status === 400) {
        setErr("Dati non validi. Controlla i campi e riprova.");
      } else {
        setErr("Registrazione non riuscita. Controlla i dati e riprova.");
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
          Registrati
        </h1>

        {err && (
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
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Il tuo nome"
              value={form.name}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder="Scegli un nickname pubblico"
              value={form.nickname}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nome@esempio.it"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Minimo 8 caratteri"
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
            {busy ? "Creazione in corso…" : "Crea account"}
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
              Hai già un account?
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

