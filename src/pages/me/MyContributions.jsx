// src/pages/me/MyContributions.jsx

/**
 * v1.1 — Aggiornato per backend v0.8.2
 *
 * Scopo: mostrare all'utente TUTTI i propri contributi (submission)
 * con evidenze, task associato e stato di validazione.
 *
 * Fonte dati: GET /api/v1/user/submissions (paginato, cursor-based)
 * Migrato da: GET /api/v1/auth/dashboard (non include payload/evidenze)
 *
 * Novità rispetto a RC 1.0:
 * - Endpoint /user/submissions con paginazione cursor-based
 * - Visualizzazione miniature evidenze con fallback a link
 * - Campi taskTitle e challenge_title dalla response API
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TextBlock from "@/components/UI/TextBlock";
import { api, API_PATHS } from "@/api/client";
import "../../styles/dynamic-pages.css";

/* ======================
   Helpers
====================== */

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("it-IT");
}

const STATUS_LABEL = {
  pending: "In attesa di verifica",
  approved: "Approvato",
  rejected: "Non approvato",
};

const STATUS_CLASS = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-error",
};

/**
 * Verifica se un URL punta probabilmente a un'immagine
 * controllando l'estensione o pattern noti (Google Drive thumbnail, ecc.)
 */
function isLikelyImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  // Estensioni immagine comuni
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/.test(lower)) return true;
  // Google Drive — export view (convertibile in thumbnail)
  if (lower.includes("drive.google.com") && lower.includes("/file/")) return true;
  return false;
}

/**
 * Converte un link Google Drive in URL thumbnail diretto.
 * Pattern: https://drive.google.com/file/d/FILE_ID/... → thumbnail URL
 */
function toDirectImageUrl(url) {
  if (!url || typeof url !== "string") return url;

  // Google Drive file link → thumbnail
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w300`;
  }

  return url;
}

/* ======================
   Componente EvidenceItem
   Miniatura + link testuale sotto
====================== */

function EvidenceItem({ url, index }) {
  const [imgError, setImgError] = useState(false);
  const isImage = isLikelyImageUrl(url);
  const directUrl = isImage ? toDirectImageUrl(url) : null;

  return (
    <div className="evidence-item" style={{ marginBottom: 8 }}>
      {/* Miniatura (solo se sembra un'immagine e non ha dato errore) */}
      {isImage && !imgError && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={directUrl}
            alt={`Evidenza ${index + 1}`}
            onError={() => setImgError(true)}
            loading="lazy"
            style={{
              maxWidth: 160,
              maxHeight: 120,
              borderRadius: 6,
              objectFit: "cover",
              display: "block",
              marginBottom: 4,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </a>
      )}

      {/* Link testuale (sempre visibile) */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="muted small"
        style={{
          wordBreak: "break-all",
          display: "block",
          lineHeight: 1.3,
        }}
        title={url}
      >
        {url.length > 60 ? url.slice(0, 57) + "…" : url}
      </a>
    </div>
  );
}

/* ======================
   Componente EvidenceList
   Renderizza tutte le evidenze di una submission
====================== */

function EvidenceList({ payload }) {
  const evidences = payload?.evidences;
  if (!Array.isArray(evidences) || evidences.length === 0) return null;

  // Filtra stringhe vuote
  const validEvidences = evidences.filter((e) => typeof e === "string" && e.trim());
  if (validEvidences.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div className="muted small mb-1">Evidenze</div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {validEvidences.map((url, i) => (
          <EvidenceItem key={i} url={url} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ======================
   Main Component
====================== */

const PAGE_SIZE = 20;

export default function MyContributions() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  const params = new URLSearchParams(search);
  const challengeFilter = params.get("challenge");

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  /* ---- Fetch con paginazione cursor-based ---- */
  const fetchSubmissions = useCallback(
    async ({ append = false } = {}) => {
      if (!token) return;

      append ? setLoadingMore(true) : setLoading(true);
      setError("");

      try {
        const q = new URLSearchParams();
        q.set("limit", String(PAGE_SIZE));
        if (append && cursor) q.set("cursor", cursor);

        const { data } = await api.get(API_PATHS.userSubmissions(`?${q.toString()}`));
        const list = Array.isArray(data?.items) ? data.items : [];

        setItems((prev) => (append ? [...prev, ...list] : list));
        setCursor(data?.nextCursor ?? null);
      } catch (err) {
        console.error("MyContributions fetch error:", err);
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Errore nel caricamento dei contributi.";
        setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, cursor]
  );

  /* ---- Caricamento iniziale ---- */
  useEffect(() => {
    fetchSubmissions({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ---- Filtro per challenge (da query string) ---- */
  const visibleItems = useMemo(() => {
    if (!challengeFilter) return items;
    return items.filter(
      (i) =>
        String(i.challenge_id) === String(challengeFilter) ||
        String(i.challengeId) === String(challengeFilter)
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
            Qui trovi tutte le azioni che hai svolto e il loro stato di
            validazione.
          </p>

          {challengeFilter && (
            <div className="callout info">
              Stai visualizzando i contributi relativi alla challenge #
              {challengeFilter}.
            </div>
          )}
        </header>

        {/* Empty state */}
        {visibleItems.length === 0 ? (
          <TextBlock>
            Non hai ancora contributi.
            <br />
            Partecipa a una sfida per iniziare.
          </TextBlock>
        ) : (
          <div className="grid grid-3 gap-4">
            {visibleItems.map((c) => {
              const challengeId = c.challenge_id ?? c.challengeId;
              const challengeTitle =
                c.challenge_title || `Challenge #${challengeId}`;

              return (
                <div key={c.id} className="card">
                  {/* Card header */}
                  <div className="card-header">
                    <div className="flex-between">
                      <h3 className="card-title">{challengeTitle}</h3>
                      <span className={`badge ${STATUS_CLASS[c.status]}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>

                    {/* Task associato */}
                    {c.taskTitle && (
                      <div
                        className="muted small"
                        style={{ marginTop: 4 }}
                      >
                        Task: <strong>{c.taskTitle}</strong>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="card-body">
                    <div className="muted small mb-1">Attività svolta</div>
                    <p className="mb-3">{c.activity || "—"}</p>

                    {/* Evidenze con miniature */}
                    <EvidenceList payload={c.payload} />

                    {/* Metadati */}
                    <div className="meta-list" style={{ marginTop: 10 }}>
                      <div>
                        <span className="meta-label">Inviato: </span>
                        <span className="meta-value">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>

                      {c.reviewedAt && (
                        <div>
                          <span className="meta-label">Verificato: </span>
                          <span className="meta-value">
                            {formatDate(c.reviewedAt)}
                          </span>
                        </div>
                      )}

                      {typeof c.points === "number" && (
                        <div>
                          <span className="meta-label">Punti: </span>
                          <span className="meta-value">{c.points}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="card-footer">
                    <button
                      className="btn btn-primary w-full"
                      onClick={() =>
                        navigate(`/challenges/${challengeId}/submit`)
                      }
                    >
                      Contribuisci alla sfida
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginazione */}
        {cursor && !loading && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              className="btn btn-outline"
              onClick={() => fetchSubmissions({ append: true })}
              disabled={loadingMore}
            >
              {loadingMore ? "Caricamento…" : "Carica altri"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
