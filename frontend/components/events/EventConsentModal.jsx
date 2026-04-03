// src/components/events/EventConsentModal.jsx
/**
 * EventConsentModal.jsx
 * ---------------------
 * Modal GDPR per la partecipazione a un evento.
 * Appare quando un utente autenticato clicca "Partecipa" su un evento.
 *
 * COMPORTAMENTO:
 * - Il consenso alla condivisione dati è FACOLTATIVO
 * - L'utente può partecipare all'evento anche senza condividere i dati
 * - Se accetta, il testo verbatim viene inviato a POST /events/:id/consent
 * - Il testo è importato da config/eventConsent.js — mai hardcodato qui
 *
 * PROPS:
 *   eventId    {number}   - ID numerico dell'evento (per la chiamata API)
 *   eventName  {string}   - Nome dell'evento (per il titolo del modal)
 *   onSuccess  {Function} - Callback dopo conferma (con o senza consenso)
 *   onClose    {Function} - Callback per chiudere senza fare nulla
 *
 * ACCESSIBILITÀ:
 * - role="dialog" + aria-modal + aria-labelledby
 * - Focus trap: primo elemento focusabile riceve focus all'apertura
 * - ESC chiude il modal
 * - Overlay click chiude il modal
 *
 * UX NOTE:
 * Il modal NON blocca la partecipazione — l'utente può sempre
 * cliccare "Continua senza condividere i dati" e procedere.
 * Questo riduce l'attrito per i 200 volontari della biciclettata.
 */

import React, { useEffect, useRef, useState } from "react";
import { EVENT_CONSENT } from "@/config/eventConsent";
import { acceptEventConsent } from "@/api/events.api";

export default function EventConsentModal({ eventId, eventName, onSuccess, onClose }) {
  const [checked, setChecked]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");

  // Focus trap: porta il focus sul titolo del modal all'apertura
  const titleRef = useRef(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Chiudi con ESC
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Conferma con consenso ─────────────────────────────────────────────────
  async function handleConfirmWithConsent() {
    setBusy(true);
    setError("");
    try {
      // Il testo inviato al BE deve essere ESATTAMENTE quello mostrato all'utente
      await acceptEventConsent(eventId, EVENT_CONSENT.sharing.text);
      onSuccess?.({ consentGiven: true });
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        "Errore durante la registrazione del consenso. Riprova."
      );
      setBusy(false);
    }
  }

  // ── Continua senza consenso ───────────────────────────────────────────────
  function handleConfirmWithout() {
    onSuccess?.({ consentGiven: false });
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          className="card glass"
          style={{
            pointerEvents: "all",
            width: "100%",
            maxWidth: 480,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
          // Impedisce che il click sul modal chiuda l'overlay
          onClick={(e) => e.stopPropagation()}
        >
          {/* Titolo */}
          <h2
            id="consent-modal-title"
            className="dynamic-title"
            ref={titleRef}
            tabIndex={-1}
            style={{ outline: "none", marginBottom: 0 }}
          >
            Partecipa a {eventName}
          </h2>

          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Prima di continuare, leggi l'informativa sulla privacy e scegli
            se condividere i tuoi dati con l'organizzatore dell'evento.
          </p>

          {/* Consenso condivisione dati (facoltativo) */}
          <label
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              cursor: "pointer",
              padding: "14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: checked
                ? "1px solid rgba(16,185,129,0.5)"
                : "1px solid rgba(255,255,255,0.15)",
              transition: "border-color 0.2s",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18, cursor: "pointer" }}
              aria-describedby="consent-description"
            />
            <div>
              <span style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: 500 }}>
                {EVENT_CONSENT.sharing.label}
              </span>
              <p
                id="consent-description"
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.85rem",
                  marginTop: 4,
                  marginBottom: 0,
                }}
              >
                {EVENT_CONSENT.sharing.description}
              </p>
            </div>
          </label>

          {/* Link privacy */}
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
            Partecipando accetti i{" "}
            <a
              href={EVENT_CONSENT.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}
            >
              Termini di Servizio e la Privacy Policy
            </a>
            .
          </p>

          {/* Errore */}
          {error && (
            <div className="card-info error" role="alert">
              {error}
            </div>
          )}

          {/* Azioni */}
          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            {checked ? (
              <button
                className="btn btn-primary"
                onClick={handleConfirmWithConsent}
                disabled={busy}
                aria-busy={busy}
                style={{ flex: 1 }}
              >
                {busy ? "Conferma in corso…" : "Conferma e partecipa"}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleConfirmWithout}
                disabled={busy}
                style={{ flex: 1 }}
              >
                Continua senza condividere i dati
              </button>
            )}

            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={busy}
              aria-label="Annulla e chiudi"
            >
              Annulla
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
