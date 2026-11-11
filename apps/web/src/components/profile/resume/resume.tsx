"use client";

import { getResumeProjectAnchorIds } from "@/features/resume/lib/project-anchor";
import { resumePath } from "@/features/resume/lib/resume-selection";
import Link from "next/link";
import BaseText from "@/components/base-ui/text";
import { CustomLink } from "@/components/custom-link";
import { Button } from "@/components/ui/button";
import { CareerSection } from "./career-section";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";
import type { ResumeDocument } from "@/services/resume-service";

const Resume = ({ document: resume }: { document: ResumeDocument }) => {
  const t = useTranslations("resume");
  const { careers, personalProjects } = resume;
  const projectIds = getResumeProjectAnchorIds(resume);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    const scrollTarget = scrollContainer ?? window;
    const careerElements = careers.map((_, index) => document.getElementById(`career_${index}`));

    const handleScroll = () => {
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

    const restoreFragment = () => {
      if (!scrollContainer) return;
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        scrollContainer.scrollTop = 0;
        return;
      }
      const target = document.getElementById(id);
      if (!target || !scrollContainer.contains(target)) {
        scrollContainer.scrollTop = 0;
        return;
      }
      const margin = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      scrollContainer.scrollTop +=
        target.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - margin;
      handleScroll();
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    window.addEventListener("hashchange", restoreFragment);
    handleScroll(); // 초기 실행
    const frame = requestAnimationFrame(restoreFragment);

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("hashchange", restoreFragment);
      cancelAnimationFrame(frame);
    };
  }, [careers]);

  return (
    <div className="flex gap-5">
      {/* 커리어 네비 - sticky */}
      <div className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-[100px] bg-gray-800/95 p-4 rounded-lg backdrop-blur-xs">
          {careers.map((career, index) => (
            <div key={index} className="mb-4">
              <Link href={`#career_${index}`}>
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
              </Link>
            </div>
          ))}
        </div>
      </div>
      {/* 커리어 상세 */}
      <div className="flex-1">
        {careers.map((career, careerIndex) => (
          <CareerSection
            key={careerIndex}
            careerData={career}
            index={careerIndex}
            resumeKey={resume.key}
            projectIds={projectIds[careerIndex]}
          />
        ))}
        {personalProjects.length > 0 && (
          <section aria-labelledby="personal-projects-title" className="mb-12">
            <BaseText
              id="personal-projects-title"
              type="h5"
              as="h2"
              className="mb-8 ml-2 text-yellow-200"
            >
              {t("personalProjects.title")}
            </BaseText>
            {personalProjects.map(project => (
              <article key={project.id} className="mb-8 ml-4">
                {project.title.trim() && (
                  <BaseText type="h6" as="h3" className="text-white">
                    {project.title}
                  </BaseText>
                )}
                <BaseText type="body2" className="mt-2 block text-gray-300">
                  {project.description}
                </BaseText>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 border-yellow-200/50 text-xs text-yellow-200 hover:bg-yellow-200/10 hover:text-yellow-100"
                >
                  <CustomLink href={resumePath(`/resume/${project.fileRef}`, resume.key)}>
                    {t("personalProjects.viewDescription")}
                  </CustomLink>
                </Button>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default Resume;
