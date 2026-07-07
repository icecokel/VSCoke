import Profile from "@/components/profile/profile";
import { ReadmeResumeQuestionComposer } from "@/features/resume-rag/components/readme-resume-question-composer";
import { NextPage } from "next";

/**
 * README 페이지 - 프로필 정보를 표시
 */
const ReadmePage: NextPage = () => {
  return (
    <>
      <Profile />
      <ReadmeResumeQuestionComposer />
    </>
  );
};

export default ReadmePage;
