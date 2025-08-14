import React from 'react';
import FormNotice from "@/components/common/FormNotice.jsx";

const HomepageStatic = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1>Trasforma il Futuro del Pianeta</h1>
            <p>
              Costruiamo la più grande community sostenibile d'Italia. Insieme possiamo creare un impatto positivo duraturo per le generazioni future. Ecco i nostri obiettivi per il 2026:
            </p>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-icon">🌍</div>
                <div className="stat-text">
                  <div className="stat-number">1.000+</div>
                  <div className="stat-label">Membri attivi</div>
                </div>
              </div>
              <div className="stat">
                <div className="stat-icon">👥</div>
                <div className="stat-text">
                  <div className="stat-number">100+</div>
                  <div className="stat-label">Progetti realizzati</div>
                </div>
              </div>
              <div className="stat">
                <div className="stat-icon">🌱</div>
                <div className="stat-text">
                  <div className="stat-number">3000+</div>
                  <div className="stat-label">Alberi piantati</div>
                </div>
              </div>
            </div>
            <button className="cta-button" onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth' })}>
              Lista di attesa <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Table */}
      <section className="features-section">
        <div className="container">
          <h2>Confronta i Piani di Membership</h2>
          <div className="features-table">
            <div className="table-header">
              <div className="feature-column">Funzionalità</div>
              <div className="plan-column">Volontario</div>
              <div className="plan-column premium">Giudice</div>
              <div className="plan-column">Azienda</div>
            </div>
            {[
              ['Accesso Community', '✓', '✓', '✓'],
              ['Wallet privato', '✓', '✓', '✓'],
              ['Progetti Mensili', '3', 'Illimitati', 'Illimitati'],
              ['Corsi base', '✓', '✓', '✓'],
              ['Corsi avanzati', '—', '✓', 'Per dipendenti'],
              ['Accesso Vip Eventi', '—', '✓', '✓'],
              ['Supporto personalizzato', '—', '—', '✓'],
            ].map((row, i) => (
              <div className="table-row" key={i}>
                {row.map((cell, j) => (
                  <div className={j === 0 ? 'feature-cell' : 'plan-cell'} key={j}>{cell}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Benefits */}
      <section className="community-section">
        <div className="community-bg"></div>
        <div className="container">
          <h2>Perché Scegliere la Nostra Community?</h2>
          <div className="benefits-grid">
            {[
              ['👥', 'Community Globale', 'Costruita con persone che condividono la tua passione per l\'ambiente'],
              ['💡', 'Sostenibilità', 'Costruiamo la transizione ecologica dal basso, giorno dopo giorno'],
              ['🎯', 'Obiettivi Concreti', 'Lavora su progetti che creano un impatto reale e misurabile a casa tua'],
              ['🏆', 'Riconoscimenti', 'Ottieni riconoscimenti economici e punti bonus per il tuo impegno'],
              ['💬', 'Supporto Continuo', 'Ricevi supporto e feedback dalla community e dagli esperti'],
              ['📈', 'Opportunità', 'Supporta o proponi progetti per avere benefici misurabili per la tua azienda'],
            ].map(([icon, title, desc], i) => (
              <div className="benefit-card" key={i}>
                <div className="benefit-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="support-section">
        <div className="container">
          <h2>Il Nostro Impegno per Te</h2>
          <div className="support-grid">
            {[
              ['📚', 'Formazione Continua', 'Accedi a corsi, webinar e workshop. Diventa giudice o esperto della transizione ecologica.'],
              ['🤝', 'Networking Professionale', 'Connettiti con professionisti, collabora con i gruppi locali, sviluppa i tuoi progetti.'],
              ['🌿', 'Progetti Concreti', 'Partecipa a iniziative reali, proponi o sostieni le tue iniziative, accreditale nelle tue performance aziendali.'],
            ].map(([icon, title, desc], i) => (
              <div className="support-card" key={i}>
                <div className="support-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Section */}
      <section className="registration-section" id="registration">
        <div className="container">
          <h2>Inizia il Tuo Viaggio Sostenibile</h2>
          <p>A breve sarà possibile iscriversi alla nostra lista d'attesa per essere un beta tester della piattaforma. Inizia a fare la differenza per il pianeta prima del lancio dell'app, avrai benefici riservati ai tester. La registrazione è gratuita e immediata, non temere ti contatteremo noi appena partiranno i test nella tua area di interesse</p>
          
           {/* Alert Form Notice */}
           <FormNotice />

          <form className="registration-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="name">Nome Completo</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="interests">Aree di Interesse</label>
              <select id="interests" name="interests" required>
                <option value="">Seleziona un'area</option>
                <option value="renewable-energy">Test della piattaforma</option>
                <option value="waste-reduction">Proporre progetti locali</option>
                <option value="sustainable-agriculture">Diventare formatore</option>
                <option value="green-technology">Diventare un giudice</option>
                <option value="environmental-education">Sostenere un progetto locale</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <input type="checkbox" id="newsletter" name="newsletter" />
              <label htmlFor="newsletter">Iscriviti alla newsletter per ricevere aggiornamenti</label>
            </div>
            <button type="submit" className="submit-button">Proponiti alla Community</button>
          </form>
        </div>
      </section>
    </>
  );
};

export default HomepageStatic;
