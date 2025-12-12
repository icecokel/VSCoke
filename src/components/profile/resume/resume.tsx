"use client";

import BaseText from "@/components/base-ui/text";
import resumeData from "@/../resume.json";
import CareerSection from "./career-section";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

const Resume = () => {
  const { careers } = resumeData;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const careerElements = careers.map((_, index) => document.getElementById(`career_${index}`));

      // 현재 뷰포트에서 가장 위에 있는 섹션 찾기
      const scrollPosition = window.scrollY + 150; // 오프셋 조정

      for (let i = careerElements.length - 1; i >= 0; i--) {
        const element = careerElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveIndex(i);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 초기 실행

    return () => window.removeEventListener("scroll", handleScroll);
  }, [careers]);

  return (
    <div className="flex justify-between">
      <div className="gap-5 ml-5 mt-5 fixed hidden lg:block bg-gray-800/95 p-4 rounded-lg backdrop-blur-xs max-w-[240px]">
        {careers.map((career, index) => (
          <div key={index} className="mb-4">
            <a href={`#career_${index}`}>
              <BaseText
                type="body1"
                className={twMerge(
                  "font-bold text-lg transition-colors",
                  activeIndex === index ? "text-yellow-200" : "text-white hover:text-yellow-200",
                )}
              >
                {career.company}
              </BaseText>
              <br />
              <BaseText
                type="caption"
                className={twMerge(
                  "transition-colors",
                  activeIndex === index ? "text-yellow-200/70" : "text-gray-300",
                )}
              >
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
