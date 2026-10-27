"use client";

import BaseText from "@/components/base-ui/text";

import AchievementBox from "./achievement-box";
import { CareerProject } from "./career-project";
import type { ResumeCareerData } from "./types";

interface CareerSectionProps {
  careerData: ResumeCareerData;
  index: number;
  resumeKey: string;
}

export const CareerSection = ({ careerData, index, resumeKey }: CareerSectionProps) => {
  return (
    <section id={`career_${index}`} className="mb-12">
      <header className="mb-8 ml-2">
        <BaseText type="h5" className="text-yellow-200">
          {careerData.company}
        </BaseText>
        <BaseText type="body1" className="mt-2 block text-gray-300">
          {careerData.period} · {careerData.role}
        </BaseText>
      </header>

      {careerData.projects.map(projectData => (
        <CareerProject key={projectData.id} projectData={projectData} resumeKey={resumeKey} />
      ))}

      {careerData.achievement && (
        <div className="ml-4">
          <AchievementBox achievement={careerData.achievement} />
        </div>
      )}
    </section>
  );
};
