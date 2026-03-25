/**
 * ChallengeSubmitPage.jsx
 * ----------------------
 * Pagina di invio contributo da parte di un volontario.
 *
 * Scopo:
 * - Consentire al volontario di raccontare cosa ha fatto
 * - Collegare la submission a un task specifico della challenge
 * - Raccogliere evidenze tramite upload foto (Cloudinary) e campi dinamici
 * - Preparare i dati per la validazione del giudice
 *
 * Flusso:
 * 1. Carica i task della challenge (con payload_schema)
 * 2. Il volontario sceglie a quale task si riferisce il contributo
 * 3. Il form si adatta dinamicamente ai campi dello schema del task scelto
 * 4. Se il task richiede "vehicle_id", carica il dropdown da /co2-factors/mobility
 * 5. Le foto vengono caricate direttamente su Cloudinary (unsigned preset)
 * 6. Invia → il giudice approverà o rifiuterà
 *
 * Dipendenze esterne:
 * - Cloudinary (upload diretto, unsigned): cloud_name e upload_preset da env
 *   VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET
 *
 * Aggiornato per Sprint 1 — supporto payload_schema dinamico e upload foto.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { routes } from "@/routes";
import "../../styles/dynamic-pages.css";

// ─── Costanti Cloudinary ──────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dmxlulwdv";
const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "HelpLab";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// ─── Utility: upload singolo file su Cloudinary ───────────────────────────────
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("upload_failed");
  }

  const data = await response.json();
  return data.secure_url;
}

// ─── Componente: campo upload foto ────────────────────────────────────────────
/**
 * Gestisce l'upload di una singola foto verso Cloudinary.
 * Mostra anteprima, stato di caricamento e possibilità di rimozione.
 *
 * UX note: usiamo input file nascosto con bottone custom per compatibilità
 * mobile ottimale (iOS Safari e Android Chrome gestiscono meglio il click
 * su un elemento button che su un input[type=file] direttamente).
 */
function PhotoUploadField({ index, url, onUploaded, onRemove, t }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic)$/i)) {
      setUploadError(t("photo.errors.format"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("photo.errors.size"));
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const uploadedUrl = await uploadToCloudinary(file);
      onUploaded(index, uploadedUrl);
    } catch (err) {
      setUploadError(t("photo.errors.upload"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-upload-field">
      {url ? (
        <div className="photo-preview-row">
          <img
            src={url}
            alt={t("photo.altText", { index: index + 1 })}
            className="photo-thumb"
          />
          <div className="photo-preview-info">
            <span className="photo-uploaded-label">{t("photo.uploaded")}</span>
            <button
              type="button"
              className="btn btn-outline btn-small"
              onClick={() => onRemove(index)}
              aria-label={t("photo.removeAria", { index: index + 1 })}
            >
              {t("photo.remove")}
            </button>
          </div>
        </div>
      ) : (
        <label className="photo-upload-btn" aria-busy={uploading}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,.heic"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
            aria-label={t("photo.uploadAria", { index: index + 1 })}
          />
          {uploading ? (
            <span className="upload-loading">
              <span className="spinner-inline" aria-hidden="true" />
              {t("photo.uploading")}
            </span>
          ) : (
            <span>📷 {t("photo.uploadBtn", { index: index + 1 })}</span>
          )}
        </label>
      )}

      {uploadError && (
        <div className="callout error" role="alert" style={{ marginTop: 6 }}>
          {uploadError}
        </div>
      )}
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function ChallengeSubmitPage() {
  const { t } = useTranslation("pages/challengeSubmit", { useSuspense: false });
  const { id: challengeId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");
  const [mobilityOptions, setMobilityOptions] = useState([]);
  const [mobilityLoading, setMobilityLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [payloadFields, setPayloadFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Caricamento task della challenge ──────────────────────────────────────
  useEffect(() => {
    if (!challengeId) return;

    const loadTasks = async () => {
      setTasksLoading(true);
      setTasksError("");
      try {
        const { data } = await api.get(`/v1/challenges/${challengeId}/tasks`);
        const list = Array.isArray(data) ? data : [];
        setTasks(list);
        if (list.length === 0) {
          setTasksError(t("errors.noTasks"));
        }
      } catch (err) {
        console.error("Errore caricamento task:", err?.response || err);
        setTasksError(t("errors.loadTasks"));
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
  }, [challengeId]);

  // ── Caricamento opzioni mobilità (condizionale) ───────────────────────────
  const loadMobilityOptions = useCallback(async () => {
    if (mobilityOptions.length > 0) return;
    setMobilityLoading(true);
    try {
      const { data } = await api.get("/v1/co2-factors/mobility");
      setMobilityOptions(data?.items || []);
    } catch (err) {
      console.error("Errore caricamento opzioni mobilità:", err);
    } finally {
      setMobilityLoading(false);
    }
  }, [mobilityOptions.length]);

  // ── Cambio task ───────────────────────────────────────────────────────────
  const handleTaskChange = (taskId) => {
    setSelectedTaskId(taskId);
    setError("");

    if (!taskId) {
      setPayloadFields({});
      return;
    }

    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;

    const fields = task.payload_schema?.fields || [];
    const initial = {};
    fields.forEach((field) => {
      if (field.type === "url_array") {
        initial[field.name] = Array(field.minItems || 1).fill("");
      } else {
        initial[field.name] = "";
      }
    });
    setPayloadFields(initial);

    const needsMobility = fields.some((f) => f.name === "vehicle_id");
    if (needsMobility) {
      loadMobilityOptions();
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setPayloadFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handlePhotoUploaded = (fieldName, photoIndex, url) => {
    setPayloadFields((prev) => {
      const updated = [...(prev[fieldName] || [])];
      updated[photoIndex] = url;
      return { ...prev, [fieldName]: updated };
    });
  };

  const handlePhotoRemove = (fieldName, photoIndex) => {
    setPayloadFields((prev) => {
      const updated = [...(prev[fieldName] || [])];
      updated[photoIndex] = "";
      return { ...prev, [fieldName]: updated };
    });
  };

  const handleAddPhoto = (fieldName) => {
    setPayloadFields((prev) => ({
      ...prev,
      [fieldName]: [...(prev[fieldName] || []), ""],
    }));
  };

  // ── Validazione frontend basata su payload_schema ─────────────────────────
  const validatePayload = (task) => {
    const fields = task.payload_schema?.fields || [];

    for (const field of fields) {
      const value = payloadFields[field.name];

      if (field.required) {
        if (field.type === "url_array") {
          const filled = (value || []).filter((v) => v.trim() !== "");
          if (filled.length < (field.minItems || 1)) {
            return t("validation.minPhotos", { count: field.minItems || 1 });
          }
        } else if (value === "" || value === null || value === undefined) {
          const label = fieldLabel(field.name, t);
          return t("validation.required", { label });
        }
      }

      if (field.type === "number" && value !== "") {
        const num = parseFloat(value);
        if (isNaN(num) || (field.min !== undefined && num < field.min)) {
          return t("validation.minValue", {
            label: fieldLabel(field.name, t),
            min: field.min,
          });
        }
      }
    }

    return null;
  };

  // ── Invio form ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("errors.notAuthenticated"));
      return;
    }

    if (!selectedTaskId) {
      setError(t("errors.noTaskSelected"));
      return;
    }

    const task = tasks.find((t) => String(t.id) === String(selectedTaskId));
    const validationError = validatePayload(task);
    if (validationError) {
      setError(validationError);
      return;
    }

    const fields = task?.payload_schema?.fields || [];
    const builtPayload = {};

    fields.forEach((field) => {
      const value = payloadFields[field.name];
      if (field.type === "number") {
        builtPayload[field.name] = parseFloat(value);
      } else if (field.type === "url_array") {
        builtPayload[field.name] = (value || []).filter((v) => v.trim() !== "");
      } else {
        builtPayload[field.name] = value;
      }
    });

    setLoading(true);

    try {
      await api.post(`/v1/challenges/${challengeId}/submissions`, {
        task_id: Number(selectedTaskId),
        visibility: "participants",
        activity_description: activityDescription.trim() || undefined,
        payload: builtPayload,
      });

      navigate(`${routes.me.contributions}?challenge=${challengeId}`);
    } catch (err) {
      console.error("Errore invio submission:", err);

      const backendErrors = err?.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        setError(backendErrors.join(" — "));
      } else {
        setError(
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          t("errors.submitFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTask = tasks.find(
    (t) => String(t.id) === String(selectedTaskId)
  );
  const schemaFields = selectedTask?.payload_schema?.fields || [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text">
      <div className="container space-y-6">

        <header>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </header>

        {error && (
          <div className="callout error" role="alert">
            {error}
          </div>
        )}

        {tasksLoading && (
          <div className="callout neutral">
            {t("status.loadingTasks")}
          </div>
        )}

        {tasksError && !tasksLoading && (
          <div className="callout error">{tasksError}</div>
        )}

        {!tasksLoading && tasks.length > 0 && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="card">
              <div className="form-grid">

                {/* ── SELEZIONE TASK ────────────────────────────────────── */}
                <div className="form-group">
                  <label htmlFor="taskSelect">
                    {t("taskSelect.label")}
                  </label>

                  <select
                    id="taskSelect"
                    className="control"
                    value={selectedTaskId}
                    onChange={(e) => handleTaskChange(e.target.value)}
                    required
                  >
                    <option value="">{t("taskSelect.placeholder")}</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || `Task #${t.id}`}
                      </option>
                    ))}
                  </select>

                  <div className="hint">{t("taskSelect.hint")}</div>

                  {selectedTask?.description && (
                    <div
                      className="callout neutral"
                      style={{ marginTop: 8, padding: 10 }}
                    >
                      <small className="muted">
                        {selectedTask.description}
                      </small>
                    </div>
                  )}
                </div>

                {/* ── CAMPI DINAMICI DA payload_schema ─────────────────── */}
                {schemaFields.map((field) => (
                  <DynamicField
                    key={field.name}
                    field={field}
                    value={payloadFields[field.name]}
                    mobilityOptions={mobilityOptions}
                    mobilityLoading={mobilityLoading}
                    onFieldChange={handleFieldChange}
                    onPhotoUploaded={handlePhotoUploaded}
                    onPhotoRemove={handlePhotoRemove}
                    onAddPhoto={handleAddPhoto}
                    t={t}
                  />
                ))}

                {/* ── DESCRIZIONE ATTIVITÀ ──────────────────────────────── */}
                {selectedTaskId && (
                  <div className="form-group">
                    <label htmlFor="activityDescription">
                      {t("activityDescription.label")}{" "}
                      <span className="muted">({t("activityDescription.optional")})</span>
                    </label>

                    <textarea
                      id="activityDescription"
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      placeholder={t("activityDescription.placeholder")}
                      rows={3}
                    />

                    <div className="hint">{t("activityDescription.hint")}</div>
                  </div>
                )}
              </div>

              {/* CTA */}
              {selectedTaskId && (
                <div
                  className="cta-row"
                  style={{
                    marginTop: 24,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? t("cta.submitting") : t("cta.submit")}
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── Componente: campo dinamico ────────────────────────────────────────────────
/**
 * Renderizza un singolo campo del form in base al tipo definito nel payload_schema.
 * Tipi supportati: "number", "string" (con vehicle_id → select), "url_array"
 * Il parametro `t` viene passato dall'alto per rispettare le regole sugli hook.
 */
function DynamicField({
  field,
  value,
  mobilityOptions,
  mobilityLoading,
  onFieldChange,
  onPhotoUploaded,
  onPhotoRemove,
  onAddPhoto,
  t,
}) {
  const label = fieldLabel(field.name, t);

  // ── Campo numerico ────────────────────────────────────────────────────────
  if (field.type === "number") {
    return (
      <div className="form-group">
        <label htmlFor={`field-${field.name}`}>
          {label}
          {field.required && <span aria-hidden="true"> *</span>}
        </label>

        <input
          id={`field-${field.name}`}
          type="number"
          className="control"
          value={value ?? ""}
          onChange={(e) => onFieldChange(field.name, e.target.value)}
          min={field.min ?? 0}
          step="0.1"
          required={field.required}
          placeholder={fieldPlaceholder(field.name, t)}
          aria-required={field.required}
        />

        <div className="hint">{fieldHint(field.name, t)}</div>
      </div>
    );
  }

  // ── Dropdown mezzo di trasporto alternativo ───────────────────────────────
  if (field.type === "string" && field.name === "vehicle_id") {
    return (
      <div className="form-group">
        <label htmlFor="field-vehicle_id">
          {label}
          {field.required && <span aria-hidden="true"> *</span>}
        </label>

        {mobilityLoading ? (
          <div className="callout neutral">
            {t("mobility.loading")}
          </div>
        ) : (
          <select
            id="field-vehicle_id"
            className="control"
            value={value ?? ""}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            required={field.required}
            aria-required={field.required}
          >
            <option value="">{t("mobility.placeholder")}</option>
            {mobilityOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <div className="hint">{fieldHint("vehicle_id", t)}</div>
      </div>
    );
  }

  // ── Upload foto (url_array) ───────────────────────────────────────────────
  if (field.type === "url_array") {
    const photos = Array.isArray(value) ? value : [];
    const minItems = field.minItems || 1;
    const uploadedCount = photos.filter((p) => p.trim() !== "").length;

    return (
      <div className="form-group">
        <label>
          {label}
          {field.required && <span aria-hidden="true"> *</span>}
        </label>

        <div className="hint" style={{ marginBottom: 10 }}>
          {fieldHint(field.name, t, minItems)}
        </div>

        <div className="photo-upload-list">
          {photos.map((url, idx) => (
            <PhotoUploadField
              key={idx}
              index={idx}
              url={url}
              onUploaded={(photoIndex, uploadedUrl) =>
                onPhotoUploaded(field.name, photoIndex, uploadedUrl)
              }
              onRemove={(photoIndex) =>
                onPhotoRemove(field.name, photoIndex)
              }
              t={t}
            />
          ))}
        </div>

        {photos.length < 5 && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 8 }}
            onClick={() => onAddPhoto(field.name)}
          >
            {t("photo.addMore")}
          </button>
        )}

        {uploadedCount > 0 && (
          <div className="hint" style={{ marginTop: 6 }}>
            {t("photo.counter", { uploaded: uploadedCount, total: photos.length })}
            {uploadedCount < minItems && (
              <span className="text-warning">
                {" "}
                {t("photo.counterMissing", { missing: minItems - uploadedCount })}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Fallback: input testo generico ───────────────────────────────────────
  return (
    <div className="form-group">
      <label htmlFor={`field-${field.name}`}>
        {label}
        {field.required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={`field-${field.name}`}
        type="text"
        className="control"
        value={value ?? ""}
        onChange={(e) => onFieldChange(field.name, e.target.value)}
        required={field.required}
        aria-required={field.required}
      />
    </div>
  );
}

// ─── Utility: label, placeholder e hint per i campi del payload ───────────────
// `t` viene passato come parametro perché queste funzioni sono fuori
// dai componenti React e non possono usare hook direttamente.

function fieldLabel(name, t) {
  const key = `fields.${name}.label`;
  const result = t(key, { defaultValue: "" });
  return result || name;
}

function fieldPlaceholder(name, t) {
  return t(`fields.${name}.placeholder`, { defaultValue: "" });
}

function fieldHint(name, t, minItems) {
  return t(`fields.${name}.hint`, { count: minItems, defaultValue: "" });
}
