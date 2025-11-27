// src/components/JudgeSubmissionsList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import TextBlock from "@/components/UI/TextBlock";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function JudgeSubmissionsList() {
  const { token } = useAuth(); // ✅ corretto
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!token) {
      console.log("Nessun token disponibile, attendo...");
      return;
    }

    setLoading(true);
    axios
      .get(`${API_BASE}/v1/judge/my-queue`, { // ✅ endpoint corretto
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10 },
      })
      .then((res) => {
        console.log("Risposta ricevuta:", res.data);
        setItems(res.data.items || []);
      })
      .catch((e) => {
        console.error("Errore fetch judge submissions", e);
        setErr("Errore nel caricamento delle submission da revisionare.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <TextBlock>Caricamento…</TextBlock>;
  if (err) return <TextBlock>{err}</TextBlock>;
  if (items.length === 0) return <TextBlock>Nessuna submission da revisionare.</TextBlock>;

  return (
    <div className="space-y-4">
      <h2 className="page-title">Submission da moderare</h2>
      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.id} className="rounded-xl border p-4 space-y-1">
            <div>
              <strong>Challenge:</strong> {s.title || s.challenge?.title || `#${s.challengeId}`}
            </div>
            <div>
              <strong>Autore:</strong> {s.author?.name || "—"}
            </div>
            <div>
              <strong>Attività:</strong> {s.activity_description || "—"}
            </div>
            <div>
              <strong>Inviata il:</strong>{" "}
              {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
            </div>
            <div>
              <button
                className="btn btn-sm btn-outline mt-2"
                onClick={() => navigate(`/challenges/${s.challengeId}/submissions`)}
              >
                Vai alla sfida
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

