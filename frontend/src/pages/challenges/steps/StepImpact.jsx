import React from "react";

export default function StepImpact({ value = {}, onChange, pointsPreview }) {
  const v = value || {};
  const set = (patch) => onChange(patch);

  // 🔧 Modalità: resta su "co2e" anche quando l'input è temporaneamente vuoto ("")
  // - Se c'è difficulty -> "diff"
  // - Altrimenti, se la chiave co2e_estimate_kg ESISTE (anche "" o 0) -> "co2e"
  // - Altrimenti null
  const mode = v.difficulty
    ? "diff"
    : Object.prototype.hasOwnProperty.call(v, "co2e_estimate_kg")
    ? "co2e"
    : null;

  const selectCO2e = () =>
    set({
      difficulty: null,
      // se già definito, lascia il valore; altrimenti parti da 0
      co2e_estimate_kg:
        v.co2e_estimate_kg !== undefined ? v.co2e_estimate_kg : 0,
    });

  const selectDiff = () =>
    set({ co2e_estimate_kg: undefined, difficulty: v.difficulty || "low" });

  const modeOk = !!mode;

  return (
    <>
      <h3>3) Impatto & punti (preview)</h3>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="impact-options">
          <label className="impact-option">
            <input type="checkbox" checked={mode === "co2e"} onChange={selectCO2e} />
            <span>Stima basata su CO₂e</span>
          </label>

          {mode === "co2e" && (
            <div className="form-row" style={{ marginTop: 8 }}>
              <label style={{ width: "100%" }}>
                CO₂e stimata (kg)
                <input
                  type="number"
                  className="control control-pill"
                  min={0}
                  // ✔️ manteniamo la stringa "" durante l'editing: niente “collapse” dello step
                  value={
                    v.co2e_estimate_kg === undefined
                      ? ""
                      : v.co2e_estimate_kg
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    // se l'utente cancella tutto → tieni "" (non null) per non uscire dalla modalità
                    if (raw === "") {
                      set({ co2e_estimate_kg: "" });
                    } else {
                      const n = Number(raw);
                      set({ co2e_estimate_kg: isNaN(n) ? "" : n });
                    }
                  }}
                />
              </label>
            </div>
          )}

          <label className="impact-option" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={mode === "diff"} onChange={selectDiff} />
            <span>Stima basata su difficoltà</span>
          </label>

          {mode === "diff" && (
            <div className="form-row" style={{ marginTop: 8 }}>
              <label>
                Difficoltà
                <select
                  className="control control-pill"
                  value={v.difficulty || "low"}
                  onChange={(e) => set({ difficulty: e.target.value })}
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </label>

              <label style={{ flex: 1 }}>
                Note sulla complessità
                <input
                  className="control control-pill"
                  placeholder="Motiva brevemente"
                  value={v.complexity_notes || ""}
                  onChange={(e) => set({ complexity_notes: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>

        <div className={`hint ${modeOk ? 'ok' : 'warn'}`} style={{ marginTop: 8 }}>
          {modeOk ? 'OK' : 'Seleziona una sola modalità: CO₂e oppure Difficoltà'}
        </div>
      </div>

      <div className="points-preview">
        Punti stimati (preview, lato client):{" "}
        <strong className="points-value">{pointsPreview}</strong>
      </div>
      <small className="muted">Il calcolo ufficiale avverrà lato server in fase di revisione.</small>
    </>
  );
}

