import React, { useEffect, useState } from "react";
import {
  fetchChallenges,
  fetchLeaderboard,
  joinChallengeDemo,
  submitResultDemo,
} from "@/services/challengesService";

export default function Challenges() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const API_URL = import.meta.env.VITE_API_URL; // se c’è prova l’API, altrimenti JSON

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchChallenges(API_URL);
        const arr = Array.isArray(data) ? data : [];
        setList(arr);
        setSelected(arr[0]?.id ?? null);
      } catch (e) {
        console.error(e);
        setErr("Errore nel caricamento delle sfide.");
      } finally {
        setLoading(false);
      }
    })();
  }, [API_URL]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const lb = await fetchLeaderboard(API_URL, {}, selected);
        setLeaderboard(lb);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [API_URL, selected]);

  const join = async (id) => {
    await joinChallengeDemo(API_URL, {}, id);
    setLeaderboard(await fetchLeaderboard(API_URL, {}, id));
    alert("Iscritto alla sfida (demo).");
  };

  const submit = async (id) => {
    await submitResultDemo(API_URL, {}, id, 1);
    setLeaderboard(await fetchLeaderboard(API_URL, {}, id));
  };

  return (
    <div className="container page">
      <div className="page-header">
        <h2 className="page-title">Sfide della Community</h2>
      </div>

      {loading ? (
        <p>Caricamento…</p>
      ) : err ? (
        <p style={{ color: "salmon" }}>{err}</p>
      ) : list.length === 0 ? (
        <p>Nessuna sfida disponibile.</p>
      ) : (
        <div className="ch-layout">
          {/* Sidebar elenco sfide */}
          <aside className="ch-sidebar">
            {list.map((c) => (
              <button
                key={c.id}
                className={"btn ch-item " + (selected === c.id ? "" : "btn-outline")}
                onClick={() => setSelected(c.id)}
              >
                {c.title}
              </button>
            ))}
          </aside>

          {/* Dettaglio sfida */}
          <section>
            {list
              .filter((c) => c.id === selected)
              .map((c) => (
                <article key={c.id} className="card ch-card">
                  <h3>{c.title}</h3>

                  <p><strong>Regole:</strong> {c.rules}</p>
                  <p>
                    <small>
                      Scade il: {c.deadline} • Partecipanti: {c.participants}
                    </small>
                  </p>

                  <p>
                    <strong>Budget:</strong>{" "}
                    {c.budget ? `${c.budget.amount} ${c.budget.currency}` : "—"}
                    <br />
                    <strong>Sponsor:</strong> {c.sponsor?.name || "—"}
                    <br />
                    <strong>Giudice:</strong> {c.judge?.name || "—"}
                  </p>

                  {/* Obiettivo */}
                  {c.target?.kind === "quantity" && (
                    <p><strong>Obiettivo:</strong> {c.target.amount} {c.target.unit}</p>
                  )}
                  {c.target?.kind === "area" && (
                    <p><strong>Obiettivo:</strong> {c.target.amount} {c.target.unit} da coprire</p>
                  )}
                  {c.target?.kind === "binary" && (
                    <p><strong>Obiettivo:</strong> completare l’attività</p>
                  )}
                  {c.target?.kind === "composite" && (
                    <>
                      <p><strong>Obiettivo:</strong> completare i seguenti passaggi</p>
                      <ul>
                        {(c.target.items || []).map((it) => (
                          <li key={it.id}>{it.label}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn" onClick={() => join(c.id)}>
                      Partecipa (demo)
                    </button>
                    <button className="btn btn-outline" onClick={() => submit(c.id)}>
                      Invia risultato (demo)
                    </button>
                  </div>

                  <h4 style={{ marginTop: 16 }}>Classifica (demo)</h4>
                  <ol>
                    {leaderboard.map((r, i) => (
                      <li key={i}>
                        {r.user}: {r.score}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}

