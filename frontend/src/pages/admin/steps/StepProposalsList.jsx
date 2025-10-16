import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";

const PAGE_SIZE = 20;

export default function StepProposalsList({ token, value, onChange }) {
  const [status, setStatus] = useState("pending_review"); // tabs: pending_review|approved|rejected
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null); // id proposta in azione
  const [error, setError] = useState("");

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const canApprove = (s) => s === "pending_review";
  const canReject  = (s) => s === "pending_review";

  const fetchPage = async ({ append = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/v1/challenge-proposals", {
        params: { status, limit: PAGE_SIZE, cursor: append ? nextCursor : undefined },
        headers,
      });
      const newItems = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Errore di caricamento";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reset lista al cambio tab
    setItems([]);
    setNextCursor(null);
    fetchPage({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleDecision = async (id, action, body) => {
    // controlli frontend rispetto alla state machine
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const current = items[idx];

    if (action === "approve" && !canApprove(current.status)) {
      return alert("Transizione non consentita: solo le proposte in attesa possono essere approvate.");
    }
    if (action === "reject" && !canReject(current.status)) {
      return alert("Transizione non consentita: solo le proposte in attesa possono essere rifiutate.");
    }

    // update ottimistico
    setBusyId(id);
    const old = current;
    const optimistic = { ...current, status: action === "approve" ? "approved" : "rejected" };
    setItems((prev) => prev.map((p) => (p.id === id ? optimistic : p)));

    try {
      const url = "/v1/challenge-proposals/" + id + "/" + action; // ⚠︎ niente leading slash
      const jsonBody = body ?? {}; // sempre JSON (anche vuoto)
      const { data } = await api.patch(url, jsonBody, {
      headers: { ...headers, "Content-Type": "application/json" },
      });

      // server conferma: opzionale riallineo con payload reale
      const newStatus = data?.status || optimistic.status;
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    } catch (err) {
      // rollback
      setItems((prev) => prev.map((p) => (p.id === id ? old : p)));

      const st = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";

      if (st === 400) {
        alert("Aggiornamento non applicabile: stato già cambiato da un altro revisore.");
      } else if (st === 401) {
        alert("Sessione scaduta o non autorizzato. Esegui di nuovo l’accesso.");
      } else if (st === 403) {
        alert("Permessi insufficienti: serve ruolo admin.");
      } else if (st === 404) {
        alert("Proposta non trovata.");
      } else if (st === 409) {
        alert("Conflitto: un altro revisore ha aggiornato prima di te.");
      } else {
        alert(`Errore: ${msg}`);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h3>Step 1: Proposte</h3>

      {/* Tabs stato */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["pending_review", "approved", "rejected"].map((s) => (
          <button
            key={s}
            className={`chip ${status === s ? "chip--active" : ""}`}
            onClick={() => setStatus(s)}
            disabled={loading && status !== s}
            title={s}
          >
            {s === "pending_review" ? "In attesa" : s === "approved" ? "Approvate" : "Rifiutate"}
          </button>
        ))}
      </div>

      {error && <div className="callout error" style={{ marginBottom: 12 }}>{error}</div>}
      {loading && items.length === 0 && <p>Caricamento…</p>}
      {!loading && items.length === 0 && <p>Nessuna proposta in questo stato.</p>}

      {/* Lista */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((p) => {
          const disabledApprove = !canApprove(p.status) || busyId === p.id;
          const disabledReject  = !canReject(p.status)  || busyId === p.id;

          return (
            <li key={p.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.title || "(senza titolo)"}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    ID: {p.id} • Utente: {p.user_id ?? "?"} • Stato: <strong>{p.status}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {p.status === "pending_review" && (
                    <>
                      <button
                        className="btn btn-success"
                        disabled={disabledApprove}
                        onClick={() => handleDecision(p.id, "approve")}
                        title="Approva"
                      >
                        {busyId === p.id ? "…" : "Approva"}
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={disabledReject}
                        onClick={() => {
                          const reason = prompt("Motivo (opzionale):");
                          handleDecision(p.id, "reject", reason ? { reason } : null);
                        }}
                        title="Rifiuta"
                      >
                        {busyId === p.id ? "…" : "Rifiuta"}
                      </button>
                    </>
                  )}

                  {p.status === "approved" && (
                    <button className="btn btn-outline" disabled title="Già approvata">
                      Approvata
                    </button>
                  )}

                  {p.status === "rejected" && (
                    <button className="btn btn-outline" disabled title="Già rifiutata">
                      Rifiutata
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Paginazione a cursore */}
      {nextCursor && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => fetchPage({ append: true })} disabled={loading}>
            Carica altri
          </button>
        </div>
      )}
    </div>
  );
}

