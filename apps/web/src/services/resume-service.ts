import { ApiError, apiClient } from "@/lib/api-client";
import type { components } from "@/types/api";

export type ResumeDocument = components["schemas"]["ResumeDocumentDto"];
export type ResumeDetail = components["schemas"]["ResumeDetailDto"];
export type ResumeDetailSummary = components["schemas"]["ResumeDetailSummaryDto"];

const resumeRequestOptions = { cache: "no-store" } as const;

export const getResumeDocument = (locale: string): Promise<ResumeDocument> =>
  apiClient.get<ResumeDocument>(`/resume?${new URLSearchParams({ locale })}`, resumeRequestOptions);

export const getResumeDetails = (): Promise<ResumeDetailSummary[]> =>
  apiClient.get<ResumeDetailSummary[]>("/resume/details", resumeRequestOptions);

export const getResumeDetailBySlug = async (slug: string): Promise<ResumeDetail | null> => {
  try {
    return await apiClient.get<ResumeDetail>(
      `/resume/details/${encodeURIComponent(slug)}`,
      resumeRequestOptions,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};
