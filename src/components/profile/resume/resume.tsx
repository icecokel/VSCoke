"use client";

import BaseText from "@/components/base-ui/text";
import CareerSection from "./career-section";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";
import RESUME_DATA from "@/constants/resume-data.json";

const Resume = () => {
  const t = useTranslations("resume");
  const careers = RESUME_DATA; // Use static data structure
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
    <div className="flex gap-5">
      {/* 커리어 네비 - sticky */}
      <div className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-[100px] bg-gray-800/95 p-4 rounded-lg backdrop-blur-xs">
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
                  {t(`careers.${career.id}.company`)}
                </BaseText>
                <br />
                <BaseText
                  type="caption"
                  className={twMerge(
                    "transition-colors",
                    activeIndex === index ? "text-yellow-200/70" : "text-gray-300",
                  )}
                >
                  {t(`careers.${career.id}.period`)}
                </BaseText>
              </a>
            </div>
          ))}
        </div>
      </div>
      {/* 커리어 상세 */}
      <div className="flex-1">
        {careers.map((career, careerIndex) => (
          <CareerSection key={careerIndex} careerData={career} index={careerIndex} />
        ))}
      </div>
    </div>
  );
};

export default Resume;
