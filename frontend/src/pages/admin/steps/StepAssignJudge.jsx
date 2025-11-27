// src/pages/admin/steps/StepAssignJudge.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roles";

const PAGE_SIZE = 20;

export default function StepAssignJudge() {
  const { user } = useAuth();
  const isAdminUser = isAdmin(user?.role);

  const [unassigned, setUnassigned] = useState([]);
  const [judges, setJudges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!isAdminUser) return;
    setLoading(true);
    setError("");
    try {
      const { data: ch } = await api.get(API_PATHS.unassigned(`?limit=${PAGE_SIZE}`));
      const { data: ju } = await api.get(API_PATHS.adminJudges(`?limit=50`));
      setUnassigned(Array.isArray(ch?.items) ? ch.items : []);
      setJudges(Array.isArray(ju?.items) ? ju.items : []);
      if (!selectedChallengeId && ch?.items?.[0]?.id) setSelectedChallengeId(String(ch.items[0].id));
      if (!selectedJudgeId && ju?.items?.[0]?.id) setSelectedJudgeId(String(ju.items[0].id));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assign = async () => {
    if (!isAdmin) return alert("Permessi insufficienti (admin).");
    if (!selectedChallengeId || !selectedJudgeId) return alert("Seleziona sfida e giudice.");
    setBusy(true);
    try {
      await api.post(API_PATHS.assignJudge(selectedChallengeId), { userId: Number(selectedJudgeId) });
      alert("Giudice assegnato ✅");
      // aggiorna la lista sfide senza giudice (quella assegnata sparirà)
      await load();
    } catch (err) {
      const st = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Errore";
      if (st === 401) alert("Sessione scaduta/non autorizzato.");
      else if (st === 403) alert("Permessi insufficienti (admin richiesto).");
      else if (st === 404) alert("Sfida/utente non trovato.");
      else if (st === 409) alert("Conflitto: giudice già assegnato.");
      else alert(`Errore: ${msg}`);
      console.error("Assign judge error:", err);
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <h2>Assegna giudici</h2>
          <div className="callout error">Permessi insufficienti (admin richiesto).</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section page-text">
      <div className="container">
        <div className="page-header">
          <h2 className="page-title">Assegna giudici alle sfide</h2>
        </div>

        {loading && <div className="callout neutral">Caricamento…</div>}
        {error && !loading && <div className="callout error">{error}</div>}

        {!loading && !error && (
          <div className="card" style={{ padding: 12 }}>
            <div className="grid two">
              <div>
                <div className="muted small" style={{ marginBottom: 6 }}>Sfide senza giudice</div>
                <select
                  className="control control-pill select--dark"
                  value={selectedChallengeId || ""}
                  onChange={(e) => setSelectedChallengeId(e.target.value)}
                  style={{ width: "100%" }}
                >
                  {unassigned.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title} — {c.location || "—"} (ID {c.id})
                    </option>
                  ))}
                  {!unassigned.length && <option value="">(nessuna sfida disponibile)</option>}
                </select>
              </div>

              <div>
                <div className="muted small" style={{ marginBottom: 6 }}>Giudici disponibili</div>
                <select
                  className="control control-pill select--dark"
                  value={selectedJudgeId || ""}
                  onChange={(e) => setSelectedJudgeId(e.target.value)}
                  style={{ width: "100%" }}
                >
                  {judges.map((j) => (
                    <option key={j.id} value={String(j.id)}>
                      {j.username || j.email || `#${j.id}`}
                    </option>
                  ))}
                  {!judges.length && <option value="">(nessun giudice)</option>}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button className="btn btn-primary" onClick={assign} disabled={busy || !selectedChallengeId || !selectedJudgeId}>
                Assegna
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

