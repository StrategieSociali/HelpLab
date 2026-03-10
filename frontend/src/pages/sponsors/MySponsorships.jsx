// src/pages/sponsors/MySponsorships.jsx
/**
 * Dashboard personale dello sponsor: lista candidature e stati pagamento.
 *
 * Funzionalità:
 *   - Lista tutte le candidature dello sponsor autenticato
 *   - Mostra stato candidatura (pending_review, approved, rejected)
 *   - Mostra stato pagamento quando disponibile (pending, confirmed, cancelled)
 *   - Permette il ritiro di candidature in stato "pending_review"
 *   - Link rapidi a: nuova candidatura, profilo sponsor, guida
 *
 * ROUTE:  /dashboard/sponsor/candidature  (routes.community.mySponsorships)
 * RUOLO:  sponsor
 *
 * DIPENDENZE API:
 *   GET    /v1/sponsorship-requests/mine
 *   DELETE /v1/sponsorship-requests/:id
 */

import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { routes } from "@/routes";
import {
  getMySponshorshipRequests,
  deleteSponsorshipRequest,
} from "@/api/sponsorship.api";

// ---------------------------------------------------------------------------
// Helpers visualizzazione stato
// ---------------------------------------------------------------------------

/**
 * Mappa lo stato candidatura a label e classe CSS callout.
 * I valori vengono dal BE — non hardcodiamo assunzioni sul significato.
 */
function requestStatusUI(status) {
  const map = {
    pending_review: { label: "In revisione",  cls: "chip chip-neutral", icon: "⏳" },
    approved:       { label: "Approvata",      cls: "chip chip-success", icon: "✅" },
    rejected:       { label: "Non approvata",  cls: "chip chip-error",   icon: "❌" },
  };
  return map[status] ?? { label: status, cls: "chip chip-neutral", icon: "•" };
}

/**
 * Mappa lo stato pagamento a label e classe.
 * Esposto pubblicamente dal BE — usato per mostrare affidabilità sponsor.
 */
function paymentStatusUI(status) {
  const map = {
    pending:   { label: "In attesa di pagamento", cls: "chip chip-neutral", icon: "💳" },
    confirmed: { label: "Pagamento confermato",   cls: "chip chip-success", icon: "✔️" },
    cancelled: { label: "Pagamento annullato",    cls: "chip chip-error",   icon: "✖️" },
  };
  return map[status] ?? { label: status, cls: "chip chip-neutral", icon: "•" };
}

/** Formatta data ISO in formato leggibile italiano */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sottocomponente: card singola candidatura
// ---------------------------------------------------------------------------

function SponsorshipCard({ item, onWithdraw, withdrawing }) {
  const reqStatus  = requestStatusUI(item.status);
  const hasPayment = !!item.payment;
  const payStatus  = hasPayment ? paymentStatusUI(item.payment.payment_status) : null;

  const canWithdraw = item.status === "pending_review";

  return (
    <article className="card glass" style={{ padding: 20 }}>

      {/* Header: titolo + stato */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="small muted" style={{ marginBottom: 2 }}>
            {item.target_type === "challenge" && "Sfida"}
            {item.target_type === "event"     && "Evento"}
            {item.target_type === "platform"  && "Piattaforma"}
          </p>
          <h3 style={{ margin: 0 }}>
            {item.challenge_title ||
              item.event_title    ||
              "Sponsorizzazione piattaforma"}
          </h3>
        </div>

        <span className={reqStatus.cls} aria-label={`Stato: ${reqStatus.label}`}>
          {reqStatus.icon} {reqStatus.label}
        </span>
      </div>

      {/* Meta: budget proposto + date */}
      <ul className="meta-list" style={{ marginTop: 12 }}>
        {item.budget_proposed_eur && (
          <li>
            <span>Budget proposto</span>
            <span>
              <strong>{item.budget_proposed_eur}€</strong>
            </span>
          </li>
        )}
        <li>
          <span>Inviata il</span>
          <span>{fmtDate(item.created_at)}</span>
        </li>
        {item.reviewed_at && (
          <li>
            <span>Esaminata il</span>
            <span>{fmtDate(item.reviewed_at)}</span>
          </li>
        )}
      </ul>

      {/* Stato pagamento — visibile solo dopo approvazione */}
      {hasPayment && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--color-surface, #f8f9fa)",
            border: "1px solid var(--color-border, #e0e0e0)",
          }}
        >
          <p className="small muted" style={{ margin: "0 0 6px" }}>
            Stato pagamento
          </p>
          <span className={payStatus.cls}>
            {payStatus.icon} {payStatus.label}
          </span>

          {item.payment.payment_deadline && (
            <p className="small muted" style={{ marginTop: 6 }}>
              Scadenza pagamento:{" "}
              <strong>{fmtDate(item.payment.payment_deadline)}</strong>
            </p>
          )}
          {item.payment.confirmed_at && (
            <p className="small muted" style={{ marginTop: 4 }}>
              Confermato il:{" "}
              <strong>{fmtDate(item.payment.confirmed_at)}</strong>
            </p>
          )}
          {item.payment.amount_eur && (
            <p className="small muted" style={{ marginTop: 4 }}>
              Importo confermato:{" "}
              <strong>{item.payment.amount_eur}€</strong>
            </p>
          )}
        </div>
      )}

      {/* Motivazione (collassata per non appesantire la lista) */}
      {item.motivation && (
        <details style={{ marginTop: 12 }}>
          <summary className="small muted" style={{ cursor: "pointer" }}>
            Vedi motivazione inviata
          </summary>
          <p className="small" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
            {item.motivation}
          </p>
        </details>
      )}

      {/* Azioni */}
      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>

        {/* Link alla challenge/evento se disponibile */}
        {item.challenge_slug && (
          <Link
            to={routes.dashboard.challengeLive(item.challenge_id)}
            className="btn btn-ghost btn-small"
          >
            📊 Segui l'impatto live
          </Link>
        )}

        {/* Ritiro candidatura — solo se pending_review */}
        {canWithdraw && (
          <button
            className="btn btn-outline btn-small"
            style={{ color: "var(--color-error, #c0392b)" }}
            disabled={withdrawing}
            onClick={() => onWithdraw(item.id)}
            aria-label={`Ritira candidatura per ${item.challenge_title || "questa sponsorizzazione"}`}
          >
            {withdrawing ? "Ritiro in corso…" : "Ritira candidatura"}
          </button>
        )}
      </div>

    </article>
  );
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

export default function MySponsorships() {
  const navigate = useNavigate();

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  // ── Fetch candidature ────────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMySponshorshipRequests();
      // La response può essere array diretto o { items }
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      // Ordino per data decrescente: le più recenti in cima
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setItems(list);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        "Errore nel caricamento delle candidature. Riprova tra qualche momento."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ── Ritiro candidatura ────────────────────────────────────────────────────
  const handleWithdraw = useCallback(async (id) => {
    const confirmed = window.confirm(
      "Sei sicuro di voler ritirare questa candidatura? L'operazione non è reversibile."
    );
    if (!confirmed) return;

    setWithdrawingId(id);
    try {
      await deleteSponsorshipRequest(id);
      // Rimuovo dalla lista locale senza refetch
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError("Puoi ritirare solo candidature ancora in attesa di revisione.");
      } else {
        setError("Errore nel ritiro della candidatura. Riprova.");
      }
    } finally {
      setWithdrawingId(null);
    }
  }, []);

  // ── Render: loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="page-section page-bg page-text">
        <div className="container">
          <div className="callout neutral">Caricamento candidature…</div>
        </div>
      </section>
    );
  }

  // ── Render principale ─────────────────────────────────────────────────────
  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">Le mie candidature</h1>
          <p className="page-subtitle">
            Monitora lo stato delle tue candidature di sponsorizzazione e dei
            relativi pagamenti.
          </p>
        </header>

        {/* Azioni rapide */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <Link
            to={routes.community.sponsorshipRequest()}
            className="btn btn-primary"
          >
            + Nuova candidatura
          </Link>
          <Link
            to={routes.community.sponsorEdit}
            className="btn btn-outline"
          >
            Il mio profilo sponsor
          </Link>
        </div>

        {/* Errore globale */}
        {error && (
          <div className="callout error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Lista vuota */}
        {!error && items.length === 0 && (
          <div className="callout neutral">
            <p>Non hai ancora inviato nessuna candidatura.</p>
            <Link
              to={routes.community.sponsorGuide}
              className="btn btn-outline"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Esplora le sfide che cercano sponsor
            </Link>
          </div>
        )}

        {/* Cards candidature */}
        {items.length > 0 && (
          <>
            {/* Riepilogo contatori */}
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              {[
                { label: "Totale",      count: items.length,                                      cls: "" },
                { label: "In revisione", count: items.filter(i => i.status === "pending_review").length, cls: "muted" },
                { label: "Approvate",   count: items.filter(i => i.status === "approved").length, cls: "success" },
                { label: "Non approvate", count: items.filter(i => i.status === "rejected").length, cls: "error" },
              ].map(({ label, count, cls }) => (
                <div
                  key={label}
                  className={`mini-box ${cls}`}
                  style={{ minWidth: 90, textAlign: "center" }}
                >
                  <div className="mini-value" style={{ fontSize: "1.4rem" }}>
                    {count}
                  </div>
                  <div className="mini-label">{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {items.map((item) => (
                <SponsorshipCard
                  key={item.id}
                  item={item}
                  onWithdraw={handleWithdraw}
                  withdrawing={withdrawingId === item.id}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
