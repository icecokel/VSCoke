export interface ScoreSubmissionResult {
  success: boolean;
  message?: string;
}

export interface ScoreSubmissionData {
  gameName: string;
  score: number;
}

/**
 * 게임 점수를 서버에 제출합니다.
 * 현재는 Mock API로 동작하며, 1초 후 성공 응답을 반환합니다.
 */
const API_URL = "https://api.icecoke.kr/game/result";

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
    // API 명세: { score: number, gameType: "SKY_DROP" | "BLOCK_TOWER" }
    // 현재 gameName은 "sky-drop", "block-tower" 형태이므로 변환 필요
    const gameTypeMap: Record<string, string> = {
      "sky-drop": "SKY_DROP",
      "block-tower": "BLOCK_TOWER",
    };

    const payload = {
      score: data.score,
      gameType: gameTypeMap[data.gameName] || "SKY_DROP", // Fallback
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

    const result = await response.json();
    console.log("[Score Service] Success:", result);

    return {
      success: true,
      message: "점수가 성공적으로 기록되었습니다!",
    };
  } catch (error) {
    console.error("[Score Service] Error:", error);
    return {
      success: false,
      message: "네트워크 오류가 발생했습니다.",
    };
  }
};
