import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import Profile from "@/components/profile/profile";
import { ResumeRagPageViewTracker } from "@/features/resume-rag/components/resume-rag-page-view-tracker";
import { ReadmeResumeQuestionComposer } from "@/features/resume-rag/components/readme-resume-question-composer";
import {
  getResumeKey,
  resumePath,
  type ResumeSearchParams,
} from "@/features/resume/lib/resume-selection";
import { ApiError } from "@/lib/api-client";
import { siteUrl } from "@/lib/site-url";
import { getResumeDocument } from "@/services/resume-service";

export const dynamic = "force-dynamic";

interface ReadmePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ResumeSearchParams>;
}

const getDocument = cache(async (locale: string, key: string) => {
  try {
    return await getResumeDocument(locale, key);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
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
  return (
    <>
      <ResumeRagPageViewTracker surface="readme" />
      <Profile document={document} />
      <ReadmeResumeQuestionComposer key={`${locale}:${key}`} resumeKey={key} />
    </>
  );
};

export default ReadmePage;
