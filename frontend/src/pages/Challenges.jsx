import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import axios from 'axios';
import { isJudge } from "@/utils/roles";

// Helper per mostrare in modo robusto il nome del giudice
function getJudgeLabel(j) {
  if (!j) return "—";
  // Se arriva annidato come { user: {...} } estraiamolo
  if (j.user && typeof j.user === "object") j = j.user;

  if (typeof j === "string") return j;

  const fromEmail = (em) =>
    typeof em === "string" ? em.split("@")[0] : null;

  return (
    j.name ||
    j.username ||
    j.full_name ||
    fromEmail(j.email) ||
    (j.id ? `#${j.id}` : "—")
  );
}





// === Config ===
const PAGE_SIZE = 12;

// === Adapter: normalizza lo shape del BE v1 alle card esistenti ===
const normalizeChallengeItem = (c) => {
  // Prova varie forme comuni restituite dal BE
  let judge =
    c.judge ??
    c.judgeUser ??
    c.judge_user ??
    c.judge_profile ??
    (c.judgeId ? { id: c.judgeId } : null);

  // Se il BE annida dentro { user: {...} } portiamo su quell'oggetto
  if (judge && judge.user && typeof judge.user === 'object') {
    judge = judge.user;
  }

  return {
    id: c.id,
    slug: c.slug || c.id,
    title: c.title,
    type: c.type || "generic",
    location: c.location || null,
    rules: c.rules || "",
    deadline: c.deadline || null,
    status: c.status || "open",
    budget: c.budget ?? null,
    sponsor: c.sponsor ?? null,
    judge: judge ?? null,            // 👈 ora copriamo i vari shape
    target: c.target ?? null,
    scoreboard: c.scoreboard ?? [],
    updatedAt: c.updatedAt,
  };
};


// === Env (una sola volta) ===
const API_URL = import.meta.env.VITE_API_URL;               // es.: https://api.helplab.space/api
const USE_API = import.meta.env.VITE_USE_API === 'true';

// Usa VITE_API_URL così com’è (GIÀ con /api), niente /api aggiunto qui.
const API_BASE = (API_URL && API_URL.trim()
  ? API_URL.trim().replace(/\/+$/, '')
  : 'https://api.helplab.space/api');

// URL helper (API vs JSON legacy)
const CH_LEADERBOARD_URL = (id)    => USE_API ? `${API_BASE}/v1/challenges/${id}` : null;

export default function Challenges() {


  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth?.() || {};
  const userId = user?.id;

  // STATE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaderboards, setLeaderboards] = useState({});
  const [busyJoin, setBusyJoin] = useState({});
  const [busySubmit, setBusySubmit] = useState({});
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const isJudgeUser = isJudge(user?.role);


  // nuovo feed v1 (con paginazione a cursore)
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  // alias per non toccare il resto del render
  const challenges = items;

  // Per evitare richieste duplicate di leaderboard
  const prefetchedIdsRef = useRef(new Set());

  // Fetch lista sfide (GET pubblico, senza credenziali) — v1 con fallback legacy
  const fetchPage = useCallback(
    async ({ append = false } = {}) => {
      setLoading(true);
      setError("");
      try {
        // ✅ feed reale (proposals approvate)
       const q = new URLSearchParams();
	q.set("limit", String(PAGE_SIZE));
	if (append && nextCursor) q.set("cursor", nextCursor);
	const { data } = await api.get(API_PATHS.challenges(`?${q.toString()}`));

        const mapped = Array.isArray(data?.items)
          ? data.items.map(normalizeChallengeItem)
          : [];

        setItems(prev => (append ? [...prev, ...mapped] : mapped));
        setNextCursor(data?.nextCursor ?? null);
      } catch (err) {
        console.warn("Errore fetch /v1/challenges:", err);

        // 🔁 fallback automatico sul feed demo legacy (compat impegnata)
        try {
          const { data } = await api.get("challenges");
          setItems(Array.isArray(data) ? data : []);
          setNextCursor(null);
        } catch (err2) {
          setError(err2?.response?.data?.error || err2?.message || "Errore nel caricamento");
          setItems([]);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [nextCursor]
  );

  // Primo caricamento
  useEffect(() => {
    fetchPage({ append: false });
  }, [fetchPage]);

  // Helpers
  const formatBudget = (b) => {
    if (!b || typeof b.amount === 'undefined') return '—';
    const curr = b.currency || 'EUR';
    return `${b.amount}${curr === 'EUR' ? '€' : ' ' + curr}`;
  };
  const deadlineLabel = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const getScoreboard = (ch) =>
    USE_API ? (leaderboards[ch.id] || ch.scoreboard || []) : (ch.scoreboard || []);

  // Lista filtrata
  const filteredChallenges = useMemo(() => {
    let list = Array.isArray(challenges) ? [...challenges] : [];
    const q = query.trim().toLowerCase();

    if (q) {
     list = list.filter(ch =>
  [
    ch.title,
    ch.location,
    ch.rules,
    ch.type,
    ch.sponsor?.name,
    ch.judge?.name,
    ch.judge?.username,
    ch.judge?.email
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q)
);

    }

    if (sortBy === 'title') {
      list.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    } else if (sortBy === 'deadline') {
      list.sort((a,b) => new Date(a.deadline||0) - new Date(b.deadline||0));
    } else {
      // recenti prima: updatedAt/createdAt desc
      const ts = v => new Date(v?.updatedAt || v?.createdAt || 0).getTime();
      list.sort((a,b) => ts(b) - ts(a));
    }

    return list;
  }, [challenges, query, sortBy]);

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">Sfide della Community</h1>
          <p className="page-subtitle">Partecipa a sfide locali con obiettivi misurabili.</p>
        </header>

        {loading && <div className="callout neutral">Caricamento sfide…</div>}
        {error && !loading && (
          <div className="callout error">
            {error}{' '}
            <button className="btn btn-small" onClick={() => fetchPage({ append: false })}>
              Riprova
            </button>
          </div>
        )}
        {!loading && !error && challenges.length === 0 && (
          <div className="callout neutral">Nessuna sfida disponibile.</div>
        )}

        {/* Filtri rapidi */}
        <div className="filters-row">
          <input
            type="search"
            className="control control-small control-pill"
            placeholder="Cerca sfida…"
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
            <option value="deadline">Scadenza</option>
          </select>
        </div>

        <div className="grid-cards">
          {filteredChallenges.map((ch) => (
            <article key={ch.id} className="card ch-card glass">
              <div className="card-header">
                <div className="chip chip-status">{ch.status === 'open' ? 'Aperta' : ch.status}</div>
                {ch.type && <div className="chip chip-type">{ch.type}</div>}
              </div>

              <h3 className="card-title">{ch.title}</h3>

              <ul className="meta-list">
                {ch.location && (
                  <li>
                    <span className="meta-label">Luogo</span>
                    <span className="meta-value">{ch.location}</span>
                  </li>
                )}
                <li>
                  <span className="meta-label">Budget</span>
                  <span className="meta-value">{formatBudget(ch.budget)}</span>
                </li>
                <li>
                  <span className="meta-label">Scadenza</span>
                  <span className="meta-value">{deadlineLabel(ch.deadline)}</span>
                </li>
              </ul>

              {ch.rules && <p className="card-description">{ch.rules}</p>}

              {ch.target && (
                <div className="target-box">
                  <div className="target-title">Obiettivo</div>
                  <div className="target-body">
                    {ch.target.kind === 'quantity' && (<span>{ch.target.amount} {ch.target.unit || ''}</span>)}
                    {ch.target.kind === 'area' && (<span>{ch.target.amount} {ch.target.unit || 'm²'}</span>)}
                    {ch.target.kind === 'binary' && (<span>Completamento</span>)}
                    {ch.target.kind === 'composite' && Array.isArray(ch.target.items) && (
                      <ul className="checklist">
                        {ch.target.items.slice(0, 4).map((it, i) => <li key={i}>• {it.label || it.id}</li>)}
                      </ul>
                    )}
                    {!ch.target.kind && <span>—</span>}
                  </div>
                </div>
              )}

              <div className="row two-col soft-gap">
                <div className="mini-box">
                  <div className="mini-label">Sponsor</div>
                  <div className="mini-value">{ch.sponsor?.name || '—'}</div>
                </div>
                <div className="mini-box">
  <div className="mini-label">Giudice</div>
  <span className="mini-value">{getJudgeLabel(ch.judge)}</span>

</div>

              </div>

              <div className="scoreboard">
                <div className="scoreboard-title">Classifica</div>
                <ul className="scoreboard-list">
                  {getScoreboard(ch).slice(0, 5).map((r, i) => {
                    const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
                    return (
                      <li key={i} className="score-row">
                        <span className="rank">{medal || `#${i + 1}`}</span>
                        <span className="user">{r.user}</span>
                        <span className="score">{r.score}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

             <div className="card-actions">
  {isAuthenticated ? (
    <>

      {/* Pulsante invio risultato */}
<button
  className="btn btn-primary"
  onClick={() => navigate(`/challenges/${ch.id}/submit`)}
>
  Partecipa
</button>


      {/* Nuovo pulsante: link alle mie submission */}
{isAuthenticated && !isJudgeUser && (
  <button
    className="btn btn-outline"
    onClick={() => navigate(`/challenges/${ch.id}/submissions`)}
  >
    Le mie submission
  </button>
)}


    </>
  ) : (
    <button
      className="btn btn-outline"
      onClick={() => navigate('/login')}
      title="Accedi per partecipare alle sfide"
    >
      Accedi per partecipare
    </button>
  )}
</div>

<div className="card-footer">
  <span className="small muted">
    Aggiornata: {ch.updatedAt ? new Date(ch.updatedAt).toLocaleString() : '—'}
  </span>
</div>

            </article>
          ))}
        </div>

        {/* PAGINAZIONE */}
        {nextCursor && !loading && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => fetchPage({ append: true })}>
              Carica altri
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

