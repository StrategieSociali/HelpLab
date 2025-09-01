import React from "react";

export default function StepDetails({ value = {}, onChange }) {
  // fallback sicuri per evitare crash se mancano proprietà
  const v = value || {};
  const loc = v.location || {};

  // invia solo la patch: il merge lo fa il parent (CreateChallenge.jsx)
  const set = (patch) => onChange(patch);
  const setLoc = (patch) => onChange({ location: { ...loc, ...patch } });

  return (
    <>
      <h3>1) Dettagli base</h3>

      <div className="form-grid">
        <label>
          Titolo
          <input
            className="control control-pill"
            placeholder="Titolo (5–80)"
            value={v.title || ""}
            onChange={(e) => set({ title: e.target.value })}
          />
        </label>

        <label>
          Descrizione
          <textarea
            className="control"
            rows={5}
            placeholder="Descrivi cosa si farà (50–1200)"
            value={v.description || ""}
            onChange={(e) => set({ description: e.target.value })}
          />
        </label>

        <label>
          Tipo impatto
          <select
            className="control control-pill"
            value={v.impact_type || ""}
            onChange={(e) => set({ impact_type: e.target.value })}
          >
            <option value="">Seleziona…</option>
            <option value="tree_planting">Piantumazione</option>
            <option value="no_waste">Riduzione rifiuti</option>
            <option value="green_area">Aree verdi</option>
            <option value="social">Sociale</option>
            <option value="education">Educazione</option>
            <option value="other">Altro</option>
          </select>
        </label>

        <label>
          Indirizzo
          <input
            className="control control-pill"
            placeholder="Via/Piazza…"
            value={loc.address || ""}
            onChange={(e) => setLoc({ address: e.target.value })}
          />
        </label>

        <div className="form-row">
          <label>
            Inizio
            <input
              type="date"
              className="control control-pill"
              value={v.start_date || ""}
              onChange={(e) => set({ start_date: e.target.value })}
            />
          </label>

          <label>
            Scadenza
            <input
              type="date"
              className="control control-pill"
              value={v.deadline || ""}
              onChange={(e) => set({ deadline: e.target.value })}
            />
          </label>
        </div>

        <label>
          Visibilità organizzatore
          <select
            className="control control-pill"
            value={v.organizer_visibility || "public"}
            onChange={(e) => set({ organizer_visibility: e.target.value })}
          >
            <option value="public">Pubblico</option>
            <option value="private-to-participants">Solo ai partecipanti</option>
            <option value="anonymous">Anonimo</option>
          </select>
        </label>
      </div>
    </>
  );
}

