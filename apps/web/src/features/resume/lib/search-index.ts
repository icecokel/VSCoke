import { resumePath } from "./resume-selection";
import type { ResumeDocument } from "@/services/resume-service";
import type { SearchItem } from "@/types/search";

export const buildResumeSearchItems = (document: ResumeDocument): SearchItem[] => [
  {
    id: "profile:readme",
    type: "profile",
    title: "README.md",
    description: [document.name, document.introduction[0]].filter(Boolean).join(" "),
    keywords: [document.title, ...document.skills],
    path: resumePath("/readme", document.key),
    featured: true,
    priority: 450,
  },
  ...document.careers.flatMap(career =>
    career.projects.map(project => {
      const descriptionTexts = project.descriptions.flatMap(description =>
        [
          description.subtitle,
          description.detail,
          description.skills,
          description.achievement,
          ...(description.tasks ?? []),
        ].filter((text): text is string => Boolean(text)),
      );
      return {
        id: `profile:project:${career.id}:${project.id}`,
        type: "profile",
        title: `${career.company} · ${project.title}`,
        description: [project.period, descriptionTexts[0]].filter(Boolean).join(" | "),
        keywords: [
          career.company,
          career.employmentType,
          project.title,
          project.period ?? "",
          ...descriptionTexts,
        ],
        path: resumePath(project.fileRef ? `/resume/${project.fileRef}` : "/readme", document.key),
        priority: 240,
      } satisfies SearchItem;
    }),
  ),
  ...document.personalProjects.map(project => ({
    id: `profile:personal-project:${project.id}`,
    type: "profile" as const,
    title: project.title,
    description: project.description,
    keywords: [project.title, project.description],
    path: resumePath(`/resume/${project.fileRef}`, document.key),
    priority: 240,
  })),
];
