import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/routes";
import { isAdmin } from "@/utils/roles";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdminUser = isAdmin(user?.role);

  const toggleMenu = () => setMenuOpen(prev => !prev);

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
          <NavLink to={routes.dashboard.challenges} className="nav-link" onClick={() => setMenuOpen(false)}>Sfide</NavLink>
          <NavLink to={routes.dashboard.learningPaths} className="nav-link" onClick={() => setMenuOpen(false)}>Corsi</NavLink>
          <NavLink to={routes.joinHelpLab} className="nav-link" onClick={() => setMenuOpen(false)}>Community</NavLink>
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
      </div>
      
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
    </header>
  );
}
