// src/pages/admin/AdminEvents.jsx
/**
 * AdminEvents.jsx
 * ---------------
 * Pannello admin per la gestione degli eventi.
 * Approva, rifiuta e chiude eventi.
 *
 * ACCESSO: solo admin (ProtectedRoute in App.jsx)
 * ROUTE: /dashboard/admin/eventi
 *
 * ENDPOINT:
 *   GET   /admin/events?status=...  → lista eventi per stato
 *   PATCH /events/:id/approve       → approva (draft → published)
 *   PATCH /events/:id/reject        → rifiuta (richiede reason)
 *   PATCH /events/:id/end           → chiudi evento (published → ended)
 *
 * PATTERN: identico ad AdminProposals.jsx
 * - useEffect + useState + api diretta
 * - Select per filtrare per stato
 * - Azioni inline con setBusy per disabilitare durante la chiamata
 * - Rimozione ottimistica dalla lista dopo azione
 *
 * UX NOTE:
 * Il rifiuto usa prompt() inline come AdminProposals — consistente
 * con il pattern esistente. La chiusura evento è un'azione irreversibile
 * quindi mostra una confirm() prima di procedere.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roles";
import { getAdminEvents, approveEvent, rejectEvent, endEvent } from "@/api/events.api";
import { routes } from "@/routes";

const PAGE_SIZE = 20;

// Formattazione data leggibile
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function AdminEvents() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const isAdminUser = isAdmin(user?.role);

  const [items, setItems]   = useState([]);
  const [status, setStatus] = useState("draft");
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]     = useState({});
  const [error, setError]   = useState("");

  // ── Carica lista eventi ──────────────────────────────────────────────
  const load = async ({ append = false } = {}) => {
    if (!isAdminUser) return;
    setLoading(true);
    setError("");
    try {
      const result = await getAdminEvents({
        status,
        limit: PAGE_SIZE,
        cursor: append ? cursor : undefined,
      });
      const list = Array.isArray(result?.items) ? result.items : [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setCursor(result?.nextCursor ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Errore caricamento");
      setItems([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  };

  // Ricarica quando cambia il filtro stato
  useEffect(() => {
    setCursor(null);
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Azione su evento ─────────────────────────────────────────────────
  const act = async (id, kind) => {
    if (!isAdminUser) return alert("Permessi insufficienti (admin).");
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      if (kind === "approve") {
        await approveEvent(id);
        setItems((list) => list.filter((x) => x.id !== id));
        alert("Evento approvato e pubblicato ✅");

      } else if (kind === "reject") {
        const reason = prompt("Motivo del rifiuto (opzionale):") ?? undefined;
        await rejectEvent(id, reason || "");
        setItems((list) => list.filter((x) => x.id !== id));
        alert("Evento rifiutato ✅");

      } else if (kind === "end") {
        const confirmed = window.confirm(
          "Sei sicuro di voler chiudere questo evento? L'operazione non è reversibile."
        );
        if (!confirmed) {
          setBusy((b) => ({ ...b, [id]: false }));
          return;
        }
        await endEvent(id);
        setItems((list) => list.filter((x) => x.id !== id));
        alert("Evento chiuso ✅");
      }
    } catch (err) {
      const st  = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";
      if (st === 400)  alert("Transizione di stato non valida: " + msg);
      else if (st === 401) alert("Sessione scaduta o non autorizzato.");
      else if (st === 403) alert("Permessi insufficienti (admin richiesto).");
      else if (st === 404) alert("Evento non trovato.");
      else alert(`Errore: ${msg}`);
      console.error("AdminEvents action error:", err);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  // ── Guard ruolo ──────────────────────────────────────────────────────
  if (!isAdminUser) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <div className="callout error">Permessi insufficienti (richiesto ruolo admin).</div>
        </div>
      </section>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <section className="page-section page-text">
      <div className="container">

        {/* Header */}
        <div className="page-header">
          <h2 className="page-title">Gestione eventi</h2>
          <div className="page-actions" style={{ display: "flex", gap: 8 }}>

            {/* Filtro stato */}
            <select
              className="control control-pill select--light"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filtra per stato"
            >
              <option value="draft">In attesa di approvazione</option>
              <option value="published">Pubblicati</option>
              <option value="rejected">Rifiutati</option>
              <option value="ended">Conclusi</option>
            </select>

            <button
              className="btn btn-outline btn-pill"
              onClick={() => load({ append: false })}
              disabled={loading}
            >
              Aggiorna
            </button>

            {/* Link creazione evento */}
            <button
              className="btn btn-primary"
              onClick={() => navigate(routes.events.create)}
            >
              + Nuovo evento
            </button>

          </div>
        </div>

        {/* Feedback */}
        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && !loading && <div className="callout error">{error}</div>}

        {/* Lista vuota */}
        {!loading && !error && items.length === 0 && (
          <div className="dynamic-empty">
            <div className="dynamic-empty__icon">📅</div>
            <div className="dynamic-empty__text">
              {status === "draft"     ? "Nessun evento in attesa di approvazione."
             : status === "published" ? "Nessun evento pubblicato."
             : status === "rejected"  ? "Nessun evento rifiutato."
             :                          "Nessun evento concluso."}
            </div>
          </div>
        )}

        {/* Lista eventi */}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((ev) => (
            <li key={ev.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "start",
              }}>

                {/* Info evento */}
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    {ev.name || "(senza nome)"}
                  </div>
                  <div className="muted small">
                    ID: {ev.id}
                    {ev.slug && ` · slug: ${ev.slug}`}
                    {ev.start_date && ` · ${formatDate(ev.start_date)}`}
                    {ev.location_address && ` · ${ev.location_address}`}
                  </div>
                  {/* Sfide collegate */}
                  {Array.isArray(ev.challenges) && ev.challenges.length > 0 && (
                    <div className="muted small" style={{ marginTop: 4 }}>
                      Sfide: {ev.challenges.map((ch) => ch.title).join(", ")}
                    </div>
                  )}
                  {/* Motivo rifiuto se presente */}
                  {ev.rejection_reason && (
                    <div className="card-info error" style={{ marginTop: 6, fontSize: "0.85rem" }}>
                      Motivo rifiuto: {ev.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Azioni */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>

                  {/* Visualizza pagina evento — solo se pubblicato o concluso.
                      I draft/rejected restituiscono 404 su GET /events/:slug. */}
                  {(ev.status === "published" || ev.status === "ended") && (
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => navigate(routes.events.detail(ev.slug || ev.id))}
                      title="Visualizza pagina pubblica dell'evento"
                    >
                      Visualizza
                    </button>
                  )}
                  {(ev.status === "draft" || ev.status === "rejected") && (
                    <span
                      className="muted small"
                      style={{ alignSelf: "center", fontStyle: "italic" }}
                      title="La pagina pubblica sarà visibile dopo l'approvazione"
                    >
                      Non pubblico
                    </span>
                  )}

                  {/* Modifica — tutti gli stati tranne ended */}
                  {ev.status !== "ended" && (
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => navigate(routes.events.edit(ev.id))}
                      title="Modifica evento"
                    >
                      Modifica
                    </button>
                  )}

                  {/* Approva — su draft e rejected */}
                  {(ev.status === "draft" || ev.status === "rejected") && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => act(ev.id, "approve")}
                      disabled={!!busy[ev.id]}
                    >
                      {busy[ev.id] ? "…" : "Approva"}
                    </button>
                  )}

                  {/* Rifiuta — su draft e published */}
                  {(ev.status === "draft" || ev.status === "published") && (
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => act(ev.id, "reject")}
                      disabled={!!busy[ev.id]}
                    >
                      {busy[ev.id] ? "…" : "Rifiuta"}
                    </button>
                  )}

                  {/* Chiudi — solo published */}
                  {ev.status === "published" && (
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => act(ev.id, "end")}
                      disabled={!!busy[ev.id]}
                      title="Chiudi evento — operazione irreversibile"
                    >
                      {busy[ev.id] ? "…" : "Chiudi"}
                    </button>
                  )}

                  {/* Ended — solo badge */}
                  {ev.status === "ended" && (
                    <span className="status-badge status-badge--rejected">
                      Concluso
                    </span>
                  )}
                  
                  {/* Report evento — accessibile dall'admin per tutti gli stati */}
                  <Link
                    to={routes.admin.eventReport(ev.id)}
                      className="btn btn-ghost btn-small"
                      title="Visualizza report di impatto"
                     >
                    📄 Report
                 </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Paginazione */}
        {cursor && !loading && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => load({ append: true })}
            >
              Carica altri
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
