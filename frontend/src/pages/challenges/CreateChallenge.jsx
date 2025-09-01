// src/pages/challenges/CreateChallenge.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { EMPTY_CHALLENGE } from "./schema";

import StepDetails from "./steps/StepDetails";
import StepTargets from "./steps/StepTargets";
import StepImpact from "./steps/StepImpact";
import StepSponsor from "./steps/StepSponsor";

const STORAGE_KEY = "draft_challenge_v1";
const TOT_STEPS = 4;

export default function CreateChallenge() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // usato solo per coerenza, il redirect è gestito dalla ProtectedRoute

  // ⚠️ Niente redirect manuale qui: lo fa già ProtectedRoute quando non loggati.

  const [step, setStep] = useState(1);

  const [draft, setDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...EMPTY_CHALLENGE, ...JSON.parse(raw) } : { ...EMPTY_CHALLENGE };
    } catch {
      return { ...EMPTY_CHALLENGE };
    }
  });

  // Autosave con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        console.warn("Autosave draft failed:", err);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [draft]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(TOT_STEPS, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  // Validazione minima per abilitare Avanti/Invia
  const canProceed = () => {
    if (step === 1) {
      const okTitle = (draft.title || "").trim().length >= 5;
      const okDesc = (draft.description || "").trim().length >= 50;
      const okImpact = !!draft.impact_type;
      const okAddr = !!draft?.location?.address;
      return okTitle && okDesc && okImpact && okAddr;
    }
    if (step === 2) {
      const okTarget = Number(draft?.target?.amount) > 0;
      const okTasks = Array.isArray(draft?.tasks) && draft.tasks.length >= 2;
      return okTarget && okTasks;
    }
    if (step === 3) {
      // Uno dei due percorsi: CO2e o difficoltà
      return !!draft.co2e_estimate_kg || !!draft.difficulty;
    }
    return true; // step 4
  };

  // Preview punti lato FE (indicativa, quella ufficiale rimane lato server)
  const pointsPreview = useMemo(() => {
    const COEF = 1.0; // 1 kg CO2e ≈ 1 punto (preview)
    if (draft.co2e_estimate_kg && !draft.difficulty) {
      return Math.max(0, Math.round(draft.co2e_estimate_kg * COEF));
    }
    if (draft.difficulty && !draft.co2e_estimate_kg) {
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

  const handleSubmit = async () => {
    if (!canProceed()) {
      alert("Completa i campi obbligatori prima di inviare.");
      return;
    }
    try {
      // completare questa parte a valle del backend:
      // quando l'endpoint sarà pronto, scommenta:
      // const { data } = await api.post("/v1/challenge-proposals", draft);
      // alert("Proposta inviata! ID: " + (data?.proposalId || "—"));

      console.log("[DEBUG] submit draft:", draft);
      alert("Invio bozza (demo). Completare questa parte a valle del backend.");
      resetDraft();
      navigate("/challenges");
    } catch (err) {
      console.error("Errore invio proposta:", err);
      alert("Invio non riuscito. Riprova.");
    }
  };

  return (
    <section className="page-section page-text create-challenge">
      <div className="container">
        {/* Header pagina */}
        <div className="page-header">
          <h2 className="page-title">Crea una nuova sfida</h2>
          <div className="page-actions" style={{ gap: 8 }}>
            <button className="btn btn-outline btn-pill" onClick={resetDraft}>
              Reset bozza
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="wizard-steps">
          {[1, 2, 3, 4].map((n) => (
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

        {/* Card contenitore step */}
        <div className="card" style={{ padding: 16 }}>
          {step === 1 && <StepDetails value={draft} onChange={set} />}
          {step === 2 && <StepTargets value={draft} onChange={set} />}
          {step === 3 && <StepImpact value={draft} onChange={set} pointsPreview={pointsPreview} />}
          {step === 4 && <StepSponsor value={draft} onChange={set} pointsPreview={pointsPreview} />}
        </div>

        {/* Footer navigazione */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-outline" onClick={prev} disabled={step === 1}>
            Indietro
          </button>
          {step < TOT_STEPS ? (
            <button className="btn btn-primary" onClick={next} disabled={!canProceed()}>
              Avanti
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!canProceed()}>
              Invia proposta
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

