import React, { useState } from "react";

export default function StepImpact({ value, onChange, pointsPreview }) {
  // Modalità iniziale: se ho CO₂ uso "co2", altrimenti "difficulty"
  const [mode, setMode] = useState(
    value?.co2e_estimate_kg ? "co2" : "difficulty"
  );
  const [co2Str, setCo2Str] = useState(
    value?.co2e_estimate_kg != null ? String(value.co2e_estimate_kg) : ""
  );

  // --- helper: switch modalità garantendo XOR ---
  const switchMode = (next) => {
    setMode(next);
    if (next === "co2") {
      // passo a CO₂ → azzero difficulty
      onChange?.({ difficulty: undefined });
    } else {
      // passo a Difficoltà → azzero CO₂
      onChange?.({ co2e_estimate_kg: undefined });
      setCo2Str("");
    }
  };

  // alias per il markup esistente
  const handleMode = (next) => switchMode(next);

  // --- handler CO₂ (XOR: azzera difficulty) ---
  const handleCo2Change = (e) => {
    const raw = e.target.value;
    setCo2Str(raw);

    const normalized = raw.replace(",", ".").trim();
    const num = Number(normalized);
    if (Number.isFinite(num) && num > 0) {
      // imposto co2, azzero difficulty
      onChange?.({ co2e_estimate_kg: num, difficulty: undefined });
      if (mode !== "co2") setMode("co2");
    } else {
      // input non valido → tolgo il valore numerico
      onChange?.({ co2e_estimate_kg: undefined });
    }
  };

  // --- handler Difficoltà (XOR: azzera co2) ---
  const handleDifficulty = (d) => {
    onChange?.({ difficulty: d, co2e_estimate_kg: undefined });
    if (mode !== "difficulty") setMode("difficulty");
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
              <span className={co2Str && Number(co2Str.replace(",", ".")) > 0 ? "valid-hint" : ""}>
                {co2Str && Number(co2Str.replace(",", ".")) > 0 ? "✓ ok" : ""}
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
              value={value?.complexity_notes ?? ""}
              onChange={(e) => onChange?.({ complexity_notes: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

