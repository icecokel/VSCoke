import { ApiError, apiClient } from "@/lib/api-client";
import {
  parsePokeLoungeSaveSnapshot,
  type PokeLoungeSaveSnapshot,
} from "@/components/poke-lounge/runtime/game/state/poke-lounge-save-snapshot";

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
  get?: (endpoint: string, options?: { token?: string }) => Promise<unknown>;
}

export type LoadPokeLoungeStateResult =
  | { success: true; snapshot: PokeLoungeSaveSnapshot | null }
  | { success: false; requiresAuth?: boolean; unavailable: true; message: string };

export async function loadPokeLoungeState(
  token: string,
  dependencies: PokeLoungeStateServiceDependencies = {},
): Promise<LoadPokeLoungeStateResult> {
  if (!token) {
    return {
      success: false,
      requiresAuth: true,
      unavailable: true,
      message: "로그인이 필요합니다.",
    };
  }

  try {
    const get =
      dependencies.get ??
      ((endpoint: string, options?: { token?: string }) =>
        apiClient.get<unknown>(endpoint, options));
    const response = await get("/game/poke-lounge/state", { token });

    if (isEmptyStateResponse(response)) {
      return { success: true, snapshot: null };
    }

    const snapshotValue =
      isRecord(response) && Object.hasOwn(response, "state") ? response.state : response;
    if (snapshotValue === null || snapshotValue === undefined) {
      return { success: true, snapshot: null };
    }

    const snapshot = parsePokeLoungeSaveSnapshot(snapshotValue);
    if (!snapshot) {
      return {
        success: false,
        unavailable: true,
        message: "저장된 Poke Lounge 상태 형식이 올바르지 않습니다.",
      };
    }

    return { success: true, snapshot };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { success: true, snapshot: null };
    }

    if (error instanceof ApiError) {
      return {
        success: false,
        requiresAuth: error.status === 401,
        unavailable: true,
        message: error.message,
      };
    }

    return {
      success: false,
      unavailable: true,
      message: "네트워크 오류로 저장 상태를 불러오지 못했습니다.",
    };
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyStateResponse(value: unknown): boolean {
  return (
    value === null || value === undefined || (isRecord(value) && Object.keys(value).length === 0)
  );
}
