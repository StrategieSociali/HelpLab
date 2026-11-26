// src/components/events/EventContactsBox.jsx
/**
 * EventContactsBox.jsx
 * --------------------
 * Nella pagina di un evento con un ente organizzatore (8a, passo 5):
 *
 * 1. Per chi ha fatto il login: «I tuoi contatti e «Ente»», con lo stato e il
 *    pulsante per cambiarlo (decisione E del 26/11/2026). Il testo del consenso
 *    arriva dal server ed è quello che si salva (decisione B). Dare il consenso si
 *    può solo a evento in corso; revocarlo sempre, anche a evento concluso.
 * 2. Per l'admin e i referenti dell'ente: «Scarica i contatti (CSV)» (decisione D).
 *    Ogni scaricamento resta registrato sul server.
 *
 * In un evento senza ente non mostra nulla: non c'è condivisione (scelta 6).
 * Le pagine degli eventi sono solo in italiano (scelta 5 del passo 3).
 */
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getEventConsent, answerEventConsent, revokeEventConsent, downloadEventContacts } from "@/api/events.api";
import { getMyOrganizations } from "@/api/organizations.api";

function data(d) {
  return d ? new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "";
}

export default function EventContactsBox({ eventId, eventSlug, eventStatus, organization }) {
  const { isAuthenticated, user } = useAuth();
  const [stato, setStato] = useState(null);
  const [puoScaricare, setPuoScaricare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !organization) return;
    let alive = true;
    getEventConsent(eventId)
      .then((s) => { if (alive) setStato(s); })
      .catch(() => {});
    if (user?.role === "admin") {
      setPuoScaricare(true);
    } else {
      getMyOrganizations()
        .then((items) => {
          const mio = items.find((o) => String(o.id) === String(organization.id));
          if (alive) setPuoScaricare(mio?.my_role === "referent");
        })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [isAuthenticated, eventId, organization, user?.role]);

  if (!isAuthenticated || !organization || !stato?.has_sharing) return null;

  async function rispondi(answer) {
    setBusy(true); setErr(""); setMsg("");
    try {
      const s = answer === "revoke" ? (await revokeEventConsent(eventId), await getEventConsent(eventId))
                                    : await answerEventConsent(eventId, answer);
      setStato(s);
      setMsg(answer === "yes" ? "Consenso registrato." : "Consenso revocato.");
    } catch (e) {
      setErr(e?.response?.data?.error || "Non è stato possibile salvare. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function scarica() {
    setBusy(true); setErr(""); setMsg("");
    try {
      await downloadEventContacts(eventId, `contatti_${eventSlug || eventId}.csv`);
    } catch (e) {
      setErr(e?.response?.status === 403
        ? "I contatti li scaricano solo i referenti dell'ente."
        : "Scaricamento non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  const ente = stato.organization?.name ?? organization.name;

  return (
    <div className="card glass ev-section">
      <h2 className="dynamic-subtitle ev-section__title">I tuoi contatti e «{ente}»</h2>

      {stato.state === "yes" ? (
        <p>
          Condividi nickname ed email con «{ente}» dal {data(stato.answered_at)}, per la gestione
          della tua partecipazione. Puoi revocare quando vuoi: da quel momento l'ente non li riceve più.
        </p>
      ) : (
        <>
          <p>
            {stato.state === "revoked"
              ? `Hai revocato il consenso il ${data(stato.revoked_at)}: «${ente}» non riceve i tuoi contatti.`
              : stato.state === "no"
                ? `Hai scelto di non condividere i tuoi contatti con «${ente}».`
                : `Non condividi i tuoi contatti con «${ente}».`}
          </p>
          <p className="muted small" style={{ margin: 0 }}>{stato.text}</p>
        </>
      )}

      {msg && <div className="card-info success" role="status">{msg}</div>}
      {err && <div className="card-info error" role="alert">{err}</div>}

      <div className="dynamic-actions">
        {stato.state === "yes" ? (
          <button className="btn btn-outline btn-small" onClick={() => rispondi("revoke")} disabled={busy}>
            Revoca il consenso
          </button>
        ) : eventStatus === "published" ? (
          <button className="btn btn-primary btn-small" onClick={() => rispondi("yes")} disabled={busy}>
            Acconsento
          </button>
        ) : null}
        {puoScaricare && (
          <button className="btn btn-ghost btn-small" onClick={scarica} disabled={busy}>
            Scarica i contatti (CSV)
          </button>
        )}
      </div>
    </div>
  );
}
