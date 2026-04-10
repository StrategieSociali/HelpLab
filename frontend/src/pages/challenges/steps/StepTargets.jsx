/**
 * StepTargets.jsx
 * ---------------
 * Step 2 del wizard di creazione challenge.
 * Gestisce target quantitativo e definizione dei task.
 *
 * AGGIORNAMENTO SPRINT 1:
 * Ogni task creato riceve automaticamente un payload_schema
 * dedotto dall'impact_type scelto nello Step 1 (StepDetails).
 *
 * AGGIORNAMENTO SPRINT NUOTO:
 * L'organizzatore può ora personalizzare label, hint e placeholder
 * per ogni campo del payload_schema. Se non compilati, il form del
 * volontario usa i testi di default (fallback i18n in ChallengeSubmitPage).
 * Aggiunto pulsante "Rimuovi task" mancante.
 */

import React, { useState } from "react";

// ─── Mappatura impact_type → payload_schema ───────────────────────────────────
/**
 * Definisce i campi tecnici che ogni submission di questo tipo deve raccogliere.
 * label/hint/placeholder NON sono definiti qui — vengono personalizzati
 * dall'organizzatore nella TaskCard. Se non compilati, ChallengeSubmitPage
 * usa il proprio fallback i18n (retrocompatibilità garantita).
 *
 * Per aggiungere un nuovo tipo di impatto:
 * 1. Aggiungi la <option> in StepDetails.jsx
 * 2. Aggiungi la voce qui con i fields tecnici
 * 3. Verifica che ChallengeSubmitPage gestisca i nuovi nomi campo
 */
const IMPACT_SCHEMA_MAP = {
  mobility: {
    fields: [
      { name: "km_percorsi", type: "number",    min: 0.1, required: true },
      { name: "vehicle_id",  type: "string",              required: true },
      { name: "evidences",   type: "url_array", minItems: 1, required: true },
    ],
  },
  no_waste: {
    fields: [
      { name: "kg_rifiuti", type: "number",    min: 0.1, required: true },
      { name: "evidences",  type: "url_array", minItems: 2, required: true },
    ],
  },
  tree_planting: {
    fields: [
      { name: "num_alberi", type: "number",    min: 1,   required: true },
      { name: "evidences",  type: "url_array", minItems: 1, required: true },
    ],
  },
  // Per tutti gli altri tipi: solo evidenze fotografiche
  _default: {
    fields: [
      { name: "evidences", type: "url_array", minItems: 1, required: true },
    ],
  },
};

function getPayloadSchema(impactType) {
  return IMPACT_SCHEMA_MAP[impactType] || IMPACT_SCHEMA_MAP._default;
}

/**
 * Label human-friendly per il riepilogo dati raccolti (sola lettura).
 * Speculare a fieldLabel() in ChallengeSubmitPage.jsx.
 */
const FIELD_LABELS = {
  km_percorsi: "Km percorsi",
  vehicle_id:  "Mezzo alternativo",
  evidences:   "Foto evidenza",
  kg_rifiuti:  "Kg rifiuti raccolti",
  num_alberi:  "Numero alberi piantati",
};

// ─── Componente principale ────────────────────────────────────────────────────
export default function StepTargets({ value = {}, onChange }) {
  const v = value || {};
  const target = v.target || {};
  const tasks = Array.isArray(v.tasks) ? v.tasks : [];
  const impactType = v.impact_type || "";

  const set = (patch) => onChange(patch);
  const setTarget = (patch) => onChange({ target: { ...target, ...patch } });

  // ── Aggiunta task con payload_schema automatico ──────────────────────────
  const addTask = () => {
    const schema = getPayloadSchema(impactType);
    set({
      tasks: [
        ...tasks,
        {
          id: `t${Date.now()}`, // id univoco basato su timestamp
          label: "",
          evidence_required: true,
          evidence_types: ["photo"],
          verification: "judge",
          payload_schema: schema,
        },
      ],
    });
  };

  // ── Rimozione task ────────────────────────────────────────────────────────
  const removeTask = (index) => {
    const copy = tasks.slice();
    copy.splice(index, 1);
    set({ tasks: copy });
  };

  const updTask = (i, patch) => {
    const copy = tasks.slice();
    copy[i] = { ...copy[i], ...patch };
    set({ tasks: copy });
  };

  /**
   * Aggiorna un singolo campo del payload_schema di un task.
   * Modifica solo label/hint/placeholder — i campi tecnici (type, min, required)
   * non vengono mai toccati dall'organizzatore.
   *
   * @param {number} taskIndex  - indice del task nell'array tasks
   * @param {number} fieldIndex - indice del campo nel payload_schema.fields
   * @param {string} prop       - "label" | "hint" | "placeholder"
   * @param {string} val        - valore inserito dall'organizzatore
   */
  const updTaskField = (taskIndex, fieldIndex, prop, val) => {
    const copy = tasks.slice();
    const task = { ...copy[taskIndex] };
    const fields = (task.payload_schema?.fields || []).map((f, i) => {
      if (i !== fieldIndex) return f;
      // Aggiorna solo la proprietà richiesta; mantieni tutto il resto invariato
      const updated = { ...f, [prop]: val };
      // Se il valore è stringa vuota, rimuovi la proprietà del tutto
      // così il backend non salva stringhe vuote e il fallback i18n funziona
      if (val.trim() === "") delete updated[prop];
      return updated;
    });
    task.payload_schema = { ...task.payload_schema, fields };
    copy[taskIndex] = task;
    set({ tasks: copy });
  };

  // Validazione: almeno 1 task con evidence_required
  const tasksOk =
    tasks.length >= 1 && tasks.some((t) => t?.evidence_required);

  return (
    <>
      <h3>2) Obiettivi & verifica</h3>

      {/* Avviso se impact_type non è ancora stato scelto */}
      {!impactType && (
        <div className="callout neutral" style={{ marginBottom: 12 }}>
          Torna allo Step 1 e scegli il <strong>tipo di impatto</strong> prima
          di aggiungere i task. Lo schema dei dati raccolti dai volontari
          dipende da questa scelta.
        </div>
      )}

      <div className="form-grid">
        {/* TARGET QUANTITATIVO */}
        <div className="form-row">
          <label>
            Tipo target
            <input
              className="control"
              placeholder="quantità | area | numero | misto"
              value={target.kind || ""}
              onChange={(e) => setTarget({ kind: e.target.value })}
            />
          </label>

          <label>
            Unità
            <input
              className="control"
              placeholder="kg | m2 | sacchi | azioni"
              value={target.unit || ""}
              onChange={(e) => setTarget({ unit: e.target.value })}
            />
          </label>

          <label>
            Quantità
            <input
              type="number"
              className="control"
              min={0}
              value={target.amount ?? ""}
              onChange={(e) =>
                setTarget({
                  amount:
                    e.target.value === ""
                      ? null
                      : Number(e.target.value) || 0,
                })
              }
            />
          </label>
        </div>

        {/* TASK */}
        <div style={{ marginTop: 8 }}>
          <h4>Task (almeno 1 con evidenze)</h4>

          {tasks.map((t, i) => (
            <TaskCard
              key={t.id}
              task={t}
              index={i}
              onUpdate={(patch) => updTask(i, patch)}
              onRemove={() => removeTask(i)}
              onUpdateField={(fieldIndex, prop, val) =>
                updTaskField(i, fieldIndex, prop, val)
              }
            />
          ))}

          <button
            className="btn btn-outline"
            type="button"
            onClick={addTask}
            disabled={!impactType}
            title={
              !impactType
                ? "Scegli prima il tipo di impatto nello Step 1"
                : undefined
            }
          >
            + Aggiungi task
          </button>

          <div
            className={`hint ${tasksOk ? "ok" : "warn"}`}
            style={{ marginTop: 6 }}
          >
            {tasksOk
              ? "OK"
              : "Aggiungi almeno 1 task e assicurati che richieda evidenze"}
          </div>
        </div>

        {/* NOTE VERIFICA */}
        <label>
          Note per la verifica
          <textarea
            className="control"
            rows={3}
            value={v.verification_notes || ""}
            onChange={(e) => set({ verification_notes: e.target.value })}
          />
        </label>
      </div>
    </>
  );
}

// ─── Componente: card singolo task ────────────────────────────────────────────
/**
 * Mostra il form di configurazione di un task.
 * Include:
 * - Campo label del task
 * - Checkbox evidence_required e select verifica
 * - Riepilogo campi raccolti (sola lettura, da payload_schema)
 * - Sezione collassabile per personalizzare label/hint/placeholder
 *   di ogni campo che il volontario vedrà nel form di submission
 * - Pulsante rimozione task
 *
 * UX note: la personalizzazione è collassata di default per non
 * appesantire il wizard per chi non ne ha bisogno. Chi crea una
 * challenge generica non vede complessità aggiuntiva.
 */
function TaskCard({ task, index, onUpdate, onRemove, onUpdateField }) {
  const [showCustomize, setShowCustomize] = useState(false);

  const labelOk = (task.label || "").trim().length >= 3;
  const fields = task.payload_schema?.fields || [];

  return (
    <div className="card" style={{ padding: 12, marginBottom: 8 }}>

      {/* Header: etichetta task + pulsante rimozione */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            className={`control ${
              labelOk
                ? "input-valid"
                : task.label
                ? "input-invalid"
                : ""
            }`}
            placeholder="Descrizione task (min 3 caratteri)"
            value={task.label || ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
          <div className={`hint ${labelOk ? "ok" : "warn"}`}>
            {labelOk ? "OK" : "Minimo 3 caratteri"}
          </div>
        </div>

        {/* Pulsante rimozione — stesso pattern di PhotoUploadField */}
        <button
          type="button"
          className="btn btn-outline btn-small"
          onClick={onRemove}
          aria-label={`Rimuovi task ${index + 1}`}
          style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.5)", flexShrink: 0 }}
        >
          Rimuovi
        </button>
      </div>

      {/* Configurazione evidenze e verifica */}
      <div className="form-row" style={{ marginTop: 4 }}>
        <label>
          <input
            type="checkbox"
            checked={!!task.evidence_required}
            onChange={(e) => onUpdate({ evidence_required: e.target.checked })}
          />{" "}
          Richiede evidenze
        </label>

        <select
          className="control"
          value={task.verification || "judge"}
          onChange={(e) => onUpdate({ verification: e.target.value })}
        >
          <option value="user">Utente</option>
          <option value="judge">Giudice</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      {/* Riepilogo dati raccolti — sola lettura */}
      {fields.length > 0 && (
        <div
          className="callout neutral"
          style={{ marginTop: 8, padding: "6px 10px" }}
        >
          <small className="muted">
            <strong>Dati raccolti dai volontari:</strong>{" "}
            {fields
              .map((f) => FIELD_LABELS[f.name] || f.name)
              .join(", ")}
            {fields.some((f) => f.name === "vehicle_id") && (
              <> (con calcolo CO₂ evitata)</>
            )}
          </small>
        </div>
      )}

      {/* Toggle personalizzazione testi ─────────────────────────────────────
          Collassato di default per non appesantire il wizard.
          Visibile solo se ci sono campi nel payload_schema. */}
      {fields.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => setShowCustomize((v) => !v)}
            aria-expanded={showCustomize}
          >
            {showCustomize
              ? "▲ Nascondi personalizzazione testi"
              : "▼ Personalizza testi per i volontari"}
          </button>

          {/* UX note: il testo "opzionale" sotto il toggle ricorda
              all'organizzatore che può ignorare questa sezione. */}
          {!showCustomize && (
            <div className="hint" style={{ marginTop: 4 }}>
              Opzionale — se non compilato, il form userà i testi standard.
            </div>
          )}

          {showCustomize && (
            <div style={{ marginTop: 10 }}>
              <div className="hint" style={{ marginBottom: 10 }}>
                Personalizza i testi che il volontario vedrà nel form di
                invio contributo. Tutti i campi sono opzionali: se lasciati
                vuoti viene usato il testo standard della piattaforma.
              </div>

              {fields.map((field, fi) => (
                <FieldCustomizer
                  key={field.name}
                  field={field}
                  onChange={(prop, val) => onUpdateField(fi, prop, val)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente: personalizzazione singolo campo ──────────────────────────────
/**
 * Mostra tre input (label, hint, placeholder) per personalizzare
 * i testi di un singolo campo del payload_schema.
 *
 * Il nome tecnico del campo (es. "km_percorsi") non è esposto —
 * l'organizzatore vede solo la label human-friendly da FIELD_LABELS.
 *
 * I campi tecnici (type, min, required, minItems) non sono modificabili.
 */
function FieldCustomizer({ field, onChange }) {
  const displayName = FIELD_LABELS[field.name] || field.name;

  // url_array non ha placeholder (è un campo upload foto, non un input testo)
  const hasPlaceholder = field.type !== "url_array";

  return (
    <div
      className="card"
      style={{
        padding: "10px 12px",
        marginBottom: 8,
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div className="hint" style={{ marginBottom: 8, fontWeight: 600 }}>
        Campo: {displayName}
      </div>

      <div className="form-grid">
        <label>
          Label
          <input
            className="control"
            placeholder="Testo mostrato sopra il campo"
            value={field.label || ""}
            onChange={(e) => onChange("label", e.target.value)}
          />
          <div className="hint">
            Es. &ldquo;Quanti km hai percorso per arrivare alla piscina?&rdquo;
          </div>
        </label>

        <label>
          Testo di aiuto (hint)
          <input
            className="control"
            placeholder="Istruzione breve mostrata sotto il campo"
            value={field.hint || ""}
            onChange={(e) => onChange("hint", e.target.value)}
          />
          <div className="hint">
            Es. &ldquo;Inserisci la distanza approssimativa da casa tua alla piscina&rdquo;
          </div>
        </label>

        {hasPlaceholder && (
          <label>
            Placeholder
            <input
              className="control"
              placeholder="Testo dentro il campo (sparisce quando si digita)"
              value={field.placeholder || ""}
              onChange={(e) => onChange("placeholder", e.target.value)}
            />
            <div className="hint">
              Es. &ldquo;Es. 8.5&rdquo;
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
