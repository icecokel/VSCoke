import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResumeQuestionChat } from "@/features/resume-rag/components/resume-question-chat";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("resumeRag");

  return {
    title: t("title"),
  };
};

const ResumeQuestionPage = async () => {
  const t = await getTranslations("resumeRag");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-3 py-4 md:px-5">
      <header className="mb-4 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-semibold text-gray-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-400">{t("subtitle")}</p>
      </header>
      <ResumeQuestionChat />
    </main>
  );
};

export default ResumeQuestionPage;
