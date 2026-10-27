import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { CustomLink } from "@/components/custom-link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";

import { getResumeDetailBySlug } from "@/services/resume-service";
import { cache } from "react";

import { mdxComponents } from "@/components/profile/resume/resume-mdx-components";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const getDetail = cache(getResumeDetailBySlug);

interface ResumeDetailPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export const generateMetadata = async ({ params }: ResumeDetailPageProps): Promise<Metadata> => {
  const { slug, locale } = await params;
  const detail = await getDetail(slug);

  if (!detail) {
    notFound();
  }

  const url = `${siteUrl}/${locale}/resume/${slug}`;

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

const ResumeDetailPage = async ({ params }: ResumeDetailPageProps) => {
  const { locale, slug } = await params;
  const detail = await getDetail(slug);
  const t = await getTranslations("resume");

  if (!detail) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: detail.title,
    author: {
      "@type": "Person",
      name: "icecokel",
      url: `${siteUrl}/${locale}/readme`,
    },
  };

  return (
    <div className="p-3 md:p-5 max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <CustomLink
        href="/readme"
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

      <header className="mb-8 pb-6 border-b border-gray-700">
        <BaseText type="h2" className="text-yellow-200 mb-4">
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

      <article className="prose prose-invert max-w-none pb-20">
        <MDXRemote source={detail.content} components={mdxComponents} />
      </article>
    </div>
  );
};

export default ResumeDetailPage;
