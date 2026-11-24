"use client";

import { useTranslations } from "next-intl";
import {
  CHAT_QUESTION_COUNTER_THRESHOLD,
  CHAT_QUESTION_MAX_LENGTH,
  getChatQuestionLength,
} from "@/lib/chat-composer";
import { cn } from "@/lib/utils";

type ChatComposerMetaProps = {
  question: string;
  // 입력창의 aria-describedby가 가리키는 글자 수 안내 id.
  lengthMessageId: string;
  tone?: "dark" | "light";
  className?: string;
};

// 입력창 아래에 Enter 단축키와 글자 수 한도를 안내한다.
export const ChatComposerMeta = ({
  question,
  lengthMessageId,
  tone = "dark",
  className,
}: ChatComposerMetaProps) => {
  const t = useTranslations("chatComposer");
  const length = getChatQuestionLength(question);
  const isTooLong = length > CHAT_QUESTION_MAX_LENGTH;
  const lengthMessage = isTooLong
    ? t("tooLong", { count: length, max: CHAT_QUESTION_MAX_LENGTH })
    : length > CHAT_QUESTION_COUNTER_THRESHOLD
      ? t("length", { count: length, max: CHAT_QUESTION_MAX_LENGTH })
      : null;

  return (
    <div className={cn("flex items-start justify-between gap-3 text-xs", className)}>
      {/* 한도 초과 안내가 보이면 좁은 패널에서 줄이 깨지지 않도록 단축키 안내를 잠시 숨긴다. */}
      {isTooLong ? null : (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap max-md:hidden",
            tone === "light" ? "text-gray-500" : "text-gray-400",
          )}
        >
          {t("keyHint")}
        </span>
      )}
      <span
        id={lengthMessageId}
        aria-live="polite"
        className={cn(
          "ml-auto min-w-0 text-right tabular-nums",
          isTooLong
            ? tone === "light"
              ? "font-medium text-red-600"
              : "font-medium text-red-300"
            : tone === "light"
              ? "text-gray-500"
              : "text-gray-400",
        )}
      >
        {lengthMessage}
      </span>
    </div>
  );
};
