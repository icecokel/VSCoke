import type { components } from "@/types/api";

export type ResumeRagChatRequest = components["schemas"]["ResumeRagChatRequestDto"];

export type ResumeRagSource = {
  title: string;
  sourcePath: string;
  sourceKey: string;
  sectionPath?: string;
  version?: string;
  caveats?: string[];
  excerpt: string;
  similarity: number;
  publicUrl?: string;
};

export type ResumeRagChatResponse = {
  conversationId?: string;
  requestId?: string;
  answer: string;
  grounded: boolean;
  sources: ResumeRagSource[];
};
