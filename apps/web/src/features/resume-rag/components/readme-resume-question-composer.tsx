"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { askResumeRag } from "../lib/resume-rag-service";
import { storeResumeRagChat } from "../lib/resume-rag-chat-storage";

type ComposerStatus = "idle" | "submitting" | "ready" | "error";

const createChatId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const ReadmeResumeQuestionComposer = () => {
  const t = useTranslations("resumeRag.readmeEntry");
  const locale = useLocale();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<ComposerStatus>("idle");
  const [readyChatId, setReadyChatId] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => question.trim().length >= 2 && status !== "submitting",
    [question, status],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 2 || status === "submitting") return;

    const chatId = createChatId();

    setReadyChatId(null);
    setStatus("submitting");

    try {
      const response = await askResumeRag({
        question: trimmedQuestion,
        locale,
      });
      const stored = storeResumeRagChat({
        id: chatId,
        question: trimmedQuestion,
        answer: response.answer,
        grounded: response.grounded,
        sources: response.sources,
        createdAt: Date.now(),
      });

      if (!stored) {
        throw new Error("Failed to store resume RAG chat.");
      }

      setReadyChatId(chatId);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  const handleViewAnswer = () => {
    if (!readyChatId) return;

    router.push(`/resume/question?chatId=${encodeURIComponent(readyChatId)}`);
  };

  const isSubmitting = status === "submitting";
  const isReady = status === "ready" && readyChatId;
  const isError = status === "error";

  return (
    <aside className="pointer-events-none fixed right-3 bottom-3 left-3 z-40 mx-auto max-w-2xl md:right-5 md:bottom-5 md:left-auto md:w-[32rem]">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto overflow-hidden rounded-lg border border-gray-300 border-t-4 border-t-blue-300 bg-white/90 text-gray-900 shadow-2xl shadow-black/50"
      >
        <div className="border-b border-gray-200 px-3 py-2">
          <div className="text-sm font-semibold text-gray-900">{t("title")}</div>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">{t("description")}</p>
        </div>
        <div className="p-2">
          <div className="flex items-end gap-2 rounded-md border border-blue-300 bg-white p-2 transition-colors focus-within:border-blue-300">
            <Textarea
              value={question}
              onChange={event => {
                setQuestion(event.target.value);
                if (status === "ready" || status === "error") {
                  setStatus("idle");
                  setReadyChatId(null);
                }
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
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
          </div>
        </div>
      </form>
    </aside>
  );
};
