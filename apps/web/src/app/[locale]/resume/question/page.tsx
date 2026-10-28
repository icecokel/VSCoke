import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { getResumeDocument } from "@/services/resume-service";
import { getResumeKey } from "@/features/resume/lib/resume-selection";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResumeRagPageViewTracker } from "@/features/resume-rag/components/resume-rag-page-view-tracker";
import { ResumeQuestionChat } from "@/features/resume-rag/components/resume-question-chat";

type ResumeQuestionPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    chatId?: string | string[];
    resume?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("resumeRag");

  return {
    title: t("title"),
  };
};

const ResumeQuestionPage = async ({ params, searchParams }: ResumeQuestionPageProps) => {
  const t = await getTranslations("resumeRag");
  const resolvedSearchParams = await searchParams;
  const { locale } = await params;
  const resumeKey = getResumeKey(resolvedSearchParams?.resume);
  try {
    await getResumeDocument(locale, resumeKey);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const chatId = getSingleSearchParam(resolvedSearchParams?.chatId);

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-3 pt-4 md:h-auto md:overflow-visible md:px-5 md:pb-4">
      <ResumeRagPageViewTracker surface="resume_question" />
      <header className="mb-4 shrink-0 border-b border-gray-800 pr-16 pb-4 md:pr-0">
        <h1 className="text-xl font-semibold text-gray-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-400">{t("subtitle")}</p>
      </header>
      <ResumeQuestionChat
        key={`${locale}:${resumeKey}`}
        initialChatId={chatId}
        resumeKey={resumeKey}
      />
    </main>
  );
};

export default ResumeQuestionPage;
