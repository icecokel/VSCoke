import type { components } from "@/types/api";
import { apiClient, ApiError } from "@/lib/api-client";

// API 스키마에서 자동 생성된 타입
export type CreateGameHistoryDto = components["schemas"]["CreateGameHistoryDto"];
export type GameHistoryResponseDto = components["schemas"]["GameHistoryResponseDto"];
export type GameHistoryUserDto = components["schemas"]["GameHistoryUserDto"];
export type GameHistory = components["schemas"]["GameHistory"];

// 내부 사용 인터페이스
export interface ScoreSubmissionResult {
  success: boolean;
  message?: string;
  data?: GameHistoryResponseDto;
  status?: number;
  requiresAuth?: boolean;
}

export interface ScoreSubmissionData {
  gameName: string;
  score: number;
  playTime?: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 게임 점수를 서버에 제출합니다.
 */
export const submitScore = async (
  data: ScoreSubmissionData,
  token?: string,
): Promise<ScoreSubmissionResult> => {
  if (!token) {
    return {
      success: false,
      message: "인증 토큰이 없습니다.",
      status: 401,
      requiresAuth: true,
    };
  }

  try {
    const gameTypeMap: Record<string, CreateGameHistoryDto["gameType"]> = {
      "sky-drop": "SKY_DROP",
    };

    const payload: CreateGameHistoryDto = {
      score: data.score,
      gameType: gameTypeMap[data.gameName] || "SKY_DROP",
      playTime: data.playTime,
    };

    const result = await apiClient.post<GameHistoryResponseDto>("/game/result", payload, {
      token,
    });
    return {
      success: true,
      message: "점수가 성공적으로 기록되었습니다!",
      data: result,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: `점수 기록 실패 (${error.status})`,
        status: error.status,
        requiresAuth: error.status === 401,
      };
    }
    return {
      success: false,
      message: "네트워크 오류가 발생했습니다.",
    };
  }
};

/**
 * 게임 결과를 조회합니다.
 */
export const getGameResult = async (id: string): Promise<GameHistoryResponseDto | null> => {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }

  try {
    const result = await apiClient.get<GameHistoryResponseDto>(`/game/result/${id}`, {
      next: { revalidate: 60 },
    });
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};

/**
 * 게임 랭킹(Top 10)을 조회합니다.
 */
export const getGameRanking = async (
  gameType: CreateGameHistoryDto["gameType"] = "SKY_DROP",
): Promise<GameHistory[]> => {
  try {
    const result = await apiClient.get<GameHistory[]>(`/game/ranking?gameType=${gameType}`, {
      cache: "no-store",
    });
    return result;
  } catch {
    return [];
  }
};
