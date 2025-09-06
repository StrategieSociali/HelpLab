import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        name: form.name,
      });
      // Se la registrazione non restituisce accessToken,
      // AuthContext fa auto-login. A questo punto siamo autenticati.
      navigate("/dashboard/challenges/create"); // rotta protetta
    } catch (error) {
      console.error(error);
      setErr("Registrazione non riuscita. Controlla i dati e riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page-section page-text">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Registrati</h1>
        {err && <div className="callout error">{err}</div>}

        <form onSubmit={onSubmit}>
          <label>
            Nome
            <input
              className="control control-pill"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Il tuo nome"
              required
            />
          </label>

          <label>
            Email
            <input
              className="control control-pill"
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="nome@esempio.it"
              required
            />
          </label>

          <label>
            Password
            <input
              className="control control-pill"
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="Minimo 8 caratteri"
              required
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
              Crea account
            </button>
            <Link className="btn btn-outline" to="/login">Hai già un account?</Link>
          </div>
        </form>
      </div>
    </section>
  );
}

