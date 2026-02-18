import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const USE_API = (import.meta.env.VITE_USE_API || "true") === "true";

export default function LearningPaths() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [paths, setPaths] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // === Fetch: lista corsi / learning paths ===
  const loadPaths = useCallback(async () => {
    try {
      setError("");
      if (USE_API) {
        const { data } = await api.get("v1/learning-paths");
        setPaths(Array.isArray(data) ? data : []);
      } else {
        // fallback demo
        setPaths([]);
      }
    } catch (err) {
      console.error("LP list error:", err?.response || err);
      setError("Impossibile caricare i percorsi.");
      setPaths([]);
    }
  }, []);

  // === Fetch: progressi utente (solo se loggato) ===
  const loadProgress = useCallback(async () => {
    if (!userId) {
      setUserProgress({});
      return;
    }
    try {
      if (USE_API) {
        const { data } = await api.get("v1/learning-paths/progress");
        const obj =
          data && typeof data.progress === "object" && !Array.isArray(data.progress)
            ? data.progress
            : {};
        setUserProgress(obj);
      } else {
        const raw = localStorage.getItem("demo_lp_progress");
        setUserProgress(raw ? JSON.parse(raw) : {});
      }
    } catch (err) {
      console.warn("LP progress error:", err?.response?.status || err?.message);
      setUserProgress({});
    }
  }, [userId]);

  // inizializzazione
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPaths();
      await loadProgress();
      setLoading(false);
    })();
  }, [loadPaths, loadProgress]);

  // === Stats globali ===
  const stats = useMemo(() => {
    const totalPaths = paths.length;
    const totalModules = paths.reduce((sum, p) => sum + (p.modules?.length || 0), 0);
    const completedModules = paths.reduce((sum, p) => {
      const arr = userProgress[p.id];
      return sum + (Array.isArray(arr) ? arr.length : 0);
    }, 0);
    const pct = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
    return { totalPaths, totalModules, completedModules, pct };
  }, [paths, userProgress]);

  // === Helpers progress ===
  const hasDone = (pathId, moduleId) => {
    const arr = userProgress[pathId];
    return Array.isArray(arr) && arr.includes(moduleId);
  };

  const markLocalDone = (pathId, moduleId) => {
    setUserProgress(prev => {
      const next = { ...prev };
      const arr = Array.isArray(next[pathId]) ? [...next[pathId]] : [];
      if (!arr.includes(moduleId)) arr.push(moduleId);
      next[pathId] = arr;
      return next;
    });
  };

  // === Azione: completa modulo (ottimistico + POST idempotente) ===
  const completeModule = async (pathId, moduleId) => {
    if (!userId) {
      alert("Devi accedere per tracciare i progressi.");
      return;
    }
    if (hasDone(pathId, moduleId)) return; // già fatto

    // update ottimistico
    markLocalDone(pathId, moduleId);

    // POST idempotente
    try {
      setSaving(true);
      if (USE_API) {
        await api.post(`v1/learning-paths/${pathId}/progress`, { moduleId });
      } else {
        const raw = localStorage.getItem("demo_lp_progress");
        const obj = raw ? JSON.parse(raw) : {};
        const arr = Array.isArray(obj[pathId]) ? obj[pathId] : [];
        if (!arr.includes(moduleId)) arr.push(moduleId);
        obj[pathId] = arr;
        localStorage.setItem("demo_lp_progress", JSON.stringify(obj));
      }
      await loadProgress(); // riallineo dal server
    } catch (err) {
      console.error("LP save error:", err?.response || err);
      alert("Salvataggio progresso non riuscito. Riprova.");
      // rollback
      setUserProgress(prev => {
        const next = { ...prev };
        const arr = Array.isArray(next[pathId]) ? next[pathId].filter(id => id !== moduleId) : [];
        next[pathId] = arr;
        return next;
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <h1 className="page-title">Percorsi di apprendimento</h1>
          <p>Caricamento…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section page-text">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Percorsi di apprendimento</h1>

          {/* Badge statistiche globali */}
          <div className="chip" title={`${stats.completedModules}/${stats.totalModules} moduli`}>
            Completamento totale: {stats.pct}%
          </div>
        </div>

        {error && <div className="callout error" style={{ marginBottom: 12 }}>{error}</div>}

        {/* griglia dei percorsi */}
        <div className="lp-grid">
          {paths.map((p) => {
            const modules = Array.isArray(p.modules) ? p.modules : [];
            const doneCount = Array.isArray(userProgress[p.id]) ? userProgress[p.id].length : 0;
            const pct = modules.length ? Math.round((doneCount / modules.length) * 100) : 0;

            return (
              <article key={p.id} className="lp-card">
                <header className="lp-card__header">
                  <h2 className="lp-card__title">{p.title || "Percorso"}</h2>
                  {/* Badge per-card */}
                  <span className="chip" title={`${doneCount}/${modules.length} moduli`}>{pct}%</span>
                </header>

                {/* Progress bar per-card */}
                <div
                  style={{
                    margin: "6px 0 10px",
                    height: 8,
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 9999,
                    overflow: "hidden",
                  }}
                  aria-label={`Avanzamento ${pct}%`}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, rgba(34,197,94,1) 0%, rgba(16,185,129,1) 100%)",
                    }}
                  />
                </div>
                <small className="muted" style={{ display: "block", marginBottom: 8 }}>
                  {doneCount}/{modules.length} moduli completati
                </small>

                {p.description && <p className="lp-card__desc">{p.description}</p>}

                <ul className="lp-list">
                  {modules.map((m) => {
                    const done = hasDone(p.id, m.id);
                    return (
                      <li key={m.id} className={`lp-list__item ${done ? "is-done" : ""}`}>
                        <div className="lp-list__label">
                          {m.title || `Modulo ${m.id}`}
                          {done && <span className="pill success" style={{ marginLeft: 8 }}>Completato</span>}
                        </div>
                        <div className="lp-list__actions">
                          <button
                            className={`btn btn-small ${done ? "btn-outline" : "btn-primary"}`}
                            onClick={() => completeModule(p.id, m.id)}
                            disabled={done || saving}
                          >
                            {done ? "Fatto" : "Segna completato"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
