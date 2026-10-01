// src/components/admin/PointsIntegrityButton.jsx
/**
 * PointsIntegrityButton.jsx
 * -------------------------
 * Controllo di integrità del registro punti, visibile senza doverlo lanciare
 * (decisione PM 17/9/2026, controlli non silenziosi). Un pulsante che mostra lo stato
 * già colorato (verde coerente, rosso con il numero di casi) e apre una finestra modale
 * con l'elenco e la riparazione.
 *
 * Il controllo è GLOBALE (tutte le sfide), per questo è un solo pulsante nella barra in
 * alto della pagina admin degli eventi e non uno per riga.
 *
 * PROPS:
 *   summary   {Object|null|undefined} - { ok, count, anomalies_count }; undefined = in
 *                                       caricamento, null = controllo non riuscito
 *   onSummary {Function}               - riceve il riassunto aggiornato dalla modale
 *
 * ENDPOINT: GET /admin/points-integrity, POST /admin/points-integrity/repair
 *
 * REGOLE DI CONTENUTO (confermate dal PM il 17/9):
 * - la riparazione ricalcola solo le DIVERGENZE di classifica;
 * - le ANOMALIE non si riparano con un ricalcolo: si mostrano come tali, ciascuna con
 *   che cosa si fa per uscirne, senza un pulsante che prometta di risolverle;
 * - riferimenti leggibili: titolo della sfida e nome della persona, non gli id.
 */

import React, { useEffect, useState } from "react";
import Modal from "@/components/UI/Modal";
import { getPointsIntegrity, repairPointsIntegrity } from "@/api/points.api";

// Che cosa vuol dire ogni anomalia e come se ne esce
const ANOMALY_TEXT = {
  approved_without_points: {
    label: "Approvato senza punti a registro",
    action: "Residuo di un percorso precedente: va guardato caso per caso.",
  },
  trust_left_pending: {
    label: "Rimasto in attesa in una sfida a fiducia",
    action: "La decisione automatica non è andata a buon fine: il contributo va deciso a mano.",
  },
  approved_zero_points: {
    label: "Approvato a zero punti dal motore",
    action: "Quasi sempre il task è configurato male. Se ne esce con un override del punteggio.",
  },
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

// Chi e dove, leggibile; l'id solo se il nome manca
function who(row) {
  const challenge = row.challenge_title || `sfida ${row.challenge_id}`;
  const person    = row.user_name || `utente ${row.user_id}`;
  return `${challenge} · ${person}`;
}

// Che cosa non torna in una divergenza di classifica
function divergenceDetail(d) {
  if (d.differs.includes("missing_row")) {
    return `Manca la riga di classifica (a registro: ${d.ledger_score} punti).`;
  }
  const parts = [];
  if (d.differs.includes("score")) {
    parts.push(`punteggio ${d.score} in classifica, ${d.ledger_score} a registro`);
  }
  if (d.differs.includes("verified_tasks_count")) {
    parts.push(`contributi verificati ${d.verified_tasks_count} in classifica, ${d.ledger_verified} a registro`);
  }
  if (d.differs.includes("last_event_at")) {
    parts.push("ora dell'ultimo contributo diversa (conta per lo spareggio)");
  }
  const text = parts.join("; ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

// «1 riga», «2 righe»: i conteggi a schermo sono spesso 1
const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const toSummary = (r) => ({ ok: r.ok, count: r.count, anomalies_count: r.anomalies_count });

// ── Pulsante ────────────────────────────────────────────────────────────────
export default function PointsIntegrityButton({ summary, onSummary }) {
  const [open, setOpen] = useState(false);

  let label, modifier;
  if (summary === undefined) {
    label = "Registro…";
    modifier = "unknown";
  } else if (summary === null) {
    label = "Registro: controllo non riuscito";
    modifier = "unknown";
  } else if (summary.ok) {
    label = "✓ Registro coerente";
    modifier = "ok";
  } else {
    label = `⚠ Registro: ${summary.count + summary.anomalies_count} da verificare`;
    modifier = "alert";
  }

  return (
    <>
      <button
        className={`btn btn-pill integrity-pill integrity-pill--${modifier}`}
        onClick={() => setOpen(true)}
        title="Controllo di integrità fra classifiche e registro dei punti, su tutte le sfide"
      >
        {label}
      </button>
      {open && <IntegrityModal onClose={() => setOpen(false)} onSummary={onSummary} />}
    </>
  );
}

// ── Finestra modale ─────────────────────────────────────────────────────────
function IntegrityModal({ onClose, onSummary }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [notice, setNotice]   = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await getPointsIntegrity();
      setReport(r);
      onSummary?.(toSummary(r));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Controllo non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const repair = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await repairPointsIntegrity();
      if (r.ok) setNotice(`Classifica ricalcolata dal registro: ${n(r.repaired, "riga sistemata", "righe sistemate")}.`);
      else setError(`Ricalcolo eseguito, ma ${r.after.length === 1 ? "resta 1 divergenza" : `restano ${r.after.length} divergenze`}. Va guardato a mano.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Ricalcolo non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const textStyle = { color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 };
  const listStyle = { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 };
  const itemStyle = {
    padding: "10px 12px", borderRadius: 8,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
  };
  const headStyle = { color: "#ffffff", fontSize: "1rem", fontWeight: 600, margin: 0 };
  const smallStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginTop: 4 };

  return (
    <Modal title="Registro dei punti" onClose={busy ? undefined : onClose}>
      {loading && !report && <p style={textStyle}>Controllo in corso…</p>}

      {!loading && !report && error && (
        <>
          <div className="card-info error" role="alert">{error}</div>
          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-primary" onClick={load} style={{ flex: 1 }}>Riprova</button>
            <button className="btn btn-ghost" onClick={onClose}>Chiudi</button>
          </div>
        </>
      )}

      {report && (
        <>
          {report.ok ? (
            <div className="card-info success">
              Registro coerente: le classifiche coincidono con il registro dei punti e non ci
              sono anomalie.
            </div>
          ) : (
            <p style={textStyle}>
              Controllo su tutte le sfide: {n(report.count, "riga di classifica", "righe di classifica")} da
              ricalcolare, {n(report.anomalies_count, "anomalia", "anomalie")} da guardare.
            </p>
          )}

          {notice && <div className="card-info success" role="status">{notice}</div>}
          {error && <div className="card-info error" role="alert">{error}</div>}

          {report.count > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={headStyle}>Classifica diversa dal registro ({report.count})</h3>
              <p style={smallStyle}>
                Si sistemano ricalcolando la classifica dal registro. Il registro non si tocca.
              </p>
              <ul style={listStyle}>
                {report.divergences.map((d) => (
                  <li key={`${d.challenge_id}-${d.user_id}`} style={itemStyle}>
                    <div style={{ color: "#ffffff", fontWeight: 500 }}>{who(d)}</div>
                    <div style={smallStyle}>{divergenceDetail(d)}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.anomalies_count > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={headStyle}>Anomalie ({report.anomalies_count})</h3>
              <p style={smallStyle}>
                Contributi il cui stato non torna col registro. Il ricalcolo non le sistema:
                ognuna dice che cosa fare.
              </p>
              <ul style={listStyle}>
                {report.anomalies.map((a) => {
                  const t = ANOMALY_TEXT[a.kind] || { label: a.kind, action: "" };
                  return (
                    <li key={`${a.kind}-${a.submission_id}`} style={itemStyle}>
                      <div style={{ color: "#ffffff", fontWeight: 500 }}>{t.label}</div>
                      <div style={smallStyle}>
                        {who(a)} · contributo {a.submission_id}
                        {a.since && ` · dal ${formatDate(a.since)}`}
                      </div>
                      {t.action && <div style={smallStyle}>{t.action}</div>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            {report.count > 0 && (
              <button
                className="btn btn-primary"
                onClick={repair}
                disabled={busy || loading}
                aria-busy={busy}
                style={{ flex: 1 }}
              >
                {busy ? "Ricalcolo in corso…" : "Ricalcola la classifica"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Chiudi
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
