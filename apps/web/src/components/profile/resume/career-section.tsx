"use client";

import { useTranslations } from "next-intl";
import BaseText from "@/components/base-ui/text";
import { ResumeCareerData, ResumeProjectData, Description } from "./types";
import DescriptionItem from "./description-item";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";

interface CareerSectionProps {
  careerData: ResumeCareerData;
  index: number;
}

export const CareerSection = ({ careerData, index }: CareerSectionProps) => {
  const t = useTranslations(`resume.careers.${careerData.id}`);
  const tResume = useTranslations("resume");
  const router = useCustomRouter();

  const handleLink = (fileRef?: string) => {
    if (!fileRef) return;
    router.push(`/resume/${fileRef}`);
  };

  // description-item에서 사용하는 Description 타입과 호환되도록 처리
  // any 사용을 피하기 위해 raw 데이터의 타입을 단언하거나 체크해야 함

  return (
    <div id={`career_${index}`} className="mb-12">
      <div className="mb-8 ml-2">
        <BaseText type="h5" className="text-yellow-200">
          {t("company")}
        </BaseText>
        <BaseText type="body1" className="text-gray-300 mt-2">
          {t("period")} · {t("employmentType")}
        </BaseText>
      </div>

      {careerData.projects.map(projectData => {
        const projectKey = `projects.${projectData.id}`;

        return (
          <div key={projectData.id} className="mb-8 ml-4">
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <BaseText type="h6" className="text-white">
                  {t(`${projectKey}.title`)}
                </BaseText>
                {projectData.fileRef && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLink(projectData.fileRef)}
                    className="h-7 text-xs border-yellow-200/50 text-yellow-200 hover:bg-yellow-200/10 hover:text-yellow-100"
                  >
                    {tResume("viewDescription")}
                  </Button>
                )}
              </div>
              {t.has(`${projectKey}.period`) && (
                <BaseText type="body2" className="text-gray-300 mt-1">
                  {t(`${projectKey}.period`)}
                </BaseText>
              )}
            </div>

            {renderDescriptions(projectData, t, projectKey, tResume("viewDescription"), handleLink)}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to render descriptions based on structure
const renderDescriptions = (
  projectData: ResumeProjectData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  projectKey: string,
  buttonLabel: string,
  onLink: (ref: string) => void,
) => {
  if (projectData.descriptions && projectData.descriptions.length > 0) {
    // JSON에 정의된 구조 (예: 'Others' 섹션)
    return projectData.descriptions.map(descData => {
      const desc = t.raw(`${projectKey}.descriptions.${descData.id}`) as Description;
      return (
        <div key={descData.id} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {descData.fileRef && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLink(descData.fileRef!)}
                className="h-6 text-[10px] px-2 border-yellow-200/50 text-yellow-200 hover:bg-yellow-200/10 hover:text-yellow-100"
              >
                {buttonLabel}
              </Button>
            )}
          </div>
          <DescriptionItem description={desc} />
        </div>
      );
    });
  } else {
    // 번역 내 배열 구조 (표준 프로젝트)
    const descriptions = t.raw(`${projectKey}.descriptions`) as Description[];
    if (Array.isArray(descriptions)) {
      return descriptions.map((desc, i) => <DescriptionItem key={i} description={desc} />);
    }
  }
  return null;
};
