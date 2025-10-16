// src/components/common/Footer.jsx
import React from "react";
import { APP_VERSION } from '@/config/constants';

export default function Footer() {
 const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-text">HelpLab</span>
          <span className="footer-claim">
            Humanity Empowered for Local Progress
          </span>
        </div>

        {/* Link opzionali (attivali quando vuoi)
        <nav className="footer-nav">
          <a className="footer-link" href="/">Home</a>
          <a className="footer-link" href="/challenges">Sfide</a>
          <a className="footer-link" href="/learning-paths">Corsi</a>
          <a className="footer-link" href="https://github.com/helplab" target="_blank" rel="noreferrer">GitHub</a>
        </nav> */}

        <div className="footer-copy">
          © {year} HelpLab — Tutti i diritti riservati
        </div>
        <div>Versione attuale: {APP_VERSION}</div>
      </div>
    </footer>
  );
}

