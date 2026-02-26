// src/pages/events/steps/StepEventDetails.jsx
/**
 * StepEventDetails.jsx
 * --------------------
 * Step 1 del wizard di creazione evento.
 * Raccoglie: nome, descrizione, date, indirizzo, logo.
 *
 * PROPS:
 *   value    {Object}   - draft corrente
 *   onChange {Function} - patch parziale sul draft (come in CreateChallenge)
 *
 * VALIDAZIONE:
 * Feedback visivo inline — nessun blocco hard qui, la validazione
 * definitiva prima del submit è in CreateEvent.jsx.
 */

import React from "react";

// Soglie validazione (allineate con i requisiti BE — handoff §8)
const NAME_MIN = 5;

export default function StepEventDetails({ value = {}, onChange }) {
  const v   = value || {};
  const set = (patch) => onChange(patch);

  // Feedback validazione
  const nameLen = (v.name || "").trim().length;
  const nameOk  = nameLen >= NAME_MIN;

  const datesOk =
    !!v.start_date &&
    !!v.end_date &&
    new Date(v.end_date) >= new Date(v.start_date);

  return (
    <>
      <h3 className="dynamic-subtitle" style={{ marginBottom: 16 }}>
        1) Informazioni evento
      </h3>

      <div className="form-grid">

        {/* NOME */}
        <label>
          Nome evento *
          <input
            className={`control ${
              nameOk ? "input-valid" : nameLen ? "input-invalid" : ""
            }`}
            placeholder={`Nome evento (min ${NAME_MIN} caratteri)`}
            value={v.name || ""}
            onChange={(e) => set({ name: e.target.value })}
            maxLength={200}
          />
          <div className={`hint ${nameOk ? "ok" : "warn"}`}>
            {nameOk
              ? "OK"
              : `Minimo ${NAME_MIN} caratteri (${nameLen}/${NAME_MIN})`}
          </div>
          {/* Lo slug viene generato dal BE dal nome — mai costruirlo qui */}
        </label>

        {/* DESCRIZIONE */}
        <label>
          Descrizione
          <textarea
            className="control"
            rows={4}
            placeholder="Descrivi l'evento, gli obiettivi, chi può partecipare…"
            value={v.description || ""}
            onChange={(e) => set({ description: e.target.value })}
          />
        </label>

        {/* DATE */}
        <div className="form-row">
          <label>
            Data inizio *
            <input
              type="date"
              className={`control ${v.start_date ? "input-valid" : ""}`}
              value={v.start_date || ""}
              onChange={(e) => set({ start_date: e.target.value })}
            />
          </label>

          <label>
            Data fine *
            <input
              type="date"
              className={`control ${
                datesOk ? "input-valid" : v.end_date ? "input-invalid" : ""
              }`}
              value={v.end_date || ""}
              onChange={(e) => set({ end_date: e.target.value })}
            />
          </label>
        </div>
        {v.start_date && v.end_date && (
          <div className={`hint ${datesOk ? "ok" : "warn"}`}>
            {datesOk
              ? "OK"
              : "La data di fine deve essere uguale o successiva all'inizio"}
          </div>
        )}

        {/* INDIRIZZO */}
        <label>
          Indirizzo
          <input
            className="control"
            placeholder="Es: Bologna, Piazza Maggiore"
            value={v.location_address || ""}
            onChange={(e) => set({ location_address: e.target.value })}
          />
          <div className="hint">
            L'indirizzo sarà mostrato ai partecipanti con link a OpenStreetMap.
          </div>
        </label>

        {/* LOGO URL
            Il logo viene caricato su Cloudinary dal creatore e incollato qui.
            Non gestiamo upload diretto in questo form — lo slug non esiste ancora
            e la challenge non è ancora creata. L'upload può essere fatto dopo
            tramite PATCH /events/:id dalla pagina di dettaglio (Fase 3). */}
        <label>
          URL logo (opzionale)
          <input
            className="control"
            type="url"
            placeholder="https://res.cloudinary.com/…"
            value={v.logo_url || ""}
            onChange={(e) => set({ logo_url: e.target.value })}
          />
          <div className="hint">
            Incolla l'URL del logo dopo averlo caricato su Cloudinary.
            Puoi aggiungerlo anche dopo la creazione dell'evento.
          </div>
        </label>

      </div>
    </>
  );
}
