// src/api/judge.api.ts
/**
 * Scopo: API layer per l'area giudice
 *
 * Supporta:
 * - dashboard giudice
 * - overview operativa challenge
 * - moderazione submission (approve / reject)
 *
 * Allineato a BE v1.0 (no legacy)
 */

import axios from "axios";
import {
  JudgeChallengesResponse,
  JudgeChallengeOverviewResponse,
} from "@/types/judge";

const API_BASE =
  (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "") + "/v1";

/* =========================
 * Helpers
 * ========================= */

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/* =========================
 * Dashboard giudice
 * ========================= */

/**
 * GET /api/v1/judge/challenges
 * Dashboard principale giudice
 */
export async function getJudgeChallenges(
  token: string
): Promise<JudgeChallengesResponse> {
  const { data } = await axios.get<JudgeChallengesResponse>(
    `${API_BASE}/judge/challenges`,
    { headers: authHeaders(token) }
  );
  return data;
}

/* =========================
 * Overview challenge
 * ========================= */

/**
 * GET /api/v1/judge/challenges/:id/overview
 * Vista operativa challenge
 */
export async function getJudgeChallengeOverview(
  token: string,
  challengeId: number
): Promise<JudgeChallengeOverviewResponse> {
  const { data } = await axios.get<JudgeChallengeOverviewResponse>(
    `${API_BASE}/judge/challenges/${challengeId}/overview`,
    { headers: authHeaders(token) }
  );
  return data;
}

/* =========================
 * Moderazione submission
 * ========================= */

export type ReviewDecision = "approved" | "rejected";

export interface ReviewSubmissionPayload {
  decision: ReviewDecision;
  task_id: number;
  points?: number;
  note?: string;
}

/**
 * POST /api/v1/submissions/:id/review
 * Approva / rifiuta submission
 */
export async function reviewSubmission(
  token: string,
  submissionId: number,
  payload: ReviewSubmissionPayload
) {
  const { data } = await axios.post(
    `${API_BASE}/submissions/${submissionId}/review`,
    payload,
    { headers: authHeaders(token) }
  );
  return data;
}
