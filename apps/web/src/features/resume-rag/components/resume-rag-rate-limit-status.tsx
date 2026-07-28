"use client";

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

  if (!rateLimit) return null;

  const resetAt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(rateLimit.resetAt);

  return (
    <p aria-live="polite" className={className}>
      {t("rateLimit.remaining", { count: rateLimit.remaining })}
      <span aria-hidden="true"> · </span>
      {t("rateLimit.nextAvailable", { time: resetAt })}
    </p>
  );
};
