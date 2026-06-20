import { ApiError, apiClient } from "@/lib/api-client";
import type { EspressoBean } from "@/features/hobby/types/espresso";
import { isRecoverableReadError, logRecoverableReadError } from "@/services/api-read-error";

const espressoHistoryRequestOptions = {
  next: { revalidate: 60 },
} as const;

export const getEspressoBeans = async (): Promise<EspressoBean[]> => {
  try {
    return await apiClient.get<EspressoBean[]>(
      "/espresso-history/beans",
      espressoHistoryRequestOptions,
    );
  } catch (error) {
    if (isRecoverableReadError(error)) {
      logRecoverableReadError("espresso-history", error);
      return [];
    }

    throw error;
  }
};

export const getEspressoBeanById = async (id: string): Promise<EspressoBean | null> => {
  try {
    return await apiClient.get<EspressoBean>(
      `/espresso-history/beans/${encodeURIComponent(id)}`,
      espressoHistoryRequestOptions,
    );
  } catch (error) {
    if ((error instanceof ApiError && error.status === 404) || isRecoverableReadError(error)) {
      logRecoverableReadError("espresso-history", error);
      return null;
    }

    throw error;
  }
};
