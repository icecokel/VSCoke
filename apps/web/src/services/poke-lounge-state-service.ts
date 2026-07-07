import { ApiError, apiClient } from "@/lib/api-client";

export interface PokeLoungeStateSaveRequest {
  state: object;
  clientUpdatedAt?: string;
}

export type PokeLoungeStateSaveResult =
  | { success: true }
  | {
      success: false;
      skipped?: boolean;
      requiresAuth?: boolean;
      unavailable?: boolean;
      status?: number;
      message?: string;
    };

export interface PokeLoungeStateServiceDependencies {
  put?: (endpoint: string, body?: unknown, options?: { token?: string }) => Promise<unknown>;
}

export async function savePokeLoungeState(
  request: PokeLoungeStateSaveRequest,
  token?: string,
  dependencies: PokeLoungeStateServiceDependencies = {},
): Promise<PokeLoungeStateSaveResult> {
  if (!token) {
    return {
      success: false,
      skipped: true,
      requiresAuth: true,
    };
  }

  try {
    const put =
      dependencies.put ??
      ((endpoint: string, body?: unknown, options?: { token?: string }) =>
        apiClient.put<unknown>(endpoint, body, options));

    await put("/game/poke-lounge/state", request, { token });

    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        status: error.status,
        requiresAuth: error.status === 401,
        unavailable: error.status !== 401,
        message: error.message,
      };
    }

    return {
      success: false,
      unavailable: true,
      message: "네트워크 오류가 발생했습니다.",
    };
  }
}
