import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Step – Assegna giudice (ADMIN)
 * - Lista: GET v1/challenges/unassigned?limit=20
 * - Assegna: POST v1/challenges/:id/assign-judge  { userId }
 */
export default function StepAssignJudge() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [selection, setSelection] = useState({}); // challengeId -> judge userId

  const load = async ({ append = false } = {}) => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("v1/challenges/unassigned", {
        params: { limit: 20, cursor: append ? cursor : undefined },
        headers,
      });
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => (append ? [...prev, ...list] : list));
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
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assign = async (challengeId) => {
    const userId = selection[challengeId];
    if (!userId) return alert("Inserisci l'ID di un giudice.");
    setBusy((b) => ({ ...b, [challengeId]: true }));
    try {
      await api.post(
        `v1/challenges/${challengeId}/assign-judge`,
        { userId },
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
      setItems((list) => list.filter((c) => c.id !== challengeId));
      setSelection((s) => {
        const copy = { ...s };
        delete copy[challengeId];
        return copy;
      });
      alert("Giudice assegnato ✅");
    } catch (err) {
      const st = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";
      if (st === 401) alert("Non autorizzato / sessione scaduta.");
      else if (st === 403) alert("Permessi insufficienti (admin richiesto).");
      else if (st === 404) alert("Challenge o utente non trovato.");
      else if (st === 409) alert("Conflitto: giudice già assegnato.");
      else alert(`Errore: ${msg}`);
      console.error("assign-judge error:", err);
    } finally {
      setBusy((b) => ({ ...b, [challengeId]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <div className="callout error">Permessi insufficienti (richiesto ruolo admin).</div>
    );
  }

  return (
    <div>
      <h3>Step: Assegna un giudice alle sfide</h3>

      {loading && <div className="callout neutral">Caricamento…</div>}
      {error && !loading && (
        <div className="callout error" style={{ marginBottom: 12 }}>
          {error} <button className="btn btn-small" onClick={() => load({ append: false })}>Riprova</button>
        </div>
      )}

      {items.length === 0 && !loading && (
        <p className="muted">Nessuna sfida senza giudice al momento.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((c) => (
          <li key={c.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 240px 120px", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.title || "(senza titolo)"}</div>
                <div className="muted small">
                  ID: {c.id} {c.location ? `• ${c.location}` : ""}{" "}
                  {c.deadline ? `• Scad.: ${new Date(c.deadline).toLocaleDateString()}` : ""}
                </div>
              </div>

              <input
                type="text"
                className="control control-small"
                placeholder="ID giudice"
                value={selection[c.id] || ""}
                onChange={(e) => setSelection((s) => ({ ...s, [c.id]: e.target.value.trim() }))}
              />

              <div style={{ textAlign: "right" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => assign(c.id)}
                  disabled={!!busy[c.id]}
                  aria-busy={!!busy[c.id]}
                >
                  Assegna
                </button>
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
  );
}

