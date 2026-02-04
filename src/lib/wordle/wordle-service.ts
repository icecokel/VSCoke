import { API_BASE_URL } from "@/lib/constants";

export interface WordResponse {
  success: boolean;
  data: {
    word: string;
  };
}

export const fetchRandomWord = async (): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wordle/word`);
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    const json: WordResponse = await response.json();
    if (!json.success || !json.data?.word) {
      throw new Error("Invalid API response format");
    }
    return json.data.word;
  } catch (error) {
    // 폴백 로직 등은 Hook에서 처리하도록 에러를 던지거나,
    // 여기서 비상용 단어를 반환할 수도 있음.
    // 일단 에러를 던져서 상위에서 처리하도록 함.
    throw error;
  }
};

export const checkWord = async (word: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wordle/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word }),
    });

    if (!response.ok) {
      if (response.status === 404) return false;
      throw new Error(`API returned status: ${response.status}`);
    }

    const json = await response.json();
    return json.success && json.data?.exists;
  } catch (error) {
    console.error("Word validation failed:", error);
    // API 장애 시 게임 진행을 막을지, 그냥 허용할지 정책이 필요함.
    // 여기서는 일단 에러 발생 시(네트워크 등) false를 리턴하여 진행을 막거나
    // 사용자 경험을 위해 true를 리턴할 수도 있음.
    // 일단 안전하게 false 반환하고 호출 측에서 에러 처리하도록 유도.
    return false;
  }
};
