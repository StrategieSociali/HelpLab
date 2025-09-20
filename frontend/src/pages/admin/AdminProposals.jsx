import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import StepProposalsList from "./steps/StepProposalsList";
import StepAssignJudge from "./steps/StepAssignJudge";

const STORAGE_KEY = "admin_proposals_wizard";
const TOTAL_STEPS = 2;

export function AdminProposals() {
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // autosave bozza
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  if (!user || user.role !== "admin") {
    return <p>🚫 Solo gli admin possono accedere a questa pagina.</p>;
  }

  return (
    <section className="page-section">
      <div className="container">
        <h2>Gestione Proposte (Admin)</h2>

        <div className="wizard-steps">
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`chip ${n === step ? "chip--active" : ""}`}
              onClick={() => setStep(n)}
              role="button"
            >
              {n}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <StepProposalsList
              token={token}
              value={draft}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            />
          )}
          {step === 2 && (
            <StepAssignJudge
              token={token}
              value={draft}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-outline" onClick={prev} disabled={step === 1}>
            Indietro
          </button>
          {step < TOTAL_STEPS ? (
            <button className="btn btn-primary" onClick={next}>
              Avanti
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={() => alert("Workflow admin completato ✅ (in futuro submit finale)")}
            >
              Concludi
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

