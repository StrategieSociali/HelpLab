// src/types/submission.ts

export type SubmissionDecision = "approved" | "rejected";

export interface ReviewSubmissionPayload {
  decision: SubmissionDecision;
  points: number;
  task_id: number;
  note?: string;
}

export interface ReviewSubmissionResponse {
  id: number;
  status: SubmissionDecision;
  points: number;
  reviewedAt: string;
}

