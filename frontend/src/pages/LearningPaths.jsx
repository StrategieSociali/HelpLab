// frontend/src/pages/LearningPaths.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";                   // solo per fallback JSON
import { useNavigate } from "react-router-dom";
import { resetDemo } from "@/utils/demoStorage";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";          // API v0.4 (baseURL = VITE_API_URL)

const USE_API = import.meta.env.VITE_USE_API === "true";

export default function LearningPaths() {
  const [paths, setPaths] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtri UX
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent"); // recent | title | duration

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated && user?.id ? user.id : null;

  // === Fetch: lista percorsi ===
  const reloadPaths = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (USE_API) {
        const { data } = await api.get("learning-paths");
        setPaths(Array.isArray(data) ? data : []);
      } else {
        const { data } = await axios.get("data/learningpaths.json");
        setPaths(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Errore LP list:", err);
      const status = err?.response?.status;
      setError(
        status === 429
          ? "Troppe richieste. Attendi qualche secondo e ricarica."
          : "Errore nel caricamento dei percorsi. Riprova più tardi."
      );
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadPaths();
  }, [reloadPaths]);

  // === Fetch: progressi utente (solo se loggato) ===
  const loadProgress = useCallback(async () => {
    if (!userId) {
      setUserProgress({});
      return;
    }
    try {
      if (USE_API) {
        const { data } = await api.get("learning-paths/progress", { params: { userId } });
        setUserProgress(data?.progress ?? {});
      } else {
        const raw = localStorage.getItem("demo_lp_progress");
        setUserProgress(raw ? JSON.parse(raw) : {});
      }
    } catch (err) {
      console.warn("LP progress error:", err?.response?.status || err?.message);
      setUserProgress({});
    }
  }, [userId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // KPI riassuntivi
  const stats = useMemo(() => {
    const totalPaths = paths.length;
    const totalModules = paths.reduce((sum, p) => sum + (p.modules?.length || 0), 0);
    const completedModules = paths.reduce((sum, p) => sum + ((userProgress[p.id]?.length) || 0), 0);
    const pct = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
    return { totalPaths, totalModules, completedModules, pct };
  }, [paths, userProgress]);

  // Filtri + ordinamento
  const filteredPaths = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...paths];
    if (q) {
      list = list.filter((p) =>
        [p.title, p.description, ...(p.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "title")    return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "duration") return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
    return list;
  }, [paths, query, sortBy]);

  // Marca modulo come completato (protetto)
  const updateProgress = async (pathId, moduleId) => {
    try {
      if (!USE_API) {
        const raw = localStorage.getItem("demo_lp_progress");
        const progress = raw ? JSON.parse(raw) : {};
        const set = new Set(progress[pathId] || []);
        set.add(moduleId);
        progress[pathId] = Array.from(set);
        localStorage.setItem("demo_lp_progress", JSON.stringify(progress));
        setUserProgress(progress);
        return;
      }
      if (!userId) {
        navigate("/login");
        return;
      }
      await api.post(`learning-paths/${pathId}/progress`, { userId, moduleId });
      loadProgress();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) alert("Troppe richieste. Attendi e riprova.");
      else alert("Errore nell'aggiornamento del progresso. Riprova.");
      console.error("LP updateProgress:", err?.response?.data || err.message);
    }
  };

  const short = (t = "", max = 160) => (t.length > max ? t.slice(0, max - 1) + "…" : t);

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <h2 className="page-title">Percorsi di Apprendimento</h2>
          <div className="page-actions">
            <button
              className="btn btn-outline btn-pill"
              onClick={() => {
                resetDemo();
                loadProgress();
              }}
            >
              Reimposta demo
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="hero-stats" style={{ justifyContent: 'flex-start', gap: '1rem', margin: '0 0 12px' }}>
          <div className="stat"><div className="stat-number">{stats.totalPaths}</div><div className="stat-label">Percorsi</div></div>
          <div className="stat"><div className="stat-number">{stats.totalModules}</div><div className="stat-label">Moduli</div></div>
          <div className="stat"><div className="stat-number">{stats.completedModules}</div><div className="stat-label">Completati</div></div>
          <div className="stat"><div className="stat-number">{stats.pct}%</div><div className="stat-label">Avanzamento</div></div>
        </div>

        {/* Filtri */}
        <div className="filters-row">
          <input
            type="search"
            className="control control-small control-pill"
            placeholder="Cerca percorso o tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
          <select
            className="control control-small control-pill"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Ordina per"
          >
            <option value="recent">Più recenti</option>
            <option value="title">Titolo A–Z</option>
            <option value="duration">Durata</option>
          </select>
        </div>

        {/* Stato */}
        {loading ? (
          <div className="callout neutral">Caricamento corsi…</div>
        ) : error ? (
          <div className="callout error">
            {error}{" "}
            <button className="btn btn-small" onClick={reloadPaths}>Riprova</button>
          </div>
        ) : filteredPaths.length === 0 ? (
          <div className="callout neutral">Nessun percorso disponibile.</div>
        ) : (
          <div className="grid-cards lp-grid">
            {filteredPaths.map((path) => {
              const done = userProgress[path.id] || [];
              const total = path.modules?.length || 0;
              const doneCount = Array.isArray(done) ? done.length : 0;
              const pct = total ? Math.round((doneCount / total) * 100) : 0;

              return (
                <article key={path.id} className="card lp-card">
                  <h3 className="card-title">{path.title}</h3>
                  <p className="card-description">{short(path.description)}</p>

                  <div className="lp-meta">
                    {path.level && <span>Livello: {path.level}</span>}
                    {typeof path.estimatedMinutes === "number" && <span>• {path.estimatedMinutes} min</span>}
                  </div>

                  {(path.tags || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {(path.tags || []).map((t) => (
                        <span key={t} className="chip">{t}</span>
                      ))}
                    </div>
                  )}

                  {total > 0 && (
                    <div style={{ margin: "8px 0 12px" }}>
                      <div className="progress" aria-label={`Progresso ${pct}%`}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <small className="muted">{doneCount}/{total} moduli completati</small>
                    </div>
                  )}

                  <ul style={{ marginTop: 12 }}>
                    {(path.modules || []).map((m) => (
                      <li key={m.id} style={{ marginBottom: 6 }}>
                        {m.title}{" "}
                        {Array.isArray(done) && done.includes(m.id) ? (
                          <span>✅</span>
                        ) : isAuthenticated ? (
                          <button className="btn btn-small" onClick={() => updateProgress(path.id, m.id)}>
                            Completa
                          </button>
                        ) : (
                          <button className="btn btn-small btn-outline" onClick={() => navigate("/login")}>
                            Accedi per completare
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

