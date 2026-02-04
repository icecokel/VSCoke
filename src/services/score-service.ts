import type { components } from "@/types/api";

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
}

export interface ScoreSubmissionData {
  gameName: string;
  score: number;
  playTime?: number;
}

import { API_BASE_URL } from "@/lib/constants";

const API_URL = `${API_BASE_URL}/game/result`;

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

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `점수 기록 실패 (${response.status})`,
      };
    }

    const result: GameHistoryResponseDto = await response.json();

    return {
      success: true,
      message: "점수가 성공적으로 기록되었습니다!",
      data: result,
    };
  } catch {
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
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.data || json;
  } catch {
    return null;
  }
};
