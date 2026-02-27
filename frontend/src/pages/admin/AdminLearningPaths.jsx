// src/pages/admin/AdminLearningPaths.jsx
/**
 * AdminLearningPaths.jsx
 * ----------------------
 * Pannello admin per la gestione del catalogo corsi.
 *
 * ACCESSO: solo admin (ProtectedRoute in App.jsx)
 * ROUTE: /dashboard/admin/corsi
 *
 * ENDPOINT:
 *   GET    /v1/learning-paths          → lista corsi pubblicati (pubblico)
 *   POST   /v1/learning-paths          → crea nuovo corso
 *   PUT    /v1/learning-paths/:id      → modifica corso esistente
 *   DELETE /v1/learning-paths/:id      → disattiva corso (soft delete)
 *
 * PATTERN: identico ad AdminEvents.jsx
 * - useEffect + useState + api da learningPaths.api.js
 * - Azioni inline con setBusy per disabilitare durante la chiamata
 * - Rimozione/aggiornamento ottimistico della lista dopo ogni azione
 *
 * FORM: modale inline (no pagina separata) con tutti i campi del corso.
 * Usato sia per la creazione che per la modifica — si distingue dalla
 * presenza o meno di editingCourse nello stato.
 *
 * UX NOTE:
 * - La disattivazione usa confirm() inline, coerente con il pattern esistente.
 * - Il toggle is_published è un checkbox "Pubblica subito" nel form.
 * - sort_order è un campo numerico — in futuro potrà diventare drag-and-drop.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roles";
import {
  fetchLearningPaths,
  createLearningPath,
  updateLearningPath,
  deactivateLearningPath,
} from "@/api/learningPaths.api";

// ─── ENUM FISSI (dal backend handoff v1.1, sezione 1.2) ──────────────────────
// Non fare chiamate API per questi valori.

const CATEGORY_OPTIONS = [
  { value: "ONBOARDING",     label: "Onboarding" },
  { value: "PLATFORM_USAGE", label: "Uso piattaforma" },
  { value: "DATA_LITERACY",  label: "Dati e metriche" },
  { value: "SUSTAINABILITY",  label: "Sostenibilità" },
  { value: "GAME_THEORY",    label: "Teoria dei giochi" },
  { value: "TECHNICAL",      label: "Tecnico" },
];

const TARGET_ROLE_OPTIONS = [
  { value: "ALL",       label: "Tutti" },
  { value: "VOLUNTEER", label: "Volontario" },
  { value: "JUDGE",     label: "Giudice" },
  { value: "SPONSOR",   label: "Sponsor" },
  { value: "PA",        label: "PA" },
];

const PROVIDER_OPTIONS = [
  { value: "YOUTUBE",   label: "YouTube" },
  { value: "LIFTERLMS", label: "LifterLMS" },
  { value: "EXTERNAL",  label: "Esterno" },
];

const TYPE_OPTIONS = [
  { value: "FREE",    label: "Gratuito" },
  { value: "PREMIUM", label: "Premium" },
];

// Label leggibili per la lista
const CATEGORY_LABELS  = Object.fromEntries(CATEGORY_OPTIONS.map(o => [o.value, o.label]));
const PROVIDER_LABELS  = Object.fromEntries(PROVIDER_OPTIONS.map(o => [o.value, o.label]));
const ROLE_LABELS      = Object.fromEntries(TARGET_ROLE_OPTIONS.map(o => [o.value, o.label]));

// ─── STATO INIZIALE FORM ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  title:            "",
  description:      "",
  category:         "ONBOARDING",
  target_role:      "ALL",
  type:             "FREE",
  provider:         "YOUTUBE",
  external_url:     "",
  thumbnail_url:    "",
  duration_minutes: "",
  sort_order:       0,
  is_published:     false,
};

// ─── HELPER: costruisce il body da inviare al BE ──────────────────────────────
// Rimuove i campi opzionali vuoti per non mandare stringhe vuote al backend.

function buildBody(form) {
  const body = {
    title:        form.title.trim(),
    description:  form.description.trim(),
    category:     form.category,
    target_role:  form.target_role,
    type:         form.type,
    provider:     form.provider,
    external_url: form.external_url.trim(),
    sort_order:   Number(form.sort_order) || 0,
    is_published: form.is_published,
  };
  if (form.thumbnail_url.trim())    body.thumbnail_url    = form.thumbnail_url.trim();
  if (form.duration_minutes !== "") body.duration_minutes = Number(form.duration_minutes);
  return body;
}

// ─── HELPER: validazione form ─────────────────────────────────────────────────

function validate(form) {
  const errors = [];
  if (form.title.trim().length < 5)       errors.push("Il titolo deve avere almeno 5 caratteri.");
  if (form.description.trim().length < 20) errors.push("La descrizione deve avere almeno 20 caratteri.");
  if (!form.external_url.trim())           errors.push("L'URL del corso è obbligatorio.");
  if (form.duration_minutes !== "" && isNaN(Number(form.duration_minutes))) {
    errors.push("La durata deve essere un numero.");
  }
  return errors;
}

// ─── COMPONENTE FORM ──────────────────────────────────────────────────────────
// Estratto per leggibilità — riceve il draft e lo aggiorna via onChange.

function CourseForm({ form, onChange, saving, onSave, onCancel, isEditing }) {
  const set = (patch) => onChange({ ...form, ...patch });
  const errors = validate(form);
  const canSave = errors.length === 0;

  return (
    <div className="lp-admin-modal" role="dialog" aria-modal="true" aria-label={isEditing ? "Modifica corso" : "Nuovo corso"}>
      <div className="lp-admin-modal__backdrop" onClick={onCancel} />
      <div className="lp-admin-modal__panel">

        <div className="lp-admin-modal__header">
          <h3 className="lp-admin-modal__title">
            {isEditing ? "Modifica corso" : "Nuovo corso"}
          </h3>
          <button
            className="btn btn-ghost btn-small"
            onClick={onCancel}
            aria-label="Chiudi form"
          >
            ✕
          </button>
        </div>

        <div className="lp-admin-modal__body">
          <div className="form-grid">

            {/* TITOLO */}
            <label className="lp-admin-form__label">
              Titolo *
              <input
                className={`control ${form.title.trim().length >= 5 ? "input-valid" : form.title.length ? "input-invalid" : ""}`}
                placeholder="Min 5 caratteri, max 200"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                maxLength={200}
              />
              <span className="hint">
                {form.title.trim().length < 5 && form.title.length > 0
                  ? `Minimo 5 caratteri (${form.title.trim().length}/5)`
                  : form.title.trim().length >= 5 ? "✓" : ""}
              </span>
            </label>

            {/* DESCRIZIONE */}
            <label className="lp-admin-form__label">
              Descrizione *
              <textarea
                className={`control ${form.description.trim().length >= 20 ? "input-valid" : form.description.length ? "input-invalid" : ""}`}
                rows={4}
                placeholder="Min 20 caratteri"
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
              />
              <span className="hint">
                {form.description.trim().length < 20 && form.description.length > 0
                  ? `Minimo 20 caratteri (${form.description.trim().length}/20)`
                  : form.description.trim().length >= 20 ? "✓" : ""}
              </span>
            </label>

            {/* CATEGORIA + RUOLO TARGET — riga a due colonne */}
            <div className="form-row">
              <label className="lp-admin-form__label">
                Categoria *
                <select
                  className="control"
                  value={form.category}
                  onChange={(e) => set({ category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="lp-admin-form__label">
                Ruolo target
                <select
                  className="control"
                  value={form.target_role}
                  onChange={(e) => set({ target_role: e.target.value })}
                >
                  {TARGET_ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* PROVIDER + TIPO — riga a due colonne */}
            <div className="form-row">
              <label className="lp-admin-form__label">
                Provider *
                <select
                  className="control"
                  value={form.provider}
                  onChange={(e) => set({ provider: e.target.value })}
                >
                  {PROVIDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="lp-admin-form__label">
                Tipo
                <select
                  className="control"
                  value={form.type}
                  onChange={(e) => set({ type: e.target.value })}
                >
                  {TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* URL ESTERNO */}
            <label className="lp-admin-form__label">
              URL corso (esterno) *
              <input
                className={`control ${form.external_url.trim() ? "input-valid" : ""}`}
                type="url"
                placeholder="https://youtube.com/watch?v=... oppure https://..."
                value={form.external_url}
                onChange={(e) => set({ external_url: e.target.value })}
                maxLength={500}
              />
              <span className="hint">
                URL della piattaforma esterna. Può essere aggiornato in qualsiasi momento.
              </span>
            </label>

            {/* THUMBNAIL + DURATA — riga a due colonne */}
            <div className="form-row">
              <label className="lp-admin-form__label">
                URL thumbnail (opzionale)
                <input
                  className="control"
                  type="url"
                  placeholder="https://res.cloudinary.com/…"
                  value={form.thumbnail_url}
                  onChange={(e) => set({ thumbnail_url: e.target.value })}
                />
                <span className="hint">Se assente verrà mostrata un'icona della categoria.</span>
              </label>

              <label className="lp-admin-form__label">
                Durata stimata (minuti)
                <input
                  className="control"
                  type="number"
                  min="1"
                  placeholder="Es: 15"
                  value={form.duration_minutes}
                  onChange={(e) => set({ duration_minutes: e.target.value })}
                />
                <span className="hint">Lascia vuoto se non disponibile.</span>
              </label>
            </div>

            {/* SORT ORDER */}
            <label className="lp-admin-form__label">
              Ordine visualizzazione
              <input
                className="control"
                type="number"
                min="0"
                placeholder="0"
                value={form.sort_order}
                onChange={(e) => set({ sort_order: e.target.value })}
                style={{ maxWidth: 120 }}
              />
              <span className="hint">
                Numero più basso = appare prima. Default 0.
              </span>
            </label>

            {/* IS_PUBLISHED — toggle */}
            <label className="lp-admin-form__label lp-admin-form__label--inline">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => set({ is_published: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Pubblica subito
              <span className="hint" style={{ marginLeft: 8 }}>
                {form.is_published
                  ? "Il corso sarà visibile nel catalogo pubblico."
                  : "Il corso sarà salvato come bozza (non visibile pubblicamente)."}
              </span>
            </label>

          </div>

          {/* Errori di validazione */}
          {errors.length > 0 && (
            <div className="callout error" style={{ marginTop: 16 }}>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Footer form */}
        <div className="lp-admin-modal__footer">
          <button
            className="btn btn-outline"
            onClick={onCancel}
            disabled={saving}
          >
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={!canSave || saving}
          >
            {saving ? "Salvataggio…" : isEditing ? "Salva modifiche" : "Crea corso"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────

export default function AdminLearningPaths() {
  const { user }    = useAuth();
  const isAdminUser = isAdmin(user?.role);

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [busy,    setBusy]    = useState({});

  // Stato form (null = form chiuso)
  const [editingCourse, setEditingCourse] = useState(null); // corso in modifica o {} per nuovo
  const [form,          setForm]          = useState(null);
  const [saving,        setSaving]        = useState(false);

  // ─── Carica lista ──────────────────────────────────────────────────────────
  // Usa l'endpoint pubblico: restituisce solo i corsi pubblicati.
  // Nota dal handoff: un endpoint admin che include i disattivati è pianificato
  // per una versione futura. Per ora mostriamo solo i pubblicati.

  const load = useCallback(async () => {
    if (!isAdminUser) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchLearningPaths();
      setItems(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Errore caricamento");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminUser]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Apri form nuovo corso ─────────────────────────────────────────────────

  function openNew() {
    setEditingCourse({});
    setForm({ ...EMPTY_FORM });
  }

  // ─── Apri form modifica ────────────────────────────────────────────────────

  function openEdit(course) {
    setEditingCourse(course);
    setForm({
      title:            course.title            || "",
      description:      course.description      || "",
      category:         course.category         || "ONBOARDING",
      target_role:      course.targetRole        || "ALL",
      type:             course.type             || "FREE",
      provider:         course.provider         || "YOUTUBE",
      external_url:     course.externalUrl       || "",
      thumbnail_url:    course.thumbnailUrl      || "",
      duration_minutes: course.durationMinutes  != null ? String(course.durationMinutes) : "",
      sort_order:       course.sortOrder        ?? 0,
      is_published:     course.isPublished      ?? false,
    });
  }

  // ─── Chiudi form ──────────────────────────────────────────────────────────

  function closeForm() {
    setEditingCourse(null);
    setForm(null);
  }

  // ─── Salva (crea o modifica) ───────────────────────────────────────────────

  async function handleSave() {
    if (!form) return;
    const errors = validate(form);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const body = buildBody(form);
      const isEditing = editingCourse?.id != null;

      if (isEditing) {
        const updated = await updateLearningPath(editingCourse.id, body);
        // Aggiornamento ottimistico: sostituisce il corso nella lista
        setItems(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await createLearningPath(body);
        // Se pubblicato subito appare in lista, altrimenti non è ancora visibile
        // (l'endpoint pubblico mostra solo i pubblicati — handoff §5.2)
        if (created.isPublished) {
          setItems(prev => [...prev, created]);
        }
        alert(
          created.isPublished
            ? "Corso creato e pubblicato ✅"
            : "Corso creato come bozza. Non è ancora visibile nel catalogo pubblico."
        );
      }
      closeForm();
    } catch (err) {
      const st  = err?.response?.status;
      const msg = err?.response?.data?.error
        || (err?.response?.data?.details || []).join(", ")
        || err?.message
        || "Errore";
      if (st === 400) alert("Dati non validi: " + msg);
      else if (st === 401) alert("Sessione scaduta o non autorizzato.");
      else if (st === 403) alert("Permessi insufficienti (admin richiesto).");
      else alert(`Errore: ${msg}`);
      console.error("AdminLearningPaths save error:", err);
    } finally {
      setSaving(false);
    }
  }

  // ─── Disattiva corso (soft delete) ────────────────────────────────────────

  async function handleDeactivate(course) {
    const confirmed = window.confirm(
      `Disattivare "${course.title}"?\n\nIl corso non sarà più visibile nel catalogo pubblico. Potrai riattivarlo in qualsiasi momento modificandolo.`
    );
    if (!confirmed) return;

    setBusy(b => ({ ...b, [course.id]: true }));
    try {
      await deactivateLearningPath(course.id);
      // Rimozione ottimistica: il corso non è più pubblicato, sparisce dalla lista
      setItems(prev => prev.filter(c => c.id !== course.id));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Errore";
      alert(`Errore durante la disattivazione: ${msg}`);
      console.error("AdminLearningPaths deactivate error:", err);
    } finally {
      setBusy(b => ({ ...b, [course.id]: false }));
    }
  }

  // ─── Guard ruolo ──────────────────────────────────────────────────────────

  if (!isAdminUser) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <div className="callout error">Permessi insufficienti (richiesto ruolo admin).</div>
        </div>
      </section>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="page-section page-text">
      <div className="container">

        {/* Header pagina */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Gestione corsi</h2>
            <p className="muted small" style={{ marginTop: 4 }}>
              {items.length > 0
                ? `${items.length} corso${items.length > 1 ? "i pubblicati" : " pubblicato"}`
                : "Catalogo corsi"}
              {" · "}
              <span style={{ fontStyle: "italic" }}>
                I corsi disattivati non sono visibili in questa lista (endpoint admin completo pianificato).
              </span>
            </p>
          </div>
          <div className="page-actions" style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline btn-pill"
              onClick={load}
              disabled={loading}
            >
              Aggiorna
            </button>
            <button
              className="btn btn-primary"
              onClick={openNew}
            >
              + Nuovo corso
            </button>
          </div>
        </div>

        {/* Feedback */}
        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && !loading && (
          <div className="callout error" role="alert">
            {error}
            <button className="btn btn-outline btn-small" onClick={load} style={{ marginLeft: 12 }}>
              Riprova
            </button>
          </div>
        )}

        {/* Lista vuota */}
        {!loading && !error && items.length === 0 && (
          <div className="dynamic-empty">
            <div className="dynamic-empty__icon">📚</div>
            <div className="dynamic-empty__text">
              Nessun corso pubblicato. Crea il primo con "+ Nuovo corso".
            </div>
          </div>
        )}

        {/* Lista corsi */}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((course) => (
            <li key={course.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "start",
              }}>

                {/* Info corso */}
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    {course.title}
                    {/* Badge tipo inline nel titolo */}
                    <span
                      className={`chip ${course.type === "PREMIUM" ? "chip-premium" : "chip-free"}`}
                      style={{ marginLeft: 8, verticalAlign: "middle" }}
                    >
                      {course.type === "PREMIUM" ? "Premium" : "Gratuito"}
                    </span>
                  </div>
                  <div className="muted small">
                    ID: {course.id}
                    {" · "}{CATEGORY_LABELS[course.category] || course.category}
                    {" · "}{PROVIDER_LABELS[course.provider] || course.provider}
                    {" · "}{ROLE_LABELS[course.targetRole] || course.targetRole}
                    {course.durationMinutes != null && ` · ${course.durationMinutes} min`}
                    {course.sortOrder != null && ` · ordine: ${course.sortOrder}`}
                  </div>
                  {course.description && (
                    <div className="muted small" style={{ marginTop: 4, fontStyle: "italic" }}>
                      {course.description.length > 120
                        ? course.description.slice(0, 120) + "…"
                        : course.description}
                    </div>
                  )}
                  {/* URL esterno — troncato per leggibilità */}
                  <div className="muted small" style={{ marginTop: 4 }}>
                    <a
                      href={course.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}
                    >
                      {course.externalUrl?.length > 60
                        ? course.externalUrl.slice(0, 60) + "…"
                        : course.externalUrl}
                    </a>
                  </div>
                </div>

                {/* Azioni */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>

                  {/* Modifica */}
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => openEdit(course)}
                    disabled={!!busy[course.id]}
                    title="Modifica corso"
                  >
                    Modifica
                  </button>

                  {/* Disattiva — etichettato chiaramente come "Disattiva", non "Elimina" */}
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => handleDeactivate(course)}
                    disabled={!!busy[course.id]}
                    title="Disattiva corso — il record non verrà eliminato"
                  >
                    {busy[course.id] ? "…" : "Disattiva"}
                  </button>

                </div>
              </div>
            </li>
          ))}
        </ul>

      </div>

      {/* Form modale — montato solo quando aperto */}
      {form !== null && (
        <CourseForm
          form={form}
          onChange={setForm}
          saving={saving}
          onSave={handleSave}
          onCancel={closeForm}
          isEditing={editingCourse?.id != null}
        />
      )}

    </section>
  );
}
