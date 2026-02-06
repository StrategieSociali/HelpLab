// src/pages/me/MyContributions.jsx

/**
 * RC 1.0
 * Scopo: mostrare all’utente TUTTI i propri contributi
 * come azioni personali svolte all’interno delle challenge.
 *
 * Fonte dati: GET /api/v1/dashboard
 */

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TextBlock from "@/components/UI/TextBlock";
import { api, API_PATHS } from "@/api/client";

/* ======================
   Helpers
====================== */

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("it-IT");
}

const STATUS_LABEL = {
  pending: "Contributo in attesa di verifica",
  approved: "Contributo approvato",
  rejected: "Contributo non approvato",
};

const STATUS_CLASS = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-error",
};

/* ======================
   Main Component
====================== */

export default function MyContributions() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  const params = new URLSearchParams(search);
  const challengeFilter = params.get("challenge");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---- Fetch ---- */
  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      try {
        const { data } = await api.get(API_PATHS.dashboard());
        setItems(Array.isArray(data?.submissions) ? data.submissions : []);
      } catch (err) {
        console.error(err);
        setError("Errore nel caricamento dei contributi.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  /* ---- Filter ---- */
  const visibleItems = useMemo(() => {
    if (!challengeFilter) return items;
    return items.filter(
      (i) => String(i.challengeId) === String(challengeFilter)
    );
  }, [items, challengeFilter]);

  /* ---- States ---- */
  if (loading) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <TextBlock>Caricamento dei tuoi contributi…</TextBlock>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <div className="callout error">{error}</div>
        </div>
      </section>
    );
  }

  /* ---- Render ---- */
  return (
    <section className="page-section page-text">
      <div className="container">

        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">I miei contributi</h1>
          <p className="page-subtitle">
            Qui trovi tutte le azioni che hai svolto e il loro stato di validazione.
          </p>

          {challengeFilter && (
            <div className="callout info">
              Stai visualizzando i contributi relativi alla challenge #{challengeFilter}.
            </div>
          )}
        </header>

        {/* Empty */}
        {visibleItems.length === 0 ? (
          <TextBlock>
            Non hai ancora contributi.
            <br />
            Partecipa a una sfida per iniziare.
          </TextBlock>
        ) : (
          <div className="grid grid-3 gap-4">
            {visibleItems.map((c) => (
              <div key={c.id} className="card">

                {/* Card header */}
                <div className="card-header">
                  <div className="flex-between">
                    <h3 className="card-title">
                      Challenge #{c.challengeId}
                    </h3>
                    <span
                      className={`badge ${STATUS_CLASS[c.status]}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="card-body">
                  <div className="muted small mb-1">
                    Attività svolta
                  </div>

                  <p className="mb-3">
                    {c.activity || "—"}
                  </p>

                  <div className="meta-list">
                    <div>
                      <span className="meta-label">Inviato: </span>
                      <span className="meta-value">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>

                    {c.reviewedAt && (
                      <div>
                        <span className="meta-label">Verificato</span>
                        <span className="meta-value">
                          {formatDate(c.reviewedAt)}
                        </span>
                      </div>
                    )}

                    {typeof c.points === "number" && (
                      <div>
                        <span className="meta-label">Punti</span>
                        <span className="meta-value">
                          {c.points}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="card-footer">
                  <button
                    className="btn btn-primary w-full"
                    onClick={() =>
                      navigate(`/challenges/${c.challengeId}/submit`)
                    }
                  >
                    Contribuisci alla sfida
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
