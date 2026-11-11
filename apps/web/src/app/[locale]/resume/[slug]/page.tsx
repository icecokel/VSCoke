import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { CustomLink } from "@/components/custom-link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";

import {
  getResumeKey,
  resumePath,
  type ResumeSearchParams,
} from "@/features/resume/lib/resume-selection";
import { ApiError } from "@/lib/api-client";
import { getResumeDocument, getResumeDetailBySlug } from "@/services/resume-service";
import { cache } from "react";

import { mdxComponents } from "@/components/profile/resume/resume-mdx-components";
import { siteUrl } from "@/lib/site-url";
import { HistoryDocumentTitle } from "@/components/history-tabs/history-document-title";

export const dynamic = "force-dynamic";

const getDocument = cache(getResumeDocument);

const getDetail = cache(async (slug: string, locale: string, key?: string) => {
  try {
    if (key !== undefined) await getDocument(locale, key);
    return await getResumeDetailBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

interface ResumeDetailPageProps {
  searchParams: Promise<ResumeSearchParams>;
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export const generateMetadata = async ({
  params,
  searchParams,
}: ResumeDetailPageProps): Promise<Metadata> => {
  const { slug, locale } = await params;
  const selection = await searchParams;
  const key = getResumeKey(selection.resume);
  const detail = await getDetail(slug, locale, selection.resume === undefined ? undefined : key);

  if (!detail) {
    notFound();
  }

  const url = `${siteUrl}/${locale}${resumePath(`/resume/${slug}`, key)}`;

  return {
    title: detail.title,
    openGraph: {
      title: detail.title,
      type: "article",
      url,
      images: [
        {
          url: `${siteUrl}/og.png`,
          width: 1200,
          height: 630,
          alt: detail.title,
        },
      ],
    },
  };
};

const ResumeDetailPage = async ({ params, searchParams }: ResumeDetailPageProps) => {
  const { locale, slug } = await params;
  const selection = await searchParams;
  const key = getResumeKey(selection.resume);
  const detail = await getDetail(slug, locale, selection.resume === undefined ? undefined : key);
  const t = await getTranslations("resume");
  const tDetail = await getTranslations("resumeDetail");

  if (!detail) {
    notFound();
  }

  const resume = await getDocument(locale, key);
  const careerIndex = resume.careers.findIndex(career =>
    career.projects.some(project => project.fileRef === slug),
  );
  const returnPath = `${resumePath("/readme", key)}${careerIndex >= 0 ? `#career_${careerIndex}` : ""}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: detail.title,
    inLanguage: "ko-KR",
    author: {
      "@type": "Person",
      name: "icecokel",
      url: `${siteUrl}/${locale}${resumePath("/readme", key)}`,
    },
  };

  return (
    <div className="p-3 md:p-5 max-w-4xl mx-auto">
      <HistoryDocumentTitle path={resumePath(`/resume/${slug}`, key)} title={detail.title} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <CustomLink
        href={returnPath}
        title="README"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-yellow-200 mb-6"
      >
        <Icon kind="arrow_back" size={18} />
        <BaseText type="body2">{t("backToResume")}</BaseText>
      </CustomLink>

      <div className="mb-6 flex justify-end gap-2">
        <ShareLinkButton title={detail.title} />
        <ShareQrDialog title={detail.title} />
      </div>

      {locale !== "ko-KR" && (
        <p data-testid="resume-detail-language-notice" className="mb-4 text-sm text-gray-300">
          {tDetail("languageNotice")}
        </p>
      )}

      <header className="mb-8 pb-6 border-b border-gray-700">
        <BaseText type="h2" lang="ko-KR" className="text-yellow-200 mb-4">
          {detail.title}
        </BaseText>
        {(detail.startDate || detail.endDate) && (
          <div className="flex items-center gap-4 text-gray-400 text-sm mt-4">
            <span className="flex items-center gap-1">
              <Icon kind="calendar_today" size={14} />
              {detail.startDate} {detail.endDate ? `- ${detail.endDate}` : ""}
            </span>
          </div>
        )}
      </header>

      <article lang="ko-KR" className="prose prose-invert max-w-none pb-20">
        <MDXRemote source={detail.content} components={mdxComponents} />
      </article>
    </div>
  );
};

export default ResumeDetailPage;
