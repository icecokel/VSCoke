import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { CustomLink } from "@/components/custom-link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getResumeDetailBySlug, getAllResumeDetails } from "@/lib/resume-detail";
import { mdxComponents } from "@/components/blog/mdx-components";

interface ResumeDetailPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export const generateStaticParams = async () => {
  const details = getAllResumeDetails();
  return details.map(detail => ({ slug: detail.slug }));
};

export const generateMetadata = async ({ params }: ResumeDetailPageProps): Promise<Metadata> => {
  const { slug, locale } = await params;
  const detail = getResumeDetailBySlug(slug);

  if (!detail) {
    return { title: "Resume Detail Not Found" };
  }

  const url = `https://vscoke.vercel.app/${locale}/resume/${slug}`;

  return {
    title: detail.title,
    openGraph: {
      title: detail.title,
      type: "article",
      url,
      images: [
        {
          url: "https://vscoke.vercel.app/og.png",
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
  const detail = getResumeDetailBySlug(slug);
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
      url: `https://vscoke.vercel.app/${locale}/readme`,
    },
  };

  return (
    <div className="p-3 md:p-5 max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CustomLink
        href="/readme"
        title="README"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-yellow-200 mb-6"
      >
        <Icon kind="arrow_back" size={18} />
        <BaseText type="body2">{t("backToResume")}</BaseText>
      </CustomLink>

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
