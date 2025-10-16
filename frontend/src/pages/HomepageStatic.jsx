import React from 'react';
import { useNavigate } from "react-router-dom";
import FormNotice from "@/components/common/FormNotice.jsx";
import { Wrench, Gift, Users } from "lucide-react";
import heroBg from '@/assets/sustainability-hero.jpg';

const HomepageStatic = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* 1) HERO */}
      <section
      className="hero-section"
 	 style={{
  	  backgroundImage: `url(${heroBg})`,
  	  backgroundSize: 'cover',
  	  backgroundPosition: 'center',
 	 }}
>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1>Trasforma il tuo impegno ESG in azioni concrete e misurabili</h1>
            <p className="page-subtitle" style={{maxWidth: 860}}>
              HelpLab collega aziende, PA e cittadini per generare impatto locale misurabile, con dati e prove verificabili.
            </p><p className="page-subtitle" style={{maxWidth: 860}}>
              <strong>Nota Bene:</strong> Questa è una versione in sviluppo, sono possibili interruzioni o malfunzionamenti. Consulta la Roadmap nel menu in alto.
            </p>

            {/* CTA doppia: aziende/PA vs cittadini */}
            <div
  className="cta-row"
  style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}
>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/challenges')}
                title="Lancia una challenge come azienda o PA"
              >
                Lancia una challenge
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/challenges')}
                title="Partecipa a una challenge vicino a te"
              >
                Partecipa a una challenge
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2) PERCHÉ CONVIENE ALLE IMPRESE (3 pilastri) */}
      <section className="community-section">
        <div className="community-bg"></div>
        <div className="container">
          <h2>Perché conviene alle imprese e alle PA</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">📊</div>
              <h3>ESG con valore reale</h3>
              <p>
                Dati verificabili utilizzabili in report <strong>CSRD/ESRS</strong>: foto, geolocalizzazione e KPI certificabili.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🏅</div>
              <h3>Reputazione & Marketing</h3>
              <p>
                Visibilità come sponsor di <strong>sfide locali</strong> ad alto impatto, con storytelling pronto per i canali aziendali.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🤝</div>
              <h3>Engagement interno & esterno</h3>
              <p>
                Coinvolgi dipendenti e comunità insieme: volontariato d’impresa, welfare e impatto territoriale.
              </p>
            </div>
          </div>
        </div>
      </section>
     

      {/* 3) COME FUNZIONA (per le imprese) */}
      <section className="support-section">
        <div className="container">
          <h2>Come funziona (per le imprese)</h2>
          <div className="support-grid">
            <div className="support-card">
              <div className="support-icon">🧭</div>
              <h3>1. Scegli o proponi una sfida</h3>
              <p>Esempi: pulizia spiagge e parchi, piantumazioni, riduzione sprechi, mobilità sostenibile.</p>
            </div>
            <div className="support-card">
              <div className="support-icon">💸</div>
              <h3>2. Sponsorizza e attiva la community</h3>
              <p>Finanzia con micro-incentivi e materiali una o più sfide. HelpLab gestisce il coinvolgimento sul territorio.</p>
            </div>
            <div className="support-card">
              <div className="support-icon">✅</div>
              <h3>3. Ricevi report certificato</h3>
              <p>Dati, foto, geo e KPI verificabili per bilanci di sostenibilità e comunicazione aziendale.</p>
            </div>
          </div>
        </div>
      </section>
      

      {/* 4) VALORE PER LE AZIENDE (esempio di output concreti) */}
      <section className="features-section">
        <div className="container">
          <h2>Valore per la tua azienda (esempi)</h2>

          <div className="features-table card" style={{ padding: 16 }}>
            <div className="table-row">
              <div className="feature-cell">✅ 500 kg di rifiuti raccolti in 1 mese</div>
              <div className="plan-cell">Report pronto all’uso</div>
            </div>
            <div className="table-row">
              <div className="feature-cell">✅ 30 volontari coinvolti, 200 ore donate</div>
              <div className="plan-cell">Engagement misurabile</div>
            </div>
            <div className="table-row">
              <div className="feature-cell">✅ Riduzione stimata: X tonnellate CO₂e</div>
              <div className="plan-cell">Allineato a CSRD/ESRS</div>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 10 }}>
            Ogni risultato è comunicabile in bilanci di sostenibilità, campagne marketing e programmi di welfare aziendale.
          </p>
        </div>
      </section>

      {/* 5) TESTIMONIANZE / SPONSOR (placeholder) */}
      <section className="community-section">
        <div className="community-bg"></div>
        <div className="container">
          <h2>Testimonianze & Sponsor</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">💬</div>
              <h3>“Impatto reale, non solo parole”</h3>
              <p>
                “Grazie ad HelpLab abbiamo trasformato un budget CSR in un impatto concreto sulla comunità locale (fake).”
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🏢</div>
              <h3>Case study (mockup)</h3>
              <p>
                “Pulizia parchi sponsorizzata da un’azienda di utilities: 120 volontari, 1.2 tonnellate di rifiuti raccolti.”
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📸</div>
              <h3>Prove e dati</h3>
              <p>
                Foto, geolocalizzazione e report rendono i risultati verificabili e riutilizzabili nei tuoi canali.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 6) CALL TO ACTION FINALE */}
<section className="support-section">
  <div className="container">
    <div className="card" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 6 }}>
        Vuoi trasformare la tua sostenibilità in impatto reale?
      </h2>
      <p className="page-subtitle" style={{ marginBottom: 12 }}>
        Scopri come lanciare la tua prima challenge con HelpLab.
      </p>
      <div
        className="cta-row"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <button
          className="btn btn-outline"
          onClick={() =>
            (window.location.href = `mailto:info@helplab.space?subject=${encodeURIComponent(
              "vorrei maggiori informazioni sulle proposte di Helplab per le imprese"
            )}&body=${encodeURIComponent(
              "Descrivere la vostra azienda, il settore di intervento, inserire inoltre un contatto cellulare se volete una risposta celere"
            )}`)
          }
        >
          Parla con noi
        </button>
        <button
          className="btn btn-outline"
          onClick={() => navigate("/business")}
        >
          Scopri i pacchetti per le imprese
        </button>
      </div>
    </div>
  </div>
</section>
      
      {/* HERO CITTADINI */}
<section className="hero-section">
  <div className="hero-overlay"></div>
  <div className="hero-content">
    <div className="hero-text">
      <h1>Partecipa in prima persona, ottieni premi e crea impatto nella tua città</h1>
      <p className="page-subtitle" style={{ maxWidth: 860 }}>
        Unisciti alla community: scegli una challenge, contribuisci e accumula premi monetizzabili mentre migliori il tuo territorio.
      </p>

      <div
        className="cta-row"
        style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}
      >
        <button className="btn btn-outline" onClick={() => navigate("/challenges")}>
          Partecipa a una challenge
        </button>
        <button className="btn btn-outline" onClick={() => navigate("/register")}>
          Iscriviti ora
        </button>
      </div>
    </div>
  </div>
</section>

{/* PILASTRI CITTADINI */}
<section className="community-section">
  <div className="community-bg"></div>
  <div className="container">
    <h2>Perché partecipare</h2>
    <div className="benefits-grid">
      <div className="benefit-card">
        <div className="benefit-icon" aria-hidden="true">
          <Wrench size={40} strokeWidth={1.5} />
        </div>
        <h3>Risoluzione di problemi reali</h3>
        <p>
          Pulizia dei parchi, piantumazione di alberi e molto altro: azioni concrete che migliorano davvero il quartiere.
        </p>
      </div>

      <div className="benefit-card">
        <div className="benefit-icon" aria-hidden="true">
          <Gift size={40} strokeWidth={1.5} />
        </div>
        <h3>Premi monetizzabili</h3>
        <p>
          Accumula punti con le challenge e riscattali in premi o buoni: il tuo impegno viene valorizzato. Puoi anche diventare un giudice o un formatore!
        </p>
      </div>

      <div className="benefit-card">
        <div className="benefit-icon" aria-hidden="true">
          <Users size={40} strokeWidth={1.5} />
        </div>
        <h3>Community di valori</h3>
        <p>
          Entra in una rete di persone e realtà locali che condividono obiettivi di sostenibilità e solidarietà. Sfida le altre community per avere maggiori premi.
        </p>
      </div>
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
              ['Report CSRD/ESRS', '—', 'Base', 'Certificabili'],
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


      {/* (opzionale) Sezione registrazione / lista d'attesa: mantenuta */}
      <section className="registration-section" id="registration">
        <div className="container">
          <h2>Inizia il Tuo Viaggio Sostenibile</h2>
          <p>
            Cerchiamo partner per la community di HelpLab.
          </p>

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
                <option value="platform-testing">Test della piattaforma</option>
                <option value="local-projects">Proporre progetti locali</option>
                <option value="trainer">Diventare formatore</option>
                <option value="judge">Diventare un giudice</option>
                <option value="supporter">Sostenere un progetto locale</option>
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

