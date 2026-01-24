// src/api/judge.api.ts
import axios from "axios";
import {
  JudgeChallengesResponse,
  JudgeChallengeOverviewResponse,
} from "@/types/judge";

const API_BASE =
  (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "") + "/v1";

/* =========================
 * Headers helper
 * ========================= */

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/* =========================
 * Judge API
 * ========================= */

/**
 * Dashboard giudice
 * GET /judge/challenges
 */
export async function getJudgeChallenges(
  token: string
): Promise<JudgeChallengesResponse> {
  const { data } = await axios.get(
    `${API_BASE}/judge/challenges`,
    { headers: authHeaders(token) }
  );
  return data;
}

/**
 * Overview challenge assegnata al giudice
 * GET /judge/challenges/:id/overview
 */
export async function getJudgeChallengeOverview(
  token: string,
  challengeId: number
): Promise<JudgeChallengeOverviewResponse> {
  const { data } = await axios.get(
    `${API_BASE}/judge/challenges/${challengeId}/overview`,
    { headers: authHeaders(token) }
  );
  return data;
}

