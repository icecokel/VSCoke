"use client";

import { FormEvent, useEffect, useReducer, useRef, useState } from "react";
import { ArrowUp, ChevronRight, Clock, RefreshCw, Send, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { shouldSubmitMainChatKey } from "../lib/main-chat-keyboard";
import { askMainChat, readMainChatRateLimitFromError } from "../lib/main-chat-service";
import {
  canSubmitMainChat,
  createInitialMainChatState,
  mainChatReducer,
} from "../lib/main-chat-state";

const navigationItems = [
  { id: "readme", path: "/readme" },
  { id: "game", path: "/game" },
  { id: "blog", path: "/blog/dashboard" },
] as const;

const guideItems = ["projects", "tech", "problemSolving", "career", "collaboration"] as const;

export const MainChat = () => {
  const locale = useLocale();
  const apiLocale = locale === "en-US" || locale === "ja-JP" ? locale : "ko-KR";
  const t = useTranslations("home.mainChat");
  const { push, prefetch } = useCustomRouter();
  const [state, dispatch] = useReducer(mainChatReducer, undefined, createInitialMainChatState);
  const [question, setQuestion] = useState("");
  const isSubmittingRef = useRef(false);
  const canSubmit = question.trim().length >= 2 && canSubmitMainChat(state);

  useEffect(() => {
    if (state.status !== "rate-limited" || !state.rateLimit) return;

    const { resetAt } = state.rateLimit;
    const timeoutId = window.setTimeout(
      () => dispatch({ type: "rate-limit-reset", occurredAt: resetAt }),
      Math.max(0, resetAt.getTime() - Date.now()),
    );

    return () => window.clearTimeout(timeoutId);
  }, [state.status, state.rateLimit]);

  const submitQuestion = async (rawQuestion: string) => {
    const trimmedQuestion = rawQuestion.trim();

    if (trimmedQuestion.length < 2 || isSubmittingRef.current || !canSubmitMainChat(state)) return;

    isSubmittingRef.current = true;
    const submittedAt = new Date();
    const messageId = `user-${submittedAt.getTime()}`;

    dispatch({ type: "submit", messageId, question: trimmedQuestion, submittedAt });
    setQuestion("");

    try {
      const result = await askMainChat({ question: trimmedQuestion, locale: apiLocale });

      dispatch({
        type: "resolve",
        messageId: `assistant-${Date.now()}`,
        result,
      });
    } catch (error) {
      dispatch({
        type: "reject",
        error,
        rateLimit: readMainChatRateLimitFromError(error),
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion(question);
  };

  const isEmpty = state.messages.length === 0;
  const isRateLimited = state.status === "rate-limited" && !canSubmitMainChat(state);
  const resetAt = state.rateLimit
    ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
        state.rateLimit.resetAt,
      )
    : null;

  return (
    <main className="min-h-full bg-gray-950 text-gray-100">
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-4xl flex-col px-4 py-8 md:px-6 md:py-12">
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-blue-200">VSCOKE</p>
            <h1 className="mt-1 text-lg font-semibold text-gray-100">{t("workspaceTitle")}</h1>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="size-1.5 rounded-full bg-blue-300" />
            {t("publicAccess")}
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-10 md:py-14">
          {isEmpty ? (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <div className="max-w-2xl">
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-blue-300/10 text-blue-200">
                  <Sparkles className="size-5" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  {t("title")}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400 md:text-base">
                  {t("description")}
                </p>
              </div>

              <nav className="mt-8 flex flex-wrap gap-2" aria-label={t("navigationLabel")}>
                {navigationItems.map(item => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-gray-700 bg-gray-900 px-3 text-gray-200 hover:border-blue-300 hover:bg-blue-300/10 hover:text-blue-100"
                    onClick={() => push(item.path)}
                    onMouseEnter={() => prefetch(item.path)}
                    onFocus={() => prefetch(item.path)}
                  >
                    {t(`navigation.${item.id}`)}
                    <ChevronRight className="size-3.5" />
                  </Button>
                ))}
              </nav>

              <div className="mt-10 border-t border-gray-800 pt-5">
                <h3 className="text-sm font-medium text-gray-200">{t("guideTitle")}</h3>
                <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-gray-400 sm:grid-cols-2">
                  {guideItems.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <ArrowUp className="mt-1 size-3 -rotate-45 text-blue-300" />
                      <span>{t(`guide.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {state.messages.map(message =>
                message.role === "user" ? (
                  <div key={message.id} className="ml-auto max-w-[85%] text-right md:max-w-[70%]">
                    <p className="mb-2 text-xs font-medium text-gray-500">{t("you")}</p>
                    <p className="inline-block rounded-2xl rounded-tr-sm bg-blue-300 px-4 py-3 text-left text-sm font-medium text-gray-950">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <article key={message.id} className="max-w-3xl border-l border-blue-300/60 pl-4">
                    <p className="text-xs font-medium text-blue-200">VSCOKE</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-200 md:text-base">
                      {message.content}
                    </p>
                    {message.sources.length > 0 ? (
                      <div className="mt-4 border-t border-gray-800 pt-3">
                        <p className="text-xs font-medium text-gray-400">
                          {t("sources", { count: message.sources.length })}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-gray-500">
                          {message.sources.map((source, index) => (
                            <li key={`${source.sourceKey}-${index}`}>
                              {[source.title, source.sectionPath].filter(Boolean).join(" · ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ),
              )}

              {state.status === "submitting" ? (
                <div className="flex items-center gap-2 text-sm text-gray-400" aria-live="polite">
                  <span className="size-2 animate-pulse rounded-full bg-blue-300" />
                  {t("pending")}
                </div>
              ) : null}

              {state.failure ? (
                <div
                  className="border-l border-red-400/70 bg-red-950/20 px-4 py-3 text-sm text-red-100"
                  role="alert"
                >
                  <p>{t(`failure.${state.failure.kind}`)}</p>
                  {state.failure.retryable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-0 text-red-200 hover:bg-transparent hover:text-red-50"
                      onClick={() => void submitQuestion(state.failure?.question ?? "")}
                    >
                      <RefreshCw className="size-3.5" />
                      {t("retry")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-4">
          {state.rateLimit ? (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-500" aria-live="polite">
              <Clock className="size-3.5" />
              {t("rateLimit", { count: state.rateLimit.remaining, time: resetAt ?? "-" })}
            </p>
          ) : null}
          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <Textarea
              value={question}
              rows={1}
              disabled={isRateLimited}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              className="min-h-12 resize-none border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus-visible:border-blue-300 focus-visible:ring-blue-300/20"
              onChange={event => setQuestion(event.target.value)}
              onKeyDown={event => {
                if (
                  !shouldSubmitMainChatKey({
                    key: event.key,
                    shiftKey: event.shiftKey,
                    isComposing: event.nativeEvent.isComposing,
                  })
                ) {
                  return;
                }

                event.preventDefault();
                if (canSubmit) void submitQuestion(question);
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSubmit}
              className="size-12 shrink-0 bg-blue-300 text-gray-950 hover:bg-blue-200 disabled:bg-gray-800 disabled:text-gray-500"
              aria-label={t("send")}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
};
