/**
 * ChallengeSubmitPage.jsx
 * ----------------------
 * Pagina di invio contributo da parte di un volontario.
 *
 * Scopo:
 * - Consentire al volontario di raccontare cosa ha fatto
 * - Collegare la submission a un task specifico della challenge
 * - Raccogliere evidenze minime verificabili
 * - Preparare i dati per la validazione del giudice
 *
 * Flusso:
 * 1. Carica i task della challenge
 * 2. Il volontario sceglie a quale task si riferisce il contributo
 * 3. Descrive l'attività e aggiunge evidenze
 * 4. Invia → il giudice approverà o rifiuterà
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { routes } from "@/routes";
import "../../styles/dynamic-pages.css";

export default function ChallengeSubmitPage() {
  const { id: challengeId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  // -------------------------
  // Stato: task della challenge
  // -------------------------
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");

  // -------------------------
  // Stato: form
  // -------------------------
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [evidences, setEvidences] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------
  // Caricamento task della challenge
  // -------------------------
  useEffect(() => {
    if (!challengeId) return;

    const loadTasks = async () => {
      setTasksLoading(true);
      setTasksError("");
      try {
        const { data } = await api.get(`v1/challenges/${challengeId}/tasks`);
        const list = Array.isArray(data) ? data : [];
        setTasks(list);
        if (list.length === 0) {
          setTasksError("Questa challenge non ha ancora task definiti.");
        }
      } catch (err) {
        console.error("Errore caricamento task:", err?.response || err);
        setTasksError("Impossibile caricare i task della challenge.");
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
  }, [challengeId]);

  // -------------------------
  // Gestione evidenze
  // -------------------------
  const handleEvidenceChange = (index, value) => {
    const updated = [...evidences];
    updated[index] = value;
    setEvidences(updated);
  };

  const handleAddEvidence = () => {
    setEvidences([...evidences, ""]);
  };

  // -------------------------
  // Invio contributo
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Devi essere autenticato per inviare un contributo.");
      return;
    }

    if (!selectedTaskId) {
      setError("Seleziona il task a cui si riferisce il tuo contributo.");
      return;
    }

    if (!activityDescription.trim()) {
      setError("Inserisci una breve descrizione dell'attività svolta.");
      return;
    }

    const filteredEvidences = evidences.filter((e) => e.trim() !== "");
    if (filteredEvidences.length === 0) {
      setError("Inserisci almeno un'evidenza del tuo contributo.");
      return;
    }

    setLoading(true);

    try {
      await api.post(`v1/challenges/${challengeId}/submissions`, {
        task_id: Number(selectedTaskId),
        visibility: "participants",
        activity_description: activityDescription,
        payload: { evidences: filteredEvidences },
      });

      navigate(`${routes.me.contributions}?challenge=${challengeId}`);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Invio non riuscito. Riprova tra qualche istante.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <section className="page-section page-text">
      <div className="container space-y-6">
        {/* Titolo */}
        <header>
          <h1 className="page-title">Invia il tuo contributo</h1>
          <p className="page-subtitle">
            Scegli il task a cui si riferisce la tua attività, raccontaci
            cosa hai fatto e inserisci almeno un'evidenza. Il contributo
            sarà validato da un giudice per garantire correttezza e
            trasparenza.
          </p>
        </header>

        {/* Errori */}
        {error && (
          <div className="callout error" role="alert">
            {error}
          </div>
        )}

        {/* Caricamento task */}
        {tasksLoading && (
          <div className="callout neutral">Caricamento task della challenge…</div>
        )}

        {tasksError && !tasksLoading && (
          <div className="callout error">{tasksError}</div>
        )}

        {/* Form — mostrato solo se ci sono task disponibili */}
        {!tasksLoading && tasks.length > 0 && (
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="form-grid">
                {/* SELEZIONE TASK */}
                <div className="form-group">
                  <label htmlFor="taskSelect">
                    A quale obiettivo si riferisce il tuo contributo?
                  </label>

                  <select
                    id="taskSelect"
                    className="control"
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    required
                  >
                    <option value="">Seleziona un task…</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || `Task #${t.id}`}
                      </option>
                    ))}
                  </select>

                  <div className="hint">
                    Ogni contributo deve essere collegato a uno degli
                    obiettivi della challenge.
                  </div>

                  {/* Mostra descrizione del task selezionato */}
                  {selectedTaskId && (() => {
                    const selected = tasks.find(
                      (t) => String(t.id) === String(selectedTaskId)
                    );
                    return selected?.description ? (
                      <div
                        className="callout neutral"
                        style={{ marginTop: 8, padding: 10 }}
                      >
                        <small className="muted">{selected.description}</small>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* DESCRIZIONE ATTIVITÀ */}
                <div className="form-group">
                  <label htmlFor="activityDescription">Cosa hai fatto</label>

                  <textarea
                    id="activityDescription"
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    placeholder="Descrivi brevemente l'attività svolta"
                    required
                  />

                  <div className="hint">
                    Spiega in modo semplice e concreto cosa hai fatto. Non
                    serve un linguaggio tecnico.
                  </div>
                </div>

                {/* EVIDENZE */}
                <div className="form-group">
                  <label>Evidenze del contributo</label>

                  <div className="space-y-2">
                    {evidences.map((evidence, index) => (
                      <input
                        key={index}
                        type="text"
                        placeholder="Link, riferimento o breve descrizione"
                        value={evidence}
                        onChange={(e) =>
                          handleEvidenceChange(index, e.target.value)
                        }
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ marginTop: 8 }}
                    onClick={handleAddEvidence}
                  >
                    + Aggiungi un'altra evidenza
                  </button>

                  <div className="hint" style={{ marginTop: 8 }}>
                    Può essere una foto, un link, un documento o una breve
                    descrizione. Serve solo a dimostrare che l'attività è
                    stata svolta.
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div
                className="cta-row"
                style={{
                  marginTop: 24,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? "Invio in corso…" : "Invia contributo"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
