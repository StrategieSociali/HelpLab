// src/pages/events/EditEvent.jsx
/**
 * EditEvent.jsx
 * -------------
 * Pagina di modifica evento. Accessibile a admin e al creatore dell'evento.
 *
 * ACCESSO:
 *   - Admin: può modificare qualsiasi evento in stato draft, published, rejected
 *   - Creatore: può modificare i propri eventi in stato draft, published, rejected
 *   - Nessuno può modificare eventi in stato ended
 *
 * COMPORTAMENTO SPECIALE su rejected:
 *   - Se il creatore modifica un evento rejected, il BE resetta automaticamente
 *     status → draft e rejection_reason → null nella response.
 *     Il FE mostra "Evento aggiornato e reinviato per approvazione" in questo caso.
 *   - Se l'admin modifica un rejected, lo stato rimane rejected (nessun reset).
 *
 * ROUTE: /dashboard/eventi/:id/modifica
 *
 * ENDPOINT:
 *   GET    /events/:id          → carica evento (usa id numerico — i draft non hanno slug pubblico)
 *   PATCH  /events/:id          → salva modifiche (tutti i campi opzionali, almeno uno richiesto)
 *   GET    /challenges?status=open&limit=50 → lista challenge collegabili
 *   POST   /events/:id/challenges           → collega challenge
 *   DELETE /events/:id/challenges/:cId      → scollega challenge
 *
 * UX NOTE:
 *   - Caricamento iniziale: mostra spinner, poi form già compilato
 *   - Salvataggio: feedback inline (nessun navigate) — l'utente resta sulla pagina
 *   - Se status cambia a draft nella response (creatore su rejected):
 *     mostrare banner "Reinviato per approvazione" invece del solito "Salvato"
 *   - Sezione challenge separata dal form dati — ogni azione è immediata (no submit)
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roles";
import { updateEvent, linkChallengeToEvent, unlinkChallengeFromEvent } from "@/api/events.api";
import { routes } from "@/routes";

// Badge colore per stato evento
function StatusBadge({ status }) {
  const map = {
    draft:     { label: "Bozza",      color: "rgba(234,179,8,0.2)",   border: "rgba(234,179,8,0.5)",   text: "rgb(234,179,8)" },
    published: { label: "Pubblicato", color: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",   text: "rgb(74,222,128)" },
    rejected:  { label: "Rifiutato",  color: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",   text: "rgb(248,113,113)" },
    ended:     { label: "Concluso",   color: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)", text: "rgb(148,163,184)" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600,
      background: s.color, border: `1px solid ${s.border}`, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

export default function EditEvent() {
  const { id }       = useParams();  // id numerico — non slug
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const isAdminUser  = isAdmin(user?.role);

  // ── Stato evento originale ───────────────────────────────────────────
  const [event, setEvent]         = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading]     = useState(true);

  // ── Form dati evento ─────────────────────────────────────────────────
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [saveResult, setSaveResult] = useState(null); // { ok, msg, resubmitted }

  // ── Sezione challenge ────────────────────────────────────────────────
  const [available, setAvailable]       = useState([]);   // challenge open disponibili
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(""); // id challenge da aggiungere
  const [challengeBusy, setChallengeBusy] = useState({}); // { [challengeId]: bool }
  const [challengeError, setChallengeError] = useState("");

  // ── Carica evento ────────────────────────────────────────────────────
  const loadEvent = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get(`/v1/events/${id}`);
      setEvent(data);
      // Inizializza form con valori correnti
      setForm({
        name:             data.name             || "",
        description:      data.description      || "",
        start_date:       data.start_date        ? data.start_date.slice(0, 10) : "",
        end_date:         data.end_date          ? data.end_date.slice(0, 10)   : "",
        location_address: data.location_address  || "",
        logo_url:         data.logo_url          || "",
      });
    } catch (err) {
      setLoadError(
        err?.response?.status === 404
          ? "Evento non trovato."
          : err?.response?.status === 403
          ? "Non hai i permessi per modificare questo evento."
          : "Impossibile caricare l'evento."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  // ── Carica challenge disponibili per il collegamento ─────────────────
  useEffect(() => {
    async function loadChallenges() {
      setLoadingChallenges(true);
      try {
        const { data } = await api.get(API_PATHS.challenges("?status=open&limit=50"));
        setAvailable(Array.isArray(data?.items) ? data.items : []);
      } catch {
        // non bloccante — la sezione mostra semplicemente la select vuota
      } finally {
        setLoadingChallenges(false);
      }
    }
    loadChallenges();
  }, []);

  // ── Guard: evento ended non modificabile ─────────────────────────────
  const canEdit = event && event.status !== "ended";

  // ── Salva modifiche dati evento ──────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      // Invia solo i campi non vuoti — PATCH accetta aggiornamenti parziali
      const payload = {};
      if (form.name?.trim())             payload.name             = form.name.trim();
      if (form.description?.trim())      payload.description      = form.description.trim();
      if (form.start_date)               payload.start_date       = form.start_date;
      if (form.end_date)                 payload.end_date         = form.end_date;
      if (form.location_address?.trim()) payload.location_address = form.location_address.trim();
      if (form.logo_url?.trim())         payload.logo_url         = form.logo_url.trim();

      if (Object.keys(payload).length === 0) {
        setSaveResult({ ok: false, msg: "Nessuna modifica da salvare." });
        return;
      }

      const updated = await updateEvent(id, payload);

      // Aggiorna evento locale con la response
      setEvent(updated);

      // Caso speciale: creatore modifica rejected → BE resetta a draft
      const wasRejected   = event.status === "rejected";
      const nowDraft      = updated.status === "draft";
      const resubmitted   = !isAdminUser && wasRejected && nowDraft;

      setSaveResult({
        ok: true,
        resubmitted,
        msg: resubmitted
          ? "Evento aggiornato e reinviato per approvazione."
          : "Modifiche salvate.",
      });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Errore durante il salvataggio.";
      setSaveResult({ ok: false, msg });
    } finally {
      setSaving(false);
    }
  }

  // ── Collega challenge ────────────────────────────────────────────────
  async function handleLink() {
    if (!selectedToAdd) return;
    setChallengeError("");
    setChallengeBusy((b) => ({ ...b, [selectedToAdd]: true }));
    try {
      await linkChallengeToEvent(Number(id), Number(selectedToAdd));
      // Ricarica evento per aggiornare la lista challenge collegate
      await loadEvent();
      setSelectedToAdd("");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        setChallengeError("Questa sfida è già collegata all'evento.");
      } else {
        setChallengeError(err?.response?.data?.error || "Errore durante il collegamento.");
      }
    } finally {
      setChallengeBusy((b) => ({ ...b, [selectedToAdd]: false }));
    }
  }

  // ── Scollega challenge ───────────────────────────────────────────────
  async function handleUnlink(challengeId) {
    setChallengeError("");
    setChallengeBusy((b) => ({ ...b, [challengeId]: true }));
    try {
      await unlinkChallengeFromEvent(Number(id), challengeId);
      await loadEvent();
    } catch (err) {
      setChallengeError(err?.response?.data?.error || "Errore durante la rimozione.");
    } finally {
      setChallengeBusy((b) => ({ ...b, [challengeId]: false }));
    }
  }

  // ── Challenge già collegate (da event.challenges) ────────────────────
  const linked = Array.isArray(event?.challenges) ? event.challenges : [];

  // Challenge non ancora collegate (per la select di aggiunta)
  const linkedIds  = new Set(linked.map((ch) => String(ch.id)));
  const addable    = available.filter((ch) => !linkedIds.has(String(ch.id)));

  // ── Render loading / errore ──────────────────────────────────────────
  if (loading) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container">
          <div className="callout neutral">Caricamento evento…</div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container">
          <div className="callout error">{loadError}</div>
          <Link
            to={isAdminUser ? routes.admin.events : routes.events.mine}
            className="btn btn-outline"
            style={{ marginTop: 16, display: "inline-block" }}
          >
            ← Torna agli eventi
          </Link>
        </div>
      </section>
    );
  }

  // ── Render principale ────────────────────────────────────────────────
  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link
            to={isAdminUser ? routes.admin.events : routes.events.mine}
            className="muted small"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}
          >
            ← Torna agli eventi
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 className="page-title" style={{ margin: 0 }}>
              Modifica evento
            </h2>
            {event && <StatusBadge status={event.status} />}
          </div>
          {event?.name && (
            <div className="muted small" style={{ marginTop: 4 }}>
              {event.name} · ID: {event.id}
            </div>
          )}
        </div>

        {/* Banner evento ended — non modificabile */}
        {event?.status === "ended" && (
          <div className="callout neutral" style={{ marginBottom: 20 }}>
            Questo evento è concluso e non può essere modificato.
          </div>
        )}

        {/* Banner rejection reason — visibile a tutti */}
        {event?.status === "rejected" && event?.rejection_reason && (
          <div className="card-info error" style={{ marginBottom: 20 }}>
            <strong>Motivo del rifiuto:</strong> {event.rejection_reason}
            {!isAdminUser && (
              <div style={{ marginTop: 6, fontSize: "0.9rem", opacity: 0.8 }}>
                Modifica l'evento e salva per reinviarlo automaticamente all'approvazione.
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <>
            {/* ── Form dati evento ────────────────────────────────── */}
            <div className="card" style={{ padding: "20px 24px", marginBottom: 20 }}>
              <h3 className="dynamic-subtitle" style={{ marginBottom: 16 }}>
                Dati evento
              </h3>

              <div className="form-grid">

                <label>
                  Nome evento *
                  <input
                    className="control"
                    value={form.name || ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    maxLength={200}
                  />
                </label>

                <label>
                  Descrizione
                  <textarea
                    className="control"
                    rows={4}
                    value={form.description || ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>

                <div className="form-row">
                  <label>
                    Data inizio *
                    <input
                      type="date"
                      className="control"
                      value={form.start_date || ""}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    />
                  </label>
                  <label>
                    Data fine *
                    <input
                      type="date"
                      className="control"
                      value={form.end_date || ""}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    />
                  </label>
                </div>

                <label>
                  Indirizzo
                  <input
                    className="control"
                    value={form.location_address || ""}
                    onChange={(e) => setForm((f) => ({ ...f, location_address: e.target.value }))}
                  />
                </label>

                <label>
                  URL logo
                  <input
                    className="control"
                    type="url"
                    placeholder="https://res.cloudinary.com/…"
                    value={form.logo_url || ""}
                    onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                  />
                </label>

              </div>

              {/* Feedback salvataggio */}
              {saveResult && (
                <div
                  className={`card-info ${saveResult.ok ? (saveResult.resubmitted ? "success" : "neutral") : "error"}`}
                  style={{ marginTop: 12 }}
                  role="alert"
                >
                  {saveResult.msg}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving ? "Salvataggio…" : "Salva modifiche"}
                </button>
              </div>
            </div>

            {/* ── Sezione challenge collegate ──────────────────────── */}
            <div className="card" style={{ padding: "20px 24px" }}>
              <h3 className="dynamic-subtitle" style={{ marginBottom: 4 }}>
                Sfide collegate
              </h3>
              <p className="muted small" style={{ marginBottom: 16 }}>
                Le sfide collegate sono visibili ai partecipanti nella pagina evento.
                Puoi aggiungerne o rimuoverne in qualsiasi momento.
              </p>

              {/* Errore challenge */}
              {challengeError && (
                <div className="card-info error" style={{ marginBottom: 12 }} role="alert">
                  {challengeError}
                </div>
              )}

              {/* Lista challenge già collegate */}
              {linked.length === 0 ? (
                <div className="dynamic-empty" style={{ padding: "16px 0" }}>
                  <div className="dynamic-empty__icon">🔗</div>
                  <div className="dynamic-empty__text">Nessuna sfida collegata.</div>
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, marginBottom: 16 }}>
                  {linked.map((ch) => (
                    <li
                      key={ch.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                        gap: 12,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "#fff" }}>{ch.title}</span>
                        {ch.status && (
                          <span className="muted small" style={{ marginLeft: 8 }}>
                            ({ch.status})
                          </span>
                        )}
                        {ch.deadline && (
                          <span className="muted small" style={{ marginLeft: 8 }}>
                            · scad. {new Date(ch.deadline).toLocaleDateString("it-IT")}
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => handleUnlink(ch.id)}
                        disabled={!!challengeBusy[ch.id]}
                        aria-label={`Rimuovi sfida ${ch.title}`}
                        style={{ flexShrink: 0, color: "rgb(248,113,113)" }}
                      >
                        {challengeBusy[ch.id] ? "…" : "Rimuovi"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Aggiungi challenge */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <select
                  className="control"
                  style={{ flex: 1, minWidth: 200 }}
                  value={selectedToAdd}
                  onChange={(e) => { setSelectedToAdd(e.target.value); setChallengeError(""); }}
                  aria-label="Seleziona sfida da aggiungere"
                  disabled={loadingChallenges}
                >
                  <option value="">
                    {loadingChallenges ? "Caricamento…" : "Seleziona una sfida da aggiungere…"}
                  </option>
                  {addable.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}{ch.location ? ` — ${ch.location}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-outline"
                  onClick={handleLink}
                  disabled={!selectedToAdd || !!challengeBusy[selectedToAdd]}
                  style={{ flexShrink: 0 }}
                >
                  {challengeBusy[selectedToAdd] ? "…" : "+ Collega"}
                </button>
              </div>

              {addable.length === 0 && !loadingChallenges && (
                <div className="muted small" style={{ marginTop: 8 }}>
                  Tutte le sfide aperte sono già collegate, oppure non ce ne sono di disponibili.
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
