import { ApiError } from "@/lib/api-client";
import { MainChatContractError } from "./main-chat-service";
import type { MainChatFailure, MainChatRateLimit, MainChatResult, MainChatState } from "../types";

type MainChatAction =
  | {
      type: "submit";
      messageId: string;
      question: string;
      submittedAt: Date;
    }
  | {
      type: "resolve";
      messageId: string;
      result: MainChatResult;
    }
  | {
      type: "reject";
      error: unknown;
      rateLimit?: MainChatRateLimit;
    }
  | {
      type: "rate-limit-reset";
      occurredAt: Date;
    };

export const createInitialMainChatState = (): MainChatState => ({
  status: "empty",
  messages: [],
});

const toMainChatFailure = (error: unknown, question: string): MainChatFailure => {
  if (error instanceof MainChatContractError) {
    return { kind: "contract", question, retryable: true };
  }

  if (error instanceof ApiError) {
    if (error.status === 400) return { kind: "invalid-request", question, retryable: false };
    if (error.status === 403) return { kind: "origin-blocked", question, retryable: false };
    if (error.status === 429) return { kind: "rate-limited", question, retryable: false };
    if (error.status === 503) return { kind: "service-unavailable", question, retryable: true };
  }

  return { kind: "request", question, retryable: true };
};

export const canSubmitMainChat = (state: MainChatState, now = new Date()): boolean => {
  if (state.status === "submitting") return false;

  if (state.status !== "rate-limited") return true;

  return Boolean(state.rateLimit && state.rateLimit.resetAt <= now);
};

export const mainChatReducer = (state: MainChatState, action: MainChatAction): MainChatState => {
  if (action.type === "rate-limit-reset") {
    if (state.status !== "rate-limited" || !canSubmitMainChat(state, action.occurredAt)) {
      return state;
    }

    return { ...state, status: "failed" };
  }

  if (action.type === "submit") {
    const question = action.question.trim();

    if (question.length < 2 || !canSubmitMainChat(state, action.submittedAt)) return state;

    return {
      status: "submitting",
      messages: [...state.messages, { id: action.messageId, role: "user", content: question }],
      rateLimit: state.rateLimit,
      pendingQuestion: question,
    };
  }

  if (state.status !== "submitting" || !state.pendingQuestion) return state;

  if (action.type === "resolve") {
    return {
      status: "answered",
      messages: [
        ...state.messages,
        {
          id: action.messageId,
          role: "assistant",
          content: action.result.answer,
          grounded: action.result.grounded,
          sources: action.result.sources,
        },
      ],
      rateLimit: action.result.rateLimit,
    };
  }

  const failure = toMainChatFailure(action.error, state.pendingQuestion);

  return {
    status: failure.kind === "rate-limited" && action.rateLimit ? "rate-limited" : "failed",
    messages: state.messages,
    rateLimit: action.rateLimit ?? state.rateLimit,
    failure,
  };
};
