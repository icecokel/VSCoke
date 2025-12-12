"use client";

import BaseText from "@/components/base-ui/text";
import { Career } from "./types";
import DescriptionItem from "./description-item";

interface CareerSectionProps {
  career: Career;
  index: number;
}

const CareerSection = ({ career, index }: CareerSectionProps) => {
  return (
    <div id={`career_${index}`} className="mb-12">
      <div className="mb-8 ml-2">
        <BaseText type="h5" className="text-yellow-200">
          {career.company}
        </BaseText>
        <BaseText type="body1" className="text-gray-300 mt-2">
          {career.period} · {career.employmentType}
        </BaseText>
      </div>

      {career.projects.map((project, projectIndex) => (
        <div key={projectIndex} className="mb-8 ml-4">
          <div className="mb-4">
            <BaseText type="h6" className="text-white">
              {project.title}
            </BaseText>
            {project.period && (
              <BaseText type="body2" className="text-gray-300 mt-1">
                {project.period}
              </BaseText>
            )}
          </div>

          {project.descriptions?.map((desc, descIndex) => (
            <DescriptionItem key={descIndex} description={desc} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default CareerSection;
