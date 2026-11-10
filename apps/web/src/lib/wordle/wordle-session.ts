export interface WordleSession {
  answer: string;
  guesses: string[];
  currentGuess: string;
  startedAt: number | null;
}

// 탭을 오가며 페이지가 다시 마운트되어도 같은 브라우저 탭에서는 진행 중인 판을 이어 간다.
const WORDLE_SESSION_KEY = "vscoke:wordle-session";

const isWord = (value: unknown, length: number): value is string =>
  typeof value === "string" && new RegExp(`^[A-Z]{${length}}$`).test(value);

export const parseWordleSession = (
  raw: string | null,
  wordLength: number,
  maxChallenges: number,
): WordleSession | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    if (!isWord(item.answer, wordLength)) return null;
    if (
      !Array.isArray(item.guesses) ||
      item.guesses.length > maxChallenges ||
      !item.guesses.every(guess => isWord(guess, wordLength))
    )
      return null;
    if (
      typeof item.currentGuess !== "string" ||
      !new RegExp(`^[A-Za-z]{0,${wordLength}}$`).test(item.currentGuess)
    )
      return null;
    if (
      item.startedAt !== null &&
      (typeof item.startedAt !== "number" || !Number.isFinite(item.startedAt))
    )
      return null;
    return {
      answer: item.answer,
      guesses: item.guesses,
      currentGuess: item.currentGuess,
      startedAt: item.startedAt,
    };
  } catch {
    return null;
  }
};

export const readWordleSession = (
  wordLength: number,
  maxChallenges: number,
): WordleSession | null => {
  try {
    return parseWordleSession(
      sessionStorage.getItem(WORDLE_SESSION_KEY),
      wordLength,
      maxChallenges,
    );
  } catch {
    return null;
  }
};

export const saveWordleSession = (session: WordleSession): void => {
  try {
    sessionStorage.setItem(WORDLE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // 저장소가 차단되어도 현재 화면의 게임은 계속 진행할 수 있어야 한다.
  }
};

export const clearWordleSession = (): void => {
  try {
    sessionStorage.removeItem(WORDLE_SESSION_KEY);
  } catch {
    // 저장소가 차단되어도 새 게임을 시작할 수 있어야 한다.
  }
};
