// src/components/ChallengeProgress.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TextBlock from "@/components/UI/TextBlock";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Props:
 * - challengeId (number|string)  → id della sfida
 * - metricKey (string)           → es. "kg_recycled" | "kwh_saved" | "km_sustainable" | "volunteer_hours"
 * - targetAmount (number)        → valore target della sfida
 * - token? (string)              → opzionale se serve autenticazione
 */
export default function ChallengeProgress({ challengeId, metricKey, targetAmount, token }) {
  const [total, setTotal] = useState(0);
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  useEffect(() => {
    let stop = false;
    async function loadAll() {
      let cursor = null;
      let sum = 0;
      while (!stop) {
        const params = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);
        const url = `${API_BASE}/v1/challenges/${challengeId}/submissions?${params.toString()}`;
        const { data } = await axios.get(url, { headers });
        const items = Array.isArray(data?.items) ? data.items : [];
        items.forEach(it => {
          const v = Number(it?.[metricKey] ?? 0);
          if (!Number.isNaN(v)) sum += v;
        });
        if (!data?.nextCursor) break;
        cursor = data.nextCursor;
      }
      if (!stop) setTotal(sum);
    }
    loadAll().catch(console.error);
    return () => { stop = true; };
  }, [challengeId, metricKey, headers]);

  const pct = targetAmount > 0 ? clamp01(total / targetAmount) : 0;

return (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="page-subtitle">
        <span className="font-medium">Progresso:</span> <span>{Math.round(pct * 100)}%</span>
      </div>
      <div className="page-subtitle">
        <span className="font-medium">Totale:</span> <span>{total}</span>
        {Number.isFinite(targetAmount) && targetAmount > 0 &&
          <> / <span>{targetAmount}</span></>
        }
      </div>
    </div>

    {/* Barra di avanzamento */}
    <div className="w-full h-3 rounded-full overflow-hidden bg-neutral-700">
      <div
        className="h-3 bg-primary"
        style={{ width: `${Math.round(pct * 100)}%` }}
        aria-label="progress"
      />
    </div>

    <TextBlock>
      Somma del campo <code>{metricKey}</code> dalle submission visibili.
    </TextBlock>
  </div>
);

}

