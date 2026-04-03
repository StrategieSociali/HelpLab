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
        


        {/* ── Sezione sponsorizzazioni attive/passate ─────────────────────────
            Mostra le challenge sponsorizzate con payment_status pubblico.
            Il payment_status è esposto dal BE per permettere alla community
            di valutare l'affidabilità dello sponsor nei pagamenti. */}
        {sponsor.sponsorships && sponsor.sponsorships.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="page-subtitle" style={{ marginBottom: 12 }}>
              Sfide sostenute
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sponsor.sponsorships.map((s) => (
                <div
                  key={s.challenge_id}
                  className="card"
                  style={{ padding: "12px 16px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>

                    {/* Titolo challenge — cliccabile se ha uno slug */}
                    <div>
                      {s.challenge_slug ? (
                        <Link
                          to={routes.dashboard.challengeLive(s.challenge_id)}
                          className="small"
                          style={{ fontWeight: 600 }}
                        >
                          {s.challenge_title}
                        </Link>
                      ) : (
                        <span className="small" style={{ fontWeight: 600 }}>
                          {s.challenge_title}
                        </span>
                      )}
                      {s.challenge_status && (
                        <span
                          className="chip chip-neutral"
                          style={{ marginLeft: 8, fontSize: "0.7rem" }}
                        >
                          {s.challenge_status}
                        </span>
                      )}
                    </div>

                    {/* Stato pagamento — badge colorato per affidabilità */}
                    <span
                      className={
                        s.payment_status === "confirmed"
                          ? "chip chip-success"
                          : s.payment_status === "cancelled"
                          ? "chip chip-error"
                          : "chip chip-neutral"
                      }
                      title="Stato del pagamento della sponsorizzazione"
                    >
                      {s.payment_status === "confirmed" && "✔ Pagamento confermato"}
                      {s.payment_status === "pending"   && "⏳ Pagamento in attesa"}
                      {s.payment_status === "cancelled" && "✖ Pagamento annullato"}
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
