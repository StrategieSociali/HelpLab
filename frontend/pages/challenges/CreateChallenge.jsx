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
 * Fix applicati in questo aggiornamento:
 * - Blocco JSX "Preview punti" spostato dentro il return (era floating)
 * - payload_schema incluso nella normalizzazione dei task in handleSubmit
 *   e in previewServerScoring, così il backend lo riceve e lo salva
 */

import React, { useEffect, useMemo, useState } from "react";
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

  // ── Anteprima punteggio server ──────────────────────────────────────────
  const [serverScore,  setServerScore]  = useState(null);
  const [scoringBusy,  setScoringBusy]  = useState(false);

  const previewServerScoring = async () => {
    setScoringBusy(true);
    setServerScore(null);
    try {
      const body = buildPayload(draft);
      const { data } = await api.post("/v1/challenges/preview-scoring", body);
      setServerScore(data); // { version, points_estimate_total, breakdown, notes }
    } catch (e) {
      console.error("preview-scoring failed", e?.response || e);
      alert("Anteprima punteggio non disponibile al momento.");
    } finally {
      setScoringBusy(false);
    }
  };

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

  // ── Preview punti locale (client-side, indicativa) ───────────────────────
  const pointsPreview = useMemo(() => {
    const COEF = 1.0;
    if (draft.co2e_estimate_kg != null && !draft.difficulty) {
      return Math.max(
        0,
        Math.round(Number(draft.co2e_estimate_kg || 0) * COEF)
      );
    }
    if (draft.difficulty && draft.co2e_estimate_kg == null) {
      const base    = 3;
      const mult    = { low: 1.0, medium: 1.25, high: 1.5 }[draft.difficulty] || 1;
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
            <StepImpact
              value={draft}
              onChange={set}
              pointsPreview={pointsPreview}
            />
          )}
          {step === 4 && (
            <StepSponsor
              value={draft}
              onChange={set}
              pointsPreview={pointsPreview}
            />
          )}
        </div>

        {/* Preview punti — visibile in tutti gli step
            NOTA: il calcolo server usa buildPayload() che include
            payload_schema, così il preview è coerente col submit. */}
        <div className="points-preview" style={{ marginTop: 10 }}>
          Punti stimati (client):{" "}
          <strong className="points-value">{pointsPreview}</strong>
          <button
            className="btn btn-outline btn-small"
            type="button"
            onClick={previewServerScoring}
            disabled={scoringBusy}
            style={{ marginLeft: 8 }}
          >
            {scoringBusy ? "Calcolo…" : "Calcola punteggio server"}
          </button>
        </div>

        {serverScore && (
          <div className="card" style={{ marginTop: 8, padding: 10 }}>
            <div>
              <strong>Server:</strong> {serverScore.points_estimate_total}
            </div>
            {Array.isArray(serverScore.breakdown) &&
              serverScore.breakdown.length > 0 && (
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {serverScore.breakdown.map((b, i) => (
                    <li key={i}>
                      {b.label}: {b.value}
                    </li>
                  ))}
                </ul>
              )}
            {Array.isArray(serverScore.notes) &&
              serverScore.notes.length > 0 && (
                <small className="muted">
                  Note: {serverScore.notes.join("; ")}
                </small>
              )}
          </div>
        )}

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
 * Usata sia in handleSubmit che in previewServerScoring per garantire
 * che entrambe le chiamate inviino esattamente gli stessi dati.
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
    }));
  }

  return copy;
}
