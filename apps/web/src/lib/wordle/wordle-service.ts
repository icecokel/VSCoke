import { apiClient } from "@/lib/api-client";

export interface WordResponse {
  word: string;
}

export interface CheckWordResponse {
  exists: boolean;
}

/**
 * 랜덤 워들 단어를 조회합니다.
 */
export const fetchRandomWord = async (): Promise<string> => {
  const data = await apiClient.get<WordResponse>("/wordle/word");
  return data.word;
};

/**
 * 단어가 유효한지 검증합니다.
 */
export const checkWord = async (word: string): Promise<boolean> => {
  const data = await apiClient.post<CheckWordResponse>("/wordle/check", {
    word,
  });
  return data.exists;
};
