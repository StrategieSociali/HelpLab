/**
 * /src/pages/Privacy.jsx
 * -----------
 * Pagina informativa sul trattamento dei dati personali (GDPR).
 * Rotta: /privacy (già definita in routes.js)
 *
 * NOTA LEGALE: questo testo è una bozza da sottoporre a revisione legale
 * prima della pubblicazione definitiva.
 *
 * Ultimo aggiornamento: aprile 2026
 */

import React from "react";
import "../styles/dynamic-pages.css";
import { useTranslation } from "react-i18next";

// Data di ultimo aggiornamento — aggiorna manualmente ad ogni revisione
const LAST_UPDATED = "Aprile 2026";

export default function Privacy() {
  return (
    <section className="page-section page-text page-bg">
      <div className="container" style={{ maxWidth: 780, paddingBottom: 60 }}>

        <header style={{ marginBottom: 40 }}>
          <h1 className="page-title" style={{ marginBottom: 8 }}>
            Privacy Policy
          </h1>
          <p className="page-subtitle">
            Informativa sul trattamento dei dati personali ai sensi del
            Regolamento UE 2016/679 (GDPR)
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginTop: 8 }}>
            Ultimo aggiornamento: {LAST_UPDATED}
          </p>
        </header>

        <Section title="1. Titolare del trattamento">
          <p>
            Il titolare del trattamento dei dati personali è{" "}
            <strong>HelpLab ETS</strong>, con sede a Ravenna.
          </p>
          <p>
            Per qualsiasi comunicazione relativa alla privacy puoi scrivere
            a:{" "}
            <a
              href="mailto:privacy@helplab.space"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              privacy@helplab.space
            </a>
          </p>
        </Section>

        <Section title="2. Responsabile della protezione dei dati (DPO)">
          <p>
            Il Responsabile della Protezione dei Dati nominato da HelpLab ETS
            è <strong>Antonio Lazzari</strong>, contattabile all'indirizzo{" "}
            <a
              href="mailto:privacy@helplab.space"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              privacy@helplab.space
            </a>
            .
          </p>
        </Section>

        <Section title="3. Dati raccolti e finalità del trattamento">
          <p>
            HelpLab raccoglie i seguenti dati personali, per le finalità
            indicate:
          </p>

          <SubSection title="3.1 Registrazione account">
            <p>
              Al momento della registrazione raccogliamo: nome (o nome di
              fantasia), nickname, indirizzo email e password (cifrata).
            </p>
            <p>
              <strong>Registrazione anonima:</strong> è possibile registrarsi
              utilizzando dati di fantasia (nome, nickname, email temporanea)
              senza fornire alcuna informazione identificativa reale. La
              registrazione anonima consente la piena partecipazione alla
              piattaforma, ad eccezione dei programmi che prevedono rimborsi
              spese, premi o incentivi economici di qualsiasi natura, per i
              quali è richiesta l'identificazione reale. L'obbligo di
              identificazione si applica sempre ai ruoli di Giudice e Sponsor.
            </p>
            <p>
              Base giuridica: esecuzione del contratto (art. 6.1.b GDPR).
            </p>
          </SubSection>

          <SubSection title="3.2 Partecipazione alle sfide">
            <p>
              Per inviare un contributo a una sfida raccogliamo i dati
              dichiarati dal volontario nel form di submission: possono
              includere distanze percorse, mezzo di trasporto utilizzato,
              quantità di rifiuti raccolti o altri dati di impatto ambientale,
              a seconda della tipologia di sfida.
            </p>
            <p>
              Questi dati sono utilizzati per calcolare l'impatto ambientale
              aggregato e produrre report di sostenibilità verificabili.
            </p>
            <p>
              Base giuridica: consenso (art. 6.1.a GDPR) e legittimo interesse
              del titolare alla rendicontazione di impatto (art. 6.1.f GDPR).
            </p>
          </SubSection>

          <SubSection title="3.3 Evidenze fotografiche">
            <p>
              Alcune sfide richiedono il caricamento di fotografie come
              evidenza della partecipazione. Le immagini sono caricate
              direttamente sul servizio Cloudinary (Cloudinary Ltd., con sede
              nel Regno Unito), che agisce in qualità di responsabile esterno
              del trattamento ai sensi dell'art. 28 GDPR.
            </p>
            <p>
              Le fotografie non vengono analizzate per riconoscimento facciale
              o identificazione biometrica. In caso di presenza di dati sensibili
              o altri dati ritenuti di particolare interesse il Giudice o l'Admin
              procedono alla cancellazione della stessa.
            </p>
            <p>
              Base giuridica: consenso (art. 6.1.a GDPR).
            </p>
          </SubSection>

          <SubSection title="3.4 Trasmissione dei dati all'organizzatore dell'evento">
            <p>
              I dati di partecipazione (inclusi i dati di impatto dichiarati
              potranno essere trasmessi all'organizzatore dell'evento a cui
              la sfida è collegata, esclusivamente previo esplicito consenso
              dell'utente espresso al momento della partecipazione. Le foto
              non sono condivise.
            </p>
            <p>
              In assenza di consenso specifico, i dati vengono utilizzati
              esclusivamente in forma aggregata e anonimizzata per la
              produzione di report di impatto.
            </p>
            <p>
              Base giuridica: consenso (art. 6.1.a GDPR).
            </p>
          </SubSection>

          <SubSection title="3.5 Dati tecnici di navigazione">
            <p>
              Come la maggior parte dei servizi web, registriamo dati tecnici
              di accesso (indirizzo IP, tipo di browser, pagine visitate) a
              fini di sicurezza e ottimizzazione del servizio. Questi dati non
              sono associati all'identità dell'utente e vengono eliminati entro
              30 giorni.
            </p>
            <p>
              Base giuridica: legittimo interesse (art. 6.1.f GDPR).
            </p>
          </SubSection>
        </Section>

        <Section title="4. Conservazione dei dati">
          <p>
            I dati dell'account vengono conservati per tutta la durata del
            rapporto con la piattaforma e per un periodo massimo di 24 mesi
            dall'ultima attività, al termine del quale l'account può essere
            disattivato.
          </p>
          <p>
            I dati di impatto (submission, evidenze) vengono conservati a
            tempo indeterminato in quanto costituiscono la base della
            rendicontazione storica di HelpLab. In caso di cancellazione
            account, i dati di impatto vengono anonimizzati e non più
            associati all'utente.
          </p>
        </Section>

        <Section title="5. Diritti dell'interessato">
          <p>
            Ai sensi degli artt. 15–22 del GDPR, hai il diritto di:
          </p>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "rgba(255,255,255,0.85)" }}>
            <li>accedere ai tuoi dati personali</li>
            <li>richiederne la rettifica o l'aggiornamento</li>
            <li>richiederne la cancellazione ("diritto all'oblio")</li>
            <li>opporti al trattamento o richiederne la limitazione</li>
            <li>richiedere la portabilità dei dati</li>
            <li>revocare in qualsiasi momento il consenso prestato</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            Per esercitare questi diritti scrivi a{" "}
            <a
              href="mailto:privacy@helplab.space"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              privacy@helplab.space
            </a>
            . Risponderemo entro 30 giorni dalla ricezione della richiesta.
          </p>
          <p>
            Hai inoltre il diritto di proporre reclamo all'Autorità Garante
            per la protezione dei dati personali (
            <a
              href="https://www.garanteprivacy.it"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              www.garanteprivacy.it
            </a>
            ).
          </p>
        </Section>

        <Section title="6. Responsabili esterni del trattamento">
          <p>
            HelpLab si avvale dei seguenti responsabili esterni del
            trattamento, con cui sono stati stipulati accordi ai sensi
            dell'art. 28 GDPR:
          </p>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "rgba(255,255,255,0.85)" }}>
            <li>
              <strong>Cloudinary Ltd.</strong> — archiviazione e gestione delle
              evidenze fotografiche caricate dai volontari
            </li>
          </ul>
        </Section>

        <Section title="7. Trasferimento dei dati fuori dall'UE">
          <p>
            Cloudinary Ltd. potrebbe trattare i dati in paesi extra-UE. In
            tal caso il trasferimento avviene nel rispetto delle garanzie
            previste dagli artt. 44–49 GDPR (clausole contrattuali standard o
            decisioni di adeguatezza della Commissione Europea).
          </p>
        </Section>

        <Section title="8. Cookie e tecnologie di tracciamento">
          <p>
            HelpLab utilizza esclusivamente cookie tecnici necessari al
            funzionamento del servizio (autenticazione, sessione). Non vengono
            utilizzati cookie di profilazione o di tracciamento per finalità
            pubblicitarie.
          </p>
        </Section>

        <Section title="9. Modifiche alla presente informativa">
          <p>
            HelpLab si riserva il diritto di aggiornare questa informativa per
            adeguarla a modifiche normative o funzionali della piattaforma. In
            caso di modifiche sostanziali, gli utenti registrati saranno
            informati via email o tramite avviso in piattaforma. La data di
            ultimo aggiornamento è indicata in cima a questa pagina.
          </p>
        </Section>

        <div
          className="card-info neutral"
          style={{ marginTop: 40, fontSize: "0.9rem" }}
        >
          <strong>Nota:</strong> questo documento è una bozza in corso di
          revisione legale. Fa fede la versione pubblicata su questa pagina
          alla data indicata in cima.
        </div>

      </div>
    </section>
  );
}

// ─── Componenti strutturali interni ───────────────────────────────────────────
// Usano solo classi e stili già esistenti nel design system.

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: "1.2rem",
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.7,
          fontSize: "0.98rem",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginTop: 8 }}>
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.95)",
          marginBottom: 6,
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}
