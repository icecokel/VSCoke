"use client";

import { useTranslations } from "next-intl";

import BaseText from "@/components/base-ui/text";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";

import DescriptionItem from "./description-item";
import type { Description, ResumeProjectData } from "./types";

interface CareerProjectProps {
  careerId: string;
  projectData: ResumeProjectData;
}

export const CareerProject = ({ careerId, projectData }: CareerProjectProps) => {
  const t = useTranslations(`resume.careers.${careerId}`);
  const tResume = useTranslations("resume");
  const router = useCustomRouter();
  const projectKey = `projects.${projectData.id}`;
  const descriptions = t.raw(`${projectKey}.descriptions`) as Description[];
  const { fileRef } = projectData;

  return (
    <article className="mb-8 ml-4">
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <BaseText type="h6" className="text-white">
            {t(`${projectKey}.title`)}
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
        {t.has(`${projectKey}.period`) && (
          <BaseText type="body2" className="mt-1 block text-gray-300">
            {t(`${projectKey}.period`)}
          </BaseText>
        )}
      </header>

      {descriptions.map((description, index) => (
        <DescriptionItem key={`${description.subtitle}-${index}`} description={description} />
      ))}
    </article>
  );
};
