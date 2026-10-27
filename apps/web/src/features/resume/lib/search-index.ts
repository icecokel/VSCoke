import type { ResumeDocument } from "@/services/resume-service";
import type { SearchItem } from "@/types/search";

export const buildResumeSearchItems = (document: ResumeDocument): SearchItem[] => [
  {
    id: "profile:readme",
    type: "profile",
    title: "README.md",
    description: [document.name, document.introduction[0]].filter(Boolean).join(" "),
    keywords: [document.title, ...document.skills],
    path: "/readme",
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
        path: project.fileRef ? `/resume/${project.fileRef}` : "/readme",
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
    path: `/resume/${project.fileRef}`,
    priority: 240,
  })),
];
