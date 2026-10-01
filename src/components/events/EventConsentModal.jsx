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
 * STRUTTURA: costruita sul componente condiviso components/UI/Modal.jsx (estratto da
 * qui il 1/10/2026), che porta sfondo, card, titolo, focus trattenuto, ESC e clic fuori.
 *
 * UX NOTE:
 * Il modal NON blocca la partecipazione — l'utente può sempre
 * cliccare "Continua senza condividere i dati" e procedere.
 * Questo riduce l'attrito per i 200 volontari della biciclettata.
 */

import React, { useState } from "react";
import Modal from "@/components/UI/Modal";
import { EVENT_CONSENT } from "@/config/eventConsent";
import { acceptEventConsent } from "@/api/events.api";

export default function EventConsentModal({ eventId, eventName, onSuccess, onClose }) {
  const [checked, setChecked]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");

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
    <Modal title={`Partecipa a ${eventName}`} onClose={onClose}>
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
    </Modal>
  );
}
