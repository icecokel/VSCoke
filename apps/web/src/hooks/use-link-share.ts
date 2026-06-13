"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface LinkShareOptions {
  url?: string;
  title?: string;
  text?: string;
}

interface UseLinkShareReturn {
  canShare: boolean;
  resolveUrl: (url?: string) => string;
  shareLink: (options: LinkShareOptions) => Promise<void>;
  copyLink: (options: Pick<LinkShareOptions, "url" | "text">) => Promise<void>;
}

export const useLinkShare = (): UseLinkShareReturn => {
  const t = useTranslations("Share");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const resolveUrl = useCallback((url?: string): string => {
    if (typeof window === "undefined") return url ?? "";
    if (!url) return window.location.href;

    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return window.location.href;
    }
  }, []);

  const buildShareText = useCallback(
    (options: Pick<LinkShareOptions, "url" | "text">): string => {
      const resolvedUrl = resolveUrl(options.url);
      if (options.text) {
        return `${options.text}\n${resolvedUrl}`;
      }
      return resolvedUrl;
    },
    [resolveUrl],
  );

  const copyLink = useCallback(
    async (options: Pick<LinkShareOptions, "url" | "text">): Promise<void> => {
      const shareText = buildShareText(options);

      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(t("copied"));
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success(t("copied"));
      }
    },
    [buildShareText, t],
  );

  const shareLink = useCallback(
    async (options: LinkShareOptions): Promise<void> => {
      const resolvedUrl = resolveUrl(options.url);

      if (canShare) {
        try {
          await navigator.share({
            title: options.title,
            text: options.text,
            url: resolvedUrl,
          });
          return;
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            return;
          }
        }
      }

      try {
        await copyLink({ url: resolvedUrl, text: options.text });
      } catch {
        toast.error(t("shareFail"));
      }
    },
    [canShare, copyLink, resolveUrl, t],
  );

  return {
    canShare,
    resolveUrl,
    shareLink,
    copyLink,
  };
};
