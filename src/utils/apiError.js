// src/utils/apiError.js
/**
 * Traduce l'errore di una chiamata API nel messaggio da mostrare a chi sta usando
 * l'app.
 *
 * PERCHÉ ESISTE (B19)
 * Il backend, quando la validazione zod fallisce, risponde `400 { errors: { campo:
 * [messaggio, …] } }` — sa con precisione quale campo non va. Le pagine leggevano
 * però `data.error` al SINGOLARE, non lo trovavano e ricadevano su `err.message`,
 * cioè la stringa cruda di axios: «Request failed with status code 400». Chi crea
 * un evento si trovava bloccato senza sapere cosa correggere.
 *
 * È la stessa lezione della registrazione (B1/B2, 4/8): il backend distingue, il
 * frontend buttava via la distinzione.
 *
 * Ordine di lettura: errori per campo → `error`/`message` del BE → rete/HTTP →
 * fallback fornito da chi chiama.
 */

/** Etichette leggibili dei campi: il nome tecnico non si mostra mai a schermo. */
const FIELD_LABELS = {
  name: "Nome",
  description: "Descrizione",
  start_date: "Data inizio",
  end_date: "Data fine",
  location_address: "Luogo",
  logo_url: "Logo (URL)",
  consent_text: "Testo del consenso",
  challenge_id: "Sfida",
};

/**
 * @param {unknown} err        errore axios
 * @param {string}  fallback   messaggio se non si riesce a dire niente di meglio
 * @returns {string}
 */
export function apiErrorMessage(err, fallback = "Operazione non riuscita. Riprova.") {
  const res = err?.response;

  // 1. Errori di validazione per campo (400 dal BE)
  const fieldErrors = res?.data?.errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const parts = Object.entries(fieldErrors)
      .map(([field, msgs]) => {
        const label = FIELD_LABELS[field] || field;
        const first = Array.isArray(msgs) ? msgs[0] : msgs;
        return first ? `${label}: ${first}` : label;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }

  // 2. Messaggio esplicito del backend
  const beMsg = res?.data?.message || res?.data?.error;
  if (typeof beMsg === "string" && beMsg.trim()) return beMsg;

  // 3. Nessuna risposta = la richiesta non è mai arrivata (rete, CORS, server giù).
  //    Va detto esplicitamente che non dipende dai dati inseriti: all'evento, con
  //    WiFi condiviso e 4G saturo, è il caso più frequente (stessa scelta di B1).
  if (err && !res) {
    return "Non riesco a contattare il server: controlla la connessione e riprova. Non è un problema dei dati che hai inserito.";
  }

  if (res?.status === 429) {
    return "Troppe richieste in poco tempo. Aspetta qualche secondo e riprova.";
  }
  if (res?.status >= 500) {
    return "Il server ha avuto un problema. Riprova tra poco: non è colpa dei dati che hai inserito.";
  }

  return fallback;
}