export interface ScoreSubmissionResult {
  success: boolean;
  message?: string;
  id?: string;
}

export interface ScoreSubmissionData {
  gameName: string;
  score: number;
}

// ... (existing interfaces)

export interface GameResult {
  id: string;
  score: number;
  gameType: "SKY_DROP" | "BLOCK_TOWER";
  createdAt: string;
  user?: {
    displayName: string;
  };
}

/**
 * 게임 점수를 서버에 제출합니다.
 */
// ... (existing submitScore function)

/**
 * 게임 결과를 조회합니다.
 */
export const getGameResult = async (id: string): Promise<GameResult | null> => {
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    // API 응답 구조가 { success: true, data: { ... } } 형태일 수 있음
    const json = await res.json();
    return json.data || json;
  } catch (error) {
    console.error("Error fetching game result:", error);
    return null;
  }
};
const API_URL = "https://api.icecoke.kr/game/result";

// ... (existing interfaces)

// API 요청 Payload 스키마
export interface ScoreSubmissionPayload {
  score: number;
  gameType: "SKY_DROP" | "BLOCK_TOWER";
}

// API 응답 스키마 (`POST /game/result`)
export interface ScoreSubmissionResponse {
  success: boolean;
  data: {
    id: string;
    score: number;
    gameType: "SKY_DROP" | "BLOCK_TOWER";
    createdAt: string;
    user?: {
      displayName: string;
      email: string;
    };
  };
}

// ... (existing GameResult interface)

export const submitScore = async (
  data: ScoreSubmissionData,
  token?: string,
): Promise<ScoreSubmissionResult> => {
  if (!token) {
    console.error("No token provided for score submission");
    return {
      success: false,
      message: "인증 토큰이 없습니다.",
    };
  }

  try {
    const gameTypeMap: Record<string, "SKY_DROP" | "BLOCK_TOWER"> = {
      "sky-drop": "SKY_DROP",
      "block-tower": "BLOCK_TOWER",
    };

    const payload: ScoreSubmissionPayload = {
      score: data.score,
      gameType: gameTypeMap[data.gameName] || "SKY_DROP",
    };

    console.log("[Score Service] Submitting to:", API_URL, payload);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Score Service] Failed:", response.status, errorData);
      return {
        success: false,
        message: `점수 기록 실패 (${response.status})`,
      };
    }

    const result: ScoreSubmissionResponse = await response.json();
    console.log("[Score Service] Success:", result);

    return {
      success: true,
      message: "점수가 성공적으로 기록되었습니다!",
      id: result.data.id,
    };
  } catch (error) {
    console.error("[Score Service] Error:", error);
    return {
      success: false,
      message: "네트워크 오류가 발생했습니다.",
    };
  }
};
