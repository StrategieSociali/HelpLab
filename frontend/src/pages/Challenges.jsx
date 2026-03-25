/**
 * src/pages/Challenges.jsx
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
import { useTranslation } from 'react-i18next';
import { routes } from "@/routes";
import { useNavigate } from "react-router-dom";
import { api, API_PATHS } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { isJudge } from "@/utils/roles";
import SponsorshipBadge from "@/components/sponsors/SponsorshipBadge";

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
    sponsor_interest: c.sponsor_interest ?? false,
  };
};

export default function Challenges() {
  const { t } = useTranslation('pages/challenges', { useSuspense: false });
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth?.() || {};
  const isJudgeUser = isJudge(user?.role);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const challenges = items;

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
          t('errors.load')
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

  const formatBudget = (b) => {
    if (!b || typeof b.amount === 'undefined') return '—';
    return `${b.amount}${b.currency === 'EUR' ? '€' : ` ${b.currency}`}`;
  };

  const deadlineLabel = (d) =>
    d ? new Date(d).toLocaleDateString() : '—';

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

  return (
    <section className="page-section page-bg page-text">
      <div className="container">

        <header className="page-header">
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle" style={{ maxWidth: 760 }}>
            {t('subtitle')}
          </p>
        </header>

        <div className="filters-row" style={{ marginTop: 16 }}>
          <input
            type="search"
            className="control control-small control-pill"
            placeholder={t('filters.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="control control-small control-pill"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">{t('filters.sortRecent')}</option>
            <option value="title">{t('filters.sortTitle')}</option>
            <option value="deadline">{t('filters.sortDeadline')}</option>
          </select>
        </div>

        {loading && <div className="callout neutral">{t('status.loading')}</div>}
        {error && <div className="callout error">{error}</div>}

        <div className="grid-cards">
          {filteredChallenges.map((ch) => (
            <article key={ch.id} className="card ch-card glass">

              <div className="card-header">
                <div className="chip chip-status">
                  {ch.status === 'open' ? t('card.statusOpen') : ch.status}
                </div>
                {ch.type && <div className="chip chip-type">{ch.type}</div>}

                {/* Badge "Cerca sponsor" — visibile solo se il backend segnala
                    sponsor_interest === true. Cliccando porta alla guida
                    sponsorizzazioni senza interrompere il flusso volontario. */}
                {ch.sponsor_interest && (
                  <SponsorshipBadge
                    size="sm"
                    onClick={() => navigate(routes.community.sponsorGuide)}
                  />
                )}
              </div>

              <h3 className="card-title">{ch.title}</h3>

              <ul className="meta-list">
                {ch.location && (
                  <li><span>{t('card.location')}</span><span>{ch.location}</span></li>
                )}
                <li><span>{t('card.budget')}</span><span>{formatBudget(ch.budget)}</span></li>
                <li><span>{t('card.deadline')}</span><span>{deadlineLabel(ch.deadline)}</span></li>
              </ul>

              {ch.rules && <p className="card-description">{ch.rules}</p>}

              {ch.target && (
                <div className="target-box">
                  <div className="target-title">
                    {t('card.targetTitle')}
                  </div>
                  <div className="target-body">
                    {ch.target.kind === 'quantity' &&
                      <span>{ch.target.amount} {ch.target.unit}</span>}
                    {ch.target.kind === 'area' &&
                      <span>{ch.target.amount} {ch.target.unit || 'm²'}</span>}
                    {ch.target.kind === 'binary' &&
                      <span>{t('card.targetBinary')}</span>}
                    {ch.target.kind === 'composite' && (
                      <ul className="checklist">
                        {ch.target.items.slice(0, 4).map((it, i) => (
                          <li key={i}>• {it.label || it.id}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="muted small">
                    {t('card.targetNote')}
                  </div>
                </div>
              )}

              <div className="row two-col soft-gap">
                <div className="mini-box">
                  <div className="mini-label">{t('card.sponsor')}</div>
                  <div className="mini-value">{ch.sponsor?.name || '—'}</div>
                </div>
                <div className="mini-box">
                  <div className="mini-label">{t('card.judge')}</div>
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
                      {t('card.cta.participate')}
                    </button>

                    {!isJudgeUser && (
                      <button
                        className="btn btn-outline"
                        onClick={() => navigate(`${routes.me.contributions}?challenge=${encodeURIComponent(ch.id)}`)}
                      >
                        {t('card.cta.myContributions')}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate('/login')}
                  >
                    {t('card.cta.loginToJoin')}
                  </button>
                )}

                {/* Link dashboard live — visibile a tutti, loggati e non.
                    Gerarchia visiva bassa per non competere con le CTA
                    principali. Porta a /challenges/:id/live (pubblica). */}
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => navigate(routes.dashboard.challengeLive(ch.id))}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  📊 {t('card.cta.liveDashboard')}
                </button>
              </div>

              <div className="card-footer">
                <span className="small muted">
                  {t('card.lastUpdated')}{' '}
                  {ch.updatedAt
                    ? new Date(ch.updatedAt).toLocaleString()
                    : '—'}
                </span>
              </div>

            </article>
          ))}
        </div>

        {nextCursor && !loading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              className="btn btn-outline"
              onClick={() => fetchPage({ append: true })}
            >
              {t('pagination.loadMore')}
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
