// src/types/judge.ts

/* =========================
 * Giudice – Challenge list
 * ========================= */

export type JudgeChallengeDifficulty =
  | "low"
  | "medium"
  | "high"
  | "n/a";

export interface JudgeChallengeItem {
  id: number;
  title: string;
  difficulty: JudgeChallengeDifficulty;
  pending_count: number;
}

export interface JudgeChallengesResponse {
  challenges: JudgeChallengeItem[];
}

/* =========================
 * Giudice – Challenge overview
 * ========================= */

export type ChallengeType =
  | "generic"
  | "social"
  | "environmental";

export interface JudgeChallengeOverview {
  id: number;
  title: string;
  type: ChallengeType;
  approved_co2: number | null;
  max_points: number | null;
}

export interface JudgeTaskOverview {
  id: number;
  title: string;
  max_points: number | null;
  co2_quota: number | null;
  assigned_points: number;
}

export interface JudgeChallengeOverviewResponse {
  challenge: JudgeChallengeOverview;
  tasks: JudgeTaskOverview[];
}

