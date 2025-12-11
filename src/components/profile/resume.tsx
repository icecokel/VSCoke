"use client";

import Chip from "@/components/base-ui/chip";
import BaseText from "@/components/base-ui/text";
import resumeData from "@/../resume.json";

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
          <Resume.careerSection key={careerIndex} career={career} index={careerIndex} />
        ))}
      </div>
    </div>
  );
};

export default Resume;

interface Career {
  company: string;
  period: string;
  employmentType: string;
  projects: Project[];
}

interface Project {
  title: string;
  period?: string;
  descriptions?: Description[];
  phase?: Phase[];
}

interface Description {
  subtitle: string;
  detail?: string;
  skills?: string;
  tasks?: string[];
  achievement?: string;
}

interface Phase {
  name: string;
  descriptions: Description[];
  note?: string;
}

Resume.careerSection = ({ career, index }: { career: Career; index: number }) => {
  return (
    <div id={`career_${index}`} className="mb-12">
      <div className="mb-8">
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

          {project.phase ? (
            // Phase 구조가 있는 경우
            project.phase.map((phase, phaseIndex) => (
              <div key={phaseIndex} className="mb-6 ml-4">
                <BaseText type="body1" className="text-blue-100 font-bold mb-3">
                  {phase.name}
                </BaseText>
                {phase.descriptions.map((desc, descIndex) => (
                  <Resume.description key={descIndex} description={desc} />
                ))}
                {phase.note && (
                  <BaseText type="body2" className="text-gray-300 mt-3 italic">
                    * {phase.note}
                  </BaseText>
                )}
              </div>
            ))
          ) : (
            // 일반 descriptions 구조
            project.descriptions?.map((desc, descIndex) => (
              <Resume.description key={descIndex} description={desc} />
            ))
          )}
        </div>
      ))}
    </div>
  );
};

Resume.description = ({ description }: { description: Description }) => {
  return (
    <div className="mb-4 ml-4">
      <BaseText type="body1" className="text-white font-medium mb-2">
        {description.subtitle}
      </BaseText>

      {description.detail && (
        <BaseText type="body2" className="text-gray-300 mb-2">
          {description.detail}
        </BaseText>
      )}

      {description.skills && (
        <div className="mb-3">
          <BaseText type="body2" className="text-gray-400 mb-2">
            기술 스택
          </BaseText>
          <div className="flex flex-wrap gap-2">
            {description.skills.split(", ").map((skill, index) => (
              <Chip
                key={index}
                label={skill}
                className="text-white hover:border-yellow-200 hover:text-yellow-200 select-none"
              />
            ))}
          </div>
        </div>
      )}

      {description.tasks && description.tasks.length > 0 && (
        <ul className="ml-4 mb-3">
          {description.tasks.map((task, index) => (
            <li key={index} className="text-gray-300 text-sm mb-1 list-disc">
              {task}
            </li>
          ))}
        </ul>
      )}

      {description.achievement && (
        <div className="mt-3 p-3 bg-blue-300/10 rounded-sm border-l-4 border-blue-300">
          <BaseText type="body2" className="text-blue-100 font-medium">
            💡 성과
          </BaseText>
          <BaseText type="body2" className="text-gray-300 mt-1 whitespace-pre-line">
            {description.achievement}
          </BaseText>
        </div>
      )}
    </div>
  );
};
