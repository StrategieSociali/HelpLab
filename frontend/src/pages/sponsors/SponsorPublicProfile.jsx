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
import { useParams } from "react-router-dom";
import TextBlock from "@/components/UI/TextBlock";
import { formatDate } from "@/utils/date";
import SponsorRatingsSummary from "@/components/sponsors/SponsorRatingsSummary";
import SponsorRatingsList from "@/components/sponsors/SponsorRatingsList";
import SponsorRatingsForm  from "@/components/sponsors/SponsorRatingsForm";


const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");


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

        const res = await fetch(`${API_BASE}/v1/sponsors/${id}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Sponsor non trovato");
          }
          throw new Error("Errore nel caricamento sponsor");
        }

        const data = await res.json();
        if (mounted) setSponsor(data);
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
