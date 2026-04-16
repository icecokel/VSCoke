"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import BaseText from "@/components/base-ui/text";
import { Button } from "@/components/ui/button";
import { CustomLink } from "@/components/custom-link";
import {
  getLatestGeekNewsArticles,
  type GeekNewsArticleResponseDto,
} from "@/services/geeknews-service";

type GeekNewsFeedProps = {
  initialArticles: GeekNewsArticleResponseDto[];
  locale: string;
  pageSize: number;
};

const formatDateTime = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getStatusStyle = (status: GeekNewsArticleResponseDto["translationStatus"]) => {
  switch (status) {
    case "translated":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "failed":
      return "border-rose-400/30 bg-rose-400/10 text-rose-200";
    default:
      return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
};

const GeekNewsArticleCard = ({
  article,
  locale,
}: {
  article: GeekNewsArticleResponseDto;
  locale: string;
}) => {
  const t = useTranslations("geeknews");
  const displayTitle = article.translatedTitle ?? article.title;
  const displayContent = article.translatedContent ?? article.content;
  const postedAt = formatDateTime(article.postedAt, locale);
  const statusLabel =
    article.translationStatus === "translated"
      ? t("statusTranslated")
      : article.translationStatus === "failed"
        ? t("statusFailed")
        : t("statusPending");

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-700 bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusStyle(article.translationStatus)}`}
          >
            {statusLabel}
          </span>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
            {t("languageLabel")}: {article.sourceLanguage}
            {article.translatedLanguage ? ` -> ${article.translatedLanguage}` : ""}
          </span>
        </div>
        <span className="rounded-md bg-gray-800 px-2 py-1 text-xs font-semibold text-gray-300">
          #{article.rank}
        </span>
      </div>

      <BaseText type="h6" className="line-clamp-2 text-gray-50">
        <CustomLink
          href={`/geeknews/${article.id}`}
          title={displayTitle}
          className="transition-colors hover:text-cyan-200"
        >
          {displayTitle}
        </CustomLink>
      </BaseText>

      <p className="mt-3 line-clamp-5 text-sm leading-6 text-gray-300">{displayContent}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
        <span className="rounded-md bg-gray-800/80 px-2 py-1">
          {t("points")}: {article.points}
        </span>
        <span className="rounded-md bg-gray-800/80 px-2 py-1">
          {t("comments")}: {article.commentCount}
        </span>
        <span className="rounded-md bg-gray-800/80 px-2 py-1">
          {t("listedAt")}: {article.listedAtText}
        </span>
        {postedAt && (
          <span className="rounded-md bg-gray-800/80 px-2 py-1">
            {t("postedAt")}: {postedAt}
          </span>
        )}
      </div>

      {article.translatedTitle && article.translatedTitle !== article.title && (
        <div className="mt-4 rounded-lg border border-gray-700/80 bg-gray-800/60 px-3 py-2">
          <BaseText type="caption" className="font-semibold text-gray-400">
            {t("originalTitle")}
          </BaseText>
          <BaseText type="body2" className="mt-1 text-gray-200">
            {article.title}
          </BaseText>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <CustomLink
          href={`/geeknews/${article.id}`}
          title={displayTitle}
          className="inline-flex items-center rounded-md border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-violet-400/20"
        >
          {t("viewDetail")}
        </CustomLink>
        <a
          href={article.topicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20"
        >
          {t("openTopic")}
        </a>
        {article.sourceUrl && (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-700"
          >
            {t("openSource")}
          </a>
        )}
      </div>
    </article>
  );
};

export const GeekNewsFeed = ({ initialArticles, locale, pageSize }: GeekNewsFeedProps) => {
  const t = useTranslations("geeknews");
  const [articles, setArticles] = useState(initialArticles);
  const [requestedLimit, setRequestedLimit] = useState(Math.max(initialArticles.length, pageSize));
  const [hasMore, setHasMore] = useState(initialArticles.length >= pageSize);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(false);

    const currentLength = articles.length;
    const nextLimit = requestedLimit + pageSize;

    try {
      const nextArticles = await getLatestGeekNewsArticles({ limit: nextLimit });
      const hasNewItems = nextArticles.length > currentLength;

      startTransition(() => {
        setArticles(nextArticles);
        setRequestedLimit(nextLimit);
        setHasMore(hasNewItems && nextArticles.length >= nextLimit);
      });
    } catch {
      setLoadMoreError(true);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [articles.length, hasMore, pageSize, requestedLimit, startTransition]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore || loadMoreError) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadMore, loadMoreError]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {articles.map(article => (
          <GeekNewsArticleCard key={article.id} article={article} locale={locale} />
        ))}
      </div>

      <div ref={sentinelRef} className="mt-6 flex min-h-16 items-center justify-center">
        {loadMoreError ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <BaseText type="body2" className="text-rose-200">
              {t("loadMoreFailed")}
            </BaseText>
            <Button type="button" variant="outline" onClick={() => void loadMore()}>
              {t("retryLoadMore")}
            </Button>
          </div>
        ) : isLoadingMore || isPending ? (
          <BaseText type="body2" className="text-gray-400">
            {t("loadingMore")}
          </BaseText>
        ) : hasMore ? (
          <BaseText type="caption" className="text-gray-500">
            {t("autoLoadHint")}
          </BaseText>
        ) : (
          <BaseText type="caption" className="text-gray-500">
            {t("allLoaded")}
          </BaseText>
        )}
      </div>
    </div>
  );
};
