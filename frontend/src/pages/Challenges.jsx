import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

export default function Challenges() {
  // === ENV / CONFIG ===
  const API_URL = import.meta.env.VITE_API_URL;
  const USE_API = import.meta.env.VITE_USE_API === 'true';

  // Token/utente opzionali (se hai un Auth reale li userai, altrimenti demo)
  const token = localStorage.getItem('token') || null;
  const userId = Number(localStorage.getItem('userId') || 0); // 0 = anonimo/demo

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const axiosConfig = USE_API ? { headers: authHeaders } : undefined;

  // URL helper
  const CH_LIST_URL = USE_API ? `${API_URL}/challenges` : '/data/challenges.json';
  const LP_LIST_URL = USE_API ? `${API_URL}/learning-paths` : '/data/learningpaths.json';
  const CH_LEADERBOARD_URL = (id) => USE_API ? `${API_URL}/challenges/${id}/leaderboard` : null;
  const CH_JOIN_URL        = (id) => USE_API ? `${API_URL}/challenges/${id}/join` : null;
  const CH_SUBMIT_URL      = (id) => USE_API ? `${API_URL}/challenges/${id}/submit` : null;

  // === STATE ===
  const [challenges, setChallenges] = useState([]);
  const [leaderboards, setLeaderboards] = useState({}); // { [challengeId]: [{user,score}, ...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // === FETCH LISTA SFIDE (API o JSON) ===
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(CH_LIST_URL, axiosConfig);
      // Normalizza: API -> array; JSON demo -> array
      const list = Array.isArray(res.data) ? res.data : [];
      setChallenges(list);
    } catch (err) {
      console.error('Errore nel recupero sfide:', err);
      setError("Errore nel caricamento delle sfide. Riprova più tardi.");
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [CH_LIST_URL, axiosConfig]);

  // Prefetch leaderboard (solo se USE_API, opzionale)
  const prefetchLeaderboards = useCallback(async (list) => {
    if (!USE_API) return; // nel JSON la scoreboard è già dentro l’oggetto sfida
    const toLoad = list.filter(ch => !leaderboards[ch.id]);
    if (!toLoad.length) return;

    // carica in parallelo, ignora errori
    await Promise.all(
      toLoad.map(ch =>
        axios.get(CH_LEADERBOARD_URL(ch.id), axiosConfig)
          .then(({ data }) => {
            const rows = Array.isArray(data) ? data : [];
            setLeaderboards(prev => ({ ...prev, [ch.id]: rows }));
          })
          .catch(() => {})
      )
    );
  }, [USE_API, leaderboards, axiosConfig]);

  useEffect(() => {
    (async () => {
      await fetchChallenges();
    })();
  }, [fetchChallenges]);

  useEffect(() => {
    if (challenges.length) prefetchLeaderboards(challenges);
  }, [challenges, prefetchLeaderboards]);

  // === HANDLERS: JOIN & SUBMIT (demo/API) ===
  const joinChallenge = async (id) => {
    try {
      if (!USE_API) {
        // DEMO: registra join localmente
        const raw = localStorage.getItem('demo_ch_joins');
        const joins = raw ? JSON.parse(raw) : {};
        joins[id] = true;
        localStorage.setItem('demo_ch_joins', JSON.stringify(joins));
        alert('Partecipazione registrata (demo).');
        return;
      }
      // API reale
      await axios.post(CH_JOIN_URL(id), { userId }, axiosConfig);
      alert('Partecipazione registrata!');
    } catch (err) {
      console.error('Join error:', err);
      alert('Errore durante la partecipazione. Riprova.');
    }
  };

  const submitResult = async (id, delta = 2, payload = {}) => {
    try {
      if (!USE_API) {
        alert('Risultato inviato (demo).');
        return;
      }
      const { data } = await axios.post(CH_SUBMIT_URL(id), { userId, delta, payload }, axiosConfig);
      // Aggiorna leaderboard “live”
      const { data: lb } = await axios.get(CH_LEADERBOARD_URL(id), axiosConfig);
      setLeaderboards(prev => ({ ...prev, [id]: Array.isArray(lb) ? lb : [] }));
      alert(data?.ok ? 'Punteggio aggiornato!' : 'Invio completato.');
    } catch (err) {
      console.error('Submit error:', err);
      alert('Errore durante l’invio. Riprova.');
    }
  };

  // === UI HELPERS ===
  const formatBudget = (b) => {
    if (!b || typeof b.amount === 'undefined') return '—';
    const curr = b.currency || 'EUR';
    return `${b.amount}${curr === 'EUR' ? '€' : ' ' + curr}`;
    // NB: i dati demo sono spesso 87 EUR -> "87€"
  };

  const deadlineLabel = (d) => d ? new Date(d).toLocaleDateString() : '—';

  const getScoreboard = (ch) => {
    // Se usiamo API e abbiamo la cache live, usa quella; altrimenti quella inclusa nell’oggetto.
    if (USE_API) return leaderboards[ch.id] || ch.scoreboard || [];
    return ch.scoreboard || [];
  };

  // === RENDER ===
  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">Sfide della Community</h1>
          <p className="page-subtitle">
            Partecipa a sfide locali con obiettivi chiari e risultati verificabili.
          </p>
        </header>

        {/* Stato caricamento / errore */}
        {loading && (
          <div className="callout neutral">Caricamento sfide…</div>
        )}
        {error && !loading && (
          <div className="callout error">{error}</div>
        )}

        {!loading && !error && challenges.length === 0 && (
          <div className="callout neutral">Nessuna sfida disponibile.</div>
        )}

        {/* GRID CARD SFIDE */}
        <div className="grid-cards">
          {challenges.map((ch) => (
            <article key={ch.id} className="card ch-card glass">
              {/* Header */}
              <div className="card-header">
                <div className="chip chip-status">{ch.status === 'open' ? 'Aperta' : ch.status}</div>
                {ch.type && <div className="chip chip-type">{ch.type}</div>}
              </div>

              {/* Titolo */}
              <h3 className="card-title">{ch.title}</h3>

              {/* Meta: luogo, budget, scadenza */}
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

              {/* Regole/descrizione breve */}
              {ch.rules && (
                <p className="card-description">{ch.rules}</p>
              )}

              {/* Target sintetico (se presente) */}
              {ch.target && (
                <div className="target-box">
                  <div className="target-title">Obiettivo</div>
                  <div className="target-body">
                    {/* Prova a sintetizzare alcune forme comuni */}
                    {ch.target.kind === 'quantity' && (
                      <span>{ch.target.amount} {ch.target.unit || ''}</span>
                    )}
                    {ch.target.kind === 'area' && (
                      <span>{ch.target.amount} {ch.target.unit || 'm²'}</span>
                    )}
                    {ch.target.kind === 'binary' && <span>Completamento</span>}
                    {ch.target.kind === 'composite' && Array.isArray(ch.target.items) && (
                      <ul className="checklist">
                        {ch.target.items.slice(0, 4).map((it, i) => (
                          <li key={i}>• {it.label || it.id}</li>
                        ))}
                      </ul>
                    )}
                    {!ch.target.kind && <span>—</span>}
                  </div>
                </div>
              )}

              {/* Sponsor/Judge */}
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

              {/* Scoreboard */}
              <div className="scoreboard">
                <div className="scoreboard-title">Classifica</div>
                <ul className="scoreboard-list">
                  {getScoreboard(ch).slice(0, 5).map((r, i) => (
                    <li key={i} className="score-row">
                      <span className="rank">#{i + 1}</span>
                      <span className="user">{r.user}</span>
                      <span className="score">{r.score}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="card-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => joinChallenge(ch.id)}
                  title="Iscriviti alla sfida (demo/API)"
                >
                  Partecipa (demo)
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => submitResult(ch.id, 2, { note: 'azione dimostrativa' })}
                  title="Invia un risultato demo (+2 pt)"
                >
                  Invia risultato (+2)
                </button>
              </div>

              {/* Aggiornamento */}
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

