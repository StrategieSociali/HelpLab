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
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/routes";
import { isAdmin } from "@/utils/roles";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  const [hasMounted, setHasMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

// gestione menu impilati
  const [sfideOpen, setSfideOpen] = useState(false);
  const isAdminUser = isAdmin(user?.role);
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const [communityOpen, setCommunityOpen] = useState(false);


// gestione mobile
  const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  checkMobile();
  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);


  useEffect(() => {
    setHasMounted(true);
  }, []);


  if (!hasMounted) return null;

  return (
    <header className="site-header">
      <div className="container header-row">
        {/* Brand */}
        <Link to={routes.home} className="brand-link">
          <strong>HelpLab</strong>
          <span className="muted small">Humanity Empowered for Local Progress</span>
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
    if (!isMobile) setTimeout(() => setSfideOpen(false), 400); // delay
  }}
  onClick={() => {
    if (isMobile) setSfideOpen((prev) => !prev);
  }}
>

  <span className="nav-link">Sfide ▾</span>
  <div className="sfide-menu__list">
    <NavLink
      to={routes.dashboard.challenges}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setSfideOpen(false);
      }}
    >
      Tutte le Sfide
    </NavLink>
    <NavLink
      to={routes.leaderboard}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setSfideOpen(false);
      }}
    >
      Classifiche
    </NavLink>
  </div>
</div>

          <NavLink to={routes.dashboard.learningPaths} className="nav-link" onClick={() => setMenuOpen(false)}>Corsi</NavLink>
          
{/* COMMUNITY + sotto menu */}
<div
  className={`sfide-menu ${communityOpen ? "open" : ""}`}
  onMouseEnter={() => {
    if (!isMobile) setCommunityOpen(true);
  }}
  onMouseLeave={() => {
    if (!isMobile) setTimeout(() => setCommunityOpen(false), 400);
  }}
  onClick={() => {
    if (isMobile) setCommunityOpen((prev) => !prev);
  }}
>
  <span className="nav-link">Community ▾</span>
  <div className="sfide-menu__list">
    <NavLink
      to={routes.joinHelpLab}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setCommunityOpen(false);
      }}
    >
      Unisciti a HelpLab
    </NavLink>
    <NavLink
      to={routes.info}
      className="btn"
      onClick={() => {
        setMenuOpen(false);
        setCommunityOpen(false);
      }}
    >
      Cosa puoi fare su HelpLab?
    </NavLink>
  </div>
</div>


          <NavLink to={routes.business.packages} className="nav-link" onClick={() => setMenuOpen(false)}>Imprese</NavLink>
          <NavLink to={routes.roadmap} className="nav-link" onClick={() => setMenuOpen(false)}>Roadmap</NavLink>

          {/* Azioni auth all'interno del menu mobile */}
          <div className="nav-auth-actions">
            {isAuthenticated ? (
              <>
                {isAdminUser && (
                  <details className="admin-menu">
                    <summary className="btn btn-ghost btn-pill">Admin</summary>
                    <div className="admin-menu__list">
                      <NavLink to={routes.admin.proposals} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>Gestione Proposte</NavLink>
                      <NavLink to={routes.admin.assignJudge} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>Assegna Giudici</NavLink>
                    </div>
                  </details>
                )}
                <NavLink to={routes.dashboard.challengeCreate} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>Crea Sfida</NavLink>
                <NavLink to={routes.dashboard.userProfile} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>Profilo</NavLink>
                <button className="btn btn-outline btn-pill" onClick={() => { logout(); setMenuOpen(false); }}>Esci</button>
              </>
            ) : (
              <>
                <NavLink to={routes.auth.login} className="btn btn-ghost btn-pill" onClick={() => setMenuOpen(false)}>Accedi</NavLink>
                <NavLink to={routes.auth.register} className="btn btn-outline btn-pill" onClick={() => setMenuOpen(false)}>Registrati</NavLink>
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
                <summary className="btn btn-ghost btn-pill">Admin</summary>
                <div className="admin-menu__list">
                  <NavLink to={routes.admin.proposals} className="btn btn-ghost btn-pill">Gestione Proposte</NavLink>
                  <NavLink to={routes.admin.assignJudge} className="btn btn-ghost btn-pill">Assegna Giudici</NavLink>
                </div>
              </details>
            )}
            <NavLink to={routes.dashboard.challengeCreate} className="btn btn-ghost btn-pill">Crea Sfida</NavLink>
            <NavLink to={routes.dashboard.userProfile} className="btn btn-ghost btn-pill">Profilo</NavLink>
            <button className="btn btn-outline btn-pill" onClick={logout}>Esci</button>
          </>
        ) : (
          <>
            <NavLink to={routes.auth.login} className="btn btn-ghost btn-pill">Accedi</NavLink>
            <NavLink to={routes.auth.register} className="btn btn-outline btn-pill">Registrati</NavLink>
          </>
        )}
      </div>
        </div>
    </header>
  );
}

