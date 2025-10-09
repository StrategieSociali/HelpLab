import React from "react";

export default function StepImpact({ value, onChange, pointsPreview }) {
  // se c'è difficulty → mostro "difficulty", altrimenti "co2"
  const mode = value?.difficulty ? "difficulty" : "co2";

  // input sempre controllato: mai null/undefined
  const co2Str =
    value?.co2e_estimate_kg === null || typeof value?.co2e_estimate_kg === "undefined"
      ? ""
      : String(value.co2e_estimate_kg);

  const handleMode = (m) => {
    if (m === "co2") {
      // torno a CO2 → pulisco difficulty ma NON tocco co2 (resta anche vuota)
      onChange({ difficulty: null });
    } else {
      // passo a difficulty → svuoto CO2 come stringa vuota (input controllato) e setto una default
      onChange({ co2e_estimate_kg: "", difficulty: "low" });
    }
  };

  const handleCo2Change = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange({ co2e_estimate_kg: "" }); // resta in modalità CO2 senza warning
      return;
    }
    const sanitized = raw.replace(/[^\d.]/g, "");
    onChange({ co2e_estimate_kg: sanitized });
  };

  const handleDifficulty = (d) => {
    onChange({ difficulty: d, co2e_estimate_kg: "" });
  };

  return (
    <div className="step step-impact">
      <h3 className="step-title">Impatto e punteggio</h3>

      <div className="row two-col soft-gap">
        <div className="field">
          <label className="label">Seleziona tipo di impatto</label>
          <div className="chips-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip ${mode === "co2" ? "chip--active" : ""}`}
              onClick={() => handleMode("co2")}
            >
              CO₂e stimata
            </button>
            <button
              type="button"
              className={`chip ${mode === "difficulty" ? "chip--active" : ""}`}
              onClick={() => handleMode("difficulty")}
            >
              Difficoltà
            </button>
          </div>
        </div>

        <div className="field">
          <label className="label">Anteprima punteggio</label>
          <div className="preview-points">{pointsPreview || 0} pt</div>
        </div>
      </div>

      {mode === "co2" ? (
        <div className="row two-col soft-gap" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label className="label">
              CO₂e (kg)
              <span className={co2Str && Number(co2Str) > 0 ? "valid-hint" : ""}>
                {co2Str && Number(co2Str) > 0 ? "✓ ok" : ""}
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="control"
              placeholder="Es: 12"
              value={co2Str}
              onChange={handleCo2Change}
            />
            <small className="muted">Inserisci una stima, o passa a “Difficoltà”.</small>
          </div>

          <div className="field" style={{ marginTop: 6 }}>
            <label className="label">Unità</label>
            <div>kg CO₂e</div>
          </div>
        </div>
      ) : (
        <div className="row two-col soft-gap">
          <div className="field">
            <label className="label">Difficoltà</label>
            <div className="chips-row" style={{ display: "flex", gap: 8 }}>
              {["low", "medium", "high"].map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`chip ${value?.difficulty === d ? "chip--active" : ""}`}
                  onClick={() => handleDifficulty(d)}
                >
                  {d === "low" ? "Bassa" : d === "medium" ? "Media" : "Alta"}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label">Note (opzionali)</label>
            <textarea
              className="control"
              rows={3}
              placeholder="Eventuali note sulla complessità…"
              value={value?.complexity_notes ?? ""}    // sempre stringa
              onChange={(e) => onChange({ complexity_notes: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

