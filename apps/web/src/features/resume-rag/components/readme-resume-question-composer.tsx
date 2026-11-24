"use client";

import { resumePath } from "@/features/resume/lib/resume-selection";
import { useResumeConversation } from "../lib/use-resume-conversation";
import { ResumeConversationToolbar } from "./resume-conversation-toolbar";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  trackResumeRagChatAnswerViewed,
  trackResumeRagChatCompleted,
  trackResumeRagChatComposerFocused,
  trackResumeRagChatFailed,
  trackResumeRagChatOpened,
  trackResumeRagChatSubmitted,
  type ResumeRagChatFailureReason,
} from "../lib/resume-rag-chat-analytics";
import {
  askResumeRag,
  readResumeRagRateLimitFromError,
  type ResumeRagRateLimit,
} from "../lib/resume-rag-service";
import { storeResumeRagChat } from "../lib/resume-rag-chat-storage";
import { ResumeRagRateLimitStatus } from "./resume-rag-rate-limit-status";
import { ApiError } from "@/lib/api-client";
import { ChatComposerMeta } from "@/components/chat/chat-composer-meta";
import {
  getChatComposerKeyAction,
  isChatQuestionSendable,
  isChatQuestionTooLong,
} from "@/lib/chat-composer";
import { readStoredChatRateLimit, storeChatRateLimit } from "@/lib/chat-rate-limit-storage";

type ComposerStatus = "idle" | "submitting" | "ready" | "error" | "invalid";

const mobileChatHintStorageKey = "vscoke.resumeRag.mobileChatHintShown";
const mobileChatHintDuration = 3000;

const createChatId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const ReadmeResumeQuestionComposer = ({ resumeKey }: { resumeKey: string }) => {
  const t = useTranslations("resumeRag.readmeEntry");
  const locale = useLocale();
  const conversation = useResumeConversation("resume", locale, resumeKey);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<ComposerStatus>("idle");
  const [readyChatId, setReadyChatId] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<ResumeRagRateLimit>();
  const [isMobileChatHintVisible, setIsMobileChatHintVisible] = useState(false);
  const hasTrackedComposerFocus = useRef(false);
  const lengthMessageId = useId();
  const isQuestionTooLong = isChatQuestionTooLong(question);

  useEffect(() => {
    setRateLimit(current => current ?? readStoredChatRateLimit("resume"));
  }, []);

  useEffect(() => {
    if (rateLimit) storeChatRateLimit("resume", rateLimit);
  }, [rateLimit]);

  useEffect(() => {
    if (!isMobile || window.sessionStorage.getItem(mobileChatHintStorageKey)) return;

    window.sessionStorage.setItem(mobileChatHintStorageKey, "true");
    setIsMobileChatHintVisible(true);

    const timeoutId = window.setTimeout(() => {
      setIsMobileChatHintVisible(false);
    }, mobileChatHintDuration);

    return () => window.clearTimeout(timeoutId);
  }, [isMobile]);

  const canSubmit = useMemo(
    () =>
      isChatQuestionSendable(question) &&
      status !== "submitting" &&
      !conversation.isRestoring &&
      !conversation.restoreError,
    [question, status, conversation.isRestoring, conversation.restoreError],
  );

  const handleComposerFocus = () => {
    if (hasTrackedComposerFocus.current) return;

    hasTrackedComposerFocus.current = true;
    trackResumeRagChatComposerFocused({
      entryPoint: "readme",
      locale,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (
      !isChatQuestionSendable(trimmedQuestion) ||
      status === "submitting" ||
      conversation.isWorking ||
      conversation.isRestoring ||
      conversation.restoreError
    )
      return;

    const chatId = createChatId();

    setReadyChatId(null);
    setStatus("submitting");
    trackResumeRagChatSubmitted({
      entryPoint: "readme",
      locale,
      question: trimmedQuestion,
    });
    let failureReason: ResumeRagChatFailureReason = "request";

    try {
      const response = await conversation.send(trimmedQuestion, askResumeRag);
      setRateLimit(response.rateLimit);
      const stored = storeResumeRagChat(
        {
          id: chatId,
          question: trimmedQuestion,
          answer: response.answer,
          grounded: response.grounded,
          sources: response.sources,
          createdAt: Date.now(),
        },
        resumeKey,
        locale,
      );

      if (!stored) {
        failureReason = "storage";
        throw new Error("Failed to store resume RAG chat.");
      }

      trackResumeRagChatCompleted({
        entryPoint: "readme",
        locale,
        question: trimmedQuestion,
        grounded: response.grounded,
        sourceCount: response.sources.length,
      });
      setReadyChatId(chatId);
      setStatus("ready");
    } catch (caught) {
      const nextRateLimit = readResumeRagRateLimitFromError(caught);
      if (nextRateLimit) setRateLimit(nextRateLimit);

      const isInvalidRequest = caught instanceof ApiError && caught.status === 400;
      trackResumeRagChatFailed({
        entryPoint: "readme",
        locale,
        question: trimmedQuestion,
        failureReason: isInvalidRequest ? "invalid_request" : failureReason,
      });
      setStatus(isInvalidRequest ? "invalid" : "error");
    }
  };

  const handleViewAnswer = () => {
    if (!readyChatId) return;

    trackResumeRagChatAnswerViewed({ entryPoint: "readme", locale });
    router.push(
      resumePath(`/resume/question?chatId=${encodeURIComponent(readyChatId)}`, resumeKey),
    );
  };

  const handleMobileChatClick = () => {
    trackResumeRagChatOpened({ entryPoint: "readme", locale });
    router.push(resumePath("/resume/question", resumeKey));
  };

  const isSubmitting = status === "submitting";
  const isReady = status === "ready" && readyChatId;
  const isError = status === "error";
  const isInvalid = status === "invalid";

  return (
    <>
      <Tooltip open={isMobileChatHintVisible} onOpenChange={setIsMobileChatHintVisible}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            onClick={handleMobileChatClick}
            className="fixed right-20 bottom-4 z-40 size-12 rounded-full bg-blue-300 text-white shadow-lg hover:bg-blue-200 md:hidden"
            data-testid="resume-rag-chat-trigger"
          >
            <MessageCircle className="size-6" />
            <span className="sr-only">{t("mobileTriggerLabel")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="border border-gray-700 bg-gray-900 text-white"
          data-testid="resume-rag-mobile-hint"
        >
          {t("mobileHint")}
        </TooltipContent>
      </Tooltip>

      <aside className="pointer-events-none fixed right-5 bottom-5 z-40 hidden w-[32rem] md:block">
        <form
          onSubmit={handleSubmit}
          data-testid="resume-rag-chat-composer"
          className="pointer-events-auto overflow-hidden rounded-lg border border-gray-300 border-t-4 border-t-blue-300 bg-white/90 text-gray-900 shadow-2xl shadow-black/50"
        >
          <div className="border-b border-gray-200 px-3 py-2">
            <div className="text-sm font-semibold text-gray-900">{t("title")}</div>
            <p className="mt-0.5 text-xs leading-5 text-gray-500">{t("description")}</p>
          </div>
          <div className="px-3">
            <ResumeConversationToolbar
              tone="light"
              isRestoring={conversation.isRestoring}
              isWorking={conversation.isWorking}
              hasError={Boolean(conversation.restoreError)}
              memoryOnly={conversation.memoryOnly}
              onRestore={conversation.restore}
              onReset={async () => {
                if (await conversation.reset()) {
                  setStatus("idle");
                  setReadyChatId(null);
                  setQuestion("");
                }
              }}
            />
          </div>
          <div className="p-2">
            <div className="flex items-end gap-2 rounded-md border border-blue-300 bg-white p-2 transition-colors focus-within:border-blue-300">
              <Textarea
                value={question}
                onFocus={handleComposerFocus}
                onChange={event => {
                  setQuestion(event.target.value);
                  if (status === "ready" || status === "error" || status === "invalid") {
                    setStatus("idle");
                    setReadyChatId(null);
                  }
                }}
                onKeyDown={event => {
                  const action = getChatComposerKeyAction({
                    key: event.key,
                    shiftKey: event.shiftKey,
                    isComposing: event.nativeEvent.isComposing,
                    keyCode: event.nativeEvent.keyCode,
                  });
                  if (!action) return;

                  event.preventDefault();
                  // 답변이 준비된 상태에서는 같은 질문을 다시 보내지 않는다.
                  if (action === "submit" && canSubmit && !isReady) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={t("placeholder")}
                aria-label={t("placeholder")}
                aria-invalid={isQuestionTooLong || undefined}
                aria-describedby={lengthMessageId}
                rows={1}
                disabled={isSubmitting}
                className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-900 shadow-none placeholder:text-gray-500 focus-visible:border-transparent focus-visible:ring-0 dark:bg-white"
              />
              {isReady ? (
                <Button
                  type="button"
                  onClick={handleViewAnswer}
                  className="h-10 shrink-0 border border-blue-300 bg-blue-300 px-3 text-white hover:bg-blue-400"
                >
                  <ArrowRight />
                  {t("ready")}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-10 shrink-0 border border-blue-300 bg-blue-300 px-3 text-white hover:bg-blue-400 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-700 disabled:opacity-100"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                  {isSubmitting ? t("submitting") : t("submit")}
                </Button>
              )}
            </div>
            <div aria-live="polite" className="min-h-6 px-1 pt-2 text-xs text-gray-700">
              {isSubmitting ? <span>{t("submittingHint")}</span> : null}
              {isReady ? <span>{t("readyHint")}</span> : null}
              {isError ? (
                <div className="flex flex-wrap items-center gap-2 text-red-400">
                  <span>{t("error")}</span>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="h-7 border-red-400 bg-white px-2 text-xs text-red-400 hover:bg-gray-50 hover:text-red-400"
                  >
                    <RefreshCw className="size-3" />
                    {t("retry")}
                  </Button>
                </div>
              ) : null}
              {isInvalid ? <span className="text-red-600">{t("invalidRequest")}</span> : null}
            </div>
            <ChatComposerMeta
              question={question}
              lengthMessageId={lengthMessageId}
              tone="light"
              className="px-1 pb-1"
            />
            <ResumeRagRateLimitStatus
              rateLimit={rateLimit}
              className="px-1 pb-1 text-xs text-gray-500"
            />
          </div>
        </form>
      </aside>
    </>
  );
};
