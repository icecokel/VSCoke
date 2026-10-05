"use client";

import { useEffect } from "react";
import { reportException } from "@/lib/error-reporting";

export const ErrorTracker = () => {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportException("runtime", event.error ?? event.message, window.location.pathname);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      void reportException("rejection", event.reason, window.location.pathname);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
};
