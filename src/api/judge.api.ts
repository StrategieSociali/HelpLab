// src/api/judge.api.ts
/**
 * Scopo: API layer per l'area giudice
 *
 * Supporta:
 * - dashboard giudice
 * - overview operativa challenge
 * - moderazione submission (approve / reject)
 * - disponibilità settimanale del giudice (multi-giudice §5)
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

/* =========================
 * Disponibilità settimanale (multi-giudice §5)
 * ========================= */

export interface AvailabilityWeek {
  weekStart: string; // 'YYYY-MM-DD', lunedì della settimana (normalizzato lato BE)
  available: boolean;
}

export interface JudgeAvailabilityResponse {
  horizonWeeks: number;
  hasAnyAvailability: boolean; // alimenta il nudge: false = nessuna settimana pianificata
  weeks: AvailabilityWeek[];
}

/**
 * GET /api/v1/judge/availability
 * Disponibilità del giudice sull'orizzonte mobile (settimane mancanti = false).
 */
export async function getJudgeAvailability(
  token: string
): Promise<JudgeAvailabilityResponse> {
  const { data } = await axios.get<JudgeAvailabilityResponse>(
    `${API_BASE}/judge/availability`,
    { headers: authHeaders(token) }
  );
  return data;
}

/**
 * PUT /api/v1/judge/availability
 * Imposta la disponibilità di una settimana (il BE normalizza al lunedì e
 * valida l'orizzonte → 400 se fuori). Ritorna lo stato salvato.
 */
export async function setJudgeAvailability(
  token: string,
  weekStart: string,
  available: boolean
): Promise<AvailabilityWeek> {
  const { data } = await axios.put<AvailabilityWeek>(
    `${API_BASE}/judge/availability`,
    { weekStart, available },
    { headers: authHeaders(token) }
  );
  return data;
}
