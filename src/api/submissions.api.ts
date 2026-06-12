// src/api/submissions.api.ts
import axios from "axios";
import {
  ReviewSubmissionPayload,
  ReviewSubmissionResponse,
} from "@/types/submission";

const API_BASE =
  (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "") + "/v1";

export async function reviewSubmission(
  token: string,
  submissionId: number,
  payload: ReviewSubmissionPayload
): Promise<ReviewSubmissionResponse> {
  const { data } = await axios.post(
    `${API_BASE}/submissions/${submissionId}/review`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return data;
}

