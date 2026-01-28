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
export const submitScore = async (data: ScoreSubmissionData): Promise<ScoreSubmissionResult> => {
  console.log("[Mock API] Submitting score...", data);

  return new Promise(resolve => {
    setTimeout(() => {
      console.log("[Mock API] Score submitted successfully!");
      resolve({
        success: true,
        message: "Score recorded successfully",
      });
    }, 1000);
  });
};
