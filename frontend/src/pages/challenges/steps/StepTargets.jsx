import React from "react";

export default function StepTargets({ value = {}, onChange }) {
  const v = value || {};
  const target = v.target || {};
  const tasks = Array.isArray(v.tasks) ? v.tasks : [];

  const set = (patch) => onChange(patch);
  const setTarget = (patch) => onChange({ target: { ...target, ...patch } });

  const addTask = () =>
    set({
      tasks: [
        ...tasks,
        {
          id: `t${tasks.length + 1}`,
          label: "",
          evidence_required: true,
          evidence_types: ["photo"],
          verification: "judge",
        },
      ],
    });

  const updTask = (i, patch) => {
    const copy = tasks.slice();
    copy[i] = { ...copy[i], ...patch };
    set({ tasks: copy });
  };

<<<<<<< HEAD
=======
  // vincoli schema
  const amountOk = (target.amount || 0) > 0;
  const tasksOk  = tasks.length >= 2 && tasks.some(t => t?.evidence_required);

>>>>>>> release/v0.4.1
  return (
    <>
      <h3>2) Obiettivi & verifica</h3>

      <div className="form-grid">
        <div className="form-row">
          <label>
            Tipo target
            <input
              className="control control-pill"
              placeholder="quantità | area | numero | misto"
              value={target.kind || ""}
              onChange={(e) => setTarget({ kind: e.target.value })}
            />
          </label>

          <label>
            Unità
            <input
              className="control control-pill"
              placeholder="kg | m2 | sacchi | azioni"
              value={target.unit || ""}
              onChange={(e) => setTarget({ unit: e.target.value })}
            />
          </label>

          <label>
            Quantità
            <input
              type="number"
<<<<<<< HEAD
              className="control control-pill"
=======
              className={`control control-pill ${amountOk ? 'input-valid' : (target.amount != null ? 'input-invalid' : '')}`}
>>>>>>> release/v0.4.1
              min={0}
              value={target.amount ?? ""}
              onChange={(e) =>
                setTarget({ amount: e.target.value === "" ? null : Number(e.target.value) || 0 })
              }
            />
<<<<<<< HEAD
=======
            <div className={`hint ${amountOk ? 'ok' : 'warn'}`}>
              {amountOk ? 'OK' : 'Indica una quantità > 0'}
            </div>
>>>>>>> release/v0.4.1
          </label>
        </div>

        <div style={{ marginTop: 8 }}>
<<<<<<< HEAD
          <h4>Task (2–10)</h4>
=======
          <h4>Task (min 2, almeno 1 con evidenze)</h4>
>>>>>>> release/v0.4.1

          {tasks.map((t, i) => (
            <div key={t.id} className="card" style={{ padding: 8, marginBottom: 6 }}>
              <input
<<<<<<< HEAD
                className="control control-pill"
                placeholder="Descrizione task"
                value={t.label || ""}
                onChange={(e) => updTask(i, { label: e.target.value })}
              />
=======
  className={`control control-pill ${ (t.label || '').trim().length >= 3 ? 'input-valid' : (t.label ? 'input-invalid' : '') }`}
  placeholder="Descrizione task (min 3)"
  value={t.label || ""}
  onChange={(e) => updTask(i, { label: e.target.value })}
/>
<div className={`hint ${ (t.label || '').trim().length >= 3 ? 'ok' : 'warn'}`}>
  { (t.label || '').trim().length >= 3 ? 'OK' : 'Minimo 3 caratteri' }
</div>
>>>>>>> release/v0.4.1

              <div className="form-row" style={{ marginTop: 6 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!t.evidence_required}
                    onChange={(e) => updTask(i, { evidence_required: e.target.checked })}
                  />{" "}
                  Richiede evidenze
                </label>

                <select
                  className="control control-pill"
                  value={t.verification || "judge"}
                  onChange={(e) => updTask(i, { verification: e.target.value })}
                >
                  <option value="user">Utente</option>
                  <option value="judge">Giudice</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          ))}

<<<<<<< HEAD
          <button className="btn btn-outline btn-small" onClick={addTask}>
            + Aggiungi task
          </button>
=======
          <button className="btn btn-outline btn-small" onClick={addTask}>+ Aggiungi task</button>

          <div className={`hint ${tasksOk ? 'ok' : 'warn'}`} style={{ marginTop: 6 }}>
            {tasksOk ? 'OK' : `Aggiungi ${Math.max(0, 2 - tasks.length)} task e assicurati che almeno uno richieda evidenze`}
          </div>
>>>>>>> release/v0.4.1
        </div>

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

