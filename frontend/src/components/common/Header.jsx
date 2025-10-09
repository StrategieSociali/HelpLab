// src/components/common/Header.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/routes";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isJudge = user?.role === "judge"; // (se ti serve più avanti)

  return (
    <header className="site-header">
      <div className="container header-row">
        {/* Brand */}
        <Link to={routes.home} className="brand-link">
          <strong>HelpLab</strong>
          <span className="muted small">Humanity Empowered for Local Progress</span>
        </Link>

        {/* Nav principale */}
        <nav className="main-nav" aria-label="Primary">
          <NavLink to={routes.dashboard.challenges} className="nav-link">
            Sfide
          </NavLink>
          <NavLink to={routes.dashboard.learningPaths} className="nav-link">
            Corsi
          </NavLink>
          <NavLink to={routes.joinHelpLab} className="nav-link">
            Community
          </NavLink>
          {/* “Imprese” -> pacchetti business */}
          <NavLink to={routes.business.packages} className="nav-link">
  Imprese
</NavLink>

        </nav>

        {/* Azioni auth */}
        <div className="auth-actions">
          {isAuthenticated ? (
            <>
              {/* Menù Admin compatto */}
              {isAdmin && (
                <details className="admin-menu">
                  <summary className="btn btn-ghost btn-pill">Admin</summary>
                  <div className="admin-menu__list">
                    <NavLink
                      to={routes.admin.proposals}
                      className="btn btn-ghost btn-pill"
                      onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
                    >
                      Gestione Proposte
                    </NavLink>
                    <NavLink
                      to={routes.admin.assignJudge}
                      className="btn btn-ghost btn-pill"
                      onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
                    >
                      Assegna Giudici
                    </NavLink>
                  </div>
                </details>
              )}

              <NavLink to={routes.dashboard.challengeCreate} className="btn btn-ghost btn-pill">
                Crea Sfida
              </NavLink>
              <NavLink to={routes.dashboard.userProfile} className="btn btn-ghost btn-pill">
                Profilo
              </NavLink>
              <button type="button" className="btn btn-outline btn-pill" onClick={logout}>
                Esci
              </button>
            </>
          ) : (
            <>
              <NavLink to={routes.auth.login} className="btn btn-ghost btn-pill">
                Accedi
              </NavLink>
              <NavLink to={routes.auth.register} className="btn btn-outline btn-pill">
                Registrati
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

