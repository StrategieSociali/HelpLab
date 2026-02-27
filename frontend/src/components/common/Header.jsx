// src/components/common/Header.jsx
/**
 * Scopo: strutturare l'header del sito
 *
 * Attualmente supporta:
 * - Logo + language switch
 * - Menu utente non registrato
 * - Menu utente registrato
 * - Menu admin controllato (React state, non <details>)
 * - Tasto login/registrati/logout
 *
 * AGGIORNAMENTO sprint events v1.1:
 * - Dropdown "Sfide" rinominato in "Partecipa"
 * - Aggiunta voce "Eventi" nel dropdown "Partecipa"
 * - Aggiunta voce "Gestione eventi" nel menu admin (desktop + mobile)
 * - Chiavi i18n nuove: nav.participate, nav.events
 *   (da aggiungere ai file di traduzione — vedi nota in fondo)
 *
 * FIX RC 1.0.7 (invariati):
 * - Admin menu ora controllato da stato (si chiude al click)
 * - Rimossa classe btn-pill (uniformità globale → border-radius: 10px)
 * - Admin menu desktop si chiude al click su link
 * - Admin menu mobile si chiude quando si chiude il burger
 */

import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/routes";
import { isAdmin } from "@/utils/roles";
import LogoutButton from "@/components/common/LogoutButton";
import { useTranslation } from "react-i18next";
import { startTransition } from "react";

export default function Header() {
  const { t, i18n } = useTranslation("components/common/header", {
    useSuspense: false,
  });

  const { isAuthenticated, user } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  // Sottomenu
  const [partecipaOpen, setPartecipaOpen] = useState(false);   // ← era sfideOpen
  const [communityOpen, setCommunityOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminDesktopOpen, setAdminDesktopOpen] = useState(false);

  const isAdminUser = isAdmin(user?.role);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      if (prev) {
        setPartecipaOpen(false);
        setCommunityOpen(false);
        setAdminOpen(false);
      }
      return !prev;
    });
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) {
        setMenuOpen(false);
        setPartecipaOpen(false);
        setCommunityOpen(false);
        setAdminOpen(false);
        setAdminDesktopOpen(false);
      }
      setReady(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!ready) return null;

  return (
    <header className="site-header">
      <div className="container header-row">

        {/* ── Brand + Language Switch ──────────────────────────────────── */}
        <Link to={routes.home} className="brand-link">
          <strong>{t("brand.title")}</strong>
          <span className="muted small">{t("brand.subtitle")}</span>
          <span className="muted small language-switch">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); i18n.changeLanguage("it"); }}
              aria-label="Italiano"
              className="lang-btn"
            >
              🇮🇹
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); i18n.changeLanguage("en"); }}
              aria-label="English"
              className="lang-btn"
            >
              🇬🇧
            </button>
          </span>
        </Link>

        {/* ── Burger (mobile only) ─────────────────────────────────────── */}
        <button
          className={`burger ${menuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* ── Nav principale ───────────────────────────────────────────── */}
        <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="Primary">

          {/* ── Partecipa dropdown (ex Sfide) ────────────────────────── */}
          <div
            className={`sfide-menu ${partecipaOpen ? "open" : ""}`}
            onMouseEnter={() => { if (!isMobile) setPartecipaOpen(true); }}
            onMouseLeave={() => { if (!isMobile) setPartecipaOpen(false); }}
          >
            <span
              className="nav-link"
              onClick={() => { if (isMobile) setPartecipaOpen((prev) => !prev); }}
            >
              {t("nav.participate", "Partecipa")} ▾
            </span>
            <div className="sfide-menu__list">

              {/* NUOVO: Eventi */}
              <NavLink
                to={routes.events.list}
                className="btn"
                onClick={() => { setMenuOpen(false); setPartecipaOpen(false); }}
              >
                {t("nav.events", "Eventi")}
              </NavLink>

              {/* Tutte le sfide */}
              <NavLink
                to={routes.dashboard.challenges}
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  setPartecipaOpen(false);
                  startTransition(() => { navigate(routes.dashboard.challenges); });
                }}
              >
                {t("nav.allChallenges")}
              </NavLink>

              {/* Classifica */}
              <NavLink
                to={routes.leaderboard}
                className="btn"
                onClick={() => { setMenuOpen(false); setPartecipaOpen(false); }}
              >
                {t("nav.leaderboard")}
              </NavLink>

              {/* I miei eventi + Crea evento — solo se autenticato */}
              {isAuthenticated && (
                <>
                  <NavLink
                    to={routes.events.mine}
                    className="btn"
                    onClick={() => { setMenuOpen(false); setPartecipaOpen(false); }}
                  >
                    {t("nav.myEvents", "I miei eventi")}
                  </NavLink>
                  <NavLink
                    to={routes.events.create}
                    className="btn"
                    onClick={() => { setMenuOpen(false); setPartecipaOpen(false); }}
                  >
                    {t("nav.createEvent", "Crea evento")}
                  </NavLink>
                </>
              )}

            </div>
          </div>

          {/* Learning Paths */}
          <NavLink
            to={routes.dashboard.learningPaths}
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.learningPaths")}
          </NavLink>

          {/* Community dropdown */}
          <div
            className={`sfide-menu ${communityOpen ? "open" : ""}`}
            onMouseEnter={() => { if (!isMobile) setCommunityOpen(true); }}
            onMouseLeave={() => { if (!isMobile) setCommunityOpen(false); }}
          >
            <span
              className="nav-link"
              onClick={() => { if (isMobile) setCommunityOpen((prev) => !prev); }}
            >
              {t("nav.community")} ▾
            </span>
            <div className="sfide-menu__list">
              <NavLink
                to={routes.joinHelpLab}
                className="btn"
                onClick={() => { setMenuOpen(false); setCommunityOpen(false); }}
              >
                {t("nav.join")}
              </NavLink>
              <NavLink
                to={routes.info}
                className="btn"
                onClick={() => { setMenuOpen(false); setCommunityOpen(false); }}
              >
                {t("nav.info")}
              </NavLink>
              <NavLink
                to={routes.community.sponsors}
                className="btn"
                onClick={() => { setMenuOpen(false); setCommunityOpen(false); }}
              >
                {t("nav.sponsors")}
              </NavLink>
            </div>
          </div>

          {/* Business */}
          <NavLink
            to={routes.business.packages}
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.business")}
          </NavLink>

          {/* Roadmap */}
          <NavLink
            to={routes.roadmap}
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.roadmap")}
          </NavLink>

          {/* Menu giudice (solo se ruolo judge) */}
          {user?.role === "judge" && (
            <NavLink
              to="/judge"
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              {t("nav.judge")}
            </NavLink>
          )}

          {/* ── Auth actions MOBILE ──────────────────────────────────── */}
          <div className="nav-auth-actions">
            {isAuthenticated ? (
              <>
                {isAdminUser && (
                  <div className="admin-menu">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setAdminOpen((prev) => !prev)}
                    >
                      {t("auth.admin.label")} {adminOpen ? "▴" : "▾"}
                    </button>
                    {adminOpen && (
                      <div className="admin-menu__list">
                        <NavLink
                          to={routes.admin.proposals}
                          className="btn btn-ghost"
                          onClick={() => { setMenuOpen(false); setAdminOpen(false); }}
                        >
                          {t("auth.admin.proposals")}
                        </NavLink>
                        <NavLink
                          to={routes.admin.assignJudge}
                          className="btn btn-ghost"
                          onClick={() => { setMenuOpen(false); setAdminOpen(false); }}
                        >
                          {t("auth.admin.assignJudges")}
                        </NavLink>
                        {/* NUOVO: Gestione eventi */}
                        <NavLink
                          to={routes.admin.events}
                          className="btn btn-ghost"
                          onClick={() => { setMenuOpen(false); setAdminOpen(false); }}
                        >
                          {t("nav.title.adminEvents", "Gestione eventi")}
                        </NavLink>
                        {/* NUOVO: Gestione corsi */}
                        <NavLink
                          to={routes.admin.learningPaths}
                          className="btn btn-ghost"
                          onClick={() => { setMenuOpen(false); setAdminOpen(false); }}
                        >
                          {t("auth.admin.learningPaths", "Gestione corsi")}
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}
                <NavLink
                  to={routes.dashboard.challengeCreate}
                  className="btn btn-ghost"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("auth.actions.createChallenge")}
                </NavLink>
                <NavLink
                  to={routes.dashboard.userProfile}
                  className="btn btn-ghost"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("auth.actions.profile")}
                </NavLink>
                <LogoutButton onAfterLogout={() => setMenuOpen(false)} />
              </>
            ) : (
              <>
                <NavLink
                  to={routes.auth.login}
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    startTransition(() => { navigate(routes.auth.login); });
                  }}
                >
                  {t("auth.actions.login")}
                </NavLink>
                <NavLink
                  to={routes.auth.register}
                  className="btn btn-outline"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("auth.actions.register")}
                </NavLink>
              </>
            )}
          </div>
        </nav>

        {/* ── Auth actions DESKTOP ─────────────────────────────────────── */}
        <div className="nav-auth-actions desktop-only">
          {isAuthenticated ? (
            <>
              {isAdminUser && (
                <div className="admin-menu">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setAdminDesktopOpen((prev) => !prev)}
                  >
                    {t("auth.admin.label")} {adminDesktopOpen ? "▴" : "▾"}
                  </button>
                  {adminDesktopOpen && (
                    <div className="admin-menu__list">
                      <NavLink
                        to={routes.admin.proposals}
                        className="btn btn-ghost"
                        onClick={() => setAdminDesktopOpen(false)}
                      >
                        {t("auth.admin.proposals")}
                      </NavLink>
                      <NavLink
                        to={routes.admin.assignJudge}
                        className="btn btn-ghost"
                        onClick={() => setAdminDesktopOpen(false)}
                      >
                        {t("auth.admin.assignJudges")}
                      </NavLink>
                      {/* NUOVO: Gestione eventi */}
                      <NavLink
                        to={routes.admin.events}
                        className="btn btn-ghost"
                        onClick={() => setAdminDesktopOpen(false)}
                      >
                        {t("auth.admin.events", "Gestione eventi")}
                      </NavLink>
                      {/* NUOVO: Gestione corsi */}
                      <NavLink
                        to={routes.admin.learningPaths}
                        className="btn btn-ghost"
                        onClick={() => setAdminDesktopOpen(false)}
                      >
                        {t("auth.admin.learningPaths", "Gestione corsi")}
                      </NavLink>
                    </div>
                  )}
                </div>
              )}
              <NavLink to={routes.dashboard.challengeCreate} className="btn btn-ghost">
                {t("auth.actions.createChallenge")}
              </NavLink>
              <NavLink to={routes.dashboard.userProfile} className="btn btn-ghost">
                {t("auth.actions.profile")}
              </NavLink>
              <LogoutButton />
            </>
          ) : (
            <>
              <NavLink
                to={routes.auth.login}
                className="btn btn-ghost"
                onClick={(e) => {
                  e.preventDefault();
                  startTransition(() => { navigate(routes.auth.login); });
                }}
              >
                {t("auth.actions.login")}
              </NavLink>
              <NavLink to={routes.auth.register} className="btn btn-outline">
                {t("auth.actions.register")}
              </NavLink>
            </>
          )}
        </div>

      </div>
    </header>
  );
}

/*
 * ── NOTE PER L'AGENTE TRADUZIONI ─────────────────────────────────────────────
 *
 * Chiavi NUOVE da aggiungere al namespace "components/common/header":
 *
 *   nav.participate        → "Partecipa"       (IT) / "Get involved"   (EN)
 *   nav.events             → "Eventi"           (IT) / "Events"         (EN)
 *   nav.title.adminEvents  → "Gestione eventi"  (IT) / "Manage events"  (EN)
 *   auth.admin.events      → "Gestione eventi"  (IT) / "Manage events"  (EN)
 *   auth.admin.learningPaths → "Gestione corsi" (IT) / "Manage courses" (EN)
 *
 * Chiavi MODIFICATE (solo label visiva, chiave invariata):
 *   nav.challenges  — il dropdown ora si chiama "Partecipa" ma la chiave
 *                     nav.challenges resta per le voci interne se necessario.
 *
 * Le chiavi con fallback hardcodato (secondo parametro di t()) funzionano
 * già senza aggiornare i file di traduzione — l'aggiornamento è comunque
 * necessario per coerenza e per la versione EN.
 * ─────────────────────────────────────────────────────────────────────────── */
