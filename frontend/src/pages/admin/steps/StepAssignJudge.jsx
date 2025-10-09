import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Step – Assegna giudice (ADMIN)
 * - Sfide senza giudice: GET  v1/challenges/unassigned?limit=20[&cursor=ISO]
 * - Lista giudici:       GET  v1/admin/judges?limit=50[&cursor=ISO]
 * - Assegna:             POST v1/challenges/:id/assign-judge  { userId }
 */
export default function StepAssignJudge() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // --- Sfide ---
  const [loadingCh, setLoadingCh] = useState(true);
  const [chError, setChError] = useState("");
  const [chItems, setChItems] = useState([]);
  const [chCursor, setChCursor] = useState(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // --- Giudici ---
  const [loadingJ, setLoadingJ] = useState(true);
  const [jError, setJError] = useState("");
  const [judges, setJudges] = useState([]);
  const [jCursor, setJCursor] = useState(null);
  const [judgeQuery, setJudgeQuery] = useState("");
  const [selectedJudgeId, setSelectedJudgeId] = useState(null);

  const [assignBusy, setAssignBusy] = useState(false);

  // === Load sfide ===
  const loadChallenges = useCallback(
    async ({ append = false } = {}) => {
      if (!isAdmin) return;
      setLoadingCh(true);
      setChError("");
      try {
        const { data } = await api.get("v1/challenges/unassigned", {
          params: { limit: 20, cursor: append ? chCursor : undefined },
          headers: authHeaders,
        });
        const list = Array.isArray(data?.items) ? data.items : [];
        setChItems(prev => (append ? [...prev, ...list] : list));
        setChCursor(data?.nextCursor ?? null);
        if (!append && !selectedChallengeId && list.length > 0) {
          setSelectedChallengeId(list[0].id);
        }
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || "Errore caricamento sfide";
        setChError(msg);
        setChItems([]);
        setChCursor(null);
      } finally {
        setLoadingCh(false);
      }
    },
    [isAdmin, chCursor, authHeaders, selectedChallengeId]
  );

  // === Load giudici ===
  const loadJudges = useCallback(
    async ({ append = false } = {}) => {
      if (!isAdmin) return;
      setLoadingJ(true);
      setJError("");
      try {
        const { data } = await api.get("v1/admin/judges", {
          params: { limit: 50, cursor: append ? jCursor : undefined },
          headers: authHeaders,
        });
        const list = Array.isArray(data?.items) ? data.items : [];
        setJudges(prev => (append ? [...prev, ...list] : list));
        setJCursor(data?.nextCursor ?? null);
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || "Errore caricamento giudici";
        setJError(msg);
        setJudges([]);
        setJCursor(null);
      } finally {
        setLoadingJ(false);
      }
    },
    [isAdmin, jCursor, authHeaders]
  );

  useEffect(() => {
    if (!isAdmin) return;
    loadChallenges({ append: false });
    loadJudges({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Ricerca locale giudici
  const filteredJudges = React.useMemo(() => {
    const q = judgeQuery.trim().toLowerCase();
    if (!q) return judges;
    return judges.filter(j => {
      const s = `${j?.username || ""} ${j?.email || ""} ${j?.id || ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [judgeQuery, judges]);

  // Checkbox esclusivo (si comporta come radio)
  const toggleJudgeChecked = (id) => {
    setSelectedJudgeId(curr => (curr === id ? null : id));
  };

  const assign = async () => {
    if (!selectedChallengeId) return alert("Seleziona una sfida.");
    if (!selectedJudgeId) return alert("Seleziona un giudice.");
    setAssignBusy(true);
    try {
      await api.post(
        `v1/challenges/${selectedChallengeId}/assign-judge`,
        { userId: Number(selectedJudgeId) },
        { headers: { ...authHeaders, "Content-Type": "application/json" } }
      );
      // Rimuovi la challenge assegnata e reset selezioni
      setChItems(list => list.filter(c => c.id !== selectedChallengeId));
      setSelectedChallengeId(null);
      setSelectedJudgeId(null);
      alert("Giudice assegnato ✅");
    } catch (err) {
      const st = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";
      if (st === 401) alert("Non autorizzato / sessione scaduta (401).");
      else if (st === 403) alert("Permessi insufficienti (admin richiesto).");
      else if (st === 404) alert("Challenge o utente non trovato.");
      else if (st === 409) alert("Giudice già assegnato a questa sfida.");
      else alert(`Errore: ${msg}`);
      console.error("assign-judge error:", err);
    } finally {
      setAssignBusy(false);
    }
  };

  if (!isAdmin) {
    return <div className="callout error">Permessi insufficienti (richiesto ruolo admin).</div>;
  }

  return (
    <div className="admin-assign-judge" style={{ display: "grid", gap: 12 }}>
      {/* SFIDE SENZA GIUDICE */}
      <div className="card" style={{ padding: 12 }}>
        <div className="row two-col soft-gap" style={{ alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Sfide senza giudice</h3>
          <div style={{ textAlign: "right" }}>
            {loadingCh ? (
              <span className="muted small">Caricamento…</span>
            ) : chError ? (
              <button className="btn btn-outline btn-small" onClick={() => loadChallenges({ append: false })}>
                Riprova
              </button>
            ) : chCursor ? (
              <button className="btn btn-outline btn-small" onClick={() => loadChallenges({ append: true })}>
                Carica altre
              </button>
            ) : (
              <span className="muted small">Elenco completo</span>
            )}
          </div>
        </div>

        {loadingCh && <div className="callout neutral" style={{ marginTop: 10 }}>Caricamento…</div>}
        {chError && !loadingCh && (
          <div className="callout error" style={{ marginTop: 10 }}>{chError}</div>
        )}

        {!loadingCh && !chError && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 10 }}>
            {chItems.length === 0 && (
              <li className="muted">Nessuna sfida senza giudice al momento.</li>
            )}
            {chItems.map((c) => (
              <li
                key={c.id}
                className="card"
                style={{
                  padding: 12,
                  marginBottom: 10,
                  border: selectedChallengeId === c.id ? "1px solid var(--accent-green-2)" : "1px solid rgba(255,255,255,.08)",
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr",
                    gap: 10,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="selectedChallenge"
                    checked={selectedChallengeId === c.id}
                    onChange={() => setSelectedChallengeId(c.id)}
                    aria-label={`Seleziona sfida ${c.title}`}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.title || "(senza titolo)"}</div>
                    <div className="muted small">
                      ID: {c.id}
                      {c.location ? ` • ${c.location}` : ""}
                      {c.deadline ? ` • Scad.: ${new Date(c.deadline).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* GIUDICI */}
      <div className="card" style={{ padding: 12 }}>
        <div className="row two-col soft-gap" style={{ alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Giudici disponibili</h3>
          <div style={{ textAlign: "right" }}>
            <input
              type="search"
              className="control control-small control-pill"
              placeholder="Cerca giudice per nome, email o ID…"
              value={judgeQuery}
              onChange={(e) => setJudgeQuery(e.target.value)}
              style={{ marginRight: 8 }}
            />
            {loadingJ ? (
              <span className="muted small">Caricamento…</span>
            ) : jError ? (
              <button className="btn btn-outline btn-small" onClick={() => loadJudges({ append: false })}>
                Riprova
              </button>
            ) : jCursor ? (
              <button className="btn btn-outline btn-small" onClick={() => loadJudges({ append: true })}>
                Carica altri
              </button>
            ) : (
              <span className="muted small">Elenco completo</span>
            )}
          </div>
        </div>

        {loadingJ && <div className="callout neutral" style={{ marginTop: 10 }}>Caricamento…</div>}
        {jError && !loadingJ && (
          <div className="callout error" style={{ marginTop: 10 }}>{jError}</div>
        )}

        {!loadingJ && !jError && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 10 }}>
            {filteredJudges.length === 0 && <li className="muted">Nessun giudice trovato.</li>}
            {filteredJudges.map((j) => (
              <li
                key={j.id}
                className="card"
                style={{
                  padding: 12,
                  marginBottom: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr 28px",
                  gap: 10,
                  alignItems: "center",
                  border: selectedJudgeId === j.id ? "1px solid var(--accent-green-2)" : "1px solid rgba(255,255,255,.08)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{j.username || `User #${j.id}`}</div>
                  <div className="muted small">ID: {j.id}{j.email ? ` • ${j.email}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <input
                    type="checkbox"
                    checked={selectedJudgeId === j.id}
                    onChange={() => toggleJudgeChecked(j.id)}
                    aria-label={`Seleziona giudice ${j.username || j.email || j.id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Azione finale */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          className="btn btn-primary"
          onClick={assign}
          disabled={assignBusy || !selectedChallengeId || !selectedJudgeId}
          aria-busy={assignBusy}
        >
          Assegna
        </button>
      </div>
    </div>
  );
}

