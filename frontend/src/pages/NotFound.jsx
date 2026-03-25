// src/pages/NotFound.jsx
/**
 * Pagina 404 - Not Found
 * 
 * Design pulito con:
 * - page-section per coerenza con altre pagine
 * - card glass per il contenuto
 * - bottoni standard del design system
 * - i18n per testi multilingua
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation('pages/notFound', {
    useSuspense: false,
  });

  return (
    <section className="page-section page-bg page-text">
      <div className="container" style={{ maxWidth: 640 }}>
        
        {/* Card centrale */}
        <div className="card glass" style={{ padding: '48px 32px', textAlign: 'center' }}>
          
          {/* Emoji o icona grande */}
          <div style={{ fontSize: '4rem', marginBottom: '16px' }} aria-hidden="true">
            🧭
          </div>

          {/* Titolo */}
          <h1 className="page-title" style={{ marginBottom: '12px' }}>
            {t('title')}
          </h1>

          {/* Descrizione */}
          <p className="muted" style={{ marginBottom: '32px', fontSize: '1rem' }}>
            {t('description')}
          </p>

          {/* Azioni */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary" aria-label={t('actions.homeAria')}>
              {t('actions.home')}
            </Link>
            <Link to="/login" className="btn btn-outline" aria-label={t('actions.loginAria')}>
              {t('actions.login')}
            </Link>
          </div>
        </div>

        {/* Link utili secondari */}
        <p className="muted small" style={{ textAlign: 'center', marginTop: '24px' }}>
          {t('help.text')}{' '}
          <a 
            href="https://t.me/+h_Rh9IpYpgZjZjc0" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'rgb(74,222,128)', textDecoration: 'none', fontWeight: 600 }}
          >
            {t('help.link')}
          </a>
        </p>

      </div>
    </section>
  );
}
