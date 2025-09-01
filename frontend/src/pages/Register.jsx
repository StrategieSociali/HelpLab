// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import FormNotice from "@/components/common/FormNotice.jsx";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const { register, login } = useAuth();          // dal nostro AuthContext v0.3
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // validazioni minime lato client
    if (!form.email || !form.password || !form.username) {
      setError("Compila tutti i campi.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }
    if (form.password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }

    setSubmitting(true);
    try {
      // 1) registra
      await register(form.email, form.password, form.username);
      // 2) auto-login (comodo per l’utente)
      await login(form.email, form.password);
      // 3) redirect
      navigate("/challenges");
    } catch (err) {
      console.error(err);
      setError("Registrazione non riuscita. Verifica i dati o riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="registration-section">
      <div className="container">
        <FormNotice />

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="sostenitore123"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
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
              onChange={handleChange}
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
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Conferma Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Conferma password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p style={{ color: "salmon", marginTop: 8 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Registrazione in corso…" : "Registrati"}
          </button>

          <p style={{ marginTop: 12, textAlign: "center", opacity: 0.9 }}>
            Hai già un account?{" "}
            <Link to="/login" style={{ textDecoration: "underline" }}>
              Accedi
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}

