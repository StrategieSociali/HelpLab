/**
 * Challenges.jsx
 * ----------------
 * Pagina pubblica che mostra le sfide attive della community.
 *
 * Obiettivi:
 * - Consentire a chiunque di esplorare le sfide disponibili
 * - Permettere ai volontari autenticati di partecipare
 * - Rendere trasparenti sponsor, giudici e obiettivi
 *
 * Nota:
 * Questo file è intenzionalmente conservativo.
 * La logica di fetch e normalizzazione NON è stata modificata.
 */

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef
} from 'react';
import { routes } from "@/routes";
import { useNavigate } from "react-router-dom";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { isJudge } from "@/utils/roles";

// --------------------------------------------------
// Helper: visualizzazione robusta del nome del giudice
// --------------------------------------------------
function getJudgeLabel(j) {
  if (!j) return "—";
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

// --------------------------------------------------
// Configurazione
// --------------------------------------------------
const PAGE_SIZE = 12;

// --------------------------------------------------
// Adapter: normalizza lo shape BE → UI
// --------------------------------------------------
const normalizeChallengeItem = (c) => {
  let judge =
    c.judge ??
    c.judgeUser ??
    c.judge_user ??
    c.judge_profile ??
    (c.judgeId ? { id: c.judgeId } : null);

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
    judge: judge ?? null,
    target: c.target ?? null,
    scoreboard: c.scoreboard ?? [],
    updatedAt: c.updatedAt,
  };
};

export default function Challenges() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth?.() || {};
  const isJudgeUser = isJudge(user?.role);

  // -------------------------
  // Stato
  // -------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Feed v1 con cursore
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const challenges = items;

  // -------------------------
  // Fetch sfide (LOGICA INVARIATA)
  // -------------------------
  const fetchPage = useCallback(
    async ({ append = false } = {}) => {
      setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams();
        q.set("limit", String(PAGE_SIZE));
        if (append && nextCursor) q.set("cursor", nextCursor);

        const { data } = await api.get(
          API_PATHS.challenges(`?${q.toString()}`)
        );

        const mapped = Array.isArray(data?.items)
          ? data.items.map(normalizeChallengeItem)
          : [];

        setItems(prev => (append ? [...prev, ...mapped] : mapped));
        setNextCursor(data?.nextCursor ?? null);
      } catch (err) {
        setError(
          err?.response?.data?.error ||
          err?.message ||
          "Errore nel caricamento"
        );
        setItems([]);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [nextCursor]
  );

  useEffect(() => {
    fetchPage({ append: false });
  }, [fetchPage]);

  // -------------------------
  // Helpers UI
  // -------------------------
  const formatBudget = (b) => {
    if (!b || typeof b.amount === 'undefined') return '—';
    return `${b.amount}${b.currency === 'EUR' ? '€' : ` ${b.currency}`}`;
  };

  const deadlineLabel = (d) =>
    d ? new Date(d).toLocaleDateString() : '—';

  // -------------------------
  // Filtri e ordinamento
  // -------------------------
  const filteredChallenges = useMemo(() => {
    let list = [...challenges];
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
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'deadline') {
      list.sort((a, b) =>
        new Date(a.deadline || 0) - new Date(b.deadline || 0)
      );
    } else {
      const ts = v =>
        new Date(v?.updatedAt || v?.createdAt || 0).getTime();
      list.sort((a, b) => ts(b) - ts(a));
    }

    return list;
  }, [challenges, query, sortBy]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">Le sfide della nostra community</h1>
          <p className="page-subtitle" style={{ maxWidth: 760 }}>
            Partecipa ad azioni concrete sul territorio, sostenute da
            organizzazioni e validate per garantire risultati reali
            e misurabili.
          </p>
        </header>

        {/* Filtri */}
        <div className="filters-row" style={{ marginTop: 16 }}>
          <input
            type="search"
            className="control control-small control-pill"
            placeholder="Cerca per luogo, tema o organizzazione…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="control control-small control-pill"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">Più recenti</option>
            <option value="title">Titolo A–Z</option>
            <option value="deadline">Scadenza</option>
          </select>
        </div>

        {/* Stato */}
        {loading && <div className="callout neutral">Caricamento sfide…</div>}
        {error && <div className="callout error">{error}</div>}

        {/* Cards */}
        <div className="grid-cards">
          {filteredChallenges.map((ch) => (
            <article key={ch.id} className="card ch-card glass">

              <div className="card-header">
                <div className="chip chip-status">
                  {ch.status === 'open' ? 'Aperta' : ch.status}
                </div>
                {ch.type && <div className="chip chip-type">{ch.type}</div>}
              </div>

              <h3 className="card-title">{ch.title}</h3>

              <ul className="meta-list">
                {ch.location && (
                  <li><span>Luogo</span><span>{ch.location}</span></li>
                )}
                <li><span>Budget</span><span>{formatBudget(ch.budget)}</span></li>
                <li><span>Scadenza</span><span>{deadlineLabel(ch.deadline)}</span></li>
              </ul>

              {ch.rules && <p className="card-description">{ch.rules}</p>}

              {ch.target && (
                <div className="target-box">
                  <div className="target-title">
                    Cosa serve per completare la sfida
                  </div>
                  <div className="target-body">
                    {ch.target.kind === 'quantity' &&
                      <span>{ch.target.amount} {ch.target.unit}</span>}
                    {ch.target.kind === 'area' &&
                      <span>{ch.target.amount} {ch.target.unit || 'm²'}</span>}
                    {ch.target.kind === 'binary' &&
                      <span>Completamento dell’attività</span>}
                    {ch.target.kind === 'composite' && (
                      <ul className="checklist">
                        {ch.target.items.slice(0, 4).map((it, i) => (
                          <li key={i}>• {it.label || it.id}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="muted small">
                    L’obiettivo serve a rendere il contributo verificabile.
                  </div>
                </div>
              )}

              <div className="row two-col soft-gap">
                <div className="mini-box">
                  <div className="mini-label">Sostenuta da</div>
                  <div className="mini-value">{ch.sponsor?.name || '—'}</div>
                </div>
                <div className="mini-box">
                  <div className="mini-label">Validata da</div>
                  <div className="mini-value">{getJudgeLabel(ch.judge)}</div>
                </div>
              </div>

              <div className="card-actions">
                {isAuthenticated ? (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/challenges/${ch.id}/submit`)}
                    >
                      Partecipa alla sfida
                    </button>

                    {!isJudgeUser && (
                      <button
                        className="btn btn-outline"
                        onClick={() => navigate(`${routes.dashboard.me.contributions}?challenge=${encodeURIComponent(ch.id)}`)}
                      >
                        I miei contributi
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate('/login')}
                  >
                    Accedi per partecipare
                  </button>
                )}
              </div>

              <div className="card-footer">
                <span className="small muted">
                  Ultimo aggiornamento:{' '}
                  {ch.updatedAt
                    ? new Date(ch.updatedAt).toLocaleString()
                    : '—'}
                </span>
              </div>

            </article>
          ))}
        </div>

        {/* Paginazione */}
        {nextCursor && !loading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              className="btn btn-outline"
              onClick={() => fetchPage({ append: true })}
            >
              Carica altri
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
