// src/api/judge.api.ts
/**
 * Scopo: API layer per l'area giudice
 *
 * Supporta:
 * - dashboard giudice
 * - overview operativa challenge
 * - moderazione submission (approve / reject)
 * - disponibilità settimanale del giudice (multi-giudice §5)
 * - marketplace Fase 1: sfide/eventi scoperti + opt-in (§4.1)
 * - offerte round-robin Fase 2: accept/decline (§4.2)
 * - punteggio-attività del giudice (§6)
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

/* =========================
 * Marketplace Fase 1 pull (§4.1)
 * ========================= */

export interface MarketplaceChallenge {
  id: number;
  slug: string | null;
  title: string | null;
  type: string | null;
  location: string | null;
  deadline: string | null; // 'YYYY-MM-DD'
  sponsor: { name: string } | null;
  coverage: number; // giudici già assegnati
  coverageCap: number; // tetto
  target: unknown;
}

export interface MarketplaceEvent {
  id: number;
  slug: string | null;
  name: string | null;
  startDate: string | null; // 'YYYY-MM-DD'
  endDate: string | null;
  location: string | null;
  coverage: number;
  coverageCap: number;
}

export interface JudgeMarketplaceResponse {
  challenges: MarketplaceChallenge[];
  events: MarketplaceEvent[];
}

/**
 * GET /api/v1/judge/marketplace
 * Sfide/eventi SCOPERTI su cui il giudice può fare opt-in (Fase 1 pull).
 * Esclude ciò di cui è già giudice e le sfide in cui partecipa (§7.1).
 */
export async function getJudgeMarketplace(
  token: string
): Promise<JudgeMarketplaceResponse> {
  const { data } = await axios.get<JudgeMarketplaceResponse>(
    `${API_BASE}/judge/marketplace`,
    { headers: authHeaders(token) }
  );
  return data;
}

/**
 * POST /api/v1/challenges/:id/opt-in
 * Candidatura del giudice su una sfida scoperta. 409 se il tetto è pieno
 * (`coverage_full`). Idempotente se già assegnato.
 */
export async function optInChallenge(token: string, challengeId: number) {
  const { data } = await axios.post(
    `${API_BASE}/challenges/${challengeId}/opt-in`,
    {},
    { headers: authHeaders(token) }
  );
  return data;
}

/**
 * POST /api/v1/events/:id/opt-in
 * Candidatura del giudice su un evento scoperto (copre tutte le sue sfide).
 * 409 se il tetto è pieno.
 */
export async function optInEvent(token: string, eventId: number) {
  const { data } = await axios.post(
    `${API_BASE}/events/${eventId}/opt-in`,
    {},
    { headers: authHeaders(token) }
  );
  return data;
}

/* =========================
 * Offerte round-robin Fase 2 push (§4.2)
 * ========================= */

export interface JudgeOffer {
  id: number;
  kind: "challenge" | "event";
  challengeId: number | null;
  eventId: number | null;
  title: string | null;
  slug: string | null;
  offeredAt: string | null;
  expiresAt: string | null;
}

export interface JudgeOffersResponse {
  responseWindowHours: number;
  offers: JudgeOffer[];
}

/**
 * GET /api/v1/judge/offers
 * Offerte round-robin PENDING per il giudice (il BE scade quelle vecchie in lettura).
 */
export async function getJudgeOffers(
  token: string
): Promise<JudgeOffersResponse> {
  const { data } = await axios.get<JudgeOffersResponse>(
    `${API_BASE}/judge/offers`,
    { headers: authHeaders(token) }
  );
  return data;
}

/**
 * POST /api/v1/judge/offers/:id/accept
 * Accetta l'offerta → grant round_robin (rispetta il tetto). 409 se scaduta,
 * partecipante o tetto pieno nel frattempo.
 */
export async function acceptJudgeOffer(token: string, offerId: number) {
  const { data } = await axios.post(
    `${API_BASE}/judge/offers/${offerId}/accept`,
    {},
    { headers: authHeaders(token) }
  );
  return data;
}

/**
 * POST /api/v1/judge/offers/:id/decline
 * Rifiuta l'offerta → penalità (§6, 0 per agosto) e rotazione al successivo.
 */
export async function declineJudgeOffer(token: string, offerId: number) {
  const { data } = await axios.post(
    `${API_BASE}/judge/offers/${offerId}/decline`,
    {},
    { headers: authHeaders(token) }
  );
  return data;
}

/* =========================
 * Punteggio-attività del giudice (§6)
 * ========================= */

export interface JudgeScoreResponse {
  score: number;
}

/**
 * GET /api/v1/judge/score
 * Punteggio-attività (asse "quanto lavori", +10 per submission approvata).
 * 0 se il giudice non ha ancora una riga.
 */
export async function getJudgeScore(
  token: string
): Promise<JudgeScoreResponse> {
  const { data } = await axios.get<JudgeScoreResponse>(
    `${API_BASE}/judge/score`,
    { headers: authHeaders(token) }
  );
  return data;
}
