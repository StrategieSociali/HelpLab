// src/components/judge/OffersPanel.jsx
/**
 * OffersPanel.jsx
 * ---------------
 * Coda offerte round-robin Fase 2 (push, multi-giudice §4.2).
 *
 * SCOPO
 * Il sistema, quando una sfida/evento resta scoperto oltre la finestra, assegna
 * d'ufficio a rotazione tra i giudici DISPONIBILI. Qui il giudice vede le offerte
 * ricevute e le accetta (→ diventa giudice) o le rifiuta (→ penalità §6, 0 per
 * agosto, e rotazione al successivo). Le offerte scadono da sole (finestra).
 *
 * DATI
 * - GET  /api/v1/judge/offers               → { responseWindowHours, offers }
 * - POST /api/v1/judge/offers/:id/accept     → grant (409 scaduta/partecipante/tetto)
 * - POST /api/v1/judge/offers/:id/decline    → penalità + rotazione
 *
 * NOTA UX
 * - Le offerte sono notifiche TRANSITORIE, non una lista permanente: a coda vuota
 *   il pannello si nasconde (niente clutter). Loading iniziale = nascosto; errore
 *   e presenza di offerte = visibili.
 * - Su 409 (scaduta / tetto pieno nel frattempo) → messaggio + refresh.
 * - `onChange`: callback opzionale chiamata dopo accept/decline, per far ricaricare
 *   alla dashboard la lista delle sue sfide (l'accettata compare tra quelle).
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getJudgeOffers,
  acceptJudgeOffer,
  declineJudgeOffer,
} from "@/api/judge.api";

// Etichetta "scade tra ~Xh" a partire da expiresAt ISO.
function expiryLabel(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "in scadenza";
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `scade tra ~${Math.floor(h / 24)} g`;
  if (h >= 1) return `scade tra ~${h} h`;
  return `scade tra ~${Math.max(1, Math.floor(ms / 60000))} min`;
}

export default function OffersPanel({ onChange }) {
  const { token } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowState, setRowState] = useState({}); // { [offerId]: { busy, err } }

  const load = async () => {
    if (!token) return;
    setError("");
    try {
      const res = await getJudgeOffers(token);
      setOffers(res.offers || []);
    } catch (e) {
      setError("Impossibile caricare le offerte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setRow = (id, patch) =>
    setRowState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const respond = async (offer, action) => {
    setRow(offer.id, { busy: true, err: "" });
    try {
      if (action === "accept") await acceptJudgeOffer(token, offer.id);
      else await declineJudgeOffer(token, offer.id);
      await load();
      onChange?.();
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.response?.data?.error;
      if (status === 409 || status === 404) {
        setRow(offer.id, { busy: false, err: msg || "Offerta non più valida. Aggiorno…" });
        await load();
      } else {
        setRow(offer.id, { busy: false, err: msg || "Operazione non riuscita. Riprova." });
      }
    }
  };

  // Notifiche transitorie: a vuoto/loading iniziale il pannello non si mostra.
  if (loading) return null;
  if (!error && offers.length === 0) return null;

  return (
    <div
      className="card"
      style={{
        padding: 16,
        marginBottom: 20,
        border: "1px solid rgba(210,153,34,0.4)",
      }}
    >
      <h2 className="dynamic-title" style={{ margin: 0 }}>
        Offerte per te
      </h2>
      <p className="muted small" style={{ marginTop: 6 }}>
        Sfide o eventi scoperti assegnati a te a rotazione. Accetta per diventarne
        giudice, oppure rifiuta e passa al prossimo.
      </p>

      {error && (
        <div
          className="callout error"
          style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
        >
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={load}>
            Riprova
          </button>
        </div>
      )}

      {!error && (
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {offers.map((o) => {
            const rs = rowState[o.id] || {};
            const exp = expiryLabel(o.expiresAt);
            return (
              <div key={o.id} className="card-info neutral">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{o.title || `#${o.challengeId ?? o.eventId}`}</strong>
                    <div className="muted small">
                      {o.kind === "event" ? "Evento" : "Sfida"}
                      {exp ? ` · ${exp}` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-primary"
                    disabled={rs.busy}
                    onClick={() => respond(o, "accept")}
                  >
                    {rs.busy ? "…" : "Accetta"}
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={rs.busy}
                    onClick={() => respond(o, "decline")}
                  >
                    {rs.busy ? "…" : "Rifiuta"}
                  </button>
                </div>

                {rs.err && (
                  <div className="callout error" style={{ marginTop: 8 }}>{rs.err}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
