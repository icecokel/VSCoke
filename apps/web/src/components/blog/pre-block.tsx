"use client";

import { Check, Copy, Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PreBlockProps extends HTMLAttributes<HTMLPreElement> {
  children: ReactNode;
  language?: string;
  variant?: "default" | "article";
}

export const PreBlock = ({
  children,
  className,
  language,
  variant = "default",
  ...props
}: PreBlockProps) => {
  const t = useTranslations("blog.detail");
  const preRef = useRef<HTMLPreElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const isArticle = variant === "article";

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    if (!preRef.current) return;
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(preRef.current.textContent ?? "");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2500);
  };

  const copyButton = (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      aria-label={t("copyCode")}
      className={cn(
        "min-h-10 text-muted-foreground hover:text-foreground",
        !isArticle && "absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100",
        copyState === "copied" && "text-foreground",
      )}
    >
      {copyState === "copied" ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {isArticle && (copyState === "copied" ? t("copied") : t("copyCode"))}
    </Button>
  );

  return (
    <div
      className={cn(
        "group relative min-w-0",
        isArticle ? "my-7 rounded-xl border border-border bg-card" : "mb-4",
      )}
      data-blog-speech-exclude
      data-testid={isArticle ? "blog-code-block" : undefined}
    >
      {isArticle && (
        <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-border bg-muted/50 px-4 py-1">
          <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground">
            <Terminal aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{language || t("code")}</span>
          </span>
          {copyButton}
        </div>
      )}
      <pre
        ref={preRef}
        tabIndex={0}
        className={cn(
          "max-w-full overflow-x-auto font-mono text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isArticle ? "rounded-b-xl p-4 text-card-foreground sm:p-5" : "rounded-lg bg-gray-900 p-4",
          className,
        )}
        {...props}
      >
        {children}
      </pre>
      {!isArticle && copyButton}
      <span
        className={
          copyState === "error" ? "block px-4 py-2 text-sm text-muted-foreground" : "sr-only"
        }
        role="status"
      >
        {copyState === "error" ? t("copyFailed") : copyState === "copied" ? t("copied") : ""}
      </span>
    </div>
  );
};
