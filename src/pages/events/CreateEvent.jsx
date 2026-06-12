// src/pages/events/CreateEvent.jsx
/**
 * CreateEvent.jsx
 * ---------------
 * Wizard 2-step per la creazione di un nuovo evento (solo admin).
 *
 * Step 1 — StepEventDetails:    nome, date, luogo, descrizione, logo
 * Step 2 — StepEventChallenges: collegamento sfide esistenti (facoltativo)
 *
 * FLUSSO SUBMIT (2 chiamate indipendenti — non atomiche):
 *   1. POST /events              → crea evento, ottieni event.id
 *   2. POST /events/:id/challenges (una per ogni challenge selezionata)
 *
 * GESTIONE ERRORI (come da indicazione BE):
 * - Se step 1 fallisce → errore bloccante, niente è stato creato
 * - Se step 2 fallisce parzialmente → evento esiste già in draft,
 *   messaggio specifico con retry. NON mostrare "creazione fallita".
 * - L'event.id viene salvato in stato prima di qualsiasi chiamata step 2,
 *   così il retry chiama solo POST /events/:id/challenges senza ricreare.
 *
 * ROUTE: /dashboard/eventi/crea
 * ACCESSO: qualsiasi utente autenticato (BE crea in draft, admin approva)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roles";
import { createEvent, linkChallengeToEvent } from "@/api/events.api";
import { routes } from "@/routes";
import StepEventDetails from "./steps/StepEventDetails";
import StepEventChallenges from "./steps/StepEventChallenges";

const TOTAL_STEPS = 2;

// Draft vuoto — valori iniziali sicuri
const EMPTY_DRAFT = {
  name:             "",
  description:      "",
  start_date:       "",
  end_date:         "",
  location_address: "",
  logo_url:         "",
  challengeIds:     [], // non va al BE — usato solo internamente
};

export default function CreateEvent() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const isAdminUser = isAdmin(user?.role);

  // Dopo la creazione: admin → gestione eventi, utente → i miei eventi
  const postCreateRoute = isAdminUser ? routes.admin.events : routes.events.mine;

  const [step, setStep]   = useState(1);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });

  // Stato submit
  const [busy, setBusy]         = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ID evento creato — salvato prima delle chiamate di collegamento challenge
  // Se il collegamento fallisce, il retry usa questo id senza ricreare l'evento
  const [createdEventId, setCreatedEventId]     = useState(null);
  const [createdEventSlug, setCreatedEventSlug] = useState(null);
  // Challenge che non è stato possibile collegare (per retry selettivo)
  const [failedChallengeIds, setFailedChallengeIds] = useState([]);

  const set  = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  // ── Validazione step 1 ────────────────────────────────────────────────
  function isStep1Valid() {
    const nameOk  = (draft.name || "").trim().length >= 5;
    const datesOk =
      !!draft.start_date &&
      !!draft.end_date &&
      new Date(draft.end_date) >= new Date(draft.start_date);
    return nameOk && datesOk;
  }

  // ── Submit principale ─────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitError("");
    setBusy(true);

    // ── Fase 1: crea evento ──────────────────────────────────────────
    let eventId   = createdEventId;   // se stiamo facendo un retry
    let eventSlug = createdEventSlug;

    if (!eventId) {
      try {
        const payload = buildEventPayload(draft);
        const data    = await createEvent(payload);
        eventId   = data.id;
        eventSlug = data.slug;
        // Salva immediatamente — se fase 2 fallisce abbiamo l'id per il retry
        setCreatedEventId(eventId);
        setCreatedEventSlug(eventSlug);
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Errore durante la creazione dell'evento. Riprova.";
        setSubmitError(msg);
        setBusy(false);
        return;
      }
    }

    // ── Fase 2: collega challenge (facoltativa) ──────────────────────
    const idsToLink = failedChallengeIds.length > 0
      ? failedChallengeIds  // retry: solo quelle fallite
      : (draft.challengeIds || []).filter(Boolean);

    if (idsToLink.length === 0) {
      // Nessuna challenge da collegare — naviga alla destinazione corretta per ruolo
      navigate(postCreateRoute);
      return;
    }

    const failed = [];
    for (const challengeId of idsToLink) {
      try {
        await linkChallengeToEvent(eventId, Number(challengeId));
      } catch (err) {
        const status = err?.response?.status;
        // 409 = già collegata a questo evento — non è un errore bloccante
        if (status !== 409) {
          failed.push(challengeId);
        }
      }
    }

    setBusy(false);

    if (failed.length > 0) {
      // Salva gli id falliti per il retry selettivo
      setFailedChallengeIds(failed);
      setSubmitError(
        `Evento creato, ma il collegamento a ${failed.length} sfida${failed.length > 1 ? " non è riuscito" : " non è riuscito"}. ` +
        `Clicca "Riprova collegamento" per riprovare, oppure approva l'evento e collegale manualmente.`
      );
      return;
    }

    // Tutto ok — naviga alla destinazione corretta per ruolo
    // Admin → gestione eventi, utente normale → i miei eventi
    // In entrambi i casi l'evento è in draft e non è ancora visibile pubblicamente.
    navigate(postCreateRoute);
  }

  // ── Retry solo collegamento challenge ─────────────────────────────────
  async function handleRetryLink() {
    if (!createdEventId || failedChallengeIds.length === 0) return;
    await handleSubmit();
  }

  // ── Vai alla destinazione corretta anche se il collegamento è fallito ──
  function handleGoToEvent() {
    navigate(postCreateRoute);
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text">
      <div className="container">

        {/* Header */}
        <div className="page-header">
          <h2 className="page-title">Crea un nuovo evento</h2>
        </div>

        {/* Indicatore step */}
        <div className="wizard-steps" style={{ marginBottom: 16 }}>
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`chip ${n === step ? "chip--active" : ""}`}
              onClick={() => {
                // Permetti navigazione indietro libera, in avanti solo se step 1 valido
                if (n < step || (n === 2 && isStep1Valid())) setStep(n);
              }}
              role="button"
              aria-label={`Vai allo step ${n}`}
              aria-current={n === step ? "step" : undefined}
              style={{ cursor: "pointer" }}
            >
              {n === 1 ? "1 · Dettagli" : "2 · Sfide"}
            </div>
          ))}
        </div>

        {/* Contenuto step */}
        <div className="card" style={{ padding: "20px 24px" }}>
          {step === 1 && <StepEventDetails value={draft} onChange={set} />}
          {step === 2 && <StepEventChallenges value={draft} onChange={set} />}
        </div>

        {/* Errore submit */}
        {submitError && (
          <div className="card-info error" style={{ marginTop: 12 }} role="alert">
            <div style={{ marginBottom: failedChallengeIds.length > 0 ? 10 : 0 }}>
              {submitError}
            </div>
            {/* Azioni di recovery quando l'evento è già stato creato */}
            {createdEventId && failedChallengeIds.length > 0 && (
              <div className="dynamic-actions">
                <button
                  className="btn btn-outline btn-small"
                  onClick={handleRetryLink}
                  disabled={busy}
                >
                  {busy ? "Riprovo…" : "Riprova collegamento"}
                </button>
                <button
                  className="btn btn-ghost btn-small"
                  onClick={handleGoToEvent}
                >
                  Vai all'evento senza collegare
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigazione wizard */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-outline"
            onClick={prev}
            disabled={step === 1 || busy}
          >
            Indietro
          </button>

          {step < TOTAL_STEPS ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!isStep1Valid()) {
                  setSubmitError("Compila nome evento e date prima di procedere.");
                  return;
                }
                setSubmitError("");
                next();
              }}
              disabled={busy}
            >
              Avanti
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={busy || !!createdEventId && failedChallengeIds.length === 0}
              aria-busy={busy}
            >
              {busy
                ? "Creazione in corso…"
                : createdEventId
                ? "Evento già creato — riprova collegamento"
                : "Crea evento"}
            </button>
          )}
        </div>

      </div>
    </section>
  );
}

// ── Utility: normalizza il draft nel payload per POST /events ─────────────────
/**
 * Rimuove i campi interni (challengeIds) e i campi vuoti non necessari.
 * Non inviare mai lo slug — viene generato dal BE dal campo name.
 */
function buildEventPayload(draft) {
  const payload = {};

  if (draft.name?.trim())             payload.name             = draft.name.trim();
  if (draft.description?.trim())      payload.description      = draft.description.trim();
  if (draft.start_date)               payload.start_date       = draft.start_date;
  if (draft.end_date)                 payload.end_date         = draft.end_date;
  if (draft.location_address?.trim()) payload.location_address = draft.location_address.trim();
  if (draft.logo_url?.trim())         payload.logo_url         = draft.logo_url.trim();

  // challengeIds è solo interno al wizard — non va al BE
  // location_geo non è gestito in questo form (vedi decisione UX — opzione e)

  return payload;
}
