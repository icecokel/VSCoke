"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronRight,
  Clock,
  DatabaseZap,
  FileWarning,
  FileText,
  Loader2,
  RefreshCw,
  SearchX,
  Send,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { askResumeRag, ResumeRagContractError } from "../lib/resume-rag-service";
import type { ResumeRagSource } from "../types";

type FailureKind =
  | "origin-blocked"
  | "service-unavailable"
  | "rate-limited"
  | "contract"
  | "request";

type FailureState = {
  kind: FailureKind;
  question?: string;
};

type ChatMessage =
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
      sources: ResumeRagSource[];
    };

const getFailureState = (caught: unknown, question: string): FailureState => {
  if (caught instanceof ResumeRagContractError) {
    return { kind: "contract", question };
  }

  if (caught instanceof ApiError) {
    if (caught.status === 403) {
      return { kind: "origin-blocked", question };
    }

    if (caught.status === 429) {
      return { kind: "rate-limited", question };
    }

    if (caught.status === 503) {
      return { kind: "service-unavailable", question };
    }
  }

  return { kind: "request", question };
};

const FailureIcon = ({ kind }: { kind: FailureKind }) => {
  const className = "mt-0.5 size-4 shrink-0";

  if (kind === "origin-blocked") {
    return <ShieldAlert className={className} />;
  }
  if (kind === "service-unavailable") {
    return <DatabaseZap className={className} />;
  }
  if (kind === "rate-limited") {
    return <Clock className={className} />;
  }
  if (kind === "contract") {
    return <FileWarning className={className} />;
  }

  return <WifiOff className={className} />;
};

const FailureNotice = ({
  failure,
  onRetry,
}: {
  failure: FailureState;
  onRetry: (question: string) => void;
}) => {
  const t = useTranslations("resumeRag");
  const canRetry = Boolean(failure.question) && failure.kind !== "origin-blocked";

  return (
    <div
      role="alert"
      className="mb-3 overflow-hidden border border-red-900/80 bg-gray-950 text-sm text-red-100"
    >
      <div className="border-b border-red-900/60 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-200">
        {t(`failure.${failure.kind}.title`)}
      </div>
      <div className="flex gap-2">
        <div className="flex min-h-20 w-10 items-start justify-center border-r border-red-900/40 pt-3 text-red-300">
          <FailureIcon kind={failure.kind} />
        </div>
        <div className="min-w-0 flex-1 px-3 py-3">
          <div className="text-red-200/80">{t(`failure.${failure.kind}.description`)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canRetry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-800 bg-red-950/20 text-red-100 hover:bg-red-900/30 hover:text-red-50"
                onClick={() => onRetry(failure.question as string)}
              >
                <RefreshCw />
                {t("retry")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const PendingAnswer = () => {
  const t = useTranslations("resumeRag");
  const rawHints = t.raw("pendingHints");
  const hints = Array.isArray(rawHints)
    ? rawHints.filter((hint): hint is string => typeof hint === "string")
    : [];
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    if (hints.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setHintIndex(current => (current + 1) % hints.length);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [hints.length]);

  return (
    <div className="mr-auto w-full max-w-3xl overflow-hidden border border-gray-700 bg-gray-950/80 text-gray-100">
      <div className="border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-500">
        codex.response
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2 text-sm text-gray-300">
          <Loader2 className="mt-0.5 size-4 animate-spin text-blue-300" />
          <div>
            <div className="font-medium">{t("pending.title")}</div>
            <div className="mt-1 text-gray-500">{t("pending.description")}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-11/12 bg-gray-800" />
          <Skeleton className="h-3 w-9/12 bg-gray-800" />
          <Skeleton className="h-3 w-7/12 bg-gray-800" />
        </div>
        {hints.length > 0 ? (
          <div className="mt-4 border-l border-blue-300/40 bg-blue-300/10 px-3 py-2 text-xs">
            <div className="font-medium text-blue-100/80">{t("pendingHintLabel")}</div>
            <p className="mt-1 min-h-[3.75rem] leading-5 text-gray-300 md:min-h-10">
              {hints[hintIndex]}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SourceList = ({ sources }: { sources: ResumeRagSource[] }) => {
  const t = useTranslations("resumeRag");

  if (sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-800 pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400">
        <FileText className="size-3.5 text-blue-300" />
        <span>{t("sourceLabel")}</span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-500">{t("sources", { count: sources.length })}</span>
      </div>
      <div className="space-y-2 border-l border-gray-700 pl-3">
        {sources.map((source, index) => {
          const label =
            [source.title, source.sectionPath].filter(Boolean).join(" · ") || source.sourceKey;
          const score = Math.round(source.similarity * 100);

          return (
            <div
              key={`${source.sourceKey}-${index}`}
              className="min-w-0 text-xs leading-5 text-gray-400"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {source.publicUrl ? (
                  <a
                    href={source.publicUrl}
                    className="text-blue-300 underline-offset-2 hover:underline"
                  >
                    {label}
                  </a>
                ) : (
                  <span className="text-gray-300">{label}</span>
                )}
                <span className="text-gray-500">{t("similarity", { score })}</span>
              </div>
              {source.caveats?.length ? (
                <div className="mt-1 text-gray-500">{source.caveats.join(", ")}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GroundingNotice = ({ grounded }: { grounded: boolean }) => {
  const t = useTranslations("resumeRag");

  if (grounded) return null;

  return (
    <div className="mt-3 border-l border-amber-600 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
      <div className="flex gap-2">
        <SearchX className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-medium">{t("noEvidence.title")}</div>
          <div className="mt-1 text-amber-100/75">{t("noEvidence.description")}</div>
        </div>
      </div>
    </div>
  );
};

const EmptyChatState = ({
  suggestions,
  onSelectSuggestion,
}: {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
}) => {
  const t = useTranslations("resumeRag");

  return (
    <div className="min-h-72 overflow-hidden border border-gray-800 bg-gray-950/70 text-gray-100">
      <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-500">
        <span className="size-2 rounded-full bg-blue-300" />
        <span>resume-rag.question</span>
      </div>
      <div className="p-4 md:p-6">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-gray-100">{t("emptyTitle")}</div>
          <p className="mt-2 text-sm leading-6 text-gray-400">{t("emptyDescription")}</p>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-medium uppercase text-gray-500">
            {t("suggestionsLabel")}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map(suggestion => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-10 w-full justify-start whitespace-normal border-gray-700 bg-gray-900/60 px-3 py-2 text-left text-gray-200 hover:bg-gray-800 hover:text-gray-50"
                onClick={() => onSelectSuggestion(suggestion)}
              >
                <ChevronRight className="mt-0.5 size-3.5 text-blue-300" />
                <span className="min-w-0">{suggestion}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResumeQuestionChat = () => {
  const t = useTranslations("resumeRag");
  const locale = useLocale();
  const rawSuggestions = t.raw("suggestions");
  const suggestions = Array.isArray(rawSuggestions)
    ? rawSuggestions.filter((suggestion): suggestion is string => typeof suggestion === "string")
    : [];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<FailureState | null>(null);

  const canSubmit = useMemo(
    () => question.trim().length >= 2 && !isSubmitting,
    [isSubmitting, question],
  );

  const submitQuestion = async (rawQuestion: string, options: { appendUserMessage: boolean }) => {
    const trimmedQuestion = rawQuestion.trim();
    if (!trimmedQuestion || isSubmitting) return;

    setIsSubmitting(true);
    setFailure(null);
    if (options.appendUserMessage) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedQuestion,
      };
      setMessages(prev => [...prev, userMessage]);
    }
    setQuestion("");

    try {
      const response = await askResumeRag({
        question: trimmedQuestion,
        locale,
      });
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          grounded: response.grounded,
          sources: response.sources,
        },
      ]);
    } catch (caught) {
      setFailure(getFailureState(caught, trimmedQuestion));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion(question, { appendUserMessage: true });
  };

  return (
    <section className="flex min-h-[calc(100svh-15rem)] flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <EmptyChatState suggestions={suggestions} onSelectSuggestion={setQuestion} />
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {message.role === "user" ? (
                <div className="max-w-[min(34rem,86%)] rounded-lg rounded-br-sm border border-blue-300/25 bg-blue-300/15 px-3.5 py-2.5 text-sm leading-6 break-words whitespace-pre-wrap text-blue-50 shadow-sm shadow-black/20">
                  {message.content}
                </div>
              ) : (
                <div className="w-full max-w-3xl overflow-hidden border border-gray-700 bg-gray-950/80 text-gray-100">
                  <div className="border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-500">
                    codex.response
                  </div>
                  <div className="px-3 py-3 text-sm leading-6 break-words whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div className="px-3 pb-3">
                    <GroundingNotice grounded={message.grounded} />
                    <SourceList sources={message.sources} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {isSubmitting ? <PendingAnswer /> : null}
        {failure ? (
          <FailureNotice
            failure={failure}
            onRetry={retryQuestion => {
              void submitQuestion(retryQuestion, { appendUserMessage: false });
            }}
          />
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-800 bg-gray-950/85 pt-3 pb-3 backdrop-blur"
      >
        <div className="flex items-end gap-2 rounded-lg border border-gray-700 bg-gray-900/80 p-2 transition-colors focus-within:border-blue-300/70">
          <Textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("composerLabel")}
            rows={1}
            className="max-h-36 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-100 shadow-none placeholder:text-gray-500 focus-visible:border-transparent focus-visible:ring-0 md:min-h-11"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            aria-label={isSubmitting ? t("submitting") : t("submit")}
            className="size-10 shrink-0 rounded-md bg-blue-300 text-gray-950 hover:bg-blue-200"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </form>
    </section>
  );
};
