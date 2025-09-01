import React from "react";

export default function StepSponsor({ value = {}, onChange, pointsPreview }) {
  const v = value || {};
  const vis = v.visibility_options || {};
  const set = (patch) => onChange(patch);

  return (
    <>
      <h3>4) Sponsor & revisione</h3>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={!!v.sponsor_interest}
          onChange={(e) => set({ sponsor_interest: e.target.checked })}
        />
        Cerco uno sponsor
      </label>

      {v.sponsor_interest && (
        <div className="form-grid" style={{ marginTop: 8 }}>
          <label>
            Pitch (50–500)
            <textarea
              className="control"
              rows={4}
              value={v.sponsor_pitch || ""}
              onChange={(e) => set({ sponsor_pitch: e.target.value })}
            />
          </label>

          <label>
            Budget richiesto (EUR)
            <input
              type="number"
              min={0}
              className="control control-pill"
              value={v.sponsor_budget_requested ?? ""}
              onChange={(e) =>
                set({
                  sponsor_budget_requested:
                    e.target.value === "" ? null : Number(e.target.value) || 0,
                })
              }
            />
          </label>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={!!vis.logo}
                onChange={(e) => set({ visibility_options: { ...vis, logo: e.target.checked } })}
              />{" "}
              Logo
            </label>

            <label>
              <input
                type="checkbox"
                checked={!!vis.social_mentions}
                onChange={(e) =>
                  set({ visibility_options: { ...vis, social_mentions: e.target.checked } })
                }
              />{" "}
              Menzioni social
            </label>

            <label>
              <input
                type="checkbox"
                checked={!!vis.press_event}
                onChange={(e) =>
                  set({ visibility_options: { ...vis, press_event: e.target.checked } })
                }
              />{" "}
              Evento stampa
            </label>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <strong>Punti stimati:</strong> {pointsPreview}
          </div>
          <div>
            <strong>Target:</strong> {v.target?.amount ?? "—"} {v.target?.unit || ""}
          </div>
          <div>
            <strong>Durata:</strong> {v.start_date || "?"} → {v.deadline || "?"}
          </div>
          <div>
            <strong>Luogo:</strong> {v.location?.address || "—"}
          </div>
        </div>
      </div>

      <label style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={!!v.terms_consent}
          onChange={(e) => set({ terms_consent: e.target.checked })}
        />{" "}
        Confermo termini e diritti sui media (obbligatorio)
      </label>
    </>
  );
}

