import Profile from "@/components/profile/profile";
import { ResumeRagPageViewTracker } from "@/features/resume-rag/components/resume-rag-page-view-tracker";
import { ReadmeResumeQuestionComposer } from "@/features/resume-rag/components/readme-resume-question-composer";
import { NextPage } from "next";

/**
 * README 페이지 - 프로필 정보를 표시
 */
const ReadmePage: NextPage = () => {
  return (
    <>
      <ResumeRagPageViewTracker surface="readme" />
      <Profile />
      <ReadmeResumeQuestionComposer />
    </>
  );
};

export default ReadmePage;
