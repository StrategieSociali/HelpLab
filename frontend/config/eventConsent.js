// src/config/eventConsent.js
/**
 * Configurazione consensi GDPR per gli eventi HelpLab.
 *
 * REGOLA FONDAMENTALE (compliance GDPR):
 * Il testo dei consensi viene inviato verbatim al backend come `consent_text`.
 * Il BE lo cristallizza nel DB esattamente com'è — non mandare mai un booleano.
 *
 * AGGIORNARE IL TESTO:
 * 1. Modificare il campo `text` della voce interessata
 * 2. Incrementare `version` (es. "1.0" → "1.1")
 * 3. Nessuna modifica al DB richiesta
 */

export const EVENT_CONSENT = {
  version: "1.0",

  sharing: {
    text: "Acconsento alla comunicazione di nome, cognome ed email all'Organizzatore dell'evento al fine di gestire la mia partecipazione.",
    label: "Acconsento alla comunicazione dei miei dati all'organizzatore dell'evento.",
    description: "Se non selezioni questa casella, i tuoi contatti non saranno condivisi con l'organizzatore esterno.",
    required: false,
  },

  privacyUrl: "/privacy",
};
