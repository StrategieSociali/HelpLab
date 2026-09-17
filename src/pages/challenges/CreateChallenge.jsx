/**
 * CreateChallenge.jsx
 * -------------------
 * Wizard multi-step per la creazione di una nuova challenge (proposal).
 *
 * Step 1 — StepDetails:  titolo, descrizione, impact_type, indirizzo, date
 * Step 2 — StepTargets:  target quantitativo e task (con payload_schema auto)
 * Step 3 — StepImpact:   CO₂e stimata o difficoltà (XOR)
 * Step 4 — StepSponsor:  sponsor, visibilità, termini
 *
 * payload_schema è incluso nella normalizzazione dei task in handleSubmit, così il
 * backend lo riceve e lo salva.
 *
 * Nessuna anteprima di punti (tolte il 17/9/2026 col ritiro del cutover): quelle
 * vecchie usavano una formula precedente al Motore Punti e mostravano a chi organizza
 * un numero che non sarebbe mai stato assegnato. I punti li decide il motore.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import {
  EMPTY_CHALLENGE,
  canProceedBasic,
} from "./schema";

import StepDetails from "./steps/StepDetails";
import StepTargets from "./steps/StepTargets";
import StepImpact  from "./steps/StepImpact";
import StepSponsor from "./steps/StepSponsor";

const STORAGE_KEY  = "draft_challenge_v1";
const TOTAL_STEPS  = 4;

export default function CreateChallenge() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [step, setStep]   = useState(1);
  const [draft, setDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw
        ? { ...EMPTY_CHALLENGE, ...JSON.parse(raw) }
        : { ...EMPTY_CHALLENGE };
    } catch {
      return { ...EMPTY_CHALLENGE };
    }
  });

  // ── Autosave bozza ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const set  = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const resetDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft({ ...EMPTY_CHALLENGE });
    setStep(1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canProceedBasic(draft)) {
      alert("Completa i campi obbligatori prima di inviare.");
      return;
    }

    const payload = buildPayload(draft);

    try {
      const { data } = await api.post(
        "/v1/challenge-proposals",
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

      const detail =
        typeof server === "string"
          ? server
          : server?.error || "Invio non riuscito. Riprova.";
      alert(`Errore ${status || ""}: ${detail}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text create-challenge">
      <div className="container">

        <div className="page-header">
          <h2 className="page-title">Crea una nuova sfida</h2>
          <div className="page-actions">
            <button
              className="btn btn-outline btn-pill"
              onClick={resetDraft}
            >
              Reset bozza
            </button>
          </div>
        </div>

        {/* Indicatore step */}
        <div className="wizard-steps">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`chip ${n === step ? "chip--active" : ""}`}
              onClick={() => setStep(n)}
              role="button"
              aria-label={`Vai allo step ${n}`}
              aria-current={n === step ? "step" : undefined}
            >
              {n}
            </div>
          ))}
        </div>

        {/* Contenuto step */}
        <div className="card">
          {step === 1 && <StepDetails value={draft} onChange={set} />}
          {step === 2 && <StepTargets value={draft} onChange={set} />}
          {step === 3 && (
            <StepImpact value={draft} onChange={set} />
          )}
          {step === 4 && (
            <StepSponsor value={draft} onChange={set} />
          )}
        </div>

        {/* Navigazione wizard */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="btn btn-outline"
            onClick={prev}
            disabled={step === 1}
          >
            Indietro
          </button>
          {step < TOTAL_STEPS ? (
            <button className="btn btn-primary" onClick={next}>
              Avanti
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit}>
              Invia proposta
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Utility: normalizzazione payload prima dell'invio ────────────────────────
/**
 * Trasforma il draft in un payload pulito pronto per il backend.
 * Usata da handleSubmit.
 *
 * IMPORTANTE: i task vengono normalizzati includendo payload_schema,
 * che il backend salva e poi restituisce in GET /challenges/:id/tasks.
 * Senza questo campo, ChallengeSubmitPage non può costruire il form dinamico.
 */
function buildPayload(draft) {
  const copy = JSON.parse(JSON.stringify(draft));

  // organizer_visibility → dentro visibility_options
  if (copy.organizer_visibility) {
    copy.visibility_options = {
      ...(copy.visibility_options || {}),
      organizer_visibility: copy.organizer_visibility,
    };
    delete copy.organizer_visibility;
  }

  // XOR: CO₂e vs difficulty — tieni solo uno
  const hasCo2 =
    copy.co2e_estimate_kg !== undefined &&
    copy.co2e_estimate_kg !== null &&
    String(copy.co2e_estimate_kg).trim() !== "";
  const hasDiff =
    typeof copy.difficulty === "string" && copy.difficulty.trim() !== "";

  if (hasCo2 && hasDiff) {
    copy.difficulty = null; // CO₂e ha priorità se entrambi valorizzati
  }

  // Normalizzazione task:
  // - Garantisce valori di default leciti per tutti i campi
  // - INCLUDE payload_schema (campo aggiunto in StepTargets)
  //   senza il quale il form dinamico del volontario non funziona
  if (Array.isArray(copy.tasks)) {
    copy.tasks = copy.tasks.map((t) => ({
      ...(t.id ? { id: t.id } : {}),
      label:            (t.label || "").trim(),
      evidence_required: !!t.evidence_required,
      evidence_types:   Array.isArray(t.evidence_types) && t.evidence_types.length
                          ? t.evidence_types
                          : ["photo"],
      verification:     t.verification || "judge",
      // payload_schema: salvato dal backend, letto da ChallengeSubmitPage
      // Non rimuovere — romperebbe il form dinamico dei volontari
      ...(t.payload_schema ? { payload_schema: t.payload_schema } : {}),
      // calculator_name: plugin Impact Engine del task. Omesso se non scelto
      // (il backend tratta l'assenza come noop / nessun calcolo).
      ...(t.calculator_name ? { calculator_name: t.calculator_name } : {}),
    }));
  }

  return copy;
}
