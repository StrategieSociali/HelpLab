import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { EMPTY_CHALLENGE, canProceedBasic /*, MIN_TITLE, MIN_DESC, MIN_RULES, ... */ } from "./schema";

import StepDetails from "./steps/StepDetails";
import StepTargets from "./steps/StepTargets";
import StepImpact from "./steps/StepImpact";
import StepSponsor from "./steps/StepSponsor";

const STORAGE_KEY = "draft_challenge_v1";
const TOTAL_STEPS = 4;

export default function CreateChallenge() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth(); // rotta già protetta

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...EMPTY_CHALLENGE, ...JSON.parse(raw) } : { ...EMPTY_CHALLENGE };
    } catch {
      return { ...EMPTY_CHALLENGE };
    }
  });
  
  //Pulsante Anteprima punteggio sfide
  const [serverScore, setServerScore] = useState(null);
const [scoringBusy, setScoringBusy] = useState(false);

const previewServerScoring = async () => {
  setScoringBusy(true);
  setServerScore(null);
  try {
    // usa lo stesso payload normalizzato del submit
    const body = (() => {
      const copy = JSON.parse(JSON.stringify(draft));
      // forza XOR: se hai difficulty, rimuovi co2e e viceversa
      const hasCo2 = copy.co2e_estimate_kg !== undefined && copy.co2e_estimate_kg !== null && String(copy.co2e_estimate_kg).trim() !== "";
      const hasDiff = typeof copy.difficulty === "string" && copy.difficulty.trim() !== "";
      if (hasCo2 && hasDiff) copy.difficulty = null;
      if (!hasCo2 && !hasDiff) { delete copy.co2e_estimate_kg; delete copy.difficulty; }
      // tasks safe defaults
      if (Array.isArray(copy.tasks)) {
        copy.tasks = copy.tasks.map(t => ({
          ...(t.id ? { id: t.id } : {}),
          label: (t.label || "").trim(),
          evidence_required: !!t.evidence_required,
          evidence_types: (Array.isArray(t.evidence_types) && t.evidence_types.length) ? t.evidence_types : ["photo"],
          verification: t.verification || "judge",
        }));
      }
      return copy;
    })();

    const { data } = await api.post("v1/challenges/preview-scoring", body);
    setServerScore(data); // { version, points_estimate_total, breakdown, notes }
  } catch (e) {
    console.error("preview-scoring failed", e?.response || e);
    alert("Anteprima punteggio non disponibile al momento.");
  } finally {
    setScoringBusy(false);
  }
};


  // Autosave bozza
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  // Preview punti locale
  const pointsPreview = useMemo(() => {
    const COEF = 1.0;
    if (draft.co2e_estimate_kg != null && !draft.difficulty) {
      return Math.max(0, Math.round(Number(draft.co2e_estimate_kg || 0) * COEF));
    }
    if (draft.difficulty && draft.co2e_estimate_kg == null) {
      const base = 3;
      const mult = { low: 1.0, medium: 1.25, high: 1.5 }[draft.difficulty] || 1;
      const scaling = Math.log10(1 + (draft.target?.amount || 0)) + 1;
      return Math.round(base * mult * scaling * 10);
    }
    return 0;
  }, [draft]);

  const resetDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft({ ...EMPTY_CHALLENGE });
    setStep(1);
  };
  
    // Preview punti UI
  <div className="points-preview" style={{ marginTop: 10 }}>
  Punti stimati (client): <strong className="points-value">{pointsPreview}</strong>
  <button
    className="btn btn-outline btn-small"
    onClick={previewServerScoring}
    disabled={scoringBusy}
    style={{ marginLeft: 8 }}
  >
    {scoringBusy ? "Calcolo…" : "Calcola punteggio server"}
  </button>
</div>

{serverScore && (
  <div className="card" style={{ marginTop: 8, padding: 10 }}>
    <div><strong>Server:</strong> {serverScore.points_estimate_total}</div>
    {Array.isArray(serverScore.breakdown) && serverScore.breakdown.length > 0 && (
      <ul style={{ margin: "6px 0 0 16px" }}>
        {serverScore.breakdown.map((b, i) => (
          <li key={i}>{b.label}: {b.value}</li>
        ))}
      </ul>
    )}
    {Array.isArray(serverScore.notes) && serverScore.notes.length > 0 && (
      <small className="muted">Note: {serverScore.notes.join("; ")}</small>
    )}
  </div>
)}


  // =========================
  // SUBMIT (contratto BE v1)
  // =========================
  const handleSubmit = async () => {
    if (!canProceedBasic(draft)) {
      alert("Completa i campi obbligatori prima di inviare.");
      return;
    }

    // Normalizzazione minima per il contratto BE (tollerante a null/"")
    const payload = (() => {
      const copy = JSON.parse(JSON.stringify(draft));

      // organizer_visibility -> visibility_options.organizer_visibility
      if (copy.organizer_visibility) {
        copy.visibility_options = {
          ...(copy.visibility_options || {}),
          organizer_visibility: copy.organizer_visibility,
        };
        delete copy.organizer_visibility;
      }

      // IMPATTO: applica XOR (tienine solo uno)
      const hasCo2 =
        copy.co2e_estimate_kg !== undefined &&
        copy.co2e_estimate_kg !== null &&
        String(copy.co2e_estimate_kg).trim() !== "";

      const hasDiff =
        typeof copy.difficulty === "string" &&
        copy.difficulty.trim() !== "";

      if (hasCo2 && hasDiff) {
        // se sono entrambi valorizzati, tieni CO₂e e azzera difficulty
        copy.difficulty = null;
      } else if (!hasCo2 && !hasDiff) {
        // nessuna modalità selezionata: lasciamo così (FE/BE validano)
      }

      // tasks: garantisci valori di default leciti
      if (Array.isArray(copy.tasks)) {
        copy.tasks = copy.tasks.map(t => ({
          ...(t.id ? { id: t.id } : {}),
          label: (t.label || "").trim(),
          evidence_required: !!t.evidence_required,
          evidence_types: (Array.isArray(t.evidence_types) && t.evidence_types.length) ? t.evidence_types : ["photo"],
          verification: t.verification || "judge",
        }));
      }

      // target.amount: lasciamo com’è (il BE converte stringhe in numero)
      return copy;
    })();

    try {
      // Se l’interceptor di api/client è cablato col token, basterebbe questa riga.
      // Aggiungo comunque l’header Authorization se abbiamo il token a portata di mano.
      const { data } = await api.post(
        "v1/challenge-proposals",
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      alert("Proposta inviata! ID: " + (data?.proposalId || "—"));
      resetDraft();
      navigate("/challenges");
    } catch (err) {
      const status = err?.response?.status;
      const server = err?.response?.data;
      console.error("Errore invio:", status, server || err);

      // Mostra gli errori aggregati del BE
      const detail =
        typeof server === "string"
          ? server
          : server?.error || "Invio non riuscito. Riprova.";
      alert(`Errore ${status || ""}: ${detail}`);
    }
  };

  return (
    <section className="page-section page-text create-challenge">
      <div className="container">
        <div className="page-header">
          <h2 className="page-title">Crea una nuova sfida</h2>
          <div className="page-actions">
            <button className="btn btn-outline btn-pill" onClick={resetDraft}>Reset bozza</button>
          </div>
        </div>

        <div className="wizard-steps">
          {[1,2,3,4].map((n) => (
            <div
              key={n}
              className={`chip ${n === step ? "chip--active" : ""}`}
              onClick={() => setStep(n)}
              role="button"
              aria-label={`Vai allo step ${n}`}
            >
              {n}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 1 && <StepDetails value={draft} onChange={set} />}
          {step === 2 && <StepTargets value={draft} onChange={set} />}
          {step === 3 && <StepImpact  value={draft} onChange={set} pointsPreview={pointsPreview} />}
          {step === 4 && <StepSponsor value={draft} onChange={set} pointsPreview={pointsPreview} />}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-outline" onClick={prev} disabled={step === 1}>Indietro</button>
          {step < TOTAL_STEPS ? (
            <button className="btn btn-primary" onClick={next}>Avanti</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit}>Invia proposta</button>
          )}
        </div>
      </div>
    </section>
  );
}

