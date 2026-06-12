// src/pages/admin/AdminSponsorships.jsx
/**
 * Pannello admin per la gestione delle sponsorizzazioni.
 *
 * Due tab:
 *   1. "Candidature sponsorizzazione" — GET /admin/sponsorship-requests
 *      Approva, rifiuta, conferma pagamento
 *
 *   2. "Richieste ruolo sponsor" — GET /admin/role-requests?requested_role=sponsor
 *      Approva o rifiuta richieste di upgrade ruolo user → sponsor
 *
 * ROUTE:  /dashboard/admin/sponsorships  (routes.admin.sponsorships)
 * RUOLO:  admin
 *
 * DIPENDENZE API:
 *   GET   /v1/admin/sponsorship-requests
 *   PATCH /v1/admin/sponsorship-requests/:id/approve
 *   PATCH /v1/admin/sponsorship-requests/:id/reject
 *   PATCH /v1/admin/sponsorships/:id/confirm-payment
 *   GET   /v1/admin/role-requests?requested_role=sponsor
 *   PATCH /v1/admin/role-requests/:id/approve
 *   PATCH /v1/admin/role-requests/:id/reject
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  adminGetSponsorshipRequests,
  adminApproveSponsorshipRequest,
  adminRejectSponsorshipRequest,
  adminConfirmPayment,
} from "@/api/sponsorship.api";
import {
  adminGetRoleRequests,
  adminApproveRoleRequest,
  adminRejectRoleRequest,
} from "@/api/roleRequests.api";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const SPONSORSHIP_STATUSES = [
  { value: "",                label: "Tutti gli stati" },
  { value: "pending_review",  label: "In revisione" },
  { value: "approved",        label: "Approvate" },
  { value: "rejected",        label: "Rifiutate" },
];

const ROLE_REQUEST_STATUSES = [
  { value: "",         label: "Tutti gli stati" },
  { value: "pending",  label: "In attesa" },
  { value: "approved", label: "Approvate" },
  { value: "rejected", label: "Rifiutate" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Sottocomponente: modale generica per input testo (motivo rifiuto, note, ecc.)
// ---------------------------------------------------------------------------

function TextModal({ title, label, placeholder, required = false, onConfirm, onCancel }) {
  const [value, setValue] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{ maxWidth: 480, width: "100%", padding: 24 }}
      >
        <h2 id="modal-title" style={{ marginTop: 0, fontSize: "1.1rem" }}>
          {title}
        </h2>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label htmlFor="modal-input">{label}</label>
          <textarea
            id="modal-input"
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            className="btn btn-primary"
            disabled={required && !value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            Conferma
          </button>
          <button className="btn btn-outline" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sottocomponente: modale conferma pagamento
// ---------------------------------------------------------------------------

function PaymentModal({ onConfirm, onCancel }) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes]   = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 480, width: "100%", padding: 24 }}>
        <h2 id="payment-modal-title" style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Conferma pagamento ricevuto
        </h2>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label htmlFor="payment-amount">
            Importo ricevuto (€) <span className="muted small">(obbligatorio)</span>
          </label>
          <input
            id="payment-amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="es. 500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="payment-notes">
            Note interne <span className="muted small">(non visibili allo sponsor)</span>
          </label>
          <textarea
            id="payment-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Riferimento bonifico, data valuta, ecc."
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            className="btn btn-primary"
            disabled={!amount || parseFloat(amount) <= 0}
            onClick={() =>
              onConfirm({
                amount_eur:    parseFloat(amount),
                private_notes: notes.trim() || undefined,
              })
            }
          >
            Conferma pagamento
          </button>
          <button className="btn btn-outline" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — Candidature sponsorizzazione
// ---------------------------------------------------------------------------

function SponsorshipRequestsTab() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [nextCursor, setNextCursor]     = useState(null);

  // Modale attiva: { type: "approve"|"reject"|"payment", id, sponsorshipId? }
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async ({ append = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetSponsorshipRequests({
        status: statusFilter || undefined,
        limit:  PAGE_SIZE,
        cursor: append ? nextCursor : undefined,
      });
      const list = data?.items ?? [];
      setItems((prev) => append ? [...prev, ...list] : list);
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || "Errore nel caricamento delle candidature.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, nextCursor]);

  useEffect(() => {
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // ── Azioni ────────────────────────────────────────────────────────────────

  const handleApprove = async (adminNotes) => {
    setModal(null);
    setActionError(null);
    try {
      await adminApproveSponsorshipRequest(modal.id, {
        admin_notes: adminNotes || undefined,
      });
      // Aggiorno lo stato localmente
      setItems((prev) =>
        prev.map((i) =>
          i.id === modal.id ? { ...i, status: "approved" } : i
        )
      );
    } catch (err) {
      setActionError(err?.response?.data?.error || "Errore nell'approvazione.");
    }
  };

  const handleReject = async (reason) => {
    setModal(null);
    setActionError(null);
    try {
      await adminRejectSponsorshipRequest(modal.id, {
        reason: reason || undefined,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === modal.id ? { ...i, status: "rejected" } : i
        )
      );
    } catch (err) {
      setActionError(err?.response?.data?.error || "Errore nel rifiuto.");
    }
  };

  const handleConfirmPayment = async ({ amount_eur, private_notes }) => {
    setModal(null);
    setActionError(null);
    try {
      // confirm-payment usa l'ID della sponsorship, non della request
      await adminConfirmPayment(modal.sponsorshipId, { amount_eur, private_notes });
      setItems((prev) =>
        prev.map((i) =>
          i.id === modal.id
            ? {
                ...i,
                payment: {
                  ...i.payment,
                  payment_status: "confirmed",
                  amount_eur,
                  confirmed_at: new Date().toISOString(),
                },
              }
            : i
        )
      );
    } catch (err) {
      setActionError(err?.response?.data?.error || "Errore nella conferma pagamento.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Filtro stato */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          className="control control-small control-pill"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {SPONSORSHIP_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-small" onClick={() => load({ append: false })}>
          ↺ Aggiorna
        </button>
      </div>

      {actionError && (
        <div className="callout error" style={{ marginBottom: 12 }}>{actionError}</div>
      )}

      {loading && <div className="callout neutral">Caricamento…</div>}

      {!loading && items.length === 0 && (
        <div className="callout neutral">
          Nessuna candidatura trovata per il filtro selezionato.
        </div>
      )}

      {/* Lista candidature */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div
            key={item.id}
            className="card"
            style={{ padding: 16 }}
          >
            {/* Riga principale */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p className="small muted" style={{ margin: 0 }}>
                  #{item.id} · {fmtDateTime(item.created_at)}
                </p>
                <strong>
                  {item.challenge_title || item.event_title || `Piattaforma`}
                </strong>
                {item.sponsor_name && (
                  <span className="small muted"> — {item.sponsor_name}</span>
                )}
              </div>
              <span className={`chip ${item.status === "approved" ? "chip-success" : item.status === "rejected" ? "chip-error" : "chip-neutral"}`}>
                {item.status}
              </span>
            </div>

            {/* Dettagli */}
            <ul className="meta-list" style={{ marginTop: 8 }}>
              {item.budget_proposed_eur && (
                <li><span>Budget proposto</span><span>{item.budget_proposed_eur}€</span></li>
              )}
              {item.payment?.payment_status && (
                <li><span>Pagamento</span><span>{item.payment.payment_status}</span></li>
              )}
              {item.payment?.payment_deadline && (
                <li><span>Scadenza pagamento</span><span>{fmtDate(item.payment.payment_deadline)}</span></li>
              )}
            </ul>

            {/* Motivazione */}
            {item.motivation && (
              <details style={{ marginTop: 8 }}>
                <summary className="small muted" style={{ cursor: "pointer" }}>
                  Motivazione
                </summary>
                <p className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {item.motivation}
                </p>
              </details>
            )}

            {/* Report requests */}
            {item.report_requests && (
              <details style={{ marginTop: 6 }}>
                <summary className="small muted" style={{ cursor: "pointer" }}>
                  Richieste report
                </summary>
                <p className="small" style={{ marginTop: 6 }}>{item.report_requests}</p>
              </details>
            )}

            {/* Azioni */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {item.status === "pending_review" && (
                <>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => setModal({ type: "approve", id: item.id })}
                  >
                    ✅ Approva
                  </button>
                  <button
                    className="btn btn-outline btn-small"
                    style={{ color: "var(--color-error, #c0392b)" }}
                    onClick={() => setModal({ type: "reject", id: item.id })}
                  >
                    ❌ Rifiuta
                  </button>
                </>
              )}

              {/* Conferma pagamento: visibile se approvata e pagamento non ancora confermato */}
              {item.status === "approved" &&
                item.sponsorship_id &&
                item.payment?.payment_status === "pending" && (
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() =>
                      setModal({
                        type: "payment",
                        id: item.id,
                        sponsorshipId: item.sponsorship_id,
                      })
                    }
                  >
                    💳 Conferma pagamento
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Paginazione */}
      {nextCursor && !loading && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            className="btn btn-outline"
            onClick={() => load({ append: true })}
          >
            Carica altri
          </button>
        </div>
      )}

      {/* Modali */}
      {modal?.type === "approve" && (
        <TextModal
          title="Approva candidatura"
          label="Note interne (opzionale — non visibili allo sponsor)"
          placeholder="es. confermato budget, accordo verbale del…"
          onConfirm={handleApprove}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "reject" && (
        <TextModal
          title="Rifiuta candidatura"
          label="Motivo del rifiuto (opzionale)"
          placeholder="es. budget insufficiente per la challenge selezionata"
          onConfirm={handleReject}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "payment" && (
        <PaymentModal
          onConfirm={handleConfirmPayment}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Richieste ruolo sponsor
// ---------------------------------------------------------------------------

function RoleRequestsTab() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [nextCursor, setNextCursor]     = useState(null);
  const [modal, setModal]       = useState(null); // { type: "reject", id }
  const [actionError, setActionError]   = useState(null);

  const load = useCallback(async ({ append = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetRoleRequests({
        requested_role: "sponsor",
        status:         statusFilter || undefined,
        limit:          PAGE_SIZE,
        cursor:         append ? nextCursor : undefined,
      });
      const list = data?.items ?? [];
      setItems((prev) => append ? [...prev, ...list] : list);
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || "Errore nel caricamento delle richieste.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, nextCursor]);

  useEffect(() => {
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleReject = async (reason) => {
    setModal(null);
    setActionError(null);
    try {
      await adminRejectRoleRequest(modal.id, {
        rejection_reason: reason || undefined,
      });
      setItems((prev) =>
        prev.map((i) => i.id === modal.id ? { ...i, status: "rejected", rejection_reason: reason } : i)
      );
    } catch (err) {
      setActionError(err?.response?.data?.error || "Errore nel rifiuto.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          className="control control-small control-pill"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {ROLE_REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-small" onClick={() => load({ append: false })}>
          ↺ Aggiorna
        </button>
      </div>

      {actionError && (
        <div className="callout error" style={{ marginBottom: 12 }}>{actionError}</div>
      )}

      {loading && <div className="callout neutral">Caricamento…</div>}

      {!loading && items.length === 0 && (
        <div className="callout neutral">
          Nessuna richiesta trovata per il filtro selezionato.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div key={item.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p className="small muted" style={{ margin: 0 }}>
                  #{item.id} · {fmtDateTime(item.created_at)}
                </p>
                <strong>{item.user?.email || `Utente #${item.user?.id}`}</strong>
                {item.company_name && (
                  <span className="small muted"> — {item.company_name}</span>
                )}
              </div>
              <span className={`chip ${item.status === "approved" ? "chip-success" : item.status === "rejected" ? "chip-error" : "chip-neutral"}`}>
                {item.status}
              </span>
            </div>

            {/* Motivazione */}
            {item.motivation && (
              <details style={{ marginTop: 8 }}>
                <summary className="small muted" style={{ cursor: "pointer" }}>
                  Motivazione
                </summary>
                <p className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {item.motivation}
                </p>
              </details>
            )}

            {/* Rejection reason se già rifiutata */}
            {item.rejection_reason && (
              <p className="small callout error" style={{ marginTop: 8 }}>
                Motivo rifiuto: {item.rejection_reason}
              </p>
            )}

            {/* Azioni */}
            {item.status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary btn-small"
                  onClick={async () => {
                    // L'approvazione non richiede input — conferma diretta senza modale
                    if (!window.confirm("Approvare questa richiesta? Il ruolo dell'utente verrà aggiornato a sponsor.")) return;
                    setActionError(null);
                    try {
                      await adminApproveRoleRequest(item.id);
                      setItems((prev) =>
                        prev.map((i) => i.id === item.id ? { ...i, status: "approved" } : i)
                      );
                    } catch (err) {
                      setActionError(err?.response?.data?.error || "Errore nell'approvazione.");
                    }
                  }}
                >
                  ✅ Approva
                </button>
                <button
                  className="btn btn-outline btn-small"
                  style={{ color: "var(--color-error, #c0392b)" }}
                  onClick={() => setModal({ type: "reject", id: item.id })}
                >
                  ❌ Rifiuta
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {nextCursor && !loading && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn btn-outline" onClick={() => load({ append: true })}>
            Carica altri
          </button>
        </div>
      )}

      {modal?.type === "reject" && (
        <TextModal
          title="Rifiuta richiesta ruolo"
          label="Motivo del rifiuto (visibile all'utente come controproposta)"
          placeholder="es. Completa prima il percorso formativo base sulla piattaforma"
          onConfirm={handleReject}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principale con tab
// ---------------------------------------------------------------------------

export default function AdminSponsorships() {
  const [activeTab, setActiveTab] = useState("sponsorships");

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        <header className="page-header">
          <h1 className="page-title">Gestione sponsorizzazioni</h1>
          <p className="page-subtitle">
            Esamina le candidature di sponsorizzazione e le richieste di
            upgrade ruolo sponsor.
          </p>
        </header>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Sezioni gestione sponsorizzazioni"
          style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--color-border, #e0e0e0)" }}
        >
          {[
            { key: "sponsorships", label: "Candidature" },
            { key: "role-requests", label: "Richieste ruolo sponsor" },
          ].map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`btn btn-ghost ${activeTab === tab.key ? "active" : ""}`}
              style={{
                borderBottom: activeTab === tab.key
                  ? "2px solid var(--color-primary, #2563eb)"
                  : "2px solid transparent",
                borderRadius: 0,
                marginBottom: -2,
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenuto tab */}
        {activeTab === "sponsorships"  && <SponsorshipRequestsTab />}
        {activeTab === "role-requests" && <RoleRequestsTab />}

      </div>
    </section>
  );
}
