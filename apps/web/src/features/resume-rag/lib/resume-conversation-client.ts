import { apiClient } from "@/lib/api-client";
import type { components } from "@/types/api";
import { isResumeRagChatResponse } from "./resume-rag-service";

export type ResumeConversationAccess = components["schemas"]["ResumeConversationAccessDto"];
export type ResumeConversationHistory = components["schemas"]["ResumeConversationHistoryDto"];
export type ResumeConversationTurn = components["schemas"]["ResumeConversationTurnDto"];
export type ResumeConversationChannel = "main" | "resume";
export const resumeConversationTokenHeader = "X-Resume-Conversation-Token";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const toResumeChatLocale = (locale: string): "ko-KR" | "en-US" | "ja-JP" =>
  locale === "en-US" || locale === "ja-JP" ? locale : "ko-KR";

export const resumeConversationStorageKey = (
  channel: ResumeConversationChannel,
  locale: string,
): string => `vscoke.conversation.v1.${channel}.${toResumeChatLocale(locale)}`;

export const isResumeConversationAccess = (value: unknown): value is ResumeConversationAccess => {
  if (!value || typeof value !== "object") return false;
  const access = value as Partial<ResumeConversationAccess>;
  return (
    typeof access.id === "string" &&
    uuidPattern.test(access.id) &&
    typeof access.token === "string" &&
    /^[a-f0-9]{64}$/.test(access.token) &&
    typeof access.expiresAt === "string" &&
    Number.isFinite(Date.parse(access.expiresAt))
  );
};

export const readResumeConversationAccess = (
  channel: ResumeConversationChannel,
  locale: string,
): ResumeConversationAccess | null => {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(resumeConversationStorageKey(channel, locale)) ?? "null",
    );
    if (isResumeConversationAccess(value) && Date.parse(value.expiresAt) > Date.now()) return value;
    window.localStorage.removeItem(resumeConversationStorageKey(channel, locale));
  } catch {
    // 저장소가 차단된 브라우저에서는 열린 화면의 메모리로만 대화를 유지한다.
  }
  return null;
};

export const storeResumeConversationAccess = (
  channel: ResumeConversationChannel,
  locale: string,
  access: ResumeConversationAccess | null,
): boolean => {
  try {
    const key = resumeConversationStorageKey(channel, locale);
    if (access) window.localStorage.setItem(key, JSON.stringify(access));
    else window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const createResumeConversation = async (
  channel: ResumeConversationChannel,
  locale: string,
): Promise<ResumeConversationAccess> => {
  const result: unknown = await apiClient.post("/resume-rag/conversations", {
    channel,
    locale: toResumeChatLocale(locale),
  });
  if (!isResumeConversationAccess(result) || Date.parse(result.expiresAt) <= Date.now()) {
    throw new Error("Invalid conversation access response");
  }
  return result;
};

export const loadResumeConversation = async (
  access: ResumeConversationAccess,
  channel: ResumeConversationChannel,
  locale: string,
): Promise<ResumeConversationHistory> => {
  const result = await apiClient.get<ResumeConversationHistory>(
    `/resume-rag/conversations/${access.id}`,
    {
      cache: "no-store",
      headers: { [resumeConversationTokenHeader]: access.token },
    },
  );
  if (
    !result ||
    result.id !== access.id ||
    result.channel !== channel ||
    result.locale !== toResumeChatLocale(locale) ||
    !Array.isArray(result.turns) ||
    result.turns.length > 50 ||
    !result.turns.every(
      turn =>
        typeof turn.id === "string" &&
        typeof turn.requestId === "string" &&
        typeof turn.question === "string" &&
        typeof turn.createdAt === "string" &&
        isResumeRagChatResponse(turn),
    )
  ) {
    throw new Error("Invalid conversation history response");
  }
  return result;
};

export const deleteResumeConversation = async (access: ResumeConversationAccess): Promise<void> => {
  await apiClient.delete(`/resume-rag/conversations/${access.id}`, {
    headers: { [resumeConversationTokenHeader]: access.token },
  });
};
