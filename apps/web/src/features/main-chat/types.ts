import type { components, operations } from "@/types/api";

type MainChatOperation = operations["MainChatController_chat"];
type MainChatSuccessResponse = MainChatOperation["responses"][200]["content"]["application/json"];

export type MainChatRequest = MainChatOperation["requestBody"]["content"]["application/json"];
export type MainChatResponse = MainChatSuccessResponse["data"];
export type MainChatSource = components["schemas"]["ResumeRagSourceDto"];

export type MainChatRateLimit = {
  limit: number;
  remaining: number;
  resetAt: Date;
};

export type MainChatResult = MainChatResponse & {
  rateLimit?: MainChatRateLimit;
};

export type MainChatMessage =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      grounded: boolean;
      sources: MainChatSource[];
    };

export type MainChatFailureKind =
  | "invalid-request"
  | "origin-blocked"
  | "rate-limited"
  | "service-unavailable"
  | "contract"
  | "request";

export type MainChatFailure = {
  kind: MainChatFailureKind;
  question: string;
  retryable: boolean;
};

export type MainChatStatus = "empty" | "submitting" | "answered" | "failed" | "rate-limited";

export type MainChatState = {
  status: MainChatStatus;
  messages: MainChatMessage[];
  rateLimit?: MainChatRateLimit;
  failure?: MainChatFailure;
  pendingQuestion?: string;
};
