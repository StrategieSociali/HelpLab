// frontend/src/pages/LearningPaths.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { resetDemo } from "@/utils/demoStorage";
import { useAuth } from "@/context/AuthContext";
// (import { api } from "@/api/client";) // non necessario qui: usiamo axios con URL assoluti

// === Env ===
const API_URL  = import.meta.env.VITE_API_URL;
const USE_API  = import.meta.env.VITE_USE_API === "true";
const API_BASE = `${(API_URL || "").replace(/\/$/, "")}/api`;

export default function LearningPaths() {
  const [paths, setPaths] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtri UX
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const navigate = useNavigate();

  // ✅ Usa l’Auth context “ufficiale”
  const { user, isAuthenticated } = useAuth();
  const token  = user?.accessToken || user?.token || null; // compatibile con vecchie/nuove versioni
  const userId = isAuthenticated && user?.id ? user.id : null; // ← se non loggato: niente userId

  // Header Authorization SOLO se c’è il token
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );
  const axiosConfig = useMemo(
    () => (USE_API ? { headers: authHeaders } : undefined),
    [USE_API, authHeaders]
  );

  // Endpoints
  const LP_LIST_URL       = USE_API ? `${API_BASE}/learning-paths` : "/data/learningpaths.json";
  const LP_PROGRESS_URL   = (uid)    => (USE_API ? `${API_BASE}/learning-paths/progress?userId=${uid}` : null);
  const LP_MARK_DONE_URL  = (pathId) => (USE_API ? `${API_BASE}/learning-paths/${pathId}/progress` : null);

  // === Fetch: lista percorsi ==================================================
  const reloadPaths = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(LP_LIST_URL, axiosConfig);
      setPaths(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore nel recupero dei percorsi:", err);
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
  }, [LP_LIST_URL, axiosConfig]);

  useEffect(() => {
    reloadPaths();
  }, [reloadPaths]);

// === Fetch: progressi utente (semplificato, BE stabile) ==========
const loadProgress = useCallback(async () => {
  // Se non loggato, non chiamare (evita 400) e azzera localmente
  if (!userId) {
    setUserProgress({});
    return;
  }

  try {
    const { data } = await axios.get(LP_PROGRESS_URL(userId), axiosConfig);
    // BE garantisce { progress: {...} } (anche vuoto)
    setUserProgress(data?.progress ?? {});
  } catch (err) {
    // Errore inaspettato: fallback a {}
    console.error("LP progress error:", err?.response?.status || err?.message);
    setUserProgress({});
  }
}, [userId, axiosConfig]);

// Effettua UNA sola fetch quando cambia userId
useEffect(() => {
  loadProgress();
}, [loadProgress]);


  // KPI riassuntivi
  const stats = useMemo(() => {
    const totalPaths = paths.length;
    const totalModules = paths.reduce((sum, p) => sum + (p.modules?.length || 0), 0);
    const completedModules = paths.reduce(
      (sum, p) => sum + ((userProgress[p.id]?.length) || 0),
      0
    );
    const pct = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
    return { totalPaths, totalModules, completedModules, pct };
  }, [paths, userProgress]);

  // Filtri/ordinamento
  const filteredPaths = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = Array.isArray(paths) ? [...paths] : [];

    if (q) {
      list = list.filter((p) =>
        [p.title, p.description, ...(p.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (level) {
      list = list.filter((p) => (p.level || "").toLowerCase() === level);
    }
    list.sort((a, b) => {
      if (sortBy === "title")     return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "duration")  return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
    return list;
  }, [paths, query, level, sortBy]);

  // Marca modulo come completato
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
        // se non loggato: invito ad accedere
        navigate("/login");
        return;
      }

      await axios.post(LP_MARK_DONE_URL(pathId), { userId, moduleId }, axiosConfig);
      loadProgress(); // ricarica progressi
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        alert("Stai facendo troppe richieste. Attendi qualche secondo e riprova.");
      } else {
        alert("Errore nell'aggiornamento del progresso. Riprova.");
      }
      console.error("Errore updateProgress:", err?.response?.data || err.message);
    }
  };

  const short = (t = "", max = 160) => (t.length > max ? t.slice(0, max - 1) + "…" : t);

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* DEBUG (solo in dev) — lascia commentato in prod */}
        {/*
        {import.meta.env.DEV && (
          <div
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.2)",
              borderRadius: 8,
              padding: "6px 10px",
              marginBottom: 10,
              fontSize: 13,
            }}
          >
            <strong>DEBUG</strong> – USE_API: {String(USE_API)} · LP_LIST_URL: <code>{LP_LIST_URL}</code>
          </div>
        )}
        */}

        {/* Header pagina */}
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

        {/* KPI compatti */}
        <div className="hero-stats" style={{ justifyContent: 'flex-start', gap: '1rem', margin: '0 0 12px' }}>
          <div className="stat"><div className="stat-number">{stats.totalPaths}</div><div className="stat-label">Percorsi</div></div>
          <div className="stat"><div className="stat-number">{stats.totalModules}</div><div className="stat-label">Moduli</div></div>
          <div className="stat"><div className="stat-number">{stats.completedModules}</div><div className="stat-label">Completati</div></div>
          <div className="stat"><div className="stat-number">{stats.pct}%</div><div className="stat-label">Avanzamento</div></div>
        </div>

        {/* Filtri rapidi */}
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

                  {/* meta */}
                  <div className="lp-meta">
                    {path.level && <span>Livello: {path.level}</span>}
                    {typeof path.estimatedMinutes === "number" && <span>• {path.estimatedMinutes} min</span>}
                  </div>

                  {/* tag */}
                  {(path.tags || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {(path.tags || []).map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* progresso */}
                  {total > 0 && (
                    <div style={{ margin: "8px 0 12px" }}>
                      <div className="progress" aria-label={`Progresso ${pct}%`}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <small className="muted">
                        {doneCount}/{total} moduli completati
                      </small>
                    </div>
                  )}

                  {/* moduli */}
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

