"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ResumeConversationToolbarProps = {
  isRestoring: boolean;
  isWorking: boolean;
  hasError: boolean;
  memoryOnly: boolean;
  onReset: () => Promise<void>;
  onRestore: () => Promise<void>;
  // README 패널처럼 밝은 배경에 놓일 때 글자·구분선 명암비를 유지한다.
  tone?: "dark" | "light";
};

export const ResumeConversationToolbar = ({
  isRestoring,
  isWorking,
  hasError,
  memoryOnly,
  onReset,
  onRestore,
  tone = "dark",
}: ResumeConversationToolbarProps) => {
  const t = useTranslations("resumeRag.conversation");
  return (
    <div
      className={
        tone === "light"
          ? "shrink-0 border-b border-gray-200 py-3 text-xs text-gray-600"
          : "shrink-0 border-b border-gray-800 py-3 text-xs text-gray-400"
      }
      data-testid="resume-conversation-toolbar"
    >
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite">
          {isRestoring ? t("restoring") : memoryOnly ? t("memoryOnly") : t("savedNotice")}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isWorking || isRestoring}
          onClick={() => {
            if (window.confirm(t("confirmReset"))) void onReset();
          }}
        >
          {t("newConversation")}
        </Button>
      </div>
      {hasError ? (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-amber-200">
          <span>{t("restoreError")}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isWorking || isRestoring}
            onClick={() => void onRestore()}
          >
            {t("retry")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
