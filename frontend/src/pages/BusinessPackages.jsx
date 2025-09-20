import React from "react";
import { useNavigate } from "react-router-dom";

export default function BusinessPackages() {
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
          <h1 className="page-title">Pacchetti per le Imprese</h1>
          <p className="page-subtitle">
            Scegli il piano più adatto per trasformare il tuo impegno ESG in impatto reale, misurabile e comunicabile.
          </p>
        </header>

        {/* Pillars / Value */}
        <div className="benefits-grid" style={{ marginBottom: 16 }}>
          <div className="benefit-card">
            <div className="benefit-icon">📊</div>
            <h3>ESG con valore reale</h3>
            <p>Dati e prove verificabili, riutilizzabili in report CSRD/ESRS.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🏅</div>
            <h3>Reputazione & Marketing</h3>
            <p>Visibilità come sponsor di sfide locali ad alto impatto.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🤝</div>
            <h3>Engagement</h3>
            <p>Coinvolgi dipendenti e comunità con azioni concrete.</p>
          </div>
        </div>

        {/* Piani */}
        <div className="grid-cards" style={{ marginBottom: 16 }}>
          {/* Starter */}
          <article className="card glass">
            <header className="card-header">
              <div className="chip">Starter</div>
            </header>
            <h3 className="card-title">Avvio locale</h3>
            <ul className="meta-list">
              <li><span className="meta-label">Challenge</span><span className="meta-value">1</span></li>
              <li><span className="meta-label">Report</span><span className="meta-value">Base (KPI + foto)</span></li>
              <li><span className="meta-label">Supporto</span><span className="meta-value">Email</span></li>
            </ul>
            <p className="card-description">Perfetto per un primo progetto pilota nel territorio.</p>
            <div className="card-actions">
              <a className="btn btn-outline" href={mailtoHref}>Richiedi info</a>
            </div>
          </article>

          {/* Growth */}
          <article className="card glass">
            <header className="card-header">
              <div className="chip chip-type">Growth</div>
            </header>
            <h3 className="card-title">Impatto misurabile</h3>
            <ul className="meta-list">
              <li><span className="meta-label">Challenge</span><span className="meta-value">3</span></li>
              <li><span className="meta-label">Report</span><span className="meta-value">Avanzato (KPI + geo + media)</span></li>
              <li><span className="meta-label">Supporto</span><span className="meta-value">Dedicato</span></li>
            </ul>
            <p className="card-description">Per programmi continui e raccontabili in modo strutturato.</p>
            <div className="card-actions">
              <a className="btn btn-primary" href={mailtoHref}>Parla con noi</a>
            </div>
          </article>

          {/* Enterprise */}
          <article className="card glass">
            <header className="card-header">
              <div className="chip">Enterprise</div>
            </header>
            <h3 className="card-title">Programma su misura</h3>
            <ul className="meta-list">
              <li><span className="meta-label">Challenge</span><span className="meta-value">Custom</span></li>
              <li><span className="meta-label">Report</span><span className="meta-value">CSRD/ESRS-ready</span></li>
              <li><span className="meta-label">Supporto</span><span className="meta-value">Consulenza</span></li>
            </ul>
            <p className="card-description">Co-progettazione, KPI dedicati, governance e storytelling.</p>
            <div className="card-actions">
              <a className="btn btn-outline" href={mailtoHref}>Richiedi una call</a>
            </div>
          </article>
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

