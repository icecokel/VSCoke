"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { trackResumeRagPageViewed, type ResumeRagSurface } from "../lib/resume-rag-chat-analytics";

type ResumeRagPageViewTrackerProps = {
  surface: ResumeRagSurface;
};

export const ResumeRagPageViewTracker = ({ surface }: ResumeRagPageViewTrackerProps) => {
  const locale = useLocale();

  useEffect(() => {
    trackResumeRagPageViewed({ locale, surface });
  }, [locale, surface]);

  return null;
};
