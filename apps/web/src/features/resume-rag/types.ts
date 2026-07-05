export type ResumeRagChatRequest = {
  question: string;
  locale: string;
};

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
  answer: string;
  grounded: boolean;
  sources: ResumeRagSource[];
};
