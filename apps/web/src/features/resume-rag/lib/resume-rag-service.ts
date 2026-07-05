import { apiClient } from "@/lib/api-client";
import type { ResumeRagChatRequest, ResumeRagChatResponse } from "../types";

export class ResumeRagAuthError extends Error {
  constructor() {
    super("Resume RAG requires an API auth token.");
    this.name = "ResumeRagAuthError";
  }
}

export class ResumeRagContractError extends Error {
  constructor(message = "Resume RAG API returned an invalid response.") {
    super(message);
    this.name = "ResumeRagContractError";
  }
}

const isResumeRagChatResponse = (value: unknown): value is ResumeRagChatResponse => {
  if (!value || typeof value !== "object") return false;

  const response = value as Partial<ResumeRagChatResponse>;

  return (
    typeof response.answer === "string" &&
    typeof response.grounded === "boolean" &&
    Array.isArray(response.sources)
  );
};

export const askResumeRag = async (
  request: ResumeRagChatRequest,
  token?: string,
): Promise<ResumeRagChatResponse> => {
  if (!token) {
    throw new ResumeRagAuthError();
  }

  const response = await apiClient.post<ResumeRagChatResponse>("/resume-rag/chat", request, {
    token,
  });

  if (!isResumeRagChatResponse(response)) {
    throw new ResumeRagContractError();
  }

  return response;
};
