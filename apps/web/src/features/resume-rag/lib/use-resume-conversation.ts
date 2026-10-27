"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import type { ResumeRagChatRequest, ResumeRagChatResponse, ResumeRagSource } from "../types";
import {
  createResumeConversation,
  deleteResumeConversation,
  loadResumeConversation,
  readResumeConversationAccess,
  storeResumeConversationAccess,
  toResumeChatLocale,
  type ResumeConversationAccess,
  type ResumeConversationChannel,
  type ResumeConversationTurn,
} from "./resume-conversation-client";

export type ResumeConversationMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      grounded: boolean;
      sources: ResumeRagSource[];
    };

export const toResumeConversationMessages = (
  turns: ResumeConversationTurn[],
): ResumeConversationMessage[] =>
  turns.flatMap((turn): ResumeConversationMessage[] => [
    { id: `${turn.id}-user`, role: "user", content: turn.question },
    {
      id: `${turn.id}-assistant`,
      role: "assistant",
      content: turn.answer,
      grounded: turn.grounded,
      sources: turn.sources,
    },
  ]);

export const useResumeConversation = (
  channel: ResumeConversationChannel,
  locale: string,
  resumeKey = "pe",
) => {
  const apiLocale = toResumeChatLocale(locale);
  const access = useRef<ResumeConversationAccess | null>(null);
  const pending = useRef<{ question: string; requestId: string } | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const restoring = useRef(true);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [restoreError, setRestoreError] = useState<unknown>(null);
  const [memoryOnly, setMemoryOnly] = useState(false);
  const [restoredTurns, setRestoredTurns] = useState<ResumeConversationTurn[] | null>(null);

  const restore = useCallback(async () => {
    const current = ++generation.current;
    busy.current = false;
    setIsWorking(false);
    restoring.current = true;
    setIsRestoring(true);
    setRestoreError(null);
    setRestoredTurns(null);
    pending.current = null;
    const saved = readResumeConversationAccess(channel, apiLocale, resumeKey);
    access.current = saved;
    try {
      const history = saved
        ? await loadResumeConversation(saved, channel, apiLocale, resumeKey)
        : null;
      if (generation.current === current) setRestoredTurns(history?.turns ?? []);
    } catch (error) {
      if (generation.current !== current) return;
      if (error instanceof ApiError && error.status === 404) {
        access.current = null;
        storeResumeConversationAccess(channel, apiLocale, null, resumeKey);
        setRestoredTurns([]);
      } else {
        setRestoreError(error);
      }
    } finally {
      if (generation.current === current) {
        restoring.current = false;
        setIsRestoring(false);
      }
    }
  }, [apiLocale, channel, resumeKey]);

  useEffect(() => {
    void restore();
    return () => {
      generation.current += 1;
    };
  }, [restore]);

  const send = useCallback(
    async <T extends ResumeRagChatResponse>(
      question: string,
      submit: (request: ResumeRagChatRequest, token?: string) => Promise<T>,
    ): Promise<T> => {
      if (restoring.current || busy.current || restoreError)
        throw new Error("Conversation is not ready");
      busy.current = true;
      setIsWorking(true);
      const current = generation.current;
      try {
        let currentAccess = access.current;
        if (!currentAccess) {
          currentAccess = await createResumeConversation(channel, apiLocale, resumeKey);
          if (generation.current !== current) throw new Error("Conversation scope changed");
          access.current = currentAccess;
          setMemoryOnly(
            !storeResumeConversationAccess(channel, apiLocale, currentAccess, resumeKey),
          );
        }
        if (pending.current?.question !== question) {
          pending.current = { question, requestId: crypto.randomUUID() };
        }
        const requestId = pending.current.requestId;
        const result = await submit(
          {
            question,
            locale: apiLocale,
            ...(channel === "resume" ? { resumeKey } : {}),
            conversationId: currentAccess.id,
            requestId,
          },
          currentAccess.token,
        );
        if (generation.current !== current) throw new Error("Conversation scope changed");
        if (result.conversationId !== currentAccess.id || result.requestId !== requestId) {
          throw new Error("Conversation response does not match the request");
        }
        pending.current = null;
        return result;
      } catch (error) {
        if (generation.current === current && error instanceof ApiError && error.status === 404)
          setRestoreError(error);
        throw error;
      } finally {
        if (generation.current === current) {
          busy.current = false;
          setIsWorking(false);
        }
      }
    },
    [apiLocale, channel, resumeKey, restoreError],
  );

  const reset = useCallback(async (): Promise<boolean> => {
    if (busy.current || restoring.current) return false;
    busy.current = true;
    setIsWorking(true);
    try {
      if (access.current) {
        try {
          await deleteResumeConversation(access.current);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      }
      generation.current += 1;
      access.current = null;
      pending.current = null;
      storeResumeConversationAccess(channel, apiLocale, null, resumeKey);
      setRestoredTurns([]);
      setRestoreError(null);
      setMemoryOnly(false);
      return true;
    } catch (error) {
      setRestoreError(error);
      return false;
    } finally {
      busy.current = false;
      setIsWorking(false);
    }
  }, [apiLocale, channel, resumeKey]);

  return { send, reset, restore, restoredTurns, isRestoring, isWorking, restoreError, memoryOnly };
};
