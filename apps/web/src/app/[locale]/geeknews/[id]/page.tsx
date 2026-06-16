import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { CustomLink } from "@/components/custom-link";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";
import { ApiError } from "@/lib/api-client";
import { getGeekNewsArticle, type GeekNewsArticleResponseDto } from "@/services/geeknews-service";

type Props = {
  params: Promise<{ locale: string; id: string }>;
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

const getDisplayTitle = (article: GeekNewsArticleResponseDto) =>
  article.translatedTitle ?? article.title;

const getDisplayContent = (article: GeekNewsArticleResponseDto) =>
  article.translatedContent ?? article.content;

const getDescription = (article: GeekNewsArticleResponseDto) => {
  const content = getDisplayContent(article).replace(/\s+/g, " ").trim();
  return content.length > 160 ? `${content.slice(0, 157)}...` : content;
};

const loadGeekNewsArticle = async (id: string) => {
  try {
    return await getGeekNewsArticle({ id });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "geeknews" });
  const article = await loadGeekNewsArticle(id);

  if (!article) {
    return {
      title: t("detailNotFoundTitle"),
      description: t("detailNotFoundDescription"),
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = getDisplayTitle(article);
  const description = getDescription(article);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://vscoke.vercel.app/${locale}/geeknews/${article.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
};

const GeekNewsArticlePage = async ({ params }: Props) => {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "geeknews" });
  const article = await loadGeekNewsArticle(id);

  if (!article) {
    notFound();
  }

  const displayTitle = getDisplayTitle(article);
  const displayContent = getDisplayContent(article);
  const postedAt = formatDateTime(article.postedAt, locale);
  const translatedAt = formatDateTime(article.translatedAt, locale);
  const updatedAt = formatDateTime(article.updatedAt, locale);
  const hasTranslatedTitle = article.translatedTitle && article.translatedTitle !== article.title;
  const hasTranslatedContent =
    article.translatedContent && article.translatedContent !== article.content;
  const statusLabel =
    article.translationStatus === "translated"
      ? t("statusTranslated")
      : article.translationStatus === "failed"
        ? t("statusFailed")
        : t("statusPending");
  const detailPath = `/geeknews/${article.id}`;

  return (
    <div className="mx-auto max-w-6xl p-3 md:p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <CustomLink
          href="/geeknews"
          title={t("backToList")}
          className="inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-cyan-200"
        >
          <Icon kind="arrow_back" size={18} />
          <BaseText type="body2">{t("backToList")}</BaseText>
        </CustomLink>
        <div className="flex items-center gap-2">
          <ShareLinkButton url={detailPath} title={displayTitle} text={getDescription(article)} />
          <ShareQrDialog url={detailPath} title={displayTitle} />
        </div>
      </div>

      <header className="rounded-3xl border border-gray-700 bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
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
            <span className="rounded-full border border-gray-700 bg-gray-800/80 px-2.5 py-1 text-[11px] font-medium text-gray-300">
              @{article.author}
            </span>
          </div>
          <span className="rounded-md bg-gray-800 px-2 py-1 text-xs font-semibold text-gray-300">
            #{article.rank}
          </span>
        </div>

        <BaseText type="h3" className="text-gray-50">
          {displayTitle}
        </BaseText>

        {hasTranslatedTitle && (
          <div className="mt-4 rounded-xl border border-gray-700/80 bg-gray-800/60 px-4 py-3">
            <BaseText type="caption" className="font-semibold text-gray-400">
              {t("originalTitle")}
            </BaseText>
            <BaseText type="body1" className="mt-1 text-gray-100">
              {article.title}
            </BaseText>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-400">
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
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-700 bg-gray-900/70 p-6">
            <BaseText type="h5" className="text-cyan-200">
              {hasTranslatedContent ? t("translatedContentTitle") : t("contentTitle")}
            </BaseText>
            <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-200">
              {displayContent}
            </div>
          </section>

          {hasTranslatedContent && (
            <section className="rounded-3xl border border-gray-700 bg-gray-900/70 p-6">
              <BaseText type="h5" className="text-gray-100">
                {t("originalContentTitle")}
              </BaseText>
              <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-300">
                {article.content}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-gray-700 bg-gray-900/70 p-5">
            <BaseText type="h6" className="text-cyan-200">
              {t("translationInfoTitle")}
            </BaseText>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              {translatedAt && (
                <div className="rounded-xl bg-gray-800/70 px-3 py-2">
                  <span className="block text-xs text-gray-500">{t("translatedAt")}</span>
                  <span>{translatedAt}</span>
                </div>
              )}
              {updatedAt && (
                <div className="rounded-xl bg-gray-800/70 px-3 py-2">
                  <span className="block text-xs text-gray-500">{t("updatedAt")}</span>
                  <span>{updatedAt}</span>
                </div>
              )}
              {article.translationProvider && (
                <div className="rounded-xl bg-gray-800/70 px-3 py-2">
                  <span className="block text-xs text-gray-500">{t("translationProvider")}</span>
                  <span>{article.translationProvider}</span>
                </div>
              )}
              {article.translationModel && (
                <div className="rounded-xl bg-gray-800/70 px-3 py-2">
                  <span className="block text-xs text-gray-500">{t("translationModel")}</span>
                  <span>{article.translationModel}</span>
                </div>
              )}
              {article.translationError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-100">
                  <span className="block text-xs text-rose-200/80">{t("translationError")}</span>
                  <span>{article.translationError}</span>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default GeekNewsArticlePage;
