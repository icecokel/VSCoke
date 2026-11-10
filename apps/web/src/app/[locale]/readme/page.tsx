import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import Profile from "@/components/profile/profile";
import { ResumeRagPageViewTracker } from "@/features/resume-rag/components/resume-rag-page-view-tracker";
import { ReadmeResumeQuestionComposer } from "@/features/resume-rag/components/readme-resume-question-composer";
import { ResumeLocaleUnavailable } from "@/features/resume/components/resume-locale-unavailable";
import {
  getResumeKey,
  resumePath,
  type ResumeSearchParams,
} from "@/features/resume/lib/resume-selection";
import { ApiError } from "@/lib/api-client";
import { siteUrl } from "@/lib/site-url";
import { getResumeDocument, isResumeOnlyInDefaultLocale } from "@/services/resume-service";

export const dynamic = "force-dynamic";

interface ReadmePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ResumeSearchParams>;
}

// 기본 언어에만 공개된 이력서는 null로 구분해 404 대신 기본 언어 이력서 안내를 보여 준다.
const getDocument = cache(async (locale: string, key: string) => {
  try {
    return await getResumeDocument(locale, key);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      if (await isResumeOnlyInDefaultLocale(locale, key)) return null;
      notFound();
    }
    throw error;
  }
});

export const generateMetadata = async ({
  params,
  searchParams,
}: ReadmePageProps): Promise<Metadata> => {
  const { locale } = await params;
  const key = getResumeKey((await searchParams).resume);
  const document = await getDocument(locale, key);
  if (!document) {
    const t = await getTranslations("resumeLocaleUnavailable");
    return { title: t("title"), robots: { index: false, follow: true } };
  }
  const url = `${siteUrl}/${locale}${resumePath("/readme", key)}`;
  return {
    title: document.title,
    description: document.introduction.join(" "),
    alternates: { canonical: url },
    twitter: { title: document.title, description: document.introduction.join(" ") },
    openGraph: { title: document.title, description: document.introduction.join(" "), url },
  };
};

const ReadmePage = async ({ params, searchParams }: ReadmePageProps) => {
  const { locale } = await params;
  const key = getResumeKey((await searchParams).resume);
  const document = await getDocument(locale, key);
  if (!document) return <ResumeLocaleUnavailable path={resumePath("/readme", key)} />;
  return (
    <>
      <ResumeRagPageViewTracker surface="readme" />
      <Profile document={document} />
      <ReadmeResumeQuestionComposer key={`${locale}:${key}`} resumeKey={key} />
    </>
  );
};

export default ReadmePage;
