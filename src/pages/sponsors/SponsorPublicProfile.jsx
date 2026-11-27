// src/pages/sponsors/SponsorPublicProfile.jsx
/**
 * Scopo: mostra il profilo pubblico di uno sponsor
 *
 * Attualmente supporta:
 * - visualizzazione dati pubblici dello sponsor
 *   (nome, descrizione, sito web, logo)
 * - accesso pubblico senza autenticazione
 * - gestione stati di caricamento ed errore (404 / network)
 *
 * - 8a, passo 7: eventi sostenuti, «Pagamento in ritardo dal …» e registro dei
 *   pagamenti con i fatti (payment_record), al posto di un punteggio
 *
 * Note:
 * - componente READ-ONLY
 * - non gestisce rating, recensioni o azioni utente
 * - non dipende dal contesto di autenticazione
 * - utilizza esclusivamente l’endpoint:
 *   GET /api/v1/sponsors/:id
 */
 
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { formatDate } from "@/utils/date";
import SponsorRatingsSummary from "@/components/sponsors/SponsorRatingsSummary";
import SponsorRatingsList from "@/components/sponsors/SponsorRatingsList";
import SponsorRatingsForm  from "@/components/sponsors/SponsorRatingsForm";
import { api } from "@/api/client";
import { routes } from "@/routes";


export default function SponsorPublicProfile() {
  const { id } = useParams();

  const [sponsor, setSponsor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSponsor() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/v1/sponsors/${id}`);
        if (mounted) setSponsor(res.data);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSponsor();
    return () => {
      mounted = false;
    };
  }, [id]);

  /* =======================
     RENDER STATES
     ======================= */

  if (loading) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <TextBlock>Caricamento profilo sponsor…</TextBlock>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <div className="card">
            <h2 className="page-title">Errore</h2>
            <p className="muted">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!sponsor) {
    return null; // safety net (non dovrebbe mai accadere)
  }

  /* =======================
     MAIN RENDER
     ======================= */

return (
  <section className="page-section page-text">
    <div className="container">
      <div className="card sponsor-profile-card">

        {/* Header sponsor */}
        <div className="sponsor-header">
          {sponsor.logo_url && (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="sponsor-logo"
            />
          )}

          <div className="sponsor-header__content">
            <h1 className="page-title">{sponsor.name}</h1>

            <div className="muted small">
              Sponsor attivo dal {formatDate(sponsor.created_at)}
            </div>

            <SponsorRatingsSummary sponsorId={sponsor.id} />

            {sponsor.website && (
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="sponsor-website"
              >
                <span className="sponsor-website__icon">🌐</span>
                <span className="sponsor-website__text">
                  {new URL(sponsor.website).hostname.replace("www.", "")}
                </span>
              </a>
            )}
          </div>
        </div>

        {/* Descrizione */}
        {sponsor.description && (
          <p className="sponsor-description">
            {sponsor.description}
          </p>
        )}
        


        {/* ── Registro dei pagamenti (8a, passo 7, decisione B) ─────────────
            I fatti con le date, al posto di un punteggio: un'etichetta detta di
            un'azienda, se sbagliata, è un rischio legale; i fatti si verificano,
            e l'admin arbitra. Si mostra solo se c'è almeno un fatto. */}
        <PaymentRecord record={sponsor.payment_record} />

        {/* ── Sezione sponsorizzazioni attive/passate ─────────────────────────
            Mostra sfide ed eventi sostenuti con payment_status pubblico.
            Il payment_status è esposto dal BE per permettere alla community
            di valutare l'affidabilità dello sponsor nei pagamenti. Dal passo 7
            dell'8a, scaduto il termine senza pagamento, «Pagamento in ritardo
            dal …» (`late_since`): lo sponsor sparisce dalla pagina dell'evento o
            della sfida, e il ritardo si legge qui. */}
        {sponsor.event_sponsorships && sponsor.event_sponsorships.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="page-subtitle" style={{ marginBottom: 12 }}>
              Eventi sostenuti
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sponsor.event_sponsorships.map((s) => (
                <SponsorshipRow
                  key={`ev-${s.event_id}`}
                  s={s}
                  title={s.event_name}
                  to={s.event_slug ? routes.events.detail(s.event_slug) : null}
                  status={s.event_status}
                />
              ))}
            </div>
          </div>
        )}

        {sponsor.sponsorships && sponsor.sponsorships.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="page-subtitle" style={{ marginBottom: 12 }}>
              Sfide sostenute
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sponsor.sponsorships.map((s) => (
                <SponsorshipRow
                  key={s.challenge_id}
                  s={s}
                  title={s.challenge_title}
                  to={s.challenge_slug ? routes.dashboard.challengeLive(s.challenge_id) : null}
                  status={s.challenge_status}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rating form COMPARE SEMPRE LIMITARLO AI LOGGATI E A CHI HA FATTO UNA SUBMISSION*/}
        <SponsorRatingsForm sponsorId={sponsor.id} />
        
      <div className="card" style={{ marginTop: 32 }}>
         <h4 className="page-subtitle" style={{ marginBottom: 16 }}>
         Leggi le recensioni verificate di {sponsor.name}:
      </h4>
      </div>
        
         {/* Lista delle recensioni per singolo sponsor */}
        <SponsorRatingsList sponsorId={sponsor.id} />
        

      </div>
    </div>
  </section>
);}

/* =======================
   SOTTOCOMPONENTI (8a, passo 7)
   ======================= */

/** Una sponsorizzazione, di sfida o di evento, con lo stato del pagamento. */
function SponsorshipRow({ s, title, to, status }) {
  const chip = s.late_since
    ? { cls: "chip chip-error", text: `⚠ Pagamento in ritardo dal ${formatDate(s.late_since)}` }
    : s.payment_status === "confirmed"
      ? { cls: "chip chip-success", text: "✔ Pagamento confermato" }
      : s.payment_status === "cancelled"
        ? { cls: "chip chip-error", text: "✖ Pagamento annullato" }
        : { cls: "chip chip-neutral", text: "⏳ Pagamento in attesa" };

  return (
    <div className="card" style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          {to ? (
            <Link to={to} className="small link-accent" style={{ fontWeight: 600 }}>
              {title}
            </Link>
          ) : (
            <span className="small" style={{ fontWeight: 600 }}>{title}</span>
          )}
          {status && (
            <span className="chip chip-neutral" style={{ marginLeft: 8, fontSize: "0.7rem" }}>
              {status}
            </span>
          )}
        </div>

        {/* Stato pagamento — badge colorato per affidabilità */}
        <span className={chip.cls} style={{ whiteSpace: "nowrap" }} title="Stato del pagamento della sponsorizzazione">
          {chip.text}
        </span>
      </div>

      {/* Meta: importo + date */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
        {s.amount_eur && (
          <span className="small muted">
            Importo: <strong>{s.amount_eur}€</strong>
          </span>
        )}
        {s.sponsored_at && (
          <span className="small muted">
            Dal: <strong>{formatDate(s.sponsored_at)}</strong>
          </span>
        )}
        {s.payment_deadline && (
          <span className="small muted">
            Scadenza del pagamento: <strong>{formatDate(s.payment_deadline)}</strong>
          </span>
        )}
        {s.confirmed_at && (
          <span className="small muted">
            Confermato: <strong>{formatDate(s.confirmed_at)}</strong>
          </span>
        )}
      </div>

      {/* Commento pubblico opzionale */}
      {s.public_comment && (
        <p className="small muted" style={{ marginTop: 6, fontStyle: "italic" }}>
          "{s.public_comment}"
        </p>
      )}
    </div>
  );
}

/** Il registro dei pagamenti: puntuali, in ritardo, annullati. */
function PaymentRecord({ record }) {
  if (!record) return null;
  const { puntuali = 0, in_ritardo = 0, in_ritardo_ora = 0, annullate = 0 } = record;
  if (puntuali + in_ritardo + annullate === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <h2 className="page-subtitle" style={{ marginBottom: 8 }}>Registro dei pagamenti</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="chip chip-success" style={{ whiteSpace: "nowrap" }}>✔ {puntuali} puntuali</span>
        <span className="chip chip-neutral" style={{ whiteSpace: "nowrap" }}>
          ⏱ {in_ritardo} in ritardo{in_ritardo_ora > 0 ? ` (${in_ritardo_ora} ancora da pagare)` : ""}
        </span>
        <span className="chip chip-neutral" style={{ whiteSpace: "nowrap" }}>✖ {annullate} annullati</span>
      </div>
      <p className="small muted" style={{ marginTop: 6 }}>
        Puntuale: pagato entro la scadenza. In ritardo: pagato dopo, o non ancora pagato a scadenza passata.
        Le sponsorizzazioni non ancora in scadenza non si contano.
      </p>
    </div>
  );
}
