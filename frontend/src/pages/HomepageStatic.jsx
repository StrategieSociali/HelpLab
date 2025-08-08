import React from 'react';

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
              Unisciti alla più grande community sostenibile d'Italia. Insieme possiamo creare un impatto positivo duraturo per le generazioni future.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-icon">🌍</div>
                <div className="stat-text">
                  <div className="stat-number">50,000+</div>
                  <div className="stat-label">Membri Attivi</div>
                </div>
              </div>
              <div className="stat">
                <div className="stat-icon">👥</div>
                <div className="stat-text">
                  <div className="stat-number">200+</div>
                  <div className="stat-label">Progetti Completati</div>
                </div>
              </div>
              <div className="stat">
                <div className="stat-icon">🌱</div>
                <div className="stat-text">
                  <div className="stat-number">1M+</div>
                  <div className="stat-label">Alberi Piantati</div>
                </div>
              </div>
            </div>
            <button className="cta-button" onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth' })}>
              Inizia Ora <span className="arrow">→</span>
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
              <div className="plan-column">Gratuito</div>
              <div className="plan-column premium">Premium</div>
              <div className="plan-column">Enterprise</div>
            </div>
            {[
              ['Accesso Community', '✓', '✓', '✓'],
              ['Progetti Mensili', '3', 'Illimitati', 'Illimitati'],
              ['Mentorship', '—', '✓', '✓'],
              ['Eventi Esclusivi', '—', '✓', '✓'],
              ['Supporto Prioritario', '—', '—', '✓'],
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
              ['👥', 'Community Globale', 'Connettiti con persone che condividono la tua passione per l\'ambiente'],
              ['💡', 'Innovazione Sostenibile', 'Accedi alle ultime innovazioni e tecnologie verdi'],
              ['🎯', 'Obiettivi Concreti', 'Lavora su progetti che creano un impatto reale e misurabile'],
              ['🏆', 'Riconoscimenti', 'Ottieni certificazioni e riconoscimenti per il tuo impegno'],
              ['💬', 'Supporto Continuo', 'Ricevi supporto e feedback dalla community e dagli esperti'],
              ['📈', 'Crescita Personale', 'Sviluppa competenze e conoscenze nel campo della sostenibilità'],
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
              ['📚', 'Formazione Continua', 'Accedi a corsi, webinar e workshop...'],
              ['🤝', 'Networking Professionale', 'Connettiti con professionisti...'],
              ['🌿', 'Progetti Concreti', 'Partecipa a iniziative reali...'],
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
          <p>Unisciti oggi stesso alla nostra community e inizia a fare la differenza per il pianeta. La registrazione è gratuita e immediata.</p>

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
                <option value="renewable-energy">Energia Rinnovabile</option>
                <option value="waste-reduction">Riduzione dei Rifiuti</option>
                <option value="sustainable-agriculture">Agricoltura Sostenibile</option>
                <option value="green-technology">Tecnologie Verdi</option>
                <option value="environmental-education">Educazione Ambientale</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <input type="checkbox" id="newsletter" name="newsletter" />
              <label htmlFor="newsletter">Iscriviti alla newsletter per ricevere aggiornamenti</label>
            </div>
            <button type="submit" className="submit-button">Unisciti alla Community</button>
          </form>
        </div>
      </section>
    </>
  );
};

export default HomepageStatic;
