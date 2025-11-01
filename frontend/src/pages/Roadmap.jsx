import React from "react";
import { useNavigate } from "react-router-dom";
import { APP_VERSION } from '@/config/constants';

export default function Roadmap() {
  const navigate = useNavigate();

  const mailtoHref = `mailto:info@helplab.space?subject=${encodeURIComponent(
    "vorrei maggiori informazioni sulle proposte di Helplab per le imprese"
  )}&body=${encodeURIComponent(
    "Descrivere la vostra azienda, il settore di intervento, inserire inoltre un contatto cellulare se volete una risposta celere"
  )}`;

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">La nostra Roadmap, cosa aspettarsi e come seguirci</h1>
          <p className="page-subtitle">
           Versione attuale: {APP_VERSION}
          </p>
          <p className="page-subtitle">
           Per contribuire vai sul GitHub repository: HelpLab
          </p>
        </header>

        {/* Pillars / Value */}
        <div className="benefits-grid" style={{ marginBottom: 16 }}>
          <div className="benefit-card">
            <h3>✅ V0.3.x Messa a terra dell'architettura di base.</h3>
            <p>Costruzione di base del modello FrontEnd e BackEnd su dati mock.</p>
          </div>
          <div className="benefit-card">
            <h3>✅ V 0.4.x Introduzione Sfide e Giudici.</h3>
            <p>Sviluppo del modello di base delle sfide con giudici reali e loro assegnazione.</p>
          </div>
          <div className="benefit-card">
            <h3>✅V 0.5.x Migrazione su api reali V1 senza dati mock.</h3>
            <p>I vecchi dati fake divengono deprecati e eliminati, tutte le sfide sono migrate nel database definitivo.</p>
          </div>
          <div className="benefit-card">
            <h3>⚒️ V 0.6.x 👷 Leaderboard “reale” su base submissions, non più mock.</h3>
            <p>Sviluppo sistema di scoring avanzato e sua ntegrazione su API v1.</p>
          </div>
          <div className="benefit-card">
            <h3>v0.7.x Submissions & Evidence.</h3>
            <p>Upload prove (immagini, documenti) collegate alle submissions. API review evidenze (auto/judge).</p>
          </div>
          <div className="benefit-card">
            <h3>v0.8.x Gamification.</h3>
            <p>Badge, punteggi utente, achievements. Primo profilo/privato pubblico utente.</p>
          </div>
          <div className="benefit-card">
            <h3>v0.9.x Dashboard Admin evoluta</h3>
            <p>Gestione challenge e giudici da interfaccia, interfaccia imprese per sponsorizzazione sfide. Analytiche di base.</p>
          </div>
          <div className="benefit-card">
            <h3>v1.x STABLE!! Report per sponsor (nuova milestone)</h3>
            <p>Reportistica aggregata per sponsor: Sfide sponsorizzate, Partecipanti / impatto / metriche ambientali, Download PDF/CSV.</p>
          </div>
        <div className="benefit-card">
            <h3>v2.x Rilascio versione stabile White Label e API per imprese (nuova milestone)</h3>
            <p>Sarà possibile estrapolare i punti in buoni sconto o sats.</p>
          </div>
          <div className="benefit-card">
            <h3>v3.x Integrazione Machine Learning (nuova milestone)</h3>
            <p>Introduzione automatica del calcolo delle metriche con Machine Learning.</p>
          </div>
	<div className="benefit-card">
            <h3>v4.x Introduzione sistema di riscatto punti - buoni/sats (nuova milestone)</h3>
            <p>Sarà possibile estrapolare i punti in buoni sconto o sats.</p>
          </div>
	<div className="benefit-card">
            <h3>Creazione sistema interno di relazioni e comunicazione</h3>
            <p>Sarà possibile creare relazioni tra utenti e gruppi di utenti, gruppi locali e dialogare: un piccolo social network interno.</p>
          </div>
          
          
        </div>
        {/* CTA finale */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ marginBottom: 6 }}>Pronti a lanciare la vostra prima challenge?</h2>
          <p className="page-subtitle" style={{ marginBottom: 12 }}>
            Possiamo partire da una sfida esistente o co-progettarne una nuova sul territorio.
          </p>
          <div
            className="cta-row"
            style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}
          >
            <a className="btn btn-primary" href={mailtoHref}>Parla con noi</a>
            <button className="btn btn-outline" onClick={() => navigate("/challenges/new")}>
              Lancia una challenge
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

