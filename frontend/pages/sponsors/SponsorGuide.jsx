// src/pages/sponsors/SponsorGuide.jsx
/**
 * Pagina pubblica "Come sponsorizzare una sfida".
 *
 * Gestisce tre stati utente in un'unica pagina:
 *
 *  1. NON LOGGATO
 *     - Spiega il processo in 3 step
 *     - Mostra le challenge che cercano sponsor (?seeking_sponsor=true)
 *     - CTA: Registrati / Accedi
 *
 *  2. LOGGATO come "user" (non ancora sponsor)
 *     - Stesso contenuto pubblico
 *     - Form per richiedere l'upgrade a ruolo "sponsor"
 *     - Se ha già una richiesta pending: mostra stato
 *     - Se la richiesta è stata approvata: triggera refresh token
 *       (il JWT corrente ha ancora il vecchio ruolo — vedi note BE)
 *     - Se la richiesta è stata rifiutata: mostra rejection_reason
 *       e permette di inviarne una nuova
 *
 *  3. GIÀ SPONSOR
 *     - Reindirizza direttamente a MySponsorships
 *
 * DIPENDENZE API:
 *   GET  /v1/challenges?seeking_sponsor=true
 *   POST /v1/role-requests
 *   GET  /v1/role-requests/mine
 *   POST /v1/auth/refresh  (per aggiornare JWT dopo approvazione)
 *
 * ROUTE: /sponsorizza  (routes.community.sponsorGuide)
 */

import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/routes";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const MOTIVATION_MIN = 30; // caratteri minimi richiesti dal BE

// I tre step del processo — testo statico, non viene dal BE
const PROCESS_STEPS = [
  {
    number: "01",
    title: "Scegli una sfida",
    body:
      "Esplora le sfide attive che cercano sponsor. Ogni sfida ha un obiettivo " +
      "misurabile e un giudice indipendente che ne certifica i risultati.",
  },
  {
    number: "02",
    title: "Invia la tua candidatura",
    body:
      "Proponi il tuo budget e le tue aspettative. Il team di HelpLab esamina " +
      "ogni candidatura e ti contatta per definire i dettagli.",
  },
  {
    number: "03",
    title: "Genera impatto verificabile",
    body:
      "I tuoi dati di sponsorizzazione sono pubblici, auditabili e mappati su " +
      "standard ESG/ESRS. Ricevi un report di impatto al termine della sfida.",
  },
];

// ---------------------------------------------------------------------------
// Sottocomponente: step del processo
// ---------------------------------------------------------------------------
function ProcessStep({ number, title, body }) {
  return (
    <div className="sponsor-guide__step">
      <div className="sponsor-guide__step-number" aria-hidden="true">
        {number}
      </div>
      <div>
        <h3 className="sponsor-guide__step-title">{title}</h3>
        <p className="sponsor-guide__step-body muted">{body}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sottocomponente: card challenge che cerca sponsor
// ---------------------------------------------------------------------------
function SeekingChallengeCard({ challenge, onSelect }) {
  return (
    <article className="card ch-card glass">
      <div className="card-header">
        <span className="chip">
          {challenge.status === "open" ? "Aperta" : challenge.status}
        </span>
        {challenge.location && (
          <span className="chip">{challenge.location}</span>
        )}
      </div>

      <h3 className="card-title">{challenge.title}</h3>

      {challenge.budget?.amount && (
        <p className="muted small">
          Budget ricercato:{" "}
          <strong>
            {challenge.budget.amount}
            {challenge.budget.currency === "EUR" ? "€" : ` ${challenge.budget.currency}`}
          </strong>
        </p>
      )}

      {challenge.deadline && (
        <p className="muted small">
          Scadenza:{" "}
          <strong>{new Date(challenge.deadline).toLocaleDateString("it-IT")}</strong>
        </p>
      )}

      <div className="card-actions" style={{ marginTop: 12 }}>
        <button
          className="btn btn-primary"
          onClick={() => onSelect(challenge)}
        >
          Sponsorizza questa sfida
        </button>
        <Link
          to={routes.dashboard.challengeLive(challenge.id)}
          className="btn btn-ghost"
        >
          Segui l'impatto live
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Sottocomponente: stato richiesta ruolo esistente
// ---------------------------------------------------------------------------
function RoleRequestStatus({ request, onRefreshToken, onNewRequest }) {
  const statusMap = {
    pending: {
      label: "In attesa di approvazione",
      className: "callout neutral",
      icon: "⏳",
    },
    approved: {
      label: "Richiesta approvata!",
      className: "callout success",
      icon: "✅",
    },
    rejected: {
      label: "Richiesta non approvata",
      className: "callout error",
      icon: "❌",
    },
  };

  const ui = statusMap[request.status] || statusMap.pending;

  return (
    <div className={ui.className} style={{ marginTop: 16 }}>
      <p>
        <strong>
          {ui.icon} {ui.label}
        </strong>
      </p>

      {request.status === "pending" && (
        <p className="small muted" style={{ marginTop: 4 }}>
          Il team di HelpLab esaminerà la tua richiesta. Riceverai un
          aggiornamento nel tuo pannello personale.
        </p>
      )}

      {request.status === "approved" && (
        <>
          <p className="small" style={{ marginTop: 4 }}>
            Sei ora uno sponsor HelpLab. Clicca per attivare il nuovo ruolo
            nella sessione corrente — poi potrai creare il tuo profilo aziendale
            e candidarti alle sfide.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={onRefreshToken}
          >
            Attiva ruolo sponsor
          </button>
        </>
      )}

      {request.status === "rejected" && (
        <>
          {request.rejection_reason && (
            <p className="small" style={{ marginTop: 4 }}>
              <strong>Motivazione:</strong> {request.rejection_reason}
            </p>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>
            Puoi inviare una nuova richiesta tenendo conto del feedback ricevuto.
          </p>
         <button
          className="btn btn-outline"
           style={{ 
             marginTop: 12,
             borderColor: 'rgb(185,28,28)',
             color: 'rgb(185,28,28)',
             fontWeight: 600
           }}
          onClick={onNewRequest}
         >
           Invia nuova richiesta
        </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sottocomponente: form richiesta ruolo sponsor
// ---------------------------------------------------------------------------
function RoleRequestForm({ onSuccess }) {
  const [form, setForm] = useState({
    motivation: "",
    company_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const motivationLeft = Math.max(
    0,
    MOTIVATION_MIN - form.motivation.length
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.motivation.length < MOTIVATION_MIN) return;

    setSubmitting(true);
    setError(null);

    try {
      const body = {
        requested_role: "sponsor",
        motivation: form.motivation,
      };
      if (form.company_name.trim()) {
        body.company_name = form.company_name.trim();
      }

      const res = await api.post(API_PATHS.roleRequests(), body);
      // Passa la response completa al parent — include next_steps
      onSuccess(res.data);
    } catch (err) {
      const status = err?.response?.status;

      if (status === 409) {
        setError(
          "Hai già una richiesta in attesa per questo ruolo. Attendi l'esito prima di inviarne un'altra."
        );
      } else if (status === 400) {
        setError(
          err?.response?.data?.error ||
            "Dati non validi. Controlla i campi e riprova."
        );
      } else {
        setError("Errore nell'invio della richiesta. Riprova tra qualche momento.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="registration-form"
      style={{ marginTop: 24 }}
      aria-label="Modulo richiesta ruolo sponsor"
    >
      <div className="form-group">
        <label htmlFor="company_name">
          Nome azienda / organizzazione{" "}
          <span className="muted small">(opzionale, ma consigliato)</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          value={form.company_name}
          onChange={onChange}
          placeholder="es. Azienda Srl"
          disabled={submitting}
        />
        <p className="small muted" style={{ marginTop: 4 }}>
          Aiuta il team a valutare la tua richiesta. Potrai usarlo per
          pre-compilare il profilo sponsor dopo l'approvazione.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="motivation">
          Perché vuoi diventare sponsor?{" "}
          <span className="muted small">(min. {MOTIVATION_MIN} caratteri)</span>
        </label>
        <textarea
          id="motivation"
          name="motivation"
          rows={5}
          value={form.motivation}
          onChange={onChange}
          placeholder="Descrivi brevemente la tua organizzazione, gli obiettivi di sostenibilità che vuoi supportare e il sito web aziendale (es. https://miazienda.it)…"
          required
          minLength={MOTIVATION_MIN}
          disabled={submitting}
          aria-describedby="motivation-hint"
        />
        {motivationLeft > 0 && (
          <p
            id="motivation-hint"
            className="small muted"
            style={{ marginTop: 4 }}
          >
            Ancora {motivationLeft} caratteri
          </p>
        )}
      </div>

      {error && (
        <div className="callout error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="submit-button"
        disabled={submitting || motivationLeft > 0}
      >
        {submitting ? "Invio in corso…" : "Invia richiesta"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export default function SponsorGuide() {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshToken } = useAuth?.() || {};

  // Stato challenge che cercano sponsor
  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  // Stato richiesta ruolo
  const [roleRequest, setRoleRequest] = useState(null);   // richiesta esistente
  const [roleLoading, setRoleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);       // appena inviata
  const [nextSteps, setNextSteps] = useState([]);          // da BE post-submit
  const [showForm, setShowForm] = useState(false);         // forza nuovo form dopo reject

  const isUser = isAuthenticated && user?.role === "user";
  const isSponsor = isAuthenticated && user?.role === "sponsor";
  const isAdmin = isAuthenticated && user?.role === "admin";

  // -------------------------
  // Redirect sponsor già approvato
  // -------------------------
  useEffect(() => {
    if (isSponsor) {
      navigate(routes.community.mySponsorships, { replace: true });
    }
  }, [isSponsor, navigate]);

  // -------------------------
  // Fetch challenge seeking_sponsor
  // -------------------------
  useEffect(() => {
    async function loadChallenges() {
      setChallengesLoading(true);
      try {
        const { data } = await api.get(
          API_PATHS.challenges("?seeking_sponsor=true&limit=6")
        );
        setChallenges(Array.isArray(data?.items) ? data.items : []);
      } catch {
        // fallback silenzioso — la sezione è accessoria
        setChallenges([]);
      } finally {
        setChallengesLoading(false);
      }
    }
    loadChallenges();
  }, []);

  // -------------------------
  // Fetch stato richiesta ruolo (solo per utenti loggati non-sponsor)
  // -------------------------
  useEffect(() => {
    if (!isUser) return;

    async function loadRoleRequest() {
      setRoleLoading(true);
      try {
        const { data } = await api.get(API_PATHS.roleRequestsMine());
        // Cerco l'ultima richiesta per "sponsor"
        const sponsorRequests = (data?.items || []).filter(
          (r) => r.requested_role === "sponsor"
        );
        if (sponsorRequests.length > 0) {
          // Ordino per data decrescente e prendo la più recente
          sponsorRequests.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setRoleRequest(sponsorRequests[0]);
        }
      } catch {
        // nessuna richiesta trovata — mostra il form
      } finally {
        setRoleLoading(false);
      }
    }
    loadRoleRequest();
  }, [isUser]);

  // -------------------------
  // Handler: challenge selezionata → form candidatura
  // -------------------------
  const handleSelectChallenge = useCallback(
    (challenge) => {
      if (!isAuthenticated) {
        navigate(routes.auth.login);
        return;
      }
      if (isUser) {
        // Non è ancora sponsor — porta alla sezione form richiesta ruolo
        document
          .getElementById("sponsor-request-section")
          ?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      if (isSponsor) {
        navigate(routes.community.sponsorshipRequest(challenge.id));
      }
    },
    [isAuthenticated, isUser, isSponsor, navigate]
  );

  // -------------------------
  // Handler: form inviato con successo
  // -------------------------
  const handleRoleRequestSuccess = useCallback((responseData) => {
    setSubmitted(true);
    setNextSteps(responseData.next_steps || []);
    setRoleRequest({
      requested_role: "sponsor",
      status: "pending",
      company_name: responseData.company_name || null,
      rejection_reason: null,
    });
    setShowForm(false);
  }, []);

  // -------------------------
  // Handler: refresh token dopo approvazione
  // -------------------------
  const handleRefreshToken = useCallback(async () => {
    try {
      // refreshToken è esposto da AuthContext — aggiorna il JWT in memoria
      // e ricarica user.role dal nuovo token
      if (typeof refreshToken === "function") {
        await refreshToken();
      } else {
        // Fallback: forza re-login
        navigate(routes.auth.login);
      }
    } catch {
      navigate(routes.auth.login);
    }
  }, [refreshToken, navigate]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* ── HERO ───────────────────────────────────────────────── */}
        <header className="page-header">
          <h1 className="page-title">Sponsorizza una sfida</h1>
          <p className="page-subtitle" style={{ maxWidth: 680 }}>
            Trasforma il tuo investimento in impatto misurabile. Ogni sfida che
            sostieni genera dati verificabili, mappati su standard ESG/ESRS e
            rendicontabili nel tuo bilancio di sostenibilità.
          </p>
        </header>

        {/* ── PROCESSO IN 3 STEP ─────────────────────────────────── */}
        <div className="sponsor-guide__steps" style={{ marginTop: 40 }}>
          {PROCESS_STEPS.map((step) => (
            <ProcessStep key={step.number} {...step} />
          ))}
        </div>

        {/* ── CHALLENGE CHE CERCANO SPONSOR ──────────────────────── */}
        <section style={{ marginTop: 56 }}>
          <h2 className="section-title">Sfide che cercano sponsor</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Queste sfide sono attive e aperte alla sponsorizzazione.
          </p>

          {challengesLoading && (
            <div className="callout neutral">Caricamento sfide…</div>
          )}

          {!challengesLoading && challenges.length === 0 && (
            <div className="callout neutral">
              Nessuna sfida cerca sponsor in questo momento. Torna presto o{" "}
              <Link to={routes.dashboard.challenges}>
                esplora tutte le sfide
              </Link>
              .
            </div>
          )}

          {!challengesLoading && challenges.length > 0 && (
            <div className="grid-cards">
              {challenges.map((ch) => (
                <SeekingChallengeCard
                  key={ch.id}
                  challenge={ch}
                  onSelect={handleSelectChallenge}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── SEZIONE RICHIESTA RUOLO / CTA ──────────────────────── */}
        <section
          id="sponsor-request-section"
          style={{ marginTop: 64, scrollMarginTop: 80 }}
        >
          {/* NON LOGGATO */}
          {!isAuthenticated && (
            <div className="card glass" style={{ padding: 32, maxWidth: 560 }}>
              <h2 className="section-title" style={{ marginTop: 0 }}>
                Vuoi diventare sponsor?
              </h2>
              <p className="muted">
                Registrati gratuitamente o accedi al tuo account per richiedere
                il ruolo sponsor e candidarti alle sfide.
              </p>
              <div
                style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}
              >
                <Link to={routes.auth.register} className="btn btn-primary">
                  Registrati
                </Link>
                <Link to={routes.auth.login} className="btn btn-outline">
                  Accedi
                </Link>
              </div>
            </div>
          )}

          {/* ADMIN — non può fare richieste */}
          {isAdmin && (
            <div className="callout neutral">
              Gli amministratori non possono richiedere il ruolo sponsor.
            </div>
          )}

          {/* UTENTE LOGGATO — gestione richiesta ruolo */}
          {isUser && (
            <div className="card glass" style={{ padding: 32, maxWidth: 640 }}>
              <h2 className="section-title" style={{ marginTop: 0 }}>
                Richiedi il ruolo sponsor
              </h2>

              {roleLoading && (
                <p className="muted">Verifica stato richiesta…</p>
              )}

              {/* Mostra stato richiesta esistente */}
              {!roleLoading && roleRequest && !showForm && (
                <>
                  <p className="muted small">
                    Hai già inviato una richiesta per il ruolo sponsor.
                  </p>
                  <RoleRequestStatus
                    request={roleRequest}
                    onRefreshToken={handleRefreshToken}
                    onNewRequest={() => setShowForm(true)}
                  />
                </>
              )}

              {/* Messaggio post-invio con next_steps dal BE */}
              {submitted && nextSteps.length > 0 && (
                <div className="callout success" style={{ marginTop: 16 }}>
                  <p>
                    <strong>✅ Richiesta inviata con successo!</strong>
                  </p>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {nextSteps.map((step, i) => (
                      <li key={i} className="small">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form — mostra se non c'è richiesta esistente o dopo un reject */}
              {!roleLoading && (!roleRequest || showForm) && !submitted && (
                <>
                  <p className="muted">
                    Compila il modulo per richiedere il ruolo sponsor. Il team di
                    HelpLab esaminerà la tua richiesta e ti risponderà nel
                    pannello personale.
                  </p>
                  <RoleRequestForm onSuccess={handleRoleRequestSuccess} />
                </>
              )}
            </div>
          )}
        </section>

        {/* ── LINK UTILI ─────────────────────────────────────────── */}
        <section style={{ marginTop: 48, paddingBottom: 40 }}>
          <p className="muted small sponsor-footer-links">
            Hai già il ruolo sponsor?{" "}
            <Link to={routes.auth.login}>Accedi</Link> per gestire le tue
            candidature. Vuoi saperne di più sui pacchetti business?{" "}
            <Link to={routes.business.packages}>Esplora i pacchetti</Link>.
          </p>
        </section>

      </div>
    </section>
  );
}
