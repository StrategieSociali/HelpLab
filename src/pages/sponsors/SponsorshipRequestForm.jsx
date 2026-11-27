// src/pages/sponsors/SponsorshipRequestForm.jsx
/**
 * Form di candidatura per sponsorizzare una challenge o un evento.
 * Accessibile solo a utenti con role === "sponsor".
 *
 * Comportamento:
 *   - Legge ?challenge=ID o ?event=ID dalla query string per pre-selezionare il bersaglio
 *   - Supporta target_type: "challenge" | "event" | "platform"
 *   - Quando target_type === "challenge", mostra un selettore challenge
 *     popolato da GET /challenges?seeking_sponsor=true
 *   - Quando target_type === "event" (8a, passo 7), un selettore degli eventi
 *     pubblicati e non ancora finiti (GET /events?status=published). Fino al
 *     2.0.0-alpha.8 «Un evento» si poteva scegliere ma la richiesta non partiva:
 *     mancava il selettore e il BE vuole event_id. Se l'evento è di un ente, la
 *     richiesta passa prima dall'ente: lo dicono i next_steps del BE
 *   - Post-invio mostra i next_steps ricevuti dal BE
 *
 * ROUTE: /dashboard/sponsor/candidatura  (routes.community.sponsorshipRequest)
 * RUOLO: sponsor
 *
 * DIPENDENZE API:
 *   GET  /v1/sponsors/me   (404 = profilo non ancora creato: lo si dice subito,
 *                           prima di far compilare il modulo — 5/10/2026)
 *   GET  /v1/challenges?seeking_sponsor=true
 *   GET  /v1/events?status=published&limit=50
 *   POST /v1/sponsorship-requests
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, API_PATHS } from "@/api/client";
import { routes } from "@/routes";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const MOTIVATION_MIN = 20; // caratteri minimi richiesti dal BE per sponsorship-requests

const TARGET_TYPES = [
  { value: "challenge", label: "Una sfida specifica" },
  { value: "event",     label: "Un evento" },
  { value: "platform",  label: "La piattaforma in generale" },
];

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

export default function SponsorshipRequestForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // challenge_id o event_id pre-compilati da query param ?challenge=ID / ?event=ID
  const preselectedChallengeId = searchParams.get("challenge") || "";
  const preselectedEventId     = searchParams.get("event") || "";

  // ── Stato form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    target_type:        preselectedEventId ? "event" : "challenge",
    challenge_id:       preselectedChallengeId,
    event_id:           preselectedEventId,
    motivation:         "",
    report_requests:    "",
    budget_proposed_eur: "",
  });

  // ── Stato UI ─────────────────────────────────────────────────────────────
  const [challenges, setChallenges]   = useState([]);
  const [chLoading, setChLoading]     = useState(false);
  const [events, setEvents]           = useState([]);
  const [evLoading, setEvLoading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [submitted, setSubmitted]     = useState(false);
  const [nextSteps, setNextSteps]     = useState([]);
  const [waitingFor, setWaitingFor]   = useState(null);
  const [noProfile, setNoProfile]     = useState(false);

  // ── Profilo sponsor: senza, il BE rifiuta la candidatura ─────────────────
  // Si controlla all'apertura invece di far scoprire il problema all'invio, dove
  // arrivava il messaggio tecnico del BE (rilievo PM 5/10/2026).
  useEffect(() => {
    api.get("/v1/sponsors/me").catch((err) => {
      if (err?.response?.status === 404) setNoProfile(true);
    });
  }, []);

  // ── Fetch challenge che cercano sponsor ──────────────────────────────────
  // Caricato solo quando target_type === "challenge"
  const loadChallenges = useCallback(async () => {
    setChLoading(true);
    try {
      const { data } = await api.get(
        API_PATHS.challenges("?seeking_sponsor=true&limit=50")
      );
      setChallenges(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setChallenges([]);
    } finally {
      setChLoading(false);
    }
  }, []);

  // ── Fetch eventi pubblicati (8a, passo 7) ────────────────────────────────
  // Si offrono solo quelli non ancora finiti: un evento concluso il BE lo rifiuta.
  const loadEvents = useCallback(async () => {
    setEvLoading(true);
    try {
      const { data } = await api.get(API_PATHS.events("?status=published&limit=50"));
      const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, giorno locale
      const items = Array.isArray(data?.items) ? data.items : [];
      setEvents(items.filter((ev) => String(ev.end_date || "").slice(0, 10) >= today));
    } catch {
      setEvents([]);
    } finally {
      setEvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (form.target_type === "challenge") {
      loadChallenges();
    }
    if (form.target_type === "event") {
      loadEvents();
    }
  }, [form.target_type, loadChallenges, loadEvents]);

  // ── Handlers form ─────────────────────────────────────────────────────────
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Quando cambia target_type, resetta challenge_id ed event_id
      if (name === "target_type") { next.challenge_id = ""; next.event_id = ""; }
      return next;
    });
  };

  const motivationLeft = Math.max(0, MOTIVATION_MIN - form.motivation.length);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (e) => {
    e.preventDefault();
    // Prima usciva in silenzio, con il pulsante disattivato: sembrava bloccato
    // (rilievo PM 5/10/2026). Ora il pulsante resta attivo e il motivo si legge.
    if (motivationLeft > 0) {
      setError(
        `La motivazione deve avere almeno ${MOTIVATION_MIN} caratteri: ne mancano ${motivationLeft}.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = {
        target_type: form.target_type,
        motivation:  form.motivation,
      };

      // challenge_id: obbligatorio solo per target_type === "challenge"
      if (form.target_type === "challenge") {
        if (!form.challenge_id) {
          setError("Seleziona una sfida prima di continuare.");
          setSubmitting(false);
          return;
        }
        body.challenge_id = Number(form.challenge_id);
      }

      // event_id: obbligatorio solo per target_type === "event"
      if (form.target_type === "event") {
        if (!form.event_id) {
          setError("Seleziona un evento prima di continuare.");
          setSubmitting(false);
          return;
        }
        body.event_id = Number(form.event_id);
      }

      // report_requests: opzionale
      if (form.report_requests.trim()) {
        body.report_requests = form.report_requests.trim();
      }

      // budget: opzionale, ma se inserito deve essere un numero positivo
      if (form.budget_proposed_eur !== "") {
        const budget = parseFloat(form.budget_proposed_eur);
        if (isNaN(budget) || budget <= 0) {
          setError("Il budget deve essere un numero positivo.");
          setSubmitting(false);
          return;
        }
        body.budget_proposed_eur = budget;
      }

      const res = await api.post(API_PATHS.sponsorshipRequests(), body);
      setNextSteps(res.data?.next_steps || []);
      setWaitingFor(res.data?.waiting_for || null);
      setSubmitted(true);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        setError(
          "Hai già una candidatura attiva per questa sfida o per questo evento. " +
          "Puoi visualizzarla nella tua dashboard candidature."
        );
      } else if (status === 403) {
        setError(
          "Per candidarti devi completare il profilo sponsor. " +
          "Vai in 'Il mio profilo' e compila i dati richiesti."
        );
      } else {
        setError(
          err?.response?.data?.error ||
          "Errore nell'invio della candidatura. Riprova tra qualche momento."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Stato post-invio ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="callout success">
            <h2 style={{ marginTop: 0 }}>✅ Candidatura inviata!</h2>
            <p>
              {waitingFor === "organization"
                ? "L'ente che organizza l'evento leggerà la tua proposta; dopo il suo sì la esaminerà il team di HelpLab."
                : "Il team di HelpLab esaminerà la tua richiesta."}
            </p>

            {nextSteps.length > 0 && (
              <ul style={{ marginTop: 12, paddingLeft: 18 }}>
                {nextSteps.map((step, i) => (
                  <li key={i} className="small" style={{ marginBottom: 4 }}>
                    {step}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <Link
              to={routes.community.mySponsorships}
              className="btn btn-primary"
            >
              Vai alle mie candidature
            </Link>
            <button
              className="btn btn-outline"
              onClick={() => {
                setSubmitted(false);
                setNextSteps([]);
                setWaitingFor(null);
                setForm({
                  target_type:         "challenge",
                  challenge_id:        "",
                  event_id:            "",
                  motivation:          "",
                  report_requests:     "",
                  budget_proposed_eur: "",
                });
              }}
            >
              Invia un'altra candidatura
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-bg page-text">
      <div className="container" style={{ maxWidth: 680 }}>

        <header className="page-header">
          <h1 className="page-title">Candidatura sponsorizzazione</h1>
          <p className="page-subtitle">
            Compila il modulo per candidarti come sponsor. Il team di HelpLab
            esaminerà la richiesta e ti contatterà tramite il pannello personale.
          </p>
        </header>

        {error && (
          <div className="callout error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {noProfile ? (
          <div className="callout neutral">
            <p>
              <strong>Prima di candidarti crea il tuo profilo sponsor.</strong> Nome,
              sito e logo sono quelli che la community vedrà accanto alla sfida.
            </p>
            <Link
              to={routes.community.sponsorEdit}
              className="btn btn-primary"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Crea il profilo sponsor
            </Link>
          </div>
        ) : (
        <form
          onSubmit={onSubmit}
          className="registration-form"
          aria-label="Modulo candidatura sponsorizzazione"
        >

          {/* Tipo di sponsorizzazione */}
          <div className="form-group">
            <label htmlFor="target_type">Cosa vuoi sponsorizzare?</label>
            <select
              id="target_type"
              name="target_type"
              value={form.target_type}
              onChange={onChange}
              disabled={submitting}
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selettore challenge — visibile solo se target_type === "challenge" */}
          {form.target_type === "challenge" && (
            <div className="form-group">
              <label htmlFor="challenge_id">
                Sfida da sponsorizzare{" "}
                <span className="muted small">(obbligatorio)</span>
              </label>

              {chLoading ? (
                <p className="muted small">Caricamento sfide…</p>
              ) : challenges.length === 0 ? (
                <div className="callout neutral">
                  Nessuna sfida cerca sponsor al momento.{" "}
                  <Link to={routes.dashboard.challenges}>
                    Esplora tutte le sfide
                  </Link>
                  .
                </div>
              ) : (
                <select
                  id="challenge_id"
                  name="challenge_id"
                  value={form.challenge_id}
                  onChange={onChange}
                  required={form.target_type === "challenge"}
                  disabled={submitting}
                >
                  <option value="">— Seleziona una sfida —</option>
                  {challenges.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                      {ch.location ? ` — ${ch.location}` : ""}
                      {ch.deadline
                        ? ` (scadenza ${new Date(ch.deadline).toLocaleDateString("it-IT")})`
                        : ""}
                    </option>
                  ))}
                </select>
              )}

              {/* Info sulla sfida pre-selezionata da query param */}
              {preselectedChallengeId && form.challenge_id === preselectedChallengeId && (
                <p className="small muted" style={{ marginTop: 4 }}>
                  Sfida pre-selezionata dalla pagina precedente.
                </p>
              )}
            </div>
          )}

          {/* Selettore evento — visibile solo se target_type === "event" (8a, passo 7) */}
          {form.target_type === "event" && (
            <div className="form-group">
              <label htmlFor="event_id">
                Evento da sponsorizzare{" "}
                <span className="muted small">(obbligatorio)</span>
              </label>

              {evLoading ? (
                <p className="muted small">Caricamento eventi…</p>
              ) : events.length === 0 ? (
                <div className="callout neutral">
                  Nessun evento in programma al momento.{" "}
                  <Link to={routes.events.list} className="link-accent">
                    Esplora gli eventi
                  </Link>
                  .
                </div>
              ) : (
                <select
                  id="event_id"
                  name="event_id"
                  value={form.event_id}
                  onChange={onChange}
                  required
                  disabled={submitting}
                >
                  <option value="">— Seleziona un evento —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                      {ev.start_date
                        ? ` (dal ${new Date(ev.start_date).toLocaleDateString("it-IT")})`
                        : ""}
                    </option>
                  ))}
                </select>
              )}

              <p className="small muted" style={{ marginTop: 4 }}>
                Se l'evento è organizzato da un ente, la proposta passa prima
                dall'ente, che la accetta o la declina; dopo il suo sì la esamina
                il team di HelpLab.
              </p>
            </div>
          )}

          {/* Budget proposto */}
          <div className="form-group">
            <label htmlFor="budget_proposed_eur">
              Budget proposto (€){" "}
              <span className="muted small">(opzionale)</span>
            </label>
            <input
              id="budget_proposed_eur"
              name="budget_proposed_eur"
              type="number"
              min="1"
              step="1"
              value={form.budget_proposed_eur}
              onChange={onChange}
              placeholder="es. 500"
              disabled={submitting}
            />
            <p className="small muted" style={{ marginTop: 4 }}>
              Indica un budget orientativo. Il dettaglio verrà definito
              con il team dopo l'approvazione.
            </p>
          </div>

          {/* Motivazione */}
          <div className="form-group">
            <label htmlFor="motivation">
              Motivazione e obiettivi{" "}
              <span className="muted small">(min. {MOTIVATION_MIN} caratteri)</span>
            </label>
            <textarea
              id="motivation"
              name="motivation"
              rows={5}
              value={form.motivation}
              onChange={onChange}
              placeholder="Descrivi perché vuoi sponsorizzare questa sfida e quali obiettivi di sostenibilità vuoi supportare…"
              required
              minLength={MOTIVATION_MIN}
              disabled={submitting}
              aria-describedby="motivation-counter"
            />
            {motivationLeft > 0 && (
              <p
                id="motivation-counter"
                className="small muted"
                style={{ marginTop: 4 }}
              >
                Ancora {motivationLeft} caratteri
              </p>
            )}
          </div>

          {/* Richieste di report — opzionale */}
          <div className="form-group">
            <label htmlFor="report_requests">
              Richieste per il report di impatto{" "}
              <span className="muted small">(opzionale)</span>
            </label>
            <textarea
              id="report_requests"
              name="report_requests"
              rows={3}
              value={form.report_requests}
              onChange={onChange}
              placeholder="es. Mappatura ESRS S3, calcolo SROI, formato PDF per il bilancio di sostenibilità…"
              disabled={submitting}
            />
            <p className="small muted" style={{ marginTop: 4 }}>
              Indica eventuali standard o formati specifici di rendicontazione
              richiesti dalla tua azienda.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? "Invio in corso…" : "Invia candidatura"}
            </button>

            <Link
              to={routes.community.mySponsorships}
              className="btn btn-outline"
            >
              Le mie candidature
            </Link>
          </div>

        </form>
        )}

        {/* Link utili */}
        <p className="small muted sponsor-footer-links" style={{ marginTop: 32 }}>
          Hai bisogno di aggiornare il tuo profilo aziendale prima di procedere?{" "}
          <Link to={routes.community.sponsorEdit}>Vai al profilo sponsor</Link>.
        </p>

      </div>
    </section>
  );
}
