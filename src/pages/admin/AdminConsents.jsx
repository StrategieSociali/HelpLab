// src/pages/admin/AdminConsents.jsx
/**
 * AdminConsents.jsx — «Consensi di una persona» (8a, passo 5, scelta 5)
 * ----------------------------------------------------------------------
 * Chi chiede conto dei propri dati scrive all'admin, che qui vede per quella
 * persona: ogni risposta ai consensi (sì, no, revoche, con il testo letto e la
 * versione) e ogni scaricamento dei contatti in cui è stata inclusa, con chi
 * l'ha fatto e quando. Si cerca per email o nickname esatti, oppure per id.
 *
 * Le pagine admin sono solo in italiano (scelta 5 del passo 3).
 *
 * ENDPOINT: GET /api/v1/admin/users/:chiave/consents
 */
import React, { useState } from "react";
import { getPersonConsents } from "@/api/events.api";

function quando(d) {
  return d ? new Date(d).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

// Una riga per risposta, dalla più vecchia. L'ora della risposta viene PRIMA,
// la revoca dopo (prova a schermo del 27/11/2026: con la revoca davanti la riga
// sembrava al contrario).
function risposta(c) {
  if (c.answer === "no") return `${quando(c.answered_at)} · No`;
  return c.revoked_at
    ? `${quando(c.answered_at)} · Sì · revocato il ${quando(c.revoked_at)}`
    : `${quando(c.answered_at)} · Sì`;
}

export default function AdminConsents() {
  const [chiave, setChiave] = useState("");
  const [dati, setDati] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function cerca(e) {
    e.preventDefault();
    if (!chiave.trim()) return;
    setBusy(true); setErr(""); setDati(null);
    try {
      setDati(await getPersonConsents(chiave.trim()));
    } catch (e2) {
      setErr(e2?.response?.status === 404
        ? "Nessuna persona con questa email, nickname o id."
        : e2?.response?.data?.error || "Ricerca non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section page-text">
      <div className="container space-y-6">
        <header>
          <h1 className="page-title">Consensi di una persona</h1>
          <p className="page-subtitle">
            Le risposte ai consensi di condivisione dei contatti e gli scaricamenti in cui la
            persona compare. Serve a rispondere a chi chiede conto dei propri dati.
          </p>
        </header>

        <form onSubmit={cerca} className="card glass" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: "1 1 260px", margin: 0 }}>
            <label htmlFor="persona">Email, nickname o id</label>
            <input id="persona" className="input" value={chiave} onChange={(e) => setChiave(e.target.value)} autoComplete="off" />
          </div>
          <button className="btn btn-primary submit-button" type="submit" disabled={busy || !chiave.trim()}>
            {busy ? "Ricerca…" : "Cerca"}
          </button>
        </form>

        {err && <div className="card-info error" role="alert">{err}</div>}

        {dati && (
          <>
            <div className="card glass">
              <h2 className="dynamic-subtitle">{dati.user.nickname || "(senza nickname)"}</h2>
              <p className="muted" style={{ margin: 0 }}>{dati.user.email} · id {dati.user.id}</p>
            </div>

            <div className="card glass">
              <h2 className="dynamic-subtitle">Risposte ({dati.consents.length}), dalla più vecchia</h2>
              {dati.consents.length === 0 ? (
                <p className="muted">Nessuna risposta.</p>
              ) : (
                <ul className="space-y-4" style={{ listStyle: "none", padding: 0 }}>
                  {dati.consents.map((c) => (
                    <li key={c.id}>
                      <strong>{c.event_name || `Evento ${c.event_id}`}</strong>
                      {" · "}{c.organization?.name ? `ente «${c.organization.name}»` : "nessun ente (testo generico, versione 1.0)"}
                      <br />
                      {risposta(c)} · testo versione {c.text_version}
                      {/* Il testo è quello letto dalla persona: sotto un «No» va detto
                          che non l'ha accettato, altrimenti «Acconsento…» inganna. */}
                      <p className="muted small" style={{ margin: "4px 0 0" }}>
                        <em>{c.answer === "no" ? "Testo letto e non accettato:" : "Testo accettato:"}</em> {c.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card glass">
              <h2 className="dynamic-subtitle">Scaricamenti in cui compare ({dati.exports.length})</h2>
              {dati.exports.length === 0 ? (
                <p className="muted">I suoi contatti non sono mai stati scaricati.</p>
              ) : (
                <ul className="space-y-4" style={{ listStyle: "none", padding: 0 }}>
                  {dati.exports.map((x) => (
                    <li key={`${x.export_id}-${x.consent_id}`}>
                      <strong>{x.event_name || `Evento ${x.event_id}`}</strong>
                      {" · "}{x.organization?.name ? `per «${x.organization.name}»` : "scaricamento dell'admin"}
                      <br />
                      {quando(x.exported_at)} · da {x.exported_by?.nickname || `utente ${x.exported_by?.id}`} · testo versione {x.text_version}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
