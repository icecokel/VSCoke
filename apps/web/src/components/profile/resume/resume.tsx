"use client";

import BaseText from "@/components/base-ui/text";
import { CareerSection } from "./career-section";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";
import RESUME_DATA from "@/constants/resume-data.json";

const Resume = () => {
  const t = useTranslations("resume");
  const careers = RESUME_DATA; // Use static data structure
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    const scrollTarget = scrollContainer ?? window;

    const handleScroll = () => {
      const careerElements = careers.map((_, index) => document.getElementById(`career_${index}`));
      const threshold = (scrollContainer?.getBoundingClientRect().top ?? 0) + 150;

      // 현재 뷰포트에서 가장 위에 있는 섹션 찾기
      for (let i = careerElements.length - 1; i >= 0; i--) {
        const element = careerElements[i];
        if (element && element.getBoundingClientRect().top <= threshold) {
          setActiveIndex(i);
          break;
        }
      }
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll(); // 초기 실행

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
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
