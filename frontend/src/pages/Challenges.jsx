import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from 'axios';

// === Env (una sola volta) ===
const API_URL = import.meta.env.VITE_API_URL;
const USE_API = import.meta.env.VITE_USE_API === 'true';

// Base API: aggiunge sempre /api ed evita doppi slash
const API_BASE = `${(API_URL || '').replace(/\/$/, '')}/api`;

export default function Challenges() {
  // Stato UI
  const [challenges, setChallenges] = useState([]);
  const [leaderboards, setLeaderboards] = useState({}); // { [id]: [{user,score}, ...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Anti-spam pulsanti
  const [busyJoin, setBusyJoin] = useState({});
  const [busySubmit, setBusySubmit] = useState({});
  
  // Filtri UX
const [query, setQuery]   = useState('');
const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'title' | 'deadline'
  

  // Auth opzionale (demo)
  const token  = localStorage.getItem('token') || null;
  const userId = Number(localStorage.getItem('userId') || 3);

  // Oggetti stabili per evitare loop
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );
  const axiosConfig = useMemo(
    () => (USE_API ? { headers: authHeaders } : undefined),
    [USE_API, authHeaders]
  );

  // URL helper (API vs JSON)
  const CH_LIST_URL        = USE_API ? `${API_BASE}/challenges` : '/data/challenges.json';
  const CH_LEADERBOARD_URL = (id)    => USE_API ? `${API_BASE}/challenges/${id}/leaderboard` : null;
  const CH_JOIN_URL        = (id)    => USE_API ? `${API_BASE}/challenges/${id}/join` : null;
  const CH_SUBMIT_URL      = (id)    => USE_API ? `${API_BASE}/challenges/${id}/submit` : null;

  // Per evitare richieste duplicate di leaderboard
  const prefetchedIdsRef = useRef(new Set());

  // Fetch lista sfide (esposta anche per “Riprova”)
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(CH_LIST_URL, axiosConfig);
      const list = Array.isArray(res.data) ? res.data : [];
      setChallenges(list);
    } catch (err) {
      console.error('Errore nel recupero sfide:', err);
      const status = err?.response?.status;
      setError(
        status === 429
          ? 'Troppe richieste. Attendi qualche secondo e ricarica.'
          : 'Errore nel caricamento delle sfide. Riprova più tardi.'
      );
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [CH_LIST_URL, axiosConfig]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Prefetch leaderboard per le sfide visibili (una volta per id)
  useEffect(() => {
    if (!USE_API || !challenges.length) return;

    const toLoad = challenges
      .map(ch => ch.id)
      .filter(id => !prefetchedIdsRef.current.has(id));

    if (!toLoad.length) return;

    (async () => {
      try {
        await Promise.all(
          toLoad.map(async (id) => {
            const { data } = await axios.get(CH_LEADERBOARD_URL(id), axiosConfig);
            prefetchedIdsRef.current.add(id);
            setLeaderboards(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
          })
        );
      } catch (err) {
        if (err?.response?.status === 429) {
          console.warn('Rate limit leaderboard: riprova più tardi');
        } else {
          console.warn('Prefetch leaderboard error:', err?.message || err);
        }
      }
    })();
  }, [USE_API, challenges, axiosConfig]);

  // Azioni (join/submit) con anti-spam
  const joinChallenge = async (id) => {
    if (busyJoin[id]) return;
    setBusyJoin(prev => ({ ...prev, [id]: true }));
    try {
      if (!USE_API) {
        const raw = localStorage.getItem('demo_ch_joins');
        const joins = raw ? JSON.parse(raw) : {};
        joins[id] = true;
        localStorage.setItem('demo_ch_joins', JSON.stringify(joins));
        alert('Partecipazione registrata (demo).');
        return;
      }
      await axios.post(CH_JOIN_URL(id), { userId }, axiosConfig);
      alert('Partecipazione registrata!');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        alert('Stai facendo troppe richieste. Attendi e riprova.');
      } else {
        alert('Errore durante la partecipazione. Riprova.');
      }
      console.error('Join error:', err);
    } finally {
      setTimeout(() => setBusyJoin(prev => ({ ...prev, [id]: false })), 1500);
    }
  };

  const submitResult = async (id, delta = 2, payload = {}) => {
    if (busySubmit[id]) return;
    setBusySubmit(prev => ({ ...prev, [id]: true }));
    try {
      if (!USE_API) {
        alert('Risultato inviato (demo).');
        return;
      }
      await axios.post(CH_SUBMIT_URL(id), { userId, delta, payload }, axiosConfig);
      const { data } = await axios.get(CH_LEADERBOARD_URL(id), axiosConfig);
      setLeaderboards(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
      alert('Punteggio aggiornato!');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        alert('Troppe richieste. Riprova fra qualche secondo.');
      } else {
        alert('Errore durante l’invio. Riprova.');
      }
      console.error('Submit error:', err);
    } finally {
      setTimeout(() => setBusySubmit(prev => ({ ...prev, [id]: false })), 1500);
    }
  };

  // Helpers
  const formatBudget = (b) => {
    if (!b || typeof b.amount === 'undefined') return '—';
    const curr = b.currency || 'EUR';
    return `${b.amount}${curr === 'EUR' ? '€' : ' ' + curr}`;
  };
  const deadlineLabel = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const getScoreboard = (ch) =>
    USE_API ? (leaderboards[ch.id] || ch.scoreboard || []) : (ch.scoreboard || []);
    
    //Genera lista filtrata
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
        ch.judge?.name
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

        {/* DEBUG DEV ONLY — commentato per la release */}
        {/*
        {import.meta.env.DEV && (
          <div style={{
            background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: 13
          }}>
            <strong>DEBUG</strong> – USE_API: {String(USE_API)} · CH_LIST_URL: <code>{CH_LIST_URL}</code>
          </div>
        )}
        */}

        <header className="page-header">
          <h1 className="page-title">Sfide della Community</h1>
          <p className="page-subtitle">Partecipa a sfide locali con obiettivi misurabili.</p>
        </header>

        {loading && <div className="callout neutral">Caricamento sfide…</div>}
        {error && !loading && (
          <div className="callout error">
            {error}{' '}
            <button className="btn btn-small" onClick={fetchChallenges}>Riprova</button>
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
                  <div className="mini-value">{ch.judge?.name || '—'}</div>
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
                <button
                  className="btn btn-primary"
                  disabled={!!busyJoin[ch.id]}
                  aria-busy={!!busyJoin[ch.id]}
                  onClick={() => joinChallenge(ch.id)}
                >
                  Partecipa (demo)
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!!busySubmit[ch.id]}
                  aria-busy={!!busySubmit[ch.id]}
                  onClick={() => submitResult(ch.id, 2, { note: 'azione demo' })}
                >
                  Invia risultato (+2)
                </button>
              </div>

              <div className="card-footer">
                <span className="small muted">
                  Aggiornata: {ch.updatedAt ? new Date(ch.updatedAt).toLocaleString() : '—'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

