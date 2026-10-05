"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { reportException } from "@/lib/error-reporting";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const LocaleError = ({ error, reset }: Props) => {
  const t = useTranslations("errorTracking");
  const [eventId, setEventId] = useState<string>();

  useEffect(() => {
    const nextEventId = crypto.randomUUID();
    setEventId(nextEventId);
    void reportException("react", error, window.location.pathname, "browser", nextEventId);
  }, [error]);

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p>{t("description")}</p>
      {eventId && <p className="font-mono text-xs text-gray-400">{t("reference", { eventId })}</p>}
      <button type="button" onClick={reset} className="rounded border px-4 py-2">
        {t("retry")}
      </button>
    </main>
  );
};

export default LocaleError;
