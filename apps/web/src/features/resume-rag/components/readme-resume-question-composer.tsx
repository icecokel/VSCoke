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
        className="pointer-events-auto overflow-hidden rounded-lg border border-gray-600 bg-gray-800/95 text-gray-50 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <div className="border-b border-gray-700 bg-gray-750 px-3 py-2">
          <div className="text-sm font-semibold text-gray-50">{t("title")}</div>
          <p className="mt-0.5 text-xs leading-5 text-gray-200">{t("description")}</p>
        </div>
        <div className="p-2">
          <div className="flex items-end gap-2 rounded-md border border-gray-600 bg-gray-900 p-2 transition-colors focus-within:border-blue-300/70">
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
              className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-50 shadow-none placeholder:text-gray-400 focus-visible:border-transparent focus-visible:ring-0"
            />
            {isReady ? (
              <Button
                type="button"
                onClick={handleViewAnswer}
                className="h-10 shrink-0 bg-yellow-200 px-3 text-gray-950 hover:bg-yellow-100"
              >
                <ArrowRight />
                {t("ready")}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-10 shrink-0 bg-blue-300 px-3 text-gray-950 hover:bg-blue-200"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
            )}
          </div>
          <div aria-live="polite" className="min-h-6 px-1 pt-2 text-xs">
            {isSubmitting ? <span className="text-blue-100/80">{t("submittingHint")}</span> : null}
            {isReady ? <span className="text-yellow-100/90">{t("readyHint")}</span> : null}
            {isError ? (
              <div className="flex flex-wrap items-center gap-2 text-red-100">
                <span>{t("error")}</span>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="h-7 border-red-800 bg-red-950/20 px-2 text-xs text-red-100 hover:bg-red-900/30 hover:text-red-50"
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
