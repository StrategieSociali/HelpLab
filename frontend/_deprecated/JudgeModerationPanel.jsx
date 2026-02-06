// src/components/JudgeModerationPanel.jsx DEPRECATO SOSTITUITO DA JudgeChallengeOverview.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TextBlock from "@/components/UI/TextBlock";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

function fmt(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

function ThumbStrip({ photos = [] }) {
  if (!Array.isArray(photos) || photos.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {photos.slice(0, 4).map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`evidenza ${i + 1}`}
          className="w-full h-24 object-cover rounded-xl border"
          loading="lazy"
        />
      ))}
    </div>
  );
}

export default function JudgeModerationPanel({ challengeId, token, pageSize = 10, className = "" }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      if (cursor) params.set("cursor", cursor);
      const url = `${API_BASE}/v1/challenges/${challengeId}/submissions?${params.toString()}`;
      const { data } = await axios.get(url, { headers });
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(prev => [...prev, ...list]);
      if (data.nextCursor) {
        setCursor(data.nextCursor);
      } else {
        setDone(true);
      }
    } catch (e) {
      console.error("Errore fetch submissions:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setDone(false);
  }, [challengeId]);

  useEffect(() => {
    if (challengeId) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  async function decide(subId, decision, points) {
    if (!token) {
      alert("Serve login come giudice/admin.");
      return;
    }
    try {
      const url = `${API_BASE}/v1/submissions/${subId}/review`;
      const body = points != null && points !== "" ? { decision, points: Number(points) } : { decision };
      await axios.patch(url, body, { headers: { ...headers, "Content-Type": "application/json" } });
      // aggiorna localmente
      setItems(prev =>
        prev.map(x =>
          x.id === subId
            ? { ...x, status: decision, reviewedAt: new Date().toISOString(), points: body.points ?? x.points }
            : x
        )
      );
    } catch (e) {
      console.error("Errore decisione:", e);
      alert("Errore decisione (vedi console).");
    }
  }

const pending = items.filter(
  x => !x.status || x.status === "pending" || x.status === "submitted"
);
const others = items.filter(
  x => x.status && x.status !== "pending" && x.status !== "submitted"
);

return (
  <div className={`space-y-8 ${className}`}>
    <section>
      <h3 className="page-subtitle">Da revisionare</h3>
      {pending.length === 0 ? (
        <TextBlock>Niente in attesa.</TextBlock>
      ) : (
        <ul className="space-y-3">
          {pending.map(sub => (
            <li key={sub.id} className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="page-subtitle">
                  <span className="font-medium">Autore:</span> {sub.author?.name || `user#${sub.author?.id ?? "?"}`}
                  <span className="mx-2">·</span>
                  <span className="font-medium">Inviata:</span> {fmt(sub.createdAt)}
                </div>
                <span className="text-xs px-2 py-1 rounded-full badge badge-pending">pending</span>
              </div>

          {/*    <ThumbStrip photos={sub.photos} /> rimossa temporaneamente */ }
              {sub.activity_description && (
                <TextBlock>{sub.activity_description}</TextBlock>
              )}
              
              {sub.payload?.evidences?.length > 0 && (
  <div className="space-y-1">
    <div className="text-sm font-medium">Evidenze fornite:</div>
    <ul className="list-disc pl-5 text-sm text-white/90">
      {sub.payload.evidences.map((ev, i) => (
        <li key={i}>
          {typeof ev === "string" && ev.startsWith("http") ? (
            <a
              href={ev}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-green-400"
            >
              {ev}
            </a>
          ) : (
            ev
          )}
        </li>
      ))}
    </ul>
  </div>
)}

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Punti"
                  className="w-24 rounded-xl border px-2 py-1 text-sm"
                  onChange={(e) => { sub.__points = e.target.value; }}
                />
                <button
                  className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-sm"
                  onClick={() => decide(sub.id, "approved", sub.__points)}
                >
                  Approva
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-sm"
                  onClick={() => decide(sub.id, "rejected")}
                >
                  Rifiuta
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>

    <section>
      <h3 className="page-subtitle">Componente deprecato</h3>
      <h3 className="page-subtitle">Revisionate</h3>
      {others.length === 0 ? (
        <TextBlock>Nessuna submission revisionata.</TextBlock>
      ) : (
        <ul className="space-y-3">
          {others.map(sub => {
            const badgeClass = sub.status === "approved"
              ? "badge badge-approved"
              : "badge badge-rejected";
            return (
              <li key={sub.id} className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="page-subtitle">
                    <span className="font-medium">Autore:</span> {sub.author?.name || `user#${sub.author?.id ?? "?"}`}
                    <span className="mx-2">·</span>
                    <span className="font-medium">Inviata:</span> {fmt(sub.createdAt)}
                    {sub.reviewedAt && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="font-medium">Rev.:</span> {fmt(sub.reviewedAt)}
                      </>
                    )}
                    {"points" in sub && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="font-medium">Punti:</span> {sub.points ?? "—"}
                      </>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>{sub.status}</span>
                </div>
                <ThumbStrip photos={sub.photos} />
                {sub.activity_description && (
                  <TextBlock>{sub.activity_description}</TextBlock>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>

    <div>
      {!done ? (
        <button
          onClick={loadMore}
          disabled={loading}
          className="px-4 py-2 rounded-2xl border shadow disabled:opacity-60"
        >
          {loading ? "Carico..." : "Carica altre"}
        </button>
      ) : items.length > 0 ? (
        <TextBlock>Fine elenco.</TextBlock>
      ) : null}
    </div>
  </div>
);
}

