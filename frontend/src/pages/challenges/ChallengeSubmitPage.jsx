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
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { routes } from "@/routes";
import "../../styles/dynamic-pages.css";

// ─── Costanti Cloudinary ──────────────────────────────────────────────────────
// Configurate tramite variabili d'ambiente nel file .env
const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dmxlulwdv";
const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "HelpLab";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// ─── Utility: upload singolo file su Cloudinary ───────────────────────────────
/**
 * Carica un file su Cloudinary tramite upload unsigned.
 * @param {File} file - Il file da caricare
 * @returns {Promise<string>} URL pubblico del file caricato
 */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload foto non riuscito. Riprova.");
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
function PhotoUploadField({ index, url, onUploaded, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione tipo file lato frontend (il server Cloudinary valida anche lui)
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic)$/i)) {
      setUploadError("Formato non supportato. Usa JPG, PNG o WEBP.");
      return;
    }

    // Dimensione max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Il file è troppo grande. Massimo 10 MB per foto.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const uploadedUrl = await uploadToCloudinary(file);
      onUploaded(index, uploadedUrl);
    } catch (err) {
      setUploadError(err.message || "Errore durante il caricamento.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-upload-field">
      {url ? (
        // ── Foto caricata: mostra anteprima ──
        <div className="photo-preview-row">
          <img
            src={url}
            alt={`Evidenza ${index + 1}`}
            className="photo-thumb"
          />
          <div className="photo-preview-info">
            <span className="photo-uploaded-label">✓ Foto caricata</span>
            <button
              type="button"
              className="btn btn-outline btn-small"
              onClick={() => onRemove(index)}
              aria-label={`Rimuovi foto ${index + 1}`}
            >
              Rimuovi
            </button>
          </div>
        </div>
      ) : (
        // ── Nessuna foto: bottone di caricamento ──
        <label className="photo-upload-btn" aria-busy={uploading}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,.heic"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
            aria-label={`Carica foto ${index + 1}`}
          />
          {uploading ? (
            <span className="upload-loading">
              <span className="spinner-inline" aria-hidden="true" />
              Caricamento in corso…
            </span>
          ) : (
            <span>📷 Carica foto {index + 1}</span>
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
  const { id: challengeId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  // ── Stato: task della challenge ──
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");

  // ── Stato: opzioni mezzo alternativo (CO2 factors) ──
  const [mobilityOptions, setMobilityOptions] = useState([]);
  const [mobilityLoading, setMobilityLoading] = useState(false);

  // ── Stato: form ──
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  /**
   * payloadFields: oggetto dinamico che contiene i valori dei campi
   * definiti nel payload_schema del task selezionato.
   * Es: { km_percorsi: "", vehicle_id: "", evidences: [] }
   *
   * Viene resettato ogni volta che l'utente cambia task.
   */
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
          setTasksError("Questa challenge non ha ancora task definiti.");
        }
      } catch (err) {
        console.error("Errore caricamento task:", err?.response || err);
        setTasksError("Impossibile caricare i task della challenge.");
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
  }, [challengeId]);

  // ── Caricamento opzioni mobilità (condizionale) ───────────────────────────
  /**
   * Chiamata solo se lo schema del task selezionato contiene un campo
   * con name "vehicle_id". Questo rende il componente generico:
   * task futuri senza mobilità non faranno mai questa chiamata.
   */
  const loadMobilityOptions = useCallback(async () => {
    if (mobilityOptions.length > 0) return; // evita chiamate duplicate
    setMobilityLoading(true);
    try {
      const { data } = await api.get("/v1/co2-factors/mobility");
      setMobilityOptions(data?.items || []);
    } catch (err) {
      console.error("Errore caricamento opzioni mobilità:", err);
      // Non bloccante: il form resta usabile, il dropdown sarà vuoto
    } finally {
      setMobilityLoading(false);
    }
  }, [mobilityOptions.length]);

  // ── Cambio task: reset payload e caricamento condizionale ────────────────
  const handleTaskChange = (taskId) => {
    setSelectedTaskId(taskId);
    setError("");

    if (!taskId) {
      setPayloadFields({});
      return;
    }

    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;

    // Inizializza payloadFields con valori vuoti per ogni campo dello schema
    const fields = task.payload_schema?.fields || [];
    const initial = {};
    fields.forEach((field) => {
      if (field.type === "url_array") {
        // Partiamo con un array di stringhe vuote (una per ogni foto richiesta)
        initial[field.name] = Array(field.minItems || 1).fill("");
      } else {
        initial[field.name] = "";
      }
    });
    setPayloadFields(initial);

    // Carica le opzioni di mobilità se il task le richiede
    const needsMobility = fields.some((f) => f.name === "vehicle_id");
    if (needsMobility) {
      loadMobilityOptions();
    }
  };

  // ── Aggiornamento campo payload generico ──────────────────────────────────
  const handleFieldChange = (fieldName, value) => {
    setPayloadFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  // ── Foto: callback quando Cloudinary restituisce un URL ──────────────────
  const handlePhotoUploaded = (fieldName, photoIndex, url) => {
    setPayloadFields((prev) => {
      const updated = [...(prev[fieldName] || [])];
      updated[photoIndex] = url;
      return { ...prev, [fieldName]: updated };
    });
  };

  // ── Foto: rimozione ───────────────────────────────────────────────────────
  const handlePhotoRemove = (fieldName, photoIndex) => {
    setPayloadFields((prev) => {
      const updated = [...(prev[fieldName] || [])];
      updated[photoIndex] = "";
      return { ...prev, [fieldName]: updated };
    });
  };

  // ── Foto: aggiunta slot aggiuntivo ────────────────────────────────────────
  const handleAddPhoto = (fieldName) => {
    setPayloadFields((prev) => ({
      ...prev,
      [fieldName]: [...(prev[fieldName] || []), ""],
    }));
  };

  // ── Validazione frontend basata su payload_schema ─────────────────────────
  /**
   * Valida i campi del payload in base ai vincoli definiti nello schema.
   * Restituisce null se tutto è ok, altrimenti il messaggio di errore.
   */
  const validatePayload = (task) => {
    const fields = task.payload_schema?.fields || [];

    for (const field of fields) {
      const value = payloadFields[field.name];

      if (field.required) {
        if (field.type === "url_array") {
          const filled = (value || []).filter((v) => v.trim() !== "");
          if (filled.length < (field.minItems || 1)) {
            return `Carica almeno ${field.minItems || 1} foto come evidenza.`;
          }
        } else if (value === "" || value === null || value === undefined) {
          // Usa label leggibile se disponibile, altrimenti il nome del campo
          const label = fieldLabel(field.name);
          return `Il campo "${label}" è obbligatorio.`;
        }
      }

      if (field.type === "number" && value !== "") {
        const num = parseFloat(value);
        if (isNaN(num) || (field.min !== undefined && num < field.min)) {
          return `Inserisci un valore valido per "${fieldLabel(field.name)}" (minimo: ${field.min}).`;
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
      setError("Devi essere autenticato per inviare un contributo.");
      return;
    }

    if (!selectedTaskId) {
      setError("Seleziona il task a cui si riferisce il tuo contributo.");
      return;
    }

    const task = tasks.find((t) => String(t.id) === String(selectedTaskId));

    // Validazione dinamica basata su schema
    const validationError = validatePayload(task);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Costruisce il payload finale:
    // - converte i campi number da stringa a numero
    // - filtra gli slot foto vuoti dagli array url_array
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

      // Gestisce errori strutturati dal backend (array di messaggi)
      const backendErrors = err?.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        setError(backendErrors.join(" — "));
      } else {
        setError(
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Invio non riuscito. Riprova tra qualche istante."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render del task selezionato ───────────────────────────────────────────
  const selectedTask = tasks.find(
    (t) => String(t.id) === String(selectedTaskId)
  );
  const schemaFields = selectedTask?.payload_schema?.fields || [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text">
      <div className="container space-y-6">

        {/* Titolo */}
        <header>
          <h1 className="page-title">Invia il tuo contributo</h1>
          <p className="page-subtitle">
            Scegli il task a cui si riferisce la tua attività, raccontaci
            cosa hai fatto e carica le evidenze richieste. Il contributo
            sarà validato da un giudice per garantire correttezza e
            trasparenza.
          </p>
        </header>

        {/* Errore globale form */}
        {error && (
          <div className="callout error" role="alert">
            {error}
          </div>
        )}

        {/* Caricamento task */}
        {tasksLoading && (
          <div className="callout neutral">
            Caricamento task della challenge…
          </div>
        )}

        {tasksError && !tasksLoading && (
          <div className="callout error">{tasksError}</div>
        )}

        {/* Form — mostrato solo se ci sono task disponibili */}
        {!tasksLoading && tasks.length > 0 && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="card">
              <div className="form-grid">

                {/* ── SELEZIONE TASK ────────────────────────────────────── */}
                <div className="form-group">
                  <label htmlFor="taskSelect">
                    A quale obiettivo si riferisce il tuo contributo?
                  </label>

                  <select
                    id="taskSelect"
                    className="control"
                    value={selectedTaskId}
                    onChange={(e) => handleTaskChange(e.target.value)}
                    required
                  >
                    <option value="">Seleziona un task…</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || `Task #${t.id}`}
                      </option>
                    ))}
                  </select>

                  <div className="hint">
                    Ogni contributo deve essere collegato a uno degli
                    obiettivi della challenge.
                  </div>

                  {/* Descrizione del task selezionato */}
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
                  />
                ))}

                {/* ── DESCRIZIONE ATTIVITÀ (sempre presente, opzionale) ── */}
                {selectedTaskId && (
                  <div className="form-group">
                    <label htmlFor="activityDescription">
                      Descrizione attività{" "}
                      <span className="muted">(opzionale)</span>
                    </label>

                    <textarea
                      id="activityDescription"
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      placeholder="Aggiungi dettagli su cosa hai fatto, se vuoi"
                      rows={3}
                    />

                    <div className="hint">
                      Non è obbligatoria, ma aiuta il giudice a capire
                      meglio il tuo contributo.
                    </div>
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
                    {loading ? "Invio in corso…" : "Invia contributo"}
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
 *
 * Tipi supportati:
 * - "number"    → input numerico con eventuale vincolo min
 * - "string"    → input testo; se name === "vehicle_id" diventa select mezzo
 * - "url_array" → lista di upload foto verso Cloudinary
 *
 * Questo componente è generico: non conosce la logica di business specifica
 * della biciclettata. Funzionerà per qualsiasi task futuro con payload_schema.
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
}) {
  const label = fieldLabel(field.name);

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
          placeholder={fieldPlaceholder(field.name)}
          aria-required={field.required}
        />

        <div className="hint">{fieldHint(field.name)}</div>
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
            Caricamento opzioni…
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
            <option value="">Seleziona un'opzione…</option>
            {mobilityOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <div className="hint">
          Indica con quale mezzo saresti venuto se non avessi usato la
          bicicletta. Serve per calcolare le emissioni evitate.
        </div>
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
          {fieldHint(field.name, minItems)}
        </div>

        {/* Lista slot foto */}
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
            />
          ))}
        </div>

        {/* Bottone aggiungi altra foto (max 5 per task) */}
        {photos.length < 5 && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 8 }}
            onClick={() => onAddPhoto(field.name)}
          >
            + Aggiungi un'altra foto
          </button>
        )}

        {/* Contatore foto caricate */}
        {uploadedCount > 0 && (
          <div className="hint" style={{ marginTop: 6 }}>
            {uploadedCount} foto caricata{uploadedCount !== 1 ? "e" : ""} su{" "}
            {photos.length} totali.
            {uploadedCount < minItems && (
              <span className="text-warning">
                {" "}
                Ne mancano ancora {minItems - uploadedCount}.
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Fallback: input testo generico per tipi non gestiti ──────────────────
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

// ─── Utility: label leggibili per i campi del payload ─────────────────────────
/**
 * Converte il nome tecnico del campo in un'etichetta leggibile per l'utente.
 * Centralizzato qui per facilità di traduzione futura (i18n).
 */
function fieldLabel(name) {
  const labels = {
    km_percorsi: "Quanti km hai percorso in bicicletta?",
    vehicle_id:  "Con quale mezzo saresti venuto altrimenti?",
    evidences:   "Foto del tuo percorso",
    kg_rifiuti:  "Quanti kg di rifiuti hai raccolto?",
  };
  return labels[name] || name;
}

function fieldPlaceholder(name) {
  const placeholders = {
    km_percorsi: "Es. 12.5",
    kg_rifiuti:  "Es. 3.2",
  };
  return placeholders[name] || "";
}

function fieldHint(name, minItems) {
  const hints = {
    km_percorsi:
      "Inserisci la distanza totale percorsa in bicicletta per raggiungere il luogo dell'evento.",
    vehicle_id:
      "Indica con quale mezzo saresti venuto se non avessi usato la bicicletta.",
    evidences:
      `Carica almeno ${minItems || 1} foto che dimostri la tua partecipazione. ` +
      "Puoi fotografare la bici con il paesaggio sullo sfondo o il punto di arrivo.",
    kg_rifiuti:
      "Indica il peso approssimativo dei rifiuti raccolti e correttamente smaltiti.",
  };
  return hints[name] || "";
}
