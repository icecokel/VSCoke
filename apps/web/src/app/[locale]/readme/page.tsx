import Profile from "@/components/profile/profile";
import { ResumeRagPageViewTracker } from "@/features/resume-rag/components/resume-rag-page-view-tracker";
import { ReadmeResumeQuestionComposer } from "@/features/resume-rag/components/readme-resume-question-composer";
import { getResumeDocument } from "@/services/resume-service";

export const dynamic = "force-dynamic";

/**
 * README 페이지 - 프로필 정보를 표시
 */
const ReadmePage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const document = await getResumeDocument(locale);
  return (
    <>
      <ResumeRagPageViewTracker surface="readme" />
      <Profile document={document} />
      <ReadmeResumeQuestionComposer />
    </>
  );
};

export default ReadmePage;
