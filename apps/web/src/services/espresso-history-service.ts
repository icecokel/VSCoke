import { ApiError, apiClient } from "@/lib/api-client";
import type { EspressoBean } from "@/features/hobby/types/espresso";

const espressoHistoryRequestOptions = {
  next: { revalidate: 60 },
} as const;

export const getEspressoBeans = async (): Promise<EspressoBean[]> => {
  return apiClient.get<EspressoBean[]>("/espresso-history/beans", espressoHistoryRequestOptions);
};

export const getEspressoBeanById = async (id: string): Promise<EspressoBean | null> => {
  try {
    return await apiClient.get<EspressoBean>(
      `/espresso-history/beans/${encodeURIComponent(id)}`,
      espressoHistoryRequestOptions,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};
