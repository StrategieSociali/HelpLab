import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { routes } from "@/routes";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <header className="site-header">
      <div className="container header-inner">
        {/* Brand */}
        <Link to={routes.home} className="brand" onClick={close}>
          <span className="brand-text">HelpLab</span>
          <span className="claim">Humanity Empowered for Local Progress</span>
        </Link>

        {/* Burger mobile */}
        <button
          className="burger"
          aria-label="Apri menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

        {/* Nav principale */}
        <nav className={"main-nav" + (open ? " open" : "")} role="navigation">
          <NavLink to={routes.home} end className={navClass} onClick={close}>
            Home
          </NavLink>

          <NavLink
            to={routes.dashboard.challenges}
            end
            className={navClass}
            onClick={close}
          >
            Sfide
          </NavLink>

          <NavLink
            to={routes.dashboard.learningPaths}
            end
            className={navClass}
            onClick={close}
          >
            Corsi
          </NavLink>

          <NavLink
            to={routes.joinHelpLab}
            end
            className={navClass}
            onClick={close}
          >
            Community
          </NavLink>
        </nav>

        {/* Azioni a destra */}
        <div className="auth-actions" style={{ display: "flex", gap: 8 }}>
          {isAuthenticated ? (
            <>
              {/* CTA: Crea sfida */}
              <NavLink
                to={routes.dashboard.createChallenge}
                className="btn btn-outline btn-pill btn-cta-header"
                onClick={close}
              >
                Crea sfida
              </NavLink>

              {/* Profilo */}
              <NavLink
                to={routes.dashboard.userProfile}
                className="btn btn-outline btn-pill btn-cta-header"
                onClick={close}
              >
                Profilo
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to={routes.auth.login}
                className="btn btn-pill"
                onClick={close}
              >
                Accedi
              </NavLink>
              <NavLink
                to={routes.auth.register}
                className="btn btn-outline btn-pill"
                onClick={close}
              >
                Registrati
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

