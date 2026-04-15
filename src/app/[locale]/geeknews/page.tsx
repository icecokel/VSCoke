import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BaseText from "@/components/base-ui/text";
import {
  getLatestGeekNewsArticles,
  type GeekNewsArticleResponseDto,
} from "@/services/geeknews-service";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";

const ARTICLE_LIMIT = 12;

type Props = {
  params: Promise<{ locale: string }>;
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

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "geeknews" });

  return {
    title: t("title"),
    description: t("description"),
  };
};

const GeekNewsPage = async ({ params }: Props) => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "geeknews" });

  let articles: GeekNewsArticleResponseDto[] = [];
  let loadFailed = false;

  try {
    articles = await getLatestGeekNewsArticles({ limit: ARTICLE_LIMIT });
  } catch {
    loadFailed = true;
  }

  return (
    <div className="p-3 md:p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <BaseText type="h3" className="mb-2 text-cyan-200">
            {t("title")}
          </BaseText>
          <BaseText type="body1" className="text-gray-300">
            {t("description")}
          </BaseText>
          <BaseText type="caption" className="mt-1 block text-cyan-400/80">
            {t("latestLabel")} / {ARTICLE_LIMIT}
          </BaseText>
        </div>
        <div className="flex items-center gap-2">
          <ShareLinkButton />
          <ShareQrDialog />
        </div>
      </div>

      {loadFailed && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <BaseText type="body2" className="font-semibold text-rose-200">
            {t("loadFailedTitle")}
          </BaseText>
          <BaseText type="caption" className="text-rose-100/80">
            {t("loadFailedDescription")}
          </BaseText>
        </div>
      )}

      {articles.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 px-5 py-10 text-center">
          <BaseText type="h6" className="text-gray-100">
            {t("emptyTitle")}
          </BaseText>
          <BaseText type="body2" className="mt-2 text-gray-400">
            {t("emptyDescription")}
          </BaseText>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {articles.map(article => {
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
              <article
                key={article.id}
                className="flex h-full flex-col rounded-2xl border border-gray-700 bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
              >
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
                  {displayTitle}
                </BaseText>

                <p className="mt-3 line-clamp-5 text-sm leading-6 text-gray-300">
                  {displayContent}
                </p>

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
          })}
        </div>
      )}
    </div>
  );
};

export default GeekNewsPage;
