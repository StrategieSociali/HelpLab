// src/pages/SubmissionsOverview.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import TextBlock from "@/components/UI/TextBlock";
import { NavLink, useNavigate } from "react-router-dom";
import { isJudge } from "@/utils/roles";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export default function SubmissionsOverview() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const isJudgeUser = isJudge(user?.role);


useEffect(() => {
  if (!accessToken || !user?.id) return;

  const endpoint = isJudgeUser
    ? `${API_BASE}/v1/judge/submissions`
    : `${API_BASE}/v1/users/${user.id}/submissions`;

  axios
    .get(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } })
    .then((res) => {
      setSubmissions(res.data.items || res.data.submissions || []);
    })
    .catch((err) => console.error("Errore fetch submissions:", err))
    .finally(() => setLoading(false));
}, [accessToken, user, isJudgeUser]);


  if (!accessToken || !user) {
    return <TextBlock>Caricamento…</TextBlock>;
  }

  if (loading) return <TextBlock>Caricamento…</TextBlock>;

  if (!submissions.length) {
    return (
      <TextBlock>
        {isJudgeUser ? "Nessuna submission da moderare." : "Nessuna submission inviata."}
      </TextBlock>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="page-title">
        {isJudgeUser ? "Submission da moderare" : "Le mie submission"}
      </h2>

      {/* ✅ Solo per giudici: filtro stato */}
      {!isJudgeUser && (
        <div>
          <label htmlFor="status-filter" className="text-sm font-medium">
            Filtra per stato:
          </label>
          <select
            id="status-filter"
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tutti</option>
            <option value="pending">Da approvare</option>
            <option value="approved">Approvati</option>
            <option value="rejected">Rifiutati</option>
          </select>
        </div>
      )}

      <ul className="space-y-3">
        {submissions
          .filter((sub) => filterStatus === "all" || sub.status === filterStatus)
          .map((sub) => (
            <li key={sub.id} className="rounded-xl border p-4 space-y-2">
              <div>
                <strong>Sfida:</strong> {sub.challengeTitle || `#${sub.challengeId}`}
              </div>
              <div>
                <strong>Inviata:</strong>{" "}
                {new Date(sub.createdAt).toLocaleString()}
              </div>
              <div>
                <strong>Stato:</strong>{" "}
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    sub.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : sub.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {sub.status}
                </span>
                {sub.points != null && (
                  <> — <strong>Punti:</strong> {sub.points}</>
                )}
              </div>

              {sub.activity && (
                <p className="text-sm">{sub.activity}</p>
              )}

              {sub.evidences?.filter(Boolean).length > 0 && (
                <ul className="list-disc pl-5 text-sm">
                  {sub.evidences
                    .filter(Boolean)
                    .map((ev, idx) => (
                      <li key={idx}>{ev}</li>
                    ))}
                </ul>
              )}

              <NavLink
                to={`/challenges/${sub.challengeId}/submissions`}
                className="text-blue-600 underline text-sm"
              >
                Vai alla sfida
              </NavLink>

              {isJudgeUser && sub.status === "pending" && (
                <div className="pt-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      navigate(`/challenges/${sub.challengeId}/submissions`)
                    }
                  >
                    Modera
                  </button>
                </div>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}

