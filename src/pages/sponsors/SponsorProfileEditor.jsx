// src/pages/sponsors/SponsorProfileEditor.jsx
/**
 * Scopo: permettere allo sponsor di creare o modificare il proprio profilo pubblico
 *
 * Attualmente supporta:
 * - caricamento profilo sponsor (GET /api/v1/sponsors/me)
 * - creazione profilo sponsor (POST /api/v1/sponsors/me)
 * - aggiornamento profilo sponsor (PUT /api/v1/sponsors/me)
 *
 * Note:
 * - accessibile solo a utenti con role = sponsor
 * - READ / WRITE
 * - non gestisce sponsorizzazioni o challenge
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

// Quasi nessuno scrive «https://» (rilievo PM 5/10/2026): «www.azienda.it» diventa
// «https://www.azienda.it». Vuoto resta null, che il BE accetta come «nessun sito».
function withScheme(value) {
  const v = value.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export default function SponsorProfileEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [exists, setExists] = useState(false);

  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    logo_url: "",
  });

  /* =======================
     LOAD SPONSOR PROFILE
     ======================= */

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get("/v1/sponsors/me");

        if (!mounted) return;

        setForm({
          name: res.data.name || "",
          website: res.data.website || "",
          description: res.data.description || "",
          logo_url: res.data.logo_url || "",
        });

        setExists(true);
      } catch (err) {
        // 404 = profilo non ancora creato
        if (err.response?.status === 404) {
          setExists(false);
        } else {
          setError("Errore nel caricamento del profilo sponsor");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  /* =======================
     HANDLERS
     ======================= */

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // I campi facoltativi vuoti vanno come null: il BE valida come URL qualunque
    // stringa, anche vuota, e rispondeva 400 a chi lasciava vuoto logo o sito
    // (rilievo PM 5/10/2026).
    const body = {
      name:        form.name.trim(),
      website:     withScheme(form.website),
      description: form.description.trim() || null,
      logo_url:    withScheme(form.logo_url),
    };

    try {
      if (exists) {
        await api.put("/v1/sponsors/me", body);
      } else {
        await api.post("/v1/sponsors/me", body);
        setExists(true);
      }

      navigate("/sponsors"); // ritorno alla community sponsor
    } catch (err) {
      // 400: il BE dice quale campo non va (es. «name: String must contain at least 2
      // character(s)»); prima il motivo restava nascosto dietro un messaggio generico.
      const detail = err?.response?.status === 400 ? err.response.data?.error : null;
      setError(
        detail
          ? `Controlla i dati inseriti: ${detail}`
          : "Errore nel salvataggio del profilo sponsor. Riprova tra poco."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     RENDER STATES
     ======================= */

  if (loading) {
    return (
      <section className="page-section page-text">
        <div className="container">Caricamento profilo sponsor…</div>
      </section>
    );
  }

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">
          {exists ? "Modifica profilo sponsor" : "Crea profilo sponsor"}
        </h1>

        <p className="muted" style={{ maxWidth: 640 }}>
          Queste informazioni saranno visibili pubblicamente nella sezione sponsor
          della community.
        </p>

        {error && (
          <div className="callout error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="registration-form" style={{ marginTop: 24 }}>
          <div className="form-group">
            <label htmlFor="name">Nome organizzazione</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Sito web</label>
            <input
              id="website"
              name="website"
              type="text"
              inputMode="url"
              value={form.website}
              onChange={onChange}
              placeholder="www.esempio.it"
            />
          </div>

          <div className="form-group">
            <label htmlFor="logo_url">Logo (URL)</label>
            <input
              id="logo_url"
              name="logo_url"
              type="text"
              inputMode="url"
              value={form.logo_url}
              onChange={onChange}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrizione</label>
            <textarea
              id="description"
              name="description"
              rows={6}
              value={form.description}
              onChange={onChange}
              placeholder="Descrivi brevemente la tua organizzazione"
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={saving}
          >
            {saving
              ? "Salvataggio in corso…"
              : exists
              ? "Salva modifiche"
              : "Crea profilo sponsor"}
          </button>
        </form>
      </div>
    </section>
  );
}
