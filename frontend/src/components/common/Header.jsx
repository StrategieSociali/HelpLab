// src/component/common/header.jsx
/**
 * Scopo: strutturare l'header del sito
 *
 * Attualmente supporta:
 * - Logo
 * - Menu utente non registrato
 * - Menu utente registrato
 * - Menu admin
 * - Tasto login/registrati/logout
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

// gestione menu impilati
  const [sfideOpen, setSfideOpen] = useState(false);
  const isAdminUser = isAdmin(user?.role);
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const [communityOpen, setCommunityOpen] = useState(false);
  
// gestione transitions per Accedi  
    const navigate = useNavigate();


useEffect(() => {
  const checkMobile = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setMenuOpen(false); // Forza chiusura al primo render
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
      
        {/* Brand */}
        <Link to={routes.home} className="brand-link">
          <strong>{t("brand.title")}</strong>
          <span className="muted small">{t("brand.subtitle")}</span>
          
          {/* Language switch */}
          
  <span className="muted small language-switch">
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        i18n.changeLanguage("it");
      }}
      aria-label="Italiano"
      className="lang-btn"
    >
      🇮🇹
    </button>

    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        i18n.changeLanguage("en");
      }}
      aria-label="English"
      className="lang-btn"
    >
      🇬🇧
    </button>
  </span>
</Link>

        {/* Burger icon per mobile */}
        <button
          className={`burger ${menuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Nav principale */}
        <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="Primary">
        <div
  className={`sfide-menu ${sfideOpen ? "open" : ""}`}
  onMouseEnter={() => {
    if (!isMobile) setSfideOpen(true);
  }}
  onMouseLeave={() => {
    if (!isMobile) setSfideOpen(false);
  }}
>

  <span className="nav-link">{t("nav.challenges")} ▾</span>
  <div className="sfide-menu__list">
    <NavLink
      to={routes.dashboard.challenges}
      className="btn"
      onClick={(e) => {
  e.preventDefault();
  setMenuOpen(false);
  setSfideOpen(false);
  startTransition(() => {
    navigate(routes.dashboard.challenges);
  });
}}
    >
      {t("nav.allChallenges")}
    </NavLink>
    <NavLink
      to={routes.leaderboard}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setSfideOpen(false);
      }}
    >
       {t("nav.leaderboard")}
    </NavLink>
  </div>
</div>

          <NavLink to={routes.dashboard.learningPaths} className="nav-link" onClick={() => setMenuOpen(false)}>{t("nav.learningPaths")}</NavLink>
          
{/* COMMUNITY + sotto menu */}
<div
  className={`sfide-menu ${communityOpen ? "open" : ""}`}
  onMouseEnter={() => {
    if (!isMobile) setCommunityOpen(true);
  }}
  onMouseLeave={() => {
    if (!isMobile) setCommunityOpen(false);
  }}
>
  <span className="nav-link">{t("nav.community")} ▾</span>
  <div className="sfide-menu__list">
    <NavLink
      to={routes.joinHelpLab}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setCommunityOpen(false);
      }}
    >
      {t("nav.join")}
    </NavLink>
    <NavLink
      to={routes.info}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setCommunityOpen(false);
      }}
    >
      {t("nav.info")}
    </NavLink>
   <NavLink
  to={routes.community.sponsors}
  className="btn"
  onClick={() => {
    setMenuOpen(false);
    setCommunityOpen(false);
  }}
>
  {t("nav.sponsors")}
</NavLink>
  </div>
</div>

          {/* Menu business */}
          <NavLink to={routes.business.packages} className="nav-link" onClick={() => setMenuOpen(false)}>{t("nav.business")}</NavLink>
          <NavLink to={routes.roadmap} className="nav-link" onClick={() => setMenuOpen(false)}>{t("nav.roadmap")}</NavLink>
          
          {/* Menu giudice */}
        {user?.role === "judge" && (
         <NavLink
           to="/judge"
           className="nav-link"
           onClick={() => setMenuOpen(false)}
             >
         {t("nav.judge")}
        </NavLink>
        )}

          {/* Azioni auth all'interno del menu mobile */}
          <div className="nav-auth-actions">
            {isAuthenticated ? (
              <>
                {isAdminUser && (
                  <details className="admin-menu">
                    <summary className="btn btn-ghost btn-pill">{t("nav.title.admin")}</summary>
                    <div className="admin-menu__list">
                      <NavLink to={routes.admin.proposals} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>{t("nav.title.proposals")}</NavLink>
                      <NavLink to={routes.admin.assignJudge} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>{t("nav.title.assignJudges")}</NavLink>
                    </div>
                  </details>
                )}
                <NavLink to={routes.dashboard.challengeCreate} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>{t("nav.createChallenge")}</NavLink>
                <NavLink to={routes.dashboard.userProfile} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>{t("nav.profile")}</NavLink>
               <LogoutButton onAfterLogout={() => setMenuOpen(false)} />

              </>
            ) : (
              <>
                <NavLink 
                 to={routes.auth.login}
                  className="btn btn-ghost btn-pill" 
                  onClick={(e) => {
                   e.preventDefault();
                   setMenuOpen(false);
                   startTransition(() => {
                   navigate(routes.auth.login);
                   });
                  }}
                 >{t("nav.login")}</NavLink>
                <NavLink to={routes.auth.register} className="btn btn-outline btn-pill" onClick={() => setMenuOpen(false)}>{t("nav.register")}</NavLink>
              </>
            )}
          </div>
        </nav>

      {/* Auth actions visibili solo su desktop */}
      <div className="nav-auth-actions desktop-only">
       {isAuthenticated ? (
  <>
    {isAdminUser && (
      <details className="admin-menu">
        <summary className="btn btn-ghost btn-pill">
          {t("auth.admin.label")}
        </summary>

        <div className="admin-menu__list">
          <NavLink
            to={routes.admin.proposals}
            className="btn btn-ghost btn-pill"
          >
            {t("auth.admin.proposals")}
          </NavLink>

          <NavLink
            to={routes.admin.assignJudge}
            className="btn btn-ghost btn-pill"
          >
            {t("auth.admin.assignJudges")}
          </NavLink>
        </div>
      </details>
    )}

    <NavLink
      to={routes.dashboard.challengeCreate}
      className="btn btn-ghost btn-pill"
    >
      {t("auth.actions.createChallenge")}
    </NavLink>

    <NavLink
      to={routes.dashboard.userProfile}
      className="btn btn-ghost btn-pill"
    >
      {t("auth.actions.profile")}
    </NavLink>

<LogoutButton />

  </>
) : (
  <>
    <NavLink
      to={routes.auth.login}
      className="btn btn-ghost btn-pill"
      onClick={(e) => {
        e.preventDefault(); // ⛔ blocca NavLink
        startTransition(() => {
          navigate(routes.auth.login);
        });
      }}
    >
      {t("auth.actions.login")}
    </NavLink>

    <NavLink
      to={routes.auth.register}
      className="btn btn-outline btn-pill"
    >
      {t("auth.actions.register")}
    </NavLink>
  </>
)}

      </div>
        </div>
    </header>
  );
}

