import type { ResumeDocument } from "@/services/resume-service";

export type ResumeCareerData = ResumeDocument["careers"][number];
export type ResumeProjectData = ResumeCareerData["projects"][number];
export type Description = ResumeProjectData["descriptions"][number];
