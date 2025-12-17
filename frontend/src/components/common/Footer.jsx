// src/components/common/Footer.jsx
/**
 * Scopo: aggiungere un footer elegante e ben strutturato a tutte le pagine
 *
 * Attualmente contiene:
 * Brand e informazioni essenziali.
 * Privacy
 * Link al sito
 * Versione
 */
import React from "react";
import { APP_VERSION } from "@/config/constants";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation("components/common/footer", {
    useSuspense: false, // OBBLIGATORIO: componente globale
  });

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-text">
            {t("brand.name")}
          </span>
          <span className="footer-claim">
            {t("brand.claim")}
          </span>
        </div>

        {/* Link istituzionali */}
        <nav className="footer-nav">
          <a className="footer-link" href="/">{t("links.home")}</a>
          <a className="footer-link" href="/challenges">{t("links.challenges")}</a>
          <a className="footer-link" href="/learning-paths">{t("links.learning")}</a>
          <a
            className="footer-link"
            href="https://github.com/StrategieSociali/HelpLab"
            target="_blank"
            rel="noreferrer"
          >
            {t("links.github")}
          </a>
        </nav>
      

        <div className="footer-copy">
          © {year} {t("copyright")}
        </div>

        <div className="footer-version">
          {t("version.label")}: {APP_VERSION}
        </div>
      </div>
    </footer>
  );
}

