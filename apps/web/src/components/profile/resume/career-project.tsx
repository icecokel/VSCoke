"use client";

import { resumePath } from "@/features/resume/lib/resume-selection";
import { useTranslations } from "next-intl";

import BaseText from "@/components/base-ui/text";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";

import DescriptionItem from "./description-item";
import type { ResumeProjectData } from "./types";

interface CareerProjectProps {
  projectData: ResumeProjectData;
  projectId: string;
  resumeKey: string;
  heading: "h2" | "h3";
}

export const CareerProject = ({
  projectData,
  projectId,
  resumeKey,
  heading,
}: CareerProjectProps) => {
  const tResume = useTranslations("resume");
  const router = useCustomRouter();
  const { fileRef, descriptions } = projectData;
  const descriptionHeading = projectData.title.trim() ? (heading === "h2" ? "h3" : "h4") : heading;

  return (
    <article id={projectId} className="mb-8 ml-4 scroll-mt-16">
      <header className="mb-4">
        <div className="flex items-center gap-3">
          {projectData.title.trim() && (
            <BaseText type="h6" as={heading} className="text-white">
              {projectData.title}
            </BaseText>
          )}
          {fileRef && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(resumePath(`/resume/${fileRef}`, resumeKey), {
                  title: projectData.title,
                })
              }
              className="h-7 border-yellow-200/50 text-xs text-yellow-200 hover:bg-yellow-200/10 hover:text-yellow-100"
            >
              {tResume("viewDescription")}
            </Button>
          )}
        </div>
        {projectData.period && (
          <BaseText type="body2" className="mt-1 block text-gray-300">
            {projectData.period}
          </BaseText>
        )}
      </header>

      {descriptions.map((description, index) => (
        <DescriptionItem
          key={`${description.subtitle}-${index}`}
          description={description}
          heading={descriptionHeading}
        />
      ))}
    </article>
  );
};
