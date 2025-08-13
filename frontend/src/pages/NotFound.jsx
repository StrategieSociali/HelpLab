// NotFound.jsx
// Pagina 404 con lo stesso look dei form/pannelli (gradient scuro + card “vetrosa”).
// Usiamo soltanto classi che esistono già nel tuo CSS globale:
// - registration-section  → sfondo scuro a gradiente + tipografia chiara
// - container             → larghezza responsiva con padding orizzontale
// - registration-form     → “card” vetrosa con bordo arrotondato e blur
// - cta-button            → pulsanti/Link con gradiente verde
//
// Zero nuovi stili: puntiamo alla coerenza visiva con le pagine Login/Register.

import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    // <main> semantico + aria-labelledby per accessibilità degli screen reader
    <main className="registration-section" aria-labelledby="nf-title">
      <div className="container">
        {/* Riutilizziamo la “card” del form per dare coerenza visiva */}
        <div className="registration-form" role="region" aria-describedby="nf-desc">
          {/* Titolo della pagina 404 (leggibile su sfondo scuro grazie al tema) */}
          <h1 id="nf-title" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            Pagina non trovata
          </h1>

          {/* Testo breve e chiaro su cosa è successo e cosa può fare l’utente */}
          <p id="nf-desc" style={{ textAlign: 'center', opacity: 0.9, marginBottom: '1.25rem' }}>
            La risorsa che stai cercando potrebbe essere stata spostata o non esiste più.
            Puoi tornare alla Home oppure accedere per continuare.
          </p>

          {/* Azioni principali (usiamo i CTA verdi già presenti nello stile) */}
          <div
            // piccolo layout inline per posizionare i pulsanti; non creiamo nuove classi
            style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {/* Link alla Home */}
            <Link to="/" className="cta-button" aria-label="Torna alla Home">
              Torna alla Home
              <span className="arrow">→</span>
            </Link>

            {/* Link al Login */}
            <Link to="/login" className="cta-button" aria-label="Vai al Login">
              Vai al Login
              <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default NotFound;

