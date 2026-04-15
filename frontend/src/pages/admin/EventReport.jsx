/**
 * EventReport.jsx
 * Percorso: src/pages/admin/EventReport.jsx
 *
 * Pagina di report evento per amministratori.
 * Consuma GET /api/v1/events/:id/report-data e produce
 * un documento professionale ottimizzato per la stampa (PDF via Ctrl+P).
 *
 * Sottocomponenti inline:
 *   ReportCover, ReportSummary, ReportChallenges,
 *   ReportImpact, ReportParticipants, ReportVerification,
 *   ReportSponsors, ReportMethodology, ReportFooter
 *
 * Route: /dashboard/admin/events/:id/report
 * Accesso: solo ruolo "admin" (guard tramite ProtectedRoute in App.jsx)
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, API_PATHS } from "../../api/client";
import styles from "../../styles/EventReport.module.css";

// ─── Utilità ─────────────────────────────────────────────────────────────────

/**
 * Formatta una data ISO 8601 in formato italiano GG/MM/AAAA.
 * Restituisce stringa vuota se la data non è valida.
 */
function formatDateIT(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formatta data e ora in italiano: GG/MM/AAAA HH:mm
 */
function formatDateTimeIT(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return "";
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sottocomponenti ──────────────────────────────────────────────────────────

/**
 * ReportCover
 * Prima pagina: logo HelpLab, eventuale logo sponsor principale,
 * nome evento, date, sede, organizzatore.
 */
function ReportCover({ event, sponsors }) {
  const primarySponsor = sponsors && sponsors.length > 0 ? sponsors[0] : null;
  const dateRange =
    event.start_date && event.end_date
      ? `${formatDateIT(event.start_date)} — ${formatDateIT(event.end_date)}`
      : event.start_date
      ? formatDateIT(event.start_date)
      : "";

  return (
    <section className={`${styles.section} ${styles.cover}`} aria-label="Copertina report">
      {/* Header con loghi */}
      <div className={styles.coverLogos}>
        {/* Logo HelpLab testuale — sostituire con <img> quando disponibile l'asset */}
       <div className={styles.helplabLogo} aria-label="HelpLab">
  <img
    src="/assets/logo_helplab.png"
    alt="HelpLab"
    className={styles.helplabLogoImg}
  />
  <span className={styles.logoText}>HelpLab</span>
</div>

        {primarySponsor && primarySponsor.logo_url && (
          <img
            src={primarySponsor.logo_url}
            alt={`Logo ${primarySponsor.name}`}
            className={styles.sponsorLogoMain}
            onError={(e) => {
              /* Nasconde l'immagine se non caricabile */
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      {/* Badge tipo documento */}
      <div className={styles.coverBadge}>
        Rendicontazione di impatto verificata
      </div>

      {/* Titolo evento */}
      <h1 className={styles.coverTitle}>{event.name}</h1>

      {/* Metadati evento */}
      <div className={styles.coverMeta}>
        {dateRange && (
          <div className={styles.coverMetaItem}>
            <span className={styles.coverMetaLabel}>Periodo</span>
            <span className={styles.coverMetaValue}>{dateRange}</span>
          </div>
        )}
        {event.location_address && (
          <div className={styles.coverMetaItem}>
            <span className={styles.coverMetaLabel}>Sede</span>
            <span className={styles.coverMetaValue}>{event.location_address}</span>
          </div>
        )}
        {event.creator && (
          <div className={styles.coverMetaItem}>
            <span className={styles.coverMetaLabel}>Organizzatore</span>
            <span className={styles.coverMetaValue}>{event.creator.nickname}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * ReportSummary
 * 4 KPI principali: partecipanti con consenso, km, CO2, submission approvate.
 */
function ReportSummary({ impact }) {
  const kpis = [
    {
      value: impact.consent_count,
      unit: "",
      label: "Partecipanti con consenso",
      icon: "👥",
    },
    {
      value: impact.total_km,
      unit: "km",
      label: "Chilometri sostenibili",
      icon: "🛤️",
    },
    {
      value: impact.total_co2_saved_kg.toFixed(2),
      unit: "kg CO₂",
      label: "Emissioni risparmiate",
      icon: "🌱",
    },
    {
      value: impact.approved_submissions,
      unit: "",
      label: "Contributi approvati",
      icon: "✅",
    },
  ];

  return (
    <section className={`${styles.section} ${styles.summary}`} aria-label="Riepilogo impatto">
      <h2 className={styles.sectionTitle}>I risultati in sintesi</h2>
      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard}>
            <span className={styles.kpiIcon} aria-hidden="true">{kpi.icon}</span>
            <span className={styles.kpiValue}>
              {kpi.value}
              {kpi.unit && <span className={styles.kpiUnit}> {kpi.unit}</span>}
            </span>
            <span className={styles.kpiLabel}>{kpi.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * ReportChallenges
 * Una riga per ogni challenge collegata all'evento.
 * Gestisce l'array vuoto con messaggio dedicato.
 */
function ReportChallenges({ challenges }) {
  return (
    <section
      className={`${styles.section} ${styles.challenges}`}
      aria-label="Performance per challenge"
    >
      <h2 className={styles.sectionTitle}>Performance per sfida</h2>

      {challenges.length === 0 ? (
        <p className={styles.emptyState}>Nessuna challenge collegata a questo evento.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} aria-label="Dati per challenge">
            <thead>
              <tr>
                <th scope="col">Sfida</th>
                <th scope="col" className={styles.textRight}>Approvati</th>
                <th scope="col" className={styles.textRight}>In attesa</th>
                <th scope="col" className={styles.textRight}>Rifiutati</th>
                <th scope="col" className={styles.textRight}>CO₂ (kg)</th>
                <th scope="col" className={styles.textRight}>Km</th>
                <th scope="col" className={styles.textRight}>Punti</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((ch) => (
                <tr key={ch.id}>
                  <td>
                    <span className={styles.challengeTitle}>{ch.title}</span>
                    {ch.deadline && (
                      <span className={styles.challengeDeadline}>
                        Scadenza: {formatDateIT(ch.deadline)}
                      </span>
                    )}
                  </td>
                  <td className={`${styles.textRight} ${styles.approved}`}>
                    {ch.approved_count}
                  </td>
                  <td className={`${styles.textRight} ${styles.pending}`}>
                    {ch.pending_count}
                  </td>
                  <td className={`${styles.textRight} ${styles.rejected}`}>
                    {ch.rejected_count}
                  </td>
                  <td className={styles.textRight}>{ch.co2_saved_kg.toFixed(2)}</td>
                  <td className={styles.textRight}>{ch.total_km}</td>
                  <td className={styles.textRight}>{ch.total_points ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * ReportImpact
 * Breakdown per tipo di veicolo con barre CSS.
 * Equivalenze CO2 (alberi, voli) mostrate solo se > 0.
 */
function ReportImpact({ impact }) {
  const { breakdown_by_vehicle, trees_equivalent, flights_equivalent } = impact;

  // Calcola il valore massimo per scalare le barre CSS
  const maxCount =
    breakdown_by_vehicle.length > 0
      ? Math.max(...breakdown_by_vehicle.map((v) => v.count))
      : 0;

  const hasEquivalences = trees_equivalent > 0 || flights_equivalent > 0;

  return (
    <section
      className={`${styles.section} ${styles.impact}`}
      aria-label="Impatto ambientale dettagliato"
    >
      <h2 className={styles.sectionTitle}>L'impatto ambientale misurato</h2>

      {/* Breakdown per veicolo */}
      <div className={styles.breakdownBlock}>
        <h3 className={styles.subsectionTitle}>Distribuzione per tipo di mezzo</h3>

        {breakdown_by_vehicle.length === 0 ? (
          <p className={styles.emptyState}>Nessun dato di mobilità disponibile.</p>
        ) : (
          <div className={styles.barChart} role="list" aria-label="Grafico distribuzione veicoli">
            {breakdown_by_vehicle.map((vehicle) => {
              const pct = maxCount > 0 ? Math.round((vehicle.count / maxCount) * 100) : 0;
              return (
                <div
                  key={vehicle.vehicle_id}
                  className={styles.barRow}
                  role="listitem"
                >
                  <span className={styles.barLabel}>{vehicle.label}</span>
                  <div className={styles.barTrack} aria-hidden="true">
                    <div
                      className={styles.barFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.barStats}>
                    {vehicle.count} {vehicle.count === 1 ? "contributo" : "contributi"} ·{" "}
                    {vehicle.co2_kg.toFixed(2)} kg CO₂ · {vehicle.km} km
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Equivalenze — solo se almeno una > 0 */}
      {hasEquivalences && (
        <div className={styles.equivalencesBlock}>
          <h3 className={styles.subsectionTitle}>Equivalenze CO₂</h3>
          <div className={styles.equivalencesGrid}>
            {trees_equivalent > 0 && (
              <div className={styles.equivalenceCard}>
                <span className={styles.equivalenceIcon} aria-hidden="true">🌳</span>
                <p className={styles.equivalenceText}>
                  Equivale a{" "}
                  <strong>{trees_equivalent}</strong>{" "}
                  {trees_equivalent === 1 ? "albero che assorbe" : "alberi che assorbono"}{" "}
                  CO₂ per un anno
                </p>
              </div>
            )}
            {flights_equivalent > 0 && (
              <div className={styles.equivalenceCard}>
                <span className={styles.equivalenceIcon} aria-hidden="true">✈️</span>
                <p className={styles.equivalenceText}>
                  Equivale a{" "}
                  <strong>{flights_equivalent}</strong>{" "}
                  {flights_equivalent === 1 ? "volo" : "voli"} Roma–Milano evitati
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * ReportParticipants
 * Conteggi anonimi aggregati: partecipanti, consensi, submission.
 * Nessun dato personale esposto.
 */
function ReportParticipants({ impact }) {
  const {
    participants,
    consent_count,
    approved_submissions,
    pending_submissions,
    rejected_submissions,
  } = impact;

  // Tasso_approvazione = approved_submissions / (approved_submissions + pending_submissions + rejected_submissions)
  const total = approved_submissions + pending_submissions + rejected_submissions;
    const completionRate =
      total > 0
       ? ((approved_submissions / total) * 100).toFixed(1)
    : null;

  return (
    <section
      className={`${styles.section} ${styles.participants}`}
      aria-label="Dati partecipanti"
    >
      <h2 className={styles.sectionTitle}>I partecipanti</h2>

      <div className={styles.participantsGrid}>
        <div className={styles.participantStat}>
          <span className={styles.participantValue}>{participants}</span>
          <span className={styles.participantLabel}>
            Volontari con almeno un contributo approvato
          </span>
        </div>
        <div className={styles.participantStat}>
          <span className={styles.participantValue}>{consent_count}</span>
          <span className={styles.participantLabel}>
            Partecipanti con consenso alla raccolta dati
          </span>
        </div>
        {completionRate !== null && (
          <div className={styles.participantStat}>
            <span className={styles.participantValue}>{completionRate}%</span>
           <span className={styles.participantLabel}>
            Tasso di approvazione (approvati / totale ricevuti)
          </span>
          </div>
        )}
      </div>

      {/* Riepilogo submission */}
      <div className={styles.submissionBreakdown}>
        <h3 className={styles.subsectionTitle}>
          Riepilogo contributi ({total} totali)
        </h3>
        <div className={styles.submissionStats}>
          <span className={`${styles.submissionBadge} ${styles.approved}`}>
            ✅ {approved_submissions} approvati
          </span>
          <span className={`${styles.submissionBadge} ${styles.pending}`}>
            ⏳ {pending_submissions} in attesa
          </span>
          <span className={`${styles.submissionBadge} ${styles.rejected}`}>
            🔍 {rejected_submissions} revisionati
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * ReportVerification
 * Descrive il processo di verifica con testo fisso istituzionale.
 * I rifiuti sono presentati come indicatore positivo di rigore.
 */
function ReportVerification({ impact }) {
  const { approved_submissions, rejected_submissions } = impact;
  const total = approved_submissions + rejected_submissions;

  return (
    <section
      className={`${styles.section} ${styles.verification}`}
      aria-label="Processo di verifica"
    >
      <h2 className={styles.sectionTitle}>Il processo di verifica</h2>

      <p className={styles.verificationText}>
        Ogni contributo è stato revisionato da un giudice indipendente nominato dalla
        piattaforma HelpLab. La revisione richiede documentazione fotografica
        dell'attività svolta, garantendo che ogni dato di impatto riportato corrisponda
        a un'azione reale e verificabile.
      </p>

      {/* Rigore del processo */}
      <div className={styles.verificationHighlight}>
        <span className={styles.verificationIcon} aria-hidden="true">🔎</span>
        <p>
          <strong>{approved_submissions}</strong>{" "}
          {approved_submissions === 1 ? "contributo approvato" : "contributi approvati"}{" "}
          su <strong>{total}</strong>{" "}
          {total === 1 ? "ricevuto" : "ricevuti"}.
          {rejected_submissions > 0 && (
            <>
              {" "}
              I {rejected_submissions}{" "}
              {rejected_submissions === 1 ? "contributo revisionato" : "contributi revisionati"}{" "}
              testimoniano il rigore del processo di verifica, che non certifica
              automaticamente ogni dichiarazione ma richiede evidenza documentata.
            </>
          )}
        </p>
      </div>
    </section>
  );
}

/**
 * ReportSponsors
 * Lista degli sponsor con logo (se disponibile) e nome.
 * La sezione è nascosta se sponsors è array vuoto.
 * Nessun importo esposto.
 */
function ReportSponsors({ sponsors }) {
  // Guard: non renderizzare se non ci sono sponsor
  if (!sponsors || sponsors.length === 0) return null;

  return (
    <section
      className={`${styles.section} ${styles.sponsors}`}
      aria-label="Sponsor dell'evento"
    >
      <h2 className={styles.sectionTitle}>Con il supporto di</h2>

      <div className={styles.sponsorsGrid}>
        {sponsors.map((sponsor) => (
          <div key={sponsor.id} className={styles.sponsorCard}>
            {sponsor.logo_url ? (
              <img
                src={sponsor.logo_url}
                alt={`Logo ${sponsor.name}`}
                className={styles.sponsorLogo}
                onError={(e) => {
                  /* Fallback testuale se l'immagine non carica */
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling.style.display = "flex";
                }}
              />
            ) : null}

            {/* Fallback testuale — visibile se logo assente o non caricabile */}
            <div
              className={styles.sponsorLogoFallback}
              style={{ display: sponsor.logo_url ? "none" : "flex" }}
              aria-hidden={!!sponsor.logo_url}
            >
              {sponsor.name.charAt(0).toUpperCase()}
            </div>

            <span className={styles.sponsorName}>{sponsor.name}</span>

            {/* Link solo a schermo, non cliccabile in stampa */}
            {sponsor.website && (
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sponsorWebsite}
              >
                {sponsor.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * ReportMethodology
 * Nota metodologica fissa in italiano formale.
 * Non espone coefficienti numerici.
 */
function ReportMethodology({ generatedAt }) {
  return (
    <section
      className={`${styles.section} ${styles.methodology}`}
      aria-label="Nota metodologica"
    >
      <h2 className={styles.sectionTitle}>Nota metodologica</h2>

      <div className={styles.methodologyText}>
        <p>
          I valori di CO₂ riportati nel presente documento rappresentano una stima del
          risparmio di emissioni di gas serra calcolata sulla base dei dati forniti dai
          partecipanti e sottoposta a verifica da parte di giudici indipendenti della
          piattaforma HelpLab.
        </p>
        <p>
          Il calcolo applica i fattori di emissione per il trasporto su strada pubblicati
          dall'ISPRA (Istituto Superiore per la Protezione e la Ricerca Ambientale,
          edizione 2024) e i valori di riferimento per i veicoli elettrici del Ministero
          delle Infrastrutture e dei Trasporti (Mimit, 2025).
        </p>
        <p>
          Le stime non costituiscono una certificazione delle emissioni ai sensi della
          norma ISO 14064 né una dichiarazione ambientale verificata ai sensi della
          Direttiva 2024/825/UE (Green Claims Directive). Il documento è destinato a uso
          informativo e di rendicontazione interna.
        </p>
      </div>

      <div className={styles.methodologyMeta}>
        <span>Fonti: ISPRA 2024 · Mimit 2025</span>
        {generatedAt && (
          <span>Report generato il {formatDateTimeIT(generatedAt)}</span>
        )}
      </div>
    </section>
  );
}

/**
 * ReportFooter
 * Branding HelpLab, ID evento, data generazione.
 * In stampa: piccolo e grigio a piè di pagina.
 */
function ReportFooter({ eventId, generatedAt }) {
  return (
    <footer className={styles.reportFooter} aria-label="Piè di pagina report">
      <span>Report generato da HelpLab — helplab.space</span>
      <span>Evento #{eventId}</span>
      {generatedAt && <span>Generato il {formatDateTimeIT(generatedAt)}</span>}
    </footer>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

/**
 * EventReport
 * Pagina principale del report evento.
 * Gestisce fetch, loading, error, e orchestrazione dei sottocomponenti.
 *
 * Da registrare in App.jsx come:
 *   <Route
 *     path={routes.admin.eventReport(':id')}
 *     element={
 *       <ProtectedRoute role="admin">
 *         <EventReport />
 *       </ProtectedRoute>
 *     }
 *   />
 */
export default function EventReport() {
  const { id } = useParams();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Accesso consentito ad admin e creatore dell'evento.
// Il controllo sul creatore avviene dopo il fetch, quando abbiamo event.creator.

    const fetchReportData = async () => {
      try {
        // API_PATHS.eventDetail ritorna /v1/events/:id — usiamo un path dedicato
        // che segue lo stesso pattern: /v1/events/:id/report-data
        const res = await api.get(`/v1/events/${id}/report-data`);
        // Guard: solo admin o creatore dell'evento
        if (user?.role !== "admin" && res.data?.event?.creator?.email !== user?.email) {
        setError("Non hai i permessi per visualizzare questo report.");
        setLoading(false);
       return;
       }
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Evento non trovato o dati del report non disponibili.");
        } else {
          setError("Impossibile caricare i dati del report. Riprova più tardi.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id, user]);

  // ── Stati di caricamento ed errore ────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.statusWrapper} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <p>Caricamento report in corso…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.statusWrapper} role="alert">
        <p className={styles.errorMessage}>{error}</p>
        <button
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { event, sponsors, impact, challenges, generated_at } = data;

  // ── Render principale ─────────────────────────────────────────────────────

  return (
    <div className={styles.reportWrapper}>
      {/* Pulsante stampa — nascosto in @media print */}
      <div className={styles.printBar}>
        <button
          className={`${styles.btnPrint} btn-print`}
          onClick={() => window.print()}
          aria-label="Stampa o salva come PDF"
        >
          🖨️ Stampa / Salva PDF
        </button>
      </div>

      {/* Contenitore stampabile */}
      <main className={styles.reportContainer} aria-label="Report evento">
        <ReportCover event={event} sponsors={sponsors} />
        <ReportSummary impact={impact} />
        <ReportChallenges challenges={challenges} />
        <ReportImpact impact={impact} />
        <ReportParticipants impact={impact} />
        <ReportVerification impact={impact} />
        <ReportSponsors sponsors={sponsors} />
        <ReportMethodology generatedAt={generated_at} />
        <ReportFooter eventId={event.id} generatedAt={generated_at} />
      </main>
    </div>
  );
}
