import type { ResumeDocument } from "@/services/resume-service";

export const getResumeProjectAnchorIds = (document: ResumeDocument): string[][] => {
  const keys = document.careers.map(career =>
    career.projects.map(project =>
      project.id.trim() ? JSON.stringify([career.id, project.id]) : undefined,
    ),
  );
  const counts = new Map<string, number>();
  for (const key of keys.flat()) {
    if (key !== undefined) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const usedIds = new Set<string>();
  return document.careers.map((career, careerIndex) =>
    career.projects.map((project, projectIndex) => {
      const key = keys[careerIndex][projectIndex];
      // shortcut: 대체 키는 언어·variant의 항목 순서가 같을 때만 유지되며, 재정렬 시 고유 ID가 필요하다.
      const baseId =
        key !== undefined && counts.get(key) === 1
          ? `resume-project:${encodeURIComponent(career.id)}:${encodeURIComponent(project.id)}`
          : `resume-project:${careerIndex}-${projectIndex}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
      usedIds.add(id);
      return id;
    }),
  );
};
