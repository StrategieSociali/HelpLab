import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";

/**
 * Step 2 – Assegna giudice alle sfide (admin)
 *
 * - Carica challenges reali (v1/challenges) e filtra judge === null
 * - Assegna con POST v1/judge/assign { challengeId, userId } (JWT admin)
 * - Nessuna lista giudici lato BE: input manuale dell'ID
 */
export default function StepAssignJudge({ token }) {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");
  // mappa: challengeId -> judgeId (string/number)
  const [selection, setSelection] = useState({});

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Sfide reali (v1), prima pagina ampia (50) e filtriamo lato FE
      const { data } = await api.get("v1/challenges", { params: { limit: 50 } });
      const all = Array.isArray(data?.items) ? data.items : [];
      const noJudge = all.filter((c) => !c.judge); // judge === null/undefined → nessun giudice
      setChallenges(noJudge);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Errore di caricamento";
      setError(msg);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assign = async (challengeId) => {
    const userId = selection[challengeId];
    if (!userId) {
      alert("Inserisci l'ID di un giudice.");
      return;
    }
    setBusy((b) => ({ ...b, [challengeId]: true }));
    try {
      // Endpoint definitivo BE:
      // POST /api/v1/judge/assign  { challengeId, userId }
      await api.post(
        "v1/judge/assign",
        { challengeId, userId },
        { headers: { ...headers, "Content-Type": "application/json" } }
      );

      // rimuovi localmente la sfida ora assegnata
      setChallenges((list) => list.filter((c) => c.id !== challengeId));
      setSelection((s) => {
        const copy = { ...s };
        delete copy[challengeId];
        return copy;
      });
      alert("Giudice assegnato ✅");
    } catch (err) {
      const st = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";
      if (st === 401) alert("Sessione scaduta/non autorizzato. Esegui di nuovo l’accesso.");
      else if (st === 403) alert("Permessi insufficienti: serve ruolo admin.");
      else if (st === 404) alert("Challenge o utente non trovato.");
      else if (st === 409) alert("Conflitto: giudice già assegnato.");
      else alert(`Errore: ${msg}`);
      console.error("Assign judge error:", err);
    } finally {
      setBusy((b) => ({ ...b, [challengeId]: false }));
    }
  };

  return (
    <div>
      <h3>Step 2: Assegna un giudice alle sfide</h3>

      {loading && <div className="callout neutral">Caricamento…</div>}
      {error && !loading && (
        <div className="callout error" style={{ marginBottom: 12 }}>
          {error}{" "}
          <button className="btn btn-small" onClick={fetchData}>Riprova</button>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row two-col">
          <div>
            <div className="mini-label">Sfide senza giudice</div>
            <div className="mini-value">{challenges.length}</div>
          </div>
          <div>
            <div className="mini-label">Assegnazioni</div>
            <div className="mini-value">Inserisci ID giudice e assegna</div>
          </div>
        </div>
      </div>

      {challenges.length === 0 && !loading && (
        <p className="muted">Nessuna sfida attiva senza giudice in questo momento.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {challenges.map((c) => (
          <li key={c.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 240px 120px", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.title || "(senza titolo)"}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  ID: {c.id} {c.location ? `• ${c.location}` : ""} {c.deadline ? `• Scad.: ${new Date(c.deadline).toLocaleDateString()}` : ""}
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
                  disabled={busy[c.id]}
                  aria-busy={!!busy[c.id]}
                  title="Assegna giudice"
                >
                  Assegna
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
          Aggiorna elenco
        </button>
      </div>
    </div>
  );
}

