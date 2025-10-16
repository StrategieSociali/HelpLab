// src/pages/admin/AdminProposals.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const PAGE_SIZE = 20;

export function AdminProposals() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending_review");
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");

  const load = async ({ append = false } = {}) => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      q.set("status", status);
      q.set("limit", String(PAGE_SIZE));
      if (append && cursor) q.set("cursor", cursor);

      const { data } = await api.get(API_PATHS.adminProposals(`?${q.toString()}`));
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(prev => (append ? [...prev, ...list] : list));
      setCursor(data?.nextCursor ?? null);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Errore caricamento";
      setError(msg);
      setItems([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursor(null);
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const act = async (id, kind /* 'approve'|'reject' */, body = null) => {
    if (!isAdmin) return alert("Permessi insufficienti (admin).");
    setBusy(b => ({ ...b, [id]: true }));
    try {
      const url = kind === "approve" ? API_PATHS.approveProposal(id) : API_PATHS.rejectProposal(id);
      await api.patch(url, body);
      // ottimistic: rimuovi la riga dalla lista corrente
      setItems(list => list.filter(x => x.id !== id));
      alert(`Proposta ${kind === "approve" ? "approvata" : "respinta"} ✅`);
    } catch (err) {
      const st = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";
      if (st === 400 && /invalid status transition/i.test(msg)) {
        alert("Stato già aggiornato da un altro revisore.");
      } else if (st === 401) alert("Sessione scaduta/non autorizzato.");
      else if (st === 403) alert("Permessi insufficienti (admin richiesto).");
      else if (st === 404) alert("Proposta non trovata.");
      else alert(`Errore: ${msg}`);
      console.error("AdminProposals action error:", err);
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <h2>Dashboard Admin</h2>
          <div className="callout error">Permessi insufficienti (richiesto ruolo admin).</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section page-text admin-proposals">
      <div className="container">
        <div className="page-header">
          <h2 className="page-title">Proposte sfide</h2>
          <div className="page-actions" style={{ display: "flex", gap: 8 }}>
            <select
              className="control control-pill select--light"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending_review">In revisione</option>
              <option value="approved">Approvate</option>
              <option value="rejected">Respinte</option>
            </select>
            <button className="btn btn-outline btn-pill" onClick={() => load({ append: false })} disabled={loading}>
              Aggiorna
            </button>
          </div>
        </div>

        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && !loading && <div className="callout error">{error}</div>}

        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((p) => (
            <li key={p.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.title || "(senza titolo)"}</div>
                  <div className="muted small">
                    ID: {p.id} • Stato: {p.status} • {p.user ? `Utente #${p.user.id}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  {p.status === "pending_review" ? (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => act(p.id, "approve")}
                        disabled={!!busy[p.id]}
                      >
                        Approva
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          const reason = prompt("Motivo (opzionale):") || undefined;
                          act(p.id, "reject", reason ? { reason } : null);
                        }}
                        disabled={!!busy[p.id]}
                      >
                        Respingi
                      </button>
                    </>
                  ) : p.status === "approved" ? (
                    <span className="chip chip-status">Già approvata</span>
                  ) : (
                    <span className="chip chip-status">Respinta</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {cursor && !loading && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => load({ append: true })}>
              Carica altri
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

