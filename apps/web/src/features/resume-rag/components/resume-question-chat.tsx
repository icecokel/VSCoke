"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Clock,
  DatabaseZap,
  FileWarning,
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
    <div className="mb-3 border border-red-900 bg-red-950/30 px-3 py-3 text-sm text-red-100">
      <div className="flex gap-2">
        <FailureIcon kind={failure.kind} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{t(`failure.${failure.kind}.title`)}</div>
          <div className="mt-1 text-red-200/80">{t(`failure.${failure.kind}.description`)}</div>
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

  return (
    <div className="mr-auto max-w-3xl border border-gray-700 bg-gray-900 p-3 text-gray-100">
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
    </div>
  );
};

const SourceList = ({ sources }: { sources: ResumeRagSource[] }) => {
  const t = useTranslations("resumeRag");

  if (sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-gray-400">
        {t("sources", { count: sources.length })}
      </div>
      {sources.map(source => {
        const label = [source.title, source.sectionPath].filter(Boolean).join(" · ");
        const score = Math.round(source.similarity * 100);

        return (
          <div
            key={`${source.sourceKey}-${source.similarity}`}
            className="border-l border-gray-600 pl-3 text-xs text-gray-400"
          >
            <div className="flex flex-wrap items-center gap-2">
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

export const ResumeQuestionChat = () => {
  const t = useTranslations("resumeRag");
  const locale = useLocale();
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
    <section className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center border border-dashed border-gray-700 text-sm text-gray-500">
            {t("empty")}
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-2xl border border-blue-900 bg-blue-950/30 p-3 text-gray-100"
                  : "mr-auto max-w-3xl border border-gray-700 bg-gray-900 p-3 text-gray-100"
              }
            >
              <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
              {message.role === "assistant" ? (
                <>
                  <GroundingNotice grounded={message.grounded} />
                  <SourceList sources={message.sources} />
                </>
              ) : null}
            </div>
          ))
        )}
        {isSubmitting ? <PendingAnswer /> : null}
      </div>

      {failure ? (
        <FailureNotice
          failure={failure}
          onRetry={retryQuestion => {
            void submitQuestion(retryQuestion, { appendUserMessage: false });
          }}
        />
      ) : null}

      <form onSubmit={handleSubmit} className="border-t border-gray-800 pt-3">
        <Textarea
          value={question}
          onChange={event => setQuestion(event.target.value)}
          placeholder={t("placeholder")}
          className="min-h-28 resize-none border-gray-700 bg-gray-950 text-gray-100 placeholder:text-gray-500"
          disabled={isSubmitting}
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={!canSubmit} className="min-w-32">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </section>
  );
};
