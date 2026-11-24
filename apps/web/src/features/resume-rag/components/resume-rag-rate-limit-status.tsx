"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ResumeRagRateLimit } from "../lib/resume-rag-service";

type ResumeRagRateLimitStatusProps = {
  rateLimit?: ResumeRagRateLimit;
  className: string;
};

export const ResumeRagRateLimitStatus = ({
  rateLimit,
  className,
}: ResumeRagRateLimitStatusProps) => {
  const locale = useLocale();
  const t = useTranslations("resumeRag");
  const [expiredResetAt, setExpiredResetAt] = useState<number | null>(null);
  const resetAtTime = rateLimit?.resetAt.getTime();

  // 복구 시각이 지나면 남은 횟수가 늘어났을 수 있어 다음 응답 전까지 숨긴다.
  useEffect(() => {
    if (resetAtTime === undefined) return;

    const timeoutId = window.setTimeout(
      () => setExpiredResetAt(resetAtTime),
      Math.max(0, resetAtTime - Date.now()),
    );

    return () => window.clearTimeout(timeoutId);
  }, [resetAtTime]);

  if (!rateLimit || expiredResetAt === resetAtTime) return null;

  // 남은 횟수가 있으면 바로 질문할 수 있으므로 복구 시각은 모두 썼을 때만 보여준다.
  const resetAt =
    rateLimit.remaining === 0
      ? new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(rateLimit.resetAt)
      : null;

  return (
    <p aria-live="polite" className={className}>
      {t("rateLimit.remaining", { count: rateLimit.remaining })}
      {resetAt ? (
        <>
          <span aria-hidden="true"> · </span>
          {t("rateLimit.nextAvailable", { time: resetAt })}
        </>
      ) : null}
    </p>
  );
};
