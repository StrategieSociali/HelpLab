import React, { useState, useContext } from "react";
import { Link, NavLink } from "react-router-dom";
import { routes } from "@/routes";
import { AuthContext } from "@/context/AuthContext";

export default function Header() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to={routes.home} className="brand" onClick={close}>
          <span className="brand-text">HelpLab</span>
          {/* claim sotto il logo */}
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
          <NavLink to={routes.challenges} end className={navClass} onClick={close}>
            Sfide
          </NavLink>
          <NavLink to={routes.dashboard.learningPaths} end className={navClass} onClick={close}>
            Corsi
          </NavLink>
          <NavLink to={routes.joinHelpLab} end className={navClass} onClick={close}>
            Community
          </NavLink>
          {/* Da Implementare:
          <NavLink to={routes.ecommerce} end className={navClass} onClick={close}>
            Mercatino
          </NavLink>
          <NavLink to={routes.aziende} end className={navClass} onClick={close}>
            Per aziende
          </NavLink>
          <NavLink to={routes.Wallet} end className={navClass} onClick={close}>
            Wallet
          </NavLink>*/}
        </nav>

        <div className="auth-actions">
          {user ? (
            <NavLink to={routes.dashboard.userProfile} className="btn" onClick={close}>
              Profilo
            </NavLink>
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

