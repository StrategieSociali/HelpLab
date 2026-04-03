// src/pages/events/steps/StepEventChallenges.jsx
/**
 * StepEventChallenges.jsx
 * -----------------------
 * Step 2 del wizard di creazione evento.
 * Permette di collegare una o più challenge esistenti all'evento.
 *
 * PROPS:
 *   value    {Object}   - draft corrente (legge value.challengeIds)
 *   onChange {Function} - patch parziale sul draft
 *
 * LOGICA:
 * - Carica le challenge con status=open da GET /v1/challenges?status=open
 * - Il legame è N:N — una challenge può apparire in più eventi
 * - Il 409 da POST /events/:id/challenges = già collegata a QUESTO evento
 * - L'admin può aggiungere righe con "+ Aggiungi sfida" (UX a lista)
 * - Ogni riga ha una select + bottone rimuovi
 *
 * NOTA:
 * Questo step non fa chiamate API — raccoglie solo gli ID.
 * Le chiamate POST /events/:id/challenges le fa CreateEvent.jsx
 * dopo aver ottenuto l'id dell'evento appena creato.
 */

import React, { useEffect, useState } from "react";
import { api, API_PATHS } from "@/api/client";

export default function StepEventChallenges({ value = {}, onChange }) {
  const v   = value || {};
  const set = (patch) => onChange(patch);

  // Lista challenge disponibili (status=open, caricata una volta)
  const [available, setAvailable]   = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError]   = useState("");

  // Lista degli ID challenge selezionati — array di stringhe/numeri
  // Inizializzato dal draft o array vuoto
  const selectedIds = Array.isArray(v.challengeIds) ? v.challengeIds : [];

  // ── Carica challenge disponibili ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      setListError("");
      try {
        const { data } = await api.get(
          API_PATHS.challenges("?status=open&limit=50")
        );
        setAvailable(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setListError("Impossibile caricare le sfide. Riprova.");
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, []);

  // ── Aggiunge una riga vuota ─────────────────────────────────────────────
  function addRow() {
    set({ challengeIds: [...selectedIds, ""] });
  }

  // ── Aggiorna la selezione di una riga ───────────────────────────────────
  function updateRow(index, newId) {
    const copy = [...selectedIds];
    copy[index] = newId;
    set({ challengeIds: copy });
  }

  // ── Rimuove una riga ────────────────────────────────────────────────────
  function removeRow(index) {
    const copy = selectedIds.filter((_, i) => i !== index);
    set({ challengeIds: copy });
  }

  // Challenge già selezionate in altre righe (per evitare duplicati nella stessa select)
  function isAlreadySelected(id, currentIndex) {
    return selectedIds.some((sid, i) => i !== currentIndex && String(sid) === String(id));
  }

  return (
    <>
      <h3 className="dynamic-subtitle" style={{ marginBottom: 8 }}>
        2) Sfide dell'evento
      </h3>

      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", marginBottom: 16 }}>
        Collega le sfide esistenti a questo evento. Puoi aggiungerne altre
        anche dopo la creazione. Una sfida può appartenere a più eventi.
      </p>

      {/* Stato caricamento lista */}
      {loadingList && (
        <div className="callout neutral">Caricamento sfide disponibili…</div>
      )}
      {listError && (
        <div className="callout error">{listError}</div>
      )}

      {/* Lista righe di selezione */}
      {!loadingList && !listError && (
        <div className="dynamic-list" style={{ marginBottom: 16 }}>
          {selectedIds.length === 0 && (
            <div className="dynamic-empty" style={{ padding: "20px 0" }}>
              <div className="dynamic-empty__icon">🔗</div>
              <div className="dynamic-empty__text">
                Nessuna sfida collegata. Clicca "+ Aggiungi sfida" per iniziare.
              </div>
            </div>
          )}

          {selectedIds.map((selectedId, index) => {
            // Challenge selezionata in questa riga (per mostrare dettagli)
            const selected = available.find(
              (ch) => String(ch.id) === String(selectedId)
            );

            return (
              <div
                key={index}
                className="dynamic-item"
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                {/* Select sfida */}
                <div style={{ flex: 1 }}>
                  <select
                    className="control"
                    value={selectedId || ""}
                    onChange={(e) => updateRow(index, e.target.value)}
                    aria-label={`Sfida ${index + 1}`}
                  >
                    <option value="">Seleziona una sfida…</option>
                    {available.map((ch) => (
                      <option
                        key={ch.id}
                        value={ch.id}
                        disabled={isAlreadySelected(ch.id, index)}
                      >
                        {ch.title}
                        {ch.location ? ` — ${ch.location}` : ""}
                        {isAlreadySelected(ch.id, index) ? " (già selezionata)" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Info sfida selezionata */}
                  {selected && (
                    <div className="card-info neutral" style={{ marginTop: 6, fontSize: "0.85rem" }}>
                      {selected.deadline && (
                        <span>
                          Scadenza: {new Date(selected.deadline).toLocaleDateString("it-IT")}
                        </span>
                      )}
                      {selected.location && (
                        <span style={{ marginLeft: 12 }}>📍 {selected.location}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Rimuovi riga */}
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => removeRow(index)}
                  aria-label={`Rimuovi sfida ${index + 1}`}
                  style={{ flexShrink: 0, marginTop: 4 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottone aggiungi riga */}
      {!loadingList && !listError && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={addRow}
          disabled={available.length === 0}
        >
          + Aggiungi sfida
        </button>
      )}

      {/* Hint: step facoltativo */}
      <div className="hint" style={{ marginTop: 12 }}>
        {selectedIds.filter(Boolean).length === 0
          ? "Puoi procedere senza collegare sfide ora e farlo dopo dalla pagina dell'evento."
          : `${selectedIds.filter(Boolean).length} sfida${selectedIds.filter(Boolean).length > 1 ? " collegate" : " collegata"}.`}
      </div>
    </>
  );
}
