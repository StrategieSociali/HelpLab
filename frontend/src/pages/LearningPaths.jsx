// src/pages/LearningPaths.jsx
// Vista demo con fallback ai JSON in /public/data/
// Alla prima API reale: imposta VITE_API_URL e i servizi chiameranno il backend.

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext";
import {
  fetchLearningPaths as lpFetch,
  fetchUserProgress as lpProgress,
  postProgress as lpPost,
} from "@/services/learningPathsService";
import { resetDemo } from "@/utils/demoStorage";

export default function LearningPaths() {
  const [paths, setPaths] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtri locali (opzionali, già pronti se vorrai esporli in UI)
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState(""); // 'base' | 'intermedio' | 'avanzato'
  const [sortBy, setSortBy] = useState("recent"); // 'recent' | 'title' | 'duration'

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const USE_API = import.meta.env.VITE_USE_API === 'true';

  // Usa header Authorization solo se c’è un token
  const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
const axiosConfig = USE_API ? { headers: authHeaders } : undefined;

// URL helper (sceglie API o JSON)
const LP_LIST_URL       = USE_API ? `${API_URL}/learning-paths` : '/data/learningpaths.json';
const LP_PROGRESS_URL   = (userId) => USE_API ? `${API_URL}/learning-paths/progress?userId=${userId}` : null;
const LP_MARK_DONE_URL  = (pathId) => USE_API ? `${API_URL}/learning-paths/${pathId}/progress` : null;

  // Recupera percorsi
  const fetchLearningPaths = useCallback(async () => {
  setLoading(true);
  setError('');
  try {
    const res = await axios.get(LP_LIST_URL, axiosConfig);
    // se API: array; se JSON: array (già coerente)
    setPaths(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error('Errore nel recupero dei percorsi:', err);
    setError("Errore nel caricamento dei percorsi. Riprova più tardi.");
  } finally {
    setLoading(false);
  }
}, [LP_LIST_URL, axiosConfig]);


  // Recupera progresso (demo: localStorage; API: /learning-paths/progress)
  const fetchUserProgress = useCallback(async () => {
  // Se non usiamo API, leggi dal localStorage (fallback demo)
  if (!USE_API) {
    const raw = localStorage.getItem('demo_lp_progress');
    const progress = raw ? JSON.parse(raw) : {};
    setUserProgress(progress);
    return;
  }

  try {
    const res = await axios.get(LP_PROGRESS_URL(user?.id ?? 0), axiosConfig);
    setUserProgress(res.data || {});
  } catch (err) {
    console.error('Errore progresso learning paths:', err);
    setUserProgress({});
  }
}, [USE_API, user, axiosConfig]);


  useEffect(() => {
    fetchLearningPaths();
    fetchUserProgress();
  }, [fetchLearningPaths, fetchUserProgress]);

  // Filtra/ordina
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
      if (sortBy === "title")
        return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "duration")
        return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da; // recenti prima
    });

    return list;
  }, [paths, query, level, sortBy]);

  // Aggiorna progresso di un modulo (demo → localStorage, reale → POST API)
  const updateProgress = async (pathId, moduleId) => {
  try {
    if (!USE_API) {
      // Fallback demo su localStorage
      const raw = localStorage.getItem('demo_lp_progress');
      const progress = raw ? JSON.parse(raw) : {};
      const current = new Set(progress[pathId] || []);
      current.add(moduleId);
      progress[pathId] = Array.from(current);
      localStorage.setItem('demo_lp_progress', JSON.stringify(progress));
      setUserProgress(progress);
      return;
    }

    // API reale
    await axios.post(LP_MARK_DONE_URL(pathId), { userId: user?.id, moduleId }, axiosConfig);
    // ricarica stato reale
    fetchUserProgress();
  } catch (err) {
    console.error('Errore aggiornamento progresso:', err);
    alert("Errore nell'aggiornamento del progresso. Riprova.");
  }
};


  const short = (t = "", max = 160) =>
    t.length > max ? t.slice(0, max - 1) + "…" : t;

  return (
    <div className="container page">
      {/* A. Header di pagina */}
      <div className="page-header">
        <h2 className="page-title">Percorsi di Apprendimento</h2>
        <div className="page-actions">
          <button
            className="btn btn-outline btn-pill"
            onClick={() => {
              resetDemo();
              fetchUserProgress();
            }}
          >
            Reimposta demo
          </button>
        </div>
      </div>

      {/* (facoltativo) filtri rapidi: lascio commentato, pronto se vuoi esporli
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Cerca…" value={query} onChange={(e)=>setQuery(e.target.value)} />
      </div> */}

      {loading ? (
        <p>Caricamento...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : filteredPaths.length === 0 ? (
        <p>Nessun percorso disponibile.</p>
      ) : (
        // C. Griglia di card
        <div className="grid-cards lp-grid">
          {/* B. Card pulite con meta, tag, barra di avanzamento */}
          {filteredPaths.map((path) => {
            const done = userProgress[path.id] || [];
            const total = path.modules?.length || 0;
            const doneCount = Array.isArray(done) ? done.length : 0;
            const pct = total ? Math.round((doneCount / total) * 100) : 0;

            return (
              <article key={path.id} className="card lp-card">
                <h3>{path.title}</h3>
                <p>{short(path.description)}</p>

                {/* meta */}
                <div className="lp-meta">
                  {path.level && <span>Livello: {path.level}</span>}
                  {typeof path.estimatedMinutes === "number" && (
                    <span>• {path.estimatedMinutes} min</span>
                  )}
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
                    <small style={{ color: "#64748b" }}>
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
                      ) : user ? (
                        <button
                          className="btn btn-small"
                          onClick={() => updateProgress(path.id, m.id)}
                        >
                          Completa
                        </button>
                      ) : (
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => navigate("/login")}
                        >
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
  );
}

