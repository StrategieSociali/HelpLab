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

import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
 * ReportCover — intestazione dell'ente (8a, passo 6; scelta 5 e decisioni del 27/11/2026)
 * In alto a sinistra l'ente (logo piccolo, nome, sito), HelpLab piccolo a destra;
 * titolo «Rapporto d'impatto dell'evento …»; sotto «Preparato per … · Misura e
 * metodo HelpLab» e il periodo; come organizzatori l'ente e i co-organizzatori,
 * mai il nickname di una persona. Gli sponsor stanno nella loro sezione (decisione B);
 * tolta la scritta «Rendicontazione di impatto verificata» (decisione C).
 * Evento senza ente (solo admin): HelpLab a sinistra, nessun «Preparato per».
 */
function ReportCover({ event }) {
  const ente = event.organization;
  const [logoOk, setLogoOk] = useState(true);
  const dateRange =
    event.start_date && event.end_date
      ? `${formatDateIT(event.start_date)} — ${formatDateIT(event.end_date)}`
      : event.start_date
      ? formatDateIT(event.start_date)
      : "";
  const organizzatori = [
    ...(ente ? [ente.name] : []),
    ...(event.coorganizers ?? []).map((c) => c.name),
  ];
  const sito = ente?.website ? ente.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  const helplab = (
    <div className={ente ? styles.helplabSmall : styles.helplabLogo} aria-label="HelpLab">
      <img src="/assets/logo_helplab.png" alt="HelpLab" className={styles.helplabLogoImg} />
      <span className={styles.logoText}>HelpLab</span>
    </div>
  );

  return (
    <section className={`${styles.section} ${styles.cover}`} aria-label="Copertina report">
      <div className={styles.coverLogos}>
        {ente ? (
          <div className={styles.enteHeader}>
            {ente.logo_url && logoOk && (
              <img
                src={ente.logo_url}
                alt={`Logo ${ente.name}`}
                className={styles.enteLogo}
                onError={() => setLogoOk(false)}
              />
            )}
            <div>
              <div className={styles.enteName}>{ente.name}</div>
              {sito && <div className={styles.enteSite}>{sito}</div>}
            </div>
          </div>
        ) : (
          helplab
        )}
        {ente && helplab}
      </div>

      <h1 className={styles.coverTitle}>Rapporto d'impatto dell'evento {event.name}</h1>

      <p className={styles.coverSubtitle}>
        {ente ? <>Preparato per {ente.name} · Misura e metodo HelpLab</> : <>Misura e metodo HelpLab</>}
        {dateRange && <> · {dateRange}</>}
      </p>

      <div className={styles.coverMeta}>
        {event.location_address && (
          <div className={styles.coverMetaItem}>
            <span className={styles.coverMetaLabel}>Sede</span>
            <span className={styles.coverMetaValue}>{event.location_address}</span>
          </div>
        )}
        {organizzatori.length > 0 && (
          <div className={styles.coverMetaItem}>
            <span className={styles.coverMetaLabel}>
              {organizzatori.length > 1 ? "Organizzano" : "Organizza"}
            </span>
            <span className={styles.coverMetaValue}>{organizzatori.join(", ")}</span>
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
function ReportSummary({ impact, hasEnte }) {
  const kpis = [
    // Persone di cui l'ente può scaricare i contatti (8a passo 6, decisione E):
    // stessa regola dell'export. Senza ente non c'è condivisione: niente riquadro.
    ...(hasEnte ? [{
      value: impact.consent_count,
      unit: "",
      label: "Persone che condividono i contatti con l'ente",
      icon: "👥",
    }] : []),
    {
      value: impact.total_km,
      unit: "km",
      // NON "Chilometri sostenibili": la stessa etichetta serve entrambi i modi
      // del plugin mobilità. In modo `emits` — la configurazione dell'evento del
      // 30/8 — questi km sono la trasferta, CO2 emessa, percorsa anche in auto:
      // chiamarli sostenibili è una qualifica che i dati non sostengono. "Percorsi"
      // è vero in entrambi i casi, e allinea il report alla pagina evento pubblica,
      // che dice già "Km percorsi".
      label: "Chilometri percorsi",
      icon: "🛤️",
    },
    // CO₂ evitata ed emessa sono due grandezze distinte (punto 6, 2/10/2026): prima il
    // report mostrava solo l'evitata, e un evento in modo `emits` diceva «0 kg» con le
    // trasferte misurate. L'evitata si mostra se c'è, o se non c'è nemmeno l'emessa.
    ...(impact.total_co2_saved_kg > 0 || !(impact.total_co2_emitted_kg > 0)
      ? [{
          value: impact.total_co2_saved_kg.toFixed(2),
          unit: "kg CO₂",
          label: "Emissioni risparmiate",
          icon: "🌱",
        }]
      : []),
    ...(impact.total_co2_emitted_kg > 0
      ? [{
          value: impact.total_co2_emitted_kg.toFixed(2),
          unit: "kg CO₂",
          label: "Emissioni delle trasferte",
          icon: "🚗",
        }]
      : []),
    // Sociale (plugin social.v1): come nella dashboard live, solo se c'è.
    ...(impact.social?.total_volunteer_hours > 0
      ? [
          { value: Number(impact.social.total_social_value_eur).toFixed(0), unit: "€", label: "Valore sociale", icon: "🤝" },
          { value: impact.social.total_volunteer_hours, unit: "h", label: "Ore di volontariato", icon: "⏱️" },
          { value: impact.social.total_people_reached, unit: "", label: "Persone raggiunte", icon: "🙋" },
        ]
      : []),
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
  // Colonna della CO₂ emessa solo se almeno una sfida ne ha (modo `emits`).
  const hasEmitted = challenges.some((ch) => ch.co2_emitted_kg > 0);
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
                <th scope="col" className={styles.textRight}>CO₂ evitata (kg)</th>
                {hasEmitted && <th scope="col" className={styles.textRight}>CO₂ emessa (kg)</th>}
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
                  {hasEmitted && <td className={styles.textRight}>{(ch.co2_emitted_kg ?? 0).toFixed(2)}</td>}
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
  const { breakdown_by_vehicle, trees_equivalent, trees_to_absorb, flights_equivalent } = impact;

  // Calcola il valore massimo per scalare le barre CSS
  const maxCount =
    breakdown_by_vehicle.length > 0
      ? Math.max(...breakdown_by_vehicle.map((v) => v.count))
      : 0;

  const hasEquivalences = trees_equivalent > 0 || trees_to_absorb > 0 || flights_equivalent > 0;

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
                  key={`${vehicle.vehicle_id}|${vehicle.mode ?? ""}`}
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
                    {vehicle.co2_kg.toFixed(2)} kg CO₂ {vehicle.mode === "emits" ? "emessa" : "evitata"} · {vehicle.km} km
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
          <h3 className={styles.subsectionTitle}>Equivalenze e assorbimento</h3>
          <div className={styles.equivalencesGrid}>
            {/* Alberi, due cornici per due grandezze (decisione PM 2/10/2026): la CO₂
                risparmiata non è mai stata emessa, quindi per lei solo un paragone;
                per la CO₂ emessa dalle trasferte, gli alberi che servono ad assorbirla.
                Alberi adulti: il fattore è quello di un albero adulto (§5, 14/10/2026). */}
            {trees_equivalent > 0 && (
              <div className={styles.equivalenceCard}>
                <span className={styles.equivalenceIcon} aria-hidden="true">🌳</span>
                <p className={styles.equivalenceText}>
                  La CO₂ risparmiata equivale a quanto{" "}
                  {trees_equivalent === 1 ? "assorbe" : "assorbono"}{" "}
                  <strong>{trees_equivalent}</strong>{" "}
                  {trees_equivalent === 1 ? "albero adulto" : "alberi adulti"} in un anno
                </p>
              </div>
            )}
            {trees_to_absorb > 0 && (
              <div className={styles.equivalenceCard}>
                <span className={styles.equivalenceIcon} aria-hidden="true">🌱</span>
                <p className={styles.equivalenceText}>
                  Per assorbire in un anno la CO₂ emessa dalle trasferte{" "}
                  {trees_to_absorb === 1 ? "servirebbe" : "servirebbero"}{" "}
                  <strong>{trees_to_absorb}</strong>{" "}
                  {trees_to_absorb === 1 ? "albero adulto" : "alberi adulti"}: è un'unità di
                  misura, non il numero di alberi da piantare
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
          {/* Riga d'uso per gli sponsor (decisione PM 12/10/2026, frase 16) */}
          <p className={styles.equivalenceText} style={{ marginTop: 12, opacity: 0.75 }}>
            Questi dati descrivono il contributo all'iniziativa. Non attestano la neutralità
            climatica di prodotti o servizi.
          </p>
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
function ReportParticipants({ impact, hasEnte }) {
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
        {hasEnte && (
          <div className={styles.participantStat}>
            <span className={styles.participantValue}>{consent_count}</span>
            <span className={styles.participantLabel}>
              Persone che condividono i contatti con l'ente
            </span>
          </div>
        )}
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
            🔍 {rejected_submissions} non approvati
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
  const { approved_submissions, pending_submissions, rejected_submissions } = impact;
  // "Ricevuti" comprende anche i contributi in attesa: sono stati ricevuti eccome.
  // Prima questo totale escludeva i pending e il documento si contraddiceva —
  // "7 totali" nel riepilogo e "su 6 ricevuti" qui sotto, con lo stesso nome.
  const total = approved_submissions + pending_submissions + rejected_submissions;

  return (
    <section
      className={`${styles.section} ${styles.verification}`}
      aria-label="Processo di verifica"
    >
      <h2 className={styles.sectionTitle}>Il processo di verifica</h2>

      {/* Questo paragrafo è la frase su cui uno sponsor fonda la propria fiducia,
          e deve descrivere il modello REALE. Diceva "ogni contributo è stato
          revisionato da un giudice indipendente": falso per le attività in modo
          fiducia, che sono auto-approvate e ricontrollate a campione dopo. Alla
          prova generale del 12/8/2026 erano 4 contributi su 5, e il 30/8 saranno
          la maggioranza. Il modello a due livelli è difendibile: va spiegato,
          non sostituito da un'affermazione più forte di ciò che il sistema fa. */}
      <p className={styles.verificationText}>
        I contributi sono verificati con due livelli di controllo, scelti
        dall'organizzatore per ciascuna attività: <strong>revisione puntuale</strong> da
        parte di un giudice indipendente nominato dalla piattaforma HelpLab, oppure
        <strong> dichiarazione del partecipante sottoposta ad audit indipendente</strong> su
        campione casuale a evento concluso. In entrambi i casi è richiesta
        documentazione fotografica dell'attività svolta.
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
              {rejected_submissions === 1
                ? "Il contributo non approvato testimonia"
                : `I ${rejected_submissions} contributi non approvati testimoniano`}{" "}
              il rigore del processo di verifica, che non certifica
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
 * Chi sostiene l'evento e chi le singole sfide (8a, passo 7): «Sostengono
 * l'evento» (`for_event`) e «Sostengono la sfida X» (`challenges`), come nella
 * pagina dell'evento. Logo (se disponibile) e nome. Gli sponsor con il pagamento
 * scaduto non arrivano dal BE.
 * La sezione è nascosta se sponsors è array vuoto.
 * Nessun importo esposto.
 */
function ReportSponsors({ sponsors }) {
  // Guard: non renderizzare se non ci sono sponsor
  if (!sponsors || sponsors.length === 0) return null;

  const ofEvent = sponsors.filter((sp) => sp.for_event);
  const byChallenge = [];
  for (const sp of sponsors) {
    for (const ch of sp.challenges || []) {
      let g = byChallenge.find((x) => x.challenge.id === ch.id);
      if (!g) { g = { challenge: ch, list: [] }; byChallenge.push(g); }
      g.list.push(sp);
    }
  }

  return (
    <section
      className={`${styles.section} ${styles.sponsors}`}
      aria-label="Sponsor dell'evento"
    >
      <h2 className={styles.sectionTitle}>Con il supporto di</h2>

      {ofEvent.length > 0 && (
        <>
          <h3 className={styles.sponsorsGroupTitle}>
            {ofEvent.length > 1 ? "Sostengono l'evento" : "Sostiene l'evento"}
          </h3>
          <ReportSponsorCards list={ofEvent} />
        </>
      )}
      {byChallenge.map(({ challenge, list }) => (
        <Fragment key={challenge.id}>
          <h3 className={styles.sponsorsGroupTitle}>
            {list.length > 1 ? "Sostengono" : "Sostiene"} la sfida «{challenge.title}»
          </h3>
          <ReportSponsorCards list={list} />
        </Fragment>
      ))}
    </section>
  );
}

function ReportSponsorCards({ list }) {
  return (
    <div className={styles.sponsorsGrid}>
      {list.map((sponsor) => (
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
        {/* Citava SOLO le fonti della mobilità, mentre un evento misto produce
            CO2 anche da rifiuti e riuso. Alla prova del 12/8/2026 i 30,5 kg
            riportati venivano interamente da rifiuti e riuso, e il documento
            citava fonti che non avevano prodotto nessuno di quei numeri. */}
        <p>
          Il calcolo applica fattori di riferimento distinti per ciascun tipo di
          attività: per la <strong>mobilità</strong>, i fattori di emissione del trasporto
          su strada pubblicati dall'ISPRA (Istituto Superiore per la Protezione e la
          Ricerca Ambientale, edizione 2024) e i valori per i veicoli elettrici del
          Ministero delle Infrastrutture e dei Trasporti (Mimit, 2025); per la{" "}
          <strong>raccolta rifiuti</strong>, il risparmio netto da riciclo stimato dal
          Centro Comune di Ricerca della Commissione Europea (JRC); per il{" "}
          <strong>riuso tessile</strong>, il valore medio per capo rimesso in circolo del
          Climate Impact Report Vinted/Vaayu 2025; per il <strong>valore sociale</strong>,
          la retribuzione oraria media ISTAT secondo il metodo del costo di sostituzione
          (Manuale ILO). Ogni attività contribuisce al totale solo con i fattori del
          proprio dominio.
        </p>
        <p>
          Le stime non costituiscono una certificazione delle emissioni ai sensi della
          norma ISO 14064 né un'asserzione di neutralità climatica di prodotti o servizi,
          che la compensazione non può sostenere (art. 23, lett. d-quater, del Codice del
          consumo). Il documento è destinato a uso
          informativo e di rendicontazione interna.
        </p>
      </div>

      <div className={styles.methodologyMeta}>
        <span>Fonti: ISPRA 2024 · Mimit 2025 · JRC · Vinted/Vaayu 2025 · ISTAT</span>
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
 * Rotta: routes.events.report (/dashboard/eventi/:id/report), con il solo login;
 * chi può leggerlo lo decide il BE (8a, passo 6). Il vecchio indirizzo admin
 * rimanda qui (RedirectReport in App.jsx).
 */
export default function EventReport() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Chi può leggere il report lo decide il BE (8a passo 6): l'admin, e i membri
    // dell'ente proprietario a evento pubblicato o concluso. Agli altri risponde
    // 404, senza dire se il report esiste.
    const fetchReportData = async () => {
      try {
        const res = await api.get(`/v1/events/${id}/report-data`);
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Report non disponibile: l'evento non esiste, è ancora in bozza, oppure il report è riservato all'ente che lo organizza.");
        } else {
          setError("Impossibile caricare i dati del report. Riprova più tardi.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id]);

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
        <ReportCover event={event} />
        <ReportSummary impact={impact} hasEnte={!!event.organization} />
        <ReportChallenges challenges={challenges} />
        <ReportImpact impact={impact} />
        <ReportParticipants impact={impact} hasEnte={!!event.organization} />
        <ReportVerification impact={impact} />
        <ReportSponsors sponsors={sponsors} />
        <ReportMethodology generatedAt={generated_at} />
        <ReportFooter eventId={event.id} generatedAt={generated_at} />
      </main>
    </div>
  );
}
