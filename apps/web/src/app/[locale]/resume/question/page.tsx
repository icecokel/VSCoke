import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResumeQuestionChat } from "@/features/resume-rag/components/resume-question-chat";

type ResumeQuestionPageProps = {
  searchParams?: Promise<{
    chatId?: string | string[];
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

const ResumeQuestionPage = async ({ searchParams }: ResumeQuestionPageProps) => {
  const t = await getTranslations("resumeRag");
  const resolvedSearchParams = await searchParams;
  const chatId = getSingleSearchParam(resolvedSearchParams?.chatId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-3 py-4 md:px-5">
      <header className="mb-4 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-semibold text-gray-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-400">{t("subtitle")}</p>
      </header>
      <ResumeQuestionChat initialChatId={chatId} />
    </main>
  );
};

export default ResumeQuestionPage;
