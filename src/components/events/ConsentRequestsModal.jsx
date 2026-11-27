// src/components/events/ConsentRequestsModal.jsx
/**
 * ConsentRequestsModal.jsx
 * ------------------------
 * Domanda del consenso alla condivisione dei contatti con l'ente organizzatore
 * (8a, passo 5; organizzatore-8a.md, scelta 6 e decisioni A-F del 26/11/2026).
 *
 * QUANDO: all'apertura del modulo di partecipazione, prima della compilazione,
 * se la sfida appartiene a eventi in corso con un ente a cui la persona non ha
 * ancora risposto. Una casella per evento (gli eventi arrivano dal BE).
 *
 * REGOLE:
 * - Il testo accanto alla casella è QUELLO del server, parola per parola: il
 *   client manda solo «sì» o «no» e il server salva il suo testo (decisione B).
 * - Non blocca mai la partecipazione: il pulsante registra sì per le caselle
 *   spuntate e no per le altre; anche se il salvataggio fallisce si continua.
 * - Il pulsante dice cosa succede (prova a schermo del 27/11/2026: con la casella
 *   vuota «Conferma e continua» è stato letto come un consenso). Casella vuota:
 *   «Continua senza condividere i contatti»; tutte spuntate: «Acconsento e
 *   continua»; con più eventi e scelte miste: «Conferma le scelte e continua».
 * - Chiudere senza confermare non registra nulla: la domanda torna la prossima volta.
 *
 * PROPS:
 *   items   {Array}    - [{ event_id, event_name, organization: { name }, text }]
 *   onDone  {Function} - chiamata a fine domanda (confermata, saltata o chiusa)
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/UI/Modal";
import { answerEventConsent } from "@/api/events.api";

export default function ConsentRequestsModal({ items, onDone }) {
  const { t } = useTranslation("pages/challengeSubmit", { useSuspense: false });
  const [scelte, setScelte] = useState({}); // { [event_id]: true }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const spuntate = items.filter((it) => scelte[it.event_id]).length;
  const etichetta = spuntate === 0
    ? t("consent.continueWithout")
    : spuntate === items.length
      ? t("consent.acceptAndContinue")
      : t("consent.confirmMixed");

  async function conferma() {
    setBusy(true);
    setError("");
    const esiti = await Promise.allSettled(
      // Con la lingua in cui il testo è stato caricato: si salva quello mostrato.
      items.map((it) => answerEventConsent(it.event_id, scelte[it.event_id] ? "yes" : "no", it.lang))
    );
    setBusy(false);
    if (esiti.some((e) => e.status === "rejected")) {
      // Non si blocca la partecipazione: si avvisa e si lascia proseguire.
      setError(t("consent.saveError"));
      return;
    }
    onDone?.();
  }

  return (
    <Modal title={t("consent.title")} onClose={() => onDone?.()}>
      <p className="muted" style={{ lineHeight: 1.5, margin: 0 }}>
        {t("consent.intro")}
      </p>

      {items.map((it) => {
        const spuntata = !!scelte[it.event_id];
        return (
          <label
            key={it.event_id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              cursor: "pointer",
              padding: 14,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: spuntata ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <input
              type="checkbox"
              checked={spuntata}
              onChange={(e) => setScelte((s) => ({ ...s, [it.event_id]: e.target.checked }))}
              style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18, cursor: "pointer" }}
            />
            <span style={{ color: "#ffffff", fontSize: "0.95rem", lineHeight: 1.5 }}>{it.text}</span>
          </label>
        );
      })}

      <p className="muted small" style={{ margin: 0 }}>
        {t("consent.optional")}{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="link-accent">
          {t("consent.privacy")}
        </a>
      </p>

      {error && (
        <div className="card-info error" role="alert">
          {error}
        </div>
      )}

      <div className="dynamic-actions" style={{ marginTop: 4 }}>
        {error ? (
          <button className="btn btn-primary" onClick={() => onDone?.()} style={{ flex: 1 }}>
            {t("consent.continueAnyway")}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={conferma} disabled={busy} aria-busy={busy} style={{ flex: 1 }}>
            {busy ? t("consent.saving") : etichetta}
          </button>
        )}
      </div>
    </Modal>
  );
}
