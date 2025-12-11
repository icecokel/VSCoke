"use client";

import BaseText from "@/components/base-ui/text";
import resumeData from "@/../resume.json";
import CareerSection from "./career-section";

const Resume = () => {
  const { careers } = resumeData;

  return (
    <div className="flex justify-between">
      <div className="gap-5 ml-5 mt-5 fixed hidden lg:block bg-gray-800/95 p-4 rounded-lg backdrop-blur-xs max-w-[240px]">
        {careers.map((career, index) => (
          <div key={index} className="mb-4">
            <a href={`#career_${index}`}>
              <BaseText
                type="body1"
                className={"text-white hover:text-yellow-200 font-bold text-lg"}
              >
                {career.company}
              </BaseText>
              <BaseText type="body2" className={"text-gray-300"}>
                {career.period}
              </BaseText>
            </a>
          </div>
        ))}
      </div>
      <div className="lg:ml-[280px]">
        {careers.map((career, careerIndex) => (
          <CareerSection key={careerIndex} career={career} index={careerIndex} />
        ))}
      </div>
    </div>
  );
};

export default Resume;
