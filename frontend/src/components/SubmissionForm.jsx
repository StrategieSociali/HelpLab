// src/components/SubmissionForm.jsx
import React, { useState } from "react";
import { api, API_PATHS } from "@/api/client";
import { useParams } from "react-router-dom";

export default function SubmissionForm({ onSuccess }) {
  const { id: challengeId } = useParams();
  const [form, setForm] = useState({ content: "", evidence_url: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post(API_PATHS.createSubmission(challengeId), form);
      onSuccess?.(data);
      setForm({ content: "", evidence_url: "" });
    } catch (err) {
      console.error(err);
      setError("Invio fallito. Controlla i dati e riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium">Descrizione attività</label>
        <textarea
          name="content"
          value={form.content}
          onChange={onChange}
          required
          className="w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Cosa hai fatto?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Link prova (immagine, documento)</label>
        <input
          name="evidence_url"
          value={form.evidence_url}
          onChange={onChange}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="https://..."
          type="url"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="bg-green-600 text-white px-4 py-2 rounded-xl disabled:opacity-60"
      >
        {busy ? "Invio in corso..." : "Invia submission"}
      </button>
    </form>
  );
}

