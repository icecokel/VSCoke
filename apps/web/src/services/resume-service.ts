import { ApiError, apiClient } from "@/lib/api-client";
import type { components } from "@/types/api";

export type ResumeDocument = components["schemas"]["ResumeDocumentDto"];
export type ResumePreview = components["schemas"]["ResumePreviewDto"];
export type ResumeDetail = components["schemas"]["ResumeDetailDto"];
export type ResumeDetailSummary = components["schemas"]["ResumeDetailSummaryDto"];

const resumeRequestOptions = { cache: "no-store" } as const;

export const getResumeDocument = async (locale: string, resume = "pe"): Promise<ResumeDocument> => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resume) || resume.length > 80)
    throw new ApiError(404, "Resume not found");
  return apiClient.get<ResumeDocument>(
    `/resume?${new URLSearchParams({ locale, resume })}`,
    resumeRequestOptions,
  );
};

export const getResumePreview = async (locale: string, resume = "pe"): Promise<ResumePreview> => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resume) || resume.length > 80)
    throw new ApiError(404, "Resume not found");
  return apiClient.get<ResumePreview>(
    `/resume/preview?${new URLSearchParams({ locale, resume })}`,
    resumeRequestOptions,
  );
};

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
