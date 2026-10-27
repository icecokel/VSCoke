"use client";

import { useTranslations } from "next-intl";

import BaseText from "@/components/base-ui/text";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";

import DescriptionItem from "./description-item";
import type { ResumeProjectData } from "./types";

interface CareerProjectProps {
  projectData: ResumeProjectData;
}

export const CareerProject = ({ projectData }: CareerProjectProps) => {
  const tResume = useTranslations("resume");
  const router = useCustomRouter();
  const { fileRef, descriptions } = projectData;

  return (
    <article className="mb-8 ml-4">
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <BaseText type="h6" className="text-white">
            {projectData.title}
          </BaseText>
          {fileRef && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/resume/${fileRef}`)}
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
        <DescriptionItem key={`${description.subtitle}-${index}`} description={description} />
      ))}
    </article>
  );
};
