import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BaseText from "@/components/base-ui/text";
import {
  getLatestGeekNewsArticles,
  type GeekNewsArticleResponseDto,
} from "@/services/geeknews-service";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";
import { GeekNewsFeed } from "@/components/geeknews/geeknews-feed";

const PAGE_SIZE = 12;

type Props = {
  params: Promise<{ locale: string }>;
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
    articles = await getLatestGeekNewsArticles({ limit: PAGE_SIZE });
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
            {t("latestLabel")}
          </BaseText>
          <BaseText type="caption" className="mt-1 block text-gray-500">
            {t("autoLoadHint")}
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
        <GeekNewsFeed initialArticles={articles} locale={locale} pageSize={PAGE_SIZE} />
      )}
    </div>
  );
};

export default GeekNewsPage;
