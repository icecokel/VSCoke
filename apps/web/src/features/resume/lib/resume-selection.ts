export type ResumeSearchParams = { resume?: string | string[] };

export const getResumeKey = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? "" : value) ?? "pe";

export const resumePath = (path: string, resumeKey: string): string =>
  `${path}${path.includes("?") ? "&" : "?"}${new URLSearchParams({ resume: resumeKey })}`;
