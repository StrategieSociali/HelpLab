import React, { useState, useContext } from "react";
import { NavLink, Link } from "react-router-dom";
import { routes } from "@/routes";
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to={routes.home} className="brand" onClick={close}>
          <span className="brand-text">HelpLab</span>
          <span className="claim">Humanity Empowered for Local Progress</span>
        </Link>

        <button
          className="burger"
          aria-label="Apri menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

        <nav className={"main-nav" + (open ? " open" : "")} role="navigation">
          <NavLink to={routes.home} end className={navClass} onClick={close}>
            Home
          </NavLink>
          <NavLink to={routes.dashboard.challenges} end className={navClass} onClick={close}>
            Sfide
          </NavLink>
          <NavLink to={routes.dashboard.learningPaths} end className={navClass} onClick={close}>
            Corsi
          </NavLink>
          <NavLink to={routes.joinHelpLab} end className={navClass} onClick={close}>
            Community
          </NavLink>
        </nav>

     <div className="auth-actions">
  {isAuthenticated ? (
    <>
      <NavLink to={routes.dashboard.challengeCreate} className="btn" onClick={close}>
        Crea Sfida
      </NavLink>

      <NavLink to={routes.dashboard.userProfile} className="btn" onClick={close}>
        Profilo
      </NavLink>

      {/* Solo admin: Dashboard Admin */}
      {isAuthenticated && user?.role === "admin" && (
  <NavLink
    to={routes.admin.proposals}
    className="btn btn-outline"
    onClick={close}
  >
    Dashboard Admin
  </NavLink>
)}


      {/* Logout: vero bottone (non un link) */}
      <button
        type="button"
        className="btn"
        onClick={() => {
          logout();
          close?.();
        }}
      >
        Esci
      </button>
    </>
  ) : (
    <>
      <NavLink to={routes.auth.login} className="btn" onClick={close}>
        Accedi
      </NavLink>
      <NavLink to={routes.auth.register} className="btn btn-outline" onClick={close}>
        Registrati
      </NavLink>
    </>
  )}
</div>

      </div>
    </header>
  );
}

