// src/api/adminSubmissions.api.js
/**
 * Scopo: chiamate della pagina admin «Correzione punti» (PM-4 e PM-3, 2/10/2026).
 *
 * ENDPOINT (solo admin):
 * - GET  /v1/admin/submissions/challenges          → sfide con contributi decisi
 * - GET  /v1/admin/submissions?challenge_id&q&cursor → contributi approvati e rifiutati
 * - GET  /v1/admin/submissions/:id/points-preview  → punti di oggi e proposta del motore
 * - POST /v1/submissions/:id/override               → la correzione (§7.4)
 */
import { api } from "@/api/client";

export async function getCorrectionChallenges() {
  const { data } = await api.get("/v1/admin/submissions/challenges");
  return data?.items ?? [];
}

export async function getDecidedSubmissions({ challengeId, q, cursor } = {}) {
  const params = new URLSearchParams();
  if (challengeId) params.set("challenge_id", String(challengeId));
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", String(cursor));
  const { data } = await api.get(`/v1/admin/submissions?${params.toString()}`);
  return { items: data?.items ?? [], nextCursor: data?.nextCursor ?? null };
}

export async function getPointsPreview(submissionId) {
  const { data } = await api.get(`/v1/admin/submissions/${submissionId}/points-preview`);
  return data;
}

export async function overrideSubmission(submissionId, { decision, points, note }) {
  const { data } = await api.post(`/v1/submissions/${submissionId}/override`, {
    decision,
    points: decision === "approved" ? points : undefined,
    note: note || undefined,
  });
  return data;
}
