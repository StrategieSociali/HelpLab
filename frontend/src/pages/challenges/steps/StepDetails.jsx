import React from "react";

export default function StepDetails({ value = {}, onChange }) {
  const v = value || {};
  const loc = v.location || {};
  const set = (patch) => onChange(patch);
  const setLoc = (patch) => onChange({ location: { ...loc, ...patch } });

  // soglie schema
  const TITLE_MIN = 5;
  const DESC_MIN  = 50;

  const titleLen = (v.title || "").trim().length;
  const descLen  = (v.description || "").trim().length;
  const addrOk   = !!(loc.address && loc.address.trim());
  const datesOk  = !!v.start_date && !!v.deadline && (new Date(v.deadline) > new Date(v.start_date));

  return (
    <>
      <h3>1) Dettagli base</h3>

      <div className="form-grid">
        <label>
          Titolo
          <input
            className={`control  ${titleLen >= TITLE_MIN ? 'input-valid' : (titleLen ? 'input-invalid' : '')}`}
            placeholder={`Titolo (${TITLE_MIN}–80)`}
            value={v.title || ""}
            onChange={(e) => set({ title: e.target.value })}
          />
          <div className={`hint ${titleLen >= TITLE_MIN ? 'ok' : 'warn'}`}>
            {titleLen >= TITLE_MIN ? 'OK' : `Minimo ${TITLE_MIN} caratteri (${titleLen}/${TITLE_MIN})`}
          </div>
        </label>

        <label>
          Descrizione
          <textarea
            className={`control ${descLen >= DESC_MIN ? 'input-valid' : (descLen ? 'input-invalid' : '')}`}
            rows={6}
            placeholder={`Descrivi cosa si farà (${DESC_MIN}–1200)`}
            value={v.description || ""}
            onChange={(e) => set({ description: e.target.value })}
          />
          <div className={`hint ${descLen >= DESC_MIN ? 'ok' : 'warn'}`}>
            {descLen >= DESC_MIN ? 'OK' : `Minimo ${DESC_MIN} caratteri (${descLen}/${DESC_MIN})`}
          </div>
        </label>

        <label>
          Tipo impatto
          <select
            className="control "
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
            className={`control  ${addrOk ? 'input-valid' : (loc.address ? 'input-invalid' : '')}`}
            placeholder="Via/Piazza…"
            value={loc.address || ""}
            onChange={(e) => setLoc({ address: e.target.value })}
          />
          <div className={`hint ${addrOk ? 'ok' : 'warn'}`}>
            {addrOk ? 'OK' : 'Inserisci un indirizzo'}
          </div>
        </label>

        <div className="form-row">
          <label>
            Inizio
            <input
              type="date"
              className="control "
              value={v.start_date || ""}
              onChange={(e) => set({ start_date: e.target.value })}
            />
          </label>

          <label>
            Scadenza
            <input
              type="date"
              className={`control  ${datesOk ? 'input-valid' : (v.deadline ? 'input-invalid' : '')}`}
              value={v.deadline || ""}
              onChange={(e) => set({ deadline: e.target.value })}
            />
            <div className={`hint ${datesOk ? 'ok' : 'warn'}`}>
              {datesOk ? 'OK' : 'La scadenza deve essere successiva all’inizio'}
            </div>
          </label>
        </div>

        <label>
          Visibilità organizzatore
          <select
            className="control "
            value={(v.visibility_options?.organizer_visibility) || "public"}
            onChange={(e) =>
              set({
                visibility_options: {
                  ...(v.visibility_options || {}),
                  organizer_visibility: e.target.value,
                },
              })
            }
          >
            <option value="public">Pubblico</option>
            <option value="private-to-participants">Solo partecipanti</option>
          </select>
        </label>
      </div>
    </>
  );
}

