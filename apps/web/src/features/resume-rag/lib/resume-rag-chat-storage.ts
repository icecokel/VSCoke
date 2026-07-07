import type { ResumeRagSource } from "../types";

const STORAGE_KEY_PREFIX = "vscoke.resumeRag.chat.";

export type StoredResumeRagChat = {
  id: string;
  question: string;
  answer: string;
  grounded: boolean;
  sources: ResumeRagSource[];
  createdAt: number;
};

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isString = (value: unknown): value is string => typeof value === "string";

const isResumeRagSource = (value: unknown): value is ResumeRagSource => {
  if (!value || typeof value !== "object") return false;

  const source = value as Partial<ResumeRagSource>;

  return (
    isString(source.title) &&
    isString(source.sourcePath) &&
    isString(source.sourceKey) &&
    isString(source.excerpt) &&
    typeof source.similarity === "number"
  );
};

const isStoredResumeRagChat = (value: unknown): value is StoredResumeRagChat => {
  if (!value || typeof value !== "object") return false;

  const chat = value as Partial<StoredResumeRagChat>;

  return (
    isString(chat.id) &&
    isString(chat.question) &&
    isString(chat.answer) &&
    typeof chat.grounded === "boolean" &&
    typeof chat.createdAt === "number" &&
    Array.isArray(chat.sources) &&
    chat.sources.every(isResumeRagSource)
  );
};

export const createResumeRagChatStorageKey = (chatId: string) => `${STORAGE_KEY_PREFIX}${chatId}`;

export const storeResumeRagChat = (chat: StoredResumeRagChat): boolean => {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.setItem(createResumeRagChatStorageKey(chat.id), JSON.stringify(chat));
    return true;
  } catch {
    return false;
  }
};

export const readResumeRagChat = (chatId: string): StoredResumeRagChat | null => {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(createResumeRagChatStorageKey(chatId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    return isStoredResumeRagChat(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
