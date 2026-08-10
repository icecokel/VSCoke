"use client";

import { useTranslations } from "next-intl";

import BaseText from "@/components/base-ui/text";

import AchievementBox from "./achievement-box";
import { CareerProject } from "./career-project";
import type { ResumeCareerData } from "./types";

interface CareerSectionProps {
  careerData: ResumeCareerData;
  index: number;
}

export const CareerSection = ({ careerData, index }: CareerSectionProps) => {
  const t = useTranslations(`resume.careers.${careerData.id}`);

  return (
    <section id={`career_${index}`} className="mb-12">
      <header className="mb-8 ml-2">
        <BaseText type="h5" className="text-yellow-200">
          {t("company")}
        </BaseText>
        <BaseText type="body1" className="mt-2 block text-gray-300">
          {t("period")} · {t("role")}
        </BaseText>
      </header>

      {careerData.projects.map(projectData => (
        <CareerProject key={projectData.id} careerId={careerData.id} projectData={projectData} />
      ))}

      {t.has("achievement") && (
        <div className="ml-4">
          <AchievementBox achievement={t("achievement")} />
        </div>
      )}
    </section>
  );
};
