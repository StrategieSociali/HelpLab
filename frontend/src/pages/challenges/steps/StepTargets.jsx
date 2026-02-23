/**
 * StepTargets.jsx
 * ---------------
 * Step 2 del wizard di creazione challenge.
 * Gestisce target quantitativo e definizione dei task.
 *
 * AGGIORNAMENTO SPRINT 1:
 * Ogni task creato riceve automaticamente un payload_schema
 * dedotto dall'impact_type scelto nello Step 1 (StepDetails).
 * Questo schema viene salvato nel body della proposal e poi
 * letto da ChallengeSubmitPage per costruire il form dinamico
 * del volontario al momento dell'invio del contributo.
 *
 * L'organizzatore non vede né configura lo schema — è automatico.
 */

import React from "react";

// ─── Mappatura impact_type → payload_schema ───────────────────────────────────
/**
 * Definisce i campi che ogni submission di questo tipo di task
 * deve raccogliere. Deve essere allineata con:
 * - I valori delle <option> in StepDetails.jsx
 * - Gli endpoint /v1/co2-factors/mobility (per vehicle_id)
 * - La logica di ChallengeSubmitPage.jsx (DynamicField)
 *
 * Per aggiungere un nuovo tipo di impatto:
 * 1. Aggiungi la <option> in StepDetails.jsx
 * 2. Aggiungi la voce qui con i fields corrispondenti
 * 3. Aggiungi label/placeholder/hint in ChallengeSubmitPage.jsx
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

/**
 * Restituisce il payload_schema corrispondente all'impact_type.
 * Se il tipo non è mappato esplicitamente, usa lo schema base (_default).
 */
function getPayloadSchema(impactType) {
  return IMPACT_SCHEMA_MAP[impactType] || IMPACT_SCHEMA_MAP._default;
}

/**
 * Label leggibili per i campi dello schema — per il riepilogo nell'UI.
 * Speculare a fieldLabel() in ChallengeSubmitPage.jsx.
 */
const FIELD_LABELS = {
  km_percorsi: "Km percorsi in bici",
  vehicle_id:  "Mezzo alternativo",
  evidences:   "Foto evidenza",
  kg_rifiuti:  "Kg rifiuti raccolti",
  num_alberi:  "Numero alberi piantati",
};

// ─── Componente ───────────────────────────────────────────────────────────────
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
          id: `t${tasks.length + 1}`,
          label: "",
          evidence_required: true,
          evidence_types: ["photo"],
          verification: "judge",
          // Schema iniettato automaticamente dall'impact_type corrente.
          // Viene salvato nel body della proposal e poi letto da
          // ChallengeSubmitPage per costruire il form del volontario.
          payload_schema: schema,
        },
      ],
    });
  };

  const updTask = (i, patch) => {
    const copy = tasks.slice();
    copy[i] = { ...copy[i], ...patch };
    set({ tasks: copy });
  };

  // Validazione
  const amountOk = (target.amount || 0) > 0;
  const tasksOk =
    tasks.length >= 2 && tasks.some((t) => t?.evidence_required);

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
              className={`control ${
                amountOk
                  ? "input-valid"
                  : target.amount != null
                  ? "input-invalid"
                  : ""
              }`}
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
            <div className={`hint ${amountOk ? "ok" : "warn"}`}>
              {amountOk ? "OK" : "Indica una quantità > 0"}
            </div>
          </label>
        </div>

        {/* TASK */}
        <div style={{ marginTop: 8 }}>
          <h4>Task (min 2, almeno 1 con evidenze)</h4>

          {tasks.map((t, i) => (
            <TaskCard
              key={t.id}
              task={t}
              index={i}
              onUpdate={(patch) => updTask(i, patch)}
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
              : `Aggiungi ${Math.max(0, 2 - tasks.length)} task e assicurati che almeno uno richieda evidenze`}
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
 * Mostra il form di configurazione di un task e, in sola lettura,
 * i campi che il volontario dovrà compilare (dedotti dal payload_schema).
 * L'organizzatore vede cosa raccoglierà il sistema senza doverlo configurare.
 */
function TaskCard({ task, index, onUpdate }) {
  const labelOk = (task.label || "").trim().length >= 3;
  const fields = task.payload_schema?.fields || [];

  return (
    <div className="card" style={{ padding: 8, marginBottom: 6 }}>
      {/* Etichetta task */}
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

      {/* Configurazione evidenze e verifica */}
      <div className="form-row" style={{ marginTop: 6 }}>
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

      {/* Riepilogo dati raccolti dal payload_schema — solo lettura ─────────
          Mostra all'organizzatore quali informazioni raccoglierà il sistema
          dai volontari, dedotte automaticamente dall'impact_type. */}
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
    </div>
  );
}
